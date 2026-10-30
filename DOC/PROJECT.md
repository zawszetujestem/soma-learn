# Project Overview: soma-learn

## Wizja

SOMA Learn to system edukacyjny, który pomaga uczniom pracować według frameworku SOMA i osiągać cele przez krótkie, regularne iteracje.

## Zakres początkowy

- moduł nauki matematyki dla uczniów,
- planowanie ścieżek rozwoju i celów,
- system mikro-sprintów i refleksji,
- integracja mentor/uczeń,
- przygotowanie do wsparcia AI.

## Główne cele projektu

1. Zbudować aplikację opartą na frameworku SOMA.
2. Zapewnić prosty backend DRF i nowoczesny frontend React.
3. Stworzyć strukturę TDD oraz testy.
4. Przygotować konteneryzację Docker.
5. Zaplanować obsługę kolejek Celery i wdrożenie w chmurze.

## Wstępne kroki

- ✅ dopracowana dokumentacja SOMA i projektowa,
- ✅ zdefiniowana struktura agentów i workflow,
- ✅ stworzony backend Django z modelami użytkowników i rolami,
- ✅ zaimplementowane API do rejestracji i logowania (email + social login),
- ✅ konfiguracja Postgresa i automatyczne tworzenie superusera,
- ⏳ przygotować pierwsze user stories,
- ⏳ zamienić user stories na zadania programistyczne,
- ✅ zaimplementować modele kursów, zadań i instancji wraz z API i widokami frontendu.

## Status pracy — 25.05.2026

### Backend (✅ w trakcie)
- Django 6.1 + DRF 3.18
- Niestandardowy model User z rolami (student, mentor, owner, admin)
- Endpointy API:
  - `POST /api/auth/register/` — rejestracja ucznia/mentora
  - `POST /api/auth/login/` — wyłączony (410); logowanie email + hasło + kod przez allauth Headless (`/_allauth/browser/v1/`)
  - `POST /api/auth/social-login/` — wyłączony (410); logowanie Google przez allauth Headless
  - `GET /api/auth/verify-email/` — weryfikacja email
  - `POST /api/auth/password-reset/` — reset hasła
  - `GET /api/auth/me/` — dane bieżącego użytkownika
- Baza danych: PostgreSQL
- Automatyczne tworzenie superusera z zmiennych `.env`

### Frontend (prototyp informacyjny)
- React 19 + Vite 8, React Router 7; testy Vitest + Testing Library
- `/` przedstawia SOMA oraz sekcje dla ucznia, rodzica i mentora; pierwszą grupą są ósmoklasiści, maturzyści są planowani później
- `/kursy` pokazuje listę kursów dla zalogowanych użytkowników; `/logowanie` działa z API allauth Headless (email + hasło + kod, Google tylko dla zweryfikowanych kont)
- Dołączanie do kursów prywatnych przez link z tokenem jest zaimplementowane; zaproszenia imienne przez mentora są planowane, ale niezaimplementowane
- Końcowe QA prototypu: `npm test` 10/10, `npm run build` poprawny, `get_errors` bez błędów; QA nie wykazał blockerów
- Ręczna inspekcja Chrome/CDP: trasy otwierają się bezpośrednio; na `/` `document.scrollWidth` odpowiadał szerokości viewportu 320×844 i 390×844, a na `/kursy` i `/logowanie` wynosił 390 px przy viewportcie 390×844
- Zrzuty ekranu desktop i mobile obejrzano wizualnie; kontrasty znalezione podczas QA poprawiono
- Nie wykonano testu z czytnikiem ekranu ani pełnego audytu WCAG
- Instrukcje uruchomienia i testów: `../frontend/README.md`

### Kursy, zadania i instancje (✅ zaimplementowane, aktualizacja 30.10.2026)
- Backend: modele Course, CourseTask, Instance, InstanceTask, InstancePeriod; zatwierdzanie kursów w Django admin; limit jednej aktywnej instancji na ucznia; kopia zadań przy dołączeniu; zamykanie i wznawianie instancji; licznik aktywnych uczniów mentora; postęp w procentach.
- Frontend: lista kursów, szczegóły, dołączanie (także przez link z tokenem), widok instancji ucznia, zarządzanie kursami mentora i formularz nowego kursu.
- Zakres, endpointy i kody błędów: `BACKEND.md`; trasy: `BACKEND.md` i `../frontend/README.md`.
- Nie zadeklarowano zaliczenia testów responsywności widoków kursów (AC-53); wymagają osobnej weryfikacji.
- Zaproszenia imienne przez mentora pozostają planowane.

### Dokumentacja (✅)
- Framework SOMA opisany i sformatowany
- Struktura agentów i ich role
- Diagram workflow agentów
- Plan projektu i wizja

### Docker & Deployment (lokalny Docker ✅, CI/CD ⏳, aktualizacja 30.10.2026)
- ✅ Lokalny Docker Compose: frontend 5174, backend/admin 8001, PostgreSQL 18 bez portu hosta, Mailpit SMTP 1027 i UI 8027. Nowa baza, automatyczne migracje i administrator, trwały wolumen oraz hot reload.
- Instrukcja startu, konfiguracji i testów: [README — Lokalny Docker](../README.md#lokalny-docker).
- Niezależne QA: 4 usługi healthy; pełny przepływ rejestracji, potwierdzenia e-maila, logowania kodem i resetu hasła; trwałość po `down`/`up`; hot reload. Regresja: backend 207 OK, frontend 117 OK (6 kontraktów Docker pomijanych w kontenerze, 6/6 zaliczonych na hoście), build OK.
- Wyłącznie lokalny development, bez Google i importu danych. Stare kontenery i wolumeny pozostawiono nietknięte. Znane ograniczenia aplikacji i brak pełnego audytu bezpieczeństwa opisano w [README](../README.md#zakres-i-ograniczenia).
- ⏳ CI/CD i wdrożenie produkcyjne.

## Dokumenty referencyjne

- `../soma/README.md` – opis frameworka SOMA,
- `AGENTS.md` – role w zespole agentów,
- `diagram.mmd` – workflow agentów,
- `BACKEND.md` – dokumentacja backendowych API, modeli kursów i instancji oraz tras frontendu.
