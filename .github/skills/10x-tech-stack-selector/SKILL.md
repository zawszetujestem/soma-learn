---
name: 10x-tech-stack-selector
description: >
  Pick a starter and a stack for a greenfield project after the PRD is written.
  Reads context/foundation/prd.md, reasons over a language-aware starter
  registry with four agent-friendly quality gates, and writes the
  context/foundation/tech-stack.md hand-off. Use when the user asks "what
  stack should I use", "pick a stack", "choose framework",
  "co wybrać do projektu". Use AFTER /10x-prd, BEFORE /10x-bootstrapper.
---

# Selektor stosu technologicznego: Od PRD do startera

Ta umiejętność jest trzecim ogniwem w łańcuchu bootstrap (`/10x-shape → /10x-prd → 10x-tech-stack-selector → /10x-bootstrapper`). Jej jedyne zadanie: przekształcić napisany PRD w rekomendowany starter i małe, czytelne maszynowo przekazanie, które `/10x-bootstrapper` może odczytać, aby zainicjować projekt.

Umiejętność ta jest **narzędziem ułatwiającym podejmowanie decyzji w oparciu o wyselekcjonowany rejestr**, a nie silnikiem rekomendacji od podstaw. Odczytuje priorytetowe informacje z PRD, zadaje maksymalnie ~6 dodatkowych pytań na ścieżce niestandardowej (lub skraca drogę do sprawdzonej rekomendacji na ścieżce standardowej), analizuje karty starterów z uwzględnieniem języka w `references/starter-registry.yaml` i stosuje cztery twarde filtry jakości. Bogate uzasadnienie pozostaje w rozmowie; przekazanie pliku jest minimalne.

Rejestr starterów w `references/starter-registry.yaml` jest **jedynym źródłem prawdy** o dostępnych starterach. `/10x-bootstrapper` go odczytuje; walidator CI (`scripts/validate-starter-registry-sync.mjs`) zapobiega odwoływaniu się bootstrapper'a do `starter_id`, który nie istnieje.

## Kiedy używać, kiedy pomijać

**Użyj, gdy**: `context/foundation/prd.md` istnieje, a użytkownik jest gotowy do wyboru stosu. Frazy wyzwalające: "jakiego stosu powinienem użyć", "wybierz starter", "wybierz framework", "co wybrać", "w czym powinienem to zbudować", "czy możesz polecić stos". Użyj również, gdy użytkownik prosi o porównanie ("React vs Vue vs Svelte") z PRD na dysku — umiejętność wymusza ścieżkę niestandardową i analizuje warianty frameworków.

**Pomiń, gdy**: `context/foundation/prd.md` jest nieobecny — umiejętność odmawia i przekierowuje do `/10x-shape` + `/10x-prd`. Pomiń również, gdy użytkownik jest w trakcie implementacji istniejącej bazy kodu i pyta o dodanie biblioteki lub zastąpienie pojedynczej zależności — to jest obszar `/10x-frame`, a nie wybór stosu.

## Związek z innymi umiejętnościami

- `/10x-shape` — tworzy `shape-notes.md`, prekursora PRD. Dwa poziomy wyżej w łańcuchu.
- `/10x-prd` — tworzy `context/foundation/prd.md`, kanoniczne wejście. Zawsze wyżej.
- `/10x-bootstrapper` — konsument końcowy. Odczytuje frontmatter `context/foundation/tech-stack.md` i rejestr; tworzy szkielet projektu.

## Wymagane dane wejściowe

1. Plik PRD — istnieje, jest czytelny, zgodny ze schematem PRD (`/skills/10x-shape/references/prd-schema.md`). Domyślna lokalizacja: `context/foundation/prd.md`. Użytkownik MOŻE przekazać inną ścieżkę jako argument (patrz "Początkowa odpowiedź" poniżej). Umiejętność odczytuje **frontmatter** jako priorytety (`product_type`, `target_scale`, `timeline_budget`, `project`) i może odczytywać sekcje treści (`## Functional Requirements`, `## Non-Goals`) w celu audytu funkcji i wykrywania momentów sokratycznych, w których FR z PRD ujawniają funkcję, której rekomendowany starter nie zawiera.
2. `references/starter-registry.yaml` — dołączony do umiejętności. Ładowany w momencie podejmowania decyzji.
3. `references/residual-interview.md` — dołączony. Ładowany w czasie rozmowy.
4. `references/handoff-schema.md` — dołączony. Ładowany w czasie zapisu.
5. `references/agent-friendly-criteria.md` — dołączony. Ładowany w czasie filtrowania.
6. `references/decision-flow.md` — dołączony. Ładowany w czasie podejmowania decyzji.

## Początkowa odpowiedź

Gdy ta umiejętność zostanie wywołana:

1. **Jeśli podano argument ścieżki** (np. `/10x-tech-stack-selector @context/foundation/prd-v2.md` lub `/10x-tech-stack-selector path/to/prd.md`), usuń początkowe `@`, jeśli jest obecne, i użyj ścieżki dosłownie jako lokalizacji PRD dla tego uruchomienia.
2. **Jeśli nie podano argumentu**, domyślnie ustaw ścieżkę PRD na `context/foundation/prd.md`.

Przenieś rozwiązaną ścieżkę przez Krok 0; reszta przepływu pracy działa na niej jako `<prd-path>`.

## Przepływ pracy

### Krok 0 — Warunek wstępny PRD

Sprawdź warunek wstępny PRD względem rozwiązanej ścieżki:

```bash
test -f "<prd-path>"
```

Jeśli plik jest **nieobecny**, wykonaj dokładnie to i ZATRZYMAJ — bez wywiadu zastępczego, bez wbudowanego mini-PRD, bez czytania historii rozmów w poszukiwaniu zastępczych priorytetów:

```bash
echo -n "/10x-shape" | pbcopy 2>/dev/null || echo -n "/10x-shape" | clip.exe 2>/dev/null || echo -n "/10x-shape" | xclip -selection clipboard 2>/dev/null || true
```

```powershell
# PowerShell (Windows)
Set-Clipboard "/10x-shape"
```

Wydrukuj dosłownie (podstaw rozwiązaną ścieżkę; jeśli domyślna, to `context/foundation/prd.md`):

```
Tech-stack-selector wymaga PRD w `<prd-path>`. Najpierw uruchom `/10x-shape`, a następnie wywołaj ponownie.
```

Następnie ZATRZYMAJ. Kontekst rozmowy **nie** jest awaryjnym rozwiązaniem — nawet jeśli treść PRD była wcześniej omawiana na czacie, umiejętność wymaga pliku na dysku.

Jeśli plik jest **obecny**, przeczytaj go W CAŁOŚCI (bez `limit`/`offset`) i przejdź do Kroku 1.

### Krok 1 — Załaduj priorytety PRD

Przeanalizuj frontmatter PRD. Wyodrębnij:

- `project` → zasila `project_name` w przekazaniu (zmień na kebab-case dla przekazania, jeśli jeszcze nie jest w kebab-case).
- `product_type` → steruje wyszukiwaniem rozgałęzienia ścieżki Q0.
- `target_scale.users` → wagi priorytetów (mały/średni/duży/korporacyjny).
- `timeline_budget.mvp_weeks` → wagi priorytetów (krótkie terminy sprzyjają sprawdzonym + popularnym starterom).

Przeczytaj treść PRD w celu uzyskania kontekstu audytu funkcji: przeskanuj `## Functional Requirements` w poszukiwaniu funkcji wymuszających technologię (uwierzytelnianie, płatności, realtime, AI/LLM, zadania w tle, przechowywanie plików, i18n). Przedstaw je jako listę kontrolną później w Q1.

Powtórz priorytety użytkownikowi:

```
Priorytety PRD:
  Projekt:       <project>
  Typ produktu:  <product_type>
  Skala:         <target_scale.users>
  Oś czasu:      <timeline_budget.mvp_weeks> tygodni
                 (po godzinach: <timeline_budget.after_hours_only>)

  Wykryte sygnały funkcji z FR:
    - <funkcja> (FR-NNN)
    - ...
```

Zadaj jedno potwierdzenie:

Zapytaj użytkownika: "Czy te priorytety są poprawne, czy chcesz coś poprawić, zanim przejdziemy dalej?"
Opcje:
- "Poprawne — kontynuuj (Zalecane)": Kontynuuj z tymi priorytetami.
- "Popraw wartość": Asystent AI zapyta, które pole poprawić, a następnie zaktualizuje nadpisanie w pamięci (PRD na dysku pozostaje niezmieniony).
- "Zatrzymaj — najpierw napraw PRD": Wyjdź. Uruchom ponownie /10x-prd, aby naprawić priorytety, a następnie ponownie wywołaj /10x-tech-stack-selector.

Jeśli "Popraw wartość": zapytaj, które pole, przechwyć nadpisanie, kontynuuj z nadpisaniem zastosowanym tylko dla tej sesji.

### Krok 2 — Rozgałęzienie ścieżki Q0 + wywiad uzupełniający

Załaduj `references/residual-interview.md` i postępuj zgodnie z opisanym tam przepływem Q.

Wywiad ma dwie ścieżki:

- **Ścieżka standardowa** (domyślnie zalecana w Q0): użytkownik akceptuje sprawdzoną rekomendację dla swojej komórki `(product_type, language_family)`. Q1–Q3 i Q6 są pomijane. Q4 (wdrożenie), Q5 (CI/CD) i potwierdzenie nazwy projektu nadal działają; Q8 autotest jest pomijany (zalecana ścieżka jest sama w sobie bezpieczniejszym wyborem).
- **Ścieżka niestandardowa** (użytkownik decyduje się na własny projekt): pełne przejście Q1–Q6 plus warunkowe Q7 (runner testów) plus Q8 autotest przed przekazaniem.

Q0 wyprowadza `language_family` z jawnej treści PRD, jeśli jest obecna, w przeciwnym razie pyta raz w Q0 (frontmatter PRD nie zawiera `tech_preferences`). Mapa domyślnych rekomendacji na początku `references/starter-registry.yaml` rozwiązuje `(product_type, language_family) → starter_id`. Jeśli komórka ma sprawdzoną wartość domyślną, przedstaw ją po nazwie z jednowierszowym dopasowaniem i wartością `bootstrapper_confidence` startera. Jeśli komórka nie ma wartości domyślnej (mapa pokazuje `<none>`), wymuś ścieżkę niestandardową z jednowierszową notatką ("Brak sprawdzonej rekomendowanej wartości domyślnej dla `<product_type, language_family>`; przejdziemy przez pełny wywiad uzupełniający.").

Domyślna wartość Q0 jest **redakcyjna, a nie cicha**: nazwij rekomendowany starter z góry i poproś o wyraźne potwierdzenie. Użytkownik musi świadomie zaakceptować lub rozgałęzić — nigdy nie akceptować domyślnie bez pytania.

### Krok 3 — Zdecyduj

Załaduj `references/decision-flow.md` i `references/agent-friendly-criteria.md`. Załaduj `references/starter-registry.yaml` i odczytaj tylko karty istotne dla ograniczonego zestawu kandydatów (filtrowane według `language_family` i `product_type` zgodnie z krokiem A przepływu decyzji) — nie wszystkie 25 wpisów, aby obniżyć koszt promptu.

Wykonaj przepływ decyzji:

- **Ścieżka standardowa** — wybór `recommended_defaults` jest już wiodący; przejdź do Kroku E (wyświetl `bootstrapper_confidence`) i pomiń filtrowanie/punktację.
- **Ścieżka niestandardowa** — wykonaj Krok A (filtruj według `language_family` + `product_type` + funkcji obowiązkowych + zgodności wdrożenia), Krok B (usuń wpisy niespełniające żadnego kryterium `agent_friendly.*`, z zastrzeżeniem dla poszczególnych rodzin językowych), Krok C (analizuj pozostałe karty, ważąc `team_profile` + `tech_preferences` + `timeline_budget`), Krok D (wiodący + 1–2 alternatywy z `alternatives_to_consider`), Krok E (wyświetl `bootstrapper_confidence`).

Wyświetl wyzwania sokratyczne tam, gdzie przepływ decyzji to nakazuje: wariant frameworka Q6 na ścieżce niestandardowej, `tech_preferences` nazywa starter, który nie spełnia ≥1 bramki jakości, rekomendowany domyślny starter nie zawiera funkcji, którą użytkownik nazwał w FR PRD, lub wybrany starter ma `bootstrapper_confidence: best-effort` ORAZ użytkownik jest sam (dodatkowe ostrzeżenie).

Kształt danych wyjściowych rozmowy:

```
Rekomendacja: <starter_id> — <nazwa>
Pewność:     <verified | first-class | best-effort>

<jednopardowy uzasadnienie łączące priorytety PRD i odpowiedzi użytkownika z wiodącą kartą>

Alternatywy warte uwagi:
  - <starter_id_a> — <jednowierszowy kompromis>
  - <starter_id_b> — <jednowierszowy kompromis>

<jeśli podczas wywiadu podniesiono flagę (preferencja vs jakość, brak
 funkcji, ostrzeżenie o tarciu przy tworzeniu szkieletu): jednowierszowe podsumowanie tego, co się pojawiło,
 jak użytkownik to rozwiązał i czy kontynuuje z znanym
 stosem powodującym tarcie>
```

### Krok 4 — Zapisz przekazanie

Załaduj `references/handoff-schema.md`. Najpierw zbuduj zawartość przekazania w pamięci.

Rozwiąż `package_manager` z `toolchain.package_manager` wybranej karty. Pole jest otwartym ciągiem znaków (cokolwiek karta przepisuje — `npm`, `uv`, `poetry`, `bundle`, `gradle`, `cargo`, `go-modules`, `composer`, `dotnet` itp.); dla ekosystemów bez zewnętrznego wyboru (np. Go), karta może pominąć to pole, w takim przypadku pomiń je również we frontmatterze przekazania.

Rozwiąż `hints.deployment_target` z Q4. Jeśli użytkownik wybrał "Nie wiem jeszcze — wybierz dla mnie zalecaną wartość domyślną", użyj pierwszej wartości `deployment_default` karty (NIE dosłownego ciągu znaków `unspecified`).

Wypełnij `hints.path_taken`: `standard` lub `custom`. Wypełnij `hints.self_check_answers` 5 wartościami logicznymi z Q8, jeśli uruchomiono ścieżkę niestandardową; emituj `null`, jeśli wybrano ścieżkę standardową.

Sprawdź kolizję:

```bash
test -f context/foundation/tech-stack.md
```

Jeśli plik nie istnieje, zapisz `context/foundation/tech-stack.md` z zatwierdzoną zawartością.

Jeśli plik istnieje, zapytaj:

Zapytaj użytkownika: "context/foundation/tech-stack.md już istnieje. Jak chcesz postąpić?"
Opcje:
- "Nadpisz (Zalecane)": Zastąp istniejący tech-stack.md nowym wyborem. Poprzednia wersja zostanie utracona, chyba że zostanie zatwierdzona.
- "Zapisz jako tech-stack-v2.md": Zachowaj historię. Nowy wybór zostanie zapisany w następnym dostępnym miejscu tech-stack-vN.md.
- "Przerwij": Wyjdź bez zapisu. Uzasadnienie rozmowy zostanie zachowane tylko na czacie.

Zalecaną wartością domyślną jest tutaj "Nadpisz", ponieważ selektor stosu technologicznego jest jednorazową decyzją dla każdego projektu; wiele wersji jest zazwyczaj oznaką, że użytkownik ponownie rozważa, w takim przypadku utrata poprzedniego wyboru jest zamierzona. Zapis wersji jest wyjściem awaryjnym.

Po zapisaniu, skopiuj polecenie następnego kroku i ogłoś:

```bash
echo -n "/10x-bootstrapper" | pbcopy 2>/dev/null || echo -n "/10x-bootstrapper" | clip.exe 2>/dev/null || echo -n "/10x-bootstrapper" | xclip -selection clipboard 2>/dev/null || true
```

```powershell
# PowerShell (Windows)
Set-Clipboard "/10x-bootstrapper"
```

Wydrukuj:

```
═══════════════════════════════════════════════════════════
  WYBRANO STOS TECHNOLOGICZNY
═══════════════════════════════════════════════════════════

  Starter:        <starter_id>
  Wybrana ścieżka:     <standard | custom>
  Pewność:     <verified | first-class | best-effort>

  ► Przekazanie:  context/foundation/tech-stack.md
  ► Następny:      /10x-bootstrapper  (✓ skopiowano do schowka)
═══════════════════════════════════════════════════════════
```

ZATRZYMAJ. Nie łącz automatycznie z `/10x-bootstrapper` — użytkownik uruchamia go, gdy jest gotowy.

## Wynik

Zapisany pojedynczy plik: `context/foundation/tech-stack.md` (lub `tech-stack-vN.md`, jeśli wybrano zapis wersji).

Frontmatter kluczowany według schematu w `references/handoff-schema.md`:

```yaml
---
starter_id: <klucz z rejestru>
package_manager: <ciąg znaków przepisany przez kartę; może być pominięty dla niektórych ekosystemów>
project_name: <kebab-case>
hints:
  language_family: js | python | ruby | java | go | rust | php | dotnet | dart | multi
  team_size: solo | small | mixed
  deployment_target: <ciąg znaków przepisany przez starter>
  ci_provider: github-actions | gitlab-ci | circleci | cloudflare-builds
  ci_default_flow: auto-deploy-on-merge | manual-promotion
  bootstrapper_confidence: verified | first-class | best-effort
  path_taken: standard | custom
  quality_override: <bool>
  self_check_answers: <object | null>
  has_auth: <bool>
  has_payments: <bool>
  has_realtime: <bool>
  has_ai: <bool>
  has_background_jobs: <bool>
---

## Dlaczego ten stos

<jeden akapit, ≤ 200 słów>
```

## Referencje

- `references/starter-registry.yaml` — kanoniczne karty starterów + mapa `recommended_defaults`.
- `references/residual-interview.md` — rozgałęzienie ścieżki Q0 + przejście Q1–Q8.
- `references/handoff-schema.md` — kontrakt frontmatter `tech-stack.md`.
- `references/agent-friendly-criteria.md` — cztery bramki jakości + zastrzeżenie dla poszczególnych rodzin językowych.
- `references/decision-flow.md` — Kroki A–E dla obu ścieżek.

## Krytyczne zabezpieczenia

1. **PRD jest warunkiem wstępnym, a nie awaryjnym rozwiązaniem.** Brak wbudowanego mini-PRD, brak czytania rozmowy w poszukiwaniu zastępczych priorytetów. Plik na dysku jest umową.

2. **Domyślna wartość Q0 jest redakcyjna.** Nazwij rekomendację z góry; wymagaj wyraźnego potwierdzenia. Nigdy nie akceptuj domyślnie bez pytania.

3. **Ścieżka standardowa vs niestandardowa jest wiążąca.** Standardowa skraca drogę do rekomendacji + Q4/Q5/nazwy projektu. Niestandardowa uruchamia pełne przejście plus autotest Q8. Nie mieszaj ich — ścieżka wybrana przez użytkownika w Q0 jest tym, co rejestruje `hints.path_taken`.

4. **`bootstrapper_confidence` jest informacyjne, nigdy blokujące.** Pewność `best-effort` NIE wyklucza startera z rekomendacji; pojawia się w rozmowie jako ostrzeżenie i trafia do `hints.bootstrapper_confidence`, aby bootstrapper mógł się dostosować.

5. **Walidator jednokierunkowy.** Bootstrapper nie może odwoływać się do `starter_id` nieobecnego w rejestrze tej umiejętności; selektor stosu technologicznego może zawierać startery, których bootstrapper jeszcze nie podłączył (te startery mają `bootstrapper_confidence: best-effort`, dopóki nie zostaną zweryfikowane end-to-end).

6. **Tylko język uniwersalny.** Brak prywatnych ścieżek skarbca lub brandingu specyficznego dla organizacji w dostarczanej treści. `pnpm validate:no-vault-paths` wymusza to w CI. Rejestr domyślnych rekomendacji jest z założenia wielojęzyczny; żaden pojedynczy starter nie jest "tą" rekomendowaną ścieżką.

7. **Wewnętrzne etykiety umiejętności pozostają wewnętrzne.** Rozmawiając z użytkownikiem, nigdy nie odwołuj się do numerów Q (`Q0`, `Q3`, `Q6`), liter kroków (`Krok A`, `Krok B`, …, `Krok E`) ani fraz autora, takich jak "rozgałęzienie ścieżki", "wywiad uzupełniający", "moment sokratyczny", "przepływ decyzji". Te etykiety organizują dokumentację referencyjną do nawigacji w czasie wykonywania; użytkownik nie ma możliwości ich mapowania na cokolwiek widocznego. Przetłumacz na prosty język przed wydrukowaniem — "ten wybór" zamiast "rozgałęzienia ścieżki", "pytanie o framework" zamiast "Q6", "alternatywa warta uwagi" zamiast "momentu sokratycznego", "pominę pytania o audyt funkcji, profil zespołu i preferencje technologiczne" zamiast "pominę Q1–Q3". To samo dotyczy wewnętrznych ścieżek pól w rozmowie: `hints.deployment_target` / `agent_friendly.typed` / `bootstrapper_confidence` to nazwy pól w przekazaniu / rejestrze, a nie frazy do powiedzenia użytkownikowi — "twój cel wdrożenia", "czy stos używa jawnych typów", "jak płynne będzie tworzenie szkieletu" to tłumaczenia skierowane do użytkownika.