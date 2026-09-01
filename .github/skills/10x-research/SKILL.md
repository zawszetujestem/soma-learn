---
name: 10x-research
description: Research codebase comprehensively using parallel sub-agents
---

# Badanie bazy kodu

Twoim zadaniem jest przeprowadzenie kompleksowego badania bazy kodu w celu udzielenia odpowiedzi na pytania użytkownika poprzez uruchomienie równoległych podagentów i syntezę ich ustaleń.

## Początkowa konfiguracja:

Po wywołaniu tego polecenia odpowiedz:

```
I'm ready to research the codebase. Please provide your research question or area of interest, and I'll analyze it thoroughly by exploring relevant components and connections.
```

Następnie poczekaj na zapytanie badawcze użytkownika.

## Kroki do wykonania po otrzymaniu zapytania badawczego:

1.  **Najpierw przeczytaj wszystkie bezpośrednio wymienione pliki:**
    *   Jeśli użytkownik wspomina o konkretnych plikach (tickets, docs, JSON), przeczytaj je W CAŁOŚCI najpierw (bez limitu/offsetu)
    *   **KRYTYCZNE**: Przeczytaj te pliki samodzielnie w głównym kontekście, zanim uruchomisz jakiekolwiek podzadania
    *   Przeczytaj `context/foundation/lessons.md`, jeśli jest obecny, i traktuj jego wpisy jako znane wzorce przy kształtowaniu obszarów badawczych — powtarzające się zasady już zaakceptowane przez zespół zawężają to, co warto ponownie zbadać.

2.  **Analizuj i dekomponuj pytanie badawcze:**
    *   Podziel zapytanie użytkownika na możliwe do skomponowania obszary badawcze
    *   Poświęć czas na dogłębne przemyślenie podstawowych wzorców, połączeń i implikacji architektonicznych, których użytkownik może szukać
    *   Zidentyfikuj konkretne komponenty, wzorce lub koncepcje do zbadania
    *   Twórz zadania badawcze, używając funkcji zarządzania zadaniami swojego asystenta kodowania AI, aby śledzić każdy obszar badawczy (pojawiają się one na pasku stanu użytkownika). Aktualizuj je w miarę ukończenia każdego obszaru.
    *   Rozważ, które katalogi, pliki lub wzorce architektoniczne są istotne

3.  **Wyjaśnij zakres badań, używając funkcji zadawania pytań swojego asystenta kodowania AI**:

    Po dekompozycji pytania badawczego poproś użytkownika o uzgodnienie zakresu i skupienia, zanim uruchomisz podagentów.

    **Zasady konstruowania pytań:**
    *   Każde pytanie powinno mieć 2-4 konkretne opcje (nie ogólnikowe)
    *   Dodaj jasny `description` do każdej opcji, wyjaśniający, co oznacza dla badań
    *   Zachowaj krótki `header` (maks. 12 znaków): "Scope", "Depth", "Focus"
    *   Użytkownik zawsze może wybrać "Other" dla swobodnego wprowadzania
    *   Pomiń ten krok, jeśli zapytanie badawcze jest jednoznaczne i ściśle określone

    **O co pytać** (wybierz 1-3 na podstawie zapytania):
    *   **Scope**: Jak szeroko szukać — tylko ta funkcja, czy także powiązane systemy?
    *   **Depth**: Ogólny przegląd vs. głęboka analiza architektoniczna
    *   **Focus areas**: Które konkretne aspekty są najważniejsze (wydajność, wzorce, historia, punkty integracji)
    *   **Output format**: Szybkie podsumowanie vs. kompleksowy dokument badawczy

    **Przykład** — dla niejednoznacznego zapytania, takiego jak "how does authentication work":
    Zapytaj użytkownika:
    - question: "How deep should this research go?"
      header: "Depth"
      options:
      - label: "Quick overview"
        description: "High-level flow, key files, entry points. ~10 min research."
      - label: "Detailed analysis"
        description: "Full architecture, edge cases, security considerations. Comprehensive doc."
      - label: "Specific question"
        description: "I have a focused question — I'll clarify what exactly I need."
        multiSelect: false
    - question: "Which aspects matter most?"
      header: "Focus"
      options:
      - label: "Architecture & patterns"
        description: "How it's structured, design decisions, conventions used."
      - label: "Integration points"
        description: "How it connects to other systems, API boundaries, data flow."
      - label: "History & evolution"
        description: "How it changed over time, past decisions from `context/changes/**/` and `context/archive/**/`."
        multiSelect: true

    Dla jasnego, określonego zapytania, takiego jak "find all files using the TaskCreate tool":
    *   Całkowicie pomiń pytanie użytkownika — zapytanie jest jednoznaczne.

4.  **Uruchom równoległe zadania podagentów dla kompleksowych badań:**
    *   Utwórz wielu agentów AI do równoczesnego badania różnych aspektów

    Wykorzystaj zdolność swojego asystenta kodowania AI do tworzenia równoległych podagentów:
    *   **Explore agent** (`subagent_type: "Explore"`) — szybkie wyszukiwanie plików/wzorców, analiza struktury kodu. Używaj do znajdowania plików, śledzenia ścieżek kodu, wyszukiwania wzorców.
    *   **general-purpose agent** (`subagent_type: "general-purpose"`) — głęboka analiza wymagająca czytania wielu plików i wieloetapowego rozumowania. Używaj do zrozumienia złożonych systemów.

    Uruchom 2-4 agentów równolegle w jednej wiadomości dla równoczesnego wykonania:
    *   Każdy skupiony na konkretnym wymiarze badawczym
    *   Żądaj konkretnych odniesień file:line w odpowiedziach
    *   Przykład: jeden Explore dla "find all files related to X", inny dla "find prior decisions about Y in `context/changes/**/` and `context/archive/**/`", ogólny dla "analyze how Z system works"

5.  **Poczekaj na ukończenie wszystkich podagentów i zsyntetyzuj ustalenia:**
    *   WAŻNE: Poczekaj na ukończenie WSZYSTKICH zadań podagentów, zanim przejdziesz dalej
    *   Skompiluj wyniki: priorytetowo traktuj ustalenia z bieżącej bazy kodu, użyj `context/changes/**/` i `context/archive/**/` jako uzupełniającego kontekstu historycznego
    *   Połącz ustalenia między komponentami z konkretnymi odniesieniami file:line
    *   Odpowiedz na pytania użytkownika konkretnymi dowodami i wzorcami architektonicznymi

6.  **Rozwiąż folder zmian i zbierz metadane dla dokumentu badawczego:**
    *   Określ change-id:
        *   Jeśli wywołano jako `/10x-research <change-id>` i `context/changes/<change-id>/` istnieje, użyj go.
        *   W przeciwnym razie utwórz kebab-case change-id z tematu i utwórz folder + `change.md` (odzwierciedlając semantykę `/10x-new`) przed zapisaniem.
        *   Odmów, jeśli rozwiązana ścieżka zaczyna się od `context/archive/` — wydrukuj: "This change is archived. Open a new change with `/10x-new` instead." i ZATRZYMAJ.
    *   Zaktualizuj `change.md`: ustaw `updated: <today>` i, tylko jeśli bieżący `status` to `new`, przejdź do `status: preparing`.
    *   Nazwa pliku: `context/changes/<change-id>/research.md` (pojedynczy artefakt na zmianę).
    *   Wygeneruj metadane wymienione poniżej dla frontmattera.

7.  **Wygeneruj dokument badawczy:**
    *   Użyj metadanych zebranych w kroku 5
    *   Ustrukturyzuj dokument z frontmatterem YAML, a następnie treścią:

        ```markdown
        ---
        date: [Current date and time with timezone in ISO format]
        researcher: [Researcher name]
        git_commit: [Current commit hash]
        branch: [Current branch name]
        repository: [Repository name]
        topic: "[User's Question/Topic]"
        tags: [research, codebase, relevant-component-names]
        status: complete
        last_updated: [Current date in YYYY-MM-DD format]
        last_updated_by: [Researcher name]
        ---

        # Research: [User's Question/Topic]

        **Date**: [Current date and time with timezone from step 5]
        **Researcher**: [Researcher name]
        **Git Commit**: [Current commit hash from step 5]
        **Branch**: [Current branch name from step 5]
        **Repository**: [Repository name]

        ## Research Question

        [Original user query]

        ## Summary

        [High-level findings answering the user's question]

        ## Detailed Findings

        ### [Component/Area 1]

        - Finding with reference ([file.ext:line](link))
        - Connection to other components
        - Implementation details

        ### [Component/Area 2]

        ...

        ## Code References

        - `path/to/file.py:123` - Description of what's there
        - `another/file.ts:45-67` - Description of the code block

        ## Architecture Insights

        [Patterns, conventions, and design decisions discovered]

        ## Historical Context (from prior changes)

        [Relevant insights from `context/changes/**/` and `context/archive/**/` with references]

        - `context/changes/<other-change>/plan.md` - Historical decision about X
        - `context/archive/YYYY-MM-DD-<other-change>/research.md` - Past exploration of Y

        ## Related Research

        [Links to other research artifacts under `context/changes/**/research.md` or `context/archive/**/research.md`]

        ## Open Questions

        [Any areas that need further investigation]
        ```

8.  **Dodaj permalinki GitHub (jeśli dotyczy):**
    *   Sprawdź, czy jesteś na gałęzi main lub czy commit został wypchnięty: `git branch --show-current` i `git status`
    *   Jeśli na main/master lub wypchnięty, wygeneruj permalinki GitHub:
        *   Pobierz informacje o repozytorium: `gh repo view --json owner,name`
        *   Utwórz permalinki: `https://github.com/{owner}/{repo}/blob/{commit}/{file}#L{line}`
    *   Zastąp lokalne odniesienia do plików permalinkami w dokumencie

9.  **Synchronizuj i przedstaw ustalenia:**
    *   Przedstaw zwięzłe podsumowanie ustaleń użytkownikowi
    *   Dołącz kluczowe odniesienia do plików dla łatwej nawigacji
    *   Zapytaj, czy mają dodatkowe pytania lub potrzebują wyjaśnień

10. **Obsługa pytań uzupełniających:**

    *   Jeśli użytkownik ma pytania uzupełniające, dołącz je do tego samego dokumentu badawczego
    *   Zaktualizuj pola frontmattera `last_updated` i `last_updated_by`, aby odzwierciedlić aktualizację
    *   Dodaj `last_updated_note: "Added follow-up research for [brief description]"` do frontmattera
    *   Dodaj nową sekcję: `## Follow-up Research [timestamp]`
    *   Uruchom nowych podagentów w razie potrzeby do dodatkowego dochodzenia
    *   Kontynuuj aktualizowanie dokumentu i synchronizowanie

## Ważne uwagi:

*   Używaj równoległych agentów AI dla efektywności — główny agent syntetyzuje, podagenci wykonują głębokie czytanie
*   Prompty podagentów powinny być specyficzne, tylko do odczytu, żądające odniesień file:line i wzorców użycia (nie tylko definicji)
*   Zawsze przeprowadzaj świeże badania bazy kodu; używaj `context/changes/**/` i `context/archive/**/` jako uzupełniającego kontekstu historycznego
*   Dokumenty badawcze powinny być samodzielne, zawierające ścieżki plików, numery linii, wzorce międzykomponentowe i kontekst czasowy
*   Łącz do permalinków GitHub, gdy to możliwe, dla stałych odniesień
*   **Określanie zakresu badań**: Użyj funkcji zadawania pytań swojego asystenta kodowania AI, aby wyjaśnić zakres/głębokość/skupienie przed uruchomieniem agentów, chyba że zapytanie jest już ścisłe i jednoznaczne
*   **Śledzenie postępów**: Użyj funkcji zarządzania zadaniami swojego asystenta kodowania AI na początku, aby utworzyć zadania obszarów badawczych i aktualizuj je, aby oznaczyć je jako ukończone — to daje użytkownikowi widoczny postęp na pasku stanu
*   **Czytanie plików**: Zawsze czytaj wymienione pliki W CAŁOŚCI (bez limitu/offsetu) przed uruchomieniem podzadań
*   **Krytyczna kolejność**: Dokładnie przestrzegaj numerowanych kroków
    *   ZAWSZE najpierw czytaj wymienione pliki, zanim uruchomisz podzadania (krok 1)
    *   ZAWSZE czekaj na ukończenie wszystkich podagentów, zanim zsyntetyzujesz (krok 5)
    *   ZAWSZE zbieraj metadane przed zapisaniem dokumentu (krok 6 przed krokiem 7)
    *   NIGDY nie zapisuj dokumentu badawczego z wartościami zastępczymi
*   **Spójność frontmattera**: Zawsze dołączaj frontmatter YAML, utrzymuj spójność pól w dokumentach, używaj snake_case dla pól wielowyrazowych, aktualizuj przy dodawaniu badań uzupełniających