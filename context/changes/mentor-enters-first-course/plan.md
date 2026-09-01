# Plan implementacji: mentor loguje się i wchodzi do pierwszego gotowego kursu

## Przegląd

S-01 buduje pierwszą warstwę HTTP nad kontraktem F-01: mentor zakłada konto (lub loguje się e-mailem i hasłem) i wchodzi do jednego gotowego kursu. To pierwsze zintegrowanie konta, danych i prostego interfejsu — bez katalogu kursów, bez treści kursu i bez OAuth/2FA.

## Analiza stanu bieżącego

F-01 dostarczył tożsamość (`accounts.User`, logowanie e-mailem), model `Course` oraz usługi zaproszeń/relacji, ale nie ma żadnej powierzchni HTTP ani szablonów. Brak widoków logowania/rejestracji, `accounts/urls.py`, tras, szablonów, ustawień `LOGIN_URL`/`LOGIN_REDIRECT_URL` i seeda gotowego kursu.

### Kluczowe odkrycia:

- `USERNAME_FIELD="email"` (`apps/accounts/models.py:17`) — domyślny `ModelBackend` obsłuży logowanie e-mailem, ale `AuthenticationForm` wymaga pola `email` zamiast `username`.
- Wzorzec widoku/trasy/testu: `apps/core/urls.py:5-8`, `apps/core/views.py:4-5`, `apps/core/tests/test_views.py:5-10`.
- Brak `LOGIN_URL`/`LOGIN_REDIRECT_URL` — defaulty wskazują nieistniejące ścieżki (`soma_config/settings.py`).
- Brak katalogu szablonów; `TEMPLATES["DIRS"]=[]`, `APP_DIRS=True` (`soma_config/settings.py:75-88`).
- `Course` istnieje, ale nie ma seeda „gotowego kursu" (`apps/learning/models.py:5-10`).

## Pożądany stan końcowy

Konto loguje się e-mailem i hasłem; nowe konto domyślnie jest uczniem, a rolę mentora nadaje administrator (kontrakt F-01). Po zalogowaniu mentor trafia na listę zawierającą jeden gotowy kurs i może do niego wejść. Dostęp do kursu jest możliwy wyłącznie dla zalogowanego mentora. Szkielet aplikacji (`/healthz/`, admin) pozostaje uruchamialny.

## Czego NIE robimy

- Nie budujemy katalogu kursów — jeden przygotowany kurs.
- Nie implementujemy zaproszeń, akceptacji ani ekranów ucznia — to S-02.
- Nie dodajemy treści kursu, zadań, planningu ani tablicy cyklu — to S-03/S-04/S-05.
- Nie dodajemy OAuth, 2FA ani samodzielnego nadawania roli mentora.
- Nie implementujemy edytora kursów ani uploadu wideo.

## Podejście do implementacji

Logowanie i rejestrację opieramy na wbudowanych widokach Django (`LoginView`, `LogoutView`) z niestandardowym formularzem dostosowanym do `email` jako identyfikatora. Rejestracja korzysta z `UserManager.create_user`. Widoki kursu umieszczamy w aplikacji `learning` z bramką `is_mentor`; seed gotowego kursu realizujemy idempotentną migracją danych.

## Krytyczne szczegóły implementacji

`AuthenticationForm` wymaga pola identyfikatora — dla `USERNAME_FIELD="email"` formularz logowania musi nazywać pole `email` (dziedziczy `username`, ale nadpisuje etykietę/typ na `EmailField`), aby `LoginView` przekazał poprawny klucz do `authenticate`. Rejestracja nie może nadawać `is_mentor`; użytkownik samodzielnie tworzy wyłącznie konto z rolą ucznia. Seed kursu musi być idempotentny (get_or_create w `RunPython`), by ponowne uruchomienie migracji nie zdublowało kursu.

## Faza 1: Logowanie i rejestracja

### Przegląd

Dodać powierzchnię logowania e-mailem i hasłem oraz rejestrację konta bez nazwy użytkownika.

### Wymagane zmiany:

#### 1. Formularze

**Plik**: `apps/accounts/forms.py`

**Cel**: Niestandardowy formularz logowania z polem `email` oraz formularz rejestracji tworzący konto przez `UserManager.create_user`.

**Umowa**: `MentorLoginForm(AuthenticationForm)` z polem `email = forms.EmailField` (wewnętrznie `username`); `RegistrationForm` z `email`, `password1`, `password2`, `save()` woła `User.objects.create_user(email, password)` i nie ustawia żadnej roli poza domyślnym uczniem.

#### 2. Widoki i trasy kont

**Pliki**: `apps/accounts/views.py`, `apps/accounts/urls.py`

**Cel**: Podpiąć wbudowane `LoginView`/`LogoutView` z nowymi formularzami i szablonami.

**Umowa**: `app_name="accounts"`; ścieżki `login/`, `logout/`, `register/`; `LoginView.as_view(authentication_form=MentorLoginForm, template_name=...)`, `LogoutView` przez POST (Django 6).

#### 3. Rejestracja widoku

**Plik**: `apps/accounts/views.py`

**Cel**: Widok `register` tworzący konto i logujący użytkownika.

**Umowa**: GET renderuje formularz, POST waliduje, `save()`, `login(request, user)`, redirect na `LOGIN_REDIRECT_URL`.

#### 4. Szablony bazowe i kont

**Pliki**: `apps/accounts/templates/base.html`, `apps/accounts/templates/accounts/login.html`, `apps/accounts/templates/accounts/register.html`

**Cel**: Minimalny szkielet HTML z blokami oraz formularze logowania i rejestracji.

**Umowa**: `base.html` definiuje bloki `title` i `content`; formularze renderują `{{ form.as_p }}` + `{% csrf_token %}` i pokazują błędy.

#### 5. Ustawienia projektu

**Plik**: `soma_config/settings.py`

**Cel**: Wskazać trasy logowania i cele przekierowań oraz katalog szablonów projektu.

**Umowa**: `LOGIN_URL="accounts:login"`, `LOGIN_REDIRECT_URL="learning:course-list"`, `LOGOUT_REDIRECT_URL="accounts:login"`; `TEMPLATES["DIRS"]=[BASE_DIR / "apps" / "accounts" / "templates"]` (albo polegać na `APP_DIRS`).

#### 6. Routing projektu

**Plik**: `soma_config/urls.py`

**Cel**: Dołączyć trasy kont.

**Umowa**: `path("accounts/", include("apps.accounts.urls"))`.

### Kryteria sukcesu:

#### Weryfikacja automatyczna:

- `manage.py check` bez błędów.
- Testy logowania i rejestracji przechodzą.
- Ruff i mypy przechodzą.

#### Weryfikacja ręczna:

- W przeglądarce `/accounts/login/` loguje konto e-mailem i hasłem, `/accounts/logout/` wylogowuje, `/accounts/register/` tworzy konto i loguje.

---

## Faza 2: Wejście mentora do kursu

### Przegląd

Dodać chroniony widok listy kursów (jeden gotowy kurs) i wejście do kursu dostępne tylko dla zalogowanego mentora.

### Wymagane zmiany:

#### 1. Widoki kursu

**Plik**: `apps/learning/views.py`

**Cel**: Lista kursów mentora i widok wejścia do pojedynczego kursu.

**Umowa**: `CourseListView` z `LoginRequiredMixin` i sprawdzeniem `is_mentor` (403 dla ucznia); `CourseEntryView` renderuje minimalną stronę kursu.

#### 2. Trasy kursu

**Plik**: `apps/learning/urls.py`

**Cel**: Trasy `courses/` i `courses/<int:pk>/`.

**Umowa**: `app_name="learning"`; nazwy `course-list`, `course-entry`.

#### 3. Seed gotowego kursu

**Plik**: `apps/learning/migrations/0002_seed_ready_course.py`

**Cel**: Idempotentnie utworzyć jeden przygotowany kurs.

**Umowa**: `RunPython` z `Course.objects.get_or_create(title=..., defaults={...})`, `reverse` usuwający (no-op przy cofaniu).

#### 4. Szablony kursu

**Pliki**: `apps/learning/templates/learning/course_list.html`, `apps/learning/templates/learning/course_entry.html`

**Cel**: Lista z jednym kursem i minimalna strona kursu.

**Umowa**: Dziedziczą `base.html`; lista pokazuje `course.title` z linkiem do wejścia; entry pokazuje tytuł kursu.

#### 5. Routing projektu

**Plik**: `soma_config/urls.py`

**Cel**: Dołączyć trasy kursów.

**Umowa**: `path("", include("apps.learning.urls"))`.

### Kryteria sukcesu:

#### Weryfikacja automatyczna:

- Migracja seeda stosuje się i jest idempotentna (`migrate` dwukrotnie).
- Testy dostępu (uczeń 403, anonim → login) przechodzą.
- `manage.py check`, Ruff, mypy przechodzą.

#### Weryfikacja ręczna:

- Mentor po zalogowaniu widzi jeden kurs i wchodzi do niego; uczeń dostaje 403; anonim jest przekierowany do logowania.

---

## Faza 3: Testy i pełna walidacja

### Przegląd

Pokryć testami przepływ logowania/rejestracji/dostępu i zamknąć pełną pętlę jakości.

### Wymagane zmiany:

#### 1. Testy kont

**Pliki**: `apps/accounts/tests/test_forms.py`, `apps/accounts/tests/test_views.py`

**Cel**: Formularz logowania przyjmuje e-mail, rejestracja tworzy ucznia bez roli mentora, widoki zwracają 200/redirect.

**Umowa**: Używają `get_user_model()` i `reverse`; nie importują konkretnej klasy użytkownika przez warstwy domenowe.

#### 2. Testy kursu

**Plik**: `apps/learning/tests/test_views.py`

**Cel**: Lista i wejście dostępne dla mentora, 403 dla ucznia, redirect dla anonima.

**Umowa**: `TestCase` z `client.force_login`/`login`; mentor z `is_mentor=True`.

### Kryteria sukcesu:

#### Weryfikacja automatyczna:

- Pełny zestaw testów przechodzi.
- `manage.py check`, `makemigrations --check --dry-run`, Ruff, mypy przechodzą.

#### Weryfikacja ręczna:

- Pełny przepływ w przeglądarce: rejestracja → logowanie → lista kursów → wejście do kursu → wylogowanie.

---

## Strategia testowania

### Testy jednostkowe:

- `MentorLoginForm`: poprawny e-mail + hasło loguje; błędne hasło zwraca błąd.
- `RegistrationForm`: tworzy konto `is_student=True`, `is_mentor=False`, normalizuje e-mail.

### Testy integracyjne:

- Rejestracja → zalogowanie → redirect na `learning:course-list`.
- Mentor widzi kurs i wchodzi; uczeń 403; anonim → `accounts:login`.

### Kroki testowania ręcznego:

1. W przeglądarce: `/accounts/register/`, potem `/accounts/login/`.
2. W panelu admina nadać rolę mentora i ponownie zalogować się.
3. Wejść do kursu z listy i wylogować się.

## Uwagi dotyczące wydajności

Lista kursów to jedno zapytanie na `Course` — bez indeksów i optymalizacji poza małym MVP.

## Uwagi dotyczące migracji

Seed kursu to migracja danych z `get_or_create` (idempotentna). Nie tworzymy migracji danych ze starego modelu użytkownika — `AUTH_USER_MODEL` został ustawiony przed pierwszą migracją `accounts` (F-01).

## Referencje

- Research: `context/changes/mentor-enters-first-course/research.md`
- Tożsamość zmiany: `context/changes/mentor-enters-first-course/change.md`
- Roadmapa: `context/foundation/roadmap.md` — S-01
- Kontrakt produktu: `context/foundation/prd.md` — FR-001, FR-002, Access Control Changes, Non-Goals
- Kontrakt F-01: `context/changes/access-and-invitation-contract/plan.md`
- Reguły repozytorium: `AGENTS.md`
- Wzorzec widoku/trasy/testu: `apps/core/views.py`, `apps/core/urls.py`, `apps/core/tests/test_views.py`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Faza 1: Logowanie i rejestracja

#### Automated

- [x] 1.1 `manage.py check` przechodzi
- [x] 1.2 Testy logowania i rejestracji przechodzą
- [x] 1.3 Ruff i mypy przechodzą

#### Manual

- [x] 1.4 Logowanie i rejestracja działają w przeglądarce

### Faza 2: Wejście mentora do kursu

#### Automated

- [x] 2.1 Migracja seeda stosuje się idempotentnie
- [x] 2.2 Testy dostępu (uczeń 403, anonim redirect) przechodzą
- [x] 2.3 `manage.py check`, Ruff, mypy przechodzą

#### Manual

- [x] 2.4 Mentor wchodzi do kursu; uczeń 403; anonim → login

### Faza 3: Testy i pełna walidacja

#### Automated

- [x] 3.1 Pełny zestaw testów przechodzi
- [x] 3.2 `check`, `makemigrations --check`, Ruff, mypy przechodzą

#### Manual

- [x] 3.3 Pełny przepływ w przeglądarce przechodzi
