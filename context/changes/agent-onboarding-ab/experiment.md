# Agent Instruction A/B Experiment

## Hipoteza

Bez lokalnej reguły agenci będą różnie lokować nową aplikację domenową i jej testy. Reguła w `AGENTS.md` powinna skierować każdą próbę do `apps/<nazwa>/`, z własnym `urls.py` i pakietem `tests/`.

## Zadanie

Zaproponuj układ plików dla nowej funkcji Django `learning_cycle`, uwzględniając routing i testy. Każda próba była izolowanym, read-only uruchomieniem agenta Explore.

## Próby bez reguły

| Próba | Lokalizacja aplikacji | Testy | Wynik względem docelowej konwencji |
|---|---|---|---|
| 1 | `learning_cycle/` w katalogu głównym | pakiet `tests/` | niezgodny |
| 2 | `learning_cycle/` w katalogu głównym | pakiet `tests/` | niezgodny |
| 3 | `learning_cycle/` w katalogu głównym | pojedynczy `tests.py` | niezgodny |

Zgodność pełna: 0/3. Spójność pakietu testów: 2/3. Każda próba zakończyła się w jednej iteracji.

## Minimalna reguła

Nowe funkcje domenowe trafiają do `apps/<nazwa>/`; każda aplikacja ma własny `urls.py` i pakiet `tests/` z plikami `test_*.py`. `soma_config/urls.py` tylko dołącza routing aplikacji.

Źródło: `AGENTS.md`, sekcja `Krytyczne reguły`.

## Próby z regułą

| Próba | Lokalizacja aplikacji | Testy | Wynik względem docelowej konwencji |
|---|---|---|---|
| 1 | `apps/learning_cycle/` | pakiet `tests/` | zgodny |
| 2 | `apps/learning_cycle/` | pakiet `tests/` | zgodny |
| 3 | `apps/learning_cycle/` | pakiet `tests/` | zgodny |

Zgodność pełna: 3/3. Spójność pakietu testów: 3/3. Każda próba zakończyła się w jednej iteracji.

## Wynik

Reguła poprawiła zgodność z ustaloną strukturą z 0% do 100% i usunęła rozbieżność `tests.py` kontra pakiet `tests/`. Reguła pozostaje w `AGENTS.md`.

Harness nie udostępnił czasu wykonania ani liczby tokenów dla poszczególnych prób, więc tych metryk nie porównano.