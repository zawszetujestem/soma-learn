---
name: 10x-test-plan
description: >
  Stateful, phased test-rollout orchestrator for existing products. Writes
  context/foundation/test-plan.md, then drives each rollout phase through
  /10x-new → /10x-research → /10x-plan → /10x-implement; re-running resumes
  from the next pending phase. Trigger phrases: "create test plan", "test
  strategy", "phased test rollout", "QA spec", "stwórz plan testów",
  "strategia jakości". Use AFTER /10x-prd and /10x-roadmap. Brownfield only.
---

# 10x Plan Testów — Stanowy Orchestrator Wdrażania Fazowego

Ta umiejętność tworzy i zarządza plikiem `context/foundation/test-plan.md` jako **fazową strategią wdrażania**, a następnie uruchamia jedną fazę wdrażania na raz w łańcuchu 10x zmiany/badania/planowania/implementacji. Przewodnik zaczyna się jako *plan* faz — każda faza ostatecznie otwiera swój własny folder `context/changes/<change-id>/` i wypełnia sekcje podręcznika (§6) w miarę realizacji. Umiejętność jest **stanowa**: każde wywołanie ponownie określa bieżący stan, sprawdzając, które artefakty istnieją, i wznawia od następnej oczekującej fazy wdrażania. **Nie** wymusza powrotu do `/10x-test-plan` po każdym kolejnym etapie. Po otwarciu zmiany wdrożeniowej, ustalony proces to badanie → planowanie → implementacja: po każdej głównej fazie, sugeruj następne naturalne polecenie, chyba że istnieje wyraźna blokada, korekta lub decyzja, która należy z powrotem do `/10x-test-plan`.

`$ARGUMENTS`:

- **pusty** → określ stan i wykonaj następny oczekujący krok.
- **jedna lub więcej ścieżek** → źródła kontekstu dla Fazy 1 (PRD, notatki zakresowe, briefy). Usuń początkowe `@`, jeśli występuje.
- **`--status`** → wydrukuj status wdrażania (gdzie jesteśmy, co dalej) bez wykonywania żadnej pracy.
- **`--refresh`** → otwórz nową zmianę `test-plan-refresh-<RRRR-MM-DD>`, aby zaktualizować istniejący przewodnik; nie edytuje przewodnika na miejscu.

## Maszyna stanów

Każde wywołanie uruchamia to drzewo decyzyjne. Każdy stan odpowiada na pytanie „który plik jest teraz brakujący”:

1. **Faza 0 — Warunki wstępne + wykrywanie stanu (zawsze działa).** Sprawdź znacznik projektu, rozgałęź się na flagach `--status`/`--refresh`, a następnie sprawdź, czy istnieje `context/foundation/test-plan.md`.
2. **Jeśli przewodnik BRAKUJE**, uruchom ścieżkę zapisu od początku do końca:
   - Faza 1: Odkrycie (odczyt źródeł, skanowanie hot-spotów, profil bazy testowej).
   - Faza 2: Wywiad z użytkownikiem.
   - Faza 3: Synteza briefu początkowego.
   - Faza 4: Napisz fazowy `test-plan.md`.
   - Następnie przejdź do Fazy 5.
3. **Jeśli przewodnik ISTNIEJE** (lub został właśnie napisany), przejdź do Fazy 5: przeczytaj przewodnik i znajdź pierwszą fazę wdrażania, której status nie jest `complete` — to jest bieżąca faza wdrażania.
4. **Faza 6 — Określ podstan dla bieżącej fazy wdrażania i przedstaw następne przekazanie**, na podstawie tego, które artefakty istnieją na dysku:
   - brak folderu zmiany → `/10x-new`
   - tylko `change.md` → `/10x-research`
   - `+ research.md` → `/10x-plan`
   - `+ plan.md` z oczekującymi elementami postępu → `/10x-implement`
   - `+ plan.md` w pełni ukończony → oznacz fazę wdrażania jako `complete` w §3 i przejdź dalej (wróć do Fazy 5).
5. **Przekazanie** — skopiuj następne wywołanie do schowka, powiedz użytkownikowi, aby `/clear` i uruchomił je, a następnie ZATRZYMAJ.

Każde przekazanie jest **punktem ZATRZYMANIA** dla tej umiejętności. Użytkownik `/clear` i uruchamia zakolejkowane wywołanie. Po każdej głównej fazie, ukończona faza powinna sugerować następne naturalne polecenie w procesie badanie → planowanie → implementacja. Uruchom ponownie `/10x-test-plan` tylko wtedy, gdy etap podrzędny zgłasza korekty planu testów, faza wdrażania jest zakończona i należy wybrać następną fazę, lub użytkownik chce `--status` / `--refresh`.

## Zasady nośne

Trzy zasady, których przestrzega każde wywołanie; wszystkie trzy znajdują się w §1 artefaktu.

1. **Koszt × sygnał.** Każdy test, który dodaje wdrożenie — klasyczny lub natywny dla AI — musi odpowiedzieć na jedno pytanie: *jaki jest najtańszy test, który daje prawdziwy sygnał dla tego ryzyka?* Nie promuj do e2e, ponieważ "czuje się bezpieczniej"; nie nakładaj modelu wizyjnego na deterministyczną różnicę, która już wykrywa regresję. Przekaż to do `/10x-plan` dla każdej fazy wdrożenia.

2. **Obawy użytkowników są dowodem.** Ryzyka, przez które zespół przeszedł, mają taką samą wagę jak linie PRD lub dane hot-spotów.

3. **Sygnał, nie wiedza.** Ta umiejętność odczytuje bazę kodu w poszukiwaniu *sygnału* — zmian hot-spotów, profilu bazy testowej, znacznika projektu, języka/frameworka. **Nie** odczytuje w poszukiwaniu *wiedzy* — grafu wywołań, schematów, tłumaczenia błędów, która linia jest odpowiedzialna za awarię. Mapa ryzyka w §2 cytuje dowody (linie PRD, odpowiedzi z wywiadów, katalogi hot-spotów); nigdy nie twierdzi, że plik jest "miejscem, gdzie występuje awaria". Ten punkt zakotwiczenia jest wynikiem `/10x-research`, produkowanym podczas każdej fazy wdrożenia. Umiejętność jest **autorem i weryfikatorem specyfikacji QA**, a nie audytorem kodu.

   Konsekwencja operacyjna: gdy skan hot-spotów wskazuje `src/lib/foo/` jako główny katalog, §2 może cytować "katalog hot-spotów `src/lib/foo/` — 12 commitów/30 dni" jako *dowód prawdopodobieństwa*. Nie może cytować "kotwica: `src/lib/foo/bar.ts`" — graf wywołań w tym katalogu jest niezweryfikowany, dopóki nie zostanie przeprowadzone badanie.

## Kiedy używać, kiedy pominąć

**Użyj, gdy** projekt ma co najmniej PRD lub kilka zarchiwizowanych wycinków, a użytkownik zamierza zainwestować w testy.

**Pomiń, gdy**:

- brak PRD, roadmapy i zaimplementowanego kodu (najpierw uruchom `/10x-shape` → `/10x-prd`);
- użytkownik chce dodać **jeden** test do pojedynczego pliku — to jest obszar `/10x-tdd`, a nie wdrożenie;
- użytkownik chce skonfigurować hooki, MCP lub CI YAML w izolacji — mogą one stać się fazami wdrożenia, ale samodzielne zadanie konfiguracji to inna umiejętność.

## Związek z innymi umiejętnościami

| Umiejętność              | Rola                                                                                   |
|--------------------|----------------------------------------------------------------------------------------|
| `/10x-shape`, `/10x-prd`, `/10x-roadmap` | Upstream. Tworzy PRD/roadmap, które konsumuje odkrycie.      |
| `/10x-stack-assess` | Upstream (brownfield). Identyfikuje istniejącą bazę testową.                             |
| `/10x-new` → `/10x-research` → `/10x-plan` → `/10x-implement` | Łańcuch downstream, wywoływany raz na fazę wdrożenia. `/10x-test-plan` uruchamia łańcuch; po każdej głównej fazie, aktywna umiejętność downstream sugeruje następne naturalne polecenie w ustalonym procesie badanie → planowanie → implementacja, chyba że jest zablokowana. `/10x-research` jest **powierzchnią ekstrakcji wiedzy** — odczytuje kod, śledzi grafy wywołań i tworzy kotwice plik:linia, które ten plan celowo pomija. |
| `/10x-tdd`         | Siostrzana. Odczytuje podręcznik (§6) podczas dodawania pojedynczego testu.                            |

---

## Faza 0 — Warunki wstępne + wykrywanie stanu (zawsze działa)

Ta faza uruchamia się przy każdym wywołaniu.

### Krok 0.1 — Wykryj znacznik projektu

Potwierdź, że jest to prawdziwy katalog główny projektu, znajdując jego manifest ekosystemu w sposób odpowiedni dla repozytorium — nie ma ustalonego polecenia. Poszukaj w pobliżu katalogu głównego konwencjonalnych znaczników dla danego stosu (np. `package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, `Gemfile`, `composer.json`, `*.csproj`, `pubspec.yaml` lub odpowiedników frameworków). PRD w `context/foundation/` również liczy się jako prawidłowy punkt początkowy.

Jeśli nie znaleziono znacznika projektu, wydrukuj:

```
No project markers found in the current directory. /10x-test-plan needs an
existing project (or at least a PRD). If you're at the idea stage, run
/10x-shape and /10x-prd first.
```

…i ZATRZYMAJ.

### Krok 0.2 — Rozgałęź na `--status` / `--refresh`

- **`--status`**: przeczytaj przewodnik, jeśli istnieje, wydrukuj tabelę statusu wdrożenia (nazwa fazy → status → folder zmiany, jeśli istnieje) i ZATRZYMAJ bez wykonywania pracy. Przydatne, gdy użytkownik nie jest pewien, gdzie skończył.
- **`--refresh`**: przejdź do ścieżki odświeżania (koniec tej umiejętności). Nie modyfikuje istniejącego przewodnika na miejscu.

### Krok 0.3 — Sprawdź, czy przewodnik istnieje

```bash
test -f context/foundation/test-plan.md && echo "EXISTS" || echo "MISSING"
```

- **MISSING** → przejdź do Fazy 1 (pełne odkrycie → napisz przewodnik).
- **EXISTS** → przejdź do Fazy 5 (przeczytaj przewodnik, określ bieżącą fazę wdrożenia, przekaż).

To jest nośna gałąź. Wszystko poniżej zależy od jej poprawności, więc zawsze jawnie sprawdzaj istnienie pliku; nigdy nie wnioskuj z wcześniejszej historii rozmów.

---

## Faza 1 — Odkrycie (tylko gdy brakuje przewodnika)

Przeczytaj, co istnieje; nie wymyślaj. Dla każdego wejścia, zapisz ścieżkę pliku, którą faktycznie przeczytałeś; jeśli fakt pojawia się w briefie początkowym lub przewodniku, musi on odwoływać się do jednego z nich.

### Źródła do odkrycia (pomiń brakujące)

Jawne ścieżki z `$ARGUMENTS` są **zawsze odczytywane**, niezależnie od tego, gdzie się znajdują. Poniższe wartości domyślne są przeszukiwane tylko wtedy, gdy nie zostały już dostarczone za pomocą argumentów.

| Źródło | Domyślna ścieżka | Co wyodrębnić |
|---|---|---|
| Dokumenty typu PRD | `context/foundation/prd.md` + ścieżki dostarczone w argumentach | Użytkownicy, główne przepływy, cele nieobjęte zakresem, zasady biznesowe, zależności, metryka sukcesu |
| Mapa drogowa | `context/foundation/roadmap.md` + mapa drogowa dostarczona w argumentach | Nadchodzące wycinki, co jest "następne" (zwiększa prawdopodobieństwo) |
| Zarchiwizowane wycinki | `context/archive/*/plan.md` + plany wycinków dostarczone w argumentach | Co zostało już zaimplementowane (bieżąca powierzchnia ryzyka) |
| Stos technologiczny | `context/foundation/tech-stack.md` + notatka o stosie dostarczona w argumentach, LUB wykryj za pomocą manifestu | Język, framework, środowisko uruchomieniowe, używany już runner testów |
| Briefy / notatki zakresowe | tylko dostarczone w argumentach — brak ustalonej wartości domyślnej | Ograniczenia, cele nieobjęte zakresem, wskazówki dotyczące ryzyka, które nigdy nie trafiły do PRD |
| Istniejące AGENTS.md / CLAUDE.md | katalog główny repozytorium | Twarde zasady i konwencje, które ograniczają wybory testowe |
| Istniejąca konfiguracja testowania | `vitest.config.*`, `jest.config.*`, `playwright.config.*`, `pytest.ini`, itp. | Jaka infrastruktura testowa już istnieje |
| Narzędzia MCP sesji | lista narzędzi bieżącego hosta/sesji | Dokumenty/wyszukiwanie MCP, które mogą ugruntować rekomendacje wrażliwe na stos |

### Odczytaj źródła

Najpierw odczytaj jawne `$ARGUMENTS`, a następnie odpowiednie wartości domyślne, które nie zostały jeszcze objęte argumentem. Użyj równoległych odczytów lub podagentów, gdy host sprawia, że jest to tanie, ale zachowaj tę samą umowę wyjściową dla każdego źródła:

1. **Typ źródła** — typu PRD, mapa drogowa, stos technologiczny, zarchiwizowany wycinek, brief, zasady AGENTS, konfiguracja testów lub inne.
2. **2–4 fakty istotne dla ryzyka** — scenariusze awarii, które źródło implikuje.
3. **Twarde ograniczenia** — zasady "nie wolno", blokady frameworków, linie zgodności.
4. **Uczciwe luki** — jeśli źródło jest puste/nie na temat/cienkie, powiedz to wyraźnie.

Zwróć zwięzłe notatki z cytatami `path:line`. **Nie** deleguj Fazy 3 (synteza briefu).

### Profil bazy testowej (zawsze działa)

Przed otwarciem wywiadu, zbuduj jednowierszową intuicję istniejącej bazy testowej, aby Faza 2 nie zadawała pustych pytań ("co wydaje się niedostatecznie przetestowane?" to nonsens, gdy nic nie jest testowane). Sklasyfikuj projekt do jednego z trzech kubełków.

Wykryj bazę testową w sposób odpowiedni dla stosu, który faktycznie znalazłeś w Fazie 1 — nie ma ustalonego polecenia. Użyj rzeczywistej konfiguracji runnera testów projektu i konwencji plików testowych (np. konfiguracje `vitest`/`jest`/`playwright` i `*.test.*`/`__tests__/` dla JS-TS; `pytest`/`pyproject.toml` i `test_*.py` dla Pythona; `*_test.go` dla Go; odpowiedniki frameworków w innych przypadkach) i wyklucz katalogi dostawców/kompilacji. Cel to dwa fakty: czy istnieje konfiguracja runnera testów i z grubsza ile rzeczywistych plików testowych istnieje i gdzie się grupują.

Sklasyfikuj:

- **`none`** — nie znaleziono konfiguracji testów ORAZ mniej niż 3 pliki testowe. Projekt faktycznie nie ma pakietu.
- **`sparse`** — konfiguracja istnieje, ale mniej niż ~15 plików testowych, lub pliki testowe grupują się tylko w jednym obszarze, podczas gdy reszta bazy kodu jest pusta.
- **`meaningful`** — konfiguracja + prawdziwy pakiet (~15+ plików testowych rozłożonych po całej bazie kodu). Projekt ma kulturę testowania; nadal może mieć luki.

Zachowaj werdykt (jeden wiersz: kubełek + krótkie uzasadnienie, takie jak "vitest skonfigurowany, 4 pliki testowe wszystkie w `packages/api/`") dla §4 (Stos) przewodnika i dla wywiadu w Fazie 2, aby się na nim rozgałęzić.

### Ugruntowanie stosu wspomagane przez MCP (zawsze działa)

Przed rekomendowaniem narzędzi testowych, narzędzi natywnych dla AI, hooków, automatyzacji przeglądarki, bram CI lub warstw testowych specyficznych dla frameworka, sprawdź narzędzia MCP dostępne w **bieżącej sesji**. Jest to krok ugruntowujący, a nie wymóg używania każdego narzędzia.

Poszukaj konkretnie narzędzi, które mogą zmniejszyć liczbę przestarzałych lub ogólnych porad dotyczących stosu:

- **MCP dokumentacji technicznej**, takie jak Context7, dokumentacja frameworków/bibliotek, dokumentacja dostawców lub dokumentacja pakietów. Użyj ich najpierw do dokładnych API, aktualnych wskazówek dotyczących frameworków, konfiguracji testów specyficznych dla wersji oraz przestarzałych/zmienionych nazw poleceń.
- **MCP wyszukiwania/odkrywania**, takie jak Exa.ai. Użyj ich, gdy nie jest znana właściwa oficjalna strona, podczas porównywania bieżącego wsparcia narzędzi lub podczas sprawdzania, czy funkcja testowania/MCP jest aktualna, w wersji zapoznawczej, przestarzała lub ograniczona regionalnie/przez dostawcę.
- **MCP przeglądarki/środowiska uruchomieniowego**, takie jak Playwright/automatyzacja przeglądarki. Zauważ, czy są dostępne jako możliwa warstwa testowa lub weryfikacyjna, ale zalecaj je tylko wtedy, gdy dodają sygnał poza tańsze testy deterministyczne.
- **MCP dostawcy/platformy**, takie jak GitHub, Linear, Cloudflare, Supabase, Vercel lub narzędzia baz danych. Zauważ możliwości tylko do odczytu, które mogłyby wspierać przyszłe bramy jakości, inspekcję logów, tworzenie problemów lub weryfikację środowiska.

Zasada wykrywania niezależna od hosta:

1. Sprawdź dostępne nazwy/opisy narzędzi udostępnione agentowi w tej sesji. Jeśli host ma powierzchnię wykrywania narzędzi, zapytaj ją o terminy takie jak `docs`, `Context7`, `Exa`, `search`, `browser`, `Playwright`, `github`, `cloudflare`, `database` oraz wykryte nazwy frameworków/środowisk uruchomieniowych.
2. Nie wymyślaj MCP z przykładów. Jeśli Context7 lub Exa.ai nie są dostępne w tej sesji, napisz "not available in current session" zamiast zakładać dostęp.
3. Użyj oficjalnej dokumentacji za pośrednictwem MCP dokumentacji, jeśli jest dostępna. Użyj MCP wyszukiwania, aby znaleźć aktualną oficjalną dokumentację lub najnowsze strony statusu, a następnie preferuj źródło pierwotne nad blogami.
4. Zastosuj tę samą granicę **sygnału, nie wiedzy**, co w pozostałej części Fazy 1: dokumentacja/wyszukiwanie MCP może potwierdzić, że narzędzie jest obsługiwane, aktualne lub odpowiednie dla wykrytego stosu. Nie lokalizują one kotwic kodu dla konkretnych awarii; to pozostaje zadaniem `/10x-research`.

Zachowaj krótką notatkę `Stack grounding tools` dla §4 i briefu początkowego:

```markdown
**Stack grounding tools (current session):**
- Docs: <Context7 / framework docs MCP / none> — <what was checked or why skipped>; checked: <YYYY-MM-DD>
- Search: <Exa.ai / web search MCP / none> — <what was checked or why skipped>; checked: <YYYY-MM-DD>
- Runtime/browser: <Playwright MCP / browser tool / none> — <possible use, or "not used">; checked: <YYYY-MM-DD>
- Provider/platform: <GitHub/Cloudflare/Supabase/etc. / none> — <quality-gate relevance, or "not used">; checked: <YYYY-MM-DD>
```

Jeśli nie są dostępne żadne użyteczne MCP, kontynuuj z lokalnymi dowodami manifestu/konfiguracji i wyraźnie to zaznacz w §4. Brak dostępu do MCP nie może blokować wdrożenia.

### Skanowanie hot-spotów (historia git)

Przeprowadź skanowanie hot-spotów historii git z ostatnich 30 dni, **ograniczone tylko do głównych katalogów bazy kodu projektu**. **Częstotliwość zmian jest jednym z najsilniejszych sygnałów prawdopodobieństwa**. Skanowanie całego repozytorium zagłusza sygnał w szumie, którego nikt nie pisze ręcznie.

#### Krok 1 — Zidentyfikuj katalog(i) główny(e) głównej bazy kodu

Zlokalizuj katalogi, które zawierają ręcznie napisany kod aplikacji, w sposób odpowiedni dla stosu znalezionego w Fazie 0 — nie ma ustalonego polecenia. Poszukaj konwencjonalnych katalogów głównych źródeł dla tego ekosystemu (np. `src`/`app`/`lib` dla JS-TS, katalog pakietu dla Pythona, `cmd`/`internal`/`pkg` dla Go, członkowie obszaru roboczego dla Rust, `src`/`app` dla PHP) i przestrzegaj układów obszarów roboczych monorepo. Wyklucz katalogi dostawców, generowane i wyjściowe kompilacji (`node_modules`, `dist`, `build`, `.next`, `target`, `coverage`, `vendor` i tym podobne). Celem jest zestaw ścieżek, gdzie zmiany odzwierciedlają rzeczywiste autorstwo, a nie szum narzędzi.

#### Krok 2 — Potwierdź zakres z użytkownikiem

Zapytaj użytkownika:
> Detected main-codebase scopes for the hot-spot scan: `<scope 1>`, `<scope 2>`, `<scope 3>`. Excluding docs, fixtures, archive, build output. **Accept**, or paste an **override** list.

Jeśli wykrycie nic nie zwróci, wróć do katalogu głównego repozytorium z domyślną listą wykluczeń i wyraźnie poinformuj użytkownika. Nigdy nie skanuj wszystkiego po cichu.

#### Krok 3 — Uruchom skanowanie

Użyj potwierdzonych zakresów, aby zebrać najczęściej zmieniane ręcznie pisane pliki i katalogi z ostatnich 30 dni. Wyklucz pliki blokad, migawki, kod dostawców, kod generowany i wyjście kompilacji. Dokładne polecenie zależy od hosta i stosu; wyjście musi zawierać:

- użyta lista zakresów;
- najczęściej zmieniane pliki, jeśli to użyteczne;
- najczęściej zmieniane katalogi, najlepiej pogrupowane wokół głębokości 2–3;
- czy historia w zakresie ma wystarczający sygnał.

**Zabezpieczenie przed niewystarczającą historią.** Jeśli dziennik git w zakresie zwraca mniej niż 5 commitów w ciągu ostatnich 30 dni, pomiń skanowanie i zanotuj w punkcie kontrolnym Fazy 1: "Skanowanie hot-spotów: niewystarczająca historia git — oceny prawdopodobieństwa w przewodniku będą opierać się wyłącznie na mapie drogowej i wywiadzie z użytkownikiem."

Zachowaj wynik jako krótką notatkę, którą konsumują Fazy 2, 3 i 4.

### Punkt kontrolny

Podsumuj dane wejściowe dla użytkownika w ≤12 liniach: `ścieżka → sklasyfikowany-typ → 1-liniowy zarys → [argument | domyślny]`, plus 3-liniowe podsumowanie hot-spotów. Potwierdź przed przejściem do Fazy 2.

## Faza 2 — Wywiad z użytkownikiem (tylko gdy brakuje przewodnika)

Faza 1 przedstawia to, co mówią dokumenty. Faza 2 przedstawia to, co użytkownik wie, czego dokumenty nigdy nie uchwycą: przeszłe incydenty, obawy, obszary, które zmienia bez pewności, oraz wyraźne instrukcje dotyczące tego, czego *nie* testować. Traktuj jego odpowiedzi z taką samą wagą jak linie PRD lub dane hot-spotów — ryzyko zakotwiczone w "użytkownik obawia się Y, awaria pojawiłaby się w `<pliku>`" jest uzasadnione, o ile plik wytrzyma badanie.

Pomiń wywiad tylko wtedy, gdy użytkownik wyraźnie o to poprosi. Ostrzeż raz, że wdrożenia oparte wyłącznie na dokumentach odzwierciedlają to, co podkreśla PRD, co rzadko jest tym, czego zespół faktycznie obawia się zepsuć.

### Przeprowadzenie

Zadawaj **jedno pytanie na raz**, warunkowane poprzednią odpowiedzią — nie jako formularz. Zawsze łącz pytanie z **2–3 krótkimi, konkretnymi przykładami**, aby użytkownik mógł poczuć kształt odpowiedzi, której oczekujesz (i rozpoznać, kiedy jego sytuacja się różni). Przykłady to rusztowanie, a nie opcje — jasno określ, że użytkownik powinien odpowiedzieć własnymi słowami. Po każdej odpowiedzi, powtórz ją w jednym wierszu, aby użytkownik mógł tanio skorygować błędne odczyty. Następnie zadaj następne.

Użytkownik może odpowiedzieć "pomiń" na każde pytanie. Jeśli pominięto trzy lub więcej, przerwij wywiad, zanotuj, że wdrożenie będzie opierać się wyłącznie na dokumentach, i przejdź do Fazy 3 z jednowierszowym ostrzeżeniem.

### Pięć pytań

Każde z poniższych pytań zawiera przykładowe odpowiedzi. Przeczytaj je użytkownikowi jako część monitu; dostosuj przykłady do domeny projektu, gdy istnieje oczywiste dostosowanie (np. dla produktu rozliczeniowego użyj przykładów związanych z rozliczeniami).

1. Zapytaj użytkownika: "Co najbardziej martwi Cię w związku z awarią tego produktu — niezależnie od tego, co mówią dokumenty?"
   - np. "Płacący użytkownik otrzymuje 403 i nie może uzyskać dostępu do treści, za które zapłacił."
   - np. "Webhook ze Stripe przychodzi dwukrotnie i podwójnie obciążamy."
   - np. "Cichy błąd utraty danych w potoku importu, którego nikt nie zauważa przez tydzień."

2. Zapytaj użytkownika: "Gdzie wcześniej ucierpiałeś w tej bazie kodu lub podobnej?"
   - np. "W zeszłym kwartale migracja działała dobrze na środowisku testowym i uszkodziła wiersze produkcyjne."
   - np. "Refaktoryzacja middleware'u autoryzacji wylogowała użytkowników na 30 minut."
   - np. "Wysłaliśmy build, w którym w katalogu brakowało połowy lekcji i nikt nie zauważył tego przez dzień."

3. Zapytaj użytkownika: "Który obszar zmieniasz najczęściej bez poczucia pewności?"
   - np. "Logika blokowania lekcji — każda poprawka wydaje się ruletką."
   - np. "Routing Cloudflare Worker — działa lokalnie, psuje się na produkcji."
   - np. "Skrypt przesyłania R2 — uruchamiam go i modlę się."

4. Zapytaj użytkownika: "Co dziś wydaje się niedostatecznie przetestowane, a o co cicho się martwiłeś?" *(zobacz warunkowe przepisanie poniżej, jeśli profil bazy testowej to `none`)*
   - np. "Ścieżka ponawiania webhooka — mamy jeden test happy-path i to wszystko."
   - np. "Granice błędów — istnieją, ale nigdy nie widziałem, żeby zadziałały w teście."
   - np. "Wszystko, co dotyczy pieniędzy — pokrycie jest słabe, a wpływ poważny."

5. Zapytaj użytkownika: "Na co NIE chciałbyś wydawać budżetu na testy, nawet jeśli podręcznik mówi, żeby to testować?"
   - np. "Wewnętrzne narzędzia administracyjne — pięciu zaufanych użytkowników, niski promień rażenia."
   - np. "Generowane klienty TypeScript — generator jest testem."
   - np. "Testy migawek interfejsu użytkownika dla stron marketingowych — ciągle się psują i nic nie wykrywają."

Jeśli odpowiedź użytkownika na jedno pytanie w pełni pokrywa następne, potwierdź nakładanie się i przejdź dalej. Pięć tur to limit, a nie kwota.

### Warunkowe przepisanie dla Q4 na podstawie profilu bazy testowej

Profil bazy testowej z Fazy 1 decyduje, jak (lub czy) zadać Q4:

- **`meaningful`** — zadaj Q4 tak, jak jest napisane. Użytkownik ma testy; "niedostatecznie przetestowane" to spójne pojęcie.
- **`sparse`** — przeformułuj: *"Masz kilka testów w `<obszarze>`, ale większość bazy kodu jest pusta. Gdzie jest luka, która najbardziej Cię przeraża?"* i zaoferuj te same przykłady.
- **`none`** — **pomiń Q4**. Nie ma nic, co byłoby niedostatecznie przetestowane *w stosunku do*. Powiedz użytkownikowi wyraźnie: *"Pomiń pytanie o 'niedostatecznie przetestowane' — nie ma jeszcze znaczącego pakietu, więc odpowiedź brzmiałaby 'wszystko'. Faza 1 wdrożenia uruchomi runner testów."* Nie licz tego jako pominięcia zainicjowanego przez użytkownika w kierunku progu przerwania.

**Opcjonalne przygotowanie do Q3.** Jeśli skan hot-spotów wygenerował użyteczną listę, a odpowiedź użytkownika na Q3 jest niejasna, pokaż 3 najważniejsze katalogi hot-spotów i zapytaj, czy któryś z nich pasuje. Nigdy nie zaczynaj od listy; nigdy nie pozwól, aby nadpisała jasną odpowiedź ustną.

### Zapis

Zachowaj odpowiedzi jako ustrukturyzowaną notatkę (w pamięci; przekazaną do briefu i przewodnika):

```markdown
**User-stated concerns (Phase 2 interview):**

| # | Question | User answer (paraphrase OK) | Implied risk(s)                            |
|---|----------|------------------------------|---------------------------------------------|
| 1 | Worries most         | "Paid user gets a 403 instead of their content." | API gating regression on lesson endpoint |
| 2 | Burned before        | "Catalog build silently dropped lessons last month." | Strict ref resolution at build time |
| 3 | Change without confidence | (skipped) | — |
| 4 | Under-tested today   | "The webhook retry path." | Billing webhook idempotency |
| 5 | Do NOT spend on      | "Internal admin tools — we trust the small set of users." | Negative space note |
```

## Faza 3 — Synteza briefu początkowego (tylko gdy brakuje przewodnika)

Tylko w pamięci. Brief napędza Fazę 4 i jest źródłem prawdy dla struktury wdrożenia.

```markdown
# Seed Brief (in-memory)

## 1. Top risks (5–7): | # | Risk (failure scenario) | Impact | Likelihood | Source(s) — evidence, not anchors |
## 2. Hot-spots (top 5 files + top 5 directories, scope list) — used as likelihood evidence, not as failure-location anchors
## 3. User-stated concerns (verbatim from Phase 2)
## 4. Stack notes (detected test infra, or "none yet"; include Stack grounding tools checked in current session)
## 5. Risk response guidance: | Risk # | What would prove protection | Must challenge | Context needed | Likely cheapest layer | Anti-pattern to avoid |
## 6. Proposed rollout phases (3–5): | # | Phase name | Goal | Risks covered | Test types | Order rationale |
```

Ilustracyjne wiersze faz: "Pokrycie ścieżki krytycznej" (najtańsza warstwa dla głównych ryzyk), "Integracja wokół hot-spotów" (moduły o dużej zmienności), "Warstwa natywna dla AI" (tylko jeśli dodaje sygnał, którego klasyczne testy nie wykrywają tanio), "Okablowanie bram jakości" (zablokuj dolną granicę).

### Wskazówki dotyczące reagowania na ryzyko (obowiązkowe)

Dla każdego głównego ryzyka dodaj wiersz odpowiedzi przed zaproponowaniem faz wdrożenia. Jest to pomost między "zidentyfikowaliśmy ryzyko" a "umiejętność podrzędna wie, jak je zaatakować". Zachowaj go opartego na dowodach: użyj sygnału PRD/wywiadu/archiwum/hot-spotów i ograniczeń stosu, ale nie wymyślaj kotwic plików.

Każdy wiersz odpowiada na:

- **Co udowodniłoby ochronę** — obserwowalne zachowanie lub tryb awarii, który musi wykryć użyteczny test. Sformułuj to jako zachowanie użytkownika/biznesu, a nie "pokryj funkcję X".
- **Należy zakwestionować** — oczywiste, ale niebezpieczne założenie, którego agent nie powinien akceptować w milczeniu. Przykłady: "logowanie happy-path implikuje, że dostęp do płatnych treści działa", "pusta odpowiedź oznacza brak treści", "ponowienie zakończyło się sukcesem, ponieważ ostateczny status to 200", "wygenerowany schemat równa się umowie produktowej".
- **Wymagany kontekst** — co `/10x-research` musi ugruntować przed planowaniem: punkt wejścia, stan trwały, granica zewnętrzna, tłumaczenie błędów, kształt autoryzacji/sesji, gwarancja kolejności, zasada idempotencji, dane fixture/źródła prawdy itp.
- **Prawdopodobnie najtańsza warstwa** — jednostkowa, integracyjna, kontraktowa, e2e, deterministyczna różnica wizualna, przegląd natywny dla AI, hook lub ręczny test dymny. Jest to hipoteza do zweryfikowania przez `/10x-research`, a nie polecenie.
- **Anty-wzorzec do uniknięcia** — jeden konkretny tryb awarii w przyszłym teście: lustro implementacji, tylko happy-path, asercja skopiowana z logiki produkcyjnej, nadmierne mockowanie wewnętrznych elementów, kruche założenie kolejności, migawka bez znaczenia, e2e tam, gdzie integracja by to wykryła, lub warstwa natywna dla AI nad deterministycznym sygnałem.

Jeśli ryzyko nie może wygenerować tego wiersza, nie jest wystarczająco wykonalne dla wdrożenia. Przeformułuj je lub usuń przed Fazą 4.

### Soczewka nadużyć / bezpieczeństwa (obowiązkowa, gdy ma zastosowanie)

Jeśli produkt posiada uwierzytelnianie, płatności lub akceptuje jakiekolwiek dane wejściowe od użytkownika, ryzyka z listy top-N muszą zawierać co najmniej jeden **scenariusz nadużycia** — ścieżka happy path wyklucza atakującego, więc te scenariusze prawie nigdy nie pojawiają się samodzielnie w wywiadzie z Fazy 2. Przed sfinalizowaniem briefu, porównaj zestaw ryzyk z tymi klasami i dodaj wiersz, jeśli produkt faktycznie naraża powierzchnię:

- **Autoryzacja/dostęp** — IDOR i kontrole własności: czy punkt końcowy weryfikuje, *czy ten zasób należy do Ciebie*, a nie tylko *czy jesteś zalogowany*?
- **Niezaufane dane wejściowe** — wstrzykiwanie i równoważność walidacji po stronie serwera (serwer nie może ufać klientowi).
- **Wyciek tajemnic/danych osobowych** — klucze, tokeny lub dane osobowe uciekające do logów, treści błędów lub pakietu front-endowego.
- **Nadużycie zasobów** — obejście limitu szybkości, kosztowne operacje w pętli, masowe wyzwalanie efektów ubocznych (np. zalewanie linkami magicznymi).

Są to zwykłe scenariusze awarii oceniane na tych samych osiach wpływu × prawdopodobieństwa, cytowane z tymi samymi zasadami dowodowymi — nie jest to oddzielny framework i nigdy nie jest to kotwica pliku. Jeśli produkt ma te powierzchnie, a mapa nie zawiera żadnych wierszy dotyczących nadużyć, jest to luka do wypełnienia, a nie znak, że produkt jest bezpieczny.

### Kalibracja wpływu × prawdopodobieństwa

Oceń obie osie w skali ogólnej Wysoki / Średni / Niski (patrz `references/test-plan-schema.md` §2 dla rubryki), aby kolejność była odtwarzalna. Najpierw chroń Wysoki × Wysoki. Scenariusze o wysokim wpływie × niskim prawdopodobieństwie (np. awaria dostawcy chmury) zazwyczaj należą do obserwacji/alertowania, a nie testów — zanotuj to zamiast wypełniać mapę. Nie wymyślaj drobniejszych gradacji; celem jest obronna kolejność, a nie fałszywa precyzja.

### Przejście weryfikacyjne (obowiązkowe)

Zanim pokażesz brief użytkownikowi, przejdź przez każde z głównych ryzyk i zastosuj perspektywę konsultanta QA. Trzy sprawdzenia dla każdego ryzyka:

1. **"Czy to jest wada, czy opisuję implementację?"** Jeśli złamanie ryzyka wymagałoby *dodania* zabezpieczenia (np. "brak ścieżki awaryjnej", gdy żadna ścieżka awaryjna nie istnieje), ryzyko jest spekulatywne — usuń je lub przeformułuj, aby przetestować to, co *istnieje* (np. "ścieżka awarii zwraca czysty 5xx, nie udaje sukcesu, nie zapisuje do bazy danych"). Spekulatywne ryzyka, które przetrwają do §2, zmuszają `/10x-research` do wymyślenia kodu pod testem lub oznaczenia ryzyka do rewizji; oba marnują cykl.

2. **"Czy ten wiersz cytuje plik jako kotwicę?"** Usuń wszystko w kolumnie Source, co wygląda jak `src/foo/bar.ts:42` lub `<moduł>` (konkretny symbol). Zastąp to dowodem, który *podniósł* ryzyko — numerem pytania z wywiadu, linią PRD, **katalogiem** hot-spotów. Jeśli po usunięciu nie ma żadnych dowodów, ryzyko jest nieuzasadnione i musi zostać usunięte lub poparte prawdziwym cytatem z wywiadu/PRD.

3. **"Czy zalecana odpowiedź wykryłaby prawdziwą regresję, czy tylko zwiększyłaby pokrycie?"** Odrzuć wskazówki dotyczące odpowiedzi, które mówią tylko "dodaj testy jednostkowe", "pokryj moduł", "przetestuj ścieżkę happy path" lub "potwierdź bieżące wyjście". Prawidłowa odpowiedź nazywa zachowanie/tryb awarii, kontekst, który `/10x-research` musi zweryfikować, i co najmniej jeden anty-wzorzec do uniknięcia. Najbardziej niebezpiecznym anty-wzorcem dla testów pisanych przez AI jest **problem wyroczni**: asercja, której oczekiwana wartość została zaczerpnięta z implementacji pod testem, a nie z niezależnego źródła (wymagania, kontrakt, wywiad). Taki test jest tautologiczny — zatwierdza bieżące zachowanie, w tym bieżące błędy, i nigdy nie może zawieść z właściwego powodu. Sformułuj komórkę "Co udowodniłoby ochronę" jako zachowanie użytkownika/biznesu właśnie po to, aby test podrzędny otrzymał swoją wyrocznię z ryzyka, a nie z kodu, który odczytuje.

Oba sprawdzenia uruchamiają się cicho — w ten sposób brief jest czyszczony, a nie jest to krok widoczny dla użytkownika. Jeśli ryzyko zostanie usunięte lub przeformułowane, zanotuj to w jednowierszowej podsekcji "Challenger findings" na końcu briefu, aby użytkownik mógł zobaczyć, co zostało usunięte i dlaczego.

Pokaż (oczyszczony) brief; zapytaj użytkownika o **Akceptuj** / **Edytuj** / **Anuluj**.

## Faza 4 — Napisz fazowy `test-plan.md` (tylko gdy brakuje przewodnika)

Napisz **jeden plik**: `context/foundation/test-plan.md`, zgodnie z `references/test-plan-schema.md`. Schemat jest stały; treść dostosowuje się do briefu.

Dwa punkty egzekwowania, które schemat wyraźnie określa — nie rozluźniaj ich:

- **§1 Strategia musi zawierać zasadę #3** ("Ryzyka to scenariusze, a nie lokalizacje kodu"). Skopiuj szablon ze schematu; nie parafrazuj.
- **§2 Kolumna źródła to dowód, a nie kotwice.** Dozwolone: linie PRD/mapy drogowej/archiwum, pytania z wywiadu, katalogi hot-spotów z liczbą zmian, ograniczenia stosu technologicznego. Zabronione: `plik:linia`, nazwy funkcji, nazwy schematów, nazwy modułów. Jeśli wiersz ryzyka w projekcie nie ma nic w kolumnie Source po usunięciu zabronionych kotwic, wiersz jest nieuzasadniony — usuń go lub dołącz prawdziwy cytat z wywiadu/PRD przed zapisaniem.

Sekcja nośna to **§3 Wdrożenie fazowe** — orchestrator odczytuje tę tabelę statusu przy każdym kolejnym wywołaniu. Słownictwo statusu (literały parsera): `not started` → `change opened` → `researched` → `planned` → `implementing` → `complete`. Orchestrator nadpisuje komórki Status i Change-folder w miarę postępu wdrożenia; reszta wiersza jest zamrożona do czasu `--refresh`.

Zachowaj wskazówki dotyczące reagowania na ryzyko z briefu w napisanym planie:

- Wiersze ryzyka w §2 pozostają zwięzłe i zawierają tylko dowody.
- §2 musi również zawierać tabelę `Risk Response Guidance` ze schematu dla każdego głównego ryzyka. Zawiera ona intencję odpowiedzi, a nie kotwice.
- Cele fazy w §3 powinny mówić, jaką ochronę faza ma udowodnić, a nie tylko jaki typ testu doda.
- §4 Stack musi zawierać notatkę o ugruntowaniu MCP/dokumentacji/wyszukiwania z Fazy 1, w tym daty `checked:` i "not available in current session", jeśli to stosowne.
- Wypełniacze w §6 powinny nazywać przyszły wzorzec podręcznika według zachowania/trybu awarii, jeśli to możliwe, np. "TBD — patrz §3 Faza 1 dla wzorca odmowy/regresji dostępu do płatnych treści", a nie tylko "testy jednostkowe TBD".

Nie dodawaj kotwic plików ani kodu testowego, aby zachować te wskazówki. Plan powinien zawierać intencję odpowiedzi; `/10x-research` dostarcza kotwice, a `/10x-plan` przekształca odpowiedź w podfazy.

Po zapisaniu, przejdź bezpośrednio do Fazy 5 (użytkownik już zatwierdził brief).

---

## Faza 5 — Przeczytaj przewodnik, zlokalizuj bieżącą fazę wdrożenia

Przeczytaj §3 i znajdź pierwszy wiersz, którego Status nie jest `complete` — to jest **bieżąca faza wdrożenia**. Jeśli każdy wiersz jest `complete`, przejdź do "Wszystkie fazy zakończone". Wyodrębnij: numer fazy (N), nazwę fazy, objęte ryzyka, typy testów i folder zmiany (jeśli istnieje) — te dane zasilają poniższe bloki argumentów bezpośrednich.

## Faza 6 — Określ podstan i przedstaw następne przekazanie

Określ podstan na podstawie artefaktów na dysku dla bieżącego wiersza §3: folder zmiany, `research.md`, `plan.md` i niezaznaczone elementy `## Progress` w `plan.md`.

Przed wybraniem przekazania, w razie potrzeby uzgodnij nieaktualny status §3 z dysku:

- `research.md` istnieje, a §3 nadal mówi `change opened` → zaktualizuj na `researched`.
- `plan.md` istnieje, a §3 nadal mówi `change opened` lub `researched` → zaktualizuj na `planned`.
- `plan.md` istnieje z oczekującym postępem, a §3 nie jest `implementing` → zaktualizuj na `implementing` przed przekazaniem do `/10x-implement`.
- Postęp `plan.md` jest w pełni `[x]` → zaktualizuj na `complete` i kontynuuj do Przekazania E.

To leniwe uzgadnianie wspiera ustalony proces badanie → planowanie → implementacja: umiejętności podrzędne nie muszą wracać tutaj tylko po to, aby zmieniać etykiety statusu.

Mapuj stan na jedno z pięciu przekazań. Każde z nich drukuje następne wywołanie, kopiuje je do schowka, a następnie ZATRZYMUJE. Dla stanów już w procesie podrzędnym, ładunek przekazania przypomina aktywnej umiejętności, aby zasugerowała następne naturalne polecenie po zakończeniu, zamiast wracać tutaj w celu routingu.

### Zasada kontynuacji w dół

Po zakończeniu każdej głównej fazy podrzędnej, zasugeruj następne naturalne polecenie w ustalonym procesie `/10x-research` → `/10x-plan` → `/10x-implement`, chyba że istnieje wyraźna blokada, korekta lub brakująca decyzja. Następne polecenie powinno zawierać tylko bezpośredni parametr, którego potrzebuje teraz następna umiejętność. Nie proś użytkownika o ponowne uruchomienie `/10x-test-plan` tylko po to, aby odkryć już znany następny krok.

Wróć do `/10x-test-plan`, gdy sam plan testów wymaga uwagi: przeniesienie korekt badawczych, uzgodnienie zakończonej fazy wdrożenia, wybór następnej fazy wdrożenia, `--status` lub `--refresh`.

### Przekazanie A — Brak folderu zmiany (Status `not started`)

Zaproponuj identyfikator zmiany z nazwy fazy wdrożenia (kebab-case, z prefiksem `testing-`). Np. "Critical-path coverage" → `testing-critical-path-coverage`. Potwierdź z użytkownikiem, a następnie zaktualizuj §3 (Status → `change opened`, Change folder → wybrany identyfikator) **przed** przekazaniem, aby wznowienie działało, jeśli sesja zostanie przerwana.

Następnie uruchom **Rytuał Przekazania** z:

```
/10x-new <change-id>
```

…bezpośrednio po tym blokiem intencji jako argumentem:

```
Open a change folder for rollout Phase <N> of context/foundation/test-plan.md: "<phase name>".
Risks covered: <list from §2>. Test types planned: <list from §3>.
Risk response intent: <for each covered risk, one line from §2 Risk Response Guidance describing the behavior or failure mode this phase must prove protected>.
After creating the folder, follow the downstream continuation rule.
```

### Przekazanie B — `change.md` istnieje, brak `research.md` (Status `change opened`)

Uruchom Rytuał Przekazania z:

```
/10x-research
```

…bezpośrednio po tym zapytaniem badawczym o takim kształcie:

```
Ground rollout Phase <N> of context/foundation/test-plan.md.

Risks to verify: <Risk #X, #Y from §2>.
Risk response guidance to verify, not blindly accept:
- <Risk #X>: prove <observable behavior/failure mode>; challenge <obvious assumption>; avoid <anti-pattern>.
- <Risk #Y>: prove <observable behavior/failure mode>; challenge <obvious assumption>; avoid <anti-pattern>.
Hot-spot directories that raised these risks (likelihood evidence — NOT anchors): <dir 1, dir 2 from §1 scope>.
Stack: <from §4>.

The test plan carries evidence and response intent, not code anchors. For each risk, ground the real failure path in code, quote relevant lines, verify or correct the response guidance, locate existing tests, identify the cheapest useful test layer, and flag speculative risks or misleading hot-spot evidence.

Write findings to context/changes/<change-id>/research.md.
Then follow the downstream continuation rule.
```

Jeśli użytkownik wróci tutaj po badaniu, zaktualizuj status wiersza §3 przewodnika na `researched` przed kontynuowaniem. Uruchom również **sprawdzenie przeniesienia po badaniu** (patrz poniżej). Ten powrót służy głównie do korekt; ścieżka szczęśliwa powinna być kontynuowana zgodnie z zasadą kontynuacji w dół.

### Sprawdzenie przeniesienia po badaniu

Po wylądowaniu `research.md` i przed przedstawieniem Przekazania C, przeczytaj nowy plik badawczy i poszukaj dwóch rodzajów ustaleń:

1. **Korekty kotwic** — badanie wykryło, że awaria występuje w katalogu/obszarze innym niż ten, który kolumna Source w §2 cytowała jako dowód hot-spotów (np. §2 cytowało `src/lib/schemas/` jako dowód hot-spotów dla ryzyka dryfu odpowiedzi, ale badanie pokazuje, że schemat odpowiedzi faktycznie znajduje się w `src/lib/openrouter.ts`). Cytat hot-spotów jest mylący.
2. **Potwierdzenia ryzyk spekulatywnych** — badanie oznaczyło ryzyko jako "opisujące implementację, nic do zepsucia" i zaproponowało usunięcie/przeformułowanie.
3. **Korekty wskazówek dotyczących odpowiedzi** — badanie zweryfikowało, że planowana odpowiedź nie wykryłaby awarii, wybrało tańszą warstwę lub stwierdziło, że wymienione założenie "należy zakwestionować" było błędne.

Jeśli którykolwiek z nich jest obecny, zapytaj użytkownika:
> Research surfaced corrections to the test plan §2:
> - [list each finding in one line]
>
> Backport into `context/foundation/test-plan.md` §2 now (Source column, risk wording, or Risk Response Guidance only — never adds file anchors), or defer to `--refresh`?

Jest to JEDYNA dozwolona edycja na miejscu dla §1/§2 poza `--refresh`. Edycja zmienia cytat źródła, sformułowanie ryzyka lub komórki wskazówek dotyczących odpowiedzi, nigdy nie dodaje kotwicy plik:linia (zasada #3 nadal obowiązuje).

### Przekazanie C — `research.md` istnieje, brak `plan.md` (Status `researched`)

Uruchom Rytuał Przekazania z:

```
/10x-plan
```

…bezpośrednio po tym monitem planistycznym o takim kształcie:

```
Plan rollout Phase <N> of context/foundation/test-plan.md. Read research.md
and change.md fully. Risks covered: <list>. Test types: <list>. Hot-spot scope:
<from §1>.

Risk response guidance from the test plan and research:
- <Risk #X>: prove <behavior/failure mode>; required context <grounded fact from research>; anti-pattern to avoid <specific anti-pattern>.
- <Risk #Y>: prove <behavior/failure mode>; required context <grounded fact from research>; anti-pattern to avoid <specific anti-pattern>.

Plan sub-phases by cost × signal and risk priority. Each test sub-phase must state behavior asserted, regression caught, research source, edge/error/boundary case, and anti-pattern avoided. Challenge happy paths, avoid implementation mirrors, keep grounding explicit, date any AI-native guidance, and make the final sub-phase update §6 with the cookbook patterns shipped.

Then follow the downstream continuation rule.
```

Jeśli użytkownik wróci tutaj po napisaniu `plan.md`, zaktualizuj status §3 na `planned`. Ten powrót nie jest wymagany na ścieżce szczęśliwej; `/10x-plan` powinien przestrzegać zasady kontynuacji w dół.

### Przekazanie D — `plan.md` istnieje z oczekującym postępem (Status `planned` lub `implementing`)

Znajdź pierwszy niezaznaczony wiersz w `## Progress` i wyodrębnij jego numer podfazy, np. `N.M` z `- [ ] N.M <tytuł>`.

Uruchom Rytuał Przekazania z:

```
/10x-implement <change-id> phase <N>
```

(Nie jest potrzebny bezpośredni argument; `/10x-implement` odczytuje plan bezpośrednio.)

Zaktualizuj status §3 przewodnika na `implementing` przy pierwszym przejściu; pozostaw go na `implementing` dla kolejnych podfaz.

### Przekazanie E — Postęp `plan.md` w pełni `[x]` (Status `complete`)

Faza wdrożenia jest zakończona. Zaktualizuj status §3 na `complete`. Następnie **wróć do Fazy 5** — znajdź następną oczekującą fazę wdrożenia, przedstaw jej Przekazanie A. Nie wychodź, dopóki:

- Wszystkie wiersze §3 są `complete` → wydrukuj podsumowanie zakończenia (patrz "Wszystkie fazy zakończone" na dole tej umiejętności).
- Użytkownik chce się tutaj zatrzymać → po zaktualizowaniu statusu, wydrukuj krótkie podsumowanie i ZATRZYMAJ.

Zapytaj użytkownika:
> Rollout Phase <N> is complete. Proceed to Phase <N+1>, or stop here?
>
> - **Continue to Phase <N+1>** — I'll present the `/10x-new` handoff for the next phase.
> - **Stop here** — I'll print a status snapshot and exit. Re-run `/10x-test-plan` to resume.

---

## Rytuał Przekazania

Każde przekazanie (A–D) drukuje następne wywołanie, kopiuje je do schowka, gdy host obsługuje dostęp do schowka, a następnie zatrzymuje się. Dla przekazań A–C, następne wywołanie to polecenie slash, po którym natychmiast następuje blok intencji/zapytania/monitu jako argument polecenia; nie zakładaj, że podrzędne polecenie `/10x-*` poprosi o parametry po uruchomieniu. Dla przekazania D, wywołanie jest tylko poleceniem, ponieważ `/10x-implement` odczytuje plan bezpośrednio. Późniejsze wywołanie `/10x-test-plan` ponownie określa stan z dysku i uzgadnia wszelkie nieaktualne statusy §3.

### Krok 1 — Drukuj

```
─────────────────────────────────────────────────────────────────────
Next step: <human-readable description>

Copied invocation (✓ copied to clipboard):

<exact command> <intent/query/prompt block, if any>

Then /clear and paste the copied invocation. After that phase completes, continue with the next natural command suggested by the active skill unless it reports a blocker.
─────────────────────────────────────────────────────────────────────
```

### Krok 2 — Kopiuj do schowka

Użyj narzędzia schowka hosta, jeśli jest dostępne. Jeśli nie, pozostaw wydrukowane wywołanie jako źródło prawdy.

### Krok 3 — ZATRZYMAJ

Nie czekaj na potwierdzenie. Zadanie umiejętności dla tego wywołania jest zakończone.

---

## Tryb `--status`

Pomiń całą logikę faz; przeczytaj przewodnik, jeśli jest obecny, i wydrukuj kompaktowy status wdrożenia. Przykładowy wynik:

```
Test rollout status — context/foundation/test-plan.md

| # | Phase                       | Status        | Change folder                                  | Next action                                  |
|---|-----------------------------|---------------|------------------------------------------------|-----------------------------------------------|
| 1 | Critical-path coverage      | complete      | context/changes/testing-critical-path-coverage/ | —                                             |
| 2 | Integration around hot-spots | implementing  | context/changes/testing-integration-hotspots/  | /10x-implement testing-integration-hotspots phase 3 |
| 3 | AI-native layer             | not started   | —                                              | /10x-new testing-ai-native-layer              |
| 4 | Quality-gates wiring        | not started   | —                                              | (waits for Phase 3 to land)                   |

Currently at: Phase 2, sub-phase 3 of 5.
```

Jeśli przewodnik brakuje, wydrukuj:

```
No test-plan.md found at context/foundation/. Run /10x-test-plan
without --status to start the rollout.
```

…i ZATRZYMAJ.

## Tryb `--refresh`

Uruchamiany, gdy użytkownik wywoła `/10x-test-plan --refresh` lub gdy przewodnik jest nieaktualny (np. data `checked:` zalecanego narzędzia jest starsza niż 3 miesiące). Odświeżanie **nie edytuje przewodnika na miejscu** — otwiera nowy folder zmiany `test-plan-refresh-<RRRR-MM-DD>`:

1. Uruchom Fazy 1+2 od nowa — hot-spoty i obawy są jedynymi uczciwymi wyzwalaczami odświeżania.
2. Zsyntetyzuj brief o zakresie odświeżania: co jest w przewodniku dzisiaj, co jest nieaktualne, czego brakuje.
3. Przekaż do `/10x-new` z tym briefem (standardowy Rytuał Przekazania).
4. Łańcuch działa normalnie; końcowa podfaza planu aktualizuje status §3 i wzorce podręcznika §6, ale nigdy nie przepisuje §1/§2 bez wyraźnej instrukcji użytkownika.

---

## Interaktywne monity — niezależne od hosta

Zawsze, gdy ta umiejętność mówi *"zapytaj użytkownika"*, użyj dowolnego narzędzia do interaktywnych pytań, które udostępnia host (np. `AskUserQuestion`, `ask_question`, `request_user_input`). Przed pierwszym krokiem interaktywnym, przeskanuj dostępne narzędzia w poszukiwaniu takiego z parametrem `question` i polem `options`/`choices`; użyj pierwszego dopasowania. Jeśli żadne nie istnieje, wróć do zwykłej wiadomości konwersacyjnej z oznaczonymi opcjami.

## Wszystkie fazy zakończone

Gdy pętla zakończy się, a każdy wiersz §3 będzie miał status `complete`:

```
Rollout complete — every phase in context/foundation/test-plan.md is now `complete`.

What landed:
- <N> rollout phases shipped
- <N> change folders archived (see context/archive/ for history)
- context/foundation/test-plan.md now reflects what is actually tested,
  how to add new tests by area, and the gates that are wired

Refresh cadence: re-run /10x-test-plan --refresh when a new top-3 risk
surfaces, a tool's `checked:` date is > 3 months old, the tech stack changes,
or §7 negative-space no longer matches what the team believes.
```

Następnie zasugeruj test dymny: otwórz nową sesję agenta i zapytaj "Przeczytaj zasady projektu i `context/foundation/test-plan.md`. Co powinienem najpierw przetestować dla nowego punktu końcowego `<obszaru>` i dlaczego?" Agent powinien podać wzorzec podręcznika, lokalizację i najtańszy typ testu. Jeśli wybierze losowy plik, plik zasad nie wskazuje jeszcze na `context/foundation/`.

## Czego ta umiejętność NIE robi

- Nie pisze kodu testowego, nie konfiguruje hooków/MCP/CI YAML ani nie edytuje pliku konfiguracyjnego AI projektu (AGENTS.md). Te rzeczy są realizowane w kolejnych fazach wdrożenia.
- Nie wymyśla ryzyk — każde ryzyko odwołuje się do PRD, roadmapy, archiwum, hot-spotów lub wywiadu z Fazy 2.
- Nie wywołuje automatycznie umiejętności podrzędnych. Każde przekazanie zatrzymuje się w schowku i czeka, ale każda zakończona faza podrzędna powinna sugerować następne naturalne polecenie w ustalonym procesie badanie → planowanie → implementacja, chyba że istnieje wyraźna blokada.
- **Nie odczytuje bazy kodu w poszukiwaniu wiedzy.** Zmiany hot-spotów, liczba baz testowych, znacznik projektu, wykrywanie frameworków — tak. Grafy wywołań, treści schematów, logika tłumaczenia błędów, "który plik jest odpowiedzialny za tę awarię" — nie. Ta ekstrakcja jest zadaniem `/10x-research`, uruchamianym dla każdej fazy wdrożenia na aktualnym kodzie. Jeśli kiedykolwiek poczujesz pokusę, aby zacytować `src/foo/bar.ts:42` w §2, przekroczyłeś granicę — zatrzymaj się i pozwól, aby badanie to zrobiło. (Patrz "Zasady nośne" §3.)

## Ton

Profesjonalny, instruktażowy, zwięzły. Tryb rozkazujący. Bez języka marketingowego. Bez emotikonów (pojedynczy ✓ w potwierdzeniu schowka jest funkcjonalny).

## Przypadki brzegowe

- **Brak PRD, archiwum lub mapy drogowej.** Pyta użytkownika o kanoniczne źródła kontekstu; jeśli żadne nie zostaną dostarczone, przewodnik w dużej mierze opiera się na wywiadzie z Fazy 2 i skanowaniu hot-spotów.
- **Stos poliglota.** Wybierz dominującą powierzchnię testową według liczby plików dla zakresu hot-spotów; wspomnij o stosach wtórnych w §2, jeśli są one odpowiedzialne za główne ryzyko.
- **Brak istniejącej infrastruktury testowej.** §4 mówi "jeszcze brak"; pierwsza faza wdrożenia uruchamia runner + pierwszy test integracyjny dla Ryzyka #1.
- **Brownfield z bogatymi istniejącymi testami.** Badanie podkreśla, co NIE jest pokryte; §6 obejmuje zarówno to, co istnieje, jak i to, co dodaje wdrożenie.
- **Przewodnik nieanglojęzyczny.** Napisz treść w żądanym języku; zachowaj słownictwo statusu §3 w języku angielskim, aby parser nadal działał.
- **Porzucony plan (Status `planned`/`implementing`, użytkownik chce pominąć).** Zapytaj wyraźnie; jeśli potwierdzone, oznacz jako `complete` z jednowierszową notatką o pominięciu i przejdź dalej. Nigdy nie przechodź dalej po cichu.
