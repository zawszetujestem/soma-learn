---
name: 10x-shape
description: >
  Facilitate a structured discovery conversation that turns an idea —
  greenfield or brownfield, auto-detected from cwd — into shape-notes.md,
  the input to /10x-prd. Trigger phrases: "new project", "from scratch",
  "od pomysłu", "shape an idea", "I have an idea", "greenfield",
  "brownfield", "istniejący projekt", "zmiana w projekcie".
  Use BEFORE /10x-prd, not in place of it.
---

# Kształtowanie: Ułatwianie Odkrywania (Greenfield & Brownfield) Przed /10x-prd

Ta umiejętność jest początkiem łańcucha bootstrap. Dla greenfield: `/10x-shape → /10x-prd → 10x-tech-stack-selector → bootstrapper`. Dla brownfield: `/10x-shape → /10x-prd → 10x-stack-assess → 10x-health-check`. Jej jedyne zadanie: przeprowadzić użytkownika od "Mam pomysł" (greenfield) lub "Chcę zmienić ten system" (brownfield) do ustrukturyzowanego `context/foundation/shape-notes.md`, który `/10x-prd` może przekształcić w PRD zgodny z zablokowanym schematem.

Umiejętność ta jest **facylitatorem**, a nie generatorem treści. NIGDY nie pisze wizji, wymagań funkcjonalnych, zasad logiki biznesowej ani żadnych innych treści domenowych, których użytkownik nie powiedział. Jej wartość tkwi w kształcie pytań i ich kolejności, a nie w oferowanych odpowiedziach.

Zablokowany schemat, do którego dostosowują się zarówno ta umiejętność, jak i `/10x-prd`, znajduje się w `references/prd-schema.md` (względem tego SKILL.md). Przeczytaj go przed wytworzeniem jakiegokolwiek artefaktu i ponownie sprawdź go na każdym etapie zapisu punktu kontrolnego.

## Kiedy używać, kiedy pomijać

**Użyj, gdy**: użytkownik opisuje nowy pomysł na projekt (greenfield), znaczącą zmianę w istniejącym systemie — nowy moduł, istotną funkcję, ulepszenie architektury (brownfield) lub produkt, który chce przebudować od podstaw. Użyj również, gdy istniejący `context/foundation/shape-notes.md` jest niekompletny i wymaga wznowienia. Umiejętność automatycznie wykrywa typ kontekstu na podstawie znaczników projektu w bieżącym katalogu roboczym i dostosowuje się.

**Pomiń, gdy**: projekt ma już PRD lub zestaw ADR (użyj zamiast tego `/10x-frame` lub `/10x-plan`), lub użytkownik rozważa pojedynczy błąd / refaktoryzację / małą funkcję w istniejącej bazie kodu, która nie wymaga pełnego PRD (użyj `/10x-frame`). W przypadku projektów brownfield, gdzie użytkownik chce ukształtować znaczącą zmianę, ta umiejętność JEST właściwym punktem wyjścia.

## Relacje z innymi umiejętnościami

- `/10x-init` — tworzy szkielet `/context` (`changes/`, `archive/`, `foundation/`) oraz uniwersalne pliki README w każdym z nich. `/10x-shape` wymaga istnienia `context/foundation/`; jeśli go brakuje, deleguje do `/10x-init` poprzez wywołanie narzędzia (Krok 0 poniżej).
- `/10x-prd` — konsumuje `shape-notes.md`. Przekazanie to zapis do schowka `## Krok 8`.
- `/10x-frame` — do *przeformułowania* problemów o małym zakresie w istniejących systemach, gdzie pełne PRD jest przesadą. `/10x-shape` jest przeznaczony do większych zmian brownfield (nowe moduły, znaczące funkcje), które wymagają ustrukturyzowanego odkrywania i PRD.
- `/10x-stack-assess` — następny po `/10x-prd` dla projektów brownfield. Ocenia istniejący stos pod kątem bram jakości.
- `/10x-health-check` — następny po `/10x-stack-assess` dla brownfield. Audytuje stan istniejącego projektu.
- `/10x-plan` — następny po `/10x-prd`, nigdy nie wywoływany bezpośrednio stąd.

## Początkowa odpowiedź

Gdy ta umiejętność zostanie wywołana:

1. **Jeśli jako argument podano swobodny pomysł** (np. `/10x-shape aplikacja z przepisami, która sugeruje posiłki z tego, co jest w lodówce`), zapisz go dosłownie jako **pomysł początkowy**. Nie parafrazuj. Przejdź do Kroku 0.
2. **Jeśli podano ścieżkę pliku** (np. `/10x-shape @notes/idea.md`), przeczytaj go W CAŁOŚCI i użyj jego zawartości jako pomysłu początkowego. Przejdź do Kroku 0.
3. **Jeśli nic nie podano**, odpowiedz:

```
Pomogę Ci ukształtować pomysł w ustrukturyzowane notatki, które /10x-prd może
przekształcić w prawdziwe PRD — niezależnie od tego, czy zaczynasz od zera
(greenfield), czy kształtujesz zmianę w istniejącym systemie (brownfield).

Proszę podziel się:
1. Pomysłem początkowym — co chcesz zbudować lub zmienić, własnymi słowami?
2. (Opcjonalnie) Wszelkimi wstępnymi notatkami, szkicami lub linkami, które
   powinienem przeczytać

Wskazówka: przekaż pomysł w linii — `/10x-shape aplikacja z przepisami, która
     wykorzystuje zawartość lodówki`
     lub dla brownfield — `/10x-shape dodaj silnik rekomendacji do mojej
     aplikacji z przepisami`
```

Następnie czekaj.

## Proces

### Krok 0: Sprawdź warunek wstępny 10xWorkflow

Sprawdź szkielet 10xWorkflow, testując dwie ścieżki:

```bash
test -d context/foundation
```

Jeśli istnieje, przejdź do Kroku 0.5.

Jeśli brakuje, projekt nie został zainicjowany dla 10xWorkflow. Zapytaj użytkownika:
"Ten katalog nie jest zainicjowany dla 10xWorkflow (brakuje context/foundation/). Uruchomić /10x-init teraz?" z opcjami:
- "Tak — uruchom /10x-init (Zalecane)" (opis: "Tworzy szkielet /context (changes/, archive/, foundation/) z plikami README, a następnie kontynuuje kształtowanie.")
- "Nie — zatrzymaj tutaj" (opis: "Wyjdź bez zmian. Będziesz musiał zainicjować przed uruchomieniem kształtowania.")

W przypadku "Tak": wywołaj `/10x-init` poprzez wywołanie narzędzia (NIE przez Bash). Gdy `/10x-init` zwróci wynik, ponownie sprawdź warunek wstępny; jeśli teraz przejdzie, kontynuuj do Kroku 0.5. W przypadku "Nie": wydrukuj "Zatrzymywanie. Uruchom `/10x-init`, gdy będziesz gotowy, a następnie ponownie wywołaj `/10x-shape`." i ZATRZYMAJ.

Nie duplikuj logiki szkieletu `/10x-init`. Wywołanie narzędzia do umiejętności jest poprawną ścieżką delegacji.

### Krok 0.5: Wykrywanie wznowienia

Przed rozpoczęciem od nowa, sprawdź poprzednią sesję:

```bash
test -f context/foundation/shape-notes.md
```

Jeśli brakuje, przejdź do Kroku 1 z nową sesją.

Jeśli istnieje, przeczytaj plik W CAŁOŚCI. Przeanalizuj blok frontmatter `checkpoint:` zgodnie z odniesieniem do schematu (`references/prd-schema.md`, sekcja "shape-notes.md checkpoint format"). Wyodrębnij: `current_phase`, `phases_completed`, `frs_drafted`, `quality_check_status`.

Podsumuj, co znalazłeś:

```
Znaleziono poprzednią sesję kształtowania w context/foundation/shape-notes.md:

  Projekt:                 [z pola projektu frontmatter, lub "(bez nazwy)"]
  Bieżąca faza:            [N — Nazwa fazy]
  Ukończone fazy:          [lista]
  Wymagania funkcjonalne (FRs) sporządzone do tej pory: [liczba]
  Status kontroli jakości: [oczekujące | ostrzeżone | zaakceptowane]
```

Następnie zapytaj użytkownika:
"Jak chcesz postąpić?" z opcjami:
- "Wznów od Fazy [następna] (Zalecane)" (opis: "Kontynuuj od miejsca, w którym zakończyła się poprzednia sesja. Ukończone fazy są podsumowywane, a nie odtwarzane.")
- "Rozpocznij od zera" (opis: "Zarchiwizuj istniejący shape-notes.md do context/foundation/archive/ i rozpocznij nową sesję.")
- "Anuluj" (opis: "Wyjdź bez zmian.")

W przypadku "Wznów": przejdź bezpośrednio do następnej nieukończonej fazy (Krok `current_phase` + (1, jeśli bieżąca jest w `phases_completed`, w przeciwnym razie 0)). NIE uruchamiaj ponownie ukończonych faz — tylko podsumuj każdą z nich użytkownikowi w 1-2 zdaniach ("Faza 1 przechwycona: <jednolinijkowy problem>; Faza 2 przechwycona: <jednolinijkowa persona>; …"), aby miał kontekst tego, co zostało już ustalone.

W przypadku "Rozpocznij": przenieś istniejący plik do `context/foundation/archive/shape-notes-<RRRR-MM-DD-GGMM>.md` (utwórz katalog archiwum, jeśli go brakuje), a następnie przejdź do Kroku 1 z nową sesją.

W przypadku "Anuluj": ZATRZYMAJ bez zmian.

### Krok 0.7: Wykrywanie typu kontekstu

Przed wejściem w pętlę odkrywania, określ, czy jest to sesja greenfield, czy brownfield. Wykrywanie odbywa się raz; wynik (`context_type`) jest zapisywany do frontmatter shape-notes.md i steruje zachowaniem fazy przez resztę sesji.

**Automatyczne wykrywanie**: oceń bieżący katalog roboczy w trzech poziomach sygnałów. Pojedynczy plik manifestu nie wystarczy — pusty katalog `npm init -y` nie powinien wywoływać brownfield.

```bash
# Poziom 1 (silny): kontrola wersji z historią
git log --oneline -1 2>/dev/null && echo "T1:git-history"

# Poziom 2 (średni): pliki lockfile dowodzą, że nastąpiło rzeczywiste rozwiązanie zależności
ls package-lock.json yarn.lock pnpm-lock.yaml Cargo.lock poetry.lock go.sum Gemfile.lock composer.lock 2>/dev/null | while read f; do echo "T2:$f"; done

# Poziom 3 (słaby): same pliki manifestu — może to być świeża inicjalizacja
ls package.json Cargo.toml pyproject.toml go.mod Gemfile composer.json 2>/dev/null | while read f; do echo "T3:$f"; done

# Dodatkowe sygnały (potwierdzają, nie wywołują samodzielnie): katalogi źródłowe, konfiguracje frameworków, CI
ls -d src/ app/ lib/ .github/ .gitlab-ci.yml Dockerfile tsconfig.json next.config.* vite.config.* 2>/dev/null | while read f; do echo "B:$f"; done
```

```powershell
# PowerShell (Windows) — użyj tego bloku zamiast powyższego bloku bash w powłokach Windows.
# NIE pozwól, aby translator bash→PowerShell przepisał blok bash: wzorzec `while read f; do echo "B:$f"`
# generuje dosłowny ciąg "B:$f", który Windows interpretuje jako dysk `B:`, wywołując
# monit o uprawnienia dla nieistniejącego dysku.

# Poziom 1 (silny): kontrola wersji z historią
if (git log --oneline -1 2>$null) { "T1:git-history" }

# Poziom 2 (średni): pliki lockfile dowodzą, że nastąpiło rzeczywiste rozwiązanie zależności
@('package-lock.json','yarn.lock','pnpm-lock.yaml','Cargo.lock','poetry.lock','go.sum','Gemfile.lock','composer.lock') |
  Where-Object { Test-Path -LiteralPath $_ } | ForEach-Object { "T2:$_" }

# Poziom 3 (słaby): same pliki manifestu — może to być świeża inicjalizacja
@('package.json','Cargo.toml','pyproject.toml','go.mod','Gemfile','composer.json') |
  Where-Object { Test-Path -LiteralPath $_ } | ForEach-Object { "T3:$_" }

# Dodatkowe sygnały (potwierdzają, nie wywołują samodzielnie): katalogi źródłowe, konfiguracje frameworków, CI
@('src','app','lib','.github','.gitlab-ci.yml','Dockerfile','tsconfig.json') |
  Where-Object { Test-Path -LiteralPath $_ } | ForEach-Object { "B:$_" }
Get-ChildItem -Path . -Filter 'next.config.*' -File -ErrorAction SilentlyContinue |
  ForEach-Object { "B:$($_.Name)" }
Get-ChildItem -Path . -Filter 'vite.config.*' -File -ErrorAction SilentlyContinue |
  ForEach-Object { "B:$($_.Name)" }
```

Punktacja:
- **Trafienie Poziomu 1** (istnieje historia git) → silny sygnał brownfield
- **Trafienie Poziomu 2** (istnieje plik lockfile) → silny sygnał brownfield
- **Poziom 1 + Poziom 2** → brownfield o wysokiej pewności
- **Tylko Poziom 3** (manifest, brak lockfile, brak git) → niejednoznaczne — może to być świeże `npm init`
- **Brak sygnałów** → greenfield

Logika decyzji:
- **Dowolne trafienie Poziomu 1 lub Poziomu 2** → proponuj `context_type: brownfield`
- **Tylko Poziom 3** → proponuj brownfield, ale zaznacz niejednoznaczność: "Znalazłem plik manifestu, ale brak pliku lockfile lub historii git — może to być świeżo zainicjowany projekt, a nie prawdziwy brownfield."
- **Brak sygnałów** → proponuj `context_type: greenfield`

Wydrukuj, co zostało wykryte:

- **Brownfield o wysokiej pewności** (T1 lub T2):
  ```
  Wygląda na istniejący projekt:
    [lista wykrytych sygnałów, np. "historia git (47 commitów)", "package-lock.json", "katalog src/"]
  Będę działać w trybie brownfield — skupiając się na tym, co istnieje, co się zmienia,
  i co musi zostać zachowane.
  ```

- **Niejednoznaczne** (tylko T3):
  ```
  Znalazłem [plik manifestu], ale brak pliku lockfile lub historii git — może to być
  świeżo zainicjowany projekt lub prawdziwy brownfield. Zaproponuję tryb brownfield,
  ale zmienię na greenfield, jeśli zaczynasz od zera.
  ```

- **Greenfield** (brak sygnałów):
  ```
  Nie znaleziono znaczników projektu w tym katalogu — będę działać w trybie greenfield,
  co zakłada, że zaczynasz od zera.
  ```

Następnie potwierdź z użytkownikiem:
"Wykryty kontekst: [greenfield|brownfield]. Czy to poprawne?" z opcjami:
- "[Greenfield|Brownfield] — poprawne (Zalecane)" (opis: "[Opis automatycznie wykrytego trybu]")
- "[Inny tryb] — zmień" (opis: "Zamiast tego przełącz na [inny tryb].")

Potwierdzony `context_type` zapisz natychmiast do frontmatter shape-notes.md (obok `checkpoint:`). Ta wartość jest kluczowa dla automatycznego routingu `/10x-prd`.

Przy wznowieniu (Krok 0.5), jeśli shape-notes.md ma już `context_type:` we frontmatter, pomiń automatyczne wykrywanie — tryb jest zablokowany z poprzedniej sesji.

### Wzorzec odkrywania (dotyczy każdego z poniższych Kroków 1-6)

Każda faza odkrywania przebiega według tej samej pętli. Zinternalizuj to przed przeczytaniem kroków dla poszczególnych faz; treść dla poszczególnych faz to to, o co pytać, a nie jak pytać.

Wzorzec to **BMAD-Facilitator + GSD-Gray-Area + mattpocock-recommended-answer + Socrates challenge**:

1. **Rozpocznij fazę** od jednolinijkowego stwierdzenia, co ta faza wytwarza, i jednego otwartego pytania, aby wywołać pierwszą próbę użytkownika. (Postawa facylitatora BMAD: nigdy nie generuj treści samodzielnie.)
2. **Wskaż 3-5 szarych obszarów** jako decyzje wielokrotnego wyboru, gdy pierwsza próba użytkownika zawiera niejasności. Użyj narzędzia, aby zadać użytkownikowi pytanie. Każda opcja to rzeczywista pozycja z kompromisem, a nie symbol zastępczy. (Odkrywanie szarych obszarów GSD.)
3. **Oznacz zalecaną opcję** jako "(Zalecane)" w etykiecie i umieść ją jako pierwszą. Zawsze uwzględnij opcję "Nie jestem pewien / nie zdecydowałem". (mattpocock-recommended-answer — łagodzenie zmęczenia.)
4. **Zablokuj decyzję z powrotem u użytkownika** jako jednolinijkowe podsumowanie, które potwierdza, zanim zapiszesz na dysku.
5. **Zapisz sekcję(e) fazy** do `shape-notes.md` i zaktualizuj `checkpoint.current_phase` oraz `checkpoint.phases_completed` zgodnie ze schematem.

**Twarde zasady**:

- NIGDY nie generuj treści, których użytkownik nie powiedział. Jeśli sekcja potrzebuje wartości, której użytkownik nie podał, zapytaj — nie wymyślaj. Wyjątkiem jest formatowanie mechaniczne (numeracja FR-NNN, nagłówki sekcji, szkielet frontmatter).
- NIGDY nie zobowiązuj się z góry do stosu technologicznego (framework, baza danych, platforma hostingowa, rodzina języków). PRD przechwytuje tylko priorytety na poziomie produktu — `product_type`, `target_scale`, `timeline_budget`. Kwestie związane ze stosem są zbierane po `/10x-prd`.
- NIGDY nie używaj języka 10xDevs / kohorty / certyfikacji w dostarczanym produkcie. Mechanika tutaj to uniwersalne wskaźniki dobrze zdefiniowanego projektu. Artefakt skierowany do użytkownika wygląda jak ogólna umiejętność kształtowania.

### Krok 1: Wizja i problem

Ta faza tworzy sekcje `## Wizja i Oświadczenie o Problemie` oraz `## Użytkownik i Persona` (tylko główna persona) w `shape-notes.md`. Dwie sekcje, a nie jedna, ponieważ persona wiąże problem. **Brownfield** tworzy również sekcję `## Bieżący System`.

#### Tryb greenfield

Rozpocznij od: "Zacznijmy od bólu. W jednym lub dwóch zdaniach — kto go ma, w którym momencie go odczuwa, ile go to dziś kosztuje?"

Słuchaj. Powtórz trzy komponenty oddzielnie:

```
Ból:         [dosłowny problem]
Osoba:       [kto go ma — nazwij rolę, a nie "użytkowników"]
Moment:      [kiedy go odczuwa — sytuacja, która wywołuje ból]
Koszt dziś:  [co obecnie robią i ile ich to kosztuje]
```

Jeśli którykolwiek z czterech jest niejasny ("wszyscy", "zawsze", "dużo bólu"), zakwestionuj go pytaniem Sokratesa: "Co musiałoby być prawdą, aby to był zły problem do rozwiązania?" lub "Kogo konkretnie widziałeś, kto doświadczył tego w ostatnim miesiącu?"

Następnie wskaż szare obszary (użyj narzędzia, aby zadać użytkownikowi pytanie z 2-4 pytaniami, **multiSelect na pytaniach, gdzie wiele pozycji może współistnieć**):

- Kategoria bólu — jaki to rodzaj bólu? (tarcie w przepływie pracy / brakująca funkcja / dane uwięzione gdzieś / paraliż decyzyjny / narzut koordynacji / inne)
- Wgląd — co użytkownik wie, czego status quo nie wie? (użyj Sokratesa: "Jeśli twój pomysł jest oczywisty, dlaczego to nie zostało jeszcze zbudowane?")
- Zakres głównej persony — kto dokładnie? (konkretna rola w organizacji / osoby w wielu organizacjach / jeden nazwany użytkownik, w tym ty / nisza hobbystyczna / nie jestem pewien)

#### Tryb brownfield

Rozpocznij od: "Zacznijmy od obecnego systemu. W kilku zdaniach — co istnieje dzisiaj, kto tego używa i jaki jest punkt bólu lub brakująca funkcja, która napędza tę zmianę?"

Słuchaj. Powtórz pięć komponentów oddzielnie:

```
Obecny system:  [co istnieje — nazwij produkt/usługę/moduł]
Stos technologiczny: [języki, frameworki, infrastruktura, o których wspomina użytkownik]
Użytkownicy:    [kto tego używa dzisiaj — nazwij role, a nie "użytkowników"]
Ból / luka:     [co jest nie tak lub czego brakuje — wyzwalacz tej zmiany]
Musi zostać zachowane: [co NIE MOŻE się zepsuć — istniejące zachowanie, integracje, dane]
```

Jeśli użytkownik nie potrafi sprecyzować "musi zostać zachowane", zakwestionuj go: "Gdyby ta zmiana jutro coś zepsuła, co by cię zaalarmowało?" lub "Co twoi obecni użytkownicy zauważyliby najpierw?"

Następnie wskaż szare obszary:

- Kategoria zmiany — jaki to rodzaj zmiany? (nowy moduł / znacząca funkcja / ulepszenie architektury / migracja / integracja / inne)
- Wgląd — co użytkownik wie o obecnym systemie, co sprawia, że ta zmiana nie jest oczywista? (Sokrates: "Dlaczego to nie zostało jeszcze zrobione?")
- Zakres głównej persony — tak samo jak w greenfield

Najpierw napisz sekcję `## Bieżący System` (sekcja tylko dla brownfield — opisuje, co istnieje), następnie `## Wizja i Oświadczenie o Problemie` (przeformułowane jako różnica: co się zmienia i dlaczego), a następnie `## Użytkownik i Persona`.

#### Oba tryby

Zablokuj przechwyconą treść, dopasowując ją do struktury sekcji schematu. Dołącz do `shape-notes.md`. Zaktualizuj `checkpoint.current_phase: 2` i dodaj `1` do `checkpoint.phases_completed`.

### Krok 2: Persona i kontrola dostępu

Ta faza tworzy sekcję `## Kontrola Dostępu`. Persona została przechwycona w Kroku 1; tutaj pytamy, jak persona dociera do produktu.

#### Tryb greenfield

Rozpocznij od: "Jak ta osoba dostaje się do aplikacji? Logowanie, lokalny profil, klucz dostępu, brak autoryzacji w ogóle?"

Użyj narzędzia, aby zadać użytkownikowi pytanie z opcjami zaczerpniętymi z najczęstszych form:

- Logowanie (e-mail + hasło / OAuth / bezhasłowe) (Zalecane dla wielu użytkowników web/mobile)
- Lokalny profil (dane znajdują się na urządzeniu, brak serwera) (Zalecane dla solo / zorientowanych na prywatność)
- Klucz dostępu (link lub token; brak tworzenia konta)
- N/A — jeden użytkownik, jedno urządzenie, brak separacji

Jeśli odpowiedź jest inna niż N/A, zadaj jedno pytanie uzupełniające dotyczące separacji ról: czy jest to płaski model użytkownika, czy istnieją role (np. administrator / członek / gość), które widzą różne rzeczy? Sokrates: "Jaki jest najmniejszy model dostępu, który nadal sprawiłby, że MVP byłby użyteczny?"

#### Tryb brownfield

Rozpocznij od: "Opisz obecny model uwierzytelniania i role użytkowników w tym systemie. Jak użytkownicy logują się dzisiaj i jakie role istnieją?"

Słuchaj. Następnie zapytaj, co się zmienia:

- "Czy model uwierzytelniania zmienia się w ramach tej pracy?" (tak — opisz / nie — pozostaw bez zmian)
- "Czy dodawane są nowe role, czy zmieniają się istniejące granice ról?" (tak — opisz / nie — pozostaw bez zmian)

Jeśli użytkownik powie, że uwierzytelnianie się nie zmienia, zapisz obecny model uwierzytelniania jako `## Kontrola Dostępu` z notatką: `Nie planuje się zmian — obecny model zachowany.` Jeśli planowane są zmiany, przechwyć zarówno obecny model, jak i planowane zmiany.

Sokrates: "Jaka jest najmniejsza zmiana dostępu, która nadal sprawiłaby, że ta funkcja byłaby użyteczna bez zakłócania istniejących użytkowników?"

#### Oba tryby

Zapisz przechwyconą treść jako blok `## Kontrola Dostępu` zgodnie ze schematem. Zaktualizuj `checkpoint.current_phase: 3` i dołącz `2` do `checkpoint.phases_completed`.

### Krok 3: Dyscyplina MVP

Ta faza tworzy szkic bloku `## Kryteria Sukcesu` (podsekcje Podstawowe / Dodatkowe / Bariery ochronne zgodnie ze schematem) i inicjuje pole `timeline_budget` we frontmatter.

#### Tryb greenfield

Rozpocznij od: "Naszkicuj najmniejszy, kompleksowy przepływ użytkownika, który udowodni, że ten produkt działa. Przeprowadź mnie przez pierwszą sesję, klik po kliku."

Słuchaj. Gdy użytkownik opisze przepływ, powtórz go jako numerowaną sekwencję ("1. użytkownik otwiera aplikację, 2. użytkownik robi X, 3. użytkownik widzi Y, …") i zapytaj: "Gdybyś miał trzy tygodnie pracy po godzinach, czy mógłbyś dostarczyć ten przepływ?"

**Powierzchnia kosztów zakresu**: jeśli przepływ ma więcej niż ~6 odrębnych akcji użytkownika przed wygenerowaniem wartości, LUB własne oszacowanie użytkownika przekracza ~3 tygodnie pracy po godzinach, LUB przepływ wymaga wielu integracji / usług zewnętrznych / niestandardowej infrastruktury przed jakimkolwiek widocznym dla użytkownika efektem, wyraźnie wskaż koszt. Celem jest świadomy wybór, a nie egzekwowanie — dłuższe terminy są ważne, ale użytkownik powinien je świadomie wybrać:

```
Ta pierwsza wersja jest większa niż to, co zazwyczaj jest dostarczane w trzy
tygodnie pracy po godzinach. Pułapka greenfield polega na tym, że nic nie
jest dostarczane, ponieważ pierwsza wersja była zbyt duża, aby ją ukończyć.
Dwie ważne ścieżki stąd:

  Zmniejsz zakres — utrzymuj krótki harmonogram. Typowe ruchy:
    - Odrzuć [zidentyfikowany drogi element] dla v1; dodaj go w v2, gdy coś
      już działa.
    - Zastąp [zidentyfikowaną integrację] wersją ręczną / zakodowaną na
      teraz.
    - Zmniejsz liczbę użytkowników do jednego (siebie) dla v1.

  Zobowiąż się do dłuższego harmonogramu — zaakceptuj koszt. Wielotygodniowy
  MVP jest wykonalny, ale wymaga stałego zaangażowania, ciężkiej pracy
  przez wiele wieczorów lub weekendów oraz tolerancji na okresy, w których
  postęp wydaje się niewidoczny. Większość projektów greenfield, które
  przekraczają swoje pierwsze oszacowanie, umiera nie z powodu samej pracy,
  ale z powodu luki między oczekiwanym a rzeczywistym wysiłkiem.
```

Użyj narzędzia, aby zadać użytkownikowi pytanie z trzema opcjami:

- **Zmniejsz zakres (Zalecane)** — wybierz to, jeśli powyższy koszt jest nowością; ponownie uruchomimy ten krok z mniejszym pierwszym przepływem.
- **Zobowiąż się do dłuższego harmonogramu — rozumiem, że będzie to wymagało stałego wysiłku** — wybierz to tylko wtedy, gdy naprawdę przemyślałeś, jak wygląda wielotygodniowe zaangażowanie po godzinach i podchodzisz do tego z otwartymi oczami.
- **Ponownie uruchom Krok 3 z innym pierwszym przepływem** — wybierz to, jeśli żadna opcja nie pasuje i chcesz ponownie naszkicować MVP od zera.

Jeśli użytkownik wybierze "Zobowiąż się do dłuższego harmonogramu":

1. Przechwyć jego szacowane `mvp_weeks` (zapytaj, jeśli nie zostało jeszcze podane).
2. Dołącz linię `## Potwierdzenie harmonogramu` pod blokiem budżetu harmonogramu w shape-notes, która zapisuje: szacowane tygodnie, że użytkownik wyraźnie zaakceptował koszt stałego wysiłku i datę. Format: `Potwierdzono dnia <RRRR-MM-DD>: <N>-tygodniowy MVP wymaga stałego zaangażowania; użytkownik zaakceptował.`
3. Kontynuuj bez dalszego narzekania — potwierdzenie jest bramą, powtarzające się ostrzeżenia nie.

#### Tryb brownfield

Rozpocznij od: "Opisz najmniejszą, przyrostową zmianę, która udowodni, że to ulepszenie działa. Przeprowadź mnie przez to, jak zmienia się doświadczenie użytkownika — co użytkownik robi inaczej po wdrożeniu tej zmiany?"

Słuchaj. Powtórz jako numerowaną sekwencję różnic: "1. użytkownik otwiera [istniejącą funkcję], 2. teraz widzi [nową rzecz], 3. może [nowa funkcja]…"

Następnie zadaj dwa pytania specyficzne dla brownfield:

- "Jaki jest promień rażenia tej zmiany? Które istniejące funkcje, integracje lub przepływy danych mogą się zepsuć?" (Sokrates: "Co istniejący użytkownik zauważyłby najpierw, gdyby ta zmiana poszła źle?")
- "Gdybyś miał trzy tygodnie pracy po godzinach, czy mógłbyś dostarczyć tę zmianę?" (ta sama dyscyplina harmonogramu co w greenfield)

**Powierzchnia kosztów zakresu**: ta sama logika co w greenfield, ale przeformułowana:

```
Ta zmiana jest większa niż to, co zazwyczaj jest dostarczane w trzy tygodnie
pracy po godzinach. Pułapka brownfield polega na rozpoczęciu dużej zmiany w
istniejącym systemie i pozostawieniu jej niedokończonej — częściowo
zmodyfikowany kod jest gorszy niż oryginał. Dwie ścieżki:

  Zmniejsz zakres — znajdź najmniejszy fragment, który udowodni, że zmiana
  działa. Typowe ruchy:
    - Ogranicz do jednego przypadku użycia / jednej roli użytkownika na
      początek.
    - Zachowaj istniejące zachowanie jako awaryjne; dodaj nową ścieżkę
      obok.
    - Odrzuć [zidentyfikowaną drogą integrację] dla v1.

  Zobowiąż się do dłuższego harmonogramu — tak samo jak w greenfield:
  stały wysiłek, zaakceptowany.
```

Te same opcje co w greenfield do zadawania użytkownikowi pytania.

#### Oba tryby

Gdy przepływ zostanie zablokowany, przechwyć go jako kryterium sukcesu `### Podstawowe` (działający przepływ = produkt/zmiana zadziałała). Zapytaj jeszcze raz o `### Dodatkowe` (1 miły dodatek) i `### Bariery ochronne` (1-2 rzeczy, które nie mogą się zepsuć — prywatność, minimalna wydajność, UX). Dla brownfield, bariery ochronne powinny wyraźnie obejmować istniejące zachowanie, które musi zostać zachowane.

Ustaw `timeline_budget.mvp_weeks` (greenfield) lub `timeline_budget.delivery_weeks` (brownfield) w szkielecie frontmatter na liczbę podaną przez użytkownika — 1, jeśli zakres został zmniejszony, w przeciwnym razie potwierdzone oszacowanie.

Zapisz blok `## Kryteria Sukcesu`. Zaktualizuj `checkpoint.current_phase: 4` i dołącz `3` do `checkpoint.phases_completed`.

### Krok 4: Wymagania funkcjonalne i historie użytkowników

Ta faza tworzy sekcje `## Wymagania Funkcjonalne` i `## Historie Użytkowników`.

#### Tryb greenfield

Rozpocznij od: "Teraz przejdźmy do konkretów. Z naszkicowanego przepływu MVP, co aktor musi być *w stanie* zrobić? Wymień możliwości — sformatuję je jako FR."

Przechwyć każdą możliwość jako pojedynczą linię FR zgodnie z formatem schematu:

```
- FR-NNN: [Aktor] może [możliwość]. Priorytet: musi-być | miło-mieć
```

`NNN` to trzycyfrowa liczba z wiodącymi zerami, zaczynająca się od `001`. Domyślny `Priorytet: musi-być` dla wszystkiego w przepływie MVP; zapytaj wyraźnie, jeśli jakakolwiek możliwość jest `miło-mieć`.

#### Tryb brownfield

Rozpocznij od: "Teraz przejdźmy do konkretów. Z opisanej zmiany, jakie możliwości są dodawane, modyfikowane lub zachowywane? Wymień je — sformatuję je jako FR z kategorią zmiany."

Przechwyć każdą możliwość z dodatkowym tagiem `Zmiana:`:

```
- FR-NNN: [Aktor] może [możliwość]. Priorytet: musi-być | miło-mieć. Zmiana: nowa | zmodyfikowana | zachowana
```

- `nowa` — możliwość, która nie istnieje w obecnym systemie
- `zmodyfikowana` — istniejąca możliwość, której zachowanie się zmienia
- `zachowana` — istniejąca możliwość, która musi nadal działać bez zmian (defensywne FR — wyraźnie określa zachowanie)

Zachęć użytkownika do zastanowienia się nad zachowanymi FR: "Które istniejące możliwości muszą wyraźnie przetrwać tę zmianę? Wyraźne określenie zachowania zapobiega przypadkowym uszkodzeniom." Jeśli użytkownik zidentyfikuje zachowane FR, przechwyć je — staną się one FR-ami ochronnymi dla brownfield PRD.

#### Oba tryby

Grupuj tematycznie z podtytułami `###`, jeśli liczba FR przekracza ~6 (np. `### Uwierzytelnianie`, `### Dopasowywanie przepisów`, `### Trwałość`).

Po przechwyceniu FR, poproś użytkownika o przetłumaczenie co najmniej **głównej ścieżki przepływu MVP** (greenfield) lub **głównej ścieżki zmiany** (brownfield) na historię użytkownika `### US-01:` z Given/When/Then zgodnie ze schematem. Każda dodatkowa historia użytkownika jest opcjonalna, ale zalecana dla każdego FR, które ma nieoczywiste kryteria akceptacji.

Zaktualizuj `checkpoint.frs_drafted` do liczby wpisów FR-NNN.

Zaktualizuj `checkpoint.current_phase: 4.5` i przejdź bezpośrednio do rundy Sokratesa (NIE oznaczaj fazy 4 jako ukończonej w `phases_completed`, dopóki runda Sokratesa nie zapisze z powrotem).

### Krok 4.5: Runda wyzwań Sokratesa

Jest to dedykowana runda wsadowa — dokładnie jedno wyzwanie na FR przechwycone w Kroku 4, ani więcej, ani mniej.

Dla każdego FR-NNN w kolejności dokumentu, zapytaj:

```
FR-NNN: [Aktor] może [możliwość]. Priorytet: ...
Co musiałoby być prawdą, aby to FR było błędne — tzn. aby jego wdrożenie
zaszkodziło produktowi zamiast mu pomóc? LUB: jaki jest najsilniejszy
kontrargument przeciwko włączeniu tego do MVP?
```

Użyj narzędzia, aby zadać użytkownikowi pytanie dla każdego FR z 2-4 opcjami sformułowanymi jako wiarygodne kontrargumenty (zaczerpnięte z domeny FR — nie ogólne). Zawsze uwzględnij opcję "Brak kontrargumentu; pozostaje bez zmian" jako OSTATNIĄ opcję (nie pierwszą), aby pytanie zmuszało użytkownika do rozważenia wyzwania przed jego odrzuceniem.

Przechwyć każdą odpowiedź użytkownika jako blok cytatu `> Sokrates:` pod jego FR w `shape-notes.md`:

```
- FR-001: Użytkownik może zapisać przepis do ulubionych. Priorytet: musi-być
  > Sokrates: Rozważono kontrargument: "ulubione duplikują listę przepisów,
  > jeśli przepisów jest już niewiele." Rozwiązanie: zachowano; ulubione są
  > między sesjami, główna lista jest na lodówkę.
```

Jeśli runda Sokratesa skłoni użytkownika do zmiany FR (np. podzielenia na dwa, obniżenia priorytetu na miło-mieć, całkowitego usunięcia), zaktualizuj linię FR na miejscu i ponownie wyślij `checkpoint.frs_drafted`.

Gdy każde FR będzie miało blok cytatu Sokratesa, dołącz `4` do `checkpoint.phases_completed`, zaktualizuj `checkpoint.current_phase: 5`.

### Krok 5: Logika biznesowa i właściwości jakościowe

Ta faza tworzy sekcje `## Logika Biznesowa` i `## Wymagania Niefunkcjonalne`. **Brownfield** tworzy również sekcję `## Ograniczenia i Zachowane Zachowanie`. Encje i pola celowo NIE są przechwytywane jako oddzielna sekcja — wyłaniają się z FR i Historii Użytkowników (odpowiednio Kroki 4 i 4 tej umiejętności) i są przypinane podczas późniejszego wyboru stosu / planowania implementacji.

#### Tryb greenfield

Rozpocznij od: "Opisz regułę działania w JEDNYM zdaniu — decyzję domenową, którą podejmuje Twoja aplikacja, odróżniającą ją od ogólnej listy CRUD."

Jeśli użytkownik potrafi sformułować jednolinijkową regułę, przechwyć ją jako pierwszą linię `## Logika Biznesowa`. Następnie poproś o ≤ 3 akapity wyjaśniające, jakie dane wejściowe reguła konsumuje (jako dane wejściowe dla użytkownika, a nie komponenty systemowe), jaki jest jej wynik i jak użytkownik napotyka ją w przepływie produktu. NIE nazywaj komponentów ani aktorów, którzy wykonują obliczenia — to są późniejsze decyzje architektoniczne. Sformułuj regułę tak, jakby implementacja była nieznana.

**Wykrywanie antywzorca pustego CRUD**: jeśli "logika biznesowa" użytkownika sprowadza się do "użytkownicy mogą dodawać, przeglądać, aktualizować i usuwać rekordy" bez reguły, którą sama aplikacja stosuje (brak rekomendacji, priorytetyzacji, klasyfikacji, walidacji, punktacji, przepływu pracy, obliczeń), wyraźnie to wskaż:

```
To, co opisałeś, to lista CRUD — a to jest znany antywzorzec greenfield.
CRUD bez decyzji domenowej oznacza, że aplikacja nie dostarcza wartości,
której użytkownik nie mógłby uzyskać z arkusza kalkulacyjnego lub pliku
notatek. Produkt jest pusty.

Prawdziwa reguła domenowa odpowiada na pytanie "co aplikacja decyduje za
użytkownika?". Typowe formy:

  - Rekomendacja:  aplikacja sugeruje elementy na podstawie stanu użytkownika
  - Priorytetyzacja: aplikacja porządkuje elementy według domniemanej
    pilności / ważności
  - Klasyfikacja:  aplikacja taguje elementy według kategorii / sentymentu /
    jakości
  - Walidacja:      aplikacja sprawdza elementy pod kątem reguły domenowej i
    oznacza problemy
  - Punktacja:         aplikacja ocenia elementy, aby użytkownik mógł je
    porównać
  - Przepływ pracy:        aplikacja przenosi elementy przez stany z
    regułami przejścia
  - Obliczenia:     aplikacja oblicza wartość na podstawie danych
    wejściowych dostarczonych przez użytkownika

Jaką regułę stosuje TWOJA aplikacja?
```

Użyj narzędzia, aby zadać użytkownikowi pytanie z powyższymi formami reguł jako opcjami wielokrotnego wyboru (plus "Chcę dodać regułę — daj mi chwilę na zastanowienie" i "I tak buduję to jako czysty CRUD — zapisz to"). Jeśli użytkownik wybierze regułę, wróć do jednolinijkowego pytania. Jeśli zaakceptuje etykietę pustego CRUD, zapisz ją jako `# TODO: reguła domenowa — patrz Otwarte Pytania` zgodnie ze schematem i dodaj wpis do bieżącego bloku `## Otwarte Pytania` w shape-notes.md.

#### Tryb brownfield

Rozpocznij od: "Jaka jest istniejąca reguła domenowa — decyzja, którą Twój obecny system podejmuje za użytkownika? Następnie: czy ta zmiana dodaje nową regułę, modyfikuje istniejącą, czy jest tylko infrastrukturalna (brak zmiany reguły)?"

Słuchaj. Sklasyfikuj odpowiedź:

- **Dodaje nową regułę domenową** — przechwyć jak w greenfield (jednolinijkowa reguła dla nowej funkcji).
- **Modyfikuje istniejącą regułę** — najpierw przechwyć obecną regułę ("System obecnie robi X"), następnie zmianę ("Ta zmiana modyfikuje ją, aby robiła Y"). Obie linie trafiają do `## Logika Biznesowa`.
- **Tylko infrastruktura** — zmiana nie dotyka logiki domenowej (np. migracja, poprawa wydajności, integracja). Zapisz: "Brak zmiany logiki domenowej. Jest to zmiana infrastrukturalna/techniczna." Pomiń sprawdzanie pustego CRUD — nie dotyczy to pracy infrastrukturalnej w brownfield.

Po logice biznesowej, przechwyć ograniczenia i zachowane zachowanie jako `## Ograniczenia i Zachowane Zachowanie`:

- "Jakie istniejące integracje, API lub kontrakty danych musi respektować ta zmiana?"
- "Czy wiążą się z tym migracje danych? Co dzieje się z istniejącymi danymi?"
- "Jakie gwarancje kompatybilności wstecznej są potrzebne?"

#### Oba tryby

Po zablokowaniu logiki biznesowej (lub zarejestrowaniu jej braku), zadaj jedną rundę pytań dotyczących wymagań niefunkcjonalnych: "Czy istnieją cechy, które aplikacja musi spełniać na swojej zewnętrznej granicy — co użytkownik, operator lub regulator mógłby zmierzyć bez sprawdzania implementacji? Pomyśl o: czasie odpowiedzi, jak postrzega go użytkownik, zobowiązaniach dotyczących prywatności, dostępności, wsparciu dla przeglądarek/urządzeń, oknach retencji." Dla brownfield, dodaj: "Czy istnieją istniejące, obserwowalne z zewnątrz zachowania lub SLA, które nie mogą ulec pogorszeniu?"

Przechwyć jako punkty `## Wymagania Niefunkcjonalne` zgodnie ze schematem. Każde NFR łączy właściwość z mierzalnym celem (lub binarnym zobowiązaniem) i unika nazywania mechanizmu, strategii egzekwowania, miejsca wykonania lub udogodnień UI — to są późniejsze wybory. Jeśli użytkownik sformułuje NFR mechanicznie ("ograniczenie liczby żądań na IP", "spinner podczas ładowania", "zapytanie Postgres < 50ms"), odzwierciedl to w formie obserwowalnej z zewnątrz przed przechwyceniem ("uwierzytelnianie odporne na ataki typu credential stuffing bez blokowania użytkowników z błędami wprowadzania"; "ciągła widoczna informacja zwrotna podczas każdej operacji > 2s"; "percepcyjna odpowiedź użytkownika < 800ms p95").

NIE pytaj "jakie encje użytkownik tworzy, odczytuje, aktualizuje lub usuwa?" — encje nie są problemem PRD. Rzeczowniki, którymi manipuluje produkt, pojawiają się w FR (Krok 4) i Historiach Użytkowników. Jeśli pytanie na poziomie pola wydaje się konieczne do wyjaśnienia reguły biznesowej, skieruj je do `## Otwarte Pytania` w celu późniejszego rozwiązania, a nie do przechwytywania modelu danych.

Dołącz `5` do `checkpoint.phases_completed`, zaktualizuj `checkpoint.current_phase: 6`.

### Krok 6: Kadrowanie produktu

Ta faza tworzy sekcję `## Cele Niezwiązane z Projektem` oraz pola frontmatter na poziomie produktu (`product_type`, `target_scale`, `timeline_budget`).

Frontmatter PRD dotyczy tylko poziomu produktu. Kwestie związane ze stosem technologicznym — skład zespołu, preferencje językowe, listy technologii do unikania, tryb/region/budżet wdrożenia, kształt potoku CI/CD — oraz zobowiązania architektoniczne — decyzje implementacyjne, strategia testowania, plan wdrożenia — NIE są częścią PRD. Są one zbierane po `/10x-prd`, po zablokowaniu kształtu produktu. Zadawanie ich teraz zachęca użytkownika do nadmiernego zobowiązania przed wyborem stosu, a odpowiedzi zazwyczaj wymagają ponownego rozważenia po wybraniu stosu.

#### Tryb greenfield

Rozpocznij od: "Ostatnia faza — ustalmy kilka szczegółów ramowych, a następnie precyzyjnie określmy, czego ten MVP wyraźnie NIE robi. Nie wybieramy tutaj frameworków, wdrożenia ani planów testów/CI — te pojawią się później, gdy zostanie wybrany stos."

Zadaj użytkownikowi te trzy krótkie pytania ramowe, PO JEDNYM (oddzielne pytanie dla każdego, a nie pojedynczy blok wielu pytań). Sformułuj każde pytanie prostym językiem, jak sugerowano poniżej — NIE drukuj nazw pól, takich jak `product_type` lub `target_scale` w tekście pytania ani w etykietach opcji. Wewnętrznie mapuj odpowiedź użytkownika na podstawowe pole frontmatter.

1. **Jaki rodzaj rzeczy budujesz?**
   - Opcje: "Strona internetowa lub aplikacja webowa" / "API lub usługa backendowa" / "Narzędzie wiersza poleceń" / "Aplikacja mobilna" / "Aplikacja desktopowa" / "Biblioteka lub SDK" / "Potok danych" — plus opcja swobodnego tekstu.
   - Mapuj wybraną etykietę na `product_type`: web-app / api / cli / mobile / desktop / library / data-pipeline / other.

2. **Z grubsza, ile osób będzie tego używać, gdy będzie już działać?**
   - Opcje: "Tylko ja, lub garstka" / "Dziesiątki do stu" / "Do dziesięciu tysięcy" / "Ponad dziesięć tysięcy".
   - Mapuj wybraną etykietę na `target_scale.users`: small / medium / large / enterprise.
   - Po odpowiedzi, zadaj krótkie pytanie Sokratesa: "Jak zmieniłaby się twoja reguła domenowa przy 100-krotnej skali?" Przechwyć wszelkie spostrzeżenia jako jednolinijkową notatkę w sekcji Wizja shape-notes, jeśli pojawi się coś nowego.

3. **Dwa szybkie pytania dotyczące czasu.**
   - Zadaj w jednej rundzie: "Czy jest jakiś sztywny termin, do którego dążysz? Jeśli tak, jaka data — jeśli nie, po prostu powiedz 'bez terminu'." (Mapuj na `timeline_budget.hard_deadline`: data ISO lub `null`.)
   - Następnie: "Czy będzie to praca po godzinach, czy część Twojej pracy?" (Mapuj na `timeline_budget.after_hours_only`: bool.)
   - `timeline_budget.mvp_weeks` zostało już zablokowane w Kroku 3 — nie pytaj ponownie.

#### Tryb brownfield

Rozpocznij od: "Ostatnia faza — ustalmy kilka szczegółów ramowych i czego ta zmiana wyraźnie NIE robi. Nie zmieniamy tutaj stosu — te decyzje pojawią się później."

Dla brownfield, pytania dotyczące ram produktu stają się bramkami "czy to się zmienia?" tak/nie plus przechwytywanie ograniczeń:

1. **Czy zmienia się typ produktu?**
   - Jeśli istniejący system to aplikacja webowa i ta zmiana tego nie zmienia → zapisz `product_type` bez zmian z notatką: `Brak zmian — istniejący [typ].`
   - Jeśli zmiana wprowadza nową powierzchnię produktu (np. dodanie CLI do aplikacji webowej) → przechwyć nowy `product_type` obok istniejącego.

2. **Czy zmienia się baza użytkowników?**
   - Ten sam wzorzec: zapisz obecny `target_scale` i czy zmiana na niego wpływa. Jeśli zmiana otwiera system na nowych użytkowników lub inną skalę, przechwyć różnicę.

3. **Czas** — te same dwa pytania co w greenfield (`hard_deadline`, `after_hours_only`). `timeline_budget.delivery_weeks` zostało już zablokowane w Kroku 3.

Po ustaleniu ram, dodaj: "Jakie ograniczenia narzuca istniejący system na tę zmianę? Pomyśl o: oknach wdrożenia, istniejących wymaganiach CI/CD, kompatybilności wstecznej z obecnymi konsumentami API, istniejącym monitoringu/alertowaniu." Przechwyć w `## Ograniczenia i Zachowane Zachowanie` (rozszerz sekcję utworzoną w Kroku 5).

#### Oba tryby

Po zablokowaniu ram produktu, przeprowadź **jedną** rundę wielokrotnego wyboru Celów Niezwiązanych z Projektem. Kształt to lista rzeczy do unikania z wielokrotnym wyborem — ale ukierunkowana na unikanie *zakresu* (funkcje, których MVP nie zbuduje / zmiany, których nie dotknie, wymiary jakości, do których nie będzie dążyć), a nie unikanie technologii. Zapytaj:

```
Czego ten [MVP/zmiana] wyraźnie NIE robi? Wybierz wszystko, co powinno być
wykluczone *teraz*, aby nie wkradło się później. Funkcjonalne cele
niezwiązane z projektem (funkcje, których nie zbudujemy/zmienimy) i
niefunkcjonalne cele niezwiązane z projektem (wymiary jakości, do których
nie będziemy dążyć) należą tutaj.
```

Użyj narzędzia, aby zadać użytkownikowi pytanie z `multiSelect: true` i 3-5 opcjami zaczerpniętymi z domeny użytkownika — NIE ogólnymi. Przykłady (generuj ponownie dla każdego projektu):

- "Unikaj: budowania własnego [algorytmu domenowego — np. rekomendacji, planowania, punktacji]" — silne unikanie zakresu; wymuś decyzję kupić-czy-zbudować teraz.
- "Unikaj: [drogiego elementu infrastruktury — np. lokalnego LLM, synchronizacji w czasie rzeczywistym, wielu regionów]" — silne unikanie zakresu; brak kształtuje przepływ danych.
- "Unikaj: [drugorzędnej persony — np. współdzielonych pulpitów, przestrzeni roboczych zespołu, funkcji administratora]" — wyraźne zablokowanie na jednego najemcę.
- "Unikaj: [wymiaru jakości — np. offline-first, pełne WCAG-AA, opóźnienie poniżej 100 ms]" — wyraźny niefunkcjonalny cel niezwiązany z projektem.
- Dla brownfield: "Unikaj: [zmiany istniejącego systemu — np. migracji bazy danych, przepisywania uwierzytelniania, zmiany celu wdrożenia]" — wyraźny cel niezwiązany z istniejącym systemem.
- "Inne (powiedz mi)" — przechwytywanie swobodnego tekstu.

Dołącz wybrane elementy do `## Cele Niezwiązane z Projektem` zgodnie ze schematem (jednolinijkowe uzasadnienie dla każdego). Jeśli pojawią się unikania technologii (np. "unikaj: PHP", "unikaj: monorepo"), NIE dodawaj ich do `## Cele Niezwiązane z Projektem` — przechwyć je w treści shape-notes pod blokiem `## Dalej: stos technologiczny` (informacyjne, nie część schematu PRD), aby następny krok łańcucha mógł je podjąć.

**NIE** pytaj o decyzje implementacyjne, strategię testowania ani plan wdrożenia i CI/CD w tej umiejętności. Te kwestie znajdują się po wyborze stosu / ocenie stosu. Jeśli użytkownik dobrowolnie poda treści o takim kształcie, przechwyć je w shape-notes pod `## Dalej: mapa drogowa techniczna` (informacyjne; nie sekcja PRD), aby późniejsza umiejętność mogła je podjąć.

Dołącz `6` do `checkpoint.phases_completed`, zaktualizuj `checkpoint.current_phase: 7`. Przejdź bezpośrednio do Kroku 7.

### Krok 7: Końcowa kontrola jakości (soft-gate)

Ta faza uruchamia pasek jakości dla wszystkiego, co zostało przechwycone. Jest to **soft gate**: ostrzega, ale pozwala na nadpisanie.

Odczytaj bieżący `shape-notes.md` i sprawdź każdy z poniższych elementów. Dla każdego z nich oznacz `obecny` lub `brakujący/słaby`:

1. **Kontrola dostępu** — blok `## Kontrola Dostępu` istnieje z nietrywialną wartością (nie tylko pusty placeholder).
2. **Logika biznesowa (reguła w jednym zdaniu)** — `## Logika Biznesowa` zaczyna się od jednego deklaratywnego zdania (nie akapitu, nie "TBD"). Dla zmian infrastrukturalnych w brownfield, "Brak zmiany logiki domenowej" jest prawidłowe.
3. **Artefakty projektu** — sam `shape-notes.md` istnieje z prawidłowym punktem kontrolnym frontmatter. (To jest zawsze obecne w tym momencie.)
4. **Potwierdzenie kosztów harmonogramu** — albo `timeline_budget.mvp_weeks` / `delivery_weeks` ≤ 3, ALBO blok `## Potwierdzenie harmonogramu` istnieje w shape-notes, rejestrując, że użytkownik zaakceptował koszt stałego wysiłku w Kroku 3. Dłuższe harmonogramy są prawidłowe; bramka polega na tym, że koszt został wskazany i zaakceptowany, a nie na tym, że harmonogram jest krótki.
5. **Cele niezwiązane z projektem** — blok `## Cele Niezwiązane z Projektem` istnieje z co najmniej jednym wpisem.
6. **Zachowane zachowanie** *(tylko brownfield)* — blok `## Ograniczenia i Zachowane Zachowanie` istnieje i wyraźnie nazywa, co nie może się zepsuć. Pomiń to sprawdzenie dla sesji greenfield.

NIE sprawdzaj `## Strategia Testowania`, `## Wdrożenie i CI/CD` ani `## Decyzje Implementacyjne` — nie są one częścią schematu PRD. Znajdują się one po wyborze stosu / ocenie stosu, a nie w PRD.

Wydrukuj tabelę wyników:

```
═══════════════════════════════════════════════════════════
  KONTROLA JAKOŚCI
═══════════════════════════════════════════════════════════

  Kontrola dostępu:           [obecny | brakujący — opisz]
  Logika biznesowa:           [...]
  Artefakty projektu:        obecny
  Potwierdzenie kosztów harmonogramu:        [obecny | brakujący — opisz]
  Cele niezwiązane z projektem:                [...]
  Zachowane zachowanie:       [obecny | brakujący — opisz | n/a (greenfield)]

═══════════════════════════════════════════════════════════
```

Dla każdego `brakującego/słabego`, **wymień go po nazwie** z jednolinijkową konsekwencją: "Logika biznesowa: nie przechwycona jako reguła w jednym zdaniu — Twoje PRD będzie puste bez decyzji domenowej." Ogólne ostrzeżenia "Twoje PRD ma luki" unieważniają bramkę; nie pisz ich.

Następnie zapytaj użytkownika:
"Jak chcesz postąpić?" z opcjami:
- "Usuń luki teraz" (opis: "Ponownie wejdź w odpowiednią fazę, aby uzupełnić brakujące elementy. Zalecane, jeśli brakuje wielu elementów.")
- "Zaakceptuj i zakończ" (opis: "Kontynuuj pomimo luk. Zostaną one zarejestrowane jako ostrzeżenia w punkcie kontrolnym i wskazane w Otwartych Pytaniach /10x-prd.")
- "Ponownie uruchom fazę [N]" (opis: "Wróć do konkretnej fazy i odbuduj od tego miejsca.")

W przypadku "Usuń luki teraz": zapytaj, która luka; wróć do fazy, która ją posiada (Krok 1-6); uruchom ponownie tylko tę fazę; a następnie wróć do Kroku 7.

W przypadku "Zaakceptuj i zakończ": ustaw `checkpoint.quality_check_status: warned` (jeśli pozostały jakieś luki) lub `accepted` (jeśli wszystkie elementy są obecne — 6 dla greenfield, 7 dla brownfield). Dołącz sekcję `## Kontrola jakości` do `shape-notes.md`, wymieniając każdą lukę po nazwie z jej jednolinijkową konsekwencją — `/10x-prd` odzwierciedla je w `## Otwarte Pytania`.

W przypadku "Ponownie uruchom fazę [N]": przejdź do tej fazy. NIE usuwaj poprzedniej treści; pozwól fazie nadpisać własne sekcje.

Dołącz `7` do `checkpoint.phases_completed`, zaktualizuj `checkpoint.current_phase: 8`. Przejdź do Kroku 8.

### Krok 8: Przekazanie

Ostateczny zapis `shape-notes.md`:

- Potwierdź, że `checkpoint.quality_check_status` to `warned` lub `accepted` (nigdy `pending` w tym momencie).
- Zaktualizuj `updated:` na dzisiejszą datę we frontmatter.
- Ponownie zweryfikuj zgodność ze schematem: dla greenfield, treść powinna przewidywać 10 sekcji PRD w kolejności wymaganej przez schemat; dla brownfield, 11 sekcji PRD brownfield. Frontmatter powinien zawierać pełny blok `checkpoint:` plus `context_type`. Wszelkie treści wybiegające w przyszłość przechwycone w Kroku 6 pozostają w swoim bloku `## Dalej: ...` — NIE są włączane do sekcji mapowanych na PRD.

Następnie skopiuj polecenie następnego kroku do schowka i ogłoś:

```bash
echo -n "/10x-prd" | pbcopy 2>/dev/null || echo -n "/10x-prd" | clip.exe 2>/dev/null || echo -n "/10x-prd" | xclip -selection clipboard 2>/dev/null || true
```

```powershell
# PowerShell (Windows)
Set-Clipboard "/10x-prd"
```

Wydrukuj:

```
═══════════════════════════════════════════════════════════
  KSZTAŁTOWANIE ZAKOŃCZONE
═══════════════════════════════════════════════════════════

  Projekt:                [nazwa projektu]
  Typ kontekstu:           [greenfield | brownfield]
  Przechwycone fazy:        1, 2, 3, 4, 5, 6
  Sporządzone FR:            [liczba]
  Kontrola jakości:          [ostrzeżone | zaakceptowane]

  ► Notatki:  context/foundation/shape-notes.md
  ► Dalej:   /10x-prd  (✓ skopiowano do schowka)

  Po /10x-prd, następny krok łańcucha podejmie:
    Greenfield → wybór stosu technologicznego, następnie bootstrap
    Brownfield → ocena stosu, następnie kontrola stanu
  Żadne z nich nie należy do samego PRD.
═══════════════════════════════════════════════════════════
```

ZATRZYMAJ. Nie przechodź automatycznie do `/10x-prd` — użytkownik uruchamia go, gdy jest gotowy.

## Krytyczne bariery ochronne

1. **Facylitator, a nie generator.** Umiejętność nigdy nie pisze treści domenowych, których użytkownik nie powiedział. Jeśli sekcja potrzebuje wartości, której użytkownik nie podał, zapytaj. Wyjątkiem jest formatowanie mechaniczne (numeracja FR-NNN, szkielet nagłówków schematu, klucze frontmatter).

2. **Schemat jest umową.** Kształt `shape-notes.md` i osadzony szkielet dla przyszłego PRD są dyktowane przez `references/prd-schema.md`. Sprawdzaj ponownie przy każdym zapisie punktu kontrolnego. Jeśli schemat zmieni się w trakcie implementacji, zaktualizuj treść tej umiejętności, aby pasowała — dryf jest trybem awarii.

3. **Otwartość stosu jest wiążąca.** Nigdy nie pytaj, nie rekomenduj ani nie zobowiązuj się do frameworka, bazy danych, rodziny języków ani konkretnej platformy. PRD przechwytuje tylko priorytety na poziomie produktu (`product_type`, `target_scale`, `timeline_budget`); skład zespołu, preferencje językowe, wdrożenie i kształt CI/CD są zbierane po `/10x-prd`. Jeśli użytkownik dobrowolnie poda treści związane ze stosem, przechwyć je w treści shape-notes pod `## Dalej: stos technologiczny` — nie w sekcjach mapowanych na PRD.

4. **Antywzorce są wskazywane po nazwie, a nie ogólnie.** Wykrywanie pustego CRUD nazywa brakujące kształty reguł i prosi użytkownika o wybranie jednego. Wykrywanie zbyt dużego MVP nazywa drogie elementy i oferuje konkretne ruchy zmniejszające zakres. Ostrzeżenia "Twój pomysł ma problemy" unieważniają bramkę.

5. **Soft gate, a nie hard gate.** Końcowa kontrola jakości OSTRZEGA, ale pozwala użytkownikowi nadpisać każdą lukę. Ścieżki nadpisania są rejestrowane w punkcie kontrolnym jako `quality_check_status: warned` i wskazywane w `## Otwarte Pytania` `/10x-prd`. Odmowa zakończenia nie wchodzi w zakres.

6. **Zachowanie świadome trybu.** Umiejętność automatycznie wykrywa typ kontekstu (greenfield vs brownfield) na podstawie znaczników projektu w bieżącym katalogu roboczym i odpowiednio dostosowuje wszystkie sześć faz odkrywania. Dla brownfield, pętla odkrywania zmienia się z "co budujesz od zera?" na "co istnieje, co się zmienia, co musi zostać zachowane?". Jeśli użytkownik wywoła tę umiejętność dla problemu o małym zakresie w istniejącej bazie kodu (pojedynczy błąd, szybka refaktoryzacja), zasugeruj zamiast tego `/10x-frame` — `/10x-shape` jest przeznaczony do zmian, które wymagają pełnego PRD.

7. **Tylko język uniwersalny.** Brak odniesień do 10xDevs / kohorty / certyfikacji w jakimkolwiek produkcie skierowanym do użytkownika lub jakimkolwiek artefakcie zapisanym na dysku. Mechanika tutaj to uniwersalne wskaźniki dobrze zdefiniowanego projektu; kontekst persony, który je motywował, znajduje się w folderze zmian, a nie w dostarczonej umiejętności.

8. **Wznowienie zachowuje poprzednią pracę.** Przy wznowieniu, ukończone fazy są PODSUMOWYWANE w 1-2 zdaniach każda, nigdy nie uruchamiane ponownie. Poprzednie decyzje użytkownika są kluczowe; ponowne ich odtwarzanie frustruje użytkownika i grozi sprzecznością z wcześniejszymi przechwyceniami.

## Uwagi

- Jest to umiejętność **kształtowania**. Wynikiem jest `shape-notes.md`, a nie `prd.md`. `/10x-prd` jest generatorem dokumentów.
- Odniesienie do schematu (`references/prd-schema.md`) jest jedynym źródłem prawdy. Każda nazwa pola, nazwa sekcji lub klucz punktu kontrolnego, do którego odwołuje się ta treść, MUSI istnieć w dokumencie schematu — jeśli nie, najpierw popraw dokument schematu.
- Dla greenfield, 10 sekcji PRD jest przewidywanych w kolejności treści `shape-notes.md`, aby `/10x-prd` mógł je czysto mapować. Dla brownfield, zamiast tego przewidywanych jest 11 sekcji PRD brownfield (patrz `references/prd-schema.md`). Nazwy są dokładnie takie same. Treści wybiegające w przyszłość (pozostałości po wyborze stosu technologicznego / ocenie stosu; przyszłe kwestie mapy drogowej technicznej) znajdują się w oddzielnych blokach `## Dalej do ...` w treści shape-notes i NIE mapują się na PRD.
- Jeśli użytkownik nalega na pominięcie fazy ("po prostu wygeneruj PRD"), wyjaśnij konsekwencje: brakujące fazy tworzą puste sekcje PRD. Następnie zaoferuj pominięcie z wyraźnie określonym kosztem. Wybór należy do nich.
