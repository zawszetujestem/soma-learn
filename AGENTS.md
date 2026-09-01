# Repository Guidelines

SOMA Learn to aplikacja webowa Django wspierająca współpracę ucznia z mentorem. Produkt i zakres MVP opisuje @context/foundation/prd.md; stan techniczny i znane luki opisują @context/foundation/health-check.md oraz @context/foundation/stack-assessment.md.

## Krytyczne reguły

- Umieszczaj nowe funkcje domenowe w aplikacjach `apps/<nazwa>/`; nie dodawaj logiki domenowej do `soma_config`.
- Każda aplikacja domenowa ma własny `urls.py` oraz pakiet `tests/` z plikami `test_*.py`. Główny `soma_config/urls.py` tylko dołącza routing aplikacji.
- Nie zapisuj niczego w `context/archive/`. Dokumenty w `context/foundation/` edytuj tylko wtedy, gdy zadanie zmienia trwały kontrakt projektu.
- Nie zakładaj, że lokalne `.venv` odpowiada @requirements.txt. Obecny rozjazd wersji jest udokumentowany w @context/foundation/health-check.md; przy zmianie zależności aktualizuj deklarację i weryfikuj czyste środowisko.
- Nie odczytuj ani nie commituj `.env`. Dokumentuj nowe zmienne wyłącznie w @.env.example bez wartości tajnych.

## Polecenia robocze

- `.venv/Scripts/python.exe manage.py check` — sprawdza konfigurację Django.
- `.venv/Scripts/python.exe manage.py test` — uruchamia pełny zestaw testów.
- `.venv/Scripts/python.exe manage.py runserver` — uruchamia lokalny serwer deweloperski.
- `.venv/Scripts/python.exe -m pip check` — sprawdza spójność zainstalowanych pakietów.
- `.venv/Scripts/ruff.exe check .` — lintuje kod Pythona.
- `.venv/Scripts/mypy.exe apps soma_config manage.py` — sprawdza typy kodu produktu.
- `docker compose up --build` — uruchamia aplikację z PostgreSQL na porcie 8000.

Zależności deklaruje @pyproject.toml, a dokładne wersje blokuje @uv.lock. @requirements.txt jest generowanym eksportem produkcyjnym; nie edytuj go ręcznie.

## Struktura i testy

`soma_config/` zawiera wyłącznie ustawienia, routing projektu oraz punkty wejścia ASGI/WSGI. Nowe aplikacje twórz pod `apps/` z nazwami `snake_case`. Testy umieszczaj w `apps/<nazwa>/tests/` i uruchamiaj pełny runner po każdej zmianie zachowania.

Przed implementacją wymagania produktowego odszukaj odpowiadający mu wpis `FR-NNN` w @context/foundation/prd.md. Materiały w `10xdevs/` są źródłami lekcji, a nie kodem produktu.

## Walidacja zmian

Przed zakończeniem zmiany w Pythonie uruchom `manage.py check`, `manage.py test`, Ruff i mypy. Jeśli zmiana dotyczy zależności, dodatkowo uruchom `uv lock --check`, `pip check` i podaj wynik audytu zależności.