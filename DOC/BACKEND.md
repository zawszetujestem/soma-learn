# Backend dokumentacja

## Model użytkownika

### User

Niestandardowy model użytkownika z wieloma rolami.

**Pola:**
- `email` — unikalny email (LOGIN)
- `password` — hasło (hashowane)
- `first_name` — imię
- `last_name` — nazwisko
- `age` — wiek (dla uczniów)
- `specialization` — specjalizacja (dla mentorów)
- `contact` — kontakt (dla mentorów)
- `bio` — opis (dla mentorów)
- `rating` — ocena (dla mentorów)
- `social_provider` — provider social login (google, facebook, icloud)
- `is_email_confirmed` — czy email potwierddzony
- `is_active` — czy konto aktywne
- `is_staff` — czy dostęp do admina
- `date_joined` — data rejestracji
- `roles` — role (ManyToMany: student, mentor, owner, admin)

### Role

Dostępne role:
- `student` — uczeń
- `mentor` — mentor
- `owner` — właściciel kursu
- `admin` — administrator systemu

### TrustedBrowser

Zaufanie profilu przeglądarki do pomijania kodu logowania przez 24 godziny; nie jest sesją ani tokenem API.

**Pola:**
- `user` — ForeignKey do `User`, `CASCADE`, relacja `trusted_browsers`
- `token_hash` — unikalny SHA-256 losowego tokenu (64 znaki); surowy token jest tylko w cookie
- `password_fingerprint` — HMAC-SHA-256 aktualnego hasha hasła, oparty na `SECRET_KEY` (64 znaki)
- `created_at` — czas utworzenia
- `expires_at` — czas wygaśnięcia, z indeksem

Model tworzy migracja `backend/users/migrations/0004_trusted_browser.py`, zależna od `0003_create_rate_limit_cache`. Przed użyciem funkcji należy wykonać standardowe `python manage.py migrate` (lokalny Compose wykonuje migracje automatycznie). Nie dodano automatycznego czyszczenia wygasłych rekordów ani panelu urządzeń.

## API Endpointy

### Autentykacja

#### `POST /api/auth/register/`

Rejestracja nowego konta.

**Request:**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "password": "secure_password",
  "role": "student",
  "age": 16
}
```

**Response:**
```json
{
  "id": 1,
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "roles": ["student"]
}
```

**Uwagi:**
- `role` — "student" lub "mentor"
- Mentorzy muszą podać `specialization`
- Email weryfikacyjny wysyłany automatycznie

#### `POST /api/auth/login/`

Endpoint wyłączony: zwraca `410 Gone` i nie wydaje tokenu.

**Response (410):**
```json
{
  "detail": "Use the allauth browser login flow."
}
```

#### Logowanie (allauth Headless)

Standardowe logowanie ma dwa etapy: email + hasło, a następnie 6-cyfrowy kod wysłany na email. Ważne zaufanie przeglądarki pozwala pominąć wyłącznie kod. Endpointy `/_allauth/browser/v1/` obsługuje allauth (klient `browser`) z rozszerzeniami potwierdzenia kodu i wylogowania.

1. `POST /_allauth/browser/v1/auth/login` z body `{"email": "...", "password": "..."}`. Bez ważnego zaufania poprawne dane zwracają `401` z oczekującym flow `login_by_code` i wysyłają kod. Z ważnym cookie zaufania dla tego użytkownika odpowiedź może od razu mieć `200`, `meta.is_authenticated: true`, bez wysyłania e-maila OTP. Email i hasło są nadal wymagane przy każdym nowym logowaniu. Konto z niepotwierdzonym emailem ma oczekujący flow `verify_email`.
2. `POST /_allauth/browser/v1/auth/code/confirm` z body `{"code": "123456"}` albo `{"code": "123456", "remember_browser": true}`. Po sukcesie `meta.is_authenticated` ma wartość `true`. Opcjonalne `remember_browser` włącza zaufanie tylko dla ścisłej wartości JSON `true`; brak pola, `false` i wartości nieboolowskie (np. `"true"` lub `1`) nie są zgodą. Cookie i rekord powstają wyłącznie po poprawnym OTP, odpowiedzi `200` i pełnym uwierzytelnieniu. Błędny/wygasły kod, wyczerpane próby, brak oczekującego logowania lub brak CSRF nie wydają zaufania. Pole jest obsługiwane tylko na tym endpointcie, nie przy podaniu hasła, resecie czy wymianie tokenu.
3. `POST /api/auth/login/resend/` wysyła kod ponownie:
   - kod jest ważny `ACCOUNT_LOGIN_BY_CODE_TIMEOUT = 600` s od pierwotnego wysłania; resend nie resetuje tego czasu,
   - cooldown między wysłaniami wynosi 60 s; w jego trakcie zwracane jest `429`,
   - `ACCOUNT_LOGIN_BY_CODE_SUPPORTS_RESEND = 1`: w jednym logowaniu kod można wysłać ponownie tylko raz; kolejna próba oraz próba po wygaśnięciu kodu zwracają `409` i wymagają rozpoczęcia logowania od nowa,
   - limit błędnych prób wpisania kodu: `ACCOUNT_LOGIN_BY_CODE_MAX_ATTEMPTS = 5`.
4. `POST /api/auth/token/exchange/` wydaje token DRF tylko po pełnym uwierzytelnieniu Headless (aktywna sesja i potwierdzony email); w przeciwnym razie zwraca `403`.

**Response (token exchange):**
```json
{
  "token": "abc123token...",
  "user": {
    "id": 1,
    "email": "john@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "roles": ["student"]
  }
}
```

Token przekazuje się jako `Authorization: Token <token>`. Frontend przechowuje go w `sessionStorage`.

#### Zaufana przeglądarka — okres ważności i ograniczenia

- Cookie `soma_trusted_browser`: `HttpOnly`, host-only (bez `Domain`), `Path=/`, `SameSite=Lax`, `Secure=settings.SESSION_COOKIE_SECURE`, `Max-Age=86400`. W aktualnej konfiguracji `SESSION_COOKIE_SECURE = not DEBUG`; lokalny HTTP nie zapewnia ochrony transportu.
- TTL wynosi dokładnie 24 godziny od poprawnego potwierdzenia kodu. Warunek ważności to `expires_at > now`; przy `expires_at <= now` ponownie wymagany jest OTP. Użycie zaufania nie odnawia cookie ani terminu w bazie.
- Zaufanie jest przypisane do użytkownika i tokenu w danym profilu. Profil przechowuje jeden bieżący token: ponowny opt-in wydaje token B i usuwa rekord wskazany przez dotychczasowe cookie A, więc replay A nie działa. Zaufania innych profili pozostają niezależne. Nie jest to globalny limit jednego rekordu na użytkownika.
- Konto musi być aktywne i mieć potwierdzony email. Funkcja jest dostępna dla wszystkich ról, także admin, staff i superuser, bez dodatkowych ograniczeń dla kont uprzywilejowanych.
- Reset hasła Headless i legacy oraz każda inna zmiana zapisanego hasha hasła unieważniają zaufania wszystkich profili przez niezgodność fingerprintu. Rekordy nie są wtedy od razu fizycznie kasowane. Zmiana `SECRET_KEY` również unieważnia zaufania.
- Cookie jest poświadczeniem typu bearer, nie dowodem posiadania konkretnego urządzenia: skopiowane przed unieważnieniem może służyć do pominięcia OTP w innym profilu, ale nadal wymaga poprawnego hasła. Nie należy włączać opcji na współdzielonym urządzeniu/profilu.
- Nie zmieniono czasu sesji Django (domyślnie 14 dni) ani cyklu życia tokenów DRF. Zaufanie nie utrzymuje sesji; może być wykorzystane przy kolejnym logowaniu po wylogowaniu lub utracie/wygaśnięciu sesji, jeśli nadal trwa pierwotny TTL i fingerprint hasła jest zgodny. Samo cookie nie pozwala wymienić tokenu bez uwierzytelnionej sesji.
- Google i formularz `/admin/` pozostają bez zmian; formularz Django admin już wcześniej nie wymagał OTP. Nie jest to wdrożenie pełnego MFA ani pełny audyt bezpieczeństwa.

#### Wylogowanie (allauth Headless)

`DELETE /_allauth/browser/v1/auth/session` kończy sesję, ale nie usuwa ani nie rotuje cookie `soma_trusted_browser` lub odpowiadającego mu rekordu serwerowego. Zaufanie przetrwa potwierdzone wylogowanie oraz wylogowanie z wygasłą sesją, bez przedłużenia pierwotnych 24 godzin. Do końca tego okresu ten sam profil nadal wymaga poprawnego hasła, a pomija wyłącznie OTP; wygaśnięcie zaufania lub zmiana hasła ponownie wymuszają OTP. Żądania przeglądarkowe nadal wymagają CSRF.

Frontend uznaje wylogowanie za potwierdzone przy `200` lub `401` z `meta.is_authenticated: false`. Lokalny token DRF z `sessionStorage` usuwa także przy błędzie, ale wtedy ostrzega, że sesja serwerowa może nadal być aktywna, i udostępnia „Ponów wylogowanie”. Retry służy zakończeniu sesji, nie cofnięciu zaufania. Samo usunięcie tokenu z karty nie potwierdza zakończenia sesji po stronie serwera.

**Istniejące ryzyko poza zakresem:** wydany token DRF pozostaje ważny po wylogowaniu i resecie hasła. Ta funkcja go nie unieważnia; zaufanie przeglądarki jest odrębnym mechanizmem.

Obsługa konfliktu logowania `409`, lokalnych pól formularza i ograniczeń natywnego autofill: [frontend/README.md](../frontend/README.md#zaufana-przeglądarka-i-wylogowanie). Nie zmieniono logowania Google.

#### Zablokowane endpointy Headless

`config/urls.py` zwraca `404` dla poniższych ścieżek pod `/_allauth/browser/v1/`. Zmiana hasła dla zalogowanego, zmiana e-maila oraz telefon nie są dostępne przez Headless:
- `auth/reauthenticate`
- `account/password/change`, `account/email`, `account/phone`
- `auth/phone/verify`, `auth/phone/verify/resend`

Aplikacja nie udostępnia endpointu zmiany hasła ani e-maila dla zalogowanego użytkownika.

#### Reset hasła kodem (allauth Headless)

Ekran `/logowanie/reset-hasla` działa na endpointach `/_allauth/browser/v1/auth/password/...`. Kod ma 6 cyfr, jest ważny `PASSWORD_RESET_BY_CODE_TIMEOUT = 600` s i ma `PASSWORD_RESET_BY_CODE_MAX_ATTEMPTS = 5` prób.

1. `POST /_allauth/browser/v1/auth/password/request` z body `{"email": "..."}`. Odpowiedź jest taka sama dla istniejącego i nieistniejącego adresu (`401` z oczekującym flow `password_reset_by_code`). Kod wysyłany jest tylko dla istniejących kont, a dla nieistniejących adres dostaje informację o braku konta. Jeśli przeglądarka ma aktywną sesję (`meta.is_authenticated: true`), frontend kończy ją przez `DELETE /_allauth/browser/v1/auth/session`, czyści token DRF i ponawia żądanie.
2. `GET /_allauth/browser/v1/auth/password/reset` z nagłówkiem `X-Password-Reset-Key: <kod>` sprawdza kod. Błędny kod zwraca `400` i zalicza próbę.
3. `POST /_allauth/browser/v1/auth/password/reset` z body `{"key": "<kod>", "password": "..."}` ustawia nowe hasło (walidatory haseł Django). Po sukcesie użytkownik loguje się ponownie; sesja nie jest uwierzytelniana.

Limity żądań: `reset_password` `20/h/ip,5/h/key`, `reset_password_from_key` `20/h/ip`.

W trybie `DEBUG` e-maile trafiają na konsolę serwera (`EMAIL_BACKEND` domyślnie `console`).

Legacy endpointy oparte o link (`POST /api/auth/password-reset/`, `POST /api/auth/password-reset-confirm/`) nadal istnieją i nie są używane przez ekran `/logowanie/reset-hasla`.

Obie ścieżki resetu unieważniają zaufania wszystkich profili przez zmianę fingerprintu hasła (szczegóły powyżej); nie kasują od razu tych rekordów ani nie unieważniają istniejących tokenów DRF.

#### `POST /api/auth/social-login/`

Endpoint wyłączony: zwraca `410 Gone`.

**Response (410):**
```json
{
  "detail": "Use the allauth Google login flow."
}
```

#### Logowanie przez Google (allauth Headless)

Start: `POST /_allauth/browser/v1/auth/provider/redirect` (`application/x-www-form-urlencoded`) z polami `provider=google`, `process=login`, `callback_url` (pełny adres `/logowanie/google/callback` na frontendzie) i `csrfmiddlewaretoken`.

Zasady (`users/adapters.py`):
- logowanie Google nie tworzy konta (`SOCIALACCOUNT_AUTO_SIGNUP = False`, `is_open_for_signup` zwraca `False`),
- konto zostaje podpięte tylko wtedy, gdy e-mail Google jest zweryfikowany, istnieje dokładnie jeden użytkownik z tym adresem, konto jest aktywne, ma potwierdzony email i zweryfikowany `EmailAddress`; w pozostałych przypadkach logowanie jest odrzucane (`PermissionDenied`),
- obsługiwany jest wyłącznie provider `google`.

#### `GET /api/auth/verify-email/?uid=...&token=...`

Starszy link z wiadomości. Endpoint przekierowuje (`302`) na `FRONTEND_BASE_URL/potwierdzenie-email/?uid=...&token=...`.

#### `POST /api/auth/verify-email/`

Potwierdzenie emaila z body `uid` i `token`.

**Response (sukces):**
```json
{
  "detail": "Email został potwierdzony."
}
```

Link z wiadomości allauth prowadzi na `FRONTEND_BASE_URL/potwierdzenie-email/{key}`; frontend potwierdza go przez `POST /_allauth/browser/v1/auth/email/verify` z body `{"key": "..."}`.

#### `POST /api/auth/password-reset/`

Żądanie resetu hasła.

**Request:**
```json
{
  "email": "john@example.com"
}
```

**Response:**
```json
{
  "detail": "Jeśli konto istnieje, instrukcje zostały wysłane."
}
```

#### `POST /api/auth/password-reset-confirm/`

Potwierdzenie nowego hasła (z linka z email).

**Request:**
```json
{
  "uid": "base64_uid",
  "token": "token_string",
  "new_password": "new_secure_password"
}
```

**Response:**
```json
{
  "detail": "Hasło zostało zmienione."
}
```

#### `GET /api/auth/me/`

Pobranie danych bieżącego zalogowanego użytkownika.

**Headers:**
```
Authorization: Token abc123token...
```

**Response:**
```json
{
  "id": 1,
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "age": 16,
  "roles": ["student"]
}
```

## Kursy, zadania i instancje

Nowy model treści kursów jest wersjonowany. Backend API, walidacja publikacji i uprawnienia są zaimplementowane w `backend/learning/`; materiały i załączniki kursu są przechowywane prywatnie.

### Model kursu i treści

- **Course** reprezentuje trwałą tożsamość kursu: właściciela, niezmienną po utworzeniu widoczność (`public` lub `private`), aktywność, token zaproszenia dla kursu prywatnego oraz wskazanie bieżącej opublikowanej wersji. Kurs nie jest samą treścią.
- **CourseVersion** zawiera konkretną treść i numer wersji (`number`), stan (`draft`, `submitted`, `rejected`, `published`) oraz licznik rewizji (`revision`). Tytuł, opis, Zakres i Przedmiot należą do wersji. Kurs może mieć opublikowaną wersję i co najwyżej jedną wersję roboczą/zgłoszoną/odrzuconą wymagającą dalszej pracy. Utworzenie kursu tworzy wersję 1 jako `draft`; kurs nie jest automatycznie publikowany.
- **Zakres (CourseScope)** i **Przedmiot (CourseSubject)** są słownikami zarządzanymi w Django admin. Można je dezaktywować zamiast usuwać. Do publikacji można wybrać wyłącznie aktywne pozycje.
- Wartości początkowe tworzy migracja danych `learning/migrations/0005_seed_classifications.py` (także przy nowej bazie): zakresy „Szkoła podstawowa”, „Szkoła średnia” oraz przedmioty zdawane na egzaminie ósmoklasisty lub maturze — Język polski, Matematyka, Język angielski, niemiecki, francuski, hiszpański, rosyjski, włoski, Historia, Wiedza o społeczeństwie, Geografia, Biologia, Chemia, Fizyka, Informatyka, Filozofia, Język łaciński i kultura antyczna. Bez W-F, muzyki, plastyki i techniki. Migracja dodaje tylko brakujące nazwy (nie duplikuje, nie przywraca dezaktywowanych ani nie nadpisuje zmian admina); cofnięcie jej niczego nie usuwa.
- Zawartość ma hierarchię **Dział → Temat → Lekcja** (`CourseNode`). Lekcje mogą zawierać osobne materiały teorii i praktyki (`LessonItem`): teoria obsługuje Markdown, PDF, obraz lub wideo; praktyka — tekst, tekst z obrazem, PDF lub obraz. Odpowiedź wzorcowa może być kluczem wyłącznie dla materiału praktycznego.
- Test (`NodeTest`) może być przypisany do elementu hierarchii i zawiera pytania jednokrotnego albo wielokrotnego wyboru, odpowiedzi i oznaczenia poprawności. W v1 nie ma rozwiązywania testu ani oceniania.
- Wymaganie wstępne (`NodePrerequisite`) wskazuje wcześniejszy, niezależny element tej samej wersji z testem i próg 1–100%. Jest walidowane strukturalnie, ale w v1 ma charakter informacyjny: system nie blokuje dostępu ani nie sprawdza jego spełnienia.
- `CourseTask` i plan godzinowy pozostają niezależne od wersjonowanej treści.
- `CourseTask.prerequisite_ids` opisuje zależności wyłącznie w obrębie planu jednego kursu. Zależności nie mogą wskazywać samego zadania ani tworzyć cyklu. To egzekwowane wymagania planu; odrębne `NodePrerequisite` w treści kursu pozostają informacyjne.
- `Course.approval_status`, `Course.title` i `Course.description` pozostają w bazie jako pola archiwalne/backward compatibility. Nie są źródłem bieżącego lifecycle ani treści publikacji; właściwym stanem jest wersja, a aktualny tytuł i opis pochodzą z niej.

### Lifecycle, moderacja i role

Nowa wersja kursu powstaje jako szkic (`draft`). Edytować można `draft` i `rejected`; każda udana zmiana treści zwiększa `revision`. Publikacja następuje jawnie przez operację lifecycle, a nie przy tworzeniu kursu. Edycja wersji nie wywołuje automatycznej reweryfikacji ani nie zmienia stanu opublikowanej wersji. Opublikowaną treść można skopiować jako nowy szkic kolejnego numeru.

| Operacja | Dozwolony wykonawca i warunek | Wynik |
|---|---|---|
| `submit` | Właściciel-mentor kursu publicznego, którego właściciel nie ma roli `admin`; przed pierwszą publikacją; stan `draft` lub `rejected` | `submitted`; pełna walidacja publikacji |
| `withdraw` | Właściciel mentor/admin z prawem mutacji; wersja `submitted` | `draft` |
| `publish` | Właściciel mentor/admin kursu prywatnego; admin-właściciel publicznego; dowolny admin dla publicznego z historyczną publikacją; stan `draft` lub `rejected` | `published`, wskazanie jako bieżącej publikacji |
| `accept` | Rola `admin`; zgłoszona wersja publiczna, której właściciel nie ma roli `admin` | `published` po walidacji |
| `reject` | Rola `admin`; wersja `submitted` | `rejected`, z opcjonalnym uzasadnieniem |

Tworzenie nadal wymaga roli mentor lub admin. Administrator tworzy wyłącznie kursy publiczne; konto łączące role mentora i administratora podlega regułom administratora. Uprawnienia aplikacyjne wynikają z roli `admin`, nie z samego `is_staff`/`is_superuser`. Kurs prywatny może opublikować jego właściciel.

Mentor-autor zarządza publicznym kursem do pierwszej opublikowanej wersji: może edytować, zgłaszać i ponownie zgłosić wersję `rejected`. Od pierwszej publikacji traci wszystkie mutacje kursu publicznego (tożsamość/aktywność, DELETE, plan, wersje, treść, zasoby i lifecycle), ale zachowuje autorstwo i odczyt. Decyduje istnienie dowolnej wersji `published`, także historycznej — dezaktywacja kursu lub brak bieżącego wskaźnika publikacji nie przywracają prawa zapisu. `Course.owner` i mentor przypisany do instancji nie są zmieniani; uprawnienia obsługi instancji pozostają niezależne.

Publicznymi kursami po publikacji zarządza application admin: może skopiować publikację do nowego szkicu, edytować i bezpośrednio publikować kolejne wersje. Cudzej pierwszej wersji nie może opublikować przez `publish`: mentor zgłasza ją, a admin wykonuje `accept`. Administrator przegląda kolejkę przez `GET /api/course-moderation/`, a akceptację/odrzucenie wykonuje przez API albo akcje Django admin na wersjach. Django admin udostępnia link do podglądu SPA; nie edytuje treści przez formularz admina.

### Spójność edycji: ETag i `If-Match`

Odpowiedzi pojedynczych wersji i projekcji zawierają nagłówek `ETag` (wartość nieprzezroczysta dla klienta, aktualnie w formie `"v{id}-r{revision}"`); lista wersji go nie wydaje. Każda mutacja istniejącej wersji (metadane, hierarchia, materiały i upload) oraz każda operacja lifecycle wymaga przesłania aktualnej wartości w `If-Match`. Tworzenie nowego szkicu i operacje na archiwum nieużywanych plików nie zmieniają rewizji istniejącej wersji i nie wymagają tego nagłówka. Brak nagłówka zwraca `400 revision_required`; nieaktualny ETag — `409 stale_revision`. Klient powinien zachować ETag z odpowiedzi i nie odtwarzać go samodzielnie.

### Materiały, pliki i uprawnienia

- Dozwolone pliki: PDF do **20 MB** (`20 000 000` bajtów), JPG/PNG/WebP do **5 MB** (`5 000 000` bajtów), maksymalnie **20 załączników na lekcję** i **1 GB na kurs** (`1 000 000 000` bajtów). MB/GB są dziesiętne. Limit kursu dotyczy przechowywanych plików, także nieużywanych aktualnie przez materiał.
- Backend waliduje sygnaturę i rzeczywistą zawartość pliku; PDF-y są parsowane, a obrazy dekodowane. To nie jest skan antywirusowy ani gwarancja bezpieczeństwa pliku.
- `CourseAsset` jest w prywatnym storage (`PRIVATE_MEDIA_ROOT`; bez tej zmiennej lokalizacja domyślna to `backend/private_media`); publiczny URL ani ścieżka do pliku nie są zwracane w JSON. Pobieranie odbywa się wyłącznie przez uwierzytelniony endpoint API, po sprawdzeniu powiązania pliku z daną wersją i uprawnień użytkownika. Nie wystawiać tego katalogu jako statycznych mediów.
- Odczyt authoring (pełne wersje, walidacja, podgląd i zasoby) przysługuje właścicielowi z rolą mentor oraz adminowi. Autor publicznego kursu zachowuje go po publikacji wyłącznie read-only; mutacje przechodzą na admina. Dotychczasowe uprawnienia admina do treści cudzych kursów prywatnych pozostają zachowane — nie oznacza to dostępu do ich `mine`, tożsamości ani planu.
- `student-preview` zawsze zwraca projekcję bez kluczy odpowiedzi i flag `is_correct`. Treść przypiętej instancji jest dostępna uczniowi/przypisanemu mentorowi oraz użytkownikom z odczytem authoring; użytkownik z uprawnieniami authoring (także mentor-autor po publikacji) otrzymuje klucze, pozostali — projekcję bez kluczy.
- `python manage.py cleanup_course_assets` ponawia niedokończone usuwanie i usuwa osierocone, nieśledzone pliki starsze niż 24 godziny (próg można zmienić przez `--older-than-hours`). Należy zapewnić okresowe uruchamianie; polecenie nie zastępuje backupu. Fizyczne pliki kursu usuwanego trwale są kasowane po zatwierdzeniu transakcji; błąd storage lub przerwanie procesu wymaga cleanup.

### Migracja istniejących danych

Migracje `0002_course_versions_schema`–`0004_require_instance_version` dodają model wersji i treści, wykonują backfill oraz sprawdzają kompletność i zgodność przypięcia instancji. `0003_backfill_course_versions` tworzy dla dotychczasowych kursów wersję 1 i przypina do niej istniejące instancje. Mapowanie: `approved → published`, `pending → submitted`, `rejected → rejected`; tytuł i opis są kopiowane z legacy pól kursu. Migracja nie odtwarza dla istniejących danych hierarchii, materiałów ani testów.

Migracja `0006_plan_dependencies_and_cycles` zmienia ograniczenie aktywnej instancji z jednego na ucznia na jedną na parę uczeń/kurs, dodaje zależności zadań planu i instancji oraz tabele cykli i ich wpisów. Istniejącym zadaniom nie dopisuje zależności, a istniejącym instancjom nie tworzy automatycznie cykli. Przed zastosowaniem migracji wykonaj i sprawdź backup bazy, następnie standardowo uruchom `python manage.py migrate` z katalogu `backend/`. Nie cofaj migracji jako metody rollbacku po nowych zapisach; w razie odtwarzania poprzedniego stanu użyj sprawdzonego backupu.

### Cykle lekcji instancji (nowa tablica)

Cykle lekcji są oddzielnym kalendarzowym mechanizmem od dotychczasowych, zadaniowych `InstanceCycle`/`InstanceCycleTask`. `CourseTask`/`InstanceTask`, ich zależności, statusy i endpointy pozostają bez zmian; cykle lekcji nie wybierają ani nie kończą zadań planu. `InstanceLessonCycle` ma status `planned`, `active` albo `ended`, daty oraz wpisy `InstanceLessonCycleLesson` wskazujące lekcje z przypiętej wersji. Nie ma tu statusu ukończenia lekcji ani blokowania przez wymagania.

Uczeń i przypisany mentor mają odczyt i zapis; każdy inny użytkownik (także autor kursu/admin bez przypisania) otrzymuje `404 not_found`. Zamknięta instancja jest read-only (`409 instance_closed` przy mutacji). Zamknięcie/wznowienie instancji nie zmienia statusów cykli lekcji; nie dodano zmian do istniejącego lifecycle instancji.

Baza endpointów: `/api/instances/{id}/lesson-cycles/`.

| Metoda | Ścieżka względem bazy | Body | Sukces |
|---|---|---|---|
| GET | pusta | — | `200`, projekcja |
| POST | pusta | `{start_date, end_date?}` | `201`, utworzenie planned i projekcja |
| PATCH | `{cycle_id}/` | `{start_date?, end_date?}` | `200`, edycja dat planned i projekcja |
| POST | `{cycle_id}/start/` | — | `200`, planned → active i projekcja |
| POST | `{cycle_id}/close/` | — | `200`, active → ended i projekcja |
| POST | `{cycle_id}/lessons/` | `{lesson_id}` | `200`, dodanie lekcji do planned i projekcja |
| DELETE | `{cycle_id}/lessons/{lesson_id}/` | — | `200`, usunięcie lekcji z planned i projekcja |

Wszystkie sukcesy mają tę samą projekcję:

```json
{
  "active_cycle": null,
  "planned_cycle": {
    "id": 12,
    "status": "planned",
    "start_date": "2026-11-08",
    "end_date": "2026-11-15",
    "last_day": "2026-11-14",
    "lesson_ids": [51, 52]
  },
  "history": []
}
```

`active_cycle`/`planned_cycle` to obiekt w powyższym formacie albo `null`; `history` zawiera ended w kolejności malejącego ID. `lesson_ids` są w kolejności dodania i należy mapować je do drzewa `CourseNode` przypiętej `Instance.course_version`, dostępnego przez istniejące `/api/instances/{id}/content/`; API nie ujawnia kluczy odpowiedzi w projekcji cykli.

- Wyłącznie lokalnie przekazane ISO `YYYY-MM-DD`, bez datetime/timezone. `start_date` włącznie, `end_date` wyłącznie; UI wyświetla inclusive `last_day = end_date - 1 dzień`.
- Przy tworzeniu `start_date` jest obowiązkowe, pominięte `end_date` daje 7 kolejnych dni. Zakres musi mieć `end_date > start_date`; nie ma limitu długości ani wymogu dat przyszłych.
- PATCH zachowuje pominięte pole, nie przelicza automatycznie 7 dni. Pusty PATCH jest no-op. Walidacja wynikowego zakresu odbywa się pod blokadą instancji.
- Maksymalnie jeden active i jeden planned na instancję. Start wymaga planned i braku active. Close wymaga active i nie uruchamia planned. Upływ dat nie powoduje przejść i start/close nie przepisują dat.
- Wybór/usuwanie lekcji oraz edycja dat są dozwolone tylko w planned. Lekcja musi mieć `kind=lesson` i należeć do przypiętej wersji; prerequisites nie są sprawdzane. Historyczne i aktywne wybory pozostają niezmienne.
- Endpointy wymagają uwierzytelnienia (`401 not_authenticated`). Brak uprawnienia do instancji lub cykl spoza instancji zwraca `404 not_found`; mutacja zamkniętej instancji `409 instance_closed`. Błędy mają niepuste `message` i `code`, zachowują HTTP status i pola kontraktu błędów. Walidacja dat lub body: `400 validation_error`; nieistniejąca lekcja, lekcja spoza przypiętej wersji lub zły kind: `400 invalid_lesson`; brak cyklu/wpisu albo próba usunięcia nieistniejącego wpisu: `404 not_found`; duplikat wyboru: `409 lesson_already_selected`; drugi planned/active: `409 planned_lesson_cycle_exists` / `active_lesson_cycle_exists`; niedozwolony lifecycle: `409 lesson_cycle_not_planned` / `lesson_cycle_not_active`.

Migracja `0007_lesson_cycles` tworzy `InstanceLessonCycle` i `InstanceLessonCycleLesson` bez backfillu i bez zmian tabel zadań. DB constraints dopuszczają najwyżej jeden planned i jeden active na instancję, ograniczają status do dozwolonych wartości, wymagają `end_date > start_date` i unikalności pary cykl/lekcja. Zapis przez serwisy używa wspólnej blokady `Instance` (`select_for_update`) również z istniejącym close/resume. Powiązanie lekcji z wersją/kind jest walidowane w serwisie (nie przez cross-table CHECK); bezpośrednie zapisy ORM/SQL omijające serwis nie powinny być używane.

Zamknięcie instancji nie kończy automatycznie `InstanceLessonCycle`: aktywny cykl pozostaje aktywny, a planowany pozostaje planowany; oba są zachowane i widoczne tylko do odczytu. Wznowienie nie tworzy ani nie uruchamia cyklu. To zachowanie jest niezależne od starego `InstanceCycle`, który zamyka się wraz z instancją.

Do wdrożenia wykonaj backup, a następnie standardowo `python manage.py migrate` w `backend/`. Nie cofaj migracji po nowych zapisach jako metody rollbacku; w razie potrzeby przywróć sprawdzony backup.

### Instancje ucznia, zależności zadań i cykle

Ta sekcja opisuje zadaniowy `InstanceCycle`/`InstanceCycleTask`; nie opisuje kalendarzowego `InstanceLessonCycle` z osobnego API powyżej.

- Uczeń może mieć równocześnie aktywne instancje różnych kursów. Dla tej samej pary uczeń/kurs istnieje najwyżej jedna aktywna instancja: ponowne dołączenie jest idempotentne i zwraca istniejącą instancję (`200`; utworzenie nowej zwraca `201`). Dołączyć można do opublikowanego, aktywnego kursu publicznego albo do prywatnego przez token zaproszenia. Ten przepływ nie realizuje płatności.
- Instancja zachowuje wersję treści wskazaną przy dołączeniu. Zadania `CourseTask` i ich zależności są niezależnym snapshotem, a statusy zadań instancji zaczynają się jako `todo`; edycja planu lub publikacja innej wersji kursu nie przepisuje istniejącej instancji.
- Wymagania wstępne zadań planu są spełnione, gdy wszystkie wskazane zadania mają status `done`. Niespełnione zadanie jest `blocked`, jeśli samo nie jest ukończone. Nie można dodać zablokowanego zadania do cyklu ani zmienić jego statusu na `in_progress` lub `done`. Odblokowanie nie dodaje go automatycznie do cyklu.
- Instancja może mieć jeden ręcznie uruchomiony, aktywny cykl naraz. Cykle są odrębne od `InstancePeriod`; nie narzucają długości ani limitu zadań. W aktywnym cyklu wybrane, niezablokowane zadania są na tablicy, a pozostałe w backlogu. Zmiana ukończonego zadania z powrotem na status niedokończony może zablokować i odłożyć do backlogu jego niedokończone, wybrane zadania zależne, zachowując ich statusy. Ukończone zależne zadania pozostają ukończone.
- Zamknięcie lub odłożenie wpisu zachowuje jego status w historii cyklu; zamknięcie cyklu zamraża pozostałe wpisy. Zadania niedokończone wracają do backlogu z zachowanym statusem, a ukończone zadania również są widoczne w backlogu po zakończeniu cyklu.
- Uczeń może wybierać zadania, zmieniać statusy, prowadzić cykle oraz zamykać i wznawiać własną instancję również z przypisanym mentorem. Przypisany mentor zachowuje możliwość obsługi instancji; uprawnienia pozostałych osób nie zostały rozszerzone. Zamknięcie instancji jest możliwe niezależnie od postępu i zamyka jej aktywny cykl, zapisując historię. Wznowienie przywraca tę samą instancję i jej snapshot, rozpoczyna nowy `InstancePeriod`, lecz nie uruchamia automatycznie cyklu. Wznowienie koliduje tylko z inną aktywną instancją tego samego ucznia w tym samym kursie.

#### API instancji i planu

Poniższe ścieżki mają prefiks `/api/` i wymagają uwierzytelnienia. Instancję może odczytywać uczeń lub przypisany mentor; obcy użytkownik nie otrzymuje dostępu. `GET /instances/mine/` zwraca tablicę instancji, w których bieżący użytkownik jest uczniem, wraz z `course_title` z przypiętej wersji. Odpowiedź instancji zawiera `active_cycle` (obiekt lub `null`), `cycle_history` oraz zadania z `prerequisite_ids` (ID zadań instancji), `blocked` i `selected`.

| Metoda | Ścieżka | Opis i odpowiedź |
|---|---|---|
| POST | `/courses/{course_id}/tasks/` | Utworzenie `CourseTask`; opcjonalne `prerequisite_ids` zapisuje zależności |
| PATCH | `/courses/{course_id}/tasks/{task_id}/` | Zmiana zadania; przesłane `prerequisite_ids` zastępuje listę zależności |
| GET | `/instances/mine/` | Lista wyłącznie własnych instancji ucznia |
| POST | `/instances/{id}/cycles/` | Ręczne rozpoczęcie cyklu; zwraca pełną instancję (`201`) |
| POST | `/instances/{id}/cycles/{cycle_id}/close/` | Zamknięcie aktywnego cyklu; zwraca pełną instancję (`200`) |
| PATCH | `/instances/{id}/tasks/{task_id}/` | Zmiana `status` i/lub `selected`; zwraca zadanie |
| POST | `/instances/{id}/close/` | Zamknięcie instancji i aktywnego cyklu; zwraca instancję |
| POST | `/instances/{id}/resume/` | Wznowienie tej samej instancji bez automatycznego cyklu; zwraca instancję |

Odpowiedzi błędów tej rodziny zachowują status HTTP, domenowy `code` i dostępne `detail`, zawierają bezpieczny, niepusty `message` i nie ujawniają wewnętrznych wyjątków. Przykładowe kody to `invalid_prerequisite` (400), `task_blocked`, `no_active_cycle`, `cycle_already_active`, `cycle_not_active`, `instance_closed` i `slot_taken` (409).

### REST API: kursy i zarządzanie

Prefiks `/api/`; wszystkie endpointy wymagają logowania. Tworzenie i rodzina zarządzania wymagają dodatkowo roli mentor/admin. Odczyt `mine` jest niezależny od prawa zapisu: mentor widzi własne kursy, także publiczne po publikacji i nieaktywne; admin widzi wszystkie publiczne (także nieopublikowane/archiwalne) oraz własne private, nie cudze private. Mutacje tożsamości/planu są dostępne adminowi dla publicznych i własnych private, a mentorowi dla własnych private i publicznych przed pierwszą publikacją.

| Metoda | Ścieżka | Opis i odpowiedź |
|---|---|---|
| GET | `/courses/` | `200`, lista `CourseSerializer`: wyłącznie aktywne, opublikowane publiczne |
| POST | `/courses/` | `201 ManageCourseSerializer`; `visibility`, opcjonalne `title`, `description`, `scope_id`, `subject_id`; tworzy wersję 1 `draft`; admin-private: `403 forbidden` |
| GET | `/courses/mine/`, `/courses/mine/{id}/` | `200`, lista lub obiekt `ManageCourseSerializer`; autor po publikacji zachowuje odczyt |
| GET | `/courses/mine/{id}/students-count/` | `200 {"count": N}`; aktywne instancje tego kursu z `mentor=request.user`, nie globalna liczba uczniów |
| GET | `/courses/{id}/` | `200 CourseSerializer`; wymaga bieżącej publikacji; owner czyta własny kurs także nieaktywny; inni według `visible_courses` (aktywny publiczny lub własna instancja; admin wszystkie opublikowane) |
| PATCH | `/courses/{id}/` | Wyłącznie `is_active`; `200 ManageCourseSerializer`; widoczność niezmienna, metadane treści przez wersję |
| DELETE | `/courses/{id}/` | Z dowolnym `Instance` (także `closed`): archiwizacja `is_active=false`, `200 ManageCourseSerializer`; bez instancji: fizyczne usunięcie Course, wersji, treści, planu i rekordów zasobów, `204` bez body |
| POST | `/courses/{id}/resubmit/` | Zgodnościowe ponowne zgłoszenie `rejected`; aktualny `If-Match`; `200 ManageCourseSerializer` i ETag; dla mentora tylko przed pierwszą publikacją |
| POST | `/courses/{id}/regenerate-token/` | Kurs prywatny; `200 ManageCourseSerializer`; publiczny: `409 course_not_private` |
| DELETE | `/courses/{id}/tasks/{task_id}/` | Usunięcie zadania planu; `204`; te same uprawnienia mutacji kursu |

`CourseSerializer` zawiera ID ownera i bieżącej publikacji, widoczność, aktywność, zadania, daty oraz tytuł/opis/klasyfikację i `program` z bieżącej publikacji (bez materiałów/testów). `ManageCourseSerializer` dodaje `working_version`, `versions`, `invite_token` i archiwalne `approval_status`; metadane wybiera z wersji roboczej, a przy jej braku z bieżącej publikacji. Nie zwraca flagi prawa zapisu — frontend ustala je z roli, ownera i historii publikacji.

Archiwizacja zachowuje wersje, zasoby, instancje, przypięcia i historię; nie zmienia mentora instancji ani jej uprawnień. Nowe dołączenia są zabronione (`409 course_inactive` dla uprawnionego ucznia z widocznym kursem), również przed sprawdzeniem idempotentnej aktywnej instancji. DELETE nie wymaga `If-Match`. Archiwizacja nie odbiera uprawnionemu managerowi możliwości reaktywacji przez PATCH.

### REST API: wersjonowana treść

Prefiks `/api/`; uwierzytelnianie przez `Authorization: Token <token>` lub sesję. Trasy treści wymagają zalogowania; odczyt authoring i mutacje rozdzielono zgodnie z sekcją „Materiały, pliki i uprawnienia”. Mentor-autor publicznego kursu po pierwszej publikacji może odczytywać wersje, ale nie zapisywać. `course-moderation` jest dostępne roli `admin`. Odpowiedzi pojedynczych wersji/projekcji i przejść lifecycle zawierają `ETag`; lista wersji nie wydaje ETag.

| Metoda | Ścieżka | Opis |
|---|---|---|
| GET | `/course-scopes/`, `/course-subjects/` | Aktywne pozycje słowników |
| GET, POST | `/courses/{course_id}/versions/` | Lista wersji; POST tworzy nową wersję przez skopiowanie bieżącej publikacji |
| GET, PATCH | `/courses/{course_id}/versions/{version_id}/` | Pełna treść wersji; PATCH zmienia metadane |
| GET | `.../validation/`, `.../student-preview/` | Walidacja publikacji; podgląd bez kluczy odpowiedzi |
| POST | `.../submit/`, `.../withdraw/`, `.../publish/`, `.../accept/`, `.../reject/` | Przejścia lifecycle; `reject` przyjmuje opcjonalne `reason` |
| POST | `.../nodes/`; PATCH, DELETE | Dodanie działu/tematu/lekcji; edycja tytułu lub usunięcie węzła |
| POST | `.../nodes/{node_id}/move/` | Zmiana kolejności rodzeństwa (`direction: up/down`) |
| PUT, DELETE | `.../nodes/{node_id}/prerequisite/` | Ustawienie/usunięcie informacyjnego wymagania wstępnego |
| POST, PUT, DELETE | `.../nodes/{node_id}/test/` | Utworzenie, zastąpienie lub usunięcie testu |
| POST | `.../lessons/{lesson_id}/items/` | Dodanie materiału teorii/praktyki |
| PATCH, DELETE | `.../lessons/{lesson_id}/items/{item_id}/` | Edycja/usunięcie materiału |
| POST | `.../lessons/{lesson_id}/items/{item_id}/move/` | Zmiana kolejności materiału w kategorii |
| POST | `.../assets/` | Wgranie jednego pliku w polu multipart `file` |
| GET | `/courses/{course_id}/assets/` | Lista plików, quota i liczba odwołań |
| DELETE | `/courses/{course_id}/assets/{asset_id}/` | Usunięcie nieużywanego pliku |
| GET | `.../assets/{asset_id}/download/` | Prywatne pobranie załącznika należącego do wersji |
| GET | `/course-moderation/` | Kolejka zgłoszonych wersji dla administratora |
| GET | `/instances/{id}/content/` | Treść wersji przypiętej do instancji; klucze tylko przy uprawnieniach authoring |

Endpointy dołączania i obsługi instancji są niezależne od numeru wersji; przy dołączeniu instancja zostaje przypięta do aktualnie opublikowanej wersji. Zmiana publikacji nie przepisuje treści już przypiętych instancji. Nowy klient powinien używać wersjonowanego `.../submit/` zamiast zgodnościowego resubmit opisanego wyżej.

### Błędy API

W rodzinach endpointów kursów, instancji, słowników i moderacji odpowiedzi błędów mają bezpieczny, niepusty `message` i `code`; zachowują także właściwy status HTTP oraz dostępne `detail` i dodatkowe pola, np. `issues` lub `dependencies`. Błędy serwera nie ujawniają wewnętrznych wyjątków. Kody statusów: `400 validation_error`, `401 not_authenticated`, `403 forbidden` (lub `csrf_failed`), `404 not_found`, `405 method_not_allowed`, `409 conflict`, `413 request_too_large`, `415 unsupported_media_type`, `429 throttled`, `500 internal_error`, `503 service_unavailable`. Błędy walidacji plików, treści i zależności planu zachowują kod domenowy, np. `revision_required` (400), `invalid_file`, `file_too_large` (413), `invalid_material`, `invalid_prerequisite`, `version_incomplete`, `classification_invalid`, `attachment_limit_exceeded`; konflikty (409) obejmują m.in. `stale_revision`, `invalid_version_state`, `working_version_exists`, `asset_in_use`, `course_not_approved`, `course_inactive`, `slot_taken`, `task_blocked`, `cycle_already_active`, `instance_closed`.

Brak logowania: `401 not_authenticated`; brak roli mentor/admin na endpointach zarządzania: `403 forbidden`. Brak dostępu do konkretnego kursu lub mutacja mentora publicznego kursu po publikacji: `404 not_found` (także DELETE i lifecycle), nie `403`. Admin próbujący `publish` cudzej pierwszej wersji: `403 forbidden`. Dostęp jest sprawdzany przed ujawnieniem stanu/rewizji; uprawniony klient otrzymuje `409 invalid_version_state`, `400 revision_required` lub `409 stale_revision` zależnie od żądania. Resubmit bez odrzuconej wersji: `409 course_not_rejected`; PATCH widoczności: `400 visibility_immutable`, metadanych treści: `400 version_fields_required`.

### Trasy frontendu

Trasy kursów wymagają logowania; wejścia zarządzania/edycji wymagają roli mentor/admin, ale sama rola nie daje prawa mutacji. Autor publicznego kursu po publikacji zachowuje widok read-only.

| Trasa | Widok |
|---|---|
| `/kursy` | Katalog tylko opublikowanych, aktywnych kursów publicznych; pokazuje program (drzewo działów/tematów/lekcji), bez materiałów i testów; mentor/admin ma przycisk „Utwórz nowy” i wejście do „Moich kursów” |
| `/nauka` | Zalogowany uczeń widzi własne aktywne instancje i historię zamkniętych; instancja, w której jest tylko mentorem, nie trafia do panelu |
| `/kursy/{id}` | Szczegóły widocznego kursu i dołączanie |
| `/kursy/dolacz/{token}` | Dołączenie do kursu prywatnego przez link |
| `/kursy/instancje/{id}` | Instancja i przypięta treść; nowa tablica cykli lekcji zastępuje dotychczasową tablicę zadań w UI; uczeń oraz przypisany mentor zachowują uprawnienia do obsługi |
| `/kursy/moje` | Mentor: własne; admin: wszystkie publiczne i własne private, bez cudzych private |
| `/kursy/moje/nowy` | Utworzenie tożsamości kursu i wersji 1 w stanie roboczym |
| `/kursy/moje/{id}` | Zarządzanie kursem/planem/wersjami; autor publicznego po publikacji read-only, z licznikiem i podglądami; DELETE 200 zostaje na stronie z komunikatem archiwizacji, 204 wraca do listy |
| `/kursy/moje/{id}/wersje/{versionId}/edytuj` | Edycja `draft`/`rejected` tylko z prawem mutacji; bez niego pełna treść read-only, nie formularz zapisu |
| `/kursy/podglad/{id}/wersje/{versionId}` | Podgląd SPA; przełącznik pełnego widoku i „Oczami ucznia”; moderator może stąd podjąć decyzję |
| `/course-moderation/` | Kolejka moderacji administratora |

Frontend sprawdza historię publikacji, nie sam numer wersji. Gdy potrzebne dane `mine` nie zostaną pobrane, pokazuje błąd i blokuje zależne mutacje; podgląd może zachować odczytaną treść. Błąd licznika w read-only autora nie jest zastępowany liczbą z listy instancji. Widok zarządzania autora nie udostępnia kontrolek zapisu instancji, ale uprawnienia przypisanego mentora na trasie instancji/API pozostają bez zmian.

### Zarządzanie i usuwanie kursów — QA PASS 08.11.2026

Przekazane niezależne QA: **PASS bez blockerów** dla tej zmiany; nie uruchamiano testów ponownie przy aktualizacji dokumentacji. Backend: `docker exec ... manage.py test learning.tests users.tests --noinput --verbosity 0` — **354 OK**; frontend: `npm.cmd test -- tests/courses` — **214 PASS**, management + version-access — **48 PASS**, build PASS. `makemigrations --check --dry-run` — bez zmian; diff-check clean.

Audyt ryzyka nie wykazał blockerów. Wcześniejszych 7 niepowodzeń auth/navigation nie ponawiano i nie powiązano z tą zmianą — nie jest to potwierdzenie zielonego pełnego frontendu. Nie wykonano pełnego testu screen reader/E2E; kolejności TDD nie dało się niezależnie zweryfikować. Nadal należy zapewnić harmonogram `cleanup_course_assets`; PASS nie usuwa tych ograniczeń.

### Kursy v1 — ograniczenia i weryfikacja (30.10.2026)

Weryfikacja funkcji: backend SQLite **316 OK / 8 skip**, PostgreSQL **316/316 OK**, `makemigrations --check` bez zmian, `manage.py check` — **0 issues**; frontend **230 passed / 1 skip**, build OK, smoke API OK; niezależne QA — **POZYTYWNY**. Niestabilny test frontendu `join-by-token` (wyścig mocka POST) ustabilizowano synchronizacją w teście; 30/30 przebiegów OK. QA nie zweryfikowało ręcznie responsywności J6 w pełnej przeglądarce.

Ograniczenia: v1 nie obsługuje rozwiązywania ani oceniania testów; wymagania `NodePrerequisite` w treści kursu pozostają informacyjne (w odróżnieniu od egzekwowanych zależności `CourseTask` planu opisanych wyżej); walidacja plików nie jest skanowaniem antywirusowym. Responsywność J6 nie została zweryfikowana manualnie w pełnej przeglądarce przez QA.

### Plan nauki i poprzednia tablica zadań — historyczne QA 01.11.2026

Poniższy wynik QA i opis dotyczą poprzedniej tablicy zadań oraz `InstanceCycle`; nie są wynikiem QA nowej tablicy kalendarzowych cykli lekcji.

Niezależne QA: **PASS, bez blockerów**, po poprawieniu trzech problemów P2 (widok tablicy mentora, sprzeczny test legacy i typy OpenAPI). Backend: pełny przebieg SQLite **327 PASS / 8 SKIP** z 335 testów; testy celowane cykli/schematu/usług **50 PASS**; `makemigrations --check --dry-run` bez zmian i `manage.py check` — 0 problemów. Przebieg współbieżności PostgreSQL pominięto. Frontend: testy kursów **186 PASS**, build PASS, wybrane 8 plików **104 PASS**; pełny zestaw **332 PASS / 7 FAIL / 1 SKIP**. Wszystkie 7 niepowodzeń pełnego przebiegu potwierdzono jako istniejące już wcześniej konflikty testów logowania/sesji/nawigacji/zaufanej przeglądarki; nie przedstawiaj pełnego zestawu jako zielonego. Testy TDD funkcji zakończono wynikiem 80 PASS po 42 niepowodzeniach i 38 zaliczeniach w fazie RED.

Znane granice tego odbioru: nie wykonano rzeczywistego E2E w przeglądarce, testów PostgreSQL ani oceny zoomu mobilnego, kontrastu i czytnika ekranu. Dostępnościowy test klawiatury w jsdom przeszedł. Generowanie OpenAPI nadal zgłasza istniejące ostrzeżenia serializerów users/content i kolizję `operationId`; nie zostały usunięte w tym zakresie.

## Konfiguracja

### .env zmienne

```env
SECRET_KEY=django-insecure-...
DEBUG=True
ALLOWED_HOSTS=*

POSTGRES_DB=soma_learn
POSTGRES_USER=soma
POSTGRES_PASSWORD=soma123
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

SUPERUSER_EMAIL=admin@soma-learn.local
SUPERUSER_PASSWORD=admin123
SUPERUSER_FIRST_NAME=Admin
SUPERUSER_LAST_NAME=Soma

EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=localhost
EMAIL_PORT=1027
EMAIL_USE_TLS=False
```

### E-mail (SMTP)

Kody logowania i e-maile potwierdzające wysyłane są przez SMTP.

- Lokalnie: Mailpit z `docker-compose.yml` w katalogu głównym (projekt `soma-learn-local-dev`); SMTP na `localhost:1027` dla backendu na hoście, `mailpit:1025` dla backendu w Dockerze, UI na `http://localhost:8027`. Starszy kontener na 1026/8026 pozostaje niezależny.
- Bez `EMAIL_BACKEND` przy `DEBUG=True` Django wypisuje wiadomości w konsoli.

### Baza danych

- **Domyślny silnik**: PostgreSQL 12+
- **Migracje**: Django migrations (automatyczne)
- **Superuser**: tworzony automatycznie po migracjach z danych `.env`
- **Lokalny tryb bez PostgreSQL**: ustaw `USE_SQLITE=True` w `backend/.env`; baza zostanie zapisana w `backend/db.sqlite3` (plik jest ignorowany przez Git).
- **PostgreSQL**: można podać `DATABASE_URL` albo zestaw `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_HOST` i `POSTGRES_PORT`. `DATABASE_URL` ma pierwszeństwo; znaki specjalne w loginie i haśle muszą być zakodowane w URL.

## Uruchamianie

### Lokalny Docker

Z katalogu głównego: `docker compose up --build --wait`. Frontend działa na http://localhost:5174, backend/admin na http://localhost:8001/admin/, poczta na http://localhost:8027. Nowy PostgreSQL 18 nie ma portu na hoście; migracje tworzą cache i administratora przez istniejący `post_migrate`. Dane SQLite i starsze wolumeny nie są importowane ani usuwane.

Backend używa `DEBUG=true` i `runserver`; kod jest podmontowany, więc zmiany uruchamiają przeładowanie. Compose jawnie ustawia PostgreSQL (`USE_SQLITE=false`, pusty `DATABASE_URL`, host `db`), SMTP i adres frontendu, niezależnie od dotychczasowych ustawień lokalnych.

Pełna instrukcja, dane lokalnego administratora, opcjonalne `DOCKER_*`, testy i ograniczenia: [README projektu](../README.md#lokalny-docker). `docker compose down` zachowuje bazę; `down -v` usuwa ją nieodwracalnie. Google nie jest skonfigurowane. To nie jest konfiguracja produkcyjna.

### Bez kontenerów aplikacji

```bash
cd backend

# Zainstaluj zależności
pip install -r requirements.txt

# Wykonaj migracje
python manage.py migrate

# Uruchom serwer
python manage.py runserver

# Mailpit (SMTP dev) z katalogu głównego repo
docker compose up -d mailpit

# Admin: http://localhost:8000/admin/
```

## Dokumentacja API
- `GET /api/schema/` — OpenAPI schema
- `GET /api/docs/` — Swagger UI
- `GET /api/redoc/` — ReDoc UI

## Weryfikacja zaufanej przeglądarki — 30.10.2026

Historyczne QA PASS, bez blockerów. Poniżej wyniki przekazane po implementacji względem bazowego HEAD `a4e233a` z roboczymi zmianami funkcji, nie ponowne uruchomienie testów w ramach aktualizacji dokumentacji. Ówczesne zachowanie cofania zaufania przy logout zastąpiła zmiana z 08.11.2026 opisana powyżej; wyniki poniżej pozostają zapisem historycznym.

- TDD autorów: backend — faza RED 29 testów, 26 niepowodzeń → 29 zielonych; pełny zestaw 236 OK, 1 pominięty. Frontend — 16 niepowodzeń i 50 zaliczonych → 66 zielonych; pełny zestaw 143 zaliczone, 1 pominięty; build OK.
- Niezależne QA backendu: pełny zestaw 236 OK, 1 pominięty; testy celowane 29 OK (`users.tests.test_trusted_browser_contract`); `check` — 0 problemów; `makemigrations` — brak zmian. Dodatkowe 6 testów uruchomionych przez stdin: wszystkie OK, bez utrwalania plików.
- Niezależne QA frontendu: pierwszy pełny przebieg 142 zaliczone, 1 niepowodzenie, 1 pominięty; istniejący flaky P3 w `frontend/tests/courses/guard-and-courses.test.jsx:87` („finish nie funkcja”) dotyczy fragmentu identycznego z bazowym HEAD; nie uruchamiano osobnego przebiegu na bazowym HEAD. Izolowany zestaw 14 OK, ponowiony pełny przebieg 143 zaliczone, 1 pominięty; testy celowane 21 OK, build OK. Flaky nie naprawiano w tym zakresie.
- Chrome, smoke z syntetycznym HTTP: checkbox przy 390×844 oraz ponawianie wylogowania przy szerokości 1280 px — bez poziomego overflow.
- Nie wykonano pełnego rzeczywistego E2E frontend + backend, testów tej funkcji na PostgreSQL, prawdziwego Google OAuth, testu na fizycznym telefonie ani z czytnikiem ekranu/pełnego audytu WCAG. Wcześniejsze QA lokalnego Dockera nie zastępuje tych kontroli.

## Zaufanie po wylogowaniu i konflikt logowania — QA PASS 08.11.2026

Wyniki przekazane z odbioru; przy aktualizacji dokumentacji sprawdzono kod i testy kontraktowe, ale nie uruchamiano ponownie testów ani builda.

- Główne środowisko backendu: `users` — **103 OK**; ostatni przebieg kontraktu `users.tests.test_trusted_browser_contract` — **29 OK**.
- Frontend: testy celowane — **92 PASS**; pełny zestaw — **396 PASS, 1 skipped**; build **PASS** z nieblokującym ostrzeżeniem chunk **501.42 kB**; diff-check **PASS**.
- Niezależne QA: **bez blockerów**. Własne uruchomienie testów backendu przez agenta QA było zablokowane przez wersję allauth w jego środowisku; nie jest to błąd głównego przebiegu backendu, który wykonano poprawnie w głównym środowisku.
- Nie wykonano testu w realnym Chrome z natywnym autofill. Aplikacja inicjalizuje puste pola i nie utrwala emaila/hasła, ale nie usuwa poświadczeń zapisanych przez przeglądarkę i nie gwarantuje pustych pól przy aktywnym autofill. Google poza zakresem.
- Potwierdzony kontrakt: poprawny OTP z `remember_browser=true` wydaje zaufanie; logout z aktywną lub wygasłą sesją zachowuje cookie i rekord bez rotacji i odnowienia TTL. Nadal wymagane jest poprawne hasło, a zmiana hasła lub wygaśnięcie ponownie wymuszają OTP. Przy `409` frontend sprawdza sesję i potwierdza logout przed jednokrotnym ponowieniem wpisanych danych; niepotwierdzony logout zatrzymuje ponowienie i nie wymienia starej sesji na token.
- Ryzyka pozostają: token DRF nie jest unieważniany po logout; skopiowane ważne cookie może pomijać OTP do końca TTL, lecz nadal wymaga poprawnego hasła. Nie jest to pełny audyt bezpieczeństwa.

## Następne kroki

- Zaproszenia imienne uczniów przez mentora (planowane; obecnie działa dołączenie przez link z tokenem)
- Osobny zakres bezpieczeństwa: unieważnianie tokenów DRF po wylogowaniu/resecie hasła; automatyczny cleanup wygasłych zaufanych przeglądarek pozostaje niezaimplementowany.
