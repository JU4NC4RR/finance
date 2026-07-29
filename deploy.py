#!/usr/bin/env python3
"""
deploy.py
---------
Punto de entrada unico del sistema de monitorizacion de finanzas.

Ejecuta:  python3 deploy.py

Que hace:
  1. Comprueba que Docker y Docker Compose estan disponibles.
  2. Crea un fichero .env a partir de .env.example si no existe.
  3. Construye y levanta todos los contenedores (db, backend, frontend).
  4. Espera a que el backend este sano (healthcheck) antes de terminar.
  5. Imprime las URLs donde queda disponible el sistema.

No hace falta tocar Docker Compose a mano para el uso normal: basta con
volver a ejecutar este script para reconstruir/actualizar el stack.
"""

import argparse
import shutil
import subprocess
import sys
import time
import urllib.request
import urllib.error
from pathlib import Path

ROOT = Path(__file__).resolve().parent
ENV_FILE = ROOT / ".env"
ENV_EXAMPLE = ROOT / ".env.example"

# El backend no publica puerto propio: se llega a el a traves de nginx, que
# hace de proxy bajo /api en el mismo puerto que sirve la web.
BACKEND_HEALTH_URL_TEMPLATE = "http://localhost:{port}/api/health"


def run(cmd, **kwargs):
    print(f"$ {' '.join(cmd)}")
    return subprocess.run(cmd, cwd=ROOT, check=True, **kwargs)


def detect_compose_command():
    """Devuelve el comando de Docker Compose disponible en el sistema."""
    if shutil.which("docker"):
        # docker compose (plugin v2) es el estandar actual
        probe = subprocess.run(
            ["docker", "compose", "version"],
            cwd=ROOT, capture_output=True, text=True,
        )
        if probe.returncode == 0:
            return ["docker", "compose"]
    if shutil.which("docker-compose"):
        return ["docker-compose"]
    return None


def check_docker_daemon():
    probe = subprocess.run(["docker", "info"], capture_output=True, text=True)
    return probe.returncode == 0


def ensure_env_file():
    if ENV_FILE.exists():
        print(f"[ok] Fichero .env ya existe en {ENV_FILE}")
        return
    if not ENV_EXAMPLE.exists():
        print("[error] No se encuentra .env.example, no puedo generar .env")
        sys.exit(1)
    shutil.copy(ENV_EXAMPLE, ENV_FILE)
    print(f"[ok] Creado {ENV_FILE} a partir de .env.example (valores por defecto).")
    print("      Puedes editarlo cuando quieras (contrasena de la BD, moneda base, puertos...).")


def read_env_value(key, default):
    if not ENV_FILE.exists():
        return default
    for line in ENV_FILE.read_text().splitlines():
        line = line.strip()
        if line.startswith(f"{key}=") and not line.startswith("#"):
            return line.split("=", 1)[1].strip() or default
    return default


def wait_for_backend(port, timeout=120):
    url = BACKEND_HEALTH_URL_TEMPLATE.format(port=port)
    print(f"[info] Esperando a que el backend responda en {url} ...")
    start = time.time()
    while time.time() - start < timeout:
        try:
            with urllib.request.urlopen(url, timeout=3) as resp:
                if resp.status == 200:
                    print("[ok] Backend saludable.")
                    return True
        except (urllib.error.URLError, ConnectionError, TimeoutError):
            pass
        time.sleep(2)
    print("[warn] El backend no respondio a tiempo. Revisa los logs con:")
    print(f"       {' '.join(compose_cmd)} logs -f backend")
    return False


def main():
    parser = argparse.ArgumentParser(description="Despliega el sistema de finanzas con Docker.")
    parser.add_argument("--no-build", action="store_true", help="No reconstruir imagenes, solo levantar.")
    parser.add_argument("--down", action="store_true", help="Detiene y elimina los contenedores.")
    parser.add_argument("--logs", action="store_true", help="Muestra logs en directo tras el despliegue.")
    args = parser.parse_args()

    global compose_cmd
    compose_cmd = detect_compose_command()
    if compose_cmd is None:
        print("[error] No se ha encontrado Docker Compose. Instala Docker Desktop "
              "(incluye 'docker compose') y vuelve a intentarlo.")
        sys.exit(1)

    if not check_docker_daemon():
        print("[error] El demonio de Docker no esta activo. Abre Docker Desktop / inicia el servicio "
              "'docker' y vuelve a ejecutar este script.")
        sys.exit(1)

    if args.down:
        run(compose_cmd + ["down"])
        print("[ok] Contenedores detenidos y eliminados (los datos en el volumen se conservan).")
        return

    ensure_env_file()

    up_cmd = compose_cmd + ["up", "-d"]
    if not args.no_build:
        up_cmd.append("--build")
    run(up_cmd)

    frontend_port = read_env_value("FRONTEND_PORT", "8093")

    wait_for_backend(frontend_port)

    print("\n" + "=" * 60)
    print(" Sistema desplegado")
    print("=" * 60)
    print(f" Dashboard web : http://localhost:{frontend_port}")
    print(f" API backend   : http://localhost:{frontend_port}/api")
    print(f" Docs API      : http://localhost:{frontend_port}/api/docs")
    print("=" * 60)
    print(" Para detenerlo:        python3 deploy.py --down")
    print(" Para ver logs:         docker compose logs -f")
    print(" Para reconstruir:      python3 deploy.py")
    print("=" * 60)

    if args.logs:
        run(compose_cmd + ["logs", "-f"])


if __name__ == "__main__":
    main()
