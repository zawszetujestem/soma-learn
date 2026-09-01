<!-- BEGIN @przeprogramowani/10x-cli -->

## 10xDevs AI Toolkit - Moduł 2, Lekcja 4

Przygotuj się na trudniejszy strumień implementacji z **łańcuchem planowania opartym na badaniach**:

```
badania wewnętrzne (/10x-research) + badania zewnętrzne (exa.ai, Context7) -> /10x-plan -> /10x-implement -> sukces
```

Lekcja koncentruje się na rozróżnianiu badań wewnętrznych od zewnętrznych oraz wykorzystywaniu dowodów do wspierania decyzji planistycznych.

### Router zadań - Od czego zacząć

| Umiejętność | Kiedy jej używać |
| --- | --- |
| **Badania wewnętrzne (fokus lekcji)** | |
| `/10x-research <change-id>` | Potrzebujesz dowodów z istniejącej bazy kodu — wzorców, konwencji, punktów integracji lub istniejących implementacji. Uruchamia równoległe sub-agenty w repozytorium i zapisuje ustrukturyzowane wyniki do `research.md`. |
| **Badania zewnętrzne (fokus lekcji)** | |
| exa.ai | Potrzebujesz natywnego dla AI wyszukiwania w sieci w celu porównania bibliotek, najlepszych praktyk lub kontekstu ekosystemu, na które baza kodu nie może odpowiedzieć. |
| Context7 (`resolve-library-id` → `get-library-docs`) | Potrzebujesz aktualnej dokumentacji na żywo dla konkretnej biblioteki lub frameworka. Najpierw rozwiązuje ID biblioteki, a następnie pobiera odpowiednie strony dokumentacji. |
| **Kadrowanie koła zapasowego** | |
| `/10x-frame <change-id>` | Plan nie zbiega się, plan nie przynosi oczekiwanych rezultatów lub uporczywe odchylenia ciągle psują implementację. Użyj jako wyjścia awaryjnego dla oddzielnego problemu (pokazane na przykładzie Space Explorers), a nie jako rytuału przed badaniami. |
| **Planowanie i wykonanie** | |
| `/10x-plan <change-id>` / `/10x-implement <change-id> phase <n>` | Użyj tego samego łańcucha planowania i wykonania z Lekcji 2, teraz z dowodami z badań wstępnych zasilającymi plan. |

### Dyscyplina badawcza

- Badania wewnętrzne (`/10x-research`) odpowiadają na pytanie "co już robi nasza baza kodu?" — wzorce, schematy, konwencje, punkty integracji.
- Badania zewnętrzne (exa.ai, Context7) odpowiadają na pytanie "co powinniśmy zrobić?" — możliwości bibliotek, dokumentacja API, najlepsze praktyki ekosystemu.
- Połącz oba jako dowody do `/10x-plan`. Plan bez dowodów z badań w przypadku nietrywialnego strumienia jest zgadywaniem.
- Dokumentacja przyjazna agentom (`llms.txt`, markdown-for-agents, `/md` endpoints) jest sygnałem jakości przy wyborze bibliotek — biblioteki, które publikują dokumentację czytelną dla agentów, integrują się szybciej.

### `/10x-frame` jako koło zapasowe

Trzy wyzwalacze do sięgnięcia po `/10x-frame`:
1. Plan nie zbiega się — badania ciągle otwierają więcej pytań zamiast zawężać się do kontraktu.
2. Plan nie przynosi rezultatów — implementacja wielokrotnie nie spełnia kryteriów sukcesu.
3. Uporczywe odchylenia — implementacja ciągle odbiega od planu w sposób sugerujący, że problem został źle sformułowany.

Pokazane na przykładzie Space Explorers, a nie na ścieżce SRS. Jest to wyjście awaryjne, a nie obowiązkowy krok.

### Ścieżki używane w tej lekcji

- `context/changes/<change-id>/research.md` - wynik badań wewnętrznych
- `context/changes/<change-id>/frame.md` - wynik kadrowania, gdy jest potrzebny
- `context/changes/<change-id>/plan.md` - kontrakt implementacyjny oparty na dowodach
- `context/foundation/lessons.md` - powtarzające się zasady i pułapki

Umiejętności nie mogą zapisywać do `context/archive/`. Zarchiwizowane zmiany są niezmienne; jeśli rozwiązana ścieżka docelowa zaczyna się od `context/archive/`, przerwij z komunikatem: "This change is archived. Open a new change with `/10x-new` instead."

<!-- END @przeprogramowani/10x-cli -->
