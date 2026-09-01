# Izolacja dostępu przez instancje kursu — Krótki plan

> Pełny plan: `context/changes/testing-critical-path-coverage/plan.md`
> Research: `context/changes/testing-critical-path-coverage/research.md`

## Co i dlaczego

Test-plan oznaczył ryzyko #2 („użytkownik otwiera kurs, do którego nie ma uprawnień") jako wart chroniczny. Research pokazał, że to nie brak testu, lecz brak pojęcia **instancji kursu** w modelu — jeden globalny `Course` jest widoczny każdemu mentorowi. Produkt doprecyzował: mentor wysyłając zaproszenie tworzy instancję kursu dla pary mentor–uczeń; instancja jest widoczna wyłącznie tej parze.

## Punkt wyjścia

Dziś `Course` jest globalny, `Invitation`/`Relationship` wskazują `Course`, a widoki bramkuje sam `is_mentor` bez sprawdzenia własności. Uczeń przy wysyłce zna po e-mailu; konto może jeszcze nie istnieć.

## Pożądany stan końcowy

Istnieje `CourseInstance` (mentor, kurs, uczeń nullable, student_email). Wysłanie zaproszenia tworzy instancję; akceptacja przypina ucznia i tworzy relację. Lista pokazuje wyłącznie instancje użytkownika; wejście chroni gate członkostwa (mentor/uczeń instancji, obcy 403). Testy izolacji (#1/#2) działają na nowym modelu.

## Podjęte kluczowe decyzje

| Decyzja | Wybór | Dlaczego | Źródło |
| --- | --- | --- | --- |
| Kardynalność instancji | per mentor–uczeń | „kilka instancji dla kilku uczniów oddzielnie" | Produkt (wywiad) |
| Powiązanie z zaproszeniem/relacją | instancja spina oba | zaproszenie i relacja odnoszą się do workspace pary | Produkt (wywiad) |
| Uczeń przed akceptacją | `student` nullable + `student_email` | uczeń może nie mieć konta przy wysyłce | Research |
| Gate widoku | członkostwo w instancji zamiast `is_mentor` | własność, nie rola | Research / PRD |
| Migracja | addytywna + `RunPython` wypełniający | nie kasuje starych pól, brak danych produkcyjnych | Plan |

## Zakres

**W zakresie:** model `CourseInstance`, przepięcie `Invitation`/`Relationship`, usługi cyklu życia na instancjach, gate własności w widokach, testy izolacji, cookbook `test-plan.md`.

**Poza zakresem:** treść kursu, zadania, planning, tablica cyklu (S-03/S-04/S-05), UI zarządzania instancjami, OAuth/2FA, zmiana cyklu życia zaproszenia (TTL/retokenizacja).

## Architektura / Podejście

`CourseInstance` to nowa encja domeny w `apps/learning` — „workspace pary". `Invitation` i `Relationship` wskazują instancję zamiast `Course`; usługi operują na instancjach; widoki egzekwują członkostwo. Cztery fazy w kolejności zależności: model → usługi → widoki → testy+cookbook.

## Fazy w skrócie

| Faza | Co dostarcza | Kluczowe ryzyko |
| --- | --- | --- |
| 1. Model instancji kursu | `CourseInstance` + migracja + przepięcie FK | przeniesienie `unique_active_relationship` na instancję |
| 2. Usługi cyklu życia | usługi na instancjach + izolacja selektora | przypięcie ucznia przy akceptacji |
| 3. Widoki i gate własności | lista/wejście per instancja, obcy 403 | regresja `LOGIN_REDIRECT_URL`/szablony |
| 4. Testy izolacji + cookbook | testy #1/#2 + aktualizacja `test-plan.md` | regresje istniejących testów |

**Wymagania wstępne:** F-01 i S-01 wdrożone (`Account`, `Course`, usługi, widoki).
**Szacowany nakład pracy:** ~3 sesje w 4 fazach.

## Otwarte ryzyka i założenia

- Czy utworzenie instancji przy wysyłce (zanim uczeń zaakceptuje) powinno blokować ponowną wysyłkę do tego samego e-maila do innego kursu — przyjęto: instancja per (mentor, course, student_email), więc ten sam uczeń w innym kursie ma osobną instancję.
- `Relationship.mentor`/`student` zostają jako zdenormalizowany audyt — do potwierdzenia, czy nie kolidują z `instance.mentor`/`instance.student` przy soft-delete (S-06).

## Kryteria sukcesu (podsumowanie)

- Mentor widzi wyłącznie własne instancje; uczeń wyłącznie swoją; obcy 403.
- Wysłanie zaproszenia tworzy instancję; akceptacja przypina ucznia i tworzy aktywną relację.
- Testy izolacji (#1/#2) przechodzą; `test-plan.md` §6 ma wzorzec testu integracyjnego izolacji i Faza 1 jest `complete`.