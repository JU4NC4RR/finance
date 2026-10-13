"""
Huchas: dinero apartado por concepto (gasolina, ocio, imprevistos...).

Son un circuito cerrado e independiente. El saldo de cada hucha se calcula
solo con sus propios movimientos (ingresos - gastos): no sale de Efectivo, ni
de Ahorros, ni de ningun activo, y tampoco se suma al patrimonio, por decision
expresa del usuario. Si algun dia se quisiera incluir en el total, el sitio es
routers/dashboard.py, no aqui.
"""

import uuid
from collections import defaultdict
from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import crud, models, schemas
from ..config import settings
from ..database import get_db

router = APIRouter(prefix="/jars", tags=["jars"])

_MONTHS = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
]


def _totals_by_jar(db: Session):
    """Ingresos, gastos y numero de movimientos agrupados por hucha."""
    totals = defaultdict(lambda: {"income": Decimal("0"), "expense": Decimal("0"), "count": 0})
    for entry in db.query(models.JarEntry).all():
        bucket = totals[entry.jar_id]
        bucket[entry.kind] += entry.amount
        bucket["count"] += 1
    return totals


def _to_out(jar: models.Jar, totals) -> schemas.JarOut:
    t = totals[jar.id]
    return schemas.JarOut(
        id=jar.id,
        name=jar.name,
        color=jar.color,
        target_amount=jar.target_amount,
        currency=jar.currency,
        note=jar.note,
        created_at=jar.created_at,
        total_income=t["income"],
        total_expense=t["expense"],
        balance=t["income"] - t["expense"],
        num_entries=t["count"],
    )


@router.get("", response_model=list[schemas.JarOut])
def list_jars(db: Session = Depends(get_db)):
    totals = _totals_by_jar(db)
    return [_to_out(j, totals) for j in crud.list_jars(db)]


@router.get("/summary", response_model=schemas.JarsSummary)
def summary(db: Session = Depends(get_db)):
    totals = _totals_by_jar(db)
    jars = [_to_out(j, totals) for j in crud.list_jars(db)]

    today = date.today()
    month_income = Decimal("0")
    month_expense = Decimal("0")
    for entry in db.query(models.JarEntry).all():
        if entry.occurred_on.year == today.year and entry.occurred_on.month == today.month:
            if entry.kind == "income":
                month_income += entry.amount
            else:
                month_expense += entry.amount

    return schemas.JarsSummary(
        base_currency=settings.base_currency,
        total_balance=sum((j.balance for j in jars), Decimal("0")),
        month_income=month_income,
        month_expense=month_expense,
        month_label=f"{_MONTHS[today.month - 1]} {today.year}",
        jars=jars,
    )


@router.post("", response_model=schemas.JarOut, status_code=201)
def create_jar(payload: schemas.JarCreate, db: Session = Depends(get_db)):
    if not payload.name.strip():
        raise HTTPException(status_code=422, detail="La hucha necesita un nombre.")
    jar = crud.create_jar(db, payload)
    return _to_out(jar, _totals_by_jar(db))


@router.put("/{jar_id}", response_model=schemas.JarOut)
def update_jar(jar_id: uuid.UUID, payload: schemas.JarUpdate, db: Session = Depends(get_db)):
    jar = crud.update_jar(db, jar_id, payload)
    if jar is None:
        raise HTTPException(status_code=404, detail="Hucha no encontrada.")
    return _to_out(jar, _totals_by_jar(db))


@router.delete("/{jar_id}", status_code=204)
def delete_jar(jar_id: uuid.UUID, db: Session = Depends(get_db)):
    if not crud.delete_jar(db, jar_id):
        raise HTTPException(status_code=404, detail="Hucha no encontrada.")


# --- Movimientos ---

@router.get("/entries", response_model=list[schemas.JarEntryOut])
def list_entries(jar_id: uuid.UUID | None = None, db: Session = Depends(get_db)):
    return crud.list_jar_entries(db, jar_id)


@router.post("/entries", response_model=schemas.JarEntryOut, status_code=201)
def create_entry(payload: schemas.JarEntryCreate, db: Session = Depends(get_db)):
    if crud.get_jar(db, payload.jar_id) is None:
        raise HTTPException(status_code=404, detail="Hucha no encontrada.")
    return crud.create_jar_entry(db, payload)


def _reject_if_from_bank(entry: models.JarEntry | None) -> None:
    """
    Un apunte nacido de un traspaso lo gobierna la cuenta bancaria. Editarlo o
    borrarlo aqui dejaria los dos saldos descuadrados, asi que se bloquea y se
    indica donde hay que tocarlo.
    """
    if entry is not None and entry.bank_movement_id is not None:
        raise HTTPException(
            status_code=409,
            detail="Este apunte viene de un traspaso bancario. Modificalo desde la cuenta.",
        )


@router.put("/entries/{entry_id}", response_model=schemas.JarEntryOut)
def update_entry(entry_id: uuid.UUID, payload: schemas.JarEntryUpdate, db: Session = Depends(get_db)):
    if crud.get_jar(db, payload.jar_id) is None:
        raise HTTPException(status_code=404, detail="Hucha no encontrada.")
    _reject_if_from_bank(db.get(models.JarEntry, entry_id))
    entry = crud.update_jar_entry(db, entry_id, payload)
    if entry is None:
        raise HTTPException(status_code=404, detail="Movimiento no encontrado.")
    return entry


@router.delete("/entries/{entry_id}", status_code=204)
def delete_entry(entry_id: uuid.UUID, db: Session = Depends(get_db)):
    _reject_if_from_bank(db.get(models.JarEntry, entry_id))
    if not crud.delete_jar_entry(db, entry_id):
        raise HTTPException(status_code=404, detail="Movimiento no encontrado.")
