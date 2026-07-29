import enum
import uuid

from sqlalchemy import (
    Column, String, Numeric, Integer, Date, DateTime, Boolean, ForeignKey, Text, Enum, func
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from .database import Base


class AssetCategory(str, enum.Enum):
    METAL = "metal"
    CASH = "cash"
    INVESTMENT = "investment"
    SAVINGS = "savings"
    OTHER = "other"


class AssetType(Base):
    """
    Catalogo de tipos de activo. Anadir un activo nuevo (platino, acciones,
    otra divisa...) es insertar una fila aqui, sin tocar el esquema.
    """
    __tablename__ = "asset_types"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String(50), unique=True, nullable=False)          # PHYSICAL_GOLD, PHYSICAL_SILVER, CASH_EUR...
    name = Column(String(100), nullable=False)                       # "Oro fisico"
    category = Column(Enum(AssetCategory), nullable=False)
    unit = Column(String(20), nullable=False, default="g")           # g, kg, unit...
    market_symbol = Column(String(10), nullable=True)                # XAU, XAG (null si no cotiza)
    currency = Column(String(3), nullable=True)                      # solo relevante para CASH
    is_active = Column(Boolean, nullable=False, default=True)

    transactions = relationship("Transaction", back_populates="asset_type", cascade="all, delete-orphan")


class Transaction(Base):
    """
    Un movimiento de entrada de patrimonio (ingreso). quantity se expresa
    siempre en la unidad definida en asset_type.unit (gramos para metales,
    importe monetario para efectivo).
    """
    __tablename__ = "transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    asset_type_id = Column(UUID(as_uuid=True), ForeignKey("asset_types.id"), nullable=False)

    occurred_on = Column(Date, nullable=False)
    quantity = Column(Numeric(18, 4), nullable=False)                # gramos o importe
    purity = Column(Numeric(5, 4), nullable=True, default=1.0)       # 0.999 plata, 0.9999 oro...
    unit_cost = Column(Numeric(18, 4), nullable=True)                # coste por unidad en 'currency'
    currency = Column(String(3), nullable=False, default="EUR")

    source = Column(String(100), nullable=True)                      # nomina, venta, regalo...
    reference_number = Column(String(100), nullable=True)            # num. de referencia del ingreso (recibo, justificante...) / referencia de efectivo
    note = Column(Text, nullable=True)

    # --- Oro / plata fisicos ---
    item_name = Column(String(150), nullable=True)                   # nombre de la pieza
    item_type = Column(String(20), nullable=True)                    # "lingote" o "moneda"
    asset_year = Column(Integer, nullable=True)                       # anio del activo
    invoice_id = Column(String(100), nullable=True)                  # ID de la factura
    base_price = Column(Numeric(18, 4), nullable=True)               # precio base
    total_price = Column(Numeric(18, 4), nullable=True)              # precio total pagado
    purchase_platform = Column(String(100), nullable=True)           # plataforma de compra (metales e inversiones)
    piece_id = Column(String(100), nullable=True)                    # ID de la pieza, solo para lingotes

    # --- Efectivo ---
    bill_type = Column(String(50), nullable=True)                    # tipo de billete
    income_month = Column(String(7), nullable=True)                  # mes del ingreso, formato YYYY-MM

    # --- Ahorros ---
    tx_hash = Column(String(255), nullable=True)                     # hash de la transferencia

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    asset_type = relationship("AssetType", back_populates="transactions")


class User(Base):
    """
    Usuario de la aplicacion. Es un sistema personal: se crea uno la primera
    vez que se abre la web y a partir de ahi el registro queda cerrado.
    """
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(50), unique=True, nullable=False)
    # Hash bcrypt. La contrasena en claro no se guarda ni se registra nunca.
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    sessions = relationship("Session", back_populates="user", cascade="all, delete-orphan")


class Session(Base):
    """
    Sesion abierta. Se guarda solo el SHA-256 del token, no el token en si:
    si alguien leyera la base de datos no podria suplantar una sesion viva.
    Guardarlas en servidor permite ademas revocarlas al cerrar sesion.
    """
    __tablename__ = "sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token_hash = Column(String(64), unique=True, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=False)

    user = relationship("User", back_populates="sessions")


class SpotPrice(Base):
    """
    Cache de precios spot obtenidos periodicamente de la API de mercado.
    Un simbolo (XAU, XAG...) puede tener muchas filas historicas.
    """
    __tablename__ = "spot_prices"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    symbol = Column(String(10), nullable=False, index=True)
    price_per_troy_ounce = Column(Numeric(18, 4), nullable=False)
    currency = Column(String(3), nullable=False, default="USD")
    fetched_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)


