---
project: "SOMA-learn"
assessed_at: "2026-08-31T18:45:00+02:00"
agent_readiness: ready
context_type: brownfield
stack_components:
  language: "Python 3.14.6"
  framework: "Django 6.1"
  build_tool: "uv 0.12.7 and Docker 29.5.3"
  test_runner: "Django test runner (unittest); 1 test passing"
  package_manager: "uv with pyproject.toml and uv.lock"
  ci_provider: null
  deployment_target: "Docker; Railway selected but not deployed"
gates_passed: 9
gates_failed: 0
---

## Komponenty stosu

**Python 3.14.6.** Aktywne środowisko `.venv` uruchamia Python 3.14.6. `pyproject.toml` konfiguruje mypy 2.3.1 z django-stubs 6.1.0 oraz Ruff 0.16.5.

**Django.** `manage.py`, `soma_config/settings.py` i `soma_config/urls.py` potwierdzają konwencyjny projekt Django. `pyproject.toml`, `uv.lock`, aktywne środowisko i obraz Docker używają Django 6.1.

**Narzędzia projektu.** `manage.py` jest standardowym punktem wejścia Django. `uv` blokuje zależności, a `Dockerfile` i `compose.yaml` zapewniają powtarzalne środowisko aplikacji z PostgreSQL.

**Testy.** Wbudowany runner Django oparty na `unittest` uruchamia test endpointu `/healthz/`; pełny zestaw zawiera 1 przechodzący test.

**Pakiety i środowisko.** `pyproject.toml` jest deklaracją bezpośrednich zależności, `uv.lock` blokuje pełne drzewo, a `requirements.txt` jest generowanym eksportem produkcyjnym. `uv sync --frozen`, `pip check` i `pip-audit` przechodzą.

**Automatyzacja i uruchamianie.** Docker uruchamia aplikację jako użytkownik non-root, a Compose łączy ją z PostgreSQL 18.6 i stosuje migracje. CI/CD nie jest jeszcze skonfigurowane, a produkcyjny deploy Railway został świadomie odroczony.

## Ocena bramek jakości

| Komponent | Typowanie | Konwencje | Dane treningowe | Dokumentacja | Werdykt |
|---|---:|---:|---:|---:|---|
| Python | ✓ | — | — | — | pass |
| Django | — | ✓ | ✓ | ✓ | pass |
| `manage.py` | — | ✓ | ✓ | ✓ | pass |
| Django test runner | — | — | ✓ | ✓ | pass |

Legenda: ✓ = spełnione, ✗ = niespełnione, — = nie dotyczy.

### Szczegóły bramek

**Typowanie Pythona: spełnione.** `pyproject.toml` przypina mypy i django-stubs, konfiguruje plugin Django i wymaga adnotacji funkcji. `mypy apps soma_config manage.py` przechodzi bez błędów.

**Konwencje Django: spełnione.** `manage.py` wskazuje moduł ustawień `soma_config.settings`, `soma_config/settings.py` zawiera standardowe rejestry aplikacji i middleware, a `soma_config/urls.py` jest konwencyjnym URLconf. Framework jednoznacznie określa położenie konfiguracji, routingu, aplikacji i testów.

**Popularność w ekosystemie Pythona: spełnione.** Django jest jednym z głównych frameworków webowych Pythona. Standardowe idiomy projektu, ORM, formularzy, uwierzytelniania i testowania są szeroko reprezentowane w materiałach dla tej rodziny językowej.

**Dokumentacja Django: spełnione.** Oficjalna dokumentacja Django 6.0 jest wersjonowana i obejmuje tutoriale, modele, widoki, formularze, testowanie, bezpieczeństwo oraz wdrożenie. `soma_config/settings.py` i `soma_config/urls.py` zawierają odwołania do tej samej gałęzi dokumentacji 6.0.

**Konwencje `manage.py`: spełnione.** `manage.py` jest standardowym, udokumentowanym punktem wejścia Django. Polecenia `manage.py check` i `manage.py test` wykonują się poprawnie w aktywnym środowisku.

**Runner testów: spełnione jako komponent.** Wbudowany runner jest częścią Django, jest popularny, udokumentowany i wykonuje obecny test walking skeleton.

## Luki i kompensacja

Wszystkie luki jakościowe z pierwszej oceny zostały skompensowane: typowanie i lint są skonfigurowane, zależności zablokowane, test walking skeleton działa, a Docker z PostgreSQL został zweryfikowany. Reguły operacyjne znajdują się w `AGENTS.md`.

Pozostaje luka infrastrukturalna poza oceną stacku: brak CI/CD. Produkcyjny deploy Railway jest opisany w `context/deployment/deploy-plan.md` i wymaga osobnej zgody użytkownika.

### Zalecane dodatki do plików instrukcji

```markdown
## Python Type Safety

- Każda nowa lub modyfikowana funkcja Pythona musi mieć adnotacje typów parametrów i wartości zwracanej.
- Nie używaj `Any` ani wyciszeń błędów typowania bez krótkiego uzasadnienia przy konkretnej linii.
- Dane wejściowe użytkownika waliduj na granicy przez mechanizmy walidacji Django; nie przekazuj niezweryfikowanych słowników do logiki domenowej.
- Po skonfigurowaniu checkera uruchamiaj statyczne sprawdzanie typów dla zmienionego modułu przed zakończeniem zadania.
```

```markdown
## Dependency Consistency

- Traktuj zadeklarowany plik zależności jako źródło prawdy i nie zakładaj, że pakiet obecny wyłącznie w lokalnym `.venv` jest częścią projektu.
- Po zmianie zależności potwierdź instalację w czystym środowisku oraz uruchom `python manage.py check` i zestaw testów.
- Utrzymuj jedną uzgodnioną wersję Django w deklaracji zależności, środowisku lokalnym, obrazie Docker i CI.
```

```markdown
## Django Project Conventions

- Nowe funkcje domenowe umieszczaj w dedykowanych aplikacjach Django; nie dodawaj logiki domenowej do `soma_config`.
- Routing projektu agreguj w `soma_config/urls.py`, a trasy funkcji utrzymuj w pliku `urls.py` należącym do właściwej aplikacji.
- Każda zmiana zachowania musi zawierać test w standardowym układzie testów Django.
```

## Podsumowanie

Stack jest **ready**. Django zapewnia silne konwencje, dużą reprezentację w ekosystemie Pythona i aktualną oficjalną dokumentację, a mypy z django-stubs zapewnia sprawdzalne kontrakty typów.

Zależności, test walking skeleton i lokalny Docker z PostgreSQL są zweryfikowane. Następne kroki to CI/CD oraz produkcyjny deploy Railway po zatwierdzeniu kosztów i ręcznych bramek.