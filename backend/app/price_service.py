"""
Obtiene cotizaciones y tipos de cambio de APIs publicas gratuitas (sin key):

  - Oro/Plata:      https://api.gold-api.com/price/{symbol}   (XAU, XAG...)
  - Acciones/ETFs:  https://query1.finance.yahoo.com/v8/finance/chart/{ticker}
  - Tipo de cambio: https://api.frankfurter.app/latest         (Banco Central Europeo)

Todo se cachea en la tabla spot_prices para tener historico y para poder
servir el dashboard aunque la API externa este caida (se usa el ultimo valor
guardado). Nota: la columna se llama `price_per_troy_ounce` por herencia de
cuando solo habia metales; para un ticker guarda el precio por participacion.

Las inversiones pueden valorarse de dos formas, segun tengan ticker o no
(ver routers/dashboard.py):
  - con ticker: participaciones x cotizacion en tiempo real
  - sin ticker: la ultima valoracion que anota el usuario a mano
"""

import logging

import httpx
from sqlalchemy.orm import Session

from . import crud
from .database import SessionLocal

logger = logging.getLogger("price_service")

GOLD_API_BASE = "https://api.gold-api.com/price"
YAHOO_CHART_BASE = "https://query1.finance.yahoo.com/v8/finance/chart"
YAHOO_SEARCH_URL = "https://query1.finance.yahoo.com/v1/finance/search"
FX_API_BASE = "https://api.frankfurter.dev/v1/latest"

# Yahoo exige un User-Agent de navegador; si no, responde 429/999.
YAHOO_HEADERS = {"User-Agent": "Mozilla/5.0"}

TRACKED_METAL_SYMBOLS = ["XAU", "XAG"]


def fetch_metal_price_usd(symbol: str) -> float | None:
    """Precio spot en USD por onza troy para un simbolo de metal (XAU, XAG...)."""
    url = f"{GOLD_API_BASE}/{symbol}"
    try:
        resp = httpx.get(url, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        # La API devuelve el precio en el campo "price"
        price = data.get("price")
        if price is None:
            logger.warning("Respuesta inesperada de gold-api para %s: %s", symbol, data)
            return None
        return float(price)
    except Exception as exc:  # noqa: BLE001 - queremos degradar con gracia, no tumbar el backend
        logger.warning("No se pudo obtener el precio de %s: %s", symbol, exc)
        return None


def fetch_quote(symbol: str) -> dict | None:
    """
    Cotizacion actual de un ticker (SPY, URTH, VWCE.DE...).

    Devuelve tambien la divisa que informa el mercado en lugar de asumir
    dolares: un UCITS europeo cotiza en EUR y darlo por USD inflaria el
    valor por el tipo de cambio. None si el ticker no existe o falla la API.
    """
    try:
        resp = httpx.get(
            f"{YAHOO_CHART_BASE}/{symbol}",
            params={"interval": "1d", "range": "1d"},
            headers=YAHOO_HEADERS,
            timeout=10,
        )
        resp.raise_for_status()
        meta = resp.json()["chart"]["result"][0]["meta"]
        price = meta.get("regularMarketPrice")
        if price is None:
            return None
        return {
            "symbol": symbol.upper(),
            "price": float(price),
            "currency": meta.get("currency") or "USD",
            "name": meta.get("longName") or meta.get("shortName") or symbol.upper(),
        }
    except Exception as exc:  # noqa: BLE001 - degradar con gracia, no tumbar el backend
        logger.warning("No se pudo cotizar %s: %s", symbol, exc)
        return None


def search_quotes(query: str, limit: int = 6) -> list[dict]:
    """
    Busca un valor por ISIN, nombre o ticker y devuelve las cotizaciones que
    encuentra, ya con precio y divisa.

    Hace falta porque el endpoint de cotizacion solo entiende el simbolo del
    mercado: un ISIN como IE00BYX5MX67 da 404 ahi, pero el buscador si lo
    resuelve (a IE00BYX5MX67.SG, 0P0001CLDM.F...). Un mismo fondo cotiza en
    varias bolsas y a distinto precio, asi que se devuelven todas y elige
    el usuario en vez de escoger una a ciegas.
    """
    found: dict[str, dict] = {}

    # 1) Si ya es un simbolo valido, es la mejor respuesta posible.
    direct = fetch_quote(query)
    if direct is not None:
        found[direct["symbol"]] = {**direct, "exchange": None}

    # 2) Buscador: acepta ISIN y texto libre.
    try:
        resp = httpx.get(
            YAHOO_SEARCH_URL,
            params={"q": query, "quotesCount": limit, "newsCount": 0},
            headers=YAHOO_HEADERS,
            timeout=10,
        )
        resp.raise_for_status()
        candidates = resp.json().get("quotes", [])
    except Exception as exc:  # noqa: BLE001 - degradar con gracia
        logger.warning("Fallo buscando '%s': %s", query, exc)
        candidates = []

    for item in candidates:
        symbol = item.get("symbol")
        if not symbol or symbol in found or len(found) >= limit:
            continue
        # El buscador no da precio fiable: se confirma cotizando el simbolo.
        quote = fetch_quote(symbol)
        if quote is None:
            continue
        exchange = item.get("exchDisp") or item.get("exchange")
        name = item.get("longname") or item.get("shortname") or quote["name"]
        found[symbol] = {**quote, "name": name, "exchange": exchange}

    return list(found.values())


def quote_in_currency(db: Session, symbol: str, target_currency: str) -> float | None:
    """Precio por participacion (ultimo cacheado) convertido a target_currency."""
    latest = crud.latest_spot_price(db, symbol)
    if latest is None:
        return None
    price = float(latest.price_per_troy_ounce)
    if (latest.currency or "USD") == target_currency:
        return price
    fx = fetch_fx_rate(latest.currency or "USD", target_currency)
    return price * fx if fx is not None else price


def fetch_fx_rate(from_ccy: str, to_ccy: str) -> float | None:
    """Tipo de cambio from_ccy -> to_ccy. Devuelve 1.0 si son la misma divisa."""
    if from_ccy == to_ccy:
        return 1.0
    try:
        resp = httpx.get(FX_API_BASE, params={"from": from_ccy, "to": to_ccy}, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        return float(data["rates"][to_ccy])
    except Exception as exc:  # noqa: BLE001
        logger.warning("No se pudo obtener el tipo de cambio %s->%s: %s", from_ccy, to_ccy, exc)
        return None


def refresh_all_spot_prices() -> None:
    """Consulta las APIs externas y guarda los precios nuevos en la base de datos."""
    db: Session = SessionLocal()
    try:
        for symbol in TRACKED_METAL_SYMBOLS:
            price = fetch_metal_price_usd(symbol)
            if price is not None:
                crud.save_spot_price(db, symbol=symbol, price=price, currency="USD")
                logger.info("Precio actualizado %s = %.2f USD/oz", symbol, price)

        # Los tickers no estan fijados en codigo: son los que el usuario haya
        # dado de alta en sus activos de inversion.
        for symbol in crud.list_market_symbols(db):
            quote = fetch_quote(symbol)
            if quote is not None:
                crud.save_spot_price(
                    db, symbol=symbol, price=quote["price"], currency=quote["currency"],
                )
                logger.info(
                    "Cotizacion actualizada %s = %.4f %s",
                    symbol, quote["price"], quote["currency"],
                )
    finally:
        db.close()


TROY_OUNCE_IN_GRAMS = 31.1034768


def price_per_gram_in_currency(db: Session, symbol: str, target_currency: str) -> float | None:
    """Precio actual (ultimo cacheado) de 1 gramo de `symbol`, convertido a target_currency."""
    latest = crud.latest_spot_price(db, symbol)
    if latest is None:
        return None
    price_per_oz_usd = float(latest.price_per_troy_ounce)
    fx = fetch_fx_rate("USD", target_currency)
    if fx is None:
        fx = 1.0  # degrada mostrando USD si no hay tipo de cambio disponible
    return (price_per_oz_usd / TROY_OUNCE_IN_GRAMS) * fx
