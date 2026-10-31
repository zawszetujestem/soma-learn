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
- `/` jest responsywną homepage według [zatwierdzonych wytycznych stylu](FRONTEND_STYLE.md): hero, ścieżki egzaminacyjne, metoda z refleksją/adaptacją, jawne przykłady kursów, statyczny preview lekcji i O nas. Matura jest planowana; nie jest to dashboard ani oferta przykładowych kursów.
- `/kursy` pokazuje listę kursów dla zalogowanych użytkowników; `/logowanie` działa z API allauth Headless (email + hasło + kod, Google tylko dla zweryfikowanych kont)
- Dołączanie do kursów prywatnych przez link z tokenem jest zaimplementowane; zaproszenia imienne przez mentora są planowane, ale niezaimplementowane
- Końcowe QA prototypu: `npm test` 10/10, `npm run build` poprawny, `get_errors` bez błędów; QA nie wykazał blockerów
- Ręczna inspekcja Chrome/CDP: trasy otwierają się bezpośrednio; na `/` `document.scrollWidth` odpowiadał szerokości viewportu 320×844 i 390×844, a na `/kursy` i `/logowanie` wynosił 390 px przy viewportcie 390×844
- Zrzuty ekranu desktop i mobile obejrzano wizualnie; kontrasty znalezione podczas QA poprawiono
- Nie wykonano testu z czytnikiem ekranu ani pełnego audytu WCAG
- Instrukcje uruchomienia i testów: `../frontend/README.md`

### Homepage — historyczny odbiór przed późniejszymi kafelkami (✅ QA PASS, 31.10.2026)

- W tym wcześniejszym etapie własny scoped layout `/`, typologo bez symbolu i lokalny Manrope nie zmieniały wyglądu kursów, auth ani ówczesnych wzorów. Bez nowych API, tras lub dashboardu. Ten odbiór nie potwierdza późniejszych kafelków homepage; ich osobne QA pozostaje do potwierdzenia.
- TDD wykonane przed implementacją i poprawkami QA. Końcowe testy: relevant 96 passed, pełny frontend 260 passed / 1 skipped, build OK.
- Niezależny Chrome 156/CDP: 320/390/768/960/1440 bez overflow, kontrast minimum 7,05:1, polski font, focus/skip, zoom 200%/400%, regresja wizualna innych tras. Poprawione kotwice i CTA zalogowanego; retest kotwic 12/12.
- Docker po restarcie frontendu i instalacji zależności: cztery usługi healthy, frontend 5174 i backend 8001 odpowiadają HTTP 200. Bez deploy.
- Nie wykonano pełnego WCAG/screen readera, CWV, Firefox/Safari, fizycznych urządzeń ani rzeczywistego E2E auth dla tej zmiany. Szczegóły: [frontend README](../frontend/README.md#weryfikacja), [kanoniczne wytyczne](FRONTEND_STYLE.md).

### Styl istniejących widoków produkcyjnych (✅ niezależne CODE QA PASS, 31.10.2026)

- Późniejsza jawna zgoda użytkownika rozszerza kafelkowy styl homepage na wszystkie istniejące auth, kursy, wspólny header/footer i NotFound. Jedno źródło realizacji i granic: [FRONTEND_STYLE.md](FRONTEND_STYLE.md); źródłowa specyfikacja v1.0 pozostaje zbiorem częściowo zatwierdzonych kierunków i propozycji, nie zatwierdzeniem całego produktu.
- Scoped `.app-shell` w `app-shell.css`, importowany w `main.jsx` po `styles.css`; wspólny istniejący `HomeLogo` bez zmiany DOM. ABC usunięte, `/wzory/*` pokazuje NotFound bez przekierowania; podgląd wersji kursu zachowany. Bez zmian API, handlerów, sesji/`useLogoutFlow`, uprawnień, lifecycle, prywatności, limitów załączników i rewizji 409; bez nowych funkcji.
- Po poprawce P2 kaskady niezależny pełny frontend **289 passed / 1 skipped**, build PASS; regresja **10 plików / 155 passed**. Docker: cztery usługi healthy, frontend 5174/backend 8001 przywrócone, bez wdrożenia.
- Chromium 156.0.8078.4 z syntetycznym API: 62 pomiary przy 320/390/1440 px bez błędów poziomego overflow, wypełnione kursy/edytor, auth, dialog i podgląd ucznia. Potwierdzono lokalny polski font, focus i reduced motion.
- P3 nieblokujące: niektóre textarea podczas Tab w głębokim edytorze 320×900 częściowo poniżej viewportu, ale przewijalne i bez blokady edycji; niepotwierdzona regresja, nie naprawiony błąd.
- Reflow responsive-equivalent, nie natywny zoom; zrzuty tylko w pamięci, bez inspekcji estetyki. Bez pełnego WCAG/screen readera, Firefox/Safari, fizycznych urządzeń, pełnego rzeczywistego E2E auth, testów backendu i penetracji dla tego zakresu. Dokładne wyniki przekazanego QA, TDD i ograniczenia: [frontend README — Weryfikacja](../frontend/README.md#weryfikacja).

### Kursy — tworzenie przez mentora i wersjonowanie (✅ zaimplementowane, 30.10.2026)
- Kurs ma trwałą tożsamość oddzieloną od wersji treści. Tworzenie rozpoczyna wersję 1 jako roboczą; mentor publikuje kurs prywatny lub zgłasza publiczny do moderacji. Administrator moderuje zgłoszenia przez API i akcje Django admin. Edycja wersji nie powoduje automatycznej reweryfikacji; publikacja jest jawnym przejściem lifecycle.
- Treść obejmuje klasyfikację Zakres/Przedmiot, hierarchię Dział→Temat→Lekcja, materiały teorii/praktyki, testy i informacyjne wymagania wstępne. Katalog pokazuje wyłącznie drzewo programu, bez materiałów i testów. Instancja ucznia zachowuje przypiętą wersję; CourseTask i plan godzinowy pozostają niezależne od wersji.
- Załączniki są prywatne, pobierane przez API, z limitami PDF 20 MB, obrazów 5 MB, 20 załączników na lekcję i 1 GB na kurs (MB/GB dziesiętne). `approval_status`, `title` i `description` na Course są polami archiwalnymi.
- Wyniki weryfikacji: backend SQLite 316 OK/8 skip, PostgreSQL 316/316 OK, `makemigrations --check` bez zmian, `manage.py check` 0 issues; frontend 230 passed/1 skip, build i smoke API OK; niezależne QA POZYTYWNY.
- Ograniczenia: brak rozwiązywania/oceniania testów, wymagania wstępne nie są egzekwowane, walidacja plików nie jest antywirusem. QA nie zweryfikowało manualnie responsywności J6 w pełnej przeglądarce. Niestabilny test frontendowy `join-by-token` ustabilizowano synchronizacją w teście (30/30 OK).
- Szczegóły modeli, lifecycle, endpointów, błędów, migracji i storage: [BACKEND.md](BACKEND.md#kursy-zadania-i-instancje); trasy i uruchomienie funkcji: [frontend/README.md](../frontend/README.md#trasy-i-zakres).

### Zaufana przeglądarka (✅ zaimplementowane, QA PASS 30.10.2026)
- Opcjonalne pomijanie OTP przez 24 godziny od poprawnego kodu; zgoda na etapie kodu, domyślnie wyłączona. Email i hasło nadal wymagane przy nowym logowaniu; użycie nie odnawia TTL ani nie przedłuża sesji.
- Backend: `TrustedBrowser` i migracja `0004_trusted_browser`; wylogowanie cofa zaufanie bieżącego profilu, zmiana hasha hasła unieważnia wszystkie profile. Wszystkie role, także staff/admin/superuser, mogą korzystać z funkcji.
- Frontend obsługuje logowanie bez etapu kodu przy ważnym zaufaniu oraz ostrzeżenie i retry przy niepotwierdzonym wylogowaniu. Google i formularz `/admin/` bez zmian; brak panelu urządzeń.
- Niezależne QA: backend 236 OK, 1 pominięty (celowane 29 OK); frontend ponowiony pełny przebieg 143 zaliczone, 1 pominięty (celowane 21 OK), build OK. Pierwszy przebieg frontendu ujawnił istniejący flaky P3 testu kursów, bez naprawy w tym zakresie; brak blockerów.
- To pomijanie OTP, nie pełne zabezpieczenie konta: skopiowane cookie nadal wymaga hasła, a token DRF nadal pozostaje ważny po logout/resecie. Nie wykonano pełnego rzeczywistego E2E, PostgreSQL ani prawdziwego Google OAuth dla tej funkcji. Szczegóły kontraktu, wyników i ograniczeń: [BACKEND.md](BACKEND.md#zaufana-przeglądarka--okres-ważności-i-ograniczenia); obsługa użytkownika: [frontend/README.md](../frontend/README.md#zaufana-przeglądarka-i-wylogowanie).

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

- [soma/README.md](soma/README.md) – opis frameworka SOMA,
- `AGENTS.md` – role w zespole agentów,
- `diagram.mmd` – workflow agentów,
- `BACKEND.md` – dokumentacja backendowych API, modeli kursów i instancji oraz tras frontendu.
