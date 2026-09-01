---
project: "SOMA-learn"
checked_at: "2026-08-31T18:45:00+02:00"
health_status: healthy
context_type: brownfield
language_family: python
stack_assessment_available: true
checks_run:
  - lockfile
  - dependency_audit
  - outdated_deps
  - test_runner
  - ci_cd
  - configuration
audit_findings:
  critical: 0
  high: 0
  moderate: 0
  low: 0
test_runner_detected: true
ci_provider: null
recommended_fixes: 2
---

## Dependency Health

### Lockfile

Status: present (`uv.lock`)
Package manager: uv

`pyproject.toml` deklaruje zależności bezpośrednie, `uv.lock` blokuje pełne drzewo dla Pythona 3.14, a `requirements.txt` jest generowanym eksportem produkcyjnym. `uv lock --check`, `uv sync --frozen` i `pip check` przechodzą.

### Security Audit

Tool: `python -m pip_audit -r requirements.txt`
Summary: 0 CRITICAL, 0 HIGH, 0 MODERATE, 0 LOW
Direct vs transitive: pełne zablokowane drzewo produkcyjne, bez znanych podatności na dzień kontroli

### Outdated Dependencies

Packages with major version gaps: 0

Projekt używa najnowszych zweryfikowanych wydań bezpośrednich: Django 6.1, dj-database-url 3.1.2, Gunicorn 26.2.0, psycopg 3.3.4, python-dotenv 1.2.3 i WhiteNoise 6.12.0.

## Test Suite

Test runner: Django test runner (`unittest`)
Tests found: 1 test
Test execution: passing
Configuration: `manage.py` and `apps/core/tests/`
Framework: Django 6.1

Test endpointu `/healthz/` przechodzi lokalnie. `python manage.py check`, Ruff, mypy oraz `manage.py check --deploy` również kończą się bez problemów.

## CI/CD

Provider: not detected
Configuration: not found

| Stage | Status | Notes |
|---|---:|---|
| Lint | ✗ | Ruff działa lokalnie, ale nie w CI |
| Test | ✗ | Django test runner działa lokalnie, ale nie w CI |
| Build | ✗ | Docker build działa lokalnie, ale nie w CI |
| Type check | ✗ | mypy działa lokalnie, ale nie w CI |
| Security | ✗ | pip-audit działa lokalnie, ale nie w CI |

Brak CI/CD nie obniża bieżącego werdyktu. Lokalne bramki są wykonywalne; automatyzacja pozostaje kolejnym etapem infrastruktury.

## Configuration

Wszystkie oczekiwane lokalne konfiguracje są obecne: `.gitignore`, `.dockerignore`, `.editorconfig`, `.env.example`, `pyproject.toml`, `uv.lock`, `AGENTS.md`, `Dockerfile` i `compose.yaml`.

Docker używa Pythona 3.14, instalacji z lockfile'a i użytkownika non-root. Compose uruchamia PostgreSQL 18.6, stosuje migracje i wystawia zdrową aplikację na porcie 8000.

## Stack Assessment Cross-Reference

Stack assessment: `context/foundation/stack-assessment.md`
Agent readiness (from stack-assess): ready

| Quality Gate Gap | Health-Check Finding | Status |
|---|---|---|
| typed: previous fail | mypy 2.3.1, django-stubs 6.1.0 i adnotacje funkcji; kontrola przechodzi | Mitigated |

## Recommended Fixes

### Fix before agent work (Category A)

Brak. Lokalne bramki wymagane do pracy agenta są wykonywalne i przechodzą.

### Addressed in upcoming lessons (Category B)

### CI/CD pipeline

**What remains**: uruchamianie uv lock check, Ruff, mypy, testów, pip-audit i Docker build przy zmianach repozytorium.
**Effort**: upcoming infrastructure iteration

### Railway production deployment

**What remains**: konto i logowanie CLI, utworzenie projektu oraz PostgreSQL, konfiguracja sekretów, migracje, publikacja i weryfikacja publicznego URL.
**Effort**: manual gate; blocked until the user accepts possible Railway costs

## Summary

Health status: healthy

Projekt ma spójne i audytowane zależności, działający test walking skeleton, statyczne typowanie, lintowanie oraz powtarzalny obraz Docker zweryfikowany z PostgreSQL. Agent może bezpiecznie implementować lokalne zmiany i uruchamiać pełną pętlę kontroli.

Next step: utrzymuj lokalne bramki przy każdej zmianie. Skonfiguruj CI/CD i wykonaj produkcyjny deploy Railway dopiero po osobnej zgodzie na zasoby, sekrety i możliwe koszty.