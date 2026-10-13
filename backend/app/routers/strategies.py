"""
Estrategias de reparto del sueldo.

Herramienta de planificacion aislada: define que porcentaje del sueldo va a
cada concepto. No lee ni modifica activos, huchas ni cuentas, y no toca el
patrimonio. Es deliberado: sirve para decidir, no para registrar.

La suma de porcentajes puede pasar de 100. No se bloquea a proposito, porque
mientras se reparte es normal pasarse un momento; la interfaz lo avisa.
"""

import uuid
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import crud, models, schemas
from ..database import get_db

router = APIRouter(prefix="/strategies", tags=["strategies"])


def _to_out(strategy: models.Strategy) -> schemas.StrategyOut:
    return schemas.StrategyOut(
        id=strategy.id,
        name=strategy.name,
        salary=strategy.salary,
        currency=strategy.currency,
        note=strategy.note,
        created_at=strategy.created_at,
        items=[schemas.StrategyItemOut.model_validate(i) for i in strategy.items],
        total_percentage=sum((i.percentage for i in strategy.items), Decimal("0")),
    )


@router.get("", response_model=list[schemas.StrategyOut])
def list_strategies(db: Session = Depends(get_db)):
    return [_to_out(s) for s in crud.list_strategies(db)]


@router.post("", response_model=schemas.StrategyOut, status_code=201)
def create_strategy(payload: schemas.StrategyCreate, db: Session = Depends(get_db)):
    if not payload.name.strip():
        raise HTTPException(status_code=422, detail="La estrategia necesita un nombre.")
    return _to_out(crud.create_strategy(db, payload))


@router.put("/{strategy_id}", response_model=schemas.StrategyOut)
def update_strategy(
    strategy_id: uuid.UUID, payload: schemas.StrategyUpdate, db: Session = Depends(get_db),
):
    strategy = crud.update_strategy(db, strategy_id, payload)
    if strategy is None:
        raise HTTPException(status_code=404, detail="Estrategia no encontrada.")
    return _to_out(strategy)


@router.delete("/{strategy_id}", status_code=204)
def delete_strategy(strategy_id: uuid.UUID, db: Session = Depends(get_db)):
    if not crud.delete_strategy(db, strategy_id):
        raise HTTPException(status_code=404, detail="Estrategia no encontrada.")


# --- Lineas del reparto ---

@router.post("/items", response_model=schemas.StrategyItemOut, status_code=201)
def create_item(payload: schemas.StrategyItemCreate, db: Session = Depends(get_db)):
    if crud.get_strategy(db, payload.strategy_id) is None:
        raise HTTPException(status_code=404, detail="Estrategia no encontrada.")
    if not payload.name.strip():
        raise HTTPException(status_code=422, detail="La línea necesita un nombre.")
    return crud.create_strategy_item(db, payload)


@router.put("/items/{item_id}", response_model=schemas.StrategyItemOut)
def update_item(
    item_id: uuid.UUID, payload: schemas.StrategyItemUpdate, db: Session = Depends(get_db),
):
    if crud.get_strategy(db, payload.strategy_id) is None:
        raise HTTPException(status_code=404, detail="Estrategia no encontrada.")
    item = crud.update_strategy_item(db, item_id, payload)
    if item is None:
        raise HTTPException(status_code=404, detail="Línea no encontrada.")
    return item


@router.delete("/items/{item_id}", status_code=204)
def delete_item(item_id: uuid.UUID, db: Session = Depends(get_db)):
    if not crud.delete_strategy_item(db, item_id):
        raise HTTPException(status_code=404, detail="Línea no encontrada.")
