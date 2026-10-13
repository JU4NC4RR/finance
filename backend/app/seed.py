from sqlalchemy.orm import Session

from . import crud, models
from .config import settings

DEFAULT_ASSET_TYPES = [
    dict(code="PHYSICAL_GOLD", name="Oro fisico", category=models.AssetCategory.METAL,
         unit="g", market_symbol="XAU", currency=None),
    dict(code="PHYSICAL_SILVER", name="Plata fisica", category=models.AssetCategory.METAL,
         unit="g", market_symbol="XAG", currency=None),
    dict(code="CASH", name="Efectivo", category=models.AssetCategory.CASH,
         unit="unit", market_symbol=None, currency=settings.base_currency),
    dict(code="SAVINGS", name="Ahorros", category=models.AssetCategory.SAVINGS,
         unit="unit", market_symbol=None, currency=settings.base_currency),
    # Sin inversiones sembradas a proposito: se dan de alta desde la pestana
    # Activos con su ISIN o ticker, que es lo que permite valorarlas a precio
    # real. Sembrarlas aqui las recrearia en cada arranque aunque se borren.
]


def seed_default_asset_types(db: Session) -> None:
    """
    Siembra un catalogo de partida SOLO en una instalacion nueva.

    Si ya hay algun activo, no se toca nada. Antes se recreaba cualquier
    activo por defecto que faltara, de modo que borrar "Efectivo" o "Ahorros"
    no servia de nada: reaparecian en el siguiente arranque. El catalogo es
    del usuario, y eso incluye poder quedarse sin uno.
    """
    if crud.list_asset_types(db, only_active=False):
        return

    for entry in DEFAULT_ASSET_TYPES:
        db.add(models.AssetType(**entry))
    db.commit()
