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
    # Las inversiones se valoran con lecturas anotadas por el usuario ("a dia X
    # mi posicion vale Y"), asi que su cantidad es un importe, no participaciones.
    dict(code="INVEST_SP500", name="S&P 500", category=models.AssetCategory.INVESTMENT,
         unit="unit", market_symbol=None, currency=settings.base_currency),
    dict(code="INVEST_MSCI_WORLD", name="MSCI World", category=models.AssetCategory.INVESTMENT,
         unit="unit", market_symbol=None, currency=settings.base_currency),
    dict(code="SAVINGS", name="Ahorros", category=models.AssetCategory.SAVINGS,
         unit="unit", market_symbol=None, currency=settings.base_currency),
]


def seed_default_asset_types(db: Session) -> None:
    for entry in DEFAULT_ASSET_TYPES:
        existing = crud.get_asset_type_by_code(db, entry["code"])
        if existing is None:
            obj = models.AssetType(**entry)
            db.add(obj)
    db.commit()
