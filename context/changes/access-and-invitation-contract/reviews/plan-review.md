<!-- PLAN-REVIEW-REPORT -->
# Przegląd planu: Kontrakt ról i zaproszeń uczeń-mentor

- **Plan**: `context/changes/access-and-invitation-contract/plan.md`
- **Tryb**: Głęboki
- **Data**: 2026-09-01
- **Werdykt**: DO POPRAWKI
- **Ustalenia**: 1 krytyczne, 3 ostrzeżenia, 1 obserwacja

## Werdykty

| Wymiar | Werdykt |
|---|---|
| Zgodność ze stanem końcowym | ZALICZONY |
| Oszczędna realizacja | ZALICZONY |
| Dopasowanie architektoniczne | OSTRZEŻENIE |
| Martwe punkty | NIEZALICZONY |
| Kompletność planu | OSTRZEŻENIE |

## Ugruntowanie

Ugruntowanie: 5/5 ścieżek ✓, 3/3 symboli ✓, brief↔plan ✓. W bieżącym drzewie nie ma modeli, migracji ani bezpośrednich importów `auth.User`. Wprowadzenie własnego modelu użytkownika jest wykonalne przed pierwszymi danymi produktowymi.

Historia `origin/main` zawiera wcześniejszy backend Django 4.2 z własnym użytkownikiem, rolami i API auth. Użytkownik zdecydował, że aktualny lokalny projekt zastępuje tę architekturę w nowym commicie, a stary kod pozostaje dostępny w historii i gałęziach remote.

## Ustalenia

### F1 — Brak repozytorium Git

- **Waga**: KRYTYCZNE
- **Wpływ**: WYSOKI — rytuał wykonania faz nie może zapisać commitów ani SHA w `Progress`.
- **Wymiar**: Martwe punkty
- **Lokalizacja**: Prerekwizyty całego planu i rytuał `/10x-implement`
- **Szczegóły**: Katalog początkowo nie zawierał `.git`, ale zdalne repozytorium ma istniejącą historię na `main`.
- **Poprawka**: Podłączyć historię `origin/main`, zachować remote bez force-pusha i zapisać aktualne lokalne drzewo jako jawny commit zastępujący starą architekturę.
- **Decyzja**: W TRAKCIE — historia jest podłączona do `c66f99c`; oczekuje baseline commita.

### F2 — Wcześniejszy auth w historii ma inny kontrakt

- **Waga**: OSTRZEŻENIE
- **Wpływ**: ŚREDNI — ciche scalenie odtworzyłoby dwa niezgodne systemy tożsamości.
- **Wymiar**: Dopasowanie architektoniczne
- **Lokalizacja**: Historia `origin/main`, dawny `backend/users/`
- **Szczegóły**: Stary kod używa ról `student`, `mentor`, `owner`, `admin`, pozwala wybrać mentora przy rejestracji i implementuje social login. Aktualny kontrakt dopuszcza dwie role, nadaje mentora przez administratora i wyklucza OAuth z MVP.
- **Poprawka**: Nie scalać dawnego backendu do bieżącego drzewa. Zachować go wyłącznie w historii; nową implementację oprzeć na zatwierdzonym planie.
- **Decyzja**: NAPRAWIONE — użytkownik wybrał „lokalny projekt wygrywa”.

### F3 — Nieokreślone przejście zaproszenia do stanu expired

- **Waga**: OSTRZEŻENIE
- **Wpływ**: ŚREDNI — implementator musiałby wybrać między stanem wyliczanym a utrwalanym.
- **Wymiar**: Kompletność planu
- **Lokalizacja**: Phase 2 — modele i usługi cyklu życia
- **Szczegóły**: Plan deklaruje `expires_at` i stan `expired`, lecz nie określa źródła prawdy dla wygaśnięcia.
- **Poprawka**: Wybrać jedno źródło prawdy i przetestować granicę dokładnie w chwili `expires_at`.
- **Decyzja**: OCZEKUJĄCA

### F4 — Brak wykonywalnego sprawdzenia AUTH_USER_MODEL

- **Waga**: OSTRZEŻENIE
- **Wpływ**: NISKI — poprawka jest jednoznaczna i lokalna.
- **Wymiar**: Kompletność planu
- **Lokalizacja**: Phase 1 — kryteria sukcesu
- **Szczegóły**: Plan opisuje krytyczną kolejność ustawienia własnego użytkownika, ale kryteria fazy nie sprawdzają jawnie wartości `AUTH_USER_MODEL` przed migracją.
- **Poprawka**: Dodać automatyczny test ustawienia `accounts.User` oraz zależności swappable w pierwszej migracji `learning`.
- **Decyzja**: OCZEKUJĄCA

### F5 — Brak jasnej instrukcji awaryjnej dla starego wolumenu Compose

- **Waga**: OBSERWACJA
- **Wpływ**: NISKI — nie blokuje kodu, ale utrudnia diagnozę oczekiwanego błędu migracji.
- **Wymiar**: Martwe punkty
- **Lokalizacja**: Phase 3 — walidacja PostgreSQL
- **Szczegóły**: Compose uruchamia `migrate` bez sprawdzenia starego schematu. Plan wymaga ręcznej zgody na reset, lecz nie zapisuje dokładnej procedury po awarii.
- **Poprawka**: Dopisać ręczny krok `docker compose down --volumes` po potwierdzeniu, że wolumen zawiera wyłącznie dane developerskie, a następnie ponowić `docker compose up --build`.
- **Decyzja**: OCZEKUJĄCA

## Wynik sortowania

F2 rozwiązano przez świadome zastąpienie starej architektury. F1 oczekuje na baseline commit. F3–F5 wymagają małych poprawek planu przed ponownym werdyktem i implementacją.