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
- Nie zmieniono czasu sesji Django (domyślnie 14 dni) ani cyklu życia tokenów DRF. Zaufanie nie utrzymuje sesji; może być wykorzystane przy kolejnym logowaniu po utracie/wygaśnięciu sesji, o ile nie wykonano wylogowania i nadal trwa TTL. Samo cookie nie pozwala wymienić tokenu bez uwierzytelnionej sesji.
- Google i formularz `/admin/` pozostają bez zmian; formularz Django admin już wcześniej nie wymagał OTP. Nie jest to wdrożenie pełnego MFA ani pełny audyt bezpieczeństwa.

#### Wylogowanie (allauth Headless)

`DELETE /_allauth/browser/v1/auth/session` kończy sesję i usuwa cookie `soma_trusted_browser` oraz odpowiadający mu rekord serwerowy, także gdy sesja już wygasła. Replay cofniętego cookie nie pomija OTP; inne profile zachowują zaufanie. Żądania przeglądarkowe nadal wymagają CSRF.

Frontend uznaje wylogowanie za potwierdzone przy `200` lub `401` z `meta.is_authenticated: false`. Lokalny token DRF z `sessionStorage` usuwa także przy błędzie, ale wtedy ostrzega, że serwer mógł nie zakończyć sesji/cofnąć zaufania, i udostępnia „Ponów wylogowanie”. Samo usunięcie tokenu z karty nie potwierdza unieważnienia po stronie serwera.

**Istniejące ryzyko:** wydany token DRF pozostaje ważny po wylogowaniu i resecie hasła. Ta funkcja go nie unieważnia; cofnięcie zaufania przeglądarki nie rozwiązuje tego problemu.

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
- `CourseTask` i plan godzinowy pozostają niezależne od wersjonowanej treści. Zadania planu są nadal kopiowane do instancji przy dołączeniu; ich zmiany nie zmieniają treści przypiętej do istniejącej instancji.
- `Course.approval_status`, `Course.title` i `Course.description` pozostają w bazie jako pola archiwalne/backward compatibility. Nie są źródłem bieżącego lifecycle ani treści publikacji; właściwym stanem jest wersja, a aktualny tytuł i opis pochodzą z niej.

### Lifecycle, moderacja i role

Nowa wersja kursu powstaje jako szkic (`draft`). Edytować można `draft` i `rejected`; każda udana zmiana treści zwiększa `revision`. Publikacja następuje jawnie przez operację lifecycle, a nie przy tworzeniu kursu. Edycja wersji nie wywołuje automatycznej reweryfikacji ani nie zmienia stanu opublikowanej wersji. Opublikowaną treść można skopiować jako nowy szkic kolejnego numeru.

| Operacja | Dozwolony wykonawca i warunek | Wynik |
|---|---|---|
| `submit` | Właściciel będący mentorem; kurs publiczny; stan `draft` lub `rejected` | `submitted`; pełna walidacja publikacji |
| `withdraw` | Właściciel mentora/admin; wersja `submitted` | `draft` |
| `publish` | Właściciel mentora/admin dla kursu prywatnego; administrator-właściciel kursu publicznego; stan `draft` lub `rejected` | `published`, wskazanie jako bieżącej publikacji |
| `accept` | Administrator inny niż właściciel; zgłoszona wersja kursu publicznego | `published` po walidacji |
| `reject` | Administrator; wersja `submitted` | `rejected`, z opcjonalnym uzasadnieniem |

Mentor nie może samodzielnie opublikować kursu publicznego: zgłasza go do moderacji. Administrator przegląda kolejkę przez `GET /api/course-moderation/`, a akceptację/odrzucenie wykonuje przez API albo akcje Django admin na wersjach. Admin udostępnia bezpośredni link do podglądu SPA; nie edytuje treści kursu przez formularz admina. Administrator tworzy wyłącznie kursy publiczne; konto łączące role mentora i administratora podlega regułom administratora. Kurs prywatny może opublikować jego właściciel.

### Spójność edycji: ETag i `If-Match`

Odpowiedzi dotyczące wersji zawierają nagłówek `ETag` (wartość nieprzezroczysta dla klienta, aktualnie w formie `"v{id}-r{revision}"`). Każda mutacja istniejącej wersji (metadane, hierarchia, materiały i upload) oraz każda operacja lifecycle wymaga przesłania aktualnej wartości w `If-Match`. Tworzenie nowego szkicu i operacje na archiwum nieużywanych plików nie zmieniają rewizji i nie wymagają tego nagłówka. Brak nagłówka zwraca `400 revision_required`; nieaktualny ETag — `409 stale_revision`. Klient powinien zachować ETag z odpowiedzi i nie odtwarzać go samodzielnie.

### Materiały, pliki i uprawnienia

- Dozwolone pliki: PDF do **20 MB** (`20 000 000` bajtów), JPG/PNG/WebP do **5 MB** (`5 000 000` bajtów), maksymalnie **20 załączników na lekcję** i **1 GB na kurs** (`1 000 000 000` bajtów). MB/GB są dziesiętne. Limit kursu dotyczy przechowywanych plików, także nieużywanych aktualnie przez materiał.
- Backend waliduje sygnaturę i rzeczywistą zawartość pliku; PDF-y są parsowane, a obrazy dekodowane. To nie jest skan antywirusowy ani gwarancja bezpieczeństwa pliku.
- `CourseAsset` jest w prywatnym storage (`PRIVATE_MEDIA_ROOT`; bez tej zmiennej lokalizacja domyślna to `backend/private_media`); publiczny URL ani ścieżka do pliku nie są zwracane w JSON. Pobieranie odbywa się wyłącznie przez uwierzytelniony endpoint API, po sprawdzeniu powiązania pliku z daną wersją i uprawnień użytkownika. Nie wystawiać tego katalogu jako statycznych mediów.
- Właściciel kursu/admin może zarządzać treścią. Podgląd ucznia zwraca projekcję bez kluczy odpowiedzi i bez flag `is_correct`. Właściciel widzi pełną treść oraz klucze. Uczeń lub mentor przypisanej instancji pobiera treść wersji przypiętej do instancji; klucze są dostępne wyłącznie w widoku właściciela/administratora.
- `python manage.py cleanup_course_assets` ponawia niedokończone usuwanie i usuwa osierocone, nieśledzone pliki starsze niż 24 godziny (próg można zmienić przez `--older-than-hours`). Zalecane okresowe uruchamianie; polecenie nie zastępuje backupu.

### Migracja istniejących danych

Migracje `0002_course_versions_schema`–`0004_require_instance_version` dodają model wersji i treści, wykonują backfill oraz sprawdzają kompletność i zgodność przypięcia instancji. `0003_backfill_course_versions` tworzy dla dotychczasowych kursów wersję 1 i przypina do niej istniejące instancje. Mapowanie: `approved → published`, `pending → submitted`, `rejected → rejected`; tytuł i opis są kopiowane z legacy pól kursu. Migracja nie odtwarza dla istniejących danych hierarchii, materiałów ani testów.

Przed migracją wykonaj i sprawdź backup bazy. Odwrócenie schematu po nowych zapisach nie jest bezpiecznym rollbackiem: dane wersji mogą zostać utracone. W razie potrzeby powrotu do poprzedniego stanu odtwórz backup wykonany przed migracją.

### REST API: wersjonowana treść

Prefiks `/api/`; uwierzytelnianie przez `Authorization: Token <token>` lub sesję. Trasy treści wymagają zalogowania, a odczyt/edycja wersji i zasobów kursu — uprawnień właściciela-mentora lub administratora. `course-moderation` jest dostępne administratorowi. Odpowiedzi wersji zawierają `ETag`.

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
| GET | `/instances/{id}/content/` | Treść wersji przypiętej do instancji; bez kluczy dla ucznia i mentora |

Podstawowe endpointy kursów, zadań planu i instancji pozostają dostępne pod `/api/courses/` i `/api/instances/` (tworzenie i lista kursów, dołączanie, zadania `CourseTask`, plan godzinowy, status i cykl życia instancji). Są niezależne od numeru wersji; przy dołączeniu instancja zostaje przypięta do aktualnie opublikowanej wersji. Zmiana publikacji nie przepisuje treści już przypiętych instancji. Legacy `POST /api/courses/{id}/resubmit/` pozostaje zgodnościowym endpointem operującym na odrzuconej wersji; nowy klient powinien używać wersjonowanego `.../submit/`.

### Błędy API

W rodzinach endpointów kursów, instancji, słowników i moderacji odpowiedzi błędów mają format `{"message": "...", "code": "...", ...}`. Inne pola — np. `issues`, `dependencies` lub szczegóły walidacji — mogą wystąpić dodatkowo. Kody statusów: `400 validation_error`, `401 not_authenticated`, `403 forbidden` (lub `csrf_failed`), `404 not_found`, `405 method_not_allowed`, `409 conflict`, `413 request_too_large`, `415 unsupported_media_type`, `429 throttled`, `500 internal_error`, `503 service_unavailable`. Błędy walidacji plików i treści zachowują kod domenowy, np. `revision_required` (400), `invalid_file`, `file_too_large` (413), `invalid_material`, `invalid_prerequisite`, `version_incomplete`, `classification_invalid`, `attachment_limit_exceeded`; konflikty (409) obejmują m.in. `stale_revision`, `invalid_version_state`, `working_version_exists`, `asset_in_use`, `course_not_approved`, `course_inactive`, `slot_taken`, `instance_closed`.

### Trasy frontendu

Trasy kursów wymagają logowania; zarządzanie i edycja wymagają roli mentor/admin.

| Trasa | Widok |
|---|---|
| `/kursy` | Katalog tylko opublikowanych, aktywnych kursów publicznych; pokazuje program (drzewo działów/tematów/lekcji), bez materiałów i testów; mentor/admin ma przycisk „Utwórz nowy” i wejście do „Moich kursów” |
| `/kursy/{id}` | Szczegóły widocznego kursu i dołączanie |
| `/kursy/dolacz/{token}` | Dołączenie do kursu prywatnego przez link |
| `/kursy/instancje/{id}` | Instancja ucznia, postęp, zadania i treść przypiętej wersji |
| `/kursy/moje` | Lista kursów mentora/admina |
| `/kursy/moje/nowy` | Utworzenie tożsamości kursu i wersji 1 w stanie roboczym |
| `/kursy/moje/{id}` | Zarządzanie kursem, planem godzinowym, wersjami i tokenem |
| `/kursy/moje/{id}/wersje/{versionId}/edytuj` | Edytor wersji kursu |
| `/kursy/podglad/{id}/wersje/{versionId}` | Podgląd SPA; przełącznik pełnego widoku i „Oczami ucznia”; moderator może stąd podjąć decyzję |
| `/course-moderation/` | Kolejka moderacji administratora |

### Kursy v1 — ograniczenia i weryfikacja (30.10.2026)

Weryfikacja funkcji: backend SQLite **316 OK / 8 skip**, PostgreSQL **316/316 OK**, `makemigrations --check` bez zmian, `manage.py check` — **0 issues**; frontend **230 passed / 1 skip**, build OK, smoke API OK; niezależne QA — **POZYTYWNY**. Niestabilny test frontendu `join-by-token` (wyścig mocka POST) ustabilizowano synchronizacją w teście; 30/30 przebiegów OK. QA nie zweryfikowało ręcznie responsywności J6 w pełnej przeglądarce.

Ograniczenia: v1 nie obsługuje rozwiązywania ani oceniania testów; wymagania wstępne nie są egzekwowane; walidacja plików nie jest skanowaniem antywirusowym. Responsywność J6 nie została zweryfikowana manualnie w pełnej przeglądarce przez QA.

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

QA PASS, bez blockerów. Poniżej wyniki przekazane po implementacji względem bazowego HEAD `a4e233a` z roboczymi zmianami funkcji, nie ponowne uruchomienie testów w ramach aktualizacji dokumentacji.

- TDD autorów: backend — faza RED 29 testów, 26 niepowodzeń → 29 zielonych; pełny zestaw 236 OK, 1 pominięty. Frontend — 16 niepowodzeń i 50 zaliczonych → 66 zielonych; pełny zestaw 143 zaliczone, 1 pominięty; build OK.
- Niezależne QA backendu: pełny zestaw 236 OK, 1 pominięty; testy celowane 29 OK (`users.tests.test_trusted_browser_contract`); `check` — 0 problemów; `makemigrations` — brak zmian. Dodatkowe 6 testów uruchomionych przez stdin: wszystkie OK, bez utrwalania plików.
- Niezależne QA frontendu: pierwszy pełny przebieg 142 zaliczone, 1 niepowodzenie, 1 pominięty; istniejący flaky P3 w `frontend/tests/courses/guard-and-courses.test.jsx:87` („finish nie funkcja”) dotyczy fragmentu identycznego z bazowym HEAD; nie uruchamiano osobnego przebiegu na bazowym HEAD. Izolowany zestaw 14 OK, ponowiony pełny przebieg 143 zaliczone, 1 pominięty; testy celowane 21 OK, build OK. Flaky nie naprawiano w tym zakresie.
- Chrome, smoke z syntetycznym HTTP: checkbox przy 390×844 oraz ponawianie wylogowania przy szerokości 1280 px — bez poziomego overflow.
- Nie wykonano pełnego rzeczywistego E2E frontend + backend, testów tej funkcji na PostgreSQL, prawdziwego Google OAuth, testu na fizycznym telefonie ani z czytnikiem ekranu/pełnego audytu WCAG. Wcześniejsze QA lokalnego Dockera nie zastępuje tych kontroli.

## Następne kroki

- Zaproszenia imienne uczniów przez mentora (planowane; obecnie działa dołączenie przez link z tokenem)
- SOMA Cycle modele i API
- Osobny zakres bezpieczeństwa: unieważnianie tokenów DRF po wylogowaniu/resecie hasła; automatyczny cleanup wygasłych zaufanych przeglądarek pozostaje niezaimplementowany.
