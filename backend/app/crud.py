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


def update_asset_type(db: Session, asset_type_id: uuid.UUID, data: schemas.AssetTypeUpdate):
    obj = db.get(models.AssetType, asset_type_id)
    if obj is None:
        return None
    obj.name = data.name
    obj.market_symbol = data.market_symbol
    db.commit()
    db.refresh(obj)
    return obj


def create_asset_type(db: Session, data: schemas.AssetTypeCreate):
    obj = models.AssetType(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def delete_asset_type(db: Session, asset_type_id: uuid.UUID) -> bool:
    obj = db.get(models.AssetType, asset_type_id)
    if obj is None:
        return False
    db.delete(obj)  # arrastra sus movimientos (cascade en la relacion)
    db.commit()
    return True


def list_market_symbols(db: Session) -> list[str]:
    """Tickers dados de alta en activos de inversion, para refrescar precios."""
    stmt = (
        select(models.AssetType.market_symbol)
        .where(
            models.AssetType.category == models.AssetCategory.INVESTMENT,
            models.AssetType.market_symbol.isnot(None),
            models.AssetType.is_active.is_(True),
        )
        .distinct()
    )
    return [s for s in db.scalars(stmt).all() if s]


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


# ---------- Jar (huchas) ----------

def list_jars(db: Session):
    return db.scalars(select(models.Jar).order_by(models.Jar.created_at)).all()


def get_jar(db: Session, jar_id: uuid.UUID):
    return db.get(models.Jar, jar_id)


def create_jar(db: Session, data: schemas.JarCreate):
    obj = models.Jar(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def update_jar(db: Session, jar_id: uuid.UUID, data: schemas.JarUpdate):
    obj = db.get(models.Jar, jar_id)
    if obj is None:
        return None
    for key, value in data.model_dump().items():
        setattr(obj, key, value)
    db.commit()
    db.refresh(obj)
    return obj


def delete_jar(db: Session, jar_id: uuid.UUID) -> bool:
    obj = db.get(models.Jar, jar_id)
    if obj is None:
        return False
    db.delete(obj)  # arrastra sus movimientos (cascade)
    db.commit()
    return True


def list_jar_entries(db: Session, jar_id: uuid.UUID | None = None, limit: int = 500):
    stmt = select(models.JarEntry).options(joinedload(models.JarEntry.jar))
    if jar_id:
        stmt = stmt.where(models.JarEntry.jar_id == jar_id)
    stmt = stmt.order_by(
        models.JarEntry.occurred_on.desc(), models.JarEntry.created_at.desc()
    ).limit(limit)
    return db.scalars(stmt).all()


def create_jar_entry(db: Session, data: schemas.JarEntryCreate):
    obj = models.JarEntry(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def update_jar_entry(db: Session, entry_id: uuid.UUID, data: schemas.JarEntryUpdate):
    obj = db.get(models.JarEntry, entry_id)
    if obj is None:
        return None
    for key, value in data.model_dump().items():
        setattr(obj, key, value)
    db.commit()
    db.refresh(obj)
    return obj


def delete_jar_entry(db: Session, entry_id: uuid.UUID) -> bool:
    obj = db.get(models.JarEntry, entry_id)
    if obj is None:
        return False
    db.delete(obj)
    db.commit()
    return True


# ---------- Strategy (estrategias) ----------

def list_strategies(db: Session):
    stmt = (
        select(models.Strategy)
        .options(joinedload(models.Strategy.items))
        .order_by(models.Strategy.created_at)
    )
    return db.scalars(stmt).unique().all()


def get_strategy(db: Session, strategy_id: uuid.UUID):
    return db.get(models.Strategy, strategy_id)


def create_strategy(db: Session, data: schemas.StrategyCreate):
    obj = models.Strategy(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def update_strategy(db: Session, strategy_id: uuid.UUID, data: schemas.StrategyUpdate):
    obj = db.get(models.Strategy, strategy_id)
    if obj is None:
        return None
    for key, value in data.model_dump().items():
        setattr(obj, key, value)
    db.commit()
    db.refresh(obj)
    return obj


def delete_strategy(db: Session, strategy_id: uuid.UUID) -> bool:
    obj = db.get(models.Strategy, strategy_id)
    if obj is None:
        return False
    db.delete(obj)
    db.commit()
    return True


def create_strategy_item(db: Session, data: schemas.StrategyItemCreate):
    obj = models.StrategyItem(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def update_strategy_item(db: Session, item_id: uuid.UUID, data: schemas.StrategyItemUpdate):
    obj = db.get(models.StrategyItem, item_id)
    if obj is None:
        return None
    for key, value in data.model_dump().items():
        setattr(obj, key, value)
    db.commit()
    db.refresh(obj)
    return obj


def delete_strategy_item(db: Session, item_id: uuid.UUID) -> bool:
    obj = db.get(models.StrategyItem, item_id)
    if obj is None:
        return False
    db.delete(obj)
    db.commit()
    return True


# ---------- BankAccount (cuentas) ----------

def list_bank_accounts(db: Session):
    return db.scalars(select(models.BankAccount).order_by(models.BankAccount.created_at)).all()


def get_bank_account(db: Session, account_id: uuid.UUID):
    return db.get(models.BankAccount, account_id)


def create_bank_account(db: Session, data: schemas.BankAccountCreate):
    obj = models.BankAccount(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def update_bank_account(db: Session, account_id: uuid.UUID, data: schemas.BankAccountUpdate):
    obj = db.get(models.BankAccount, account_id)
    if obj is None:
        return None
    for key, value in data.model_dump().items():
        setattr(obj, key, value)
    db.commit()
    db.refresh(obj)
    return obj


def delete_bank_account(db: Session, account_id: uuid.UUID) -> bool:
    obj = db.get(models.BankAccount, account_id)
    if obj is None:
        return False
    db.delete(obj)
    db.commit()
    return True


def list_bank_movements(db: Session, account_id: uuid.UUID | None = None, limit: int = 500):
    stmt = select(models.BankMovement).options(
        joinedload(models.BankMovement.account), joinedload(models.BankMovement.jar),
    )
    if account_id:
        stmt = stmt.where(models.BankMovement.account_id == account_id)
    stmt = stmt.order_by(
        models.BankMovement.occurred_on.desc(), models.BankMovement.created_at.desc()
    ).limit(limit)
    return db.scalars(stmt).all()


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


