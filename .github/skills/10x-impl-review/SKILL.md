---
name: 10x-impl-review
description: Review implementation against plan for drift, dangerous decisions, and pattern compliance
---

# Przegląd implementacji

Porównaj rzeczywistą pracę implementacyjną z pierwotnym planem, aby wychwycić odchylenia, niebezpieczne decyzje, naruszenia architektury i niewłaściwe użycie wzorców, zanim się skumulują.

Dwie ziarnistości:
- **Przegląd fazy**: po pojedynczej fazie — szybki, skoncentrowany na zmianach w tej fazie
- **Pełny przegląd planu**: po wszystkich fazach — kompleksowe sprawdzenie

Dwa tryby:
- **Świeży przegląd**: analiza → ustalenia → interaktywne sortowanie
- **Wznowienie sortowania**: załadowanie zapisanego raportu i przejście do sortowania poszczególnych problemów

## Rozwiązanie wejściowe

1. Argument wskazuje na zapisany plik przeglądu (zawiera `<!-- IMPL-REVIEW-REPORT -->`) → **wznowienie sortowania** (przejdź do kroku 5)
2. Argument to `<change-id>` i istnieje `context/changes/<change-id>/plan.md` → świeży przegląd tego planu
3. Podano ścieżkę planu (np. `@context/changes/<change-id>/plan.md`) → świeży przegląd tego planu
4. Podano numer fazy (np. "phase 3") → przegląd tylko tej fazy
5. Brak argumentu → wylicz `context/changes/*/change.md`; wybierz najbardziej ostatnio `updated` zmianę ze `status` w `{implementing, implemented}` i potwierdź za pomocą Zapytaj użytkownika:

Jeśli rozwiązana ścieżka planu zaczyna się od `context/archive/`, odmów: wydrukuj "This change is archived. Reviews are not appended to archived plans." i ZATRZYMAJ.

## Krok 1: Załaduj plan i wykryj zakres zmian

Utwórz zadanie: "Implementation Review" / activeForm "Loading context"

1. **Wczytaj plik planu w całości** — bez limitu/offsetu.
2. **Wczytaj `context/foundation/lessons.md` jeśli istnieje** i użyj zaakceptowanych reguł jako priorytetów podczas skanowania w poszukiwaniu ustaleń — odchylenie, które narusza znaną, powtarzającą się regułę, jest silniejszym sygnałem niż ogólna uwaga stylistyczna.
3. **Wczytaj kanoniczny stan z sekcji `## Progress` planu** (patrz `references/progress-format.md`): completion = `count([x]) / count([ ] + [x])`; current phase = faza zawierająca pierwsze `- [ ]` (lub ostatnia faza, jeśli wszystkie są zakończone). Wczytaj również sąsiedni `change.md` dla `status` i `updated`.
4. **Zakres**: żądana konkretna faza → tylko ta faza; w przeciwnym razie wszystkie fazy, których pola wyboru postępu są w pełni `[x]` (tj. zakończone fazy).
5. **Wyodrębnij** z przeglądanych faz: ścieżki plików z "Changes Required", decyzje architektoniczne, kryteria sukcesu (punkty automatyczne/ręczne w blokach faz + ich lustrzane odbicie `[ ]`/`[x]` w postępie) oraz listę "What We're NOT Doing" (bariery zakresu).
6. **Wykrywanie zakresu Git** — co faktycznie się zmieniło:
   ```bash
   PLAN_DATE="<YYYY-MM-DD from filename>"
   git log --oneline --after="${PLAN_DATE}" -- .
   git diff --name-only $(git log --reverse --after="${PLAN_DATE}" --format="%H" | head -1)^..HEAD 2>/dev/null
   ```
   Jeśli zakres nie może być czysto określony, wróć do commitów, których komunikaty odwołują się do planu/funkcji.

Porównaj listę zmienionych plików z listą plików planu:
- **W planie ORAZ w diffie** → oczekiwana zmiana, zweryfikuj, czy zawartość odpowiada intencji
- **W diffie, ale NIE w planie** → nieplanowana zmiana, zbadaj i oznacz
- **W planie, ale NIE w diffie** → potencjalnie brakująca implementacja

Nie wczytuj każdego zmienionego pliku do głównego kontekstu — pozwól podagentom wczytać to, czego potrzebują. Główny kontekst powinien zawierać plan i podsumowanie diffa, a nie pełne źródło 20 plików.

## Krok 2: Równoległy przegląd za pomocą podagentów

Zaktualizuj zadanie: activeForm "Gathering evidence"

Uruchom **dwa** podagenty jednocześnie. Każdy otrzymuje ukierunkowany kontekst — nie wrzucaj całego planu do obu.

**Agent 1 — Wykrywanie odchyleń od planu** (`subagent_type: "general-purpose"`)

Daj mu: tekst "Changes Required" dla przeglądanych faz, listę ścieżek plików do odczytania.

Instrukcje: dla każdej zaplanowanej zmiany, przeczytaj rzeczywisty plik i zweryfikuj, czy implementacja odpowiada intencji. Sprawdź:
- Zmiany zaimplementowane inaczej niż zaplanowano (niezgodność intencji, nie formatowania)
- Zaplanowane elementy pominięte bez dokumentacji
- Dodatki nieopisane w planie (rozszerzenie zakresu)

Zgłoś każdy: ścieżkę pliku, co mówił plan, co istnieje, werdykt (MATCH / DRIFT / MISSING / EXTRA).

**Agent 2 — Bezpieczeństwo, jakość i zgodność ze wzorcami** (`subagent_type: "general-purpose"`)

Daj mu: pełną listę zmienionych plików do odczytania, ścieżkę katalogu głównego projektu.

Instrukcje:

1. **Skanowanie bezpieczeństwa i jakości** na każdym zmienionym pliku. Oznacz:
   - **Bezpieczeństwo**: ryzyka wstrzyknięcia (SQL, polecenia, XSS), zakodowane na stałe sekrety, brak autentykacji/autoryzacji na granicach systemu, zbyt liberalne CORS/uprawnienia.
   - **Wydajność**: zapytania N+1, nieograniczone iteracje/rekurencje, brak paginacji, niepotrzebne synchroniczne I/O.
   - **Niezawodność**: brak obsługi błędów na zewnętrznych granicach (wywołania API, I/O plików, DB), warunki wyścigu, wycieki zasobów.
   - **Bezpieczeństwo danych**: destrukcyjne operacje DB bez wycofania, zmiany schematu bez ścieżki migracji, potencjalna utrata danych.

2. **Zgodność ze wzorcami** — dla każdego zmienionego pliku znajdź 1-2 podobne istniejące pliki i porównaj nazewnictwo, podejście do obsługi błędów, strukturę modułów, importy/eksporty, strukturę testów, wzorce konfiguracji. **Zgłaszaj tylko istotne niezgodności** (np. nowy moduł używa camelCase, gdzie sąsiednie używają snake_case; nowy punkt końcowy pomija wzorzec middleware autoryzacji, którego używa reszta API). Pomiń trywialne różnice stylistyczne — jeśli kod działa i jest zgodny z planem, drobne formatowanie nie jest ustaleniem.

3. **Praca nad wzorcami w ramach budżetu** — jeśli diff zmienił ≤3 pliki, poświęć minimalny czas na wzorce (niewiele do porównania). Skaluj głębokość wzorców wraz z zakresem zmian.

Zgłoś każde ustalenie z: plikiem, numerem linii, kategorią, ważnością (CRITICAL / WARNING / OBSERVATION), opisem, rekomendacją.

## Krok 3: Zweryfikuj kryteria sukcesu

Zaktualizuj zadanie: activeForm "Verifying success criteria"

Dla każdej przeglądanej fazy:

**Automatyczne**: uruchom każde polecenie z pól wyboru "Automated Verification" za pomocą powłoki. Zapisz polecenie, wynik (pass/fail), rzeczywiste wyjście (obetnij, jeśli jest ogromne).

**Ręczne**: w sekcji `## Progress` sprawdź elementy ręczne jako `- [x]` vs `- [ ]`. Oznacz elementy oznaczone jako ukończone, które nie mają widocznych dowodów w diffie (możliwe "podpisywanie na ślepo"); uznaj niezaznaczone elementy jako oczekujące.

## Krok 4: Skompiluj ustalenia i przedstaw raport

Zaktualizuj zadanie: activeForm "Compiling findings"

Każde ustalenie ma:
- **ID**: F1, F2, F3…
- **Ważność**: CRITICAL / WARNING / OBSERVATION (jak źle, jeśli zignorowane)
- **Wpływ**: LOW / MEDIUM / HIGH (ile uwagi wymaga decyzja)
- **Wymiar**: Plan Adherence / Scope Discipline / Safety & Quality / Architecture / Pattern Consistency / Success Criteria
- **Tytuł**: jedna linia
- **Lokalizacja**: `file:line` (lub "N/A" dla brakujących elementów)
- **Szczegóły**: co jest nie tak z dowodami — plan vs. rzeczywistość, lub kod vs. oczekiwania
- **Opcje naprawy**: 1 lub 2 (patrz poniżej)

### Wpływ

Ortogonalny do ważności. CRITICAL z LOW wpływem (oczywista jednowierszowa poprawka) jest tania; WARNING z HIGH wpływem (przebudowa architektury) wymaga starannego przemyślenia.

| Wpływ | Znaczenie |
|---|---|
| 🏃 **LOW** | Szybka decyzja. Poprawka jest oczywista i wąsko zakrojona. Bezpieczne do grupowania. |
| 🔎 **MEDIUM** | Warto się zatrzymać. Prawdziwy kompromis lub nietrywialna edycja — pomyśl przed podjęciem decyzji. |
| 🔬 **HIGH** | Stawka architektoniczna. Szeroki promień rażenia, strategiczne implikacje lub niejasna najlepsza ścieżka. |

### Opcje naprawy

Domyślnie **jedna** poprawka. Oferuj dwie tylko wtedy, gdy istnieje prawdziwy kompromis, który inteligentny recenzent chciałby rozważyć (np. "załataj miejsce wywołania" vs. "napraw to u źródła"). Jeśli wymyślasz słabą drugą opcję, nie rób tego — przedstaw jedną i idź dalej.

**Ustalenia o niskim wpływie**: tylko `Fix: [jedna linia]`. Hałas nie jest pomocny, gdy odpowiedź jest oczywista.

**Ustalenia o średnim/wysokim wpływie**: każda opcja otrzymuje:
```
[1-zdaniowe podejście] · Siła: [zaleta, najlepiej oparta na dowodach z kodu/planu] · Kompromis: [koszt lub ryzyko] · Pewność: HIGH|MED|LOW — [1-linia dlaczego] · Martwy punkt: [czego nie zweryfikowaliśmy, lub "None significant"]
```

Oferując dwie opcje, oznacz dokładnie jedną `⭐ Recommended`.

### Werdykty wymiarów

PASS / WARNING / FAIL na wymiar:
- **Plan Adherence** — czy zaplanowane zmiany zostały zaimplementowane zgodnie z opisem? FAIL w przypadku MISSING lub poważnego DRIFT.
- **Scope Discipline** — czy granice "nie robienia" zostały uszanowane? WARNING, jeśli istnieją dodatkowe zmiany, ale są nieszkodliwe.
- **Safety & Quality** — bezpieczeństwo, wydajność, niezawodność, bezpieczeństwo danych. FAIL w przypadku każdego ustalenia CRITICAL.
- **Architecture** — granice modułów, kierunek zależności, uzasadnienie abstrakcji. FAIL w przypadku naruszeń.
- **Pattern Consistency** — zgodność z istniejącymi konwencjami. WARNING w przypadku drobnych niespójności.
- **Success Criteria** — automatyczne testy przechodzą, ręczne testy zostały zaadresowane. FAIL w przypadku automatycznych błędów.

### Ogólny werdykt

- **APPROVED** — wszystkie PASS, lub PASS z ≤2 drobnymi ostrzeżeniami
- **NEEDS ATTENTION** — wiele ostrzeżeń lub 1 niekrytyczny FAIL
- **REJECTED** — każdy krytyczny FAIL (bezpieczeństwo, poważne odchylenie, bezpieczeństwo danych, nieudane testy)

Sortuj ustalenia według ważności: CRITICAL → WARNING → OBSERVATION. Ogranicz do 10 — skonsoliduj powiązane ustalenia, jeśli jest ich więcej.

### Format raportu

Zwykły tekst, rysowanie ramek. Wymiary PASS pojawiają się tylko w tabeli werdyktów, nigdy jako ustalenia. Pomiń grupy ważności z zerową liczbą ustaleń.

```
═══════════════════════════════════════════════════════════
  IMPLEMENTATION REVIEW: [Plan Title]
  Scope: Phase [N] of [Total]  |  Date: YYYY-MM-DD
  Findings: [N critical] [N warnings] [N observations]
═══════════════════════════════════════════════════════════

  Plan Adherence        PASS    ✅
  Scope Discipline      WARNING ⚠️   (1 finding)
  Safety & Quality      FAIL    ❌   (1 finding)
  Architecture          PASS    ✅
  Pattern Consistency   WARNING ⚠️   (1 finding)
  Success Criteria      PASS    ✅

  ► Overall: NEEDS ATTENTION

═══════════════════════════════════════════════════════════
  CRITICAL FINDINGS ❌
═══════════════════════════════════════════════════════════

  F1 — SQL injection in auth handler
  ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
    Severity:  ❌ CRITICAL
    Impact:    🔎 MEDIUM — real tradeoff; pause to reason through it
    Dimension: Safety & Quality
    Location:  src/auth/handler.ts:42

    Detail:
    SQL query built with string concatenation. Plan specified
    parameterized queries but implementation uses template literals.

    Fix: Replace the template literal with a parameterized query using
         db.query($1, [value]).
      Strength:   Matches the pattern in src/users/query.ts and removes
                  the injection class entirely.
      Tradeoff:   Minor — one call site, a few-line change.
      Confidence: HIGH — identical pattern used elsewhere in this repo.
      Blind spot: None significant.

═══════════════════════════════════════════════════════════
  WARNING FINDINGS ⚠️
═══════════════════════════════════════════════════════════

  F2 — Unplanned /api/status endpoint
  ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
    Severity:  ⚠️ WARNING
    Impact:    🔬 HIGH — architectural stakes; think carefully before deciding
    Dimension: Scope Discipline
    Location:  src/api/routes.ts:18

    Detail:
    New GET /api/status endpoint not in plan. Functionality is
    related to planned work but extends public API surface.

    Fix A ⭐ Recommended: Document in the plan as an addendum
      Strength:   Preserves the work already done; updates the source of
                  truth before future reviews use the plan as ground truth.
      Tradeoff:   Plan becomes a slightly moving target.
      Confidence: HIGH — this repo's plan updates regularly pick up
                  discovered scope through addenda.
      Blind spot: Stakeholders who reviewed the original scope aren't
                  notified.

    Fix B: Remove and add to follow-up work
      Strength:   Keeps scope discipline strict.
      Tradeoff:   Loses implemented work; another PR needed later.
      Confidence: MEDIUM — depends whether anything already depends on it.
      Blind spot: Haven't checked for callers of /api/status.

  ···

  F3 — camelCase vs. snake_case
  ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
    Severity:  ⚠️ WARNING
    Impact:    🏃 LOW — quick decision; fix is obvious and narrowly scoped
    Dimension: Pattern Consistency
    Location:  src/utils/format.ts

    Detail:
    Uses camelCase (formatDate, parseInput) while existing utils use
    snake_case (format_date, parse_input).

    Fix: Rename exports to snake_case to match src/utils/.

═══════════════════════════════════════════════════════════
```

### Reguły formatowania raportu

- **Linia tytułu ustalenia** zawiera tylko ID i krótki tytuł — nic więcej. Wszystko inne znajduje się poniżej jako oznaczone pola, dzięki czemu każdy wiersz jest krótki i łatwy do skanowania.
- **Zawsze łącz ikony ze słowem.** Nigdy nie używaj samej ikony jako jedynego sygnału — `❌ CRITICAL`, a nie tylko `❌`. Dzięki temu raport jest czytelny podczas przeglądania i nie zmusza użytkownika do zapamiętywania znaczenia każdej ikony.
- **Wpływ zawsze zawiera swoje jednowierszowe znaczenie** (skopiuj z tabeli Wpływ — "stawka architektoniczna; pomyśl dokładnie przed podjęciem decyzji" / "prawdziwy kompromis; zatrzymaj się, aby to przemyśleć" / "szybka decyzja; poprawka jest oczywista i wąsko zakrojona"). Dzięki temu LOW/MEDIUM/HIGH są samoobjaśniające się w miejscu użycia, zamiast polegać na tym, że użytkownik pamięta tabelę.
- Ważność, Wpływ, Wymiar, Lokalizacja znajdują się każdy w osobnej linii z wyrównanymi etykietami. Szczegóły zaczynają się w osobnej linii pod etykietą `Detail:`, dzięki czemu mogą naturalnie zawijać się.

### Zapisywanie raportu (zawsze)

**Każda ścieżka przez tę umiejętność utrwala raport i oznacza zmianę** — Triage now, Triage later i Done zapisują plik. To właśnie pozwala `/10x-archive` i `/10x-status` zobaczyć przegląd i utrzymuje poprawność `change.md.status`. Zrób to *przed* przedstawieniem opcji kontynuacji — nigdy warunkowo i nigdy tylko w gałęziach "save".

1. **Zapisz plik raportu** do `context/changes/<change-id>/reviews/impl-review.md` (lub `context/changes/<change-id>/reviews/impl-review-phase-N.md` dla przeglądu ograniczonego do fazy), używając poniższego formatu. Utwórz katalog `reviews/`, jeśli nie istnieje.
2. **Oznacz `change.md`**: ustaw `status: impl_reviewed` i `updated: <today>`. Raz, tutaj — niezależnie od tego, którą opcję kontynuacji wybierze użytkownik. (Jeśli pole `change.md` jest już `impl_reviewed`, po prostu odśwież `updated`.)
3. Jeśli użytkownik później przeprowadzi sortowanie, raport na dysku jest kopią roboczą: jego pola `Decision:` są aktualizowane na miejscu w miarę podejmowania decyzji dotyczących każdego ustalenia (Krok 5), a wszelkie dalsze działania "fix in plan/code" są kolejkowane do `context/changes/<change-id>/follow-ups/review-fixes.md`.

```markdown
<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: [Plan Title]

- **Plan**: [plan file path]
- **Scope**: Phase [N] of [Total]
- **Date**: YYYY-MM-DD
- **Verdict**: [APPROVED/NEEDS ATTENTION/REJECTED]
- **Findings**: [N critical] [N warnings] [N observations]

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS/WARNING/FAIL |
| Scope Discipline | PASS/WARNING/FAIL |
| Safety & Quality | PASS/WARNING/FAIL |
| Architecture | PASS/WARNING/FAIL |
| Pattern Consistency | PASS/WARNING/FAIL |
| Success Criteria | PASS/WARNING/FAIL |

## Findings

### F1 — SQL injection in auth handler

- **Severity**: ❌ CRITICAL
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/auth/handler.ts:42
- **Detail**: SQL query built with string concatenation. Plan specified parameterized queries.
- **Fix**: Replace the template literal with a parameterized query using db.query($1, [value]).
  - Strength: Matches pattern in src/users/query.ts; removes injection class.
  - Tradeoff: Minor — one call site, a few-line change.
  - Confidence: HIGH — identical pattern used elsewhere.
  - Blind spot: None significant.
- **Decision**: PENDING

### F2 — Unplanned /api/status endpoint

- **Severity**: ⚠️ WARNING
- **Impact**: 🔬 HIGH — architectural stakes; think carefully before deciding
- **Dimension**: Scope Discipline
- **Location**: src/api/routes.ts:18
- **Detail**: New GET /api/status endpoint not in plan.
- **Fix A ⭐ Recommended**: Document in the plan as an addendum
  - Strength: Preserves the work; updates source of truth.
  - Tradeoff: Plan becomes a slightly moving target.
  - Confidence: HIGH — addendum pattern used regularly here.
  - Blind spot: Original-scope stakeholders not notified.
- **Fix B**: Remove and add to follow-up work
  - Strength: Keeps scope discipline strict.
  - Tradeoff: Loses implemented work; another PR later.
  - Confidence: MEDIUM — depends on callers.
  - Blind spot: Haven't checked for callers.
- **Decision**: PENDING

### F3 — camelCase vs. snake_case

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/utils/format.ts
- **Detail**: Uses camelCase while existing utils use snake_case.
- **Fix**: Rename exports to snake_case to match src/utils/.
- **Decision**: PENDING
```

Znacznik `<!-- IMPL-REVIEW-REPORT -->` i pola `Decision: PENDING` umożliwiają tryb wznowienia.

### Opcje kontynuacji

Po zapisaniu raportu i oznaczeniu `change.md`, zapytaj, jak postępować:

Zapytaj użytkownika: "Review saved to <report-path>. How would you like to proceed?"
header: "Implementation Review — [N] findings"
options:
  - label: "Triage findings now"
    description: "Walk through each finding and decide. Decisions are written back to the saved report."
  - label: "Triage later"
    description: "Resume with /10x-impl-review <report-path>."
  - label: "Done"
    description: "Report saved — I'll handle the findings myself."
multiSelect: false

- **Triage findings now** → przejdź do Kroku 5; zapisany raport jest kopią roboczą.
- **Triage later** → wydrukuj ścieżkę zapisanego raportu i przypomnij o uruchomieniu `/10x-impl-review <report-path>`.
- **Done** → wydrukuj ścieżkę zapisanego raportu i ZATRZYMAJ.

Niezależnie od wyboru, plik raportu i znacznik `impl_reviewed` już istnieją na dysku — wybór decyduje jedynie o tym, czy sortowanie odbędzie się teraz, później, czy zostanie pozostawione użytkownikowi.

## Krok 5: Interaktywne sortowanie

Zaktualizuj zadanie: activeForm "Triage"

### Tryb wznowienia

Jeśli wejście nastąpiło przez zapisany plik: przeczytaj go, przeanalizuj nagłówki `### F`, filtruj do `Decision: PENDING`. Jeśli brak: "All findings triaged." Gotowe.

### Pętla sortowania

Przejdź przez ustalenia w kolejności ważności (CRITICAL → WARNING → OBSERVATION). Dla każdego:

**Z 2 opcjami naprawy:**
Zapytaj użytkownika: "F[N] — [title]\n\nSeverity: [sev icon] [SEV]\nImpact: [impact icon] [LEVEL] — [meaning]\nDimension: [dim]\nLocation: [loc]\n\nDetail: [detail]\n\n[Fix A block]\n\n[Fix B block]"
header: "Finding [current] of [total remaining]"
options:
  - label: "Apply Fix A ⭐"
    description: "[Fix A one-liner]"
  - label: "Apply Fix B"
    description: "[Fix B one-liner]"
  - label: "Skip"
    description: "Not worth fixing now."
  - label: "Record as lesson"
    description: "Save as a recurring project rule via /10x-lesson."
multiSelect: false

**Z 1 opcją naprawy:**
Zapytaj użytkownika: "F[N] — [title]\n\nSeverity: [sev icon] [SEV]\nImpact: [impact icon] [LEVEL] — [meaning]\nDimension: [dim]\nLocation: [loc]\n\nDetail: [detail]\n\n[Fix block]"
header: "Finding [current] of [total remaining]"
options:
  - label: "Fix now"
    description: "[Fix one-liner]"
  - label: "Fix differently"
    description: "Different approach — let's discuss."
  - label: "Skip"
    description: "Not worth fixing now."
  - label: "Record as lesson"
    description: "Save as a recurring project rule via /10x-lesson."
multiSelect: false

**Obsługa odpowiedzi:**
- **Apply Fix A/B / Fix now**: pokaż dokładną zmianę kodu przed/po. Krótkie potwierdzenie ("Apply this?"), a następnie edytuj kod. Oznacz FIXED (zapisz, która opcja, np. "Fixed via Fix A").
- **Fix differently**: zapytaj o preferowane podejście, zastosuj poprawkę, oznacz FIXED.
- **Record as lesson**: wstępnie wypełnij cztery pola wpisu lekcji bezpośrednio z ustalenia — `Context` z lokalizacji ustalenia, `Problem` ze szczegółów ustalenia, `Rule` i `Applies to` pozostaw jako puste miejsca do wypełnienia przez użytkownika. Pokaż proponowany wpis jako kompletny blok markdown i poproś użytkownika o edycję / potwierdzenie za pomocą Zapytaj użytkownika: ("Approve this entry?" / "Edit before saving" / "Cancel"). Po potwierdzeniu, dołącz wpis jako nową sekcję H2 do `context/foundation/lessons.md` — jeśli plik nie istnieje, utwórz go najpierw z tym kanonicznym 5-liniowym nagłówkiem (bez oddzielnego pliku szablonu; nagłówek jest osadzony tutaj):

  ```
  # Lessons Learned

  > Append-only register of recurring rules and patterns. Re-read at start by /10x-frame, /10x-research, /10x-plan, /10x-plan-review, /10x-implement, /10x-impl-review.

  ```

  Przepływ wstępnego wypełniania, a następnie potwierdzania jest kluczowym elementem UX; użytkownik musi zobaczyć cały proponowany wpis z wstępnie wypełnionymi Context/Problem i mieć możliwość edycji Rule i Applies-to przed dołączeniem. Po pomyślnym dołączeniu, **zawsze** zadaj pytanie uzupełniające za pomocą Zapytaj użytkownika: "Lesson saved. Also apply the fix to the current code?" z opcjami "Yes — fix now" / "No — lesson only". **Nigdy nie pomijaj tego pytania ani nie decyduj w imieniu użytkownika** — niezależnie od tego, czy poprawka jest trywialna, poza zakresem, czy obejmuje wiele plików, decyzja należy do użytkownika. Jeśli tak: pokaż zmianę kodu przed/po, zastosuj poprawkę, oznacz `FIXED + ACCEPTED-AS-RULE: <rule title>`. Jeśli nie: oznacz `ACCEPTED-AS-RULE: <rule title>` (ustalenie pozostaje nienaprawione, reguła jest zapisana do przyszłej pracy).
- **Skip** → SKIPPED. Idź dalej, nie kłóć się.
- **Inne (dowolny tekst)**: zinterpretuj intencję użytkownika. Typowe intencje: "fix differently" (zwłaszcza w kontekście podwójnej poprawki) → zapytaj o preferowane podejście, zastosuj poprawkę, oznacz FIXED; "accept risk" → oznacz ACCEPTED z uzasadnieniem użytkownika; "dismiss"/"disagree" → oznacz DISMISSED.

Po każdej decyzji, zaktualizuj pole `Decision:` w zapisanym raporcie dla tego ustalenia (raport zawsze istnieje na dysku — patrz Krok 4).

### Podsumowanie

```
═══════════════════════════════════════════════════════════
  TRIAGE COMPLETE
═══════════════════════════════════════════════════════════

  Fixed:     F1, F2 (Fix A)   (2)
  Rule:      F3 (+ fixed)     (1)
  Skipped:   F4               (1)
  Accepted:  F5               (1)

═══════════════════════════════════════════════════════════
```

Zaktualizuj zapisany raport o ostateczne decyzje. Oznacz zadanie przeglądu jako zakończone.

## Uwagi

- Jest to umiejętność **przeglądu**. Domyślnie analizuj i raportuj — dokonuj edycji tylko podczas sortowania, gdy użytkownik wyraźnie wybierze "Apply Fix" lub "Fix differently" dla konkretnego ustalenia.
- Bądź konkretny. "src/auth/handler.ts:42 — SQL query built with string concatenation, vulnerable to injection" — a nie "there might be a security issue somewhere".
- Nie oznaczaj preferencji stylistycznych, chyba że mają znaczenie. Jeśli kod działa i jest zgodny z planem, drobne różnice stylistyczne od istniejącego kodu są obserwacjami, a nie ostrzeżeniami.
- Jeśli sam plan był wadliwy (np. zaplanowano niebezpieczne podejście), oznacz to — ten przegląd wychwytuje również problemy z planem.
- Wpływ dotyczy **wysiłku decyzyjnego**, a nie **ważności**. Niski wpływ na ustalenie CRITICAL oznacza, że poprawka jest oczywista; wysoki wpływ na WARNING oznacza, że kompromis jest realny.
- Dwie opcje naprawy tylko wtedy, gdy istnieje prawdziwy kompromis. Nie wymyślaj alternatyw dla trywialnych poprawek.
- Podczas przeglądania pojedynczej fazy, nadal sprawdzaj, czy zmiany z tej fazy nie naruszyły założeń poprzednich faz. Fazy mogą na siebie oddziaływać.
- Podczas sortowania, utrzymuj tempo. Użytkownik już przeczytał raport.
- Podczas naprawiania, minimalne, ukierunkowane edycje. Nie refaktoryzuj otaczającego kodu ani nie "ulepszaj" rzeczy, które nie zostały oznaczone.
