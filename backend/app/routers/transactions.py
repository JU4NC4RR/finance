import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..database import get_db

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.get("", response_model=list[schemas.TransactionOut])
def get_transactions(asset_type_id: uuid.UUID | None = None, limit: int = 500, db: Session = Depends(get_db)):
    return crud.list_transactions(db, asset_type_id=asset_type_id, limit=limit)


@router.post("", response_model=schemas.TransactionOut, status_code=201)
def create_transaction(payload: schemas.TransactionCreate, db: Session = Depends(get_db)):
    asset_type = crud.get_asset_type(db, payload.asset_type_id)
    if asset_type is None:
        raise HTTPException(status_code=404, detail="asset_type_id no existe")
    return crud.create_transaction(db, payload)


@router.put("/{transaction_id}", response_model=schemas.TransactionOut)
def update_transaction(transaction_id: uuid.UUID, payload: schemas.TransactionUpdate, db: Session = Depends(get_db)):
    asset_type = crud.get_asset_type(db, payload.asset_type_id)
    if asset_type is None:
        raise HTTPException(status_code=404, detail="asset_type_id no existe")
    obj = crud.update_transaction(db, transaction_id, payload)
    if obj is None:
        raise HTTPException(status_code=404, detail="Transaccion no encontrada")
    return obj


@router.delete("/{transaction_id}", status_code=204)
def remove_transaction(transaction_id: uuid.UUID, db: Session = Depends(get_db)):
    ok = crud.delete_transaction(db, transaction_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Transaccion no encontrada")
