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

Zakres zrealizowany: modele, reguły, API i Django admin w `backend/learning/`.

Dostęp do zarządzania kursami mają role `mentor` i `admin` (`IsCourseManager`). Pozostałe endpointy wymagają zalogowania.

### Modele

**Course** — kurs.
- `owner` — właściciel (FK do użytkownika, `PROTECT`),
- `title` (max 200), `description`,
- `visibility` — `public` | `private`; nie można zmienić po utworzeniu,
- `approval_status` — `pending` | `approved` | `rejected`,
- `is_active` — domyślnie `true`,
- `invite_token` — unikalny, generowany dla kursów prywatnych, `null` dla publicznych.

**CourseTask** — zadanie-szablon kursu: `title` (max 255), `hours` (`DecimalField(6, 2)`, > 0), `position`.

**Instance** — kurs ucznia: `course`, `student`, `mentor` (właściciel kursu; `null`, gdy dołącza właściciel do własnego kursu), `status` (`active` | `closed`), `closed_at`, `created_at`. Constraint `one_active_instance_per_student` wymusza jedną aktywną instancję na ucznia.

**InstancePeriod** — okres aktywności: `started_at`, `ended_at` (`null` = trwa). Nowy okres powstaje przy dołączeniu i każdym wznowieniu; zamknięcie kończy otwarty okres.

**InstanceTask** — kopia zadania w instancji: `title`, `hours`, `status` (`todo` | `in_progress` | `done`), `position`. Późniejsze zmiany zadań kursu nie wpływają na istniejące instancje.

### Reguły

**Zatwierdzanie kursów**
- `pending → approved` i `pending → rejected` — administrator w Django admin (`/admin/`).
- `approved → rejected` jest zablokowane (walidacja w admin i w `save()`); każda zmiana zatwierdzonego kursu publicznego wraca do `pending` (patrz Edycja).
- `rejected → pending` — właściciel przez `POST .../resubmit/`.
- Mentor tworzy kurs `public` jako `pending`, a `private` jako `approved` z tokenem.
- Administrator tworzy wyłącznie kursy `public` (zatwierdzone od razu); `private` → 403. Dla konta z rolami mentor i admin obowiązuje reguła administratora.

**Edycja**
- Każda zmiana zatwierdzonego kursu publicznego wymaga ponownego zatwierdzenia i przenosi go do `pending`: zmiana `title` lub `description` (także w Django admin), dodanie, edycja lub usunięcie zadania (`/tasks/`). Instancje uczniów nie są zmieniane.
- Zmiana `is_active` nie zmienia statusu zatwierdzenia.
- Edycja kursu `rejected` nie zmienia statusu.

**Tokeny linków**
- Token: `secrets.token_urlsafe(32)`. Regeneracja unieważnia poprzedni token (nieznany token → 404). Dotyczy tylko kursów prywatnych (dla publicznych → 409). Istniejące instancje nie są zmieniane.

**Dołączanie** (`join` i `join/{token}`)
- Dołączyć może użytkownik z rolą `student` lub właściciel kursu. Inny użytkownik bez roli `student` → 403, o ile kurs jest widoczny; w przeciwnym razie 404.
- Kurs musi być aktywny (`course_inactive`, także gdy uczeń ma już instancję tego kursu), `approved` (dla innych użytkowników `pending`/`rejected` → 404; właściciel dostaje 409 `course_not_approved`) i, dla kursu prywatnego, dostępny przez token.
- Ponowne dołączenie do aktywnego kursu z aktywną instancją zwraca 200 z tą samą instancją.
- Limit jednej aktywnej instancji na ucznia: `slot_taken`. Zamknięta instancja nie blokuje nowej.
- Przy dołączeniu zadania kursu są kopiowane do instancji ze statusem `todo`.

**Zmiana statusu zadania** (`PATCH .../tasks/{id}/`)
- Mentor instancji — tak. Uczeń instancji bez mentora — tak. Uczeń instancji z mentorem — 403.
- Zamknięta instancja → 409 `instance_closed`.
- Pole `progress` jest tylko do odczytu.

**Postęp**
- Procent godzin zadań `done` względem sumy godzin wszystkich zadań; `Decimal`, zaokrąglenie do 1 miejsca (ROUND_HALF_UP), zwracany jako liczba. Brak zadań → `0.0`.

**Zamykanie i wznowienie**
- Zamknięcie: mentor instancji lub uczeń instancji bez mentora. Ustawia `status=closed` i `closed_at`, kończy otwarte okresy. Zamknięta → 409 `already_closed`. Działa także dla nieaktywnego kursu.
- Wznowienie: te same reguły dostępu co przy zamknięciu. Zeruje `closed_at` i dodaje nowy `InstancePeriod`. Wymaga: instancji zamkniętej (`already_active`), zatwierdzonego kursu (`course_not_approved`), aktywnego kursu (`course_inactive`) oraz braku innej aktywnej instancji ucznia (`slot_taken`).
- System nie zapisuje, kto zamknął instancję; wznowienie podlega tym samym regułom dostępu.

**Licznik uczniów**
- `GET /api/courses/mine/{id}/students-count/` zlicza instancje `active` z `mentor` = bieżący użytkownik. Zamknięte i instancje bez mentora się nie liczą.

### Endpointy

Prefiks: `/api/`. Uwierzytelnianie: `Authorization: Token <token>` lub sesja.

| Metoda | Ścieżka | Kto | Opis |
|---|---|---|---|
| GET | `/courses/` | zalogowany | Lista kursów publicznych, zatwierdzonych i aktywnych |
| POST | `/courses/` | mentor, admin | Tworzy kurs (`title`, `description`, `visibility`) |
| GET | `/courses/mine/` | mentor, admin | Własne kursy, wszystkie statusy |
| GET | `/courses/mine/{id}/` | właściciel | Szczegóły; dla prywatnego zawiera `invite_token` |
| GET | `/courses/mine/{id}/students-count/` | właściciel | Liczba aktywnych uczniów z mentorem |
| GET | `/courses/{id}/` | zalogowany (widoczny) | Szczegóły kursu |
| PATCH | `/courses/{id}/` | właściciel | `title`, `description`, `is_active` |
| POST | `/courses/{id}/resubmit/` | właściciel | `rejected → pending` |
| POST | `/courses/{id}/regenerate-token/` | właściciel | Nowy `invite_token` (tylko prywatne) |
| POST | `/courses/{id}/join/` | student, właściciel | Dołączenie (tworzy lub zwraca instancję) |
| POST | `/courses/join/{token}/` | student, właściciel | Dołączenie przez link z tokenem |
| POST | `/courses/{id}/tasks/` | właściciel | Dodaje zadanie kursu (`title`, `hours`, `position`) |
| PATCH | `/courses/{id}/tasks/{task_id}/` | właściciel | Edycja zadania kursu |
| DELETE | `/courses/{id}/tasks/{task_id}/` | właściciel | Usunięcie zadania kursu |
| GET | `/instances/` | zalogowany | Instancje, w których jest uczniem lub mentorem |
| GET | `/instances/{id}/` | uczeń lub mentor instancji | Szczegóły z `progress` i `tasks` |
| PATCH | `/instances/{id}/tasks/{task_id}/` | zgodnie z regułami | Body: `{"status": "todo" \| "in_progress" \| "done"}` |
| POST | `/instances/{id}/close/` | zgodnie z regułami | Zamknięcie |
| POST | `/instances/{id}/resume/` | zgodnie z regułami | Wznowienie |

Metody spoza tabeli (np. `PATCH /instances/{id}/`) zwracają 405.

### Błędy

- **Format domenowy:** `{"code": "...", "detail": "..."}`.
- **Format DRF:** błędy walidacji (400) i część błędów uprawnień/404 mają `{"detail": "..."}` lub `{"pole": ["..."]}` bez pola `code`.
- **400** — walidacja (pusty lub za długi `title`, `visibility` spoza listy, `hours` ≤ 0 lub z więcej niż 2 miejscami, `status` spoza listy, próba zmiany `visibility`).
- **401** — brak lub nieprawidłowy token.
- **403** — zasób widoczny, ale akcja zabroniona (`code: forbidden`) lub brak roli mentor/admin (sam `detail`).
- **404** — zasób niewidoczny lub nieistniejący, w tym nieznany lub unieważniony token (`code: not_found` lub `detail`).
- **409** — reguła biznesowa:

| Kod | Znaczenie |
|---|---|
| `course_not_approved` | Kurs nie został zatwierdzony |
| `course_not_rejected` | Ponowne zgłoszenie tylko dla kursu odrzuconego |
| `course_not_private` | Regeneracja tokenu tylko dla kursu prywatnego |
| `course_inactive` | Kurs jest nieaktywny |
| `slot_taken` | Uczeń ma już aktywną instancję innego kursu |
| `already_closed` | Instancja jest już zamknięta |
| `already_active` | Instancja jest już aktywna |
| `instance_closed` | Zamknięta instancja jest tylko do odczytu |

### Trasy frontendu

Wszystkie trasy poniżej wymagają zalogowania (`RequireAuth`); `/kursy/moje*` dodatkowo roli mentor/admin (`RequireManager`).

| Trasa | Widok |
|---|---|
| `/kursy` | Lista kursów |
| `/kursy/{id}` | Szczegóły kursu i przycisk dołączenia |
| `/kursy/dolacz/{token}` | Dołączenie przez link (przekierowuje do instancji) |
| `/kursy/instancje/{id}` | Instancja: postęp, zadania, zamknięcie/wznowienie |
| `/kursy/moje` | Kursy mentora |
| `/kursy/moje/nowy` | Formularz nowego kursu |
| `/kursy/moje/{id}` | Zarządzanie kursem: uczniowie, link, dezaktywacja, licznik |

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
