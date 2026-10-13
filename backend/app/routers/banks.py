"""
Cuentas bancarias.

Como las huchas, son un circuito independiente: su saldo sale solo de sus
movimientos y no se suma al patrimonio.

Traspasos: un movimiento con `jar_id` mueve dinero entre la cuenta y esa
hucha, y genera automaticamente el apunte espejo en la hucha, en sentido
contrario (sale del banco -> entra en la hucha, y viceversa). Ese apunte lo
gobierna siempre el movimiento bancario: se crea, se actualiza y se borra con
el, de modo que los dos saldos no pueden descuadrarse.
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

router = APIRouter(prefix="/bank-accounts", tags=["banks"])

_MONTHS = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
]

# Un traspaso mueve el dinero en direccion opuesta en cada lado.
_MIRROR = {"expense": "income", "income": "expense"}


def _totals_by_account(db: Session):
    totals = defaultdict(lambda: {"income": Decimal("0"), "expense": Decimal("0"), "count": 0})
    for mov in db.query(models.BankMovement).all():
        bucket = totals[mov.account_id]
        bucket[mov.kind] += mov.amount
        bucket["count"] += 1
    return totals


def _to_out(account: models.BankAccount, totals) -> schemas.BankAccountOut:
    t = totals[account.id]
    initial = account.initial_balance or Decimal("0")
    return schemas.BankAccountOut(
        id=account.id,
        name=account.name,
        bank=account.bank,
        color=account.color,
        initial_balance=initial,
        currency=account.currency,
        note=account.note,
        created_at=account.created_at,
        total_income=t["income"],
        total_expense=t["expense"],
        balance=initial + t["income"] - t["expense"],
        num_movements=t["count"],
    )


def _sync_linked_entry(db: Session, mov: models.BankMovement) -> None:
    """
    Deja el apunte de la hucha en sintonia con el movimiento bancario: lo crea,
    lo actualiza o lo elimina segun este puesta o no la hucha destino.
    """
    entry = mov.linked_entry

    if mov.jar_id is None:
        if entry is not None:
            db.delete(entry)          # dejo de ser traspaso: fuera el espejo
        return

    concept = mov.concept or f"Traspaso · {mov.account.name}"
    if entry is None:
        db.add(models.JarEntry(
            jar_id=mov.jar_id,
            occurred_on=mov.occurred_on,
            kind=_MIRROR[mov.kind],
            amount=mov.amount,
            concept=concept,
            note=mov.note,
            bank_movement_id=mov.id,
        ))
    else:
        entry.jar_id = mov.jar_id
        entry.occurred_on = mov.occurred_on
        entry.kind = _MIRROR[mov.kind]
        entry.amount = mov.amount
        entry.concept = concept
        entry.note = mov.note


@router.get("", response_model=list[schemas.BankAccountOut])
def list_accounts(db: Session = Depends(get_db)):
    totals = _totals_by_account(db)
    return [_to_out(a, totals) for a in crud.list_bank_accounts(db)]


@router.get("/summary", response_model=schemas.BanksSummary)
def summary(db: Session = Depends(get_db)):
    totals = _totals_by_account(db)
    accounts = [_to_out(a, totals) for a in crud.list_bank_accounts(db)]

    today = date.today()
    month_income = Decimal("0")
    month_expense = Decimal("0")
    for mov in db.query(models.BankMovement).all():
        if mov.occurred_on.year == today.year and mov.occurred_on.month == today.month:
            if mov.kind == "income":
                month_income += mov.amount
            else:
                month_expense += mov.amount

    return schemas.BanksSummary(
        base_currency=settings.base_currency,
        total_balance=sum((a.balance for a in accounts), Decimal("0")),
        month_income=month_income,
        month_expense=month_expense,
        month_label=f"{_MONTHS[today.month - 1]} {today.year}",
        accounts=accounts,
    )


@router.post("", response_model=schemas.BankAccountOut, status_code=201)
def create_account(payload: schemas.BankAccountCreate, db: Session = Depends(get_db)):
    if not payload.name.strip():
        raise HTTPException(status_code=422, detail="La cuenta necesita un nombre.")
    account = crud.create_bank_account(db, payload)
    return _to_out(account, _totals_by_account(db))


@router.put("/{account_id}", response_model=schemas.BankAccountOut)
def update_account(
    account_id: uuid.UUID, payload: schemas.BankAccountUpdate, db: Session = Depends(get_db),
):
    account = crud.update_bank_account(db, account_id, payload)
    if account is None:
        raise HTTPException(status_code=404, detail="Cuenta no encontrada.")
    return _to_out(account, _totals_by_account(db))


@router.delete("/{account_id}", status_code=204)
def delete_account(account_id: uuid.UUID, db: Session = Depends(get_db)):
    # Al borrar la cuenta caen sus movimientos y, con ellos, los apuntes
    # espejo que hubieran generado en las huchas.
    if not crud.delete_bank_account(db, account_id):
        raise HTTPException(status_code=404, detail="Cuenta no encontrada.")


# --- Movimientos ---

@router.get("/movements", response_model=list[schemas.BankMovementOut])
def list_movements(account_id: uuid.UUID | None = None, db: Session = Depends(get_db)):
    return crud.list_bank_movements(db, account_id)


def _validate(db: Session, payload) -> None:
    if crud.get_bank_account(db, payload.account_id) is None:
        raise HTTPException(status_code=404, detail="Cuenta no encontrada.")
    if payload.jar_id is not None and crud.get_jar(db, payload.jar_id) is None:
        raise HTTPException(status_code=404, detail="Hucha no encontrada.")


@router.post("/movements", response_model=schemas.BankMovementOut, status_code=201)
def create_movement(payload: schemas.BankMovementCreate, db: Session = Depends(get_db)):
    _validate(db, payload)
    mov = models.BankMovement(**payload.model_dump())
    db.add(mov)
    db.flush()               # necesito el id para enlazar el apunte espejo
    _sync_linked_entry(db, mov)
    db.commit()
    db.refresh(mov)
    return mov


@router.put("/movements/{movement_id}", response_model=schemas.BankMovementOut)
def update_movement(
    movement_id: uuid.UUID, payload: schemas.BankMovementUpdate, db: Session = Depends(get_db),
):
    _validate(db, payload)
    mov = db.get(models.BankMovement, movement_id)
    if mov is None:
        raise HTTPException(status_code=404, detail="Movimiento no encontrado.")
    for key, value in payload.model_dump().items():
        setattr(mov, key, value)
    _sync_linked_entry(db, mov)
    db.commit()
    db.refresh(mov)
    return mov


@router.delete("/movements/{movement_id}", status_code=204)
def delete_movement(movement_id: uuid.UUID, db: Session = Depends(get_db)):
    mov = db.get(models.BankMovement, movement_id)
    if mov is None:
        raise HTTPException(status_code=404, detail="Movimiento no encontrado.")
    db.delete(mov)           # el apunte espejo se va con el (cascade)
    db.commit()
