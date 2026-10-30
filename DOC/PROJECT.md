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
- ⏳ kontynuować implementację modeli kursów i instancji kursu.

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
- `/kursy` pokazuje pusty stan bez ofert; `/logowanie` działa z API allauth Headless (email + hasło + kod, Google tylko dla zweryfikowanych kont)
- Zaproszenia uczniów przez mentora są planowane, ale niezaimplementowane
- Końcowe QA prototypu: `npm test` 10/10, `npm run build` poprawny, `get_errors` bez błędów; QA nie wykazał blockerów
- Ręczna inspekcja Chrome/CDP: trasy otwierają się bezpośrednio; na `/` `document.scrollWidth` odpowiadał szerokości viewportu 320×844 i 390×844, a na `/kursy` i `/logowanie` wynosił 390 px przy viewportcie 390×844
- Zrzuty ekranu desktop i mobile obejrzano wizualnie; kontrasty znalezione podczas QA poprawiono
- Nie wykonano testu z czytnikiem ekranu ani pełnego audytu WCAG
- Instrukcje uruchomienia i testów: `../frontend/README.md`

### Dokumentacja (✅)
- Framework SOMA opisany i sformatowany
- Struktura agentów i ich role
- Diagram workflow agentów
- Plan projektu i wizja

### Docker & Deployment (⏳ do zrobienia)
- Przygotowanie docker-compose z Postgresem
- CI/CD pipeline

## Dokumenty referencyjne

- `../soma/README.md` – opis frameworka SOMA,
- `AGENTS.md` – role w zespole agentów,
- `diagram.mmd` – workflow agentów,
- `BACKEND.md` – dokumentacja backendowych API (do utworzenia).
