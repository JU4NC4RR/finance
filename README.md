# Boveda — Monitor de finanzas personales

Sistema propio, autoalojado, para monitorizar tu patrimonio en:

- Oro fisico
- Plata fisica
- Efectivo

Disenado para **escalar sin tocar el esquema de datos**: anadir un nuevo
tipo de activo (platino, una segunda divisa de efectivo, acciones...) es
una fila nueva en la tabla `asset_types`, no un cambio de codigo.

## Arquitectura

```
                 ┌────────────┐        ┌──────────────┐
   navegador ───▶│  frontend  │──API──▶│   backend    │──▶ Postgres
                 │ React+Vite │        │   FastAPI    │
                 │  (nginx)   │        │ + APScheduler│──▶ gold-api.com (oro/plata)
                 └────────────┘        └──────────────┘──▶ frankfurter.app (divisas)
```

- **backend** (FastAPI): API REST + tarea programada que refresca el precio
  spot de oro/plata cada `PRICE_REFRESH_SECONDS` (15 min por defecto) y lo
  cachea en Postgres.
- **frontend** (React + Vite, servido por nginx): dashboard con totales,
  graficas y formulario para registrar movimientos.
- **db** (PostgreSQL): unica fuente de verdad, con volumen persistente.

## Requisitos

- Docker Desktop (o Docker Engine + Compose plugin) instalado y corriendo.
- Python 3.9+ solo para ejecutar el script de despliegue (no hace falta
  ningun entorno virtual ni instalar dependencias Python en tu maquina).

## Despliegue

Desde la carpeta del proyecto:

```bash
python3 deploy.py
```

Esto:

1. Crea `.env` a partir de `.env.example` si no existe.
2. Construye y levanta los 3 contenedores (`db`, `backend`, `frontend`).
3. Espera a que el backend este sano.
4. Imprime las URLs finales.

Por defecto:

- Dashboard: http://localhost:8093
- API: http://localhost:8093/api
- Documentacion interactiva de la API: http://localhost:8093/api/docs

Todo el sistema se sirve por un unico puerto. El frontend (nginx) hace de proxy
hacia el backend bajo `/api`, asi que ni el backend ni Postgres publican puertos
en tu maquina: solo son accesibles desde la red interna de Docker.

### Otros comandos utiles

```bash
python3 deploy.py --down       # detiene y elimina los contenedores (los datos persisten en el volumen)
python3 deploy.py --no-build   # levanta sin reconstruir imagenes (arranque mas rapido)
python3 deploy.py --logs       # despliega y se queda mostrando logs en directo
```

## Configuracion (`.env`)

| Variable                | Descripcion                                      | Por defecto |
|--------------------------|--------------------------------------------------|-------------|
| `POSTGRES_USER/PASSWORD/DB` | Credenciales de la base de datos              | finanzas / cambia-esta-clave / finanzas |
| `BASE_CURRENCY`          | Divisa en la que se muestra todo el patrimonio    | EUR |
| `PRICE_REFRESH_SECONDS`  | Frecuencia de refresco del precio spot            | 900 |
| `FRONTEND_PORT`          | Unico puerto publicado en tu maquina              | 8093 |
| `FRONTEND_API_URL`       | Ruta con la que el navegador llama a la API       | /api |

Cambia `POSTGRES_PASSWORD` antes de usarlo en serio.

El fichero `.env` **no se sube a git** (esta en `.gitignore`) porque contiene esa
contrasena. Lo que se versiona es `.env.example`.

## Como escalar el sistema mas adelante

- **Nuevo tipo de activo**: `POST /asset-types` (o insertarlo directamente
  en la tabla). Si cotiza en mercado, indica su `market_symbol` (por
  ejemplo `XPT` para platino) y el backend empezara a valorarlo
  automaticamente.
- **Nueva fuente de precios**: anade una funcion en `price_service.py` y
  registra el simbolo en `TRACKED_METAL_SYMBOLS`.
- **Multiusuario / autenticacion**: hoy el sistema es de un unico usuario
  local. Anadir usuarios seria una tabla `users` + un `owner_id` en
  `transactions`, y un layer de auth (JWT) delante de FastAPI.
- **Mas contenedores**: el `docker-compose.yml` ya esta pensado para
  anadir servicios nuevos (por ejemplo un worker separado para tareas
  pesadas) sin tocar `deploy.py`.

## Estructura del repositorio

```
deploy.py                  <- unico fichero que hay que ejecutar
docker-compose.yml
.env.example
backend/
  Dockerfile
  requirements.txt
  app/
    main.py                <- arranque, scheduler, CORS
    models.py               <- esquema (asset_types, transactions, spot_prices)
    schemas.py               <- validacion Pydantic
    crud.py
    price_service.py        <- integracion con APIs de precios externas
    seed.py                 <- siembra oro/plata/efectivo al primer arranque
    routers/
      asset_types.py
      transactions.py
      dashboard.py
frontend/
  Dockerfile
  src/
    App.jsx
    components/
```
