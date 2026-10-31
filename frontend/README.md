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

### Zatwierdzona homepage — 31.10.2026

`/` zastępuje poprzednią stronę: hero „Ogarnij egzamin. Krok po kroku.”, ścieżki egzaminacyjne (matura **planowana**), metoda SOMA z refleksją/adaptacją, jawne przykłady kursów, **statyczny** podgląd lekcji, O nas i końcowe CTA. Przykłady nie stanowią dostępnej oferty; podgląd nie jest dashboardem ani działającą lekcją.

Jedno źródło stylu: [kanoniczne wytyczne](../DOC/FRONTEND_STYLE.md), zapisujące późniejsze decyzje względem [specyfikacji v1.0](../DOC/SOMA_Learn_specyfikacja_frontend.md). Propozycje produktu w specyfikacji nie są automatycznie zatwierdzone. Obecna homepage ma kafelkowy layout i dekoracyjną przerywaną krzywą z czterema punktami w hero; `src/home/` zachowuje własny header/footer i scoped `.sl-home`.

Kursy nadal wymagają logowania. „Zacznij naukę” prowadzi gościa do rejestracji, zalogowanego do kursów. Metoda i O nas są natywnymi kotwicami; działają również przy ograniczonych animacjach.

### Wspólny styl istniejących widoków produkcyjnych — 31.10.2026

Późniejsza jawna zgoda użytkownika rozszerza styl homepage na istniejące auth, kursy, wspólny header/footer i NotFound. `src/app-shell.css` styluje je pod `.app-shell`, bez zmiany handlerów, uprawnień, lifecycle, prywatności, limitów załączników lub konfliktów rewizji 409. Katalog i formularze zachowują dotychczasowe działanie; nie dodano funkcji ani API.

`src/main.jsx` importuje **`styles.css` przed `app-shell.css`** — kolejność jest wymagana dla nadpisań shellu i objęta testem regresyjnym. App współdzieli istniejący eksport `HomeLogo` z `home/HomePage.jsx`; DOM typologo pozostaje bez zmian. Lokalny Manrope WOFF2 latin/latin-ext obejmuje homepage i shell. DM Sans/Fraunces/Manrope pozostają w zależnościach; cztery nieużywane fonty wariantów usunięto z manifestu i locka. `src/useLogoutFlow.js` zachowuje wspólny stan wylogowania i retry między nagłówkami.

Podglądy graficzne ABC usunięto w całości. `/wzory/*` wyświetla „Tej strony tu nie ma.” w zwykłym NotFound, bez przekierowania. Produkcyjny `VersionPreviewPage` i jego trasa podglądu kursu pozostają — nie są dawnym podglądem stylu.

### Istniejące trasy

- `/logowanie`, `/rejestracja`, `/logowanie/reset-hasla`, `/potwierdzenie-email`, `/potwierdzenie-email/{key}`, `/logowanie/google/callback` — istniejące widoki auth we wspólnym shellu.
- Nieznana trasa, w tym `/wzory/*` — NotFound.
- `/` — zatwierdzona homepage dla ósmoklasistów, z planowaną maturą, przykładami i statycznym preview; bez nowych API.
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

#### Konflikt aktywnej sesji podczas logowania

Cookie sesji serwerowej może pozostać aktywne po otwarciu nowej karty lub utracie tokenu DRF w `sessionStorage`. Allauth odrzuca wtedy formularz logowania odpowiedzią 409, która nie musi zawierać `meta.is_authenticated`.

Frontend sprawdza sesję przez `GET /_allauth/browser/v1/auth/session`. Jeśli jest uwierzytelniona, kończy ją przez istniejącą obsługę wylogowania i dopiero po potwierdzeniu ponawia logowanie podanymi danymi — najwyżej raz. Nie wymienia starej sesji na token poprzedniego konta. Ponowne logowanie nadal wymaga poprawnego hasła i, gdy backend tego wymaga, kodu OTP.

Zakończenie poprzedniej sesji cofa również zaufanie tej przeglądarki; kod OTP może więc być wymagany ponownie. Niepotwierdzone wylogowanie zatrzymuje ponowienie i pokazuje ostrzeżenie. Pozostałe konflikty zachowują komunikat `message` z API albo jawny polski komunikat zastępczy.

QA poprawki (31.10.2026): 93 testy auth/sesji/resetu i dodatkowe 50 testów formularzy/stylu/homepage zaliczone, build poprawny; niezależna kontrola kodu pozytywna. Nie wykonano rzeczywistego E2E z cookie użytkownika ani testu równoczesnych zmian sesji w innych kartach.

Na etapie wpisania kodu dostępny jest domyślnie niezaznaczony checkbox „Zapamiętaj mnie w tej przeglądarce” (zaufanie na 24 godziny). Nie jest dostępny na etapie hasła ani przy logowaniu Google. Nie zaznaczaj go na współdzielonym urządzeniu lub we wspólnym profilu przeglądarki.

- Zgoda jest wysyłana jako boolean `remember_browser` tylko z potwierdzeniem OTP (`POST /_allauth/browser/v1/auth/code/confirm`). Zaufanie powstaje dopiero po poprawnym kodzie i pełnym uwierzytelnieniu, na 24 godziny od tego potwierdzenia. Nowe logowanie resetuje wybór checkboxa.
- W tym czasie kolejne logowanie w tym profilu nadal wymaga e-maila i hasła, ale może zakończyć się bez kodu i bez e-maila OTP. Frontend obsługuje zarówno standardowe `401` z oczekującym `login_by_code`, jak i bezpośrednie `200` z `meta.is_authenticated: true`, po czym wymienia token DRF.
- Kolejne użycia nie przedłużają 24 godzin. To nie jest opcja utrzymywania sesji ani zmiana jej czasu. Najczęstsze zastosowanie to ponowne logowanie po utracie/wygaśnięciu sesji bez wcześniejszego wylogowania.
- Zaufaniem zarządza backend przez cookie `soma_trusted_browser` (`HttpOnly`); frontend nie zapisuje go w `localStorage` ani `sessionStorage`. W jednym profilu jest jeden bieżący token; ponowna zgoda zastępuje poprzedni, nie usuwa zaufania innych profili. Nie ma panelu urządzeń.
- Wylogowanie usuwa zaufanie tego profilu także przy wygasłej sesji. Zmiana/reset hasła unieważnia zaufania wszystkich profili. Opcja jest dostępna dla wszystkich ról, także staff/admin/superuser; formularz Django `/admin/` pozostaje bez zmian.
- Jeśli żądanie wylogowania nie zostanie potwierdzone, lokalny token i tak jest usuwany, lecz zaufanie na serwerze mogło pozostać. Użyj przycisku „Ponów wylogowanie”; dopiero `200` lub `401` z `meta.is_authenticated: false` jest traktowane jako potwierdzenie.

Nie jest to gwarancja pełnego bezpieczeństwa: skopiowane cookie przed cofnięciem zaufania może pomijać OTP w innym profilu (nadal wymaga hasła). Istniejący token DRF pozostaje ważny po logout/resecie hasła; usunięcie go z karty nie unieważnia go na serwerze. Szczegóły cookie, modelu, migracji i ograniczeń: [dokumentacja backendu](../DOC/BACKEND.md#zaufana-przeglądarka--okres-ważności-i-ograniczenia).

## Weryfikacja

### Styl widoków produkcyjnych — niezależne CODE QA PASS 31.10.2026

Windows, z `frontend/`:

```powershell
npm.cmd test -- tests/app-shell.test.jsx tests/home.test.jsx tests/App.test.jsx tests/session-navigation.test.jsx tests/trusted-browser.test.jsx
npm.cmd test
npm.cmd run build
```

Poniższe wyniki pochodzą z przekazanego odbioru kodu; przy tej aktualizacji dokumentacji nie uruchamiano ponownie testów ani builda.

Po CODE QA koordynator dodatkowo obejrzał zrzuty rzeczywistego logowania przy 1440 px i rejestracji przy 390 px: kafelki, logo i formularze były spójne, bez widocznego obcięcia. Oba pomiary miały szerokość dokumentu równą viewportowi i `overflow: visible` shellu. To ograniczona inspekcja auth, nie wizualny odbiór wszystkich kursów.

- TDD redesignu: RED 39 failed / 98 passed → GREEN 137 testów celowanych. Poprawka kaskady P2: RED 1 failed / 20 passed → GREEN 104 testy celowane.
- Autor po poprawce: pełny zestaw **289 passed / 1 skipped**, 26 plików; build PASS, 212 modułów. Niezależne QA: pełny zestaw **289 passed / 1 skipped**, build PASS; dodatkowa regresja **10 plików / 155 passed**.
- Naprawiony P2: style bazowe nadpisywały shell. Po zmianie kolejności importów computed styles potwierdziły działanie nadpisań; `html/body/#root/.app-shell/main` nie maskowały poziomego overflow.
- Chromium **156.0.8078.4**, syntetyczne zamockowane API: **62 pomiary geometrii** przy szerokościach 320/390/1440 px, zero błędów poziomego overflow. Wypełnione scenariusze obejmowały katalog i szczegóły, moje kursy, tworzenie przez mentora, głęboki edytor wersji (184 widoczne kontrolki; test materiału z 12 opcjami), hierarchię, załączniki, dialog, podgląd ucznia bez kluczy odpowiedzi, moderację i instancję ucznia.
- Auth: logowanie, rejestracja mentora, reset, dwa warianty weryfikacji, błąd callbacka Google; także NotFound i `/wzory/*`. Nie jest to pełny rzeczywisty E2E z backendem.
- Sprawdzono **52 typy kontrolek fokusa**; dialog anulowania: pułapka Tab i Escape PASS. Reduced motion: przejście 0,18 s → 0 s, scroll smooth → auto. Potwierdzono faktyczne użycie lokalnego Manrope i polskiego latin-ext. Kontrast sprawdzonych par: tekst min. **6,29:1**, CTA **8,55:1**, obrys kontrolki **4,36:1**.
- Reflow sprawdzono przy responsive-equivalent szerokościach **720/450/360/225 px**, **nie natywnym zoomie**. Zrzuty ekranu przechwycono tylko w pamięci i **nie obejrzano wizualnie**; nie jest to odbiór estetyki.
- Docker po `npm ci` w kontenerze i restarcie frontendu: **4 usługi healthy**, frontend 5174 i backend 8001 przywrócone. Bez wdrożenia.

**P3 — obserwacja nieblokująca, niepotwierdzona regresja:** przy 320×900 część textarea w głęboko wypełnionym edytorze pozostawała częściowo poniżej viewportu podczas Tab (`src/courses/TestEditor.jsx:23`, `src/courses/LessonItemEditor.jsx:29`). Widok jest przewijalny, focus widoczny, bez poziomego obcięcia ani blokady edycji. Nie zmieniano kodu tych komponentów; nie jest to potwierdzony naprawiony błąd.

Nie wykonano pełnego WCAG, screen readera, CWV/Lighthouse, Firefox/Safari, fizycznych urządzeń, pełnego rzeczywistego E2E auth, testów backendu ani penetracji dla tej zmiany. Osobne QA wcześniejszej zmiany kafelków homepage pozostaje do potwierdzenia; PASS rozszerzenia stylu nie zastępuje tego odbioru.

### Historyczna homepage — QA PASS 31.10.2026, przed późniejszymi kafelkami

TDD: pierwszy RED 24 failed / 66 passed, następnie GREEN 93 passed. Poprawki fokusa kotwic i CTA sesji: RED 2 failed / 18 passed, końcowy relevant GREEN **96 passed**. Pełny zestaw **260 passed / 1 skipped**, 26 plików; build OK.

Niezależny Chrome 156 przez CDP: szerokości dokumentu dokładnie 320/390/768/960/1440 px, widoczny focus i skip link, lokalny Manrope z polskimi literami, kontrast tekstu minimum 7,05:1, zoom 200%/400% i odstępy tekstu bez overflow. Retest kotwic Enter → Tab: 12/12 scenariuszy (320/390/1440, reduced motion i bez). W tym wcześniejszym etapie regresja wizualna innych tras i ówczesnych wzorów była bez zmian; gość na kursach przekierowany do logowania; zalogowany CTA oraz logout/error/retry sprawdzone także na zamockowanym API. Wyniki nie opisują odbioru obecnych kafelków ani późniejszego rozszerzenia.

Docker: po zmianie manifestów `docker compose restart frontend` wykonał instalację zależności; wszystkie cztery usługi healthy, frontend 5174 i backend 8001 `/admin/login/` HTTP 200. Bez wdrożenia i usuwania wolumenów.

Nie wykonano pełnego WCAG, czytnika ekranu, CWV/Lighthouse, Firefox/Safari, fizycznego telefonu ani pełnego E2E auth z prawdziwym kontem dla tej homepage.

### Historyczny prototyp informacyjny

Końcowe QA prototypu nie wykazało blockerów. `npm test` zakończył się wynikiem 10/10, `npm run build` zakończył się powodzeniem, a `get_errors` nie zgłosił błędów.

Ręczna inspekcja w Chrome/CDP objęła bezpośrednie otwarcie tras oraz emulowane viewporty 320×844 i 390×844. Na stronie głównej `document.scrollWidth` odpowiadał szerokości viewportu; na `/kursy` i `/logowanie` przy 390×844 wynosił 390 px. Zrzuty ekranu desktop i mobile zostały obejrzane wizualnie. Kontrasty wskazane podczas QA zostały poprawione.

Nie wykonano testu z czytnikiem ekranu ani pełnego audytu WCAG. Powyższa inspekcja responsywności dotyczy prototypu informacyjnego; QA nie zweryfikowało manualnie responsywności J6 widoków kursów w pełnej przeglądarce.

### Kursy wersjonowane — QA 30.10.2026

Backend SQLite: 316 OK, 8 skip; PostgreSQL: 316/316 OK. `makemigrations --check` nie wykazał zmian, `manage.py check` zwrócił 0 issues. Frontend: 230 passed, 1 skip; build i smoke API OK. Niezależne QA: **POZYTYWNY**. Niestabilny test `join-by-token` (wyścig mocka POST, `finish is not a function`) ustabilizowano synchronizacją w teście; 30/30 przebiegów OK. QA nie zweryfikowało ręcznie responsywności J6 w pełnej przeglądarce.

Walidacja typu i zawartości pliku nie jest skanowaniem antywirusowym. Szczegóły ograniczeń i API: [BACKEND.md](../DOC/BACKEND.md).

### Zaufana przeglądarka — QA 30.10.2026

Przekazane niezależne QA: PASS, bez blockerów; testy celowane 21 OK, ponowiony pełny zestaw 143 zaliczone i 1 pominięty, build OK. Pierwszy pełny przebieg miał 142 zaliczone, 1 niepowodzenie i 1 pominięty z powodu istniejącego flaky P3 w `tests/courses/guard-and-courses.test.jsx:87` („finish nie funkcja”), identycznego na bazowym HEAD; izolowane 14 testów przeszło. Nie naprawiano go w tym zakresie.

Chrome smoke z syntetycznym HTTP potwierdził checkbox w viewportcie 390×844 i ponawianie wylogowania przy szerokości 1280 px bez poziomego overflow. Nie był to pełny rzeczywisty E2E frontend + backend ani test na fizycznym telefonie/z czytnikiem ekranu; nie weryfikowano prawdziwego Google OAuth ani PostgreSQL dla tej funkcji. Pełne wyniki TDD i QA: [BACKEND.md — Weryfikacja](../DOC/BACKEND.md#weryfikacja-zaufanej-przeglądarki--30102026).