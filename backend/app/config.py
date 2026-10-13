from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://finanzas:finanzas@db:5432/finanzas"
    base_currency: str = "EUR"
    price_refresh_seconds: int = 900

    # --- Control de acceso ---
    # Duracion de la sesion. Se renueva sola mientras se use la aplicacion.
    session_days: int = 30
    # Marca la cookie como Secure, que impide que el navegador la envie por
    # HTTP sin cifrar. Ponlo a true SOLO si sirves la app por HTTPS: con
    # true sobre http:// el navegador descarta la cookie y no podrias entrar.
    cookie_secure: bool = False
    # Longitud minima exigida al crear la contrasena.
    min_password_length: int = 8

    class Config:
        env_file = ".env"


settings = Settings()
