---
date: 2026-09-01T00:00:00+02:00
researcher: opencode
git_commit: 84fbe77120af921565d74e9fc17cde2880e02df4
branch: main
repository: SOMA-learn
topic: "Faza 1 test rolloutu: izolacja dostępu (ryzyko #1) i uprawnienia do kursu (ryzyko #2)"
tags: [research, codebase, learning, access, authorization, idor]
status: complete
last_updated: 2026-09-01
last_updated_by: opencode
---

# Research: Pokrycie izolacji dostępu i uprawnień do kursu

**Date**: 2026-09-01
**Researcher**: opencode
**Git Commit**: 84fbe77120af921565d74e9fc17cde2880e02df4
**Branch**: main
**Repository**: SOMA-learn

## Research Question

Jak faktycznie działa kontrola dostępu: (1) czy mentor może zobaczyć dane ucznia bez aktywnej, zaakceptowanej relacji oraz (2) czy użytkownik może otworzyć kurs, do którego nie ma uprawnień (podmiana id)? Co już jest chronione, co nie, i jaki najtańszy test dałby prawdziwy sygnał dla każdego z tych ryzyk?

## Summary

Ryzyko #1 (izolacja mentora) jest już chronione **na warstwie usługi**, nie widoku: jedyną powierzchnią, która zwraca uczniów, jest selektor `students_with_active_relationship`, a on filtruje po `status=ACTIVE` oraz `is_active=True`. Pokrywa go 6 testów integracyjnych w `test_access.py`. **Brakuje widoku listy uczniów** — warstwa HTTP dla ucznia jeszcze nie istnieje (to S-02/S-03), więc ryzyko #1 nie ma powierzchni widoku do obrony. Najtańszym brakującym sygnałem jest przypadek brzegowy izolacji międzykursowej: ta sama para (mentor, uczeń) z zakończoną relacją w kursie A i aktywną w kursie B — selektor dla A musi zwrócić pusto, dla B musi zwrócić ucznia. Taki test łapie regresję poluzowania filtra statusu.

Ryzyko #2 (podmiana id kursu) ma **realną, nietestowaną dziurę**: `CourseEntryView` i `CourseListView` dziedziczą po `MentorRequiredMixin`, który sprawdza wyłącznie `is_authenticated and is_mentor`. Nie istnieje pojęcie „własności kursu": model `Course` nie ma pola właściciela ani pojęcia członkostwa. Dziś każdy zalogowany mentor może otworzyć **dowolny** kurs po `pk`, a lista pokazuje wszystkie kursy. To nie jest jeszcze błąd w MVP (jeden gotowy, globalny kurs wg FR-002), ale to świadomie tolerowany kontrakt, którego żaden test nie przypina. Najtańszy test integracyjny: drugi mentor (bez relacji) dziś dostaje 200 przy wejściu do kursu — przypięcie tego zachowania da sygnał regresji w momencie wprowadzenia własności kursu w S-03+.

## Detailed Findings

### Ryzyko #1 — izolacja mentora (selektor, nie widok)

- Jedyna ścieżka zwracająca dane ucznia mentorowi to `students_with_active_relationship` (`apps/learning/services.py:125-134`).
- Filtr nakłada `learning_relationships__status=ACTIVE` i `is_active=True` — zakończona relacja i usunięte konto nie przechodzą (`apps/learning/services.py:128-132`).
- Pokrycie już istnieje w `apps/learning/tests/test_access.py`: `test_mentor_sees_only_active_students_in_course` (:23), `test_ended_relationship_is_not_visible` (:36), `test_unrelated_mentor_sees_no_students` (:48), `test_course_isolation` (:55), `test_deleted_mentor_loses_access_to_students` (:64), `test_deleted_student_is_not_visible_to_mentor` (:73).
- **Luka pokrycia**: brak przypadku „ta sama para mentor–uczeń, ale zakończona relacja w kursie A i aktywna relacja w kursie B" — test `test_course_isolation` sprawdza wyłącznie aktywną relację w innym kursie. Poluzowanie filtra statusu (`ENDED` → `ACTIVE`) nie zostałoby wykryte przy tym pojedynczym układzie.

### Ryzyko #2 — podmiata id kursu (brak pojęcia własności)

- `MentorRequiredMixin.test_func` (`apps/learning/views.py:12-14`) sprawdza tylko `user.is_authenticated and getattr(user, "is_mentor", False)`.
- `CourseEntryView` (`apps/learning/views.py:23-26`) bierze `pk` bez dalszego sprawdzenia członkostwa/przynależności.
- `CourseListView` (`apps/learning/views.py:17-20`) zwraca wszystkie kursy każdemu mentorowi.
- Model `Course` (`apps/learning/models.py:5-10`) ma wyłącznie `title` + `created_at` — brak `owner`, brak powiązania mentor↔kurs. Pojęcie „uprawnienia do kursu" nie istnieje.
- Istniejące testy widoku (`apps/learning/tests/test_views.py`) przypinają: mentor 200, uczeń 403, anonim 302 — dla listy i wejścia. Ale **brakuje testu „inny mentor bez żadnej relacji"**: dziś dostaje 200, a ten kontrakt nie jest nigdzie zapisany.

## Code References

- `apps/learning/services.py:125-134` — selektor dostępu mentora (filtr status + is_active).
- `apps/learning/views.py:9-14` — `MentorRequiredMixin` (tylko `is_mentor`).
- `apps/learning/views.py:17-26` — `CourseListView` / `CourseEntryView` (brak własności).
- `apps/learning/models.py:5-10` — `Course` bez właściciela/członkostwa.
- `apps/learning/tests/test_access.py:23-80` — istniejące testy izolacji selektora.
- `apps/learning/tests/test_views.py:18-58` — istniejące testy gate'u widoków.

## Architecture Insights

- **Granica widok vs usługa.** Reguły dostępu żyją w usługach (`learning/services.py`), a widoki orkiestrują. Ryzyko #1 nie ma jeszcze warstwy HTTP, więc test integracyjny widoku byłby pustym rusztowaniem — test integracyjny selektora to właściwa warstwa.
- **Własność kursu to decyzja produktowa, nie bug.** FR-002 mówi o „jednym gotowym kursie"; nie istnieje jeszcze koncepcja przypisania kursu do mentora. Nie piszemy testu na guard, którego nie ma (analogia: nie testujemy rollbacku, którego nie ma). Zamiast tego przypinamy obecny kontrakt i notujemy otwarte ryzyko.
- **Sygnał vs wiedza.** Odkrycie „brak własności" zmienia cel fazy z „obroń uprawnienia" na „przypnij bieżący kontrakt + otwórz decyzję produktową" — dokładnie jak research w case study M03E02 zmienił „broń przed promocją pending" na „nie ma czego bronić poza filtrem, broń nieatomowości".

## Historical Context (from prior changes)

- `context/changes/access-and-invitation-contract/plan.md` — F-01: kontrakt ról i relacji; selektor `students_with_active_relationship` jako „jedno zapytanie zwracające wyłącznie uczniów z aktywną relacją".
- `context/changes/mentor-enters-first-course/plan.md` — S-01: `MentorRequiredMixin` + gate `is_mentor` (403 dla ucznia, redirect dla anonima).
- `context/foundation/test-plan.md` — mapa ryzyk §2 (#1, #2) i wytyczne odpowiedzi.
- `context/foundation/prd.md` — FR-002 (jeden gotowy kurs), Guardrails (mentor tylko danych uczniów z aktywną relacją).

## Related Research

- `context/changes/mentor-enters-first-course/research.md` — stan auth i modelu kursu sprzed S-01.

## Open Questions

- Czy kurs ma kiedykolwiek stać się „własnością" mentora (wtedy `CourseEntryView` potrzebuje gate'u członkostwa)? Właściciel: użytkownik. Ujawnia się przy S-03+.
- Czy mentor ma widzieć wszystkie kursy, czy tylko „swoje" (te z relacją lub wystawionymi zaproszeniami)? To samo pytanie produktowe; dziś zakładamy „jeden gotowy globalny kurs".