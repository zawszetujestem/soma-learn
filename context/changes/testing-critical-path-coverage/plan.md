# Plan implementacji: izolacja dostępu przez instancje kursu (per mentor–uczeń)

## Przegląd

Faza 1 rolloutu `context/foundation/test-plan.md` miała dostarczyć testy izolacji dostępu (ryzyka #1, #2). Research wykazał, że ryzyko #2 to nie brak testu, lecz brak pojęcia **instancji kursu** w modelu — dziś jeden globalny `Course` jest widoczny każdemu mentorowi. Produkt doprecyzował regułę: mentor wysyłając zaproszenie tworzy **instancję kursu dla pary mentor–uczeń**, instancja jest widoczna wyłącznie tej parze. Zmiana wprowadza model `CourseInstance`, przepina `Invitation` i `Relationship` na instancję oraz domyka gate widoczności — dopiero na tym fundamencie testy izolacji (#1, #2) mają sens.

## Analiza stanu obecnego

- `Course` to pojedyncza globalna encja (`apps/learning/models.py:5-10`) — `title` (unique) + `created_at`. Nie ma właściciela ani pojęcia „instancja".
- `Invitation` wskazuje `mentor` + `course` + `email` i przechowuje skrót tokenu (`apps/learning/models.py:13-37`).
- `Relationship` wskazuje `mentor` + `student` + `course` z unikalną aktywną relacją per trio (`apps/learning/models.py:40-63`).
- Selektor `students_with_active_relationship` filtruje po mentorze, kursie i statusie aktywnym (`apps/learning/services.py:125-134`).
- Widoki `CourseListView` i `CourseEntryView` używają `MentorRequiredMixin`, który sprawdza wyłącznie `is_mentor` — nie ma gate'u własności (`apps/learning/views.py:9-26`).
- Migracja `0002_seed_ready_course.py` seeduje jeden gotowy kurs przez `get_or_create`.

### Kluczowe odkrycia:

- `Relationship` i `Invitation` są jedynymi nośnikami powiązania mentor↔uczeń↔kurs; dodanie instancji wymaga przepięcia obu na nową encję.
- Reguła „instancja widoczna tylko parze" nie istnieje w żadnej warstwie — to luka domenowa, nie testowa.
- Student w momencie wysyłki zaproszenia jest znany jedynie po e-mailu (konto może jeszcze nie istnieć); instancja musi dać się utworzyć przed akceptacją.

## Pożądany stan końcowy

Istnieje `CourseInstance` wiązany z mentorem, kursem i (docelowo) uczniem. Wysłanie zaproszenia tworzy instancję dla pary; akceptacja przypina do niej ucznia i tworzy relację. Lista kursów mentora pokazuje wyłącznie jego instancje, a wejście do instancji jest możliwe tylko dla mentora lub ucznia tej instancji (403 dla obcych). Testy izolacji (#1/#2) są napisane przeciw nowemu modelowi, a `test-plan.md` §6 otrzymuje wzorzec „dodawanie testu integracyjnego izolacji".

## Czego NIE robimy

- Nie budujemy treści kursu, zadań, planningu ani tablicy cyklu (S-03/S-04/S-05).
- Nie dodajemy UI zarządzania instancjami poza widocznością (lista/wejście mentor jest już z S-01).
- Nie wprowadzamy samodzielnego nadawania roli mentora ani OAuth/2FA.
- Nie zmieniamy cyklu życia zaproszenia (TTL, ponowne wystawienie, skrót tokenu) poza przepięciem FK na instancję.
- Nie usuwamy istniejących ról `is_student`/`is_mentor` ani `User.soft_delete` z S-06.

## Podejście do implementacji

Wprowadzić `CourseInstance` jako nową encję domeny w `apps/learning` i potraktować ją jak „workspace pary" — jedyny byt, do którego odnoszą się zaproszenia i relacje. Usługi cyklu życia (`issue_invitation`, `reissue_invitation`, `accept_invitation`, `end_relationship`, `end_relationships_for_user`, `students_with_active_relationship`) operują na instancjach. Widoki otrzymują gate właścicielski oparty na członkostwie w instancji zamiast gołego `is_mentor`. Migracje przepinają FK addytywnie + wypełniają instancje z istniejących rekordów.

## Krytyczne szczegóły implementacji

- **Kolejność migracji modelu:** najpierw addytywne pola `CourseInstance` i FK na `Invitation`/`Relationship` (nullable), potem migracja danych wypełniająca instancje z istniejących zaproszeń/relacji, na końcu ewentualne odzyskanie pola `course` jako pochodne — dopóki kontenerowa baza nie ma danych produktowych, reset wolumenu nie jest wymagany (wszystko na testowej bazie SQLite/PostgreSQL).
- **Student przed akceptacją:** instancja powstaje przy `issue_invitation`, gdy uczeń może nie mieć konta. Pole ucznia w instancji jest `null=True` do momentu akceptacji; tożsamość przechowuje `student_email` (znormalizowany), ten sam, który już dziś żyje na `Invitation.email`.
- **Unikalność relacji aktywnej:** istniejące ograniczenie `unique_active_relationship` musi zostać przeniesione z tria (mentor, student, course) na instancję (mentor, student, instance) — inaczej dwie instancje tego samego kursu dla tej samej pary zderzyłyby się.
- **Gate własności, nie roli:** widoki przestają polegać na `is_mentor` jako jedynej bramce; mentor i uczeń instancji mają dostęp, obcy dostają 403.

## Faza 1: Model instancji kursu

### Przegląd

Dodać `CourseInstance`, przepiąć `Invitation` i `Relationship` na instancję, przenieść ograniczenie unikalności, dodać migrację wypełniającą instancje z istniejących danych.

### Wymagane zmiany:

#### 1. Model `CourseInstance`

**Plik**: `apps/learning/models.py`

**Cel**: Nowa encja domknięcia domeny: encyklopedia pary mentor↔uczeń↔kurs, do której odnoszą się zaproszenia i relacje.

**Kontrakt**: `CourseInstance` z polami `mentor` (FK `AUTH_USER_MODEL`, `related_name="course_instances"`), `course` (FK `Course`), `student` (FK nullable, `related_name="enrolled_instances"`), `student_email` (EmailField, znormalizowany, obecny przy wysyłce), `created_at` (auto_now_add). `Invitation.course` i `Relationship.course` zostają zastąpione przez `instance` (FK `CourseInstance`, nullable w migracji, docelowo wymagane w domenie); `Relationship` zachowuje `mentor`/`student` jako zdenormalizowane pola audytu. Ograniczenie `unique_active_relationship` zmienia pola na `(mentor, student, instance)`.

#### 2. Migracje

**Plik**: `apps/learning/migrations/0003_course_instance.py` (nowa)

**Cel**: Addytywnie dodać model i FK, przepiąć dane bez utraty.

**Kontrakt**: Do przodu: utworzyć `CourseInstance`; dla każdego istniejącego `Invitation` i `Relationship` utworzyć/współdzielić instancję per (mentor, course, student_email) i ustawić `instance_id`. Tył: `RunPython` cofający `instance_id` (rozpinający FK) bez kasowania instancji.

### Kryteria sukcesu:

#### Weryfikacja automatyczna:

- `manage.py makemigrations --check --dry-run` nie zgłasza różnic.
- Testy modelu instancji przechodzą (unikalność aktywnej relacji per instancja, przepięcie FK).
- `manage.py check`, Ruff, mypy przechodzą.

#### Weryfikacja ręczna:

- W shellu Django instancja powstaje per para, a relacja wskazuje instancję.

---

## Faza 2: Usługi cyklu życia na instancjach

### Przegląd

Przepisać usługi `apps/learning/services.py`, by operowały na `CourseInstance` i utrzymały izolację pary.

### Wymagane zmiany:

#### 1. `issue_invitation` / `reissue_invitation`

**Plik**: `apps/learning/services.py`

**Cel**: Wysłanie zaproszenia tworzy (lub przywraca) instancję pary mentor↔student_email↔kurs i przypina do niej nowe zaproszenie.

**Kontrakt**: `issue_invitation` wymaga roli mentora; normalizuje `email`; `get_or_create` instancji per (mentor, course, student_email); unieważnia dotychczasowe aktywne zaproszenia tej instancji; tworzy `Invitation` z `instance=...`. `reissue_invitation` jak dotychczas, ale na instancji.

#### 2. `accept_invitation`

**Plik**: `apps/learning/services.py`

**Cel**: Akceptacja przypina ucznia do instancji i tworzy aktywną relację; pre-check aktywnej relacji per instancja.

**Kontrakt**: wymaga roli ucznia; wywołanie na tokenie (`select_for_update` na `Invitation`); spójność `instance.student_email` ze znormalizowanym `student.email`; ustawia `instance.student = student`; pre-check istniejącej aktywnej relacji `(mentor, student, instance)` i podniesienie `InvitationNotUsableError`; tworzy `Relationship(instance=...)`.

#### 3. `end_relationship` / `end_relationships_for_user`

**Plik**: `apps/learning/services.py`

**Cel**: Zakończenie relacji działa na instancjach bez zmiany semantyki audytu.

**Kontrakt**: bez zmiany kontraktów publicznych poza operowaniem na `Relationship.instance`.

#### 4. `students_with_active_relationship`

**Plik**: `apps/learning/services.py`

**Cel**: Selektor zwraca wyłącznie uczniów z aktywną relacją do danej instancji mentora, bez wycieku między instancjami.

**Kontrakt**: filtruje po `instance__mentor=mentor`, `instance__course=course`, `status=ACTIVE`, `student__is_active=True`; zachowuje `.distinct()` i porządek po `pk`.

### Kryteria sukcesu:

#### Weryfikacja automatyczna:

- Testy usług (`apps/learning/tests/test_services.py`, `test_access.py`) przechodzą po przepięciu.
- `manage.py check`, Ruff, mypy przechodzą.

#### Weryfikacja ręczna:

- W shellu: wysyłka tworzy instancję; akceptacja przypina ucznia; obcy mentor nie widzi instancji.

---

## Faza 3: Widoki i gate własności

### Przegląd

Lista kursów pokazuje wyłącznie instancje użytkownika (mentor lub uczeń); wejście do instancji jest chronione gate'em członkostwa.

### Wymagane zmiany:

#### 1. Widoki kursu

**Plik**: `apps/learning/views.py`

**Cel**: Widoki operują na instancjach i egzekwują własność zamiast samego `is_mentor`.

**Kontrakt**: `CourseListView` zwraca instancje, gdzie `request.user` jest mentorem lub uczniem (lista instancji kursu mentora + instancji, do których uczeń jest zapisany). `CourseEntryView` przyjmuje `pk` instancji i wpuszcza wyłącznie mentora/ucznia tej instancji — obcy 403 (`PermissionDenied`), anonim redirect do logowania.

#### 2. Trasy

**Plik**: `apps/learning/urls.py`

**Cel**: Trasy na instancjach.

**Kontrakt**: `course-list` i `course-entry` (z `<int:pk>` instancji) bez zmiany nazw URL, by szablony i `LOGIN_REDIRECT_URL` nadal działały.

#### 3. Szablony

**Pliki**: `apps/learning/templates/learning/course_list.html`, `course_entry.html`

**Cel**: lista pokazuje instancje pary; wejście pokazuje tytuł kursu instancji.

**Kontrakt**: minimalne zmiany nazw (`course.title` → `instance.course.title`), bez zmian layoutu.

### Kryteria sukcesu:

#### Weryfikacja automatyczna:

- Testy widoków (`apps/learning/tests/test_views.py`) przechodzą z gate'em własności.
- `manage.py check`, Ruff, mypy przechodzą.

#### Weryfikacja ręczna:

- Mentor widzi wyłącznie swoje instancje; uczeń wyłącznie swoją; obcy mentor/i inny uczeń dostają 403.

---

## Faza 4: Testy izolacji + cookbook

### Przegląd

Pokryć testami ryzyka #1 i #2 względem nowego modelu i zaktualizować `test-plan.md`.

### Wymagane zmiany:

#### 1. Testy integracyjne izolacji

**Pliki**: `apps/learning/tests/test_access.py`, `apps/learning/tests/test_views.py`

**Cel**: Udowodnić izolację między instancjami: mentor A nie widzi instancji mentora B; uczeń nie widzi instancji innego ucznia; zakończona relacja odcina dostęp.

**Kontrakt**: test selektora „ta sama para, zakończone w kursie A + aktywne w kursie B" (edge case z research); test widoku „obcy mentor 403", „obcy uczeń 403"; test „mentor widzi tylko swoje instancje".

#### 2. Cookbook

**Plik**: `context/foundation/test-plan.md` (sekcja §6.2/§6.3)

**Cel**: Zapisać wzorzec „dodawanie testu integracyjnego izolacji" po wdrożeniu fazy.

**Kontrakt**: wypełnić `6.2 Adding an integration test` i `6.3 Adding a test for access/isolation` (lokalizacja, nazewnictwo, test referencyjny, komenda), oraz oznaczyć Fazę 1 w §3 jako `complete`.

### Kryteria sukcesu:

#### Weryfikacja automatyczna:

- Pełny zestaw testów przechodzi.
- `manage.py check`, `makemigrations --check`, Ruff, mypy przechodzą.

#### Weryfikacja ręczna:

- Pełny przepływ: mentor wysyła zaproszenie → uczeń akceptuje → obaj widzą instancję → obcy 403.

---

## Strategia testowania

### Testy jednostkowe:

- Model `CourseInstance`: unikalność aktywnej relacji per instancja, przepięcie FK.
- Usługi: kreacja instancji przy wysyłce, przypięcie ucznia przy akceptacji, pre-check relacji.

### Testy integracyjne:

- Izolacja między instancjami (dwóch mentorów, dwóch uczniów, jeden kurs — 4 instancje).
- Gate widoku: mentor/uczeń własnej instancji 200, obcy 403, anonim redirect.
- Zakończona relacja odcina dostęp (wróci #3 z mapy ryzyk do Fazy 2 rolloutu, tu tylko regresja).

### Kroki testowania ręcznego:

1. W panelu admina utworzyć dwóch mentorów, dwóch uczniów, wysłać zaproszenia.
2. Zweryfikować, że każdy z nich widzi wyłącznie własne instancje.
3. Sprawdzić 403 dla obcego mentora po podmianie `pk` w URL.

## Uwagi dotyczące wydajności

Selektor i lista instancji to zapytania z filtrem po relacjach mentora/ucznia — bez indeksów poza PK na MVP; brak N+1 (użycie `instance__course` przez `select_related` przy widokach).

## Uwagi dotyczące migracji

Migracja jest addytywna: nowa encja + nullable FK + `RunPython` wypełniający instancje. Nie usuwamy starych pól `course` w tej samej migracji, dopóki dane nie są przepięte; reset kontenerowego wolumenu nie jest wymagany (brak danych produktowych).

## Referencje

- Research: `context/changes/testing-critical-path-coverage/research.md`
- Test plan: `context/foundation/test-plan.md` — §2 (ryzyka #1/#2), §3 Faza 1.
- Roadmapa: `context/foundation/roadmap.md` — F-01 (kontrakt relacji), S-01 (widoki mentora).
- PRD: `context/foundation/prd.md` — FR-002, FR-003, FR-004, Access Control Changes, Guardrails.
- Poprzednie zmiany: `context/changes/access-and-invitation-contract/plan.md`, `context/changes/mentor-enters-first-course/plan.md`.

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Faza 1: Model instancji kursu

#### Automated

- [x] 1.1 `makemigrations --check --dry-run` czyste
- [x] 1.2 Testy modelu instancji przechodzą
- [x] 1.3 `check`, Ruff, mypy przechodzą

#### Manual

- [x] 1.4 Instancja powstaje per para w shellu

### Faza 2: Usługi cyklu życia na instancjach

#### Automated

- [x] 2.1 Testy usług przechodzą
- [x] 2.2 `check`, Ruff, mypy przechodzą

#### Manual

- [x] 2.3 Wysyłka tworzy instancję, akceptacja przypina ucznia w shellu

### Faza 3: Widoki i gate własności

#### Automated

- [x] 3.1 Testy widoków przechodzą
- [x] 3.2 `check`, Ruff, mypy przechodzą

#### Manual

- [x] 3.3 Mentor/uczeń widzą własną instancję, obcy 403

### Faza 4: Testy izolacji + cookbook

#### Automated

- [x] 4.1 Pełny zestaw testów przechodzi
- [x] 4.2 `check`, `makemigrations --check`, Ruff, mypy przechodzą

#### Manual

- [x] 4.3 Pełny przepływ izolacji w przeglądarce przechodzi