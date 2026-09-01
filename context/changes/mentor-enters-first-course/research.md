---
date: 2026-09-01T00:00:00+02:00
researcher: opencode
git_commit: ba9997d
branch: main
repository: SOMA-learn
topic: "S-01: mentor loguje się i wchodzi do pierwszego gotowego kursu"
tags: [research, codebase, accounts, learning, auth, course]
status: complete
last_updated: 2026-09-01
last_updated_by: opencode
---

# Research: S-01 — mentor loguje się i wchodzi do pierwszego gotowego kursu

**Date**: 2026-09-01
**Researcher**: opencode
**Git Commit**: ba9997d
**Branch**: main
**Repository**: SOMA-learn

## Research Question

Jak wygląda obecny stan uwierzytelniania i modelu kursu oraz co jest potrzebne, aby mentor mógł zalogować się e-mailem i hasłem i wejść do jednego gotowego kursu (S-01)?

## Summary

F-01 dostarczył tożsamość (`accounts.User` z logowaniem e-mailem), model `Course` w aplikacji `learning` oraz usługi cyklu życia zaproszeń i relacji — ale **nie ma żadnej powierzchni HTTP ani szablonów**: brak widoków logowania, `urls.py` w `accounts`, tras, szablonów, ustawień `LOGIN_URL`/`LOGIN_REDIRECT_URL` i żadnego seeda „gotowego kursu". S-01 to pierwsza warstwa produktowa nad tym kontraktem: logowanie mentora + wejście do jednego gotowego kursu, bez katalogu, bez OAuth/2FA, bez treści kursu (to kolejne slice'y).

## Detailed Findings

### Powierzchnia uwierzytelniania (accounts)

- `accounts.User` — `USERNAME_FIELD="email"`, niezależne `is_student` (default `True`) / `is_mentor` (default `False`); manager normalizuje e-mail i tworzy superusera zgodnie z kontraktem Django (`apps/accounts/models.py:9-23`, `apps/accounts/managers.py:11-43`).
- Brak `apps/accounts/urls.py`, `views.py`, `forms.py`, `templates/` — nie ma żadnego widoku logowania ani rejestracji.
- `AUTH_USER_MODEL="accounts.User"` ustawione (`soma_config/settings.py:105`); domyślny backend `ModelBackend` działa, bo `USERNAME_FIELD="email"`.
- Brak `AUTHENTICATION_BACKENDS`, `LOGIN_URL`, `LOGIN_REDIRECT_URL` — defaulty (`/accounts/login/`, `/accounts/profile/`) nie istnieją (`soma_config/settings.py`).
- `TEMPLATES`: `DIRS=[]`, `APP_DIRS=True`; context processors `request/auth/messages` są skonfigurowane (`soma_config/settings.py:75-88`).

### Model kursu i dane (learning)

- `Course` istnieje: `title` (unique, max 200), `created_at` (`apps/learning/models.py:5-10`).
- Obok: `Invitation` (token_hash, statusy, `expires_at`), `Relationship` (active/ended, unikalna aktywna relacja per trio) (`apps/learning/models.py:13-66`).
- Usługi cyklu życia: `issue_invitation`, `reissue_invitation`, `accept_invitation`, `end_relationship`, `students_with_active_relationship` (`apps/learning/services.py:55-134`).
- **Brak** seeda/fixture/komendy tworzącej „gotowy kurs" — kurs powstaje wyłącznie w testach przez `Course.objects.create(...)` (`apps/learning/tests/test_access.py:20-21`).

### Wzorzec aplikacji i routingu

- `apps/core/` to wzorzec: funkcja w `views.py` → nazwana trasa w `apps/core/urls.py` z `app_name="core"` → dołączona w `soma_config/urls.py` → test przez `reverse("core:health-check")` (`apps/core/urls.py:5-8`, `apps/core/views.py:4-5`, `apps/core/tests/test_views.py:5-10`).
- `soma_config/urls.py` dołącza tylko `apps.core.urls` i `admin/` — brak `django.contrib.auth.urls` i tras `accounts` (`soma_config/urls.py:21-24`).
- `INSTALLED_APPS`: appki produktu przed appkami contrib — poprawne; kolejność nie łamie niczego (`soma_config/settings.py:50-60`).

## Code References

- `apps/accounts/models.py:9-23` — custom User (email login, role bool).
- `apps/accounts/managers.py:11-43` — UserManager (create_user/create_superuser, normalizacja).
- `apps/accounts/admin.py:7-30` — UserAdmin z rolami.
- `apps/learning/models.py:5-10` — Course; `:13-66` — Invitation + Relationship.
- `apps/learning/services.py:55-134` — usługi cyklu życia.
- `soma_config/settings.py:50-60` — INSTALLED_APPS; `:75-88` — TEMPLATES; `:105` — AUTH_USER_MODEL.
- `soma_config/urls.py:21-24` — routing główny.
- `apps/core/urls.py:5-8`, `apps/core/views.py:4-5`, `apps/core/tests/test_views.py:5-10` — wzorzec widoku/trasy/testu.

## Architecture Insights

- **Kontrakt F-01 jest warstwą domenową bez HTTP** — S-01 jest pierwszą warstwą widoków; widoki mają wywoływać istniejące usługi, a nie powielać reguł (`context/changes/access-and-invitation-contract/plan.md:32`).
- **Rola mentora nadawana przez administratora** — S-01 nie może pozwolić na samodzielną eskalację do mentora (`plan.md:20`).
- **Jeden gotowy kurs, nie katalog** — FR-002 zachowuje wybór kursu, ale MVP ma jeden przygotowany kurs; budowanie katalogu jest poza zakresem (`prd.md:73-74`, `roadmap.md:89`).
- **Brak powierzchni szablonów** — login i widok kursu wymagają od zera: katalogu szablonów i (zalecenie) `DIRS` lub szablonów per-app.

## Historical Context (from prior changes)

- `context/changes/access-and-invitation-contract/plan.md` — F-01: kontrakt tożsamości/zaproszeń/relacji; jawne „nie robimy" formularzy logowania i tras (to S-01/S-02).
- `context/changes/access-and-invitation-contract/change.md` — status `impl_reviewed` (2026-09-01), nie zarchiwizowany.
- `context/foundation/roadmap.md:79-90` — blok S-01: „Mentor może utworzyć konto, zalogować się i wejść do jednego gotowego kursu"; wymaganie wstępne F-01; status `proposed`.

## Related Research

- Brak innych artefaktów `research.md` w `context/changes/**`.

## Open Questions

- Rozjazd statusu: `change.md` F-01 to `impl_reviewed`, ale `roadmap.md` nadal pokazuje F-01 jako `in-progress` — do wyjaśnienia przed startem S-01 (oczekiwane: roadmapa przechodzi na `done` dopiero przy `/10x-archive`).
- Minimalny zakres „gotowego kursu" na pierwszy pilot — właściciel: użytkownik, nie blokuje (roadmap S-01 Unknowns).
- Czy seed kursu ma być data-migracją, fixture, czy komendą zarządzania — decyzja planistyczna.
- Czy po zalogowaniu mentor ląduje na widoku wyboru kursu, czy bezpośrednio w kursie — decyzja produktowa (FR-002 mówi o wyborze, ale przy jednym kursie może to być auto-wejście).
