import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

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


class AssetTypeUpdate(BaseModel):
    """Solo lo editable: el `code` identifica el activo y se queda fijo."""
    name: str
    market_symbol: Optional[str] = None


class AssetTypeOut(AssetTypeBase):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    is_active: bool


class QuoteOut(BaseModel):
    """Cotizacion en vivo de un ticker, tal y como la informa el mercado."""
    symbol: str
    price: float
    currency: str
    name: str
    # Bolsa donde cotiza: un mismo fondo aparece en varias y a distinto precio.
    exchange: Optional[str] = None


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


# ---------- Huchas ----------

JarKind = Literal["income", "expense"]


class JarBase(BaseModel):
    name: str
    color: str = "cash"
    target_amount: Optional[Decimal] = None
    currency: str = "EUR"
    note: Optional[str] = None


class JarCreate(JarBase):
    pass


class JarUpdate(JarBase):
    pass


class JarOut(JarBase):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    created_at: datetime
    # Calculados, no columnas: ingresos - gastos de la hucha.
    balance: Decimal = Decimal("0")
    total_income: Decimal = Decimal("0")
    total_expense: Decimal = Decimal("0")
    num_entries: int = 0


class JarEntryBase(BaseModel):
    jar_id: uuid.UUID
    occurred_on: date
    kind: JarKind
    amount: Decimal = Field(gt=0, description="Siempre positivo; el signo lo da 'kind'.")
    concept: Optional[str] = None
    note: Optional[str] = None


class JarEntryCreate(JarEntryBase):
    pass


class JarEntryUpdate(JarEntryBase):
    pass


class JarEntryOut(JarEntryBase):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    created_at: datetime
    jar: JarBase
    # Si viene de un traspaso, la hucha no puede tocarlo: manda la cuenta.
    bank_movement_id: Optional[uuid.UUID] = None


class JarsSummary(BaseModel):
    base_currency: str
    total_balance: Decimal
    month_income: Decimal
    month_expense: Decimal
    month_label: str
    jars: list[JarOut]


# ---------- Estrategias ----------

class StrategyItemBase(BaseModel):
    name: str
    percentage: Decimal = Field(gt=0, le=100)
    color: str = "cash"
    note: Optional[str] = None


class StrategyItemCreate(StrategyItemBase):
    strategy_id: uuid.UUID


class StrategyItemUpdate(StrategyItemBase):
    strategy_id: uuid.UUID


class StrategyItemOut(StrategyItemBase):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    strategy_id: uuid.UUID
    created_at: datetime


class StrategyBase(BaseModel):
    name: str
    salary: Optional[Decimal] = None
    currency: str = "EUR"
    note: Optional[str] = None


class StrategyCreate(StrategyBase):
    pass


class StrategyUpdate(StrategyBase):
    pass


class StrategyOut(StrategyBase):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    created_at: datetime
    items: list[StrategyItemOut] = []
    # Calculado: suma de los porcentajes. Puede pasar de 100, y se avisa en
    # la interfaz en vez de impedirlo, para no bloquear mientras se edita.
    total_percentage: Decimal = Decimal("0")


# ---------- Cuentas bancarias ----------

class BankAccountBase(BaseModel):
    name: str
    bank: Optional[str] = None
    color: str = "sp500"
    initial_balance: Decimal = Decimal("0")
    currency: str = "EUR"
    note: Optional[str] = None


class BankAccountCreate(BankAccountBase):
    pass


class BankAccountUpdate(BankAccountBase):
    pass


class BankAccountOut(BankAccountBase):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    created_at: datetime
    balance: Decimal = Decimal("0")
    total_income: Decimal = Decimal("0")
    total_expense: Decimal = Decimal("0")
    num_movements: int = 0


class BankMovementBase(BaseModel):
    account_id: uuid.UUID
    occurred_on: date
    kind: JarKind
    amount: Decimal = Field(gt=0, description="Siempre positivo; el signo lo da 'kind'.")
    concept: Optional[str] = None
    note: Optional[str] = None
    # Si se indica, el movimiento es un traspaso contra esa hucha.
    jar_id: Optional[uuid.UUID] = None


class BankMovementCreate(BankMovementBase):
    pass


class BankMovementUpdate(BankMovementBase):
    pass


class BankMovementOut(BankMovementBase):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    created_at: datetime
    account: BankAccountBase
    jar: Optional[JarBase] = None


class BanksSummary(BaseModel):
    base_currency: str
    total_balance: Decimal
    month_income: Decimal
    month_expense: Decimal
    month_label: str
    accounts: list[BankAccountOut]


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


class ApiTokenCreate(BaseModel):
    name: str


class ApiTokenOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    name: str
    prefix: str
    created_at: datetime
    last_used_at: Optional[datetime] = None


class ApiTokenCreated(ApiTokenOut):
    # El valor en claro viaja UNA sola vez, en la respuesta al crearlo.
    token: str


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
