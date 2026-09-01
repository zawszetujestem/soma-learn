# SOMA Learn

SOMA Learn to aplikacja Django wspierająca współpracę ucznia z mentorem.

## Uruchomienie przez Docker

Wymagany jest Docker Desktop z działającym silnikiem kontenerów.

```bash
docker compose up --build
```

Po uruchomieniu:

- health check: http://localhost:8000/healthz/
- panel administracyjny: http://localhost:8000/admin/

Zatrzymanie usług:

```bash
docker compose down
```

Usunięcie lokalnych danych PostgreSQL:

```bash
docker compose down --volumes
```

## Lokalne środowisko Python

Projekt używa Pythona 3.14, `uv`, @pyproject.toml i @uv.lock. Na Windows:

```bash
.venv/Scripts/python.exe -m pip install uv
.venv/Scripts/uv.exe sync --frozen
.venv/Scripts/python.exe manage.py check
.venv/Scripts/python.exe manage.py test
.venv/Scripts/ruff.exe check .
.venv/Scripts/mypy.exe apps soma_config manage.py
```

Skopiuj @.env.example do `.env` tylko dla lokalnych wartości. Nie commituj `.env`.

## Wdrożenie

Decyzję platformową opisuje @context/foundation/infrastructure.md, a zatwierdzony zakres wykonania @context/deployment/deploy-plan.md. Produkcyjny deploy Railway pozostaje niewykonany do czasu jawnej zgody na utworzenie zasobów i możliwe koszty.
