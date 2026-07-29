import uuid
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from . import models, schemas


# ---------- AssetType ----------

def list_asset_types(db: Session, only_active: bool = True):
    stmt = select(models.AssetType)
    if only_active:
        stmt = stmt.where(models.AssetType.is_active.is_(True))
    return db.scalars(stmt.order_by(models.AssetType.name)).all()


def get_asset_type(db: Session, asset_type_id: uuid.UUID):
    return db.get(models.AssetType, asset_type_id)


def get_asset_type_by_code(db: Session, code: str):
    return db.scalar(select(models.AssetType).where(models.AssetType.code == code))


def create_asset_type(db: Session, data: schemas.AssetTypeCreate):
    obj = models.AssetType(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


# ---------- Transaction ----------

def list_transactions(db: Session, asset_type_id: uuid.UUID | None = None, limit: int = 500):
    stmt = select(models.Transaction).options(joinedload(models.Transaction.asset_type))
    if asset_type_id:
        stmt = stmt.where(models.Transaction.asset_type_id == asset_type_id)
    stmt = stmt.order_by(models.Transaction.occurred_on.desc(), models.Transaction.created_at.desc()).limit(limit)
    return db.scalars(stmt).all()


def create_transaction(db: Session, data: schemas.TransactionCreate):
    obj = models.Transaction(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def update_transaction(db: Session, transaction_id: uuid.UUID, data: schemas.TransactionUpdate):
    obj = db.get(models.Transaction, transaction_id)
    if obj is None:
        return None
    for key, value in data.model_dump().items():
        setattr(obj, key, value)
    db.commit()
    db.refresh(obj)
    return obj


def delete_transaction(db: Session, transaction_id: uuid.UUID) -> bool:
    obj = db.get(models.Transaction, transaction_id)
    if obj is None:
        return False
    db.delete(obj)
    db.commit()
    return True


# ---------- SpotPrice ----------

def save_spot_price(db: Session, symbol: str, price: float, currency: str = "USD"):
    obj = models.SpotPrice(symbol=symbol, price_per_troy_ounce=price, currency=currency)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def latest_spot_price(db: Session, symbol: str):
    stmt = (
        select(models.SpotPrice)
        .where(models.SpotPrice.symbol == symbol)
        .order_by(models.SpotPrice.fetched_at.desc())
        .limit(1)
    )
    return db.scalar(stmt)


