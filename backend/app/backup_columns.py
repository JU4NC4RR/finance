"""
Columnas de la copia de seguridad en Excel, compartidas entre exportacion
e importacion. Cada especificacion sabe leer el valor de una Transaction
(to_cell) y volver a interpretarlo desde una celda de Excel (from_cell),
para que ambas direcciones usen exactamente el mismo contrato de columnas.
"""

import re
import uuid
from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from typing import Any, Callable, Optional

from . import models


def sanitize_sheet_name(name: str) -> str:
    # Excel prohibe : \ / ? * [ ] en el nombre de hoja y lo limita a 31 caracteres
    cleaned = re.sub(r"[:\\/?*\[\]]", "-", name)
    return cleaned[:31] or "Hoja"


def _naive(dt):
    # openpyxl no admite datetimes con zona horaria
    return dt.replace(tzinfo=None) if dt is not None else None


def _blank(value: Any) -> bool:
    return value is None or (isinstance(value, str) and not value.strip())


def parse_str(value: Any) -> Optional[str]:
    if _blank(value):
        return None
    return str(value).strip()


def parse_decimal(value: Any) -> Optional[Decimal]:
    if _blank(value):
        return None
    try:
        return Decimal(str(value).strip())
    except InvalidOperation:
        return None


def parse_int(value: Any) -> Optional[int]:
    if _blank(value):
        return None
    try:
        return int(float(str(value).strip()))
    except ValueError:
        return None


def parse_date(value: Any):
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    if _blank(value):
        return None
    try:
        return date.fromisoformat(str(value).strip()[:10])
    except ValueError:
        return None


def parse_datetime(value: Any):
    if isinstance(value, datetime):
        return value
    if isinstance(value, date):
        return datetime.combine(value, datetime.min.time())
    if _blank(value):
        return None
    try:
        return datetime.fromisoformat(str(value).strip())
    except ValueError:
        return None


def parse_uuid(value: Any):
    if _blank(value):
        return None
    try:
        return uuid.UUID(str(value).strip())
    except ValueError:
        return None


@dataclass(frozen=True)
class ColumnSpec:
    header: str
    field: str
    to_cell: Callable[[models.Transaction], Any]
    from_cell: Callable[[Any], Any]


def _col(header, field, from_cell, getter=None):
    getter = getter or (lambda t, f=field: getattr(t, f))
    return ColumnSpec(header, field, getter, from_cell)


METAL_COLUMNS = [
    _col("ID", "id", parse_uuid, lambda t: str(t.id)),
    _col("Fecha de compra", "occurred_on", parse_date),
    _col("Nombre", "item_name", parse_str),
    _col("Tipo", "item_type", parse_str),
    _col("Peso (g)", "quantity", parse_decimal),
    _col("Pureza", "purity", parse_decimal),
    _col("Año del activo", "asset_year", parse_int),
    _col("ID factura", "invoice_id", parse_str),
    _col("Precio base", "base_price", parse_decimal),
    _col("Precio total", "total_price", parse_decimal),
    _col("Moneda", "currency", parse_str),
    _col("Plataforma de compra", "purchase_platform", parse_str),
    _col("ID del lingote", "piece_id", parse_str),
    _col("Nota", "note", parse_str),
    _col("Creado", "created_at", parse_datetime, lambda t: _naive(t.created_at)),
]

CASH_COLUMNS = [
    _col("ID", "id", parse_uuid, lambda t: str(t.id)),
    _col("Mes del ingreso", "income_month", parse_str),
    _col("Tipo de billete", "bill_type", parse_str),
    _col("Importe", "quantity", parse_decimal),
    _col("Moneda", "currency", parse_str),
    _col("Referencia", "reference_number", parse_str),
    _col("Nota", "note", parse_str),
    _col("Creado", "created_at", parse_datetime, lambda t: _naive(t.created_at)),
]

INVESTMENT_COLUMNS = [
    _col("ID", "id", parse_uuid, lambda t: str(t.id)),
    _col("Fecha de valoracion", "occurred_on", parse_date),
    _col("Valor de la posicion", "quantity", parse_decimal),
    _col("Moneda", "currency", parse_str),
    _col("Nota", "note", parse_str),
    _col("Creado", "created_at", parse_datetime, lambda t: _naive(t.created_at)),
]

SAVINGS_COLUMNS = [
    _col("ID", "id", parse_uuid, lambda t: str(t.id)),
    _col("Fecha del ingreso", "occurred_on", parse_date),
    _col("Importe", "quantity", parse_decimal),
    _col("Moneda", "currency", parse_str),
    _col("Hash de la transferencia", "tx_hash", parse_str),
    _col("Nota", "note", parse_str),
    _col("Creado", "created_at", parse_datetime, lambda t: _naive(t.created_at)),
]

DEFAULT_COLUMNS = [
    _col("ID", "id", parse_uuid, lambda t: str(t.id)),
    _col("Fecha", "occurred_on", parse_date),
    _col("Cantidad", "quantity", parse_decimal),
    _col("Moneda", "currency", parse_str),
    _col("Nota", "note", parse_str),
    _col("Creado", "created_at", parse_datetime, lambda t: _naive(t.created_at)),
]


def columns_for_category(category: models.AssetCategory):
    return {
        models.AssetCategory.METAL: METAL_COLUMNS,
        models.AssetCategory.CASH: CASH_COLUMNS,
        models.AssetCategory.INVESTMENT: INVESTMENT_COLUMNS,
        models.AssetCategory.SAVINGS: SAVINGS_COLUMNS,
    }.get(category, DEFAULT_COLUMNS)
