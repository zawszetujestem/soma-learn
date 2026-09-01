# SOMA Learn

SOMA Learn to aplikacja webowa Django wspierająca współpracę ucznia z mentorem. Uczeń podstawówki przygotowuje się do egzaminu, a mentor planuje z nim zakres bieżącego cyklu, kontroluje, które zadania są dostępne, i weryfikuje wykonaną pracę. Celem MVP jest sprawdzenie, czy wspólne planowanie i obowiązkowa weryfikacja zadania tworzą użyteczny rytm zamiast kolejnej listy zadań.

## Funkcje

- **Logowanie e-mailem i hasłem** — własny model użytkownika z rolami ucznia i mentora (`is_student`/`is_mentor`).
- **Kursy jako instancje per para** — mentor wysyłając zaproszenie tworzy instancję kursu widoczną wyłącznie jemu i uczniowi; obcy użytkownik dostaje 403.
- **Cykl życia zaproszenia** — siedmiodniowe, jednorazowe zaproszenie do konkretnego kursu, z tokenem przechowywanym wyłącznie jako skrót (SHA-256).
- **Usuwanie konta (RODO)** — soft-delete z anonimizacją danych osobowych, przy zachowaniu audytu relacji.

## Dokumentacja

Fundament produktu i stan techniczny opisują dokumenty w `context/foundation/`:

- `prd.md` — wymagania produktowe (FR-001–FR-010), user stories, zasady biznesowe.
- `roadmap.md` — mapa drogowa MVP (F-01, S-01–S-07).
- `test-plan.md` — mapa ryzyk i fazowy plan testów.
- `stack-assessment.md`, `health-check.md`, `infrastructure.md` — decyzje techniczne.

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

## Testy

- **Unit + integracja** (Django test runner): `.venv/Scripts/python.exe manage.py test`
- **E2E** (Playwright): `npx playwright test` — uruchamia własny serwer na porcie 8010 i osobną bazę `e2e.sqlite3`.

## Wdrożenie

Decyzję platformową opisuje @context/foundation/infrastructure.md, a zatwierdzony zakres wykonania @context/deployment/deploy-plan.md. Produkcyjny deploy Railway pozostaje niewykonany do czasu jawnej zgody na utworzenie zasobów i możliwe koszty.
