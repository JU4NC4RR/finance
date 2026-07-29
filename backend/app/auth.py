"""
Control de acceso de la aplicacion.

Modelo: un unico usuario, creado la primera vez que se abre la web. A partir
de ahi el alta queda cerrada y cada visita exige iniciar sesion.

Decisiones de seguridad:
  - La contrasena se guarda como hash bcrypt (con sal por contrasena). Nunca
    se almacena ni se escribe en logs en claro.
  - El token de sesion es aleatorio (secrets.token_urlsafe) y en base de datos
    solo vive su SHA-256, asi un volcado de la BD no permite suplantar sesiones.
  - Viaja en una cookie HttpOnly, de modo que el JavaScript de la pagina no
    puede leerla y un XSS no puede robarla.
  - SameSite=Lax evita que otra web haga peticiones autenticadas en tu nombre.
"""

import hashlib
import secrets
from datetime import datetime, timedelta, timezone

import bcrypt
from fastapi import Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session as DbSession

from . import models
from .config import settings
from .database import get_db

COOKIE_NAME = "boveda_session"
# Comparar contra un hash real evita que se pueda distinguir por tiempo de
# respuesta si un usuario existe o no cuando el login falla.
_DUMMY_HASH = bcrypt.hashpw(b"dummy-password-for-timing", bcrypt.gensalt())


# ---------- Contrasenas ----------

def hash_password(password: str) -> str:
    # bcrypt trunca silenciosamente a partir de 72 bytes; se corta aqui de
    # forma explicita para que el comportamiento sea el mismo al verificar.
    return bcrypt.hashpw(password.encode("utf-8")[:72], bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8")[:72], password_hash.encode())


def waste_time_like_a_real_check() -> None:
    """Consume el mismo tiempo que una verificacion real cuando no hay usuario."""
    bcrypt.checkpw(b"dummy-password-for-timing", _DUMMY_HASH)


# ---------- Sesiones ----------

def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def create_session(db: DbSession, user: models.User) -> str:
    token = secrets.token_urlsafe(32)
    db.add(models.Session(
        user_id=user.id,
        token_hash=_hash_token(token),
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.session_days),
    ))
    db.commit()
    return token


def revoke_session(db: DbSession, token: str) -> None:
    row = db.query(models.Session).filter(
        models.Session.token_hash == _hash_token(token)
    ).first()
    if row is not None:
        db.delete(row)
        db.commit()


def set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        max_age=settings.session_days * 24 * 3600,
        httponly=True,
        samesite="lax",
        secure=settings.cookie_secure,
        path="/",
    )


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(COOKIE_NAME, path="/")


def current_user(request: Request, db: DbSession) -> models.User | None:
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        return None

    row = db.query(models.Session).filter(
        models.Session.token_hash == _hash_token(token)
    ).first()
    if row is None:
        return None

    if row.expires_at <= datetime.now(timezone.utc):
        db.delete(row)  # sesion caducada: se limpia al pasar por aqui
        db.commit()
        return None

    return row.user


# ---------- Dependencia para proteger rutas ----------

def require_user(request: Request, db: DbSession = Depends(get_db)) -> models.User:
    user = current_user(request, db)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Necesitas iniciar sesion.",
        )
    return user


def user_count(db: DbSession) -> int:
    return db.query(models.User).count()
