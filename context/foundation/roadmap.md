---
project: "SOMA"
version: 1
status: draft
created: 2026-08-31
updated: 2026-09-01
prd_version: 1
main_goal: market-feedback
top_blocker: time
milestone_id: first-mentor-approved-task
milestone_seq: 1
milestone_status: open
---

# Mapa drogowa: SOMA

> Pochodzi z `context/foundation/prd.md` (v1) i automatycznie zbadanego baseline'u kodu.
> Edytuj na miejscu; archiwizuj, gdy zostanie zastąpiona.
> Elementy są wymienione w kolejności zależności. Tabela „W skrócie” jest indeksem.

## Kamień milowy

**M-1: Pierwsze zadanie zatwierdzone przez mentora** — Status: open

- **Cel:** Para uczeń–mentor może przejść od wyboru gotowego kursu przez planning i pracę ucznia do pierwszego zadania zatwierdzonego przez mentora.
- **Materiały źródłowe:** `context/foundation/prd.md` (v1)
- **Gotowe, gdy:** każdy F-NN i S-NN poniżej ma status `done`, a pełna ścieżka `US-01` przechodzi dla dwóch odseparowanych kont.
- **Kotwice zakresu:** US-01, FR-001–FR-010, Success Criteria, Access Control Changes, Constraints & Compatibility.

## Podsumowanie wizji

SOMA ma pomóc uczniowi szkoły podstawowej utrzymać motywację podczas przygotowań do egzaminu przez ograniczenie bieżącej pracy i wsparcie mentora. Pierwszy milestone sprawdza, czy wspólne planowanie oraz obowiązkowa weryfikacja zadania tworzą użyteczny rytm zamiast kolejnej listy zadań.

## Gwiazda północna

**S-05: Uczeń oddaje pierwsze zadanie, a mentor je zatwierdza albo zwraca do poprawy.** To najmniejszy pełny przepływ, który sprawdza regułę biznesową i główne kryterium sukcesu.

> „Gwiazda północna” oznacza tutaj najmniejszy kompleksowy przepływ, którego dostarczenie udowadnia podstawową hipotezę produktu; jest umieszczony tak wcześnie, jak pozwalają zależności.

## W skrócie

| ID | Change ID | Wynik (użytkownik może…) | Wymagania wstępne | Odniesienia do PRD | Status |
|---|---|---|---|---|---|
| F-01 | access-and-invitation-contract | (fundament) Granice ról, kont i zaproszeń są rozstrzygnięte | — | FR-001, FR-003, FR-004; Access Control Changes | in-progress |
| S-01 | mentor-enters-first-course | Mentor może zalogować się i wejść do jednego gotowego kursu | F-01 | FR-001, FR-002 | in-progress |
| S-02 | student-accepts-course-invitation | Uczeń może przyjąć adresowane zaproszenie i uzyskać dostęp do kursu | S-01 | FR-001, FR-003, FR-004 | proposed |
| S-03 | mentor-plans-first-cycle | Mentor i uczeń mogą ustalić cel, a mentor wybrać zadania bieżącego cyklu | S-02 | FR-005, FR-009 | proposed |
| S-04 | student-sees-cycle-work | Uczeń może zobaczyć materiały i zadania cyklu bez uruchamiania zablokowanego backlogu | S-03 | FR-006, FR-010 | proposed |
| S-05 | first-mentor-approved-task | Uczeń może oddać zadanie, a mentor zatwierdzić je albo zwrócić do poprawy | S-04 | US-01, FR-007, FR-008 | blocked |
| S-06 | account-deletion-rodo | Użytkownik może usunąć konto; dane osobowe są usuwane, relacje zachowują audyt | F-01 | Access Control Changes; RODO | proposed |
| S-07 | ux-polish | Drobne poprawki UX/UI: linki, komunikaty, stany puste | S-01 | FR-001, FR-002 | proposed |

## Baza

Stan kodu na dzień 2026-08-31, automatycznie zbadany i potwierdzony przez użytkownika:

- **Frontend:** nieobecny — brak szablonów i interfejsu produktu; istnieje wyłącznie odpowiedź operacyjna.
- **Backend / API:** częściowy — routing projektu i testowany endpoint zdrowia istnieją w `apps/core/`.
- **Dane:** częściowe — lokalna baza i połączenie z PostgreSQL działają, ale brak modeli, migracji i danych domenowych.
- **Autoryzacja:** częściowa — mechanizm sesji jest włączony, ale brak logowania produktu, ról i ochrony tras.
- **Wdrożenie / infrastruktura:** częściowe — obraz i lokalny zestaw usług są zdrowe; produkcyjne wdrożenie nie zostało zatwierdzone.
- **Obserwowalność:** częściowa — endpoint zdrowia i jego test istnieją; brak logowania domenowego, śledzenia błędów i metryk.

## Fundamenty

### F-01: Rozstrzygnij kontrakt ról i zaproszeń

- **Wynik:** (fundament) Granice kont ucznia i mentora, sposób nadawania roli oraz cykl życia adresowanego zaproszenia są jednoznaczne i możliwe do zweryfikowania testami dostępu.
- **Change ID:** access-and-invitation-contract
- **Odniesienia do PRD:** FR-001, FR-003, FR-004; Access Control Changes; Success Criteria / Guardrails.
- **Odblokowuje:** S-01, S-02 oraz ścieżkę weryfikacji izolacji danych ucznia.
- **Wymagania wstępne:** —
- **Równolegle z:** —
- **Blokery:** —
- **Niewiadome:** —
- **Ryzyko:** Rozstrzygnięcie tych granic przed pierwszym kontem zapobiega utrwaleniu modelu dostępu sprzecznego z prywatnością relacji uczeń–mentor.
- **Status:** in-progress

## Wycinki

### S-01: Mentor wchodzi do pierwszego kursu

- **Wynik:** Mentor może utworzyć konto, zalogować się i wejść do jednego gotowego kursu.
- **Change ID:** mentor-enters-first-course
- **Odniesienia do PRD:** FR-001, FR-002.
- **Wymagania wstępne:** F-01.
- **Równolegle z:** —
- **Blokery:** —
- **Niewiadome:**
  - Jaki minimalny zakres gotowego kursu wystarczy do pierwszego pilota? — Właściciel: użytkownik. Blok: nie.
- **Ryzyko:** Ten wycinek najwcześniej integruje konto, dane i prosty interfejs bez budowania całego katalogu kursów.
- **Status:** in-progress

### S-02: Uczeń przyjmuje zaproszenie do kursu

- **Wynik:** Uczeń może zalogować się, przyjąć zaproszenie przypisane do swojego adresu i uzyskać dostęp do właściwego kursu.
- **Change ID:** student-accepts-course-invitation
- **Odniesienia do PRD:** FR-001, FR-003, FR-004; Success Criteria / Guardrails.
- **Wymagania wstępne:** S-01.
- **Równolegle z:** —
- **Blokery:** —
- **Niewiadome:** —
- **Ryzyko:** Wczesne sprawdzenie izolacji relacji ogranicza koszt naprawy wycieku danych między mentorami.
- **Status:** proposed

### S-03: Para planuje pierwszy cykl

- **Wynik:** Mentor i uczeń mogą ustalić cel cyklu, a mentor może przenieść wybrane zadania z backlogu do bieżącej pracy.
- **Change ID:** mentor-plans-first-cycle
- **Odniesienia do PRD:** FR-005, FR-009.
- **Wymagania wstępne:** S-02.
- **Równolegle z:** —
- **Blokery:** —
- **Niewiadome:**
  - Czy cel cyklu zapisuje wyłącznie mentor, czy obie role mogą go edytować po planningu? — Właściciel: użytkownik. Blok: nie.
- **Ryzyko:** Ręczny wybór ograniczonego zakresu jest kluczowym mechanizmem motywacyjnym; zbyt szeroki planning odtworzy problem przytłoczenia.
- **Status:** proposed

### S-04: Uczeń widzi pracę bieżącego cyklu

- **Wynik:** Uczeń może zobaczyć teksty, obrazy, linki i zadania bieżącego cyklu oraz dalszy backlog bez możliwości rozpoczęcia zablokowanych zadań.
- **Change ID:** student-sees-cycle-work
- **Odniesienia do PRD:** FR-006, FR-010; Constraints & Compatibility / Quality Constraints.
- **Wymagania wstępne:** S-03.
- **Równolegle z:** —
- **Blokery:** —
- **Niewiadome:** —
- **Ryzyko:** Prostota widoku ma pierwszeństwo przed rozbudowanym interfejsem, aby jak najszybciej zweryfikować zrozumienie następnego kroku przez ucznia.
- **Status:** proposed

### S-05: Pierwsze zadanie przechodzi weryfikację mentora

- **Wynik:** Uczeń może przesunąć zadanie przez pracę do sprawdzenia, a mentor może zobaczyć zmianę i przenieść zadanie do poprawek albo zatwierdzić je jako ukończone.
- **Change ID:** first-mentor-approved-task
- **Odniesienia do PRD:** US-01, FR-007, FR-008; Success Criteria / Primary; Business Logic Changes.
- **Wymagania wstępne:** S-04.
- **Równolegle z:** —
- **Blokery:** —
- **Niewiadome:**
  - Jaki dowód wykonania zadania uczeń przekazuje mentorowi w pierwszej wersji? — Właściciel: użytkownik. Blok: tak.
- **Ryzyko:** To milestone walidacyjny; jeśli zatwierdzenie nie daje obu rolom jasnego stanu i następnego kroku, wcześniejsze wycinki nie potwierdzają wartości produktu.
- **Status:** blocked

### S-06: Usunięcie konta (RODO)

- **Wynik:** Użytkownik może usunąć własne konto; dane osobowe znikają, a zakończone relacje zachowują wyłącznie metadane audytowe.
- **Change ID:** account-deletion-rodo
- **Odniesienia do PRD:** Access Control Changes; Success Criteria / Guardrails; RODO.
- **Wymagania wstępne:** F-01.
- **Równolegle z:** S-07.
- **Blokery:** —
- **Niewiadome:**
  - Czy usunięcie konta mentora wymaga uprzedniego zakończenia aktywnych relacji? — Właściciel: użytkownik. Blok: nie.
- **Ryzyko:** Usunięcie konta musi być nieodwracalne dla danych osobowych, ale nie może usunąć audytu relacji — obszar osobny od przepływu kursów.
- **Status:** proposed

### S-07: Poprawki UX/UI

- **Wynik:** Użytkownik widzi sensowne linki nawigacyjne, komunikaty i stany puste zamiast surowych formularzy i list.
- **Change ID:** ux-polish
- **Odniesienia do PRD:** FR-001, FR-002; Quality Constraints.
- **Wymagania wstępne:** S-01.
- **Równolegle z:** S-06.
- **Blokery:** —
- **Niewiadome:** —
- **Ryzyko:** Czysto prezentacyjne zmiany nie mogą dotykać logiki domenowej — wtedy zachowują niezależność od S-06.
- **Status:** proposed

## Przekazanie do backlogu

| ID mapy drogowej | Change ID | Sugerowany tytuł zadania | Gotowe do `/10x-plan` | Uwagi |
|---|---|---|---|---|
| F-01 | access-and-invitation-contract | Rozstrzygnij role i cykl życia zaproszeń | yes | Uruchom `/10x-plan access-and-invitation-contract` |
| S-01 | mentor-enters-first-course | Mentor loguje się i wybiera pierwszy kurs | no | Wymaga F-01 |
| S-02 | student-accepts-course-invitation | Uczeń przyjmuje adresowane zaproszenie | no | Wymaga S-01 |
| S-03 | mentor-plans-first-cycle | Para ustala cel i zakres pierwszego cyklu | no | Wymaga S-02 |
| S-04 | student-sees-cycle-work | Uczeń widzi bieżącą pracę i zablokowany backlog | no | Wymaga S-03 |
| S-05 | first-mentor-approved-task | Mentor weryfikuje pierwsze zadanie ucznia | no | Wymaga S-04 i decyzji o dowodzie wykonania |

## Otwarte pytania dotyczące mapy drogowej

1. **Dlaczego zmiana jest potrzebna właśnie teraz?** — Właściciel: użytkownik. Blok: nie blokuje elementów roadmapy.
2. **Jak reguła przepływu SOMA powinna zmienić się przy stukrotnie większej liczbie uczniów na mentora?** — Właściciel: użytkownik. Blok: nie blokuje M-1; wraca przed skalowaniem.
3. **Jakie są docelowe natężenie ruchu i wolumen danych?** — Właściciel: użytkownik. Blok: nie blokuje M-1; wraca przed skalowaniem.
4. **Czy pierwszy pilot odbędzie się lokalnie, czy dopiero po zatwierdzeniu produkcyjnego wdrożenia?** — Właściciel: użytkownik. Blok: nie blokuje planowania; blokuje sposób zbierania informacji zwrotnej.

## Zaparkowane

- **OAuth i 2FA** — Dlaczego zaparkowane: PRD / Non-Goals wyklucza je z MVP.
- **Upload wideo i edytor kursów** — Dlaczego zaparkowane: pierwszy milestone korzysta z jednego gotowego kursu.
- **Automatyczne dobieranie zadań** — Dlaczego zaparkowane: mentor ręcznie planuje cykl z uczniem.
- **Rozbudowany dashboard i analityka** — Dlaczego zaparkowane: bieżące statusy wystarczą do sprawdzenia pętli.
- **Pełna obsługa telefonu** — Dlaczego zaparkowane: pierwszy milestone gwarantuje przepływ desktopowy.
- **Produkcja Railway i automatyzacja CI/CD** — Dlaczego zaparkowane: użytkownik nie zatwierdził kosztów; lokalny zestaw usług umożliwia rozwój i testy.

## Historia kamieni milowych

Brak — M-1 jest pierwszym otwartym kamieniem milowym.

## Zrobione

Brak — elementy zostaną dopisane przez proces archiwizacji zmian.