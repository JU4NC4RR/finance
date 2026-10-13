import re
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import crud, price_service, schemas
from ..database import get_db

router = APIRouter(prefix="/asset-types", tags=["asset-types"])

# Simbolos reales: letras, digitos y los separadores de los mercados
# (VWCE.DE, BRK-B, IE00BYX5MX67.SG). Se filtra antes de meterlo en una URL.
TICKER_RE = re.compile(r"^[A-Za-z0-9.\-^]{1,32}$")


@router.get("", response_model=list[schemas.AssetTypeOut])
def get_asset_types(only_active: bool = True, db: Session = Depends(get_db)):
    return crud.list_asset_types(db, only_active=only_active)


@router.get("/search", response_model=list[schemas.QuoteOut])
def search_assets(q: str):
    """
    Busca un valor por ISIN, nombre o ticker.

    El endpoint de cotizacion solo entiende simbolos de mercado, asi que un
    ISIN da 404 alli. Aqui se resuelve y se devuelven todas las bolsas donde
    cotiza, con su precio y divisa, para que el usuario elija.
    """
    query = q.strip()
    if len(query) < 2:
        raise HTTPException(status_code=422, detail="Escribe al menos 2 caracteres.")

    results = price_service.search_quotes(query)
    if not results:
        raise HTTPException(
            status_code=404,
            detail=f"No se ha encontrado ningún valor para «{query}».",
        )
    return results


@router.get("/quote/{symbol}", response_model=schemas.QuoteOut)
def get_quote(symbol: str):
    """
    Cotizacion en vivo de un ticker. La usa el formulario de alta para
    confirmar que el codigo existe y ensenar precio y nombre antes de guardar,
    en vez de descubrir el fallo cuando ya hay movimientos registrados.
    """
    if not TICKER_RE.match(symbol):
        raise HTTPException(status_code=422, detail="Código de ticker no válido.")

    quote = price_service.fetch_quote(symbol)
    if quote is None:
        raise HTTPException(
            status_code=404,
            detail=f"No se ha encontrado ningún valor con el código «{symbol.upper()}».",
        )
    return quote


def _validate_symbol(payload, db: Session) -> None:
    """
    Normaliza y comprueba el ticker contra el mercado, y cachea la cotizacion.

    Sin esto, un ticker equivocado dejaria el activo valorado en 0 sin explicar
    por que; y sin guardar el precio, se veria a 0 hasta el siguiente refresco
    periodico, que es justo lo que parece una funcionalidad rota.
    """
    if not payload.market_symbol:
        payload.market_symbol = None
        return

    symbol = payload.market_symbol.upper()
    if not TICKER_RE.match(symbol):
        raise HTTPException(status_code=422, detail="Código de ticker no válido.")

    quote = price_service.fetch_quote(symbol)
    if quote is None:
        raise HTTPException(
            status_code=422,
            detail=f"No se ha encontrado ningún valor con el código «{symbol}».",
        )

    payload.market_symbol = symbol
    crud.save_spot_price(db, symbol=symbol, price=quote["price"], currency=quote["currency"])


@router.post("", response_model=schemas.AssetTypeOut, status_code=201)
def create_asset_type(payload: schemas.AssetTypeCreate, db: Session = Depends(get_db)):
    """
    Alta de un tipo de activo. `market_symbol` decide como se valora: con
    ticker, cantidad x cotizacion en vivo; sin el, vale la suma de lo que
    anota el usuario, igual que el efectivo o los ahorros.
    """
    if crud.get_asset_type_by_code(db, payload.code):
        raise HTTPException(
            status_code=409, detail=f"Ya existe un activo con el código {payload.code}.",
        )

    _validate_symbol(payload, db)
    return crud.create_asset_type(db, payload)


@router.put("/{asset_type_id}", response_model=schemas.AssetTypeOut)
def update_asset_type(
    asset_type_id: uuid.UUID,
    payload: schemas.AssetTypeUpdate,
    db: Session = Depends(get_db),
):
    """
    Edita nombre y ticker. El `code` no se toca: identifica el activo en las
    URLs y en las hojas de la copia de seguridad, y cambiarlo romperia ambos.
    """
    current = crud.get_asset_type(db, asset_type_id)
    if current is None:
        raise HTTPException(status_code=404, detail="Activo no encontrado.")

    _validate_symbol(payload, db)
    return crud.update_asset_type(db, asset_type_id, payload)


@router.delete("/{asset_type_id}", status_code=204)
def delete_asset_type(asset_type_id: uuid.UUID, db: Session = Depends(get_db)):
    # Arrastra sus movimientos: el aviso de cuantos son lo da la interfaz.
    if not crud.delete_asset_type(db, asset_type_id):
        raise HTTPException(status_code=404, detail="Activo no encontrado.")
