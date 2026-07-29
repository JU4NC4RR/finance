import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict

from .models import AssetCategory


# ---------- AssetType ----------

class AssetTypeBase(BaseModel):
    code: str
    name: str
    category: AssetCategory
    unit: str = "g"
    market_symbol: Optional[str] = None
    currency: Optional[str] = None


class AssetTypeCreate(AssetTypeBase):
    pass


class AssetTypeOut(AssetTypeBase):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    is_active: bool


# ---------- Transaction ----------

class TransactionBase(BaseModel):
    asset_type_id: uuid.UUID
    occurred_on: date
    quantity: Decimal
    purity: Optional[Decimal] = Decimal("1.0")
    unit_cost: Optional[Decimal] = None
    currency: str = "EUR"
    source: Optional[str] = None
    reference_number: Optional[str] = None
    note: Optional[str] = None

    # Oro / plata fisicos
    item_name: Optional[str] = None
    item_type: Optional[str] = None
    asset_year: Optional[int] = None
    invoice_id: Optional[str] = None
    base_price: Optional[Decimal] = None
    total_price: Optional[Decimal] = None
    purchase_platform: Optional[str] = None
    piece_id: Optional[str] = None

    # Efectivo
    bill_type: Optional[str] = None
    income_month: Optional[str] = None

    # Ahorros
    tx_hash: Optional[str] = None


class TransactionCreate(TransactionBase):
    pass


class TransactionUpdate(TransactionBase):
    pass


class TransactionOut(TransactionBase):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    created_at: datetime
    asset_type: AssetTypeOut


# ---------- Dashboard ----------

class AssetSummary(BaseModel):
    asset_type: AssetTypeOut
    total_quantity: Decimal
    current_unit_price_base_ccy: Optional[Decimal] = None
    current_value_base_ccy: Decimal
    num_transactions: int
    # Solo para inversiones: fecha de la ultima valoracion registrada, ya que
    # su valor no es la suma de movimientos sino la ultima lectura anotada.
    last_valued_on: Optional[date] = None


class DashboardSummary(BaseModel):
    base_currency: str
    total_value_base_ccy: Decimal
    assets: list[AssetSummary]
    prices_updated_at: Optional[datetime] = None


class SpotPriceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    symbol: str
    price_per_troy_ounce: Decimal
    currency: str
    fetched_at: datetime


# ---------- Auth ----------

class CredentialsIn(BaseModel):
    username: str
    password: str


class PasswordChangeIn(BaseModel):
    current_password: str
    new_password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    username: str


class AuthStatus(BaseModel):
    needs_setup: bool
    authenticated: bool
    username: Optional[str] = None


# ---------- Import ----------

class ImportResultOut(BaseModel):
    created: int
    updated: int
    skipped: int
    errors: list[str]
    unmatched_sheets: list[str] = []
