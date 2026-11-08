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

Późniejsza jawna zgoda użytkownika rozszerza styl homepage na istniejące auth, kursy, wspólny header/footer i NotFound. `src/app-shell.css` styluje je pod `.app-shell`, bez zmiany handlerów, uprawnień, lifecycle, prywatności, limitów załączników lub konfliktów rewizji 409. W ramach tej zmiany katalog i formularze zachowały dotychczasowe działanie; nie dodano funkcji ani API. Późniejszą zmianę układu edytora wersji opisano poniżej.

`src/main.jsx` importuje **`styles.css` przed `app-shell.css`** — kolejność jest wymagana dla nadpisań shellu i objęta testem regresyjnym. App współdzieli istniejący eksport `HomeLogo` z `home/HomePage.jsx`; DOM typologo pozostaje bez zmian. Lokalny Manrope WOFF2 latin/latin-ext obejmuje homepage i shell. DM Sans/Fraunces/Manrope pozostają w zależnościach; cztery nieużywane fonty wariantów usunięto z manifestu i locka. `src/useLogoutFlow.js` zachowuje wspólny stan wylogowania i retry między nagłówkami.

Podglądy graficzne ABC usunięto w całości. `/wzory/*` wyświetla „Tej strony tu nie ma.” w zwykłym NotFound, bez przekierowania. Produkcyjny `VersionPreviewPage` i jego trasa podglądu kursu pozostają — nie są dawnym podglądem stylu.

### Istniejące trasy

- `/logowanie`, `/rejestracja`, `/logowanie/reset-hasla`, `/potwierdzenie-email`, `/potwierdzenie-email/{key}`, `/logowanie/google/callback` — istniejące widoki auth we wspólnym shellu.
- Nieznana trasa, w tym `/wzory/*` — NotFound.
- `/` — zatwierdzona homepage dla ósmoklasistów, z planowaną maturą, przykładami i statycznym preview; bez nowych API.
- `/kursy` — katalog wyłącznie opublikowanych, aktywnych kursów publicznych; wymaga logowania. Mentor/admin widzi „Utwórz nowy” i „Moje kursy”.
- `/nauka` — panel „Moja nauka” dostępny po zalogowaniu; pokazuje własne aktywne instancje ucznia i historię zamkniętych. Nie pokazuje kursów, w których użytkownik jest wyłącznie mentorem.
- `/kursy/{id}` — szczegóły kursu i dołączanie.
- `/kursy/dolacz/{token}`, `/kursy/instancje/{id}` — dołączenie przez link oraz instancja z treścią wersji przypiętej przy dołączeniu, zadaniami planu, backlogiem i tablicą cyklu.
- `/kursy/moje`, `/kursy/moje/nowy`, `/kursy/moje/{id}` — mentor widzi własne kursy; admin wszystkie publiczne i własne private (nie cudze private). Tworzenie wymaga mentor/admin, tworzy wersję 1 roboczą; admin tylko publiczne. Zarządzanie kursem/planem zależy od uprawnień, autor publicznego po publikacji zachowuje widok read-only.
- `/kursy/moje/{id}/wersje/{versionId}/edytuj` — edycja wersji roboczej lub odrzuconej tylko z prawem mutacji; zapis korzysta z ETag/`If-Match`. Autor publicznego po publikacji widzi pełną treść read-only zamiast formularzy zapisu.
- `/kursy/podglad/{id}/wersje/{versionId}` — podgląd SPA dla mentora/admina, w tym przełącznik pełnego podglądu i „Oczami ucznia”; moderator może zaakceptować/odrzucić zgłoszenie.
- `/course-moderation/` — kolejka moderacji administratora.
- Pełny opis modeli, lifecycle, endpointów, kodów błędów, migracji i storage: `../DOC/BACKEND.md`.

Tworzenie kursu nie publikuje go automatycznie. Kurs składa się z tożsamości i wersji treści. Mentor może opublikować własny prywatny albo zgłosić publiczny do moderacji; odrzuconą wersję publiczną może ponownie zgłosić przed pierwszą publikacją. Edycja nie powoduje automatycznej reweryfikacji. Wersja instancji jest przypięta i nie zmienia się po późniejszej publikacji nowej wersji. `CourseTask`/plan godzinowy pozostaje niezależny od wersji; jego zadania i zależności są kopiowane do instancji przy dołączeniu i nie aktualizują się później.

### Edytor wersji: struktura i szczegóły — 08.11.2026

Głównym widokiem edytora jest hierarchiczna tablica kafelków w zagnieżdżonej liście: **Dział → Temat → Lekcja → materiały teorii/praktyki**. Kafelki działu, tematu, lekcji i materiału otwierają modal szczegółów i edycji; treści oraz metadane nie są wyświetlane na tablicy. Pozycje praktyki są oznaczone jako „Zadanie”; to materiały lekcji (`LessonItem`), nie zadania planu godzinowego (`CourseTask`). Akcje poszczególnych elementów są dostępne w ich menu `⋮`.

Menu `⋮` kafelka lub obsługiwanej sekcji jest stale w prawym górnym rogu. Kolorowe kafelki korzystają z istniejącej palety, z zachowaniem odpowiedniego kontrastu. Ustawienia wersji są pozycją menu `⋮` w sekcji „Edytor kursu”; otwierają osobny dialog metadanych i zasobów. Lifecycle wersji (m.in. walidacja, publikacja i zgłoszenie do akceptacji) pozostaje w odrębnym menu.

Modal hierarchii pokazuje w lewym górnym obszarze pełną, klikalną ścieżkę przodków. Kliknięcie przodka przełącza treść w tym samym dialogu, bez utraty szkiców. Sekcje dialogu są w kolejności: **Podstawowe → Elementy podrzędne/materiały → Wymagania wstępne → Test**. Dodawanie działu, tematu, lekcji i materiału, ustawienia wersji oraz usuwanie otwierają osobne dialogi.

Nadal działają edycja tytułów, wymagań wstępnych i testów, teorii oraz praktyki, przesyłanie plików, wybór sposobu odpowiedzi (`answer_mode`: otwarte lub z kluczem) i edycja poprawnej odpowiedzi, zmiana kolejności oraz usuwanie. Test jest po teorii i praktyce zarówno w edytorze, jak i w widoku read-only. Zapis korzysta z ETag; przy nieaktualnej rewizji edytor odświeża wersję i zachowuje wpisane pola. Odczyt wersji read-only nie udostępnia mutacji. Zmiana wyboru ani zamknięcie modalu nie kasuje niezapisanych formularzy; nie oznacza to automatycznego zapisu.

Tylko pole „Sposób rozwiązania” jest placeholderem: ma jawny badge „W przygotowaniu” i jest nieaktywne. Nie ma dla niego API ani pola w wysyłanych danych; nie zastępuje działającej edycji odpowiedzi.

Pusta tablica zachęca do dodania pierwszego działu. Wybrany kafelek jest wyróżniony; zmiana kolejności zachowuje wybór. Po usunięciu wybranego materiału praktyki wybór i fokus przechodzą do jego lekcji; po usunięciu węzła — do najbliższego zachowanego przodka lub pierwszego dostępnego elementu, a przy pustej strukturze fokus wraca do nagłówka „Struktura”.

Niezależne QA po rechecku trzech wcześniejszych blockerów: **PASS dla wszystkich trzech**, bez poziomego overflow w Chromium przy 1280 i 390 px, oraz pozytywne sprawdzenie focusu, dodawania zagnieżdżonego elementu w modalu, zachowania szkiców i kontrastu. `npm.cmd test -- tests/courses`: **243 passed (25 plików)**; dodatkowy przebieg celowany: **81 passed (9 plików)**. Build **PASS** z nieblokującym ostrzeżeniem o chunku 500.37 kB; `git diff --check` **PASS**. Pełny frontend: **389 passed, 7 failed, 1 skipped (34 pliki)**. Niezależny baseline, po podstawieniu modułów produkcyjnych HEAD w pamięci, uzyskał **79 passed i te same 7 błędów auth/sesji**; są one potwierdzone jako wcześniejszy, niezwiązany problem. QA nie obejmowało rzeczywistego API ani czytnika ekranu; macierz przeglądarek jest niepełna. Ten wpis dokumentuje wyniki QA przekazane przed aktualizacją; testów nie ponawiano podczas aktualizacji dokumentacji.

### Zarządzanie kursem i uprawnienia — 08.11.2026

Od pierwszej wersji `published` mentor-autor publicznego kursu traci wszystkie mutacje kursu, planu, wersji/treści i zasobów, zachowując autorstwo, szczegóły, licznik i podglądy read-only. Historyczna publikacja nadal blokuje zapis po dezaktywacji lub bez bieżącego wskaźnika. Application admin (rola `admin`, nie sam staff/superuser) zarządza publicznymi kursami i może tworzyć szkice oraz bezpośrednio publikować kolejne wersje. Cudzą pierwszą wersję mentor nadal zgłasza do akceptacji/moderacji; admin nie może użyć dla niej bezpośredniego `publish`. Dotychczasowe backendowe uprawnienia admina do treści cudzych private pozostają zachowane, choć nie trafiają one do `mine`.

UI ustala mutacje z roli, ownera i historii publikacji — sam numer wersji nie dowodzi publikacji. Jeśli wymagane dane historii nie zostaną pobrane, pokazuje błąd i nie oferuje zależnych mutacji; podgląd zachowuje dostępną treść. Licznik to aktywne instancje z bieżącym użytkownikiem jako mentorem, nie suma uczniów kursu. Read-only autora zachowuje widok także przy błędzie licznika, pokazując błąd bez wymyślania wartości z listy instancji.

„Usuń kurs” wymaga potwierdzenia. Przy dowolnej instancji, także zamkniętej, DELETE zwraca `200 ManageCourse` i archiwizuje (`is_active=false`): strona zostaje otwarta z komunikatem, historia/treść/instancje pozostają, nowe join są zabronione. Bez instancji DELETE trwale usuwa kurs wraz z wersjami, treścią i zasobami (`204`), a UI wraca do `/kursy/moje` z komunikatem. Błędy uprawnień są widoczne: brak dostępu/mutacja autora po publikacji `404 not_found`, niedozwolony pierwszy `publish` admina `403 forbidden`; kontrakt pozostałych błędów w [BACKEND.md](../DOC/BACKEND.md#błędy-api).

Mentor przypisany do instancji nie zmienia się. Widok zarządzania autora po publikacji nie pokazuje kontrolek zapisu instancji, ale przypisany mentor zachowuje obsługę przez `/kursy/instancje/{id}` i API; read-only kursu nie odbiera uprawnień instancji.

### Moja nauka, backlog i cykle — QA PASS 01.11.2026

Zalogowany uczeń może mieć aktywne instancje różnych kursów jednocześnie. Ponowne dołączenie do tej samej aktywnej instancji kursu nie tworzy duplikatu. Kurs publiczny musi być aktywny i opublikowany; do kursu prywatnego dołącza się przez link zaproszenia. W tym przepływie nie ma płatności.

Do panelu `/nauka` prowadzą linki z nagłówka (także homepage), katalogu, stron po zalogowaniu i instancji. Panel dzieli własne instancje ucznia na aktywne i historię; karta otwiera tę samą instancję. Tytuł i treść pozostają przypięte do wersji użytej przy dołączeniu.

Na stronie instancji:

- „Rozpocznij cykl” ręcznie otwiera jeden aktywny cykl dla tej instancji. Uczeń wybiera zadania z backlogu przyciskiem „Dodaj do cyklu”; do backlogu może je odłożyć. Cykl nie ma narzuconej długości ani limitu zadań.
- Tablica aktywnego cyklu grupuje wyłącznie wybrane zadania według statusów „Do zrobienia”, „W trakcie” i „Gotowe”. Backlog pozostaje widoczny obok/poniżej tablicy. Bez aktywnego cyklu wszystkie zadania są w backlogu.
- Wymagania wstępne planu są jawne i nie mogą tworzyć pętli. Zadanie z niespełnionym wymaganiem pozostaje zablokowane w backlogu; samo odblokowanie nie dodaje go na tablicę. Zmiana ukończonego wymagania na status niedokończony może odłożyć niezakończone, zależne zadania wybrane na tablicę, zachowując ich statusy. Ukończone zadania pozostają ukończone.
- „Zakończ cykl” zachowuje historię wybranych zadań i ich statusów; zadania wracają do backlogu z zachowanym statusem. Zamknięcie instancji w dowolnym momencie zamyka również aktywny cykl. Wznowienie przywraca tę samą instancję bez automatycznego rozpoczynania nowego cyklu.
- Uczeń może wybierać zadania, zmieniać statusy, prowadzić cykle oraz zamykać i wznawiać kurs także z przypisanym mentorem. Mentor zachowuje możliwość obsługi instancji. Widok mentora osadza ten sam komponent tablicy i zawiera link do pełnej strony instancji. Panel ucznia pokazuje tylko własne instancje, a nie listę mentorską.
- Obsługa wykorzystuje natywne kontrolki formularzy i przyciski; tablica nie wymaga przeciągania i upuszczania.

Wymagania wstępne z treści kursu (`NodePrerequisite`) są odrębne i nadal informacyjne; nie są egzekwowane. W v1 nie ma rozwiązywania ani oceniania testów.

Pliki kursu są przechowywane prywatnie i dostępne wyłącznie przez uwierzytelnione API. Limity: PDF ≤20 MB, JPG/PNG/WebP ≤5 MB, maksymalnie 20 załączników na lekcję i 1 GB na kurs (MB/GB dziesiętne). Markdown teorii jest renderowany przez `react-markdown` z wyłączonym surowym HTML i walidacją linków. Podgląd ucznia nie ujawnia kluczy odpowiedzi ani poprawności opcji testowych. W v1 nie ma rozwiązywania/oceniania testów; tylko wymagania treści (`NodePrerequisite`) są informacyjne, zależności zadań planu są egzekwowane.

### Zaufana przeglądarka i wylogowanie

#### Konflikt aktywnej sesji podczas logowania

Cookie sesji serwerowej może pozostać aktywne po otwarciu nowej karty lub utracie tokenu DRF w `sessionStorage`. Allauth odrzuca wtedy formularz logowania odpowiedzią 409, która nie musi zawierać `meta.is_authenticated`.

Frontend sprawdza sesję przez `GET /_allauth/browser/v1/auth/session`. Jeśli jest uwierzytelniona, kończy ją przez istniejącą obsługę wylogowania i dopiero po potwierdzeniu ponawia logowanie podanymi danymi — najwyżej raz. Nie wymienia starej sesji na token poprzedniego konta. Ponowne logowanie nadal wymaga poprawnego hasła i, gdy backend tego wymaga, kodu OTP.

Zakończenie poprzedniej sesji zachowuje zaufanie tej przeglądarki bez usuwania lub rotacji cookie/rekordu i bez przedłużania TTL. Niepotwierdzone wylogowanie zatrzymuje ponowienie, nie wymienia poprzedniej sesji na token i pokazuje ostrzeżenie. Pozostałe konflikty zachowują komunikat `message` z API albo jawny polski komunikat zastępczy.

Historyczne QA poprawki (31.10.2026): 93 testy auth/sesji/resetu i dodatkowe 50 testów formularzy/stylu/homepage zaliczone, build poprawny; niezależna kontrola kodu pozytywna. Nie wykonano rzeczywistego E2E z cookie użytkownika ani testu równoczesnych zmian sesji w innych kartach. Aktualny odbiór opisano w sekcji weryfikacji z 08.11.2026.

#### Pola logowania i autofill

Aplikacja nie utrwala emaila ani hasła i inicjalizuje formularz z pustymi polami; wpisane credentials służą bieżącemu żądaniu oraz ewentualnemu pojedynczemu retry po potwierdzonym logout. Zachowane są `autocomplete="username"` dla emaila i `autocomplete="current-password"` dla hasła. Aplikacja nie usuwa poświadczeń zapisanych przez przeglądarkę ani menedżer haseł. Natywny autofill zależy od browser: przy aktywnym autofill nie można zagwarantować, że widoczne pola pozostaną puste. Nie wykonano testu w realnym Chrome z autofill; Google poza zakresem.

#### Zaufanie po poprawnym kodzie

Na etapie wpisania kodu dostępny jest domyślnie niezaznaczony checkbox „Zapamiętaj mnie w tej przeglądarce” (zaufanie na 24 godziny). Nie jest dostępny na etapie hasła ani przy logowaniu Google. Nie zaznaczaj go na współdzielonym urządzeniu lub we wspólnym profilu przeglądarki.

- Zgoda jest wysyłana jako boolean `remember_browser` tylko z potwierdzeniem OTP (`POST /_allauth/browser/v1/auth/code/confirm`). Zaufanie powstaje dopiero po poprawnym kodzie i pełnym uwierzytelnieniu, na 24 godziny od tego potwierdzenia. Nowe logowanie resetuje wybór checkboxa.
- W tym czasie kolejne logowanie w tym profilu nadal wymaga e-maila i hasła, ale może zakończyć się bez kodu i bez e-maila OTP. Frontend obsługuje zarówno standardowe `401` z oczekującym `login_by_code`, jak i bezpośrednie `200` z `meta.is_authenticated: true`, po czym wymienia token DRF.
- Kolejne użycia ani logout nie przedłużają pierwotnych 24 godzin. To nie jest opcja utrzymywania sesji ani zmiana jej czasu. Zaufanie działa również przy ponownym logowaniu po potwierdzonym wylogowaniu lub utracie/wygaśnięciu sesji.
- Zaufaniem zarządza backend przez cookie `soma_trusted_browser` (`HttpOnly`); frontend nie zapisuje go w `localStorage` ani `sessionStorage`. W jednym profilu jest jeden bieżący token; ponowna zgoda zastępuje poprzedni, nie usuwa zaufania innych profili. Nie ma panelu urządzeń.
- Wylogowanie kończy sesję i usuwa lokalny token z przeglądarki, lecz zachowuje cookie i rekord zaufania, także przy wygasłej sesji; nie usuwa ani nie rotuje zaufania. Do końca pierwotnego TTL ten sam profil nadal wymaga prawidłowego hasła i pomija wyłącznie OTP. Zmiana/reset hasła unieważnia zaufania wszystkich profili; wygaśnięcie również wymusza OTP. Opcja jest dostępna dla wszystkich ról, także staff/admin/superuser; formularz Django `/admin/` pozostaje bez zmian.
- Jeśli żądanie wylogowania nie zostanie potwierdzone, lokalny token i tak jest usuwany, lecz sesja serwerowa może pozostać aktywna. Użyj przycisku „Ponów wylogowanie”; dopiero `200` lub `401` z `meta.is_authenticated: false` jest traktowane jako potwierdzenie zakończenia sesji, nie cofnięcia zaufania.

Nie jest to gwarancja pełnego bezpieczeństwa: skopiowane ważne cookie może pomijać OTP w innym profilu do końca TTL (nadal wymaga poprawnego hasła; zmiana hasła unieważnia zaufanie). Istniejący token DRF pozostaje ważny po logout/resecie hasła; usunięcie go z karty nie unieważnia go na serwerze. Naprawa tego ryzyka pozostaje poza zakresem. Szczegóły cookie, modelu, migracji i ograniczeń: [dokumentacja backendu](../DOC/BACKEND.md#zaufana-przeglądarka--okres-ważności-i-ograniczenia).

## Weryfikacja

### Zaufanie po wylogowaniu i konflikt logowania — QA PASS 08.11.2026

Przekazany odbiór: targeted frontend **92 PASS**, pełny frontend **396 PASS, 1 skipped**, build **PASS** z nieblokującym ostrzeżeniem chunk **501.42 kB**, diff-check **PASS**. Backend w głównym środowisku: `users` **103 OK**, ostatni contract **29 OK**. Niezależne QA **bez blockerów**; własne uruchomienie backendu przez agenta QA było zablokowane wersją allauth w jego środowisku, ale główne testy backendu wykonano poprawnie.

Nie wykonano testu w realnym Chrome z natywnym autofill; pusty stan początkowy aplikacji nie gwarantuje pustych pól po autofill. Google poza zakresem. Wyniki pochodzą z QA, nie ponownego przebiegu przy aktualizacji dokumentacji. Poniższe wcześniejsze odbiory, w tym pełne przebiegi z 7 błędami auth/sesji, pozostają historyczne i nie opisują aktualnego wyniku pełnego frontendu.

### Edytor wersji: struktura i szczegóły — niezależne QA PASS 08.11.2026

Po poprawkach niezależne QA potwierdziło **PASS** trzech wcześniejszych blockerów. `npm.cmd test -- tests/courses` — **25 plików, 243 PASS**; dodatkowy zestaw celowany — **9 plików, 81 PASS**; build **PASS** z nieblokującym ostrzeżeniem chunk 500.37 kB; `git diff --check` **PASS**. Chromium przy 1280 i 390 px nie wykazał poziomego overflow; sprawdzono fokus, osobne dialogi dodawania, zachowanie szkiców i kontrast.

Pełny frontend zakończył się wynikiem **389 PASS, 7 FAIL, 1 skipped** (34 pliki). Niezależny baseline, po podstawieniu modułów produkcyjnych `HEAD` w pamięci, wykazał **te same 7 błędów auth/sesji**; QA potwierdziło, że są wcześniejsze i niezwiązane z edytorem. Nie testowano rzeczywistego API ani czytnika ekranu; macierz przeglądarek jest niepełna. Dokumentację zaktualizowano po QA; testów nie ponawiano podczas tej aktualizacji.

### Zarządzanie i usuwanie kursów — niezależne QA PASS 08.11.2026

Przekazany odbiór: **PASS bez blockerów**, testy `npm.cmd test -- tests/courses` — **214 PASS**, management + version-access — **48 PASS**, build PASS; backend **354 OK**, migracje bez zmian i diff-check clean. Nie uruchamiano ich ponownie przy aktualizacji dokumentacji; szczegóły [BACKEND.md](../DOC/BACKEND.md#zarządzanie-i-usuwanie-kursów--qa-pass-08112026).

Audyt ryzyka bez blockerów nie oznacza braku ryzyk: wcześniejszych 7 auth/navigation failures nie ponawiano i nie powiązano z tą zmianą, więc nie potwierdzono zielonego pełnego frontendu. Brak pełnego screen reader/E2E; kolejności TDD nie dało się niezależnie zweryfikować. Nadal potrzebne okresowe `cleanup_course_assets` po stronie backendu.

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

### Plan nauki i cykle — odbiór

Niezależne QA zakończyło się **PASS bez blockerów** po trzech poprawkach P2. Testy kursów: **186 PASS**; wybrane 8 plików: **104 PASS**; build PASS. Pełny frontend: **332 PASS / 7 FAIL / 1 SKIP** — 7 niepowodzeń to potwierdzone przedistniejące konflikty testów logowania/sesji/nawigacji/zaufanej przeglądarki, nie przedstawiaj więc pełnego zestawu jako zielonego. Accessibility/keyboard probe w jsdom PASS. TDD funkcji zakończono 80 PASS po RED 42 failed / 38 passed.

Nie wykonano rzeczywistego E2E w przeglądarce ani ręcznego odbioru responsywności mobilnej, zoomu, kontrastu lub czytnika ekranu. Wynik nie jest pełnym audytem dostępności.

### Zaufana przeglądarka — QA 30.10.2026

Historyczny odbiór pierwotnej implementacji; ówczesne cofanie zaufania przy logout zastąpiono zachowaniem opisanym w aktualizacji 08.11.2026.

Przekazane niezależne QA: PASS, bez blockerów; testy celowane 21 OK, ponowiony pełny zestaw 143 zaliczone i 1 pominięty, build OK. Pierwszy pełny przebieg miał 142 zaliczone, 1 niepowodzenie i 1 pominięty z powodu istniejącego flaky P3 w `tests/courses/guard-and-courses.test.jsx:87` („finish nie funkcja”), identycznego na bazowym HEAD; izolowane 14 testów przeszło. Nie naprawiano go w tym zakresie.

Chrome smoke z syntetycznym HTTP potwierdził checkbox w viewportcie 390×844 i ponawianie wylogowania przy szerokości 1280 px bez poziomego overflow. Nie był to pełny rzeczywisty E2E frontend + backend ani test na fizycznym telefonie/z czytnikiem ekranu; nie weryfikowano prawdziwego Google OAuth ani PostgreSQL dla tej funkcji. Pełne wyniki TDD i QA: [BACKEND.md — Weryfikacja](../DOC/BACKEND.md#weryfikacja-zaufanej-przeglądarki--30102026).