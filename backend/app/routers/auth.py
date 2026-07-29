import logging
import time
from threading import Lock

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session as DbSession

from .. import auth, models, schemas
from ..config import settings
from ..database import get_db

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger("auth")

# Freno sencillo a la fuerza bruta. Al ser un sistema de un solo usuario basta
# con un contador en memoria: tras varios fallos seguidos se bloquea el login
# unos segundos. Se reinicia al acertar o al reiniciar el backend.
_MAX_ATTEMPTS = 5
_LOCKOUT_SECONDS = 60
_attempts = {"count": 0, "blocked_until": 0.0}
_attempts_lock = Lock()


def _check_not_locked() -> None:
    with _attempts_lock:
        remaining = _attempts["blocked_until"] - time.monotonic()
        if remaining > 0:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Demasiados intentos fallidos. Prueba de nuevo en {int(remaining) + 1} s.",
            )


def _register_failure() -> None:
    with _attempts_lock:
        _attempts["count"] += 1
        if _attempts["count"] >= _MAX_ATTEMPTS:
            _attempts["count"] = 0
            _attempts["blocked_until"] = time.monotonic() + _LOCKOUT_SECONDS


def _register_success() -> None:
    with _attempts_lock:
        _attempts["count"] = 0
        _attempts["blocked_until"] = 0.0


@router.get("/status", response_model=schemas.AuthStatus)
def get_status(request: Request, db: DbSession = Depends(get_db)):
    """Dice al frontend que pantalla mostrar: alta inicial, login o la app."""
    user = auth.current_user(request, db)
    return schemas.AuthStatus(
        needs_setup=auth.user_count(db) == 0,
        authenticated=user is not None,
        username=user.username if user else None,
    )


@router.post("/setup", response_model=schemas.UserOut)
def setup(payload: schemas.CredentialsIn, response: Response, db: DbSession = Depends(get_db)):
    """
    Crea el usuario inicial. Solo funciona si aun no existe ninguno: una vez
    creado, este endpoint responde 409 y no hay forma de darse de alta.
    """
    if auth.user_count(db) > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe un usuario. Inicia sesion.",
        )

    username = payload.username.strip()
    if len(username) < 3:
        raise HTTPException(status_code=422, detail="El usuario debe tener al menos 3 caracteres.")
    if len(payload.password) < settings.min_password_length:
        raise HTTPException(
            status_code=422,
            detail=f"La contrasena debe tener al menos {settings.min_password_length} caracteres.",
        )

    user = models.User(username=username, password_hash=auth.hash_password(payload.password))
    db.add(user)
    db.commit()
    db.refresh(user)

    auth.set_session_cookie(response, auth.create_session(db, user))
    logger.info("Usuario inicial creado: %s", username)
    return user


@router.post("/login", response_model=schemas.UserOut)
def login(payload: schemas.CredentialsIn, response: Response, db: DbSession = Depends(get_db)):
    _check_not_locked()

    user = db.query(models.User).filter(models.User.username == payload.username.strip()).first()

    # Mismo mensaje y mismo coste si falla el usuario o la contrasena, para no
    # revelar cual de los dos es el incorrecto.
    if user is None:
        auth.waste_time_like_a_real_check()
        _register_failure()
        raise HTTPException(status_code=401, detail="Usuario o contrasena incorrectos.")

    if not auth.verify_password(payload.password, user.password_hash):
        _register_failure()
        raise HTTPException(status_code=401, detail="Usuario o contrasena incorrectos.")

    _register_success()
    auth.set_session_cookie(response, auth.create_session(db, user))
    return user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(request: Request, response: Response, db: DbSession = Depends(get_db)):
    token = request.cookies.get(auth.COOKIE_NAME)
    if token:
        auth.revoke_session(db, token)
    auth.clear_session_cookie(response)


@router.post("/password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(
    payload: schemas.PasswordChangeIn,
    request: Request,
    response: Response,
    db: DbSession = Depends(get_db),
    user: models.User = Depends(auth.require_user),
):
    if not auth.verify_password(payload.current_password, user.password_hash):
        raise HTTPException(status_code=401, detail="La contrasena actual no es correcta.")
    if len(payload.new_password) < settings.min_password_length:
        raise HTTPException(
            status_code=422,
            detail=f"La contrasena debe tener al menos {settings.min_password_length} caracteres.",
        )

    user.password_hash = auth.hash_password(payload.new_password)
    # Cambiar la contrasena cierra el resto de sesiones abiertas.
    db.query(models.Session).filter(models.Session.user_id == user.id).delete()
    db.commit()

    auth.set_session_cookie(response, auth.create_session(db, user))
