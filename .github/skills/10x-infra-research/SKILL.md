---
name: 10x-infra-research
description: >
  Research and recommend an MVP deployment platform via a short interview plus
  parallel, bias-checked web research; writes context/foundation/infrastructure.md
  with a scored comparison and risk register. Trigger phrases: "choose a platform",
  "where should I deploy", "infra research", "wybierz platformę",
  "gdzie deployować", "jaka platforma do deploymentu". Use AFTER /10x-prd or
  /10x-tech-stack-selector, BEFORE /10x-implement.
---

# Badanie platformy: Świadoma platforma wdrożeniowa dla MVP

Ta umiejętność prowadzi do **świadomej decyzji dotyczącej infrastruktury** — nie jest to rekomendacja oparta na przeczuciach, lecz na stosie technologicznym projektu, ograniczeniach operacyjnych dewelopera, świeżych badaniach internetowych oraz trzech soczewkach anty-uprzedzeniowych, które poddają zwycięską platformę testom obciążeniowym przed zarejestrowaniem decyzji.

Jedynym rezultatem jest plik `context/foundation/infrastructure.md` — trzecia umowa decyzyjna w łańcuchu fundamentów po `prd.md` (co i dla kogo) i `tech-stack.md` (z czym budować). Zawiera: porównanie platform z punktacją, uzasadnienie rekomendacji, historię operacyjną (podgląd / sekrety / wycofywanie / zatwierdzanie / logi) oraz rejestr ryzyka z wstępnie wypełnionymi notatkami dotyczącymi łagodzenia.

## Kiedy używać, kiedy pominąć

**Użyj, gdy**: użytkownik musi wybrać platformę wdrożeniową/hostingową dla MVP i chce ustrukturyzowanej, opartej na badaniach decyzji. Umiejętność działa najlepiej, gdy istnieje `context/foundation/tech-stack.md` — używa stosu jako twardego ograniczenia podczas oceny platform.

**Pomiń, gdy**: platforma jest już wybrana, a użytkownik chce pomocy w konfiguracji CI/CD lub pisaniu Dockerfile'ów — te kwestie wykraczają poza zakres tej umiejętności (patrz Non-Goals). Pomiń również, gdy użytkownik pyta o architekturę na skalę produkcyjną; ta umiejętność koncentruje się na wdrożeniach MVP.

## Związek z innymi umiejętnościami

- `/10x-prd` — upstream. Tworzy `context/foundation/prd.md` z kontekstem produktu. Opcjonalne wejście.
- `/10x-tech-stack-selector` — upstream. Tworzy `context/foundation/tech-stack.md`. Główne wejście z twardymi ograniczeniami — ładuje je, jeśli jest obecne.
- `/10x-stack-assess` — pokrewne. Ocenia istniejący stos pod kątem przyjazności dla agenta. Badanie infrastruktury jest uzupełnieniem wdrożenia.
- `/10x-implement` — downstream. Odczytuje `context/foundation/infrastructure.md`, aby informować o krokach wdrożenia podczas implementacji.

## Cele nieobjęte

Ta umiejętność **nie**:
- Buduje obrazów Docker ani nie pisze Dockerfile'ów.
- Konfiguruje potoków CI/CD.
- Planuje poza zakresem MVP (średnioterminowe prognozy kosztów są w porządku; wieloregionowe HA wykracza poza zakres).

## Wymagane dane wejściowe

1. `references/agent-friendly-criteria.md` — dołączone. Pięć kryteriów platformy używanych jako soczewka oceny.

## Opcjonalne dane wejściowe

1. `context/foundation/tech-stack.md` — jeśli jest obecny, umiejętność odczytuje język, framework i środowisko uruchomieniowe, aby odfiltrować platformy, które ich nie obsługują.
2. `context/foundation/prd.md` — jeśli jest obecny, umiejętność odczytuje kontekst produktu (skala użytkowników, wymagania dotyczące opóźnień), aby ważyć badania.

## Początkowa odpowiedź

Gdy ta umiejętność zostanie wywołana:

1. **Jeśli podano argument ścieżki** (np. `/10x-infra-research @context/foundation/tech-stack.md`), usuń początkowy `@`, jeśli jest obecny, i użyj ścieżki jako lokalizacji stosu technologicznego dla tego uruchomienia.
2. **Jeśli brak argumentu**, sprawdź `context/foundation/tech-stack.md`. Załaduj go, jeśli jest obecny; kontynuuj bez niego, jeśli go brakuje.

## Przepływ pracy

### Krok 0 — Konfiguracja i ładowanie kontekstu

Załaduj pliki kontekstu. Dla każdego istniejącego pliku, odczytaj go i wyodrębnij odpowiednie pola:

- `context/foundation/tech-stack.md` → język, framework, środowisko uruchomieniowe, baza danych (twarde ograniczenia dla kompatybilności platformy)
- `context/foundation/prd.md` → oczekiwana skala użytkowników, wymagania dotyczące opóźnień/dostępności (miękkie wagi dla punktacji platformy)

Załaduj `references/agent-friendly-criteria.md` — to jest soczewka oceny używana w Kroku 3.

Wyświetl, co zostało załadowane:

```
Context loaded:
  Tech stack:    <language> / <framework> / <runtime>  [or "not found — will infer from cwd"]
  PRD context:   <scale / latency notes>               [or "not found — skipping"]
  Platform criteria: references/agent-friendly-criteria.md ✓
```

### Krok 1 — Wywiad z deweloperem (5 pytań)

Zadaj użytkownikowi pięć pytań typu Tak / Nie / Nie wiem. Zadawaj każde pytanie pojedynczo. Zbierz wszystkie odpowiedzi przed przejściem do badań.

**Pytanie 1**

Zapytaj użytkownika: "Czy Twoja aplikacja wymaga trwałych połączeń po stronie serwera — WebSockets, long-polling, czy procesów roboczych w tle, które muszą pozostać aktywne między żądaniami?"
  Opcje:
  - "Tak" (Aplikacja potrzebuje zawsze aktywnych procesów lub długotrwałych połączeń.)
  - "Nie" (Tylko żądanie/odpowiedź — każde żądanie jest bezstanowe.)
  - "Nie wiem" (Jeszcze nie jestem pewien.)

**Pytanie 2**

Zapytaj użytkownika: "Czy minimalizacja miesięcznych kosztów jest najwyższym priorytetem na etapie MVP, czy ważniejsze jest doświadczenie dewelopera i szybkość iteracji?"
  Opcje:
  - "Minimalizuj koszty" (Chcę najtańszą możliwą opcję, nawet jeśli DX jest trudniejszy.)
  - "Priorytetyzuj DX" (Zapłacę rozsądną kwotę za płynniejszy cykl rozwoju.)
  - "Nie wiem / mniej więcej równo" (Brak silnych preferencji.)

**Pytanie 3**

Zapytaj użytkownika: "Czy Ty lub Twój zespół macie już praktyczne doświadczenie z jakąkolwiek konkretną platformą, na którą czulibyście się komfortowo wdrażając?"
  Opcje:
  - "Tak — Vercel / Netlify" (Komfortowo z platformami w stylu JAMstack.)
  - "Tak — Cloudflare (Workers / Pages)" (Komfortowo z wdrożeniami typu edge-first.)
  - "Tak — Railway / Render / Fly.io" (Komfortowo z PaaS opartymi na kontenerach.)
  - "Tak — AWS / GCP / Azure" (Komfortowo z infrastrukturą hyperscalerów.)
  - "Brak silnej znajomości" (Otwarty na to, co najlepiej pasuje.)

**Pytanie 4**

Zapytaj użytkownika: "Czy spodziewasz się, że aplikacja będzie obsługiwać użytkowników globalnie (ważne edge/CDN) czy głównie z jednego regionu?"
  Opcje:
  - "Globalnie — opóźnienia między regionami mają znaczenie" (Użytkownicy będą na różnych kontynentach.)
  - "Jeden region jest w porządku" (Wszyscy użytkownicy są w jednym kraju / regionie.)
  - "Jeszcze nie wiem" (Nie jestem pewien docelowej geografii.)

**Pytanie 5**

Zapytaj użytkownika: "Czy wdrożenie będzie wymagało współlokowanych usług zarządzanych — bazy danych, przechowywania obiektów, kolejek — z tej samej platformy, czy zewnętrzni dostawcy są w porządku?"
  Opcje:
  - "Preferowana współlokacja" (Chcę bazę danych, przechowywanie itp. od tego samego dostawcy, aby było prosto.)
  - "Zewnętrzni dostawcy są w porządku" (Użyję oddzielnych usług (np. Supabase, Upstash, Cloudflare R2).)
  - "Jeszcze nie wiem" (Jeszcze nie zdecydowałem o warstwie danych.)

Zapisz wszystkie pięć odpowiedzi jako ograniczenia badawcze przed przejściem do Kroku 2.

### Krok 2 — Równoległe badanie platform

Użyj subagentów do równoległego badania platform. Celem jest zebranie wystarczającej ilości sygnałów, aby ocenić każdą platformę pod kątem pięciu kryteriów z `references/agent-friendly-criteria.md`, przefiltrowanych przez twarde ograniczenia ze stosu technologicznego i odpowiedzi z wywiadu.

**Pula kandydatów na platformy** (zbadaj je, a następnie oceń i zawęź):

| Platforma | Główny przypadek użycia |
|---|---|
| Cloudflare Workers + Pages | Edge-first, serverless JS/TS, globalny CDN |
| Vercel | Frontend + funkcje serverless, natywny Next.js |
| Netlify | Frontend + serverless, JAMstack, prymitywy formularzy/autoryzacji |
| Fly.io | PaaS oparty na kontenerach, trwałe procesy, wieloregionowy |
| Railway | Full-stack PaaS, współlokowane bazy danych, szybki DX |
| Render | Hosting kontenerów/statyczny, darmowy plan, zadania cron |

Dla każdej platformy uruchom subagenta z ukierunkowanym zapytaniem badawczym. Uruchom wszystkie sześć równolegle:

```
Research [Platform Name] as an MVP deployment target.

Focus on:
1. Supported runtimes and languages (especially: <language from tech stack>)
2. CLI tooling — what commands deploy, rollback, and tail logs?
3. Whether docs are available as markdown/llms.txt on GitHub
4. Free tier and estimated cost at 10k-100k monthly requests
5. Persistent process / WebSocket support (yes / no / limited)
6. Co-located managed services (database, storage, queues)
7. MCP server or AI assistant integration (if any)
8. Known limitations or gotchas for <framework from tech stack>
9. Current status of every feature mentioned above: GA / beta / preview / deprecated / region-limited.
   For any non-GA feature, capture the explicit caveat and the date the status was checked.

Return: a brief factual summary (200-300 words) with evidence links. Mark every
beta/preview/region-limited capability inline so it carries forward into the risk register.
```

Użyj narzędzi do wyszukiwania w sieci lub pobierania stron internetowych, aby znaleźć aktualne strony z cennikami, oficjalną dokumentację i najnowsze porównania społeczności (szukaj treści z lat 2024-2025).

Po zakończeniu pracy przez wszystkich subagentów, zsyntetyzuj ich ustalenia w matrycę punktacji.

### Krok 3 — Ocena i lista skrócona

Oceń każdą badaną platformę pod kątem pięciu kryteriów z `references/agent-friendly-criteria.md`. Najpierw zastosuj twarde filtry:

**Twarde filtry** (platforma, która ich nie przejdzie, jest usuwana z listy skróconej):
- Jeśli pytanie 1 z wywiadu = "Tak (wymagane trwałe połączenia)" → usuń platformy, które nie mogą uruchamiać trwałych procesów (Netlify, Vercel tylko serverless).
- Jeśli stos technologiczny używa środowiska uruchomieniowego nieobsługiwanego przez platformę → usuń tę platformę.

**Punktacja** (Zaliczone / Częściowo / Niezaliczone dla każdego kryterium):

| Platforma | CLI-first | Managed/Serverless | Dokumentacja czytelna dla agenta | Stabilne API wdrożeniowe | MCP / Integracja | Razem |
|---|---|---|---|---|---|---|
| Cloudflare | | | | | | |
| Vercel | | | | | | |
| Netlify | | | | | | |
| Fly.io | | | | | | |
| Railway | | | | | | |
| Render | | | | | | |

Miękko waż kryteria według odpowiedzi z wywiadu:
- Pytanie 2 "minimalizuj koszty" → karaj platformy z drogimi podstawowymi planami.
- Pytanie 3 "istniejąca znajomość" → rozstrzygaj remisy na korzyść znanej platformy.
- Pytanie 4 "globalny zasięg" → preferuj platformy edge-native.
- Pytanie 5 "preferowana współlokacja" → preferuj platformy ze zintegrowanymi bazami danych.

**Skróć listę do 3 najlepszych platform** według łącznej punktacji (po filtrach i wagach). Przedstaw listę skróconą z jednopoziomowym uzasadnieniem dla każdej platformy przed przejściem do weryfikacji krzyżowej.

Wydrukuj dla użytkownika:

```
Shortlisted platforms:
  1. <Platform A> — <one-sentence rationale>
  2. <Platform B> — <one-sentence rationale>
  3. <Platform C> — <one-sentence rationale>

Running anti-bias cross-check on the top recommendation (<Platform A>)...
```

### Krok 4 — Weryfikacja krzyżowa anty-uprzedzeniowa

Uruchom trzy zapytania weryfikacji krzyżowej dla najwyżej ocenianej platformy. Wykonaj je samodzielnie (nie uruchamiaj subagentów) — jesteś sceptykiem.

**Weryfikacja krzyżowa 1 — Adwokat diabła**

Mentalnie zastosuj tę soczewkę i zapisz wynik jako numerowaną listę słabych stron (3-5 pozycji):

> Działaj jako niezwykle sceptyczny i doświadczony architekt oprogramowania. Twoim jedynym zadaniem jest znalezienie wszystkich możliwych słabych stron, ukrytych kosztów, ryzyk technicznych i powodów, dla których wdrożenie `<tech stack>` na `<Platform A>` mogłoby zakończyć się niepowodzeniem w praktyce dla tego MVP. Bądź konkretny — nazwij tryby awarii, a nie kategorie.

**Weryfikacja krzyżowa 2 — Pre-mortem**

Mentalnie zastosuj tę soczewkę i napisz krótką narrację (150-200 słów):

> Zespół wdrożył `<tech stack>` na `<Platform A>` dla swojego MVP. Sześć miesięcy później decyzja okazała się kompletną katastrofą. Przejdź przez błędne założenia, decyzje techniczne i niedoszacowane ryzyka, które doprowadziły do tej porażki — krok po kroku.

**Weryfikacja krzyżowa 3 — Nieznane niewiadome**

Mentalnie zastosuj tę soczewkę i przedstaw 3-5 rzeczy, o których użytkownik może nie wiedzieć:

> Podczas wdrażania `<tech stack>` na `<Platform A>`, jakie są „nieznane niewiadome” — rzeczy, o których użytkownik powinien wiedzieć przed rozpoczęciem pracy, a które nie są oczywiste ze strony marketingowej platformy ani dokumentacji?

Po wszystkich trzech weryfikacjach krzyżowych, przedstaw wyniki użytkownikowi i zapytaj:

Zapytaj użytkownika: "Weryfikacja krzyżowa anty-uprzedzeniowa ujawniła pewne ryzyka dla <Platform A>. Jak chcesz postąpić?"
  Opcje:
  - "Kontynuuj z <Platform A> — ryzyka zanotowane" (Ryzyka są do opanowania. Uwzględnij je w rejestrze ryzyka w wynikach.)
  - "Zmień na <Platform B>" (Ryzyka są wystarczająco znaczące, aby preferować drugą opcję.)
  - "Zmień na <Platform C>" (Ryzyka są wystarczająco znaczące, aby preferować trzecią opcję.)

Zastosuj wybór użytkownika. Jeśli zmienią na B lub C, ponownie uruchom trzy weryfikacje krzyżowe dla nowego najlepszego wyboru i przedstaw wyniki (nie trzeba pytać ponownie — zanotuj i kontynuuj).

### Krok 5 — Zapisz wynik

Sprawdź kolizję, próbując odczytać `context/foundation/infrastructure.md`.

Jeśli plik istnieje, zapytaj:

Zapytaj użytkownika: "context/foundation/infrastructure.md już istnieje. Jak chcesz postąpić?"
  Opcje:
  - "Nadpisz (Zalecane)" (Zastąp istniejący plik. Poprzednia wersja zostanie utracona, chyba że zostanie zatwierdzona.)
  - "Zapisz jako infrastructure-v2.md" (Zachowaj historię. Nowy plik zostanie umieszczony w następnym dostępnym miejscu wersji.)
  - "Przerwij" (Wyjdź bez zapisu. Rekomendacja zostanie zachowana tylko w czacie.)

Zbuduj plik wyjściowy:

```markdown
---
project: <project name from tech-stack.md, prd.md, or cwd directory name>
researched_at: <ISO 8601 date>
recommended_platform: <platform name>
runner_up: <platform name>
context_type: mvp
tech_stack:
  language: <language>
  framework: <framework>
  runtime: <runtime>
---

## Recommendation

**Deploy on <Platform Name>.**

<2-3 sentence rationale: why this platform for this specific tech stack and these specific constraints. Cite the scoring and interview answers that drove the decision.>

## Platform Comparison

<The full scoring matrix from Step 3, with one-paragraph notes per platform explaining each score.>

### Shortlisted Platforms

#### 1. <Platform A> (Recommended)

<Why it won: key strengths relative to the criteria and constraints.>

#### 2. <Platform B>

<Why it scored second: strengths and the gap vs. the recommendation.>

#### 3. <Platform C>

<Why it scored third: strengths and the gap vs. the recommendation.>

## Anti-Bias Cross-Check: <Recommended Platform>

### Devil's Advocate — Weaknesses

<Numbered list of 3-5 specific weaknesses surfaced in cross-check 1.>

### Pre-Mortem — How This Could Fail

<The 150-200 word failure narrative from cross-check 2.>

### Unknown Unknowns

<Bulleted list of 3-5 non-obvious risks from cross-check 3.>

## Operational Story

How the chosen platform actually operates day to day. One concrete answer per line — not a category.

- **Preview deploys**: <how PR / branch builds become preview URLs; whether they need protection (e.g. Cloudflare Access); any conditions on availability such as fork PRs>
- **Secrets**: <where env vars and tokens live (platform vault, GitHub Secrets, Workers Secrets); who can read them; rotation flow>
- **Rollback**: <command or click sequence to revert; typical time-to-revert; any data caveats such as DB migrations that don't roll back automatically>
- **Approval**: <which actions require a human (publish to production, rotate primary secret, drop a database); which an agent may perform unattended>
- **Logs**: <how the agent reads pipeline and runtime logs read-only — concrete CLI commands or MCP tools>

## Risk Register

For each identified risk: name, the cross-check lens that surfaced it, likelihood, impact, and a concrete mitigation step. Tying every risk back to a lens makes the register auditable — a future reader can see *why* each item is on the list.

| Risk | Source | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| <risk> | Devil's advocate / Pre-mortem / Unknown unknowns / Research finding | <L/M/H> | <L/M/H> | <concrete step> |

## Getting Started

<3-5 concrete first steps to deploy the project to the recommended platform. Specific to the tech stack — not generic. E.g., "Install wrangler: npm i -g wrangler", "Run: wrangler init <project-name>".>

## Out of Scope

The following were not evaluated in this research:
- Docker image configuration
- CI/CD pipeline setup
- Production-scale architecture (multi-region, HA, DR)
```

Zapisz zawartość do `context/foundation/infrastructure.md` (lub ścieżki z wersją, jeśli wybrano zapis z wersją). Utwórz `context/foundation/`, jeśli nie istnieje.

Po zapisie skopiuj wskazówkę dotyczącą następnego kroku do schowka, używając odpowiednich poleceń powłoki dla systemu operacyjnego użytkownika:

```bash
echo -n "/10x-implement" | pbcopy 2>/dev/null || echo -n "/10x-implement" | clip.exe 2>/dev/null || echo -n "/10x-implement" | xclip -selection clipboard 2>/dev/null || true
```

```powershell
# PowerShell (Windows)
Set-Clipboard "/10x-implement"
```

Wydrukuj:

```
═══════════════════════════════════════════════════════════
  INFRASTRUCTURE DECISION RECORDED
═══════════════════════════════════════════════════════════

  Platform:      <recommended platform>
  Runner-up:     <runner-up>
  Bias checks:   3 / 3 passed

  ► Decision:    context/foundation/infrastructure.md
  ► Next:        /10x-implement  (✓ copied to clipboard)
═══════════════════════════════════════════════════════════
```

STOP. Nie przechodź automatycznie do `/10x-implement` — użytkownik uruchamia go, gdy jest gotowy.

## Wynik

Zapisany pojedynczy plik: `context/foundation/infrastructure.md` (lub `infrastructure-vN.md`, jeśli wybrano zapis z wersją).

## Referencje

- `references/agent-friendly-criteria.md` — pięć kryteriów platformy, wskazówki dotyczące punktacji i uwagi dotyczące wag.

## Krytyczne zabezpieczenia

1. **Badaj przed rekomendowaniem.** Nigdy nie rekomenduj platformy wyłącznie na podstawie znajomości danych szkoleniowych. Zawsze przeprowadzaj równoległe badania internetowe (Krok 2) za pomocą narzędzi do wyszukiwania/pobierania stron internetowych przed punktacją. Przestarzałe wrażenia dotyczące cen lub obsługi funkcji prowadzą do błędnych rekomendacji.

2. **Stos technologiczny to twarde ograniczenie, a nie preferencja.** Jeśli stos technologiczny wymaga środowiska uruchomieniowego, którego platforma nie obsługuje (np. Python na środowisku uruchomieniowym edge tylko dla JS), ta platforma jest odrzucana — żadna ilość punktacji tego nie zmieni.

3. **Trzech kandydatów, nie jeden.** Zawsze skracaj listę do trzech platform. Użytkownik potrzebuje alternatyw na wypadek, gdyby najlepszy wybór został zablokowany przez koszty, uzależnienie od dostawcy lub ograniczenia organizacyjne.

4. **Anty-uprzedzenia są niepodlegające negocjacjom.** Trzy zapytania weryfikacji krzyżowej (adwokat diabła, pre-mortem, nieznane niewiadome) są uruchamiane przy każdym wywołaniu. Nie pomijaj ich, nawet jeśli najlepsza platforma jest oczywistym wyborem. Weryfikacja krzyżowa ujawnia ryzyka, które oczywiste wybory ukrywają.

5. **Odpowiedzi z wywiadu napędzają wagi, a nie wykluczenia.** Z wyjątkiem twardego filtra dotyczącego trwałych połączeń vs. serverless, odpowiedzi z wywiadu dostosowują wagi — nie dyskwalifikują platform. Użytkownik wrażliwy na koszty może nadal wybrać Fly.io, jeśli wynik DX jest wystarczająco wysoki; odpowiedź z wywiadu informuje o punktacji, a nie o puli kandydatów.

6. **Zakres to MVP, nie produkcja.** Umiejętność optymalizuje szybkość iteracji, niskie koszty operacyjne i koszty przy niskim ruchu. Nie wprowadzaj kwestii związanych ze skalą produkcyjną (przełączanie awaryjne w wielu regionach, zobowiązania SLA, dedykowane poziomy wsparcia), chyba że PRD wyraźnie tego wymaga.

7. **Etykiety wewnętrzne umiejętności pozostają wewnętrzne.** Rozmawiając z użytkownikiem, nigdy nie odwołuj się do numerów kroków ani wewnętrznych nazw pól. Używaj prostego języka: "porównanie platform", "zalecana opcja", "rejestr ryzyka".

8. **Weryfikuj polecenia "Getting Started" pod kątem dokładnych wersji w stosie technologicznym, a nie ogólnej dokumentacji platformy.** Adaptery platform, CLI i narzędzia do wdrażania szybko ewoluują — przepływ pracy, który był kanoniczny w jednej głównej wersji, może zostać zastąpiony lub być aktywnie błędny w następnej. Przed napisaniem jakiegokolwiek polecenia CLI lub lokalnej rekomendacji deweloperskiej w sekcji "Getting Started", sprawdź, co faktycznie robi dziś konkretna wersja adaptera/narzędzia w `tech-stack.md`. Zwróć szczególną uwagę na: (a) czy serwer deweloperski frameworka już zapewnia wierność środowiska uruchomieniowego dla docelowej platformy (czyniąc oddzielne polecenie deweloperskie natywne dla platformy zbędnym lub przestarzałym), (b) czy interfejsy API, klucze konfiguracyjne lub wzorce dostępu do środowiska zmieniły się między głównymi wersjami, oraz (c) czy narzędzia platformy zostały połączone, zmienione nazwy lub wycofane między tym, co opisuje ogólna dokumentacja, a tym, co faktycznie dostarczają przypięte wersje projektu. Wszelkie różnice w zachowaniu wynikające z wersji należy przedstawić jako "Nieznane niewiadome" w weryfikacji krzyżowej i odzwierciedlić tylko prawidłowy, zgodny z wersją przepływ pracy w sekcji "Getting Started". Nigdy nie kopiuj poleceń CLI dosłownie ze stron marketingowych platform ani ogólnych samouczków bez potwierdzenia, że mają zastosowanie do dokładnych używanych wersji stosu.