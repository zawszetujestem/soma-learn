# Plan implementacji: usunięcie konta zgodne z RODO

## Przegląd

S-06 dodaje samodzielne usunięcie konta przez użytkownika. Zamiast kasowania wiersza w bazie stosujemy soft-delete z anonimizacją: e-mail zostaje zastąpiony wartością `deleted-<uuid>@deleted.invalid`, hasło staje się bezużyteczne (`set_unusable_password`), a konto zostaje dezaktywowane. Rekord użytkownika pozostaje, dzięki czemu relacje zachowują metadane audytowe i nadal wskazują na poprawne `mentor_id`/`student_id`. Aktywne relacje są zamykane przy usunięciu konta, więc mentor natychmiast traci dostęp do danych ucznia zgodnie z guardrailami PRD.

## Analiza stanu bieżącego

F-01 dostarczył `accounts.User` (logowanie e-mailem, role), model `Course` oraz usługi cyklu życia relacji w `apps/learning/services.py`. Relacja (`Relationship`) ma FKs `mentor`/`student` z `on_delete=CASCADE`, więc fizyczne usunięcie użytkownika skasowałoby audyt — stąd soft-delete. `students_with_active_relationship` filtruje wyłącznie po aktywnym statusie relacji; po usunięciu konta musi dodatkowo nie ujawniać zdezaktywowanych użytkowników.

### Kluczowe odkrycia:

- `User.email` jest unikalny — anonimizacja musi generować unikalną wartość (`uuid4`).
- `deleted_at` na modelu użytkownika wymaga nowej migracji w `apps/accounts/migrations/`.
- Aktualizacja relacji przez `Q(mentor=user) | Q(student=user)` powoduje `sqlite3.InternalError` przy częściowym indeksie unikalnym; bezpieczniej rozdzielić na dwa zapytania per strona relacji.
- Backend nie może dotykać szablonów HTML — to zakres S-07; widok usunięcia zwraca wyłącznie redirect.

## Pożądany stan końcowy

Zalogowany użytkownik wywołuje `POST /accounts/delete/`. Usługa zamyka wszystkie aktywne relacje po obu stronach (mentor/uczeń), a model anonimizuje e-mail, usuwa hasło i dezaktywuje konto. Anonim nie może wywołać akcji (redirect do logowania). Usunięte konto nie może się zalogować (`is_active=False`), a jego e-mail jest dostępny do ponownej rejestracji. Zakończona relacja zachowuje `mentor_id`, `student_id`, `course_id`, `status`, `started_at`, `ended_at` bez zmian.

## Czego NIE robimy

- Nie budujemy interfejsu HTML, linków ani komunikatów — to S-07.
- Nie implementujemy harmonogramu twardego kasowania (purge) ani retencji poza anonimizacją w miejscu.
- Nie dotykamy zaproszeń, kursów, planningu ani zadań.
- Nie dodajemy potwierdzenia e-mail czy innych mechanizmów RODO poza soft-delete.

## Podejście do implementacji

Soft-delete umieszczamy jako metodę modelu `User.soft_delete()`, a zamknięcie relacji jako jawną funkcję usługową `end_relationships_for_user` w `apps/learning/services.py` (wzorzec funkcji usługowych z F-01). Widok `delete_account` orkiestruje oba kroki transakcyjnie i wylogowuje użytkownika. Selektor `students_with_active_relationship` otrzymuje dodatkowy filtr `is_active=True`, aby zdezaktywowany uczeń nigdy nie wracał do wyników mentora.

## Krytyczne szczegóły implementacji

Anonimizowany e-mail musi być unikalny i nieprzypominający pierwotnego adresu. `set_unusable_password()` zeruje hasło bez łamania pola `password` modelu. `soft_delete` jest idempotentny — drugie wywołanie po `deleted_at` nie zmienia już danych. Przy usuwaniu mentora/usunięciu konta nie usuwamy wiersza użytkownika, więc FKs relacji pozostają nienaruszone.

## Faza 1: Soft-delete modelu użytkownika

### Przegląd

Dodać pole `deleted_at` i metodę `soft_delete()` anonimizującą dane osobowe oraz dezaktywującą konto.

### Wymagane zmiany:

#### 1. Model użytkownika

**Plik**: `apps/accounts/models.py`

**Cel**: Pole `deleted_at` (migracja) i metoda `soft_delete()`.

**Umowa**: e-mail → `deleted-<uuid4.hex>@deleted.invalid`, `set_unusable_password()`, `is_active=False`, zerowanie ról (`is_student`, `is_mentor`, `is_staff`, `is_superuser`), `deleted_at=timezone.now()`; idempotentność przez wcześniejszy `return`.

#### 2. Migracja

**Plik**: `apps/accounts/migrations/0002_user_deleted_at.py`

**Cel**: Dodać `deleted_at` (DateTimeField null/blank).

**Umowa**: Generowana przez `makemigrations accounts`; zależność od `0001_initial`.

### Kryteria sukcesu:

#### Weryfikacja automatyczna:

- `manage.py check` przechodzi.
- `makemigrations --check --dry-run` nie zgłasza zmian.
- Testy modelu (anonimizacja, usunięcie hasła, zwolnienie e-maila) przechodzą.

#### Weryfikacja ręczna:

- W shellu Django `user.soft_delete()` anonimizuje konto, a `user.check_password(...)` zwraca `False`.

---

## Faza 2: Usługa zamykania relacji i selektor dostępu

### Przegląd

Zamknąć aktywne relacje dla usuwanego użytkownika (po obu stronach) i nie ujawniać zdezaktywowanych uczniów w selektorze mentora.

### Wymagane zmiany:

#### 1. Usługa zamykania relacji

**Plik**: `apps/learning/services.py`

**Cel**: `end_relationships_for_user(*, user)` zamykający aktywne relacje użytkownika jako mentora i jako ucznia.

**Umowa**: Dwa osobne `update(...)` zamiast `Q(...) | Q(...)` (unikamy błędu planera SQLite przy częściowym indeksie); zwraca liczbę zamkniętych relacji.

#### 2. Selektor dostępu

**Plik**: `apps/learning/services.py`

**Cel**: `students_with_active_relationship` filtruje także `is_active=True` po stronie ucznia.

**Umowa**: Dezaktywowany (usunięty) uczeń nie wraca do wyników mentora, nawet gdyby relacja pozostała aktywna.

### Kryteria sukcesu:

#### Weryfikacja automatyczna:

- Testy `apps.learning.tests.test_services`: audyt relacji przetrwa usunięcie konta.
- Testy `apps.learning.tests.test_access`: usunięty mentor traci dostęp; usunięty uczeń znika z listy.
- Ruff i mypy przechodzą.

#### Weryfikacja ręczna:

- Po usunięciu konta ucznia mentor nie widzi go na liście aktywnych uczniów.

---

## Faza 3: Widok i trasa usunięcia konta

### Przegląd

Widok POST chroniony logowaniem, który zamyka relacje, anonimizuje konto i wylogowuje użytkownika.

### Wymagane zmiany:

#### 1. Widok

**Plik**: `apps/accounts/views.py`

**Cel**: `delete_account` dostępny tylko dla zalogowanych (`login_required`) i tylko przez POST (`require_POST`).

**Umowa**: `cast(User, request.user)` → `end_relationships_for_user` → `user.soft_delete()` → `logout(request)` → redirect na `LOGOUT_REDIRECT_URL`.

#### 2. Trasa

**Plik**: `apps/accounts/urls.py`

**Cel**: `path("delete/", views.delete_account, name="delete")`.

**Umowa**: Nazwa `delete` w namespace `accounts`.

### Kryteria sukcesu:

#### Weryfikacja automatyczna:

- Test widoku: zalogowany usuwa konto; anonim dostaje redirect do logowania.
- Pełny zestaw testów `apps.accounts apps.learning` przechodzi.
- `manage.py check`, `makemigrations --check --dry-run`, Ruff, mypy przechodzą.

#### Weryfikacja ręczna:

- Po usunięciu konta zalogowanie tym samym e-mailem nie działa; ten sam e-mail można zarejestrować ponownie.

---

## Strategia testowania

### Testy jednostkowe:

- `User.soft_delete`: anonimizacja e-maila, usunięcie hasła, dezaktywacja, idempotentność.
- `end_relationships_for_user`: zamyka aktywne relacje mentora i ucznia.

### Testy integracyjne:

- Usunięcie konta ucznia zachowuje metadane audytowe zakończonej relacji.
- Usunięty mentor traci dostęp do danych ucznia; usunięty uczeń nie jest widoczny.
- Widok usunięcia: autoryzacja i efekt na koncie.

### Kroki testowania ręcznego:

1. Utworzyć mentora i ucznia, zaakceptować zaproszenie (aktywna relacja).
2. Wywołać usunięcie konta ucznia; sprawdzić relację (status `ended`, `ended_at`, zachowane FKs).
3. Spróbować zalogować się na usunięte konto — brak dostępu.

## Uwagi dotyczące wydajności

`end_relationships_for_user` wykonuje dwa zapytania `UPDATE` na indeksowanym statusie relacji — stały koszt niezależny od liczby relacji użytkownika w MVP.

## Uwagi dotyczące migracji

Migracja `0002_user_deleted_at` jest addytywna i nie wymaga migracji danych: `null=True`, `blank=True`. Soft-delete nie usuwa wierszy, więc FKs relacji i unikalność e-maila pozostają bezpieczne.

## Referencje

- Tożsamość zmiany: `context/changes/account-deletion-rodo/change.md`
- Roadmapa: `context/foundation/roadmap.md` — S-06
- Kontrakt produktu: `context/foundation/prd.md` — Access Control Changes, Success Criteria / Guardrails
- Kontrakt F-01: `context/changes/access-and-invitation-contract/plan.md`
- Reguły repozytorium: `AGENTS.md`
- Wzorzec usług: `apps/learning/services.py`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Faza 1: Soft-delete modelu użytkownika

#### Automated

- [x] 1.1 `manage.py check` przechodzi
- [x] 1.2 `makemigrations --check --dry-run` nie zgłasza zmian
- [x] 1.3 Testy modelu (anonimizacja, hasło, e-mail) przechodzą

#### Manual

- [x] 1.4 `soft_delete` anonimizuje konto w shellu

### Faza 2: Usługa zamykania relacji i selektor dostępu

#### Automated

- [x] 2.1 Audyt relacji przetrwa usunięcie konta
- [x] 2.2 Usunięty mentor traci dostęp; usunięty uczeń znika
- [x] 2.3 Ruff i mypy przechodzą

#### Manual

- [x] 2.4 Mentor nie widzi usuniętego ucznia

### Faza 3: Widok i trasa usunięcia konta

#### Automated

- [x] 3.1 Test widoku: zalogowany usuwa konto; anonim → login
- [x] 3.2 Pełny zestaw testów przechodzi
- [x] 3.3 `check`, `makemigrations --check`, Ruff, mypy przechodzą

#### Manual

- [x] 3.4 Logowanie usuniętym kontem nie działa; e-mail można zarejestrować ponownie
