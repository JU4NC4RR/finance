"""
Obtiene precios spot de metales preciosos y tipos de cambio de APIs
publicas gratuitas (sin API key):

  - Oro/Plata:      https://api.gold-api.com/price/{symbol}   (XAU, XAG...)
  - Tipo de cambio: https://api.frankfurter.app/latest         (Banco Central Europeo)

Los precios se guardan en la tabla spot_prices para tener historico y
para poder servir el dashboard aunque la API externa este caida
(se usa el ultimo valor cacheado).

Las inversiones indexadas no consultan mercado: se valoran con las
lecturas que anota el usuario (ver routers/dashboard.py).
"""

import logging

import httpx
from sqlalchemy.orm import Session

from . import crud
from .database import SessionLocal

logger = logging.getLogger("price_service")

GOLD_API_BASE = "https://api.gold-api.com/price"
FX_API_BASE = "https://api.frankfurter.dev/v1/latest"

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
