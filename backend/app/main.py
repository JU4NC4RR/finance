import logging
from contextlib import asynccontextmanager

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from . import price_service
from .auth import require_user
from .config import settings
from .database import Base, SessionLocal, engine
from .routers import asset_types, auth, dashboard, export, transactions
from .seed import seed_default_asset_types


def run_lightweight_migrations():
    """
    Este proyecto no usa Alembic: para un sistema personal de un solo
    usuario basta con anadir columnas nuevas de forma idempotente al
    arrancar, sin perder los datos ya guardados en el volumen.
    """
    new_columns = [
        "reference_number VARCHAR(100)",
        "item_name VARCHAR(150)",
        "item_type VARCHAR(20)",
        "asset_year INTEGER",
        "invoice_id VARCHAR(100)",
        "base_price NUMERIC(18,4)",
        "total_price NUMERIC(18,4)",
        "purchase_platform VARCHAR(100)",
        "piece_id VARCHAR(100)",
        "bill_type VARCHAR(50)",
        "income_month VARCHAR(7)",
        "tx_hash VARCHAR(255)",
    ]
    with engine.begin() as conn:
        for column_def in new_columns:
            conn.execute(text(f"ALTER TABLE transactions ADD COLUMN IF NOT EXISTS {column_def}"))

    # ALTER TYPE ... ADD VALUE no puede ejecutarse dentro de una transaccion
    # que luego use ese valor, asi que va en su propia conexion autocommit.
    with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
        conn.execute(text("ALTER TYPE assetcategory ADD VALUE IF NOT EXISTS 'INVESTMENT'"))
        conn.execute(text("ALTER TYPE assetcategory ADD VALUE IF NOT EXISTS 'SAVINGS'"))

    # Las inversiones pasaron de contar participaciones a anotar el valor de la
    # posicion, asi que su unidad ya no es "participaciones" sino un importe en
    # la divisa base. Solo toca el catalogo, nunca los movimientos guardados.
    with engine.begin() as conn:
        conn.execute(
            text(
                "UPDATE asset_types SET unit = 'unit', currency = :ccy "
                "WHERE category = 'INVESTMENT' AND unit <> 'unit'"
            ),
            {"ccy": settings.base_currency},
        )

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("main")

scheduler = BackgroundScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Crear tablas si no existen
    Base.metadata.create_all(bind=engine)
    run_lightweight_migrations()

    # 2. Sembrar tipos de activo por defecto (oro, plata, efectivo)
    db = SessionLocal()
    try:
        seed_default_asset_types(db)
    finally:
        db.close()

    # 3. Cargar un precio inicial y arrancar el refresco periodico en segundo plano
    price_service.refresh_all_spot_prices()
    scheduler.add_job(
        price_service.refresh_all_spot_prices,
        "interval",
        seconds=settings.price_refresh_seconds,
        id="refresh_spot_prices",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("Scheduler de precios arrancado (cada %s s)", settings.price_refresh_seconds)

    yield

    scheduler.shutdown(wait=False)


app = FastAPI(title="Finanzas API", version="1.0.0", lifespan=lifespan)

# La web y la API se sirven desde el mismo origen (nginx hace de proxy en
# /api), asi que el navegador no necesita CORS. Se deja permisivo para poder
# atacar la API con curl desde otra maquina, pero SIN allow_credentials: asi
# una web de terceros no puede usar tu cookie de sesion aunque te enganen para
# visitarla; su peticion saldria sin autenticar.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)

app.include_router(auth.router)

# Todo lo que toca datos exige sesion iniciada.
protected = [Depends(require_user)]
app.include_router(asset_types.router, dependencies=protected)
app.include_router(transactions.router, dependencies=protected)
app.include_router(dashboard.router, dependencies=protected)
app.include_router(export.router, dependencies=protected)


@app.get("/health")
def health():
    """Publico a proposito: lo usa el healthcheck del contenedor."""
    return {"status": "ok"}
