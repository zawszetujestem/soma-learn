# Plan implementacji: poprawki UX/UI szablonów

## Przegląd

S-07 porządkuje wyłącznie warstwę prezentacji zbudowaną w S-01: dodaje spójną nawigację, sensowne komunikaty i stany puste. Zero zmian w Pythonie — nazwy tras i kontrakty widoków pozostają nietknięte, więc zmiana jest niezależna od S-06 (dodanie trasy `accounts:delete-account`).

## Analiza stanu bieżącego

- `apps/core/templates/base.html` definiuje tylko bloki `title` i `content`; brak nawigacji.
- `apps/accounts/templates/accounts/login.html` i `register.html` to surowe formularze (`{{ form.as_p }}`) bez linków krzyżowych i komunikatów.
- `apps/learning/templates/learning/course_list.html` pokazuje listę albo jednozdaniowy komunikat pusty; brak wylogowania w treści.
- `apps/learning/templates/learning/course_entry.html` ma tylko surowy link powrotu.
- Trasy dostępne dziś: `accounts:login`, `accounts:logout` (tylko POST), `accounts:register`, `learning:course-list`, `learning:course-entry`. Trasa `accounts:delete-account` powstanie dopiero w S-06.

## Pożądany stan końcowy

Każda strona ma widoczną ścieżkę do następnej akcji (logowanie ↔ rejestracja, kursy, wylogowanie, usunięcie konta), a puste/formularzowe miejsca komunikują użytkownikowi, co robić dalej.

## Czego NIE robimy

- Nie dotykamy żadnego pliku `.py` (widoki, trasy, modele, formularze, migracje, testy).
- Nie dodajemy CSS, frameworków ani JavaScriptu — czysty HTML.
- Nie implementujemy logiki usunięcia konta — tylko link do trasy S-06.

## Podejście

1. `base.html`: globalna nawigacja warunkowa — dla zalogowanego użytkownika „Kursy", opcjonalny „Usuń konto" (przez `{% url ... as %}` + `{% if %}`, aby przetrwać brak trasy do czasu S-06) i formularz wylogowania (POST, wymóg Django 6); dla anonima „Zaloguj się" i „Zarejestruj się".
2. `login.html`: komunikat warunkowy (błąd / zaproszenie), wskazówka gdy wymagane logowanie (`next`) oraz link do rejestracji.
3. `register.html`: krótki opis i link do logowania.
4. `course_list.html`: wprowadzenie przy liście, sensowny stan pusty z dalszym krokiem, wylogowanie.
5. `course_entry.html`: dopracowany link powrotu; nawigację globalną zapewnia `base.html`.

## Krytyczne szczegóły

- Wylogowanie w Django 6 przyjmuje wyłącznie POST — nawigacja i `course_list` używają formularza z `{% csrf_token %}`, nie samego `<a href>`.
- `{% url 'accounts:delete-account' as delete_account_url %}` przy brakującej trasie zwraca pusty string (nie rzuca `NoReverseMatch`), więc `{% if delete_account_url %}` bezpiecznie ukrywa link do czasu S-06.

## Fazy

### Faza 1: Nawigacja globalna i komunikaty kont

Pliki: `base.html`, `login.html`, `register.html`.

### Faza 2: Stany kursów i wylogowanie

Pliki: `course_list.html`, `course_entry.html`.

### Faza 3: Walidacja

- `manage.py check` — upewnia się, że szablony się wczytują.
- `manage.py test` — istniejący zestaw testów nadal przechodzi (renderuje `login`, `register`, `course_list`, `course_entry`).

## Weryfikacja ręczna

- `/accounts/login/` pokazuje link do rejestracji i komunikat bez błędów.
- `/accounts/register/` pokazuje link do logowania.
- Po zalogowaniu mentor widzi „Kursy" i „Wyloguj się"; lista kursów ma sensowny stan pusty.

## Referencje

- Roadmapa: `context/foundation/roadmap.md` — S-07
- Kontrakt produktu: `context/foundation/prd.md` — FR-001, FR-002, Quality Constraints
- Tożsamość zmiany: `context/changes/ux-polish/change.md`
- Wzorzec S-01: `context/changes/mentor-enters-first-course/plan.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done.

### Faza 1: Nawigacja globalna i komunikaty kont

- [x] 1.1 `base.html` z nawigacją warunkową
- [x] 1.2 `login.html` z linkiem do rejestracji i komunikatami
- [x] 1.3 `register.html` z linkiem do logowania

### Faza 2: Stany kursów i wylogowanie

- [x] 2.1 `course_list.html` ze stanem pustym i wylogowaniem
- [x] 2.2 `course_entry.html` z dopracowanym linkiem powrotu

### Faza 3: Walidacja

- [x] 3.1 `manage.py check` przechodzi
- [x] 3.2 `manage.py test` przechodzi