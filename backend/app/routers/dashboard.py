from collections import defaultdict
from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import crud, price_service, schemas
from ..config import settings
from ..database import get_db
from ..models import AssetCategory

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=schemas.DashboardSummary)
def get_summary(db: Session = Depends(get_db)):
    base_ccy = settings.base_currency
    asset_types = crud.list_asset_types(db)
    all_transactions = crud.list_transactions(db, limit=100_000)

    tx_by_asset = defaultdict(list)
    for tx in all_transactions:
        tx_by_asset[tx.asset_type_id].append(tx)

    summaries: list[schemas.AssetSummary] = []
    total_value = Decimal("0")
    prices_updated_at = None

    for asset_type in asset_types:
        txs = tx_by_asset.get(asset_type.id, [])
        num_transactions = len(txs)

        if asset_type.category == AssetCategory.METAL:
            fine_quantity = sum((tx.quantity * (tx.purity or Decimal("1.0")) for tx in txs), Decimal("0"))
            unit_price = None
            value = Decimal("0")
            if asset_type.market_symbol:
                price_per_gram = price_service.price_per_gram_in_currency(
                    db, asset_type.market_symbol, base_ccy
                )
                if price_per_gram is not None:
                    unit_price = Decimal(str(price_per_gram))
                    value = fine_quantity * unit_price
                    latest = crud.latest_spot_price(db, asset_type.market_symbol)
                    if latest and (prices_updated_at is None or latest.fetched_at > prices_updated_at):
                        prices_updated_at = latest.fetched_at
            summaries.append(schemas.AssetSummary(
                asset_type=asset_type,
                total_quantity=fine_quantity,
                current_unit_price_base_ccy=unit_price,
                current_value_base_ccy=value,
                num_transactions=num_transactions,
            ))
            total_value += value

        elif asset_type.category == AssetCategory.INVESTMENT and asset_type.market_symbol:
            # MODO MERCADO: el activo tiene ticker, asi que cada movimiento son
            # participaciones y el valor sale de multiplicarlas por la cotizacion
            # del momento. Es la valoracion mas fiel: precio real, no estimado.
            total_shares = sum((tx.quantity for tx in txs), Decimal("0"))
            unit_price = price_service.quote_in_currency(db, asset_type.market_symbol, base_ccy)

            value = Decimal("0")
            price_dec = None
            if unit_price is not None:
                price_dec = Decimal(str(unit_price))
                value = total_shares * price_dec
                latest = crud.latest_spot_price(db, asset_type.market_symbol)
                if latest and (prices_updated_at is None or latest.fetched_at > prices_updated_at):
                    prices_updated_at = latest.fetched_at

            summaries.append(schemas.AssetSummary(
                asset_type=asset_type,
                total_quantity=total_shares,
                current_unit_price_base_ccy=price_dec,
                current_value_base_ccy=value,
                num_transactions=num_transactions,
            ))
            total_value += value

        elif asset_type.category == AssetCategory.INVESTMENT:
            # MODO MANUAL (sin ticker): cada movimiento es una lectura del usuario
            # ("a dia X mi posicion vale Y"), no una aportacion. Por tanto el valor
            # actual es la ULTIMA lectura, nunca la suma de todas.
            latest_tx = max(txs, key=lambda t: (t.occurred_on, t.created_at)) if txs else None
            value = Decimal("0")
            if latest_tx is not None:
                fx = price_service.fetch_fx_rate(latest_tx.currency, base_ccy) or 1.0
                value = latest_tx.quantity * Decimal(str(fx))

            summaries.append(schemas.AssetSummary(
                asset_type=asset_type,
                total_quantity=latest_tx.quantity if latest_tx is not None else Decimal("0"),
                current_unit_price_base_ccy=None,
                current_value_base_ccy=value,
                num_transactions=num_transactions,
                last_valued_on=latest_tx.occurred_on if latest_tx is not None else None,
            ))
            total_value += value

        else:  # CASH, SAVINGS u OTHER: se valora 1:1 convirtiendo cada movimiento a la divisa base
            total_quantity = sum((tx.quantity for tx in txs), Decimal("0"))
            value = Decimal("0")
            for tx in txs:
                fx = price_service.fetch_fx_rate(tx.currency, base_ccy) or 1.0
                value += tx.quantity * Decimal(str(fx))
            summaries.append(schemas.AssetSummary(
                asset_type=asset_type,
                total_quantity=total_quantity,
                current_unit_price_base_ccy=None,
                current_value_base_ccy=value,
                num_transactions=num_transactions,
            ))
            total_value += value

    return schemas.DashboardSummary(
        base_currency=base_ccy,
        total_value_base_ccy=total_value,
        assets=summaries,
        prices_updated_at=prices_updated_at,
    )


@router.get("/prices", response_model=list[schemas.SpotPriceOut])
def get_latest_prices(db: Session = Depends(get_db)):
    out = []
    for symbol in price_service.TRACKED_METAL_SYMBOLS:
        latest = crud.latest_spot_price(db, symbol)
        if latest:
            out.append(latest)
    return out
