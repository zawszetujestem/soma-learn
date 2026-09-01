# SOMA Learn Deployment Plan

## Status

- Plan reviewed: 2026-08-31
- Local preparation: completed
- Railway resource creation: not approved
- Production deployment: blocked by user decision to avoid costs
- Platform decision: @context/foundation/infrastructure.md
- Stack assessment: @context/foundation/stack-assessment.md
- Health baseline: @context/foundation/health-check.md

## Goal

Przygotować powtarzalny, testowany walking skeleton Django w obrazie Docker, gotowy do późniejszego wdrożenia na Railway z PostgreSQL. Nie tworzyć konta, projektu, bazy, domeny ani płatnych zasobów Railway w tym wykonaniu.

## Automated Local Steps

1. Ujednolicić zależności na Pythonie 3.14 i najnowszych wzajemnie kompatybilnych wydaniach Django oraz pakietów produkcyjnych.
2. Dodać pełny, generowany lockfile oraz pozostawić czytelną deklarację bezpośrednich zależności.
3. Dodać główny `.gitignore` i `.dockerignore`, chroniące `.env`, `.venv`, lokalną bazę i cache narzędzi.
4. Przenieść sekret, tryb debug, hosty, CSRF, bazę i ustawienia proxy do konfiguracji środowiskowej. Lokalnie zachować bezpieczny fallback SQLite.
5. Dodać WhiteNoise, katalog statyczny i produkcyjny serwer aplikacyjny.
6. Dodać aplikację `apps/core` z publicznym endpointem `/healthz/` oraz testami routingu i odpowiedzi.
7. Dodać produkcyjny `Dockerfile` oparty na Pythonie 3.14, uruchamiany jako użytkownik bez uprawnień root.
8. Zbudować obraz, uruchomić kontener bez sekretów produkcyjnych i sprawdzić `/healthz/` z hosta.
9. Uruchomić `manage.py check`, pełny zestaw testów, `pip check`, kontrolę deploymentową Django i audyt zależności, jeśli narzędzie jest dostępne.

## Manual Gates Before Railway

1. Użytkownik akceptuje możliwość kosztu aplikacji i PostgreSQL.
2. Użytkownik loguje się przez `railway login`; agent potwierdza konto przez `railway whoami`.
3. Użytkownik zatwierdza nazwę projektu, region i plan kosztowy przed `railway init` oraz `railway add --database postgres`.
4. Użytkownik konfiguruje `SECRET_KEY`, `DEBUG=False`, `ALLOWED_HOSTS`, `CSRF_TRUSTED_ORIGINS` i referencję `DATABASE_URL` w Railway Variables. Wartości nie są przekazywane przez czat ani zapisywane w repozytorium.
5. Użytkownik zatwierdza migracje oraz pierwszy `railway up` jako publikację produkcyjną.

## Future Railway Commands

Komendy są dokumentacją i nie będą uruchomione w tym wykonaniu:

1. `npx @railway/cli@latest login`
2. `npx @railway/cli@latest whoami`
3. `npx @railway/cli@latest init`
4. `npx @railway/cli@latest add --database postgres`
5. `npx @railway/cli@latest variable set KEY=value`
6. `npx @railway/cli@latest up`
7. `npx @railway/cli@latest domain`
8. `npx @railway/cli@latest logs -n 100`

## Verification

- Local Python: configuration check, tests and dependency consistency pass.
- Docker: image builds, container starts, `/healthz/` returns HTTP 200 and reports a healthy status.
- Production: skipped until explicit approval; no public URL is expected from this execution.
- Rollback: local changes remain reviewable as file edits. Future Railway code rollback must not be treated as a database rollback.

## Execution Result

- Dependency lock: passed (`uv lock --check`, `uv sync --frozen`, `pip check`).
- Security audit: passed; `pip-audit` found no known vulnerabilities in production requirements.
- Django: passed (`manage.py check`, full test suite, `check --deploy`).
- Code quality: passed (Ruff check/format and mypy).
- Docker image: built successfully from Python 3.14 and `uv.lock`.
- Standalone container: healthy; `/healthz/` returned HTTP 200; process UID was 10001.
- Docker Compose: healthy app plus PostgreSQL 18.6; migrations applied; Django confirmed the PostgreSQL connection.
- Local URL: `http://localhost:8000/healthz/`.
- Railway resources: not created.
- Production URL: not available because production deployment was not approved.

## Secrets and Permissions

- Never read or commit `.env`.
- Agents may run local checks and Docker builds.
- Creating services, changing plans, setting secrets, running production migrations, publishing and deleting resources require a human gate.
- Begin with Railway CLI; add MCP only after repeated read-only operational queries justify its broader context and permissions.