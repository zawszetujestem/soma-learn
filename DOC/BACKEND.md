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

Logowanie ma dwa etapy: email + hasło, a następnie 6-cyfrowy kod wysłany na email. Endpointy `/_allauth/browser/v1/` obsługuje allauth (klient `browser`).

1. `POST /_allauth/browser/v1/auth/login` z body `{"email": "...", "password": "..."}`. Poprawne dane zwracają `401` z oczekującym flow `login_by_code` i wysyłają kod. Konto z niepotwierdzonym emailem ma oczekujący flow `verify_email`.
2. `POST /_allauth/browser/v1/auth/code/confirm` z body `{"code": "123456"}`. Po sukcesie `meta.is_authenticated` ma wartość `true`.
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

#### Zablokowane endpointy Headless

`config/urls.py` zwraca `404` dla poniższych ścieżek pod `/_allauth/browser/v1/`. Zmiana i reset hasła, zmiana e-maila oraz telefon nie są dostępne przez Headless:
- `auth/password/request`, `auth/password/reset`, `auth/reauthenticate`
- `account/password/change`, `account/email`, `account/phone`
- `auth/phone/verify`, `auth/phone/verify/resend`

Reset hasła idzie przez `POST /api/auth/password-reset/` i `POST /api/auth/password-reset-confirm/`. Aplikacja nie udostępnia endpointu zmiany hasła ani e-maila dla zalogowanego użytkownika.

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
EMAIL_PORT=1026
EMAIL_USE_TLS=False
```

### E-mail (SMTP)

Kody logowania i e-maile potwierdzające wysyłane są przez SMTP.

- Lokalnie: Mailpit z `docker-compose.yml` w katalogu głównym; SMTP na `localhost:1026` (port 1025 kontenera), UI na `http://localhost:8026`.
- Bez `EMAIL_BACKEND` przy `DEBUG=True` Django wypisuje wiadomości w konsoli.

### Baza danych

- **Domyślny silnik**: PostgreSQL 12+
- **Migracje**: Django migrations (automatyczne)
- **Superuser**: tworzony automatycznie po migracjach z danych `.env`
- **Lokalny tryb bez PostgreSQL**: ustaw `USE_SQLITE=True` w `backend/.env`; baza zostanie zapisana w `backend/db.sqlite3` (plik jest ignorowany przez Git).
- **PostgreSQL**: można podać `DATABASE_URL` albo zestaw `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_HOST` i `POSTGRES_PORT`. `DATABASE_URL` ma pierwszeństwo; znaki specjalne w loginie i haśle muszą być zakodowane w URL.

## Uruchamianie

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

## Następne kroki

- Modele kursów i instancji kursu
- Endpointy do zarządzania kursami
- SOMA Cycle modele i API
- Testy dla endpointów auth
