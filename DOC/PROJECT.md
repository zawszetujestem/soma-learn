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

### Kursy — wersjonowanie, zarządzanie i usuwanie (✅ zaimplementowane, QA PASS 08.11.2026)
- Kurs ma trwałą tożsamość oddzieloną od wersji treści. Tworzenie nadal wymaga mentora/admina i rozpoczyna wersję 1 jako roboczą; admin tworzy tylko publiczne. Mentor publikuje własny prywatny albo zgłasza publiczny do moderacji, także ponownie po odrzuceniu przed pierwszym publish. Edycja nie powoduje automatycznej reweryfikacji; publikacja jest jawnym przejściem lifecycle.
- Autor-mentor zarządza publicznym kursem tylko do pierwszej opublikowanej wersji. Potem zachowuje historyczny owner i odczyt (detail, licznik, wersje/podgląd), bez mutacji kursu, planu, treści i zasobów. Rola aplikacyjna `admin` zarządza publicznymi po publikacji i może bezpośrednio publikować kolejne wersje; cudza pierwsza nadal wymaga zgłoszenia i `accept`/moderacji. Mentor instancji i uprawnienia jej obsługi nie zmieniają się.
- `mine`: mentor widzi własne, admin wszystkie publiczne oraz własne private, nie cudze private. Dotychczasowe uprawnienia admina do treści prywatnych pozostają zachowane, odrębnie od listy/tożsamości/planu.
- DELETE z dowolną instancją (także zamkniętą) archiwizuje kurs (`is_active=false`, `200 ManageCourse`), zachowuje historię i istniejące instancje oraz zabrania nowych join. Bez instancji trwale usuwa kurs wraz z treścią/zasobami (`204`); fizyczne pliki są usuwane po commit, z cleanup jako zabezpieczeniem.
- Treść obejmuje klasyfikację Zakres/Przedmiot, hierarchię Dział→Temat→Lekcja, materiały teorii/praktyki, testy i informacyjne wymagania wstępne. Katalog pokazuje wyłącznie drzewo programu, bez materiałów i testów. Instancja ucznia zachowuje przypiętą wersję; CourseTask i plan godzinowy pozostają niezależne od wersji.
- Edytor wersji ma hierarchiczną tablicę kafelków w zagnieżdżonej liście: Dział→Temat→Lekcja i materiały teorii/praktyki. Kafelki otwierają modal szczegółów/edycji; treści i metadane pozostają poza tablicą. Menu `⋮` kafelka/obsługiwanej sekcji jest stale w prawym górnym rogu; kafelki używają istniejącej palety z odpowiednim kontrastem. Ustawienia wersji są pozycją menu sekcji „Edytor kursu” i otwierają osobny dialog; lifecycle ma odrębne menu. Modal hierarchii ma klikalną ścieżkę przodków w lewym górnym obszarze, a przejście do rodzica zmienia treść w tym samym dialogu i zachowuje szkice. Kolejność sekcji: Podstawowe→Elementy podrzędne/materiały→Wymagania wstępne→Test. Dodawanie działu, tematu, lekcji i materiału, ustawienia oraz usuwanie mają osobne dialogi. Test pozostaje po teorii i praktyce również w read-only. Praktyka to materiał lekcji `LessonItem`, nie `CourseTask`. Edycja tytułów, wymagań, testów, teorii/praktyki, uploadu, ETag i odczyt read-only pozostają obsługiwane; „Sposób rozwiązania” pozostaje nieaktywnym placeholderem „W przygotowaniu”, bez API. Opis obsługi: [frontend/README.md](../frontend/README.md#edytor-wersji-struktura-i-szczegóły--08112026).
- Niezależne QA funkcji edytora po rechecku: **PASS dla wszystkich trzech wcześniejszych blockerów**. `npm.cmd test -- tests/courses` — **243 passed (25 plików)**; dodatkowy zestaw celowany — **81 passed (9 plików)**; build **PASS** z nieblokującym ostrzeżeniem chunk 500.37 kB; `git diff --check` **PASS**. Pełny frontend: **389 passed, 7 failed, 1 skipped (34 pliki)**. Niezależny baseline, z modułami produkcyjnymi HEAD podstawionymi w pamięci, uzyskał **79 passed i te same 7 błędów auth/sesji**, potwierdzone jako wcześniejszy, niezwiązany problem. Sprawdzenie Chromium 1280/390 px nie wykazało poziomego overflow; sprawdzono focus, dodawanie zagnieżdżonego elementu w dialogu, zachowanie szkiców i kontrast. Nie testowano rzeczywistego API ani czytnika ekranu; macierz przeglądarek jest niepełna. Wyniki przekazane z QA; dokumentację zaktualizowano po QA i testów nie ponawiano przy tej aktualizacji.
- Załączniki są prywatne, pobierane przez API, z limitami PDF 20 MB, obrazów 5 MB, 20 załączników na lekcję i 1 GB na kurs (MB/GB dziesiętne). `approval_status`, `title` i `description` na Course są polami archiwalnymi.
- Końcowe niezależne QA zmiany zarządzania: **PASS bez blockerów**; backend `learning.tests users.tests` **354 OK**, frontend kursy **214 PASS**, management + version-access **48 PASS**, build PASS; `makemigrations --check --dry-run` bez zmian, diff-check clean. Wyniki przekazane z odbioru, nie ponowny przebieg przy aktualizacji docs.
- Ograniczenia: brak rozwiązywania/oceniania testów; wymagania wstępne `NodePrerequisite` w treści nie są egzekwowane (zależności `CourseTask` planu opisane w późniejszym statusie funkcji są egzekwowane); walidacja plików nie jest antywirusem. QA nie zweryfikowało manualnie responsywności J6 w pełnej przeglądarce. Niestabilny test frontendowy `join-by-token` ustabilizowano synchronizacją w teście (30/30 OK).
- Audyt ryzyka: bez blockerów funkcji; ograniczenia pełnego frontend suite opisano w punkcie QA edytora powyżej. Brak pełnego screen reader/E2E; sekwencji TDD nie można było niezależnie zweryfikować. Wymagany harmonogram `cleanup_course_assets` pozostaje do zapewnienia.
- Szczegóły modeli, lifecycle, endpointów, błędów, migracji i storage: [BACKEND.md](BACKEND.md#kursy-zadania-i-instancje); trasy i uruchomienie funkcji: [frontend/README.md](../frontend/README.md#trasy-i-zakres).

### Zaufana przeglądarka (✅ zaimplementowane, aktualizacja QA PASS 08.11.2026)
- Opcjonalne pomijanie OTP przez 24 godziny od poprawnego kodu; zgoda na etapie kodu, domyślnie wyłączona. Email i hasło nadal wymagane przy nowym logowaniu; użycie nie odnawia TTL ani nie przedłuża sesji.
- Backend: `TrustedBrowser` i migracja `0004_trusted_browser`; potwierdzone wylogowanie oraz logout z wygasłą sesją zachowują cookie i rekord zaufania bez usuwania, rotacji ani przedłużania pierwotnych 24 godzin. Logout kończy sesję, a frontend usuwa lokalny token. Zmiana hasha hasła unieważnia wszystkie profile; wygaśnięcie zaufania również wymusza OTP. Wszystkie role, także staff/admin/superuser, mogą korzystać z funkcji.
- Frontend obsługuje logowanie bez etapu kodu przy ważnym zaufaniu oraz ostrzeżenie i retry przy niepotwierdzonym wylogowaniu. Google i formularz `/admin/` bez zmian; brak panelu urządzeń.
- Historyczne niezależne QA 30.10.2026: backend 236 OK, 1 pominięty (celowane 29 OK); frontend ponowiony pełny przebieg 143 zaliczone, 1 pominięty (celowane 21 OK), build OK. Pierwszy przebieg frontendu ujawnił istniejący flaky P3 testu kursów, bez naprawy w tym zakresie; brak blockerów. Wyniki dotyczą ówczesnej implementacji, nie obecnego zachowania logout.
- Aktualny odbiór 08.11.2026: backend `users` **103 OK**, ostatni contract **29 OK** w głównym środowisku; targeted frontend **92 PASS**, full frontend **396 PASS, 1 skipped**, build **PASS** z nieblokującym ostrzeżeniem chunk **501.42 kB**, diff-check **PASS**. Niezależne QA **bez blockerów**; własne uruchomienie backendu przez agenta QA było zablokowane wersją allauth w jego środowisku, ale główne testy backendu wykonano poprawnie. Nie ponawiano testów przy aktualizacji docs. Wcześniejsze wyniki pełnego frontendu z 7 błędami w odbiorach innych funkcji pozostają historyczne.
- Login form nie utrwala emaila/hasła i inicjalizuje puste pola, zachowując `autocomplete="username"` / `current-password`. Aplikacja nie usuwa poświadczeń przeglądarki; aktywny natywny autofill zależy od browser i może wypełnić pola. Test realnego Chrome/autofill nie został wykonany. Przy konflikcie `409` frontend sprawdza sesję i potwierdza logout przed jednokrotnym ponowieniem wpisanych credentials; niepotwierdzony logout blokuje retry i wymianę poprzedniej sesji, a pozostałe konflikty wyświetlają `message` API lub komunikat zastępczy.
- To pomijanie OTP, nie pełne zabezpieczenie konta: skopiowane cookie nadal wymaga hasła, a token DRF nadal pozostaje ważny po logout/resecie. Nie wykonano pełnego rzeczywistego E2E, PostgreSQL ani prawdziwego Google OAuth dla tej funkcji. Szczegóły kontraktu, wyników i ograniczeń: [BACKEND.md](BACKEND.md#zaufana-przeglądarka--okres-ważności-i-ograniczenia); obsługa użytkownika: [frontend/README.md](../frontend/README.md#zaufana-przeglądarka-i-wylogowanie).

### Plan nauki: wiele kursów, zależności i cykle (✅ zaimplementowane, QA PASS 01.11.2026)
- Uczeń może mieć aktywne instancje różnych kursów; ponowne dołączenie do tej samej aktywnej instancji jest idempotentne. Kurs prywatny jest dostępny przez zaproszenie; w przepływie nie ma płatności.
- `CourseTask` obsługuje jawne zależności bez self-reference i cykli. Przy dołączeniu zadania i ich zależności są kopiowane do instancji, a wersja treści jest przypinana; późniejsze zmiany planu/wersji nie przepisują jej.
- Uczeń i przypisany mentor zachowują uprawnienia instancji. Można ręcznie prowadzić jeden cykl naraz na instancję, wybierać zadania na tablicę z backlogu, przeglądać historię oraz zamknąć i wznowić tę samą instancję bez automatycznego cyklu. Brak limitu długości i liczby zadań cyklu.
- `/nauka` pokazuje własne aktywne instancje ucznia i historię, nie kursy, w których użytkownik jest wyłącznie mentorem. Link jest dostępny w nagłówkach, katalogu, po zalogowaniu i z widoku instancji; mentor widzi ten sam komponent tablicy oraz link do pełnej instancji.
- Niezależne QA: **PASS, bez blockerów**, po trzech poprawkach P2. Backend SQLite: **327 PASS / 8 SKIP** z 335; testy celowane **50 PASS**; migracje bez zmian, `manage.py check` 0. Frontend: kursy **186 PASS**, build PASS, wybrane 8 plików **104 PASS**; pełny przebieg **332 PASS / 7 FAIL / 1 SKIP**. Wszystkie 7 niepowodzeń pełnego przebiegu potwierdzono jako przedistniejące konflikty testów logowania/sesji/nawigacji/zaufanej przeglądarki; pełny zestaw nie jest w całości zielony. Test klawiatury w jsdom PASS.
- Nie wykonano rzeczywistego E2E przeglądarkowego, przebiegu współbieżności PostgreSQL ani ręcznej oceny zoomu mobilnego, kontrastu i czytnika ekranu. Pozostały istniejące ostrzeżenia generowania OpenAPI dotyczące serializerów users/content i kolizji `operationId`.
- Szczegóły modeli, API, migracji i uprawnień: [BACKEND.md](BACKEND.md); obsługa, trasy i QA: [frontend/README.md](../frontend/README.md).

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
