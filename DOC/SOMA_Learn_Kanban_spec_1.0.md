---
title: SOMA Learn — Tablica kursu i model lekcji
version: 1.0
status: proposed-specification
language: pl-PL
scope: course-board, lesson-engine, assessments, learning-progress
framework: SOMA
---

# SOMA Learn — specyfikacja funkcjonalno-techniczna 1.0

## 1. Cel i zasady

Stworzyć interaktywną tablicę kursu inspirowaną Kanban/Jira. **Kurs** zawiera uporządkowane **Tematy** (analogiczne do Story/Epic w narzędziu projektowym), a **Temat** zawiera **Lekcje**. **Lekcja** jest pojedynczą jednostką pracy ucznia i jedynym elementem przesuwanym pomiędzy statusami. **Runda** jest odrębnym, czasowym wyborem lekcji do realizacji; nie jest Tematem ani statusem.

SOMA jest nadrzędnym frameworkiem: małe kroki, autonomia, adaptacja, refleksja, regularność bez kar. Grywalizacja jest opcjonalną warstwą prezentacji, nie logiką nauki.

## 2. Hierarchia domenowa

`Course -> Topic -> Lesson -> LessonSection -> ContentBlock / Activity / Assessment`

Dodatkowo: `Round -> RoundLesson (referencja do Lesson)`; `Enrollment -> LearnerLessonProgress`; `AssessmentAttempt`; `MentorReview`; `AuditEvent`.

- **Course**: nazwa, opis, poziom, program, wersja, publikacja.
- **Topic**: `courseId`, `title`, `description`, `position`, `learningOutcomes[]`, opcjonalne prerequisites; status tematu **wyliczany**, nie ręcznie ustawiany.
- **Lesson**: `topicId`, `title`, `position`, `estimatedMinutes`, `learningOutcomes[]`, `prerequisites[]`, `contentVersion`, `published`.
- **LessonSection**: `lessonId`, `kind` (`diagnostic|theory|practice|final_assessment`), `position`, `required`, `completionRule`.
- **ContentBlock**: `kind` (`rich_text|video|worked_example|image|attachment|embed`), `payload`, `position`, `accessibility`.
- **Activity**: `kind` (`single_choice|multiple_choice|short_answer|numeric|open_response|matching|ordering|flashcards|quiz`), `gradingMode` (`automatic|manual|self_check`), `feedback`, `rubric`, `maxScore`.
- **Assessment**: `purpose` (`diagnostic|final`), `questionSet`, `passThreshold`, `masteryOutcomes`, `attemptPolicy`, `timeLimit?`, `reviewPolicy`.
- **LearnerLessonProgress**: `enrollmentId`, `lessonId`, `workflowStatus`, `completionMode`, `masteryStatus`, `sectionProgress`, `updatedAt`, `version`.

Wszystkie identyfikatory stabilne UUID; wszystkie zapisy progressu są per uczeń i per wersja lekcji. Wymagana separacja treści globalnych od indywidualnych wyników ucznia.

## 3. Tablica — wygląd i zachowanie

Inspiracja: załączona makieta pięciokolumnowej tablicy. Jasne tło `#F7F6F0`, biały surface, primary `#2936C8`, ink `#20243A`, lime `#C6E875`, coral `#FF9377`; Manrope lub Plus Jakarta Sans. Nie kopiować dosłownie tekstów i liczb z makiety.

- Nagłówek: breadcrumbs, tytuł kursu, aktywna Runda, akcje kursu.
- Pasek: postęp Rundy, lekcje, aktywności, do sprawdzenia, do przećwiczenia.
- Zakładki: Tablica / Lista / Oś czasu / Materiały (pozostałe widoki mogą być etapem 2).
- Kolumny (kolejność UI): **Do zrobienia | Do poprawy | W trakcie | Do sprawdzenia | Zakończone**. Kolejność wizualna nie jest wymuszoną kolejnością workflow.
- Każdy **Temat** jest rozciągniętą na szerokość tablicy, zwijaną sekcją (nagłówek, opis skrócony, `completed/total`, pasek postępu). W środku pięć komórek statusów; **Lekcje** to przeciągalne karty w odpowiednich komórkach.
- Karta lekcji: nazwa, krótki opis, szacowany czas, ikona typu, status, postęp sekcji, opcjonalnie wynik testu, znacznik potrzeby mentora, menu akcji i uchwyt drag.
- Kliknięcie treści karty otwiera szczegóły lekcji (drawer lub pełny widok); uchwyt rozpoczyna drag. Zwijanie Tematu nie zmienia postępu.
- Obsługa klawiatury i mobile: menu „Zmień status”, zamiast wymaganego drag & drop; czytelne stany focus, screen reader announcements.
- Zmiana statusu: optimistic UI tylko jeśli operacja jest dozwolona; serwer waliduje i zapisuje; na błędzie rollback + komunikat.
- Drag domyślnie tylko **w obrębie tego samego Tematu**; przeniesienie lekcji do innego Tematu jest operacją edytora kursu, nie ucznia.
- Uczeń nie może zmieniać kolejności programu ani modyfikować globalnej treści kursu.
- Widok „Wszystkie” oraz filtr aktywnej Rundy; Runda może obejmować lekcje z wielu Tematów.

## 4. Workflow lekcji

Statusy: `todo`, `in_progress`, `in_review`, `needs_revision`, `completed`.

Dozwolone przejścia domyślne:
- `todo -> in_progress` (uczeń rozpoczyna).
- `in_progress -> in_review` (oddaje pracę wymagającą ręcznej oceny).
- `in_progress -> completed` (wyłącznie jeśli spełnione reguły ukończenia i nie ma wymaganej oceny ręcznej).
- `in_review -> needs_revision | completed` (mentor / uprawniony recenzent).
- `needs_revision -> in_progress` (uczeń poprawia); po ponownym oddaniu `in_progress -> in_review`.
- `completed -> in_progress` tylko świadome „Powtórz lekcję”, bez kasowania historii i osiągniętego mastery.

Niedozwolone: dowolny drag z `todo` do `completed`, pominięcie wymaganej weryfikacji, samodzielne zatwierdzenie pracy ręcznej przez ucznia. Statusy wynikają z uprawnień i warunków, a nie tylko miejsca upuszczenia karty.

W danym momencie można mieć wiele lekcji `in_progress` (zalecany limit miękki z sugestią skupienia, nie twarda blokada). Wersja 1.0 nie wymusza jednej aktywnej lekcji.

## 5. Wnętrze lekcji

1. **Test wstępny (diagnostic, opcjonalny)**: diagnozuje opanowanie konkretnych `learningOutcomes`; próg i polityka podejść konfigurowalne; wynik nie jest karą.
2. **Teoria**: rich text, wideo z napisami/transkrypcją, ilustracje, przykłady rozwiązane krok po kroku; treść podzielona na bloki.
3. **Praktyka**: pytania zamknięte, otwarte, numeryczne, dopasowania, quizy, fiszki; informacja zwrotna; dla otwartych ocena ręczna lub samoocena zgodnie z polityką.
4. **Test końcowy**: ocena celów lekcji, jawne kryteria zaliczenia, feedback per outcome, rekomendacje powtórki.

`diagnostic` i `final` są odrębnymi obiektami, mają osobne wyniki i historię podejść. Nie utożsamiać `sectionCompleted` z `mastered`.

### Diagnostyka i pomijanie

- Jeśli wynik diagnostyczny spełnia konfigurowalny próg **dla wszystkich wymaganych celów lekcji**, można zaoferować `Zaliczyć na podstawie testu wstępnego`.
- Domyślnie **nie pomijać całego Tematu na podstawie pojedynczego testu lekcji**. Opcjonalny test diagnostyczny na poziomie Tematu może mapować wyniki na wszystkie jego cele i rekomendować zaliczenie poszczególnych lekcji.
- Decyzja o pominięciu musi być jawna, odwracalna w UI (uczeń zawsze może otworzyć teorię i ćwiczenia), zapisana z `completionMode=diagnostic` i wynikami.
- Dla zadań otwartych i przypadków niepewnych wymagaj oceny mentora lub dodatkowej weryfikacji. Nie zaliczać automatycznie na podstawie niewiarygodnej samooceny.

### Opanowanie vs workflow

`workflowStatus` to pozycja na tablicy. `masteryStatus` to `unknown|developing|demonstrated|needs_support`, obliczane na podstawie dowodów osiągnięcia celów; `completionMode` to `standard|diagnostic|mentor_override`. Lekcja może być ukończona organizacyjnie, ale wymagać późniejszej powtórki. Zaplanowane powtórki są osobnymi aktywnościami, nie cofają automatycznie ukończonej lekcji.

## 6. Postęp i agregacja

- `topicProgress = completedLessons / eligiblePublishedLessons` (liczba i procent); puste tematy pokazują „Brak lekcji”, nie 100%.
- `roundProgress = completedRoundLessons / allRoundLessons`; lekcje zaliczone diagnostycznie liczą się jako ukończone, ale można je oznaczyć osobno.
- `courseProgress` analogicznie dla kursu; w UI osobno prezentować opanowanie (`mastery`) i wykonanie (`completion`).
- Liczniki w nagłówkach pochodzą z serwera lub spójnego modelu stanu, a nie z ręcznie wpisanych wartości.
- Ukończenie Rundy generuje podsumowanie i refleksję SOMA; nie wymaga ukończenia 100% zadań, jeśli użytkownik świadomie zamyka Rundę. Niezrealizowane lekcje można przenieść do następnej.

## 7. Uprawnienia

- **Uczeń**: czyta materiały, rozwiązuje aktywności, uruchamia testy, przesuwa lekcje tylko zgodnie z regułami, oddaje pracę, przegląda wyniki, planuje Rundę.
- **Mentor**: przegląda przypisanych uczniów, ocenia zadania otwarte, zatwierdza lub kieruje do poprawy z komentarzem, może w uzasadnionych przypadkach nadpisać wynik z audytem.
- **Autor/administrator**: tworzy i publikuje kursy, Tematy, Lekcje, sekcje, pytania, progi i zasady weryfikacji; nie zmienia bezpośrednio historii ucznia bez audytu.

Backend wymusza autoryzację na każdym endpointcie i sprawdza przypisanie mentora do ucznia. W przypadku niepełnoletnich: minimalizacja danych, ograniczenie dostępu do wyników, zgodność z wymogami prywatności i bezpieczeństwa.

## 8. Kontrakt API (propozycja, niezależna od stacku)

- `GET /courses/:courseId/board?enrollmentId=&roundId=` — Topics, Lessons, progress, permissions, allowedTransitions, revision.
- `GET /lessons/:lessonId?enrollmentId=` — content sections, learner state, outcomes.
- `POST /enrollments/:id/lessons/:lessonId/transitions` body `{toStatus, expectedVersion, reason?}` — atomowa walidacja, zapis, event, nowa wersja.
- `POST /assessment-attempts` body `{enrollmentId, assessmentId}` — utworzenie podejścia.
- `POST /assessment-attempts/:id/submit` body `{answers, idempotencyKey}` — wynik automatyczny lub kolejka ręcznej oceny.
- `POST /mentor-reviews` body `{attemptId, decision, feedback, rubricScores?}`.
- `POST /rounds/:roundId/close` body `{reflection, carryOverLessonIds[]}`.

Przykładowy fragment odpowiedzi tablicy:

```json
{
  "courseId": "uuid",
  "roundId": "uuid",
  "topics": [{
    "id": "uuid",
    "title": "Procenty",
    "position": 2,
    "progress": {"completed": 1, "total": 3},
    "lessons": [{
      "id": "uuid",
      "title": "Obliczanie procentu liczby",
      "workflowStatus": "in_progress",
      "masteryStatus": "developing",
      "sectionProgress": {"completed": 2, "total": 4},
      "allowedTransitions": ["in_review"],
      "version": 7
    }]
  }]
}
```

Przy zapisie: transakcja DB, kontrola `expectedVersion` (409 przy konflikcie), idempotencja, audit log. Dane odpowiedzi nie ujawniają poprawnych odpowiedzi przed oddaniem testu.

## 9. Edytor treści i wersjonowanie

Autor buduje lekcję z bloków; może zmieniać kolejność sekcji i ustawiać wymagania zaliczenia. Wersja opublikowana jest niemutowalna dla trwających podejść. Aktualizacje tworzą nową wersję, a migracja uczniów musi być jawnie określona. Testy przechowują wersję pytań i kryteriów użytych do oceny.

## 10. Stany i dostępność

Uwzględnić: loading/skeleton, pusta tablica, pusty Temat, brak aktywnej Rundy, zablokowana lekcja, ocena oczekująca, konflikt aktualizacji, utrata połączenia, brak uprawnień, zakończony kurs. Responsive: desktop pięć kolumn i sekcje, tablet przewijanie poziome, mobile widok statusu z przełącznikiem i lista kart. WCAG 2.2 AA, obsługa klawiatury, kontrast, napisy i transkrypcje wideo, brak zależności wyłącznie od koloru.

## 11. Kryteria akceptacji MVP

1. Temat jest sekcją; lekcja kartą; sekcje lekcji nie występują jako osobne karty na tablicy.
2. Karty można przenieść drag & drop oraz przez menu dostępne klawiaturą.
3. Niedozwolone przejścia nie są możliwe ani w UI, ani przez API.
4. Zaliczenie testem wstępnym wymaga pokrycia wszystkich wymaganych celów i zapisuje tryb ukończenia.
5. Wyniki diagnostyczne i końcowe mają odrębne podejścia oraz historię.
6. Ręczna ocena ma przypisanego recenzenta, komentarz i audyt.
7. Zmiany statusu odświeżają agregaty tematu, Rundy i kursu.
8. Zamknięcie Rundy nie usuwa niedokończonych lekcji i pozwala przenieść je dalej.
9. Dane uczniów są izolowane; mentor widzi tylko przypisanych uczniów.
10. Działa mobile, klawiatura, stany błędów i konflikt równoczesnych zmian.

## 12. Etapy wdrożenia

**MVP:** model domenowy, pięć statusów, sekcje Tematów, karty Lekcji, drag/menu, teoria, zadania zamknięte i otwarte, test końcowy, ręczna ocena, podstawowe postępy, Runda.

**Etap 2:** diagnostyka i selektywne zaliczanie, zaawansowane typy zadań, fiszki, analityka mastery, edytor blokowy, mapa kursu, rekomendacje powtórek.

**Etap 3:** adaptacyjne rekomendacje, bank pytań z wersjonowaniem, zaawansowane raporty mentora, opcjonalne mechaniki grywalizacji.

## 13. Decyzje do zatwierdzenia

- Czy diagnoza na poziomie Tematu jest częścią MVP czy etapu 2?
- Czy wszystkie lekcje wymagają testu końcowego, czy jest to opcja autora?
- Czy mentor jest obowiązkowy, czy tylko przy lekcjach wymagających oceny ręcznej?
- Jakie są progi zaliczenia dla poszczególnych celów i polityka ponownych prób?
- Czy uczeń może samodzielnie zamykać Rundę, czy wymagana jest akceptacja mentora w wybranych kursach?

**Ważne:** Makieta jest referencją wizualną. Reguły workflow, oceny i przechowywania danych wynikają z tej specyfikacji, nie z obrazka.
