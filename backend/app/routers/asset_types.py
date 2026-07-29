from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..database import get_db

router = APIRouter(prefix="/asset-types", tags=["asset-types"])


@router.get("", response_model=list[schemas.AssetTypeOut])
def get_asset_types(only_active: bool = True, db: Session = Depends(get_db)):
    return crud.list_asset_types(db, only_active=only_active)


@router.post("", response_model=schemas.AssetTypeOut, status_code=201)
def create_asset_type(payload: schemas.AssetTypeCreate, db: Session = Depends(get_db)):
    """
    Punto de extension: para anadir un nuevo tipo de activo (platino,
    acciones, otra divisa de efectivo...) basta con llamar aqui, no hace
    falta tocar el esquema de la base de datos ni desplegar de nuevo.
    """
    existing = crud.get_asset_type_by_code(db, payload.code)
    if existing:
        raise HTTPException(status_code=409, detail=f"Ya existe un asset_type con code={payload.code}")
    return crud.create_asset_type(db, payload)
