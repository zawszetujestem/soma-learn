---
name: 10x-prd
description: >
  Generate context/foundation/prd.md from shape-notes.md (or raw notes) against
  the locked PRD schema. Auto-routes to greenfield (10 sections) or brownfield
  (11 sections) template based on context_type in shape-notes.md or cwd
  auto-detection. Use when the user has shaping notes ready and wants a
  schema-conformant PRD written to disk. Trigger phrases: "write the PRD",
  "generate PRD", "create the PRD from notes", "stwórz PRD", "turn notes into a
  PRD", "PRD from shape-notes". Use AFTER /10x-shape, not in place of it.
---

# PRD: Generowanie context/foundation/prd.md z shape-notes

Ta umiejętność jest drugim ogniwem w łańcuchu bootstrap. Dla greenfield: `/10x-shape → /10x-prd → 10x-tech-stack-selector → bootstrapper`. Dla brownfield: `/10x-shape → /10x-prd → 10x-stack-assess → 10x-health-check`. Jej jedyne zadanie: wziąć ustrukturyzowany plik notatek i wygenerować `context/foundation/prd.md`, który jest zgodny z zablokowanym schematem PRD, kierując każdą lukę do `## Open Questions` zamiast wymyślać treść.

Umiejętność automatycznie wybiera odpowiedni szablon na podstawie `context_type` w danych wejściowych:
- **greenfield** → 11-sekcyjny szablon PRD (produkt budowany od podstaw)
- **brownfield** → 12-sekcyjny szablon PRD (zmiana delta w istniejącym systemie)

Umiejętność jest **generatorem dokumentów**, a nie narzędziem ułatwiającym odkrywanie. NIGDY nie wymyśla decyzji domenowych, reguł logiki biznesowej, kryteriów sukcesu ani historyjek użytkownika. Wszystko, czego brakuje w danych wejściowych, trafia dosłownie do `## Open Questions`, aby człowiek mógł to rozwiązać.

Zablokowany schemat, do którego ta umiejętność się dostosowuje, znajduje się w `../10x-shape/references/prd-schema.md` (względem tego SKILL.md). Przeczytaj go przed wygenerowaniem jakiegokolwiek artefaktu i ponownie sprawdź wygenerowany plik pod jego kątem przed zapisaniem na dysku.

## Kiedy używać, kiedy pominąć

**Użyj, gdy**: użytkownik uruchomił `/10x-shape` (i `context/foundation/shape-notes.md` istnieje z blokiem checkpoint), LUB użytkownik ma plik surowych notatek, które chce przekształcić w projekt PRD, LUB użytkownik wyraźnie prosi o (ponowne) wygenerowanie `context/foundation/prd.md`.

**Pomiń, gdy**: użytkownik nadal pracuje nad pomysłami i nie ma notatek — najpierw wskaż `/10x-shape`. Pomiń również, gdy użytkownik chce *edytować* istniejący PRD ręcznie — ta umiejętność zapisuje całe pliki; edycje chirurgiczne są poza zakresem.

## Związek z innymi umiejętnościami

- `/10x-shape` — tworzy `shape-notes.md`, kanoniczne dane wejściowe. Zawsze preferowane jako upstream tej umiejętności.
- `10x-tech-stack-selector` — downstreamowy konsument `prd.md` dla **greenfield**. Odczytuje frontmatter na poziomie produktu jako priors i przeprowadza własny wywiad resztkowy dotyczący składu zespołu, preferencji językowych, wdrożenia i kształtu CI/CD.
- `10x-stack-assess` — downstreamowy konsument `prd.md` dla **brownfield**. Ocenia istniejący stos pod kątem przyjaznych dla agenta bram jakości.
- `/10x-frame`, `/10x-plan` — niezwiązane; PRD jest artefaktem bazowym, a nie planem dla każdej zmiany.

## Początkowa odpowiedź

Gdy ta umiejętność zostanie wywołana:

1. **Jeśli podano argument ścieżki** (np. `/10x-prd @notes/raw.md` lub `/10x-prd context/foundation/shape-notes.md`), przechwyć go jako ścieżkę wejściową. Przejdź do Kroku 1.
2. **Jeśli nie podano argumentu**, domyślnie ustaw ścieżkę wejściową na `context/foundation/shape-notes.md` i przejdź do Kroku 1. Nie pytaj jeszcze — Krok 1 obsługuje przypadek braku danych wejściowych.

## Proces

### Krok 1: Zlokalizuj dane wejściowe

Rozwiąż ścieżkę wejściową:

- Jeśli przekazano argument, użyj go dosłownie (usuń początkowe `@`, jeśli występuje).
- W przeciwnym razie, domyślnie ustaw na `context/foundation/shape-notes.md`.

Przetestuj rozwiązaną ścieżkę:

```bash
test -f "<resolved-path>"
```

Jeśli plik istnieje, przeczytaj go W CAŁOŚCI (bez `limit`/`offset`) i przejdź do Kroku 1.5.

Jeśli plik nie istnieje, zapytaj:

Zapytaj użytkownika: "Nie znaleziono pliku wejściowego pod adresem `<resolved-path>`. Jak chcesz postąpić?" z opcjami:
- "Najpierw uruchom /10x-shape (Zalecane)" (opis: "Zatrzymaj się tutaj. Uruchom /10x-shape, aby wygenerować shape-notes.md, a następnie ponownie wywołaj /10x-prd.")
- "Wklej surowe notatki" (opis: "Poczekam, aż wkleisz swoje notatki. Sprawdzenie cienkich danych wejściowych ostrzeże o brakujących sygnałach.")
- "Anuluj" (opis: "Wyjdź bez zmian.")

Po wybraniu "Najpierw uruchom /10x-shape": wydrukuj "Zatrzymywanie. Uruchom `/10x-shape`, aby wygenerować shape-notes.md, a następnie ponownie wywołaj `/10x-prd`." i ZATRZYMAJ.

Po wybraniu "Wklej surowe notatki": zapytaj "Wklej swoje notatki poniżej. Zakończ pustą linią." i przechwyć tekst użytkownika jako dane wejściowe w pamięci. Przejdź do Kroku 1.5 z tą treścią.

Po wybraniu "Anuluj": ZATRZYMAJ bez zmian.

### Krok 1.5: Określ typ kontekstu

Określ, czy wygenerować PRD greenfield czy brownfield:

1. **Jeśli dane wejściowe mają `context_type:` w frontmatter** — użyj tej wartości bezpośrednio. Nie jest wymagane potwierdzenie.
2. **Jeśli brak `context_type:` w frontmatter** (surowe notatki, wklejone dane wejściowe) — automatyczne wykrywanie z cwd:

   Użyj tego samego wielosygnałowego wykrywania co `/10x-shape` (Krok 0.7): sprawdź historię git (Poziom 1), pliki lock (Poziom 2), pliki manifestu (Poziom 3) i dodatkowe sygnały (katalogi źródłowe, konfiguracje frameworków). Każde trafienie Poziomu 1 lub Poziomu 2 → zaproponuj brownfield. Tylko Poziom 3 → zaproponuj brownfield z flagą niejednoznaczności. Brak sygnałów → zaproponuj greenfield.

   Potwierdź z użytkownikiem:

   Zapytaj użytkownika: "Nie znaleziono context_type w danych wejściowych. Na podstawie znaczników cwd, wygląda to na [greenfield|brownfield]. Zgadza się?" z opcjami:
   - "[Wykryty tryb] — poprawny (Zalecane)" (opis: "Wygeneruj PRD [greenfield|brownfield].")
   - "[Inny tryb] — nadpisz" (opis: "Zamiast tego wygeneruj PRD [inny].")

Zapisz rozwiązany `context_type` do użycia w Krokach 2 i 3. Przejdź do Kroku 2.

### Krok 2: Oceń dane wejściowe

Oceń dane wejściowe na podstawie heurystyki 0–4 dla ukształtowanych vs. cienkich. Każdy sygnał wnosi 1 punkt:

**Sygnały greenfield:**

1. **Obecny blok `checkpoint:` w frontmatter** — najsilniejszy sygnał, że pochodzi to z `/10x-shape`. Szukaj dosłownego klucza `checkpoint:` wewnątrz ogrodzenia YAML frontmatter na początku pliku.
2. **Co najmniej jedno wymaganie w formacie FR-NNN** — wyszukaj `^- FR-\d{3}: ` (linia z punktorami, trzycyfrowy indeks z zerami wiodącymi, dwukropek-spacja).
3. **Co najmniej jeden blok Given/When/Then** — wyszukaj `\*\*Given\*\*` ORAZ `\*\*When\*\*` ORAZ `\*\*Then\*\*` w dowolnym miejscu w treści.
4. **Jawne przechwytywanie logiki biznesowej** — sekcja `## Business Logic` istnieje ORAZ jej pierwsza niepusta linia to pojedyncze zdanie deklaratywne (heurystyka: ≤ 200 znaków, kończy się `.`, nie jest równe `# TODO: domain rule — see Open Questions` i nie jest puste/placeholder).

**Sygnały brownfield** (zastąp sygnał 1, gdy `context_type: brownfield`):

1. **Obecny blok `checkpoint:` w frontmatter ORAZ `context_type: brownfield`** — najsilniejszy sygnał, że pochodzi to z `/10x-shape` w trybie brownfield. Sprawdź również sekcję `## Current System` w treści.
2–4. Tak samo jak greenfield.

Oblicz sumę. Jawnie udokumentuj heurystykę w rozmowie, aby przyszły konserwator mógł ją dostroić:

```
Ocena danych wejściowych (heurystyka, 4 sygnały, 1 punkt każdy):
  [✓|✗] Blok checkpoint w frontmatter       — <znaleziono|brak>
  [✓|✗] Wymagania w formacie FR-NNN         — <znaleziono N FRs|brak>
  [✓|✗] Historyjki użytkownika Given/When/Then       — <znaleziono|brak>
  [✓|✗] Jawna jednowierszowa reguła biznesowa — <znaleziono|brak>

  Wynik: <N>/4
```

**Wynik ≥ 2**: dane wejściowe są wystarczająco ukształtowane; przejdź do Kroku 3 bezgłośnie.

**Wynik < 2**: wyzwól ostrzeżenie o cienkich danych wejściowych. Jawnie nazwij każdy brakujący sygnał (NIE drukuj ogólnego "twoje notatki są cienkie" — nazwij, czego brakuje i dlaczego to ma znaczenie):

```
Te dane wejściowe uzyskały <N>/4 w heurystyce kształtu. Brakujące sygnały:

  - <nazwa sygnału>: <jednowierszowa konsekwencja dla wygenerowanego PRD>
  - ...

PRD wygenerowane z cienkich danych wejściowych będzie miało wiele placeholderów `# TODO` i długą
sekcję `## Open Questions`. Jest to ważny stan pośredni, ale jeśli masz
czas, aby najpierw uruchomić /10x-shape, wynikowy PRD będzie znacznie silniejszy.
```

Następnie zapytaj:

Zapytaj użytkownika: "Jak chcesz postąpić?" z opcjami:
- "Najpierw uruchom /10x-shape (Zalecane)" (opis: "Zatrzymaj się tutaj. Użyj /10x-shape, aby uzupełnić brakujące sygnały, a następnie ponownie wywołaj /10x-prd.")
- "Kontynuuj mimo to" (opis: "Wygeneruj PRD z tego, co jest. Brakujące elementy trafiają dosłownie do ## Open Questions.")
- "Anuluj" (opis: "Wyjdź bez zmian.")

Po wybraniu "Najpierw uruchom /10x-shape": wydrukuj wiadomość o przekierowaniu i ZATRZYMAJ. Po wybraniu "Kontynuuj mimo to": kontynuuj do Kroku 3 z zapisanym `score < 2`, aby późniejsze kroki wiedziały, że należy spodziewać się TODO. Po wybraniu "Anuluj": ZATRZYMAJ.

### Krok 3: Generowanie PRD

Przeczytaj ponownie CAŁĄ referencję schematu (`../10x-shape/references/prd-schema.md`), aby potwierdzić, że lista pól i nazwy sekcji nie uległy zmianie.

Zbuduj zawartość PRD **najpierw w pamięci** (jeszcze nie na dysku):

#### 3a. Frontmatter

Wypełnij każde wymagane pole frontmatter zgodnie ze schematem:

- `project` — wyodrębnij z frontmatter wejściowego `project:` jeśli jest obecne; w przeciwnym razie z nagłówka tytułu (`# <Project>`); w przeciwnym razie `# TODO: project — see Open Questions`.
- `version` — `1` dla pierwszego PRD, które ta umiejętność zapisuje. Krok kolizji (Krok 4) zwiększa to, jeśli użytkownik wybierze zapis z wersjonowaniem.
- `status` — `draft`. Nigdy nie promuj do `reviewed`/`locked`; to decyzja downstream.
- `created` — dzisiejsza data w formacie `YYYY-MM-DD` (użyj polecenia shell, np. `date +%Y-%m-%d`).
- `context_type` — `greenfield` lub `brownfield` (z Kroku 1.5).
- `product_type` — pobierz z danych wejściowych, jeśli dostępne; w przeciwnym razie `# TODO: product_type — see Open Questions` (i dodaj wpis do Open Question).
- `target_scale`, `timeline_budget` — ta sama zasada. Jeśli dane wejściowe mają pole, skopiuj je dosłownie; jeśli nie, wygeneruj `# TODO: <field> — see Open Questions` i dodaj pasujące Open Question. Dla brownfield, `timeline_budget` używa `delivery_weeks` zamiast `mvp_weeks`.

**NIE wypełniaj** `team_profile`, `tech_preferences` ani `deployment_constraint` w frontmatter PRD, nawet jeśli notatki wejściowe je zawierają. Te pola są zbierane przez downstreamowy krok wyboru stosu technologicznego (greenfield) lub oceny stosu (brownfield), a nie przez PRD. Jeśli dane wejściowe je zawierają, podsumuj je w wiadomości przekazania z Kroku 5 w sekcji "forward to tech-stack/stack-assess", aby użytkownik wiedział, że treść jest przekazywana, a nie cicho pomijana — ale NIE generuj ich w frontmatter PRD.

Nazwy kluczy pól są nośne zgodnie ze schematem. Wartości pól nie są.

#### 3b. Wymagane sekcje (w kolejności schematu)

Lista sekcji zależy od `context_type`:

**Greenfield (10 sekcji):**

Wygeneruj dokładnie te 10 nagłówków poziomu `##`, w tej dokładnej kolejności (kontrakt nazwy sekcji schematu jest tym, na czym parsery downstream dzielą):

1. `## Vision & Problem Statement`
2. `## User & Persona`
3. `## Success Criteria` (z `### Primary` / `### Secondary` / `### Guardrails`)
4. `## User Stories`
5. `## Functional Requirements`
6. `## Non-Functional Requirements`
7. `## Business Logic`
8. `## Access Control`
9. `## Non-Goals`
10. `## Open Questions`

**Brownfield (11 sekcji):**

Wygeneruj dokładnie te 11 nagłówków poziomu `##`, w tej dokładnej kolejności:

1. `## Current System Overview` — co istnieje teraz: kluczowa architektura, stos technologiczny, baza użytkowników. Ta sekcja nie ma odpowiednika w greenfield; ustanawia punkt odniesienia, względem którego wszystkie kolejne sekcje opisują zmiany.
2. `## Problem Statement & Motivation` — co jest nie tak/brakuje, dlaczego teraz. Ujęte w ramy delty: skupia się na luce między stanem obecnym a pożądanym.
3. `## User & Persona` — kto jest dotknięty (istniejący użytkownicy + nowi, jeśli tacy są). Dla brownfield, podkreśl istniejących użytkowników, których doświadczenie się zmienia.
4. `## Success Criteria` (z `### Primary` / `### Secondary` / `### Guardrails`) — jak wiemy, że zmiana zadziałała. Guardrails powinny wyraźnie zawierać istniejące zachowanie, które nie może ulec regresji.
5. `## User Stories` — co zmienia się dla użytkownika. Ujęte w ramy delty: Given/When/Then opisuje nowe zachowanie, z wyraźnymi notatkami o tym, co było inne wcześniej.
6. `## Scope of Change` — co jest modyfikowane/dodawane/usuwane. Jawna delta: kategoryzuj każdy element jako `new`, `modified` lub `removed`. Zastępuje to domyślne założenie "wszystko jest nowe" z greenfieldowego `## Functional Requirements`.
7. `## Constraints & Compatibility` — kompatybilność wsteczna, migracja danych, istniejące integracje, zachowane zachowanie. Sekcja specyficzna dla brownfield, która jawnie określa zachowanie.
8. `## Business Logic Changes` — dodanie/modyfikacja reguł domenowych (nie pełny model domenowy). Jeśli zmiana dotyczy tylko infrastruktury (brak zmiany logiki domenowej), wyraźnie to zaznacz.
9. `## Access Control Changes` — zmiany uprawnień, jeśli takie są. Jeśli brak zmian, zaznacz: "No access control changes."
10. `## Non-Goals` — czego NIE zmieniamy. Krytyczne dla brownfield: jawnie nazywa aspekty istniejącego systemu, które są poza zakresem.
11. `## Open Questions`

**NIE generuj** sekcji `## Data Model`, `## Data Model Changes`, `## Implementation Decisions`, `## Testing Strategy` ani `## Deployment & CI/CD` w żadnym trybie — te kwestie nie są częścią schematu PRD. Encje i ich cykle życia wyłaniają się z FRs i User Stories i są ustalane podczas wyboru stosu / planowania implementacji, a nie w PRD. Jeśli notatki wejściowe zawierają treści dotyczące modelu danych lub implementacji, podsumuj je w wiadomości przekazania z Kroku 5 w sekcji "forward to technical-roadmap", aby użytkownik wiedział, że są przekazywane, a nie cicho pomijane — ale NIE generuj tych sekcji w PRD.

#### Zasady dotyczące treści sekcji (oba tryby)

Dla każdej sekcji:

- **Jeśli dane wejściowe zawierają pasującą treść** — przepisz ją wiernie do sekcji. Zachowaj sformułowania użytkownika. Konwertuj formatowanie tylko wtedy, gdy schemat wymaga określonego kształtu (np. format FR-NNN, Given/When/Then dla historyjek użytkownika, trójsekcyjne kryteria sukcesu). Nie parafrazuj, nie podsumowuj ani nie "ulepszaj" słów użytkownika.
- **Jeśli dane wejściowe zawierają częściową treść** — przepisz to, co jest, a następnie zakończ `# TODO: <czego brakuje> — see Open Questions` w sekcji i dodaj pasujący numerowany wpis pod `## Open Questions`.
- **Jeśli dane wejściowe nie zawierają pasującej treści** — wygeneruj tylko nagłówek plus `# TODO: <nazwa sekcji> — see Open Questions` i dodaj pasujący numerowany wpis pod `## Open Questions`.

Jeśli `/10x-shape` zapisał cytaty blokowe Sokratesa pod FRs, zachowaj je dosłownie — są one nośne dla przeglądu downstream.

Jeśli shape-notes.md zawierał blok `## Quality cross-check` (z Kroku 7 `/10x-shape`), odzwierciedl każdą lukę w `## Open Questions` jako numerowany wpis nazywający brakujący element i jego konsekwencję.

**Zasady dotyczące treści specyficzne dla brownfield:**

- FRs z `Change: preserved` stają się jawnymi elementami zachowania w `## Scope of Change`, a nie `## Non-Goals`.
- `## Current System Overview` mapuje z sekcji `## Current System` w shape-notes.
- `## Constraints & Compatibility` mapuje z sekcji `## Constraints & Preserved Behavior` w shape-notes.
- Konwencja ramowania delty: sekcje opisują, co się zmienia, a nie cały system. "Model autoryzacji dodaje Google OAuth obok istniejącego logowania e-mail" — a nie "System obsługuje logowanie e-mail i Google OAuth."

**Twarda zasada — nigdy nie wymyślaj**: jeśli dane wejściowe nie zawierają jednowierszowej reguły biznesowej, sekcja `## Business Logic` / `## Business Logic Changes` MUSI brzmieć `# TODO: domain rule — see Open Questions`, a Open Questions MUSZĄ zawierać "What is the one-sentence business rule? — TBD by user. Block: yes (PRD is hollow until resolved)." Nie pisz placeholderowej reguły. Nie "ekstrapoluj" reguły z rzeczowników encji pojawiających się w FRs lub User Stories. Cały sens tej umiejętności polega na ujawnianiu luk, a nie ich tuszowaniu.

Ta sama zasada dotyczy: kryteriów sukcesu, historyjek użytkownika, priorytetów FR, celów NFR, kontroli dostępu, non-goals. Jeśli nie ma tego w danych wejściowych, trafia do Open Questions.

#### 3c. Samokontrola przed zapisem

Przed zapisem na dysk, przeprowadź samokontrolę pod kątem listy wymaganych sekcji schematu ORAZ lintu na poziomie treści pod kątem wycieku technicznego:

**Sprawdzenia strukturalne:**

1. Przeanalizuj zawartość PRD w pamięci. Wyodrębnij każdy nagłówek `## `.
2. Porównaj z kanoniczną listą sekcji dla aktywnego `context_type` (10 dla greenfield, 11 dla brownfield). Zweryfikuj, czy WSZYSTKIE sekcje są obecne, w kolejności, z dokładną pisownią. PRD NIE MOŻE zawierać `## Data Model` ani `## Data Model Changes` — te sekcje zostały wycofane.
3. Zweryfikuj, czy frontmatter deklaruje wszystkie wymagane klucze zgodnie ze schematem (`project`, `version`, `status`, `created`, `context_type`, `product_type`, `target_scale`, `timeline_budget`).
4. Zweryfikuj, czy `## Success Criteria` zawiera podsekcje `### Primary`, `### Secondary`, `### Guardrails` (lub, jeśli brakuje, czy są oznaczone jako TODO z odpowiadającymi wpisami w Open Questions).

**Lint na poziomie treści pod kątem wycieku technicznego:**

5. Przeskanuj wszystkie treści sekcji poziomu `##` (z wyłączeniem brownfield `## Current System Overview`, gdzie dozwolone jest nazywanie istniejącego stosu) pod kątem tokenów wskazujących, że szczegóły implementacji wyciekły do PRD. Traktuj każde trafienie jako wyciek, chyba że jest to część dosłownego cytatu użytkownika, który jest wyraźnie kierowany do Open Questions:

   - **Nazwy dostawców / usług hostowanych**: `OpenRouter`, `Stripe`, `Auth0`, `Supabase`, `Firebase`, `Vercel`, `Cloudflare`, `AWS`, `GCP`, `Azure`, `OpenAI`, `Anthropic` itp. (dowolny produkt/usługa z nazwą własną).
   - **Notacja schematu / ORM**: `(FK)`, `nullable`, `_hash`, sufiksy kolumn `_at` przedstawione jako listy pól, `password_hash`, `cascade`, `soft-delete`, `hard-delete`, `migration`, `backfill`.
   - **Lokalizacja środowiska uruchomieniowego**: `client-side`, `server-side`, `on the edge`, `in the cache`, `in the worker`.
   - **Mechanizm egzekwowania**: `per IP`, `per user-agent`, `token bucket`, `rate-limit per <axis>`.
   - **Udogodnienie UI** (gdy używane do określenia NFR, a nie historyjki użytkownika): `spinner`, `progress bar`, `streaming response`, `modal`, `toast`.
   - **Transport / protokół**: `WebSocket`, `gRPC`, `GraphQL`, `REST endpoint`, `webhook`, `SSE`.
   - **Czasowniki implementacyjne w regułach domenowych**: "LLM robi X", "biblioteka SRS decyduje Y", "baza danych przechowuje Z" (nazywanie komponentu wykonującego regułę, zamiast stwierdzania reguły).

   Dla każdego trafienia, wygeneruj ustrukturyzowane ostrzeżenie. NIE przepisuj cicho — przerwij zapis, aby użytkownik mógł zobaczyć, co wyciekło.

Jeśli jakiekolwiek sprawdzenie strukturalne LUB lintu zakończy się niepowodzeniem, **przerwij zapis** i zgłoś:

```
Samokontrola generowania PRD NIE POWIODŁA SIĘ:

  Strukturalne:
    - Brakująca sekcja: <nazwa>
    - Sekcja poza kolejnością: <nazwa> (oczekiwana pozycja N, znaleziona pozycja M)
    - Brakujący klucz frontmatter: <klucz>
    - Obecna wycofana sekcja: <nazwa>

  Wyciek techniczny (lint treści):
    - <nazwa sekcji>: "<obraźliwe sformułowanie>" — <kategoria, np. nazwa dostawcy / notacja schematu / lokalizacja środowiska uruchomieniowego>
    - ...

PRD NIE zostało zapisane. W przypadku błędów strukturalnych: schemat i generator
rozjechały się — ponownie przeczytaj ../10x-shape/references/prd-schema.md i uzgodnij.
W przypadku błędów wycieku: notatki wejściowe zawierają szczegóły implementacji, których PRD
nie jest właścicielem. Albo (a) przepisz obraźliwe sformułowania jako obserwowalne z zewnątrz
właściwości / decyzje dotyczące zakresu i uruchom ponownie, albo (b) przenieś wyciekłą treść do
bloków `## Forward: ...` w shape-notes, aby umiejętność downstream ją skonsumowała.
```

Następnie ZATRZYMAJ. Nie przechodź do Kroku 4.

Jeśli wszystkie sprawdzenia przejdą, przejdź do Kroku 4 z zweryfikowaną treścią.

### Krok 4: Sprawdzenie kolizji

```bash
test -f context/foundation/prd.md
```

Jeśli plik nie istnieje, zapisz do `context/foundation/prd.md` i przejdź do Kroku 5.

Jeśli plik istnieje, zapytaj:

Zapytaj użytkownika: "context/foundation/prd.md już istnieje. Jak chcesz postąpić?" z opcjami:
- "Zapisz jako prd-vN.md (Zalecane)" (opis: "Zachowaj historię. Nowy PRD trafia do następnego dostępnego miejsca prd-vN.md. Niewersjonowany prd.md pozostaje niezmieniony.")
- "Nadpisz prd.md" (opis: "Zastąp istniejący prd.md. Poprzednia wersja zostanie utracona (chyba że ją zatwierdziłeś).")
- "Przerwij" (opis: "Wyjdź bez zapisów. Brak rozwiązania kolizji.")

Po wybraniu "Zapisz jako prd-vN.md": wybierz `N` skanując `context/foundation/` w poszukiwaniu plików pasujących do `prd-v*.md`. Traktuj niewersjonowany `prd.md` jako v1. Następne wolne miejsce to `N = (maksymalne istniejące N lub 1) + 1`. Zapisz zweryfikowaną treść do `context/foundation/prd-v<N>.md` i zwiększ pole `version:` w frontmatterze do `<N>`. Przejdź do Kroku 5.

Po wybraniu "Nadpisz prd.md": zapisz zweryfikowaną treść do `context/foundation/prd.md`. Zachowaj `version: 1` (nadpisywanie to zastąpienie, a nie nowa wersja). Przejdź do Kroku 5.

Po wybraniu "Przerwij": ZATRZYMAJ bez zapisów.

### Krok 5: Przekazanie

Po zapisie, podsumuj, co zostało wygenerowane:

```
═══════════════════════════════════════════════════════════
  PRD WYGENEROWANE
═══════════════════════════════════════════════════════════

  Projekt:          [projekt z frontmatter]
  Typ kontekstu:     [greenfield | brownfield]
  Ścieżka:             [context/foundation/prd.md | context/foundation/prd-vN.md]
  Sekcje schematu:  [11 / 11 | 12 / 12] obecne
  Frontmatter:      <K wypełnione, M jako TODO>  (łącznie 8 kluczy)
  Otwarte pytania:   <liczba> wpisów

  Sekcje w pełni wypełnione z danych wejściowych:
    - <lista nazw sekcji z nietrywialną treścią>

  Sekcje oznaczone jako TODO (patrz Otwarte pytania):
    - <lista nazw sekcji z placeholderami TODO>

═══════════════════════════════════════════════════════════
```

Następnie skopiuj polecenie następnego kroku do schowka i ogłoś:

**Greenfield:**

```bash
echo -n "/10x-tech-stack-selector" | pbcopy 2>/dev/null || echo -n "/10x-tech-stack-selector" | clip.exe 2>/dev/null || echo -n "/10x-tech-stack-selector" | xclip -selection clipboard 2>/dev/null || true
```

```powershell
# PowerShell (Windows)
Set-Clipboard "/10x-tech-stack-selector"
```

```
► Następny:   /10x-tech-stack-selector  (✓ skopiowano do schowka)

          Wybiera skład zespołu, preferencje językowe,
          listę technologii do unikania, cel wdrożenia i kształt
          potoku CI/CD. Żadne z nich nie są celowo w tym PRD —
          PRD opisuje produkt, następny krok opisuje,
          jak go zbudować.
```

**Brownfield:**

```bash
echo -n "/10x-stack-assess" | pbcopy 2>/dev/null || echo -n "/10x-stack-assess" | clip.exe 2>/dev/null || echo -n "/10x-stack-assess" | xclip -selection clipboard 2>/dev/null || true
```

```powershell
# PowerShell (Windows)
Set-Clipboard "/10x-stack-assess"
```

```
► Następny:   /10x-stack-assess  (✓ skopiowano do schowka)

          Ocenia istniejący stos pod kątem przyjaznych dla agenta
          bram jakości i tworzy plan kompensacji. Następnie,
          /10x-health-check audytuje zdrowie zależności, zestaw testów
          i pokrycie CI/CD. Żadne z nich nie są celowo w tym PRD —
          PRD opisuje CO się zmienia, następne kroki
          oceniają, CZY twój istniejący system jest gotowy.
```

Jeśli notatki wejściowe zawierały kwestie przyszłościowe (preferencje stosu technologicznego, notatki implementacyjne, wskazówki dotyczące wdrożenia), wymień je krótko, aby użytkownik wiedział, że są one kierowane do następnego kroku, a nie pomijane:

```
  Przekaż do następnego kroku (nie w PRD):
    • [jednowierszowe podsumowanie dla każdego wykrytego elementu]
```

Pomiń cały blok, jeśli dane wejściowe nie zawierały żadnych z tych elementów.

ZATRZYMAJ. Nie łącz się automatycznie z inną umiejętnością.

## Krytyczne zabezpieczenia

1. **Generator, nie autor.** Ta umiejętność zapisuje całe pliki z danych wejściowych, które użytkownik już zatwierdził. Nie wymyśla logiki biznesowej, kryteriów sukcesu, historyjek użytkownika ani priorytetów FR. Brakująca treść trafia dosłownie do `## Open Questions`. Sekcja `## Business Logic` w PRD jest najbardziej rygorystycznie kontrolowanym obszarem: jeśli w danych wejściowych nie ma jednowierszowej reguły, sekcja brzmi `# TODO: domain rule — see Open Questions`. Bez wyjątków.

2. **Schemat jest umową.** `../10x-shape/references/prd-schema.md` definiuje klucze frontmatter, nazwy sekcji i kolejność sekcji. Przeczytaj go ponownie przy każdym wywołaniu. Ponownie zweryfikuj PRD w pamięci pod jego kątem w Kroku 3c przed zapisem. Rozbieżność między tą umiejętnością a schematem to tryb awarii, któremu ta umiejętność ma zapobiegać.

3. **Otwartość stosu jest wiążąca — i szersza niż tylko nazwy stosów.** Zabronione słownictwo w wygenerowanym PRD obejmuje siedem kategorii, a nie tylko frameworki:

   - **Frameworki, bazy danych, platformy hostingowe, specyficzne biblioteki** — pierwotna zasada.
   - **Nazwy dostawców / usług hostowanych** — OpenRouter, Stripe, Auth0, Supabase, Firebase, Vercel, Cloudflare, AWS/GCP/Azure, OpenAI, Anthropic i każdy inny produkt lub usługa z nazwą własną.
   - **Notacja schematu / ORM** — listy na poziomie pól, `(FK)`, `nullable`, kolumny `_hash`, `password_hash`, `cascade-delete`, `soft-delete`, `hard-delete`, `migration`, `backfill`. (Encje pojawiają się naturalnie w FRs i User Stories; schemat na poziomie kolumn jest kwestią downstream.)
   - **Lokalizacja środowiska uruchomieniowego** — `client-side`, `server-side`, `on the edge`, `in the cache`, `in the worker`. PRD opisuje, co musi być prawdziwe na zewnętrznej granicy produktu, a nie gdzie w stosie jest to egzekwowane.
   - **Mechanizm egzekwowania** — `per IP`, `per user-agent`, `token bucket`, `rate-limit per <axis>`. NFR jest właściwością; mechanizm jest wyborem projektowym downstream.
   - **Udogodnienie UI w NFRs** — `spinner`, `progress bar`, `streaming response`, `modal`, `toast`. NFRs nazywają jakość obserwowalną przez użytkownika (np. "ciągła informacja zwrotna podczas długich operacji"); udogodnienie jest downstream.
   - **Transport / protokół** — `WebSocket`, `gRPC`, `GraphQL`, `REST endpoint`, `webhook`, `SSE`. PRD opisuje przepływ informacji tak, jak doświadcza go użytkownik, a nie format danych.

   Frontmatter PRD dotyczy tylko poziomu produktu (`product_type`, `target_scale`, `timeline_budget` + metadane); rodzina języków, frameworki, wdrożenie, profil zespołu i wszelkie listy technologii do unikania należą do kroku downstream (tech-stack-selector dla greenfield, stack-assess dla brownfield), a NIE do PRD. Jeśli dane wejściowe zawierają zabronione słownictwo, pozostaw je w blokach `## Forward: ...` w shape-notes, aby krok downstream je skonsumował — NIE tłumacz ich na frontmatter lub sekcje PRD. Wyjątek: brownfield `## Current System Overview` może nazywać istniejący stos i dostawców, ponieważ opisuje stan obecny, a nie wybór stosu. Lint treści z Kroku 3c mechanicznie egzekwuje to zabezpieczenie.

4. **Kolizje faworyzują historię.** Monit o kolizję zaleca zapis z wersjonowaniem (`prd-vN.md`) zamiast nadpisywania. Utracone poprzednie wersje to nieodwracalny tryb awarii; zduplikowany plik w `context/foundation/` nie jest.

5. **Samokontrola przerywa w przypadku rozbieżności.** Jeśli PRD w pamięci nie ma sekcji, ma sekcję w złej kolejności lub brakuje klucza frontmatter, zapis jest PRZERWANY — nie jest cicho poprawiany. Błąd nazywa konkretną rozbieżność, aby konserwator mógł uzgodnić schemat i umiejętność.

6. **Tylko uniwersalny język.** Brak odniesień do 10xDevs / kohorty / certyfikacji w jakichkolwiek danych wyjściowych dla użytkownika lub w jakimkolwiek artefakcie zapisanym na dysku. Umiejętność jest ogólnym generatorem PRD.

7. **Nigdy nie łącz automatycznie.** Przekazanie to ogłoszenie, a nie wywołanie. Użytkownik wybiera, kiedy (i czy) uruchomić następny krok (10x-tech-stack-selector dla greenfield, 10x-stack-assess dla brownfield). Automatyczne łączenie pominęłoby przegląd wygenerowanego PRD przez człowieka.

## Uwagi

- Jest to umiejętność **generatora dokumentów**. Wynikiem jest `context/foundation/prd.md` (lub `prd-vN.md`), kropka.
- Referencja schematu (`../10x-shape/references/prd-schema.md`) jest jedynym źródłem prawdy. Każda nazwa pola, nazwa sekcji lub klucz frontmatter, do którego odwołuje się ten tekst, MUSI istnieć w dokumencie schematu — jeśli nie, najpierw popraw dokument schematu.
- Heurystyka cienkich danych wejściowych (Krok 2) jest celowo konserwatywna. Fałszywe pozytywy (ostrzeżenie o ukształtowanych danych wejściowych) są możliwe do odzyskania za pomocą opcji "Proceed anyway"; fałszywe negatywy (ciche generowanie z cienkich danych wejściowych) tworzą puste PRD, które wprowadzają użytkownika w błąd. Dostosuj heurystykę tak, aby częściej ostrzegała, a nie mniej.
- Wzorzec `# TODO: <field-name> — see Open Questions` jest nośny. Narzędzia downstream (umiejętności przeglądu, 10x-tech-stack-selector / 10x-stack-assess) mogą wyszukiwać `^# TODO: `, aby zliczyć nierozwiązane luki i zdecydować, czy PRD jest gotowe do przeglądu.