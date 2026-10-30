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

- `/` — strona główna wyjaśniająca SOMA, z sekcjami dla ucznia, rodzica i mentora. Pierwszą grupą są ósmoklasiści; maturzyści są planowani później.
- `/kursy` — lista kursów publicznych, zatwierdzonych i aktywnych, szczegóły kursu i dołączanie; wymaga zalogowania.
- `/kursy/dolacz/{token}`, `/kursy/instancje/{id}` — dołączenie przez link i instancja ucznia.
- `/kursy/moje`, `/kursy/moje/nowy`, `/kursy/moje/{id}` — kursy mentora (wymagana rola mentor lub admin): lista, nowy kurs, zarządzanie kursem.
- Pełny opis tras i endpointów: `../DOC/BACKEND.md`.
- `/logowanie` — logowanie e-mailem i hasłem, standardowo potem 6-cyfrowy kod z allauth (`/_allauth/browser/v1/`). Ważne zaufanie przeglądarki pozwala pominąć etap kodu, ale nie hasło; po pełnym uwierzytelnieniu token DRF jest wymieniany przez `/api/auth/token/exchange/` i zapisywany w `sessionStorage`. Logowanie Google jest dostępne tylko dla zweryfikowanych kont. Ponowne wysłanie kodu ma 60 s cooldown, nie resetuje czasu wygaśnięcia (kod ważny 10 min) i po wygaśnięciu jest zablokowane.
- `/logowanie/reset-hasla` — reset hasła kodem: e-mail → 6-cyfrowy kod z e-maila → nowe hasło (allauth Headless `auth/password/...`). Link „Nie pamiętasz hasła?” znajduje się na etapie hasła w `/logowanie`.
- Pola hasła (logowanie, rejestracja, nowe hasło) mają przycisk „Pokaż/Ukryj” (`aria-pressed`, nie wysyła formularza); przy wysłaniu formularza hasło jest ponownie maskowane. Pola mają `autocomplete` `username` + `current-password`/`new-password`, a etap nowego hasła zawiera ukryte pole `username` z e-mailem, aby menedżer haseł przeglądarki podpowiadał i zapisywał dane logowania.
- Zalogowany użytkownik (token DRF w `sessionStorage`) nie widzi `/logowanie` ani `/logowanie/reset-hasla` — jest przekierowany na `/kursy`. W nagłówku zamiast „Logowanie” pokazuje się „Wyloguj”, który żąda zakończenia sesji allauth i cofnięcia zaufania (`DELETE /_allauth/browser/v1/auth/session`), czyści lokalny token i wraca na `/`. Przy niepotwierdzonym wylogowaniu pokazuje ostrzeżenie z możliwością ponowienia.

Dołączanie przez link z tokenem jest zaimplementowane. Zaproszenia imienne przez mentora są opisane jako planowane, ale nie są zaimplementowane.

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

Nie wykonano testu z czytnikiem ekranu ani pełnego audytu WCAG. Powyższa inspekcja responsywności dotyczy prototypu informacyjnego; widoki kursów nie mają zakończonej weryfikacji responsywności (AC-53).

### Zaufana przeglądarka — QA 30.10.2026

Przekazane niezależne QA: PASS, bez blockerów; testy celowane 21 OK, ponowiony pełny zestaw 143 zaliczone i 1 pominięty, build OK. Pierwszy pełny przebieg miał 142 zaliczone, 1 niepowodzenie i 1 pominięty z powodu istniejącego flaky P3 w `tests/courses/guard-and-courses.test.jsx:87` („finish nie funkcja”), identycznego na bazowym HEAD; izolowane 14 testów przeszło. Nie naprawiano go w tym zakresie.

Chrome smoke z syntetycznym HTTP potwierdził checkbox w viewportcie 390×844 i ponawianie wylogowania przy szerokości 1280 px bez poziomego overflow. Nie był to pełny rzeczywisty E2E frontend + backend ani test na fizycznym telefonie/z czytnikiem ekranu; nie weryfikowano prawdziwego Google OAuth ani PostgreSQL dla tej funkcji. Pełne wyniki TDD i QA: [BACKEND.md — Weryfikacja](../DOC/BACKEND.md#weryfikacja-zaufanej-przeglądarki--30102026).