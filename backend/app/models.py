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
    # 32 y no 10: un fondo resuelto desde ISIN da simbolos largos
    # como "IE00BYX5MX67.SG" o "0P0001CLDM.F".
    market_symbol = Column(String(32), nullable=True)                # XAU, XAG, SPY, VWCE.DE...
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


class Jar(Base):
    """
    Hucha: un sobre donde apartar dinero por concepto (gasolina, ocio...).

    Circuito independiente: el saldo sale UNICAMENTE de los movimientos que el
    usuario registra en la propia hucha. No se deduce de Efectivo, ni de
    Ahorros, ni de ningun otro activo, y tampoco se suma al patrimonio
    (decision del usuario; ver routers/jars.py).
    """
    __tablename__ = "jars"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(60), nullable=False)
    color = Column(String(20), nullable=False, default="cash")   # clave de la paleta
    # Objetivo opcional de ahorro, para pintar una barra de progreso.
    target_amount = Column(Numeric(18, 2), nullable=True)
    currency = Column(String(3), nullable=False, default="EUR")
    note = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    entries = relationship(
        "JarEntry", back_populates="jar", cascade="all, delete-orphan",
    )


class Strategy(Base):
    """
    Estrategia de reparto del sueldo: "de lo que entra, tanto por ciento a
    cada cosa". Es una herramienta de planificacion aislada: no lee ni escribe
    en activos, huchas ni cuentas.
    """
    __tablename__ = "strategies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(60), nullable=False)
    # Sueldo de referencia sobre el que se calculan los importes. Opcional:
    # sin el, la estrategia sigue siendo valida en porcentajes.
    salary = Column(Numeric(18, 2), nullable=True)
    currency = Column(String(3), nullable=False, default="EUR")
    note = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    items = relationship(
        "StrategyItem", back_populates="strategy",
        cascade="all, delete-orphan", order_by="StrategyItem.created_at",
    )


class StrategyItem(Base):
    """Una linea del reparto: un concepto y el porcentaje que se le asigna."""
    __tablename__ = "strategy_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    strategy_id = Column(
        UUID(as_uuid=True), ForeignKey("strategies.id", ondelete="CASCADE"), nullable=False,
    )
    name = Column(String(60), nullable=False)
    percentage = Column(Numeric(6, 2), nullable=False)
    color = Column(String(20), nullable=False, default="cash")
    note = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    strategy = relationship("Strategy", back_populates="items")


class BankAccount(Base):
    """
    Cuenta bancaria. Igual que las huchas, es un circuito independiente: su
    saldo sale solo de sus movimientos y no se suma al patrimonio.
    """
    __tablename__ = "bank_accounts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(60), nullable=False)                # "Cuenta nomina"
    bank = Column(String(60), nullable=True)                 # "BBVA"
    color = Column(String(20), nullable=False, default="sp500")
    # Saldo de partida, para no tener que inventarse un ingreso inicial falso.
    initial_balance = Column(Numeric(18, 2), nullable=False, default=0)
    currency = Column(String(3), nullable=False, default="EUR")
    note = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    movements = relationship(
        "BankMovement", back_populates="account", cascade="all, delete-orphan",
    )


class BankMovement(Base):
    """
    Movimiento de una cuenta. `amount` siempre positivo; el signo lo pone
    `kind` ("income" entra, "expense" sale).

    Si lleva `jar_id`, el movimiento es un TRASPASO y arrastra automaticamente
    un apunte en esa hucha, en sentido contrario:
      - sale del banco  -> entra en la hucha
      - entra al banco  -> sale de la hucha
    El apunte generado se borra solo si se borra este movimiento (cascade),
    de modo que nunca puede quedar dinero fantasma en la hucha.
    """
    __tablename__ = "bank_movements"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    account_id = Column(
        UUID(as_uuid=True), ForeignKey("bank_accounts.id", ondelete="CASCADE"), nullable=False,
    )
    jar_id = Column(UUID(as_uuid=True), ForeignKey("jars.id", ondelete="SET NULL"), nullable=True)

    occurred_on = Column(Date, nullable=False)
    kind = Column(String(10), nullable=False)
    amount = Column(Numeric(18, 2), nullable=False)
    concept = Column(String(120), nullable=True)
    note = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    account = relationship("BankAccount", back_populates="movements")
    jar = relationship("Jar")
    linked_entry = relationship(
        "JarEntry", back_populates="bank_movement",
        cascade="all, delete-orphan", uselist=False,
    )


class JarEntry(Base):
    """
    Movimiento de una hucha. `kind` vale "income" o "expense" y `amount` es
    siempre positivo: el signo lo pone el tipo, de modo que no puede colarse
    un gasto negativo que acabe sumando.
    """
    __tablename__ = "jar_entries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    jar_id = Column(UUID(as_uuid=True), ForeignKey("jars.id", ondelete="CASCADE"), nullable=False)

    occurred_on = Column(Date, nullable=False)
    kind = Column(String(10), nullable=False)
    amount = Column(Numeric(18, 2), nullable=False)
    concept = Column(String(120), nullable=True)
    note = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Si viene de un traspaso bancario, este apunte lo gobierna la cuenta: no
    # se puede editar ni borrar desde la hucha, solo desde el movimiento origen.
    bank_movement_id = Column(
        UUID(as_uuid=True), ForeignKey("bank_movements.id", ondelete="CASCADE"), nullable=True,
    )

    jar = relationship("Jar", back_populates="entries")
    bank_movement = relationship("BankMovement", back_populates="linked_entry")


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
    api_tokens = relationship("ApiToken", back_populates="user", cascade="all, delete-orphan")


class ApiToken(Base):
    """
    Token para llamar a la API sin navegador (copias de seguridad programadas,
    scripts...). Igual que las sesiones, solo se guarda su SHA-256: el valor en
    claro se ensena una unica vez, al crearlo.

    Da acceso de lectura y escritura a los datos, pero NO permite crear mas
    tokens ni cambiar la contrasena: eso exige sesion de navegador, para que un
    token filtrado no sirva para apoderarse de la cuenta.
    """
    __tablename__ = "api_tokens"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(60), nullable=False)
    token_hash = Column(String(64), unique=True, nullable=False, index=True)
    # Primeros caracteres, para reconocer cual es cual en la lista.
    prefix = Column(String(16), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_used_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="api_tokens")


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
    symbol = Column(String(32), nullable=False, index=True)
    price_per_troy_ounce = Column(Numeric(18, 4), nullable=False)
    currency = Column(String(3), nullable=False, default="USD")
    fetched_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)


