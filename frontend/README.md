# SOMA Learn — frontend

## Wymagania

- Node.js i npm dla uruchomienia bez kontenerów; w wariancie Docker wystarczy Docker Desktop z Compose v2.

## Uruchomienie lokalne

Z katalogu głównego repozytorium:

```bash
cd frontend
npm ci
npm run dev -- --host 127.0.0.1
```

## Uruchomienie w Dockerze

Z katalogu głównego repozytorium:

```powershell
docker compose up --build --wait
```

Frontend: http://localhost:5174, backend/admin: http://localhost:8001/admin/, poczta Mailpit: http://localhost:8027. Proxy `/api`, `/_allauth` i `/accounts` wskazuje w Dockerze `http://backend:8001`. Kod jest podmontowany, polling włączony przez `VITE_USE_POLLING=true`, a `node_modules` ma osobny wolumen linuksowy.

Testy i build: `docker compose exec frontend npm test` oraz `docker compose exec frontend npm run build`. Testy kontraktów Docker są pomijane w kontenerze; uruchamia się je na hoście. Konfiguracja, administrator, komendy i ograniczenia: [README projektu](../README.md#lokalny-docker).

## Testy i build

Uruchom z katalogu `frontend/`:

```bash
npm test
npm run build
```

Frontend korzysta z React 19, Vite 8 i React Router 7. Testy są oparte na Vitest i Testing Library. Widok używa lokalnych fontów oraz grafiki SVG osadzonej w kodzie.

## Trasy i zakres

- `/` — strona główna wyjaśniająca SOMA; pierwszą grupą są ósmoklasiści.
- `/kursy` — katalog wyłącznie opublikowanych, aktywnych kursów publicznych; wymaga logowania. Mentor/admin widzi „Utwórz nowy” i „Moje kursy”.
- `/kursy/{id}` — szczegóły kursu i dołączanie.
- `/kursy/dolacz/{token}`, `/kursy/instancje/{id}` — dołączenie przez link oraz instancja ucznia z treścią wersji przypiętej przy dołączeniu.
- `/kursy/moje`, `/kursy/moje/nowy`, `/kursy/moje/{id}` — lista kursów mentora/admina, utworzenie kursu z wersją 1 w stanie roboczym oraz zarządzanie kursami/planem godzinowym.
- `/kursy/moje/{id}/wersje/{versionId}/edytuj` — edycja wersji roboczej lub odrzuconej; zapis korzysta z ETag/`If-Match`.
- `/kursy/podglad/{id}/wersje/{versionId}` — podgląd SPA dla mentora/admina, w tym przełącznik pełnego podglądu i „Oczami ucznia”; moderator może zaakceptować/odrzucić zgłoszenie.
- `/course-moderation/` — kolejka moderacji administratora.
- Pełny opis modeli, lifecycle, endpointów, kodów błędów, migracji i storage: `../DOC/BACKEND.md`.

Tworzenie kursu nie publikuje go automatycznie. Kurs składa się z tożsamości i wersji treści. Mentor może opublikować kurs prywatny albo zgłosić publiczny do moderacji; edycja nie powoduje automatycznej reweryfikacji. Wersja instancji jest przypięta i nie zmienia się po późniejszej publikacji nowej wersji. `CourseTask`/plan godzinowy pozostaje niezależny od wersji.

Pliki kursu są przechowywane prywatnie i dostępne wyłącznie przez uwierzytelnione API. Limity: PDF ≤20 MB, JPG/PNG/WebP ≤5 MB, maksymalnie 20 załączników na lekcję i 1 GB na kurs (MB/GB dziesiętne). Markdown teorii jest renderowany przez `react-markdown` z wyłączonym surowym HTML i walidacją linków. Podgląd ucznia nie ujawnia kluczy odpowiedzi ani poprawności opcji testowych. W v1 nie ma rozwiązywania/oceniania testów, a wymagania wstępne mają charakter informacyjny.

### Zaufana przeglądarka i wylogowanie

Na etapie wpisania kodu dostępny jest domyślnie niezaznaczony checkbox „Zapamiętaj mnie w tej przeglądarce” (zaufanie na 24 godziny). Nie jest dostępny na etapie hasła ani przy logowaniu Google. Nie zaznaczaj go na współdzielonym urządzeniu lub we wspólnym profilu przeglądarki.

- Zgoda jest wysyłana jako boolean `remember_browser` tylko z potwierdzeniem OTP (`POST /_allauth/browser/v1/auth/code/confirm`). Zaufanie powstaje dopiero po poprawnym kodzie i pełnym uwierzytelnieniu, na 24 godziny od tego potwierdzenia. Nowe logowanie resetuje wybór checkboxa.
- W tym czasie kolejne logowanie w tym profilu nadal wymaga e-maila i hasła, ale może zakończyć się bez kodu i bez e-maila OTP. Frontend obsługuje zarówno standardowe `401` z oczekującym `login_by_code`, jak i bezpośrednie `200` z `meta.is_authenticated: true`, po czym wymienia token DRF.
- Kolejne użycia nie przedłużają 24 godzin. To nie jest opcja utrzymywania sesji ani zmiana jej czasu. Najczęstsze zastosowanie to ponowne logowanie po utracie/wygaśnięciu sesji bez wcześniejszego wylogowania.
- Zaufaniem zarządza backend przez cookie `soma_trusted_browser` (`HttpOnly`); frontend nie zapisuje go w `localStorage` ani `sessionStorage`. W jednym profilu jest jeden bieżący token; ponowna zgoda zastępuje poprzedni, nie usuwa zaufania innych profili. Nie ma panelu urządzeń.
- Wylogowanie usuwa zaufanie tego profilu także przy wygasłej sesji. Zmiana/reset hasła unieważnia zaufania wszystkich profili. Opcja jest dostępna dla wszystkich ról, także staff/admin/superuser; formularz Django `/admin/` pozostaje bez zmian.
- Jeśli żądanie wylogowania nie zostanie potwierdzone, lokalny token i tak jest usuwany, lecz zaufanie na serwerze mogło pozostać. Użyj przycisku „Ponów wylogowanie”; dopiero `200` lub `401` z `meta.is_authenticated: false` jest traktowane jako potwierdzenie.

Nie jest to gwarancja pełnego bezpieczeństwa: skopiowane cookie przed cofnięciem zaufania może pomijać OTP w innym profilu (nadal wymaga hasła). Istniejący token DRF pozostaje ważny po logout/resecie hasła; usunięcie go z karty nie unieważnia go na serwerze. Szczegóły cookie, modelu, migracji i ograniczeń: [dokumentacja backendu](../DOC/BACKEND.md#zaufana-przeglądarka--okres-ważności-i-ograniczenia).

## Weryfikacja

Końcowe QA prototypu nie wykazało blockerów. `npm test` zakończył się wynikiem 10/10, `npm run build` zakończył się powodzeniem, a `get_errors` nie zgłosił błędów.

Ręczna inspekcja w Chrome/CDP objęła bezpośrednie otwarcie tras oraz emulowane viewporty 320×844 i 390×844. Na stronie głównej `document.scrollWidth` odpowiadał szerokości viewportu; na `/kursy` i `/logowanie` przy 390×844 wynosił 390 px. Zrzuty ekranu desktop i mobile zostały obejrzane wizualnie. Kontrasty wskazane podczas QA zostały poprawione.

Nie wykonano testu z czytnikiem ekranu ani pełnego audytu WCAG. Powyższa inspekcja responsywności dotyczy prototypu informacyjnego; QA nie zweryfikowało manualnie responsywności J6 widoków kursów w pełnej przeglądarce.

### Kursy wersjonowane — QA 30.10.2026

Backend SQLite: 316 OK, 8 skip; PostgreSQL: 316/316 OK. `makemigrations --check` nie wykazał zmian, `manage.py check` zwrócił 0 issues. Frontend: 230 passed, 1 skip; build i smoke API OK. Niezależne QA: **POZYTYWNY**. Niestabilny test `join-by-token` (wyścig mocka POST, `finish is not a function`) ustabilizowano synchronizacją w teście; 30/30 przebiegów OK. QA nie zweryfikowało ręcznie responsywności J6 w pełnej przeglądarce.

Walidacja typu i zawartości pliku nie jest skanowaniem antywirusowym. Szczegóły ograniczeń i API: [BACKEND.md](../DOC/BACKEND.md).

### Zaufana przeglądarka — QA 30.10.2026

Przekazane niezależne QA: PASS, bez blockerów; testy celowane 21 OK, ponowiony pełny zestaw 143 zaliczone i 1 pominięty, build OK. Pierwszy pełny przebieg miał 142 zaliczone, 1 niepowodzenie i 1 pominięty z powodu istniejącego flaky P3 w `tests/courses/guard-and-courses.test.jsx:87` („finish nie funkcja”), identycznego na bazowym HEAD; izolowane 14 testów przeszło. Nie naprawiano go w tym zakresie.

Chrome smoke z syntetycznym HTTP potwierdził checkbox w viewportcie 390×844 i ponawianie wylogowania przy szerokości 1280 px bez poziomego overflow. Nie był to pełny rzeczywisty E2E frontend + backend ani test na fizycznym telefonie/z czytnikiem ekranu; nie weryfikowano prawdziwego Google OAuth ani PostgreSQL dla tej funkcji. Pełne wyniki TDD i QA: [BACKEND.md — Weryfikacja](../DOC/BACKEND.md#weryfikacja-zaufanej-przeglądarki--30102026).