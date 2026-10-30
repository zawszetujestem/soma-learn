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
- `/logowanie` — logowanie e-mailem i hasłem, potem 6-cyfrowy kod z allauth (`/_allauth/browser/v1/`); po pełnym uwierzytelnieniu token DRF jest wymieniany przez `/api/auth/token/exchange/` i zapisywany w `sessionStorage`. Logowanie Google jest dostępne tylko dla zweryfikowanych kont. Ponowne wysłanie kodu ma 60 s cooldown, nie resetuje czasu wygaśnięcia (kod ważny 10 min) i po wygaśnięciu jest zablokowane.
- `/logowanie/reset-hasla` — reset hasła kodem: e-mail → 6-cyfrowy kod z e-maila → nowe hasło (allauth Headless `auth/password/...`). Link „Nie pamiętasz hasła?” znajduje się na etapie hasła w `/logowanie`.
- Zalogowany użytkownik (token DRF w `sessionStorage`) nie widzi `/logowanie` ani `/logowanie/reset-hasla` — jest przekierowany na `/kursy`. W nagłówku zamiast „Logowanie” pokazuje się „Wyloguj”, który kończy sesję allauth (`DELETE /_allauth/browser/v1/auth/session`), czyści token i wraca na `/`.

Dołączanie przez link z tokenem jest zaimplementowane. Zaproszenia imienne przez mentora są opisane jako planowane, ale nie są zaimplementowane.

## Weryfikacja

Końcowe QA prototypu nie wykazało blockerów. `npm test` zakończył się wynikiem 10/10, `npm run build` zakończył się powodzeniem, a `get_errors` nie zgłosił błędów.

Ręczna inspekcja w Chrome/CDP objęła bezpośrednie otwarcie tras oraz emulowane viewporty 320×844 i 390×844. Na stronie głównej `document.scrollWidth` odpowiadał szerokości viewportu; na `/kursy` i `/logowanie` przy 390×844 wynosił 390 px. Zrzuty ekranu desktop i mobile zostały obejrzane wizualnie. Kontrasty wskazane podczas QA zostały poprawione.

Nie wykonano testu z czytnikiem ekranu ani pełnego audytu WCAG. Powyższa inspekcja responsywności dotyczy prototypu informacyjnego; widoki kursów nie mają zakończonej weryfikacji responsywności (AC-53).