---
name: 10x-frame
description: >
  Challenge framing assumptions about WHAT to build before planning HOW. Use
  when input is a "bug + proposed fix", a scope question, a design choice,
  or any case where the observation and the stated cause (or the problem and
  the solution) are presented as one. Trigger phrases: "fix", "bug",
  "broken", "root cause", "should we even", "is this the right", "challenge
  the assumption", "rethink", "before I plan". Use BEFORE /10x-plan, not in
  place of it.
---

# Frame: Zakwestionuj ramy przed planowaniem

Plany zbudowane na błędnym sformułowaniu problemu są doskonałymi rozwiązaniami niewłaściwego pytania. Ta umiejętność służy jednemu celowi: oddzieleniu **obserwacji** od **podanej przyczyny** — i **problemu** od **proponowanego rozwiązania** — zanim rozpocznie się jakiekolwiek planowanie.

Kształt, którym zajmuje się ta umiejętność, jest ogólny: użytkownik opisuje coś (obserwację, postrzegany problem, zakres, którym chce się zająć) i proponuje odpowiedź (przyczynę, podejście, strukturę planu) w tym samym zdaniu. Te dwie rzeczy są traktowane jako jeden fakt. Idealny /10x-plan dostarcza wtedy idealne rozwiązanie — a rzeczywisty problem pozostaje, ponieważ ramy były błędne; plan był prawidłowy; użytkownik stracił dzień.

Ta umiejętność to etap ramowania. /10x-plan odpowiada na pytanie *jak to zbudować*. /10x-frame odpowiada na pytanie *co jest właściwie właściwą rzeczą do zaplanowania*.

## Kiedy używać, kiedy pominąć

**Użyj, gdy**: dane wejściowe mają kształt błędu ("X jest zepsute, zbudujmy Y"), kształt zakresu ("powinniśmy to podzielić na dwa plany", "czy to w ogóle właściwy zakres"), kształt projektu ("które podejście w ogóle chcemy") lub kształt założenia ("zakładamy X — czy to prawda?"). Użyj również, gdy stawka jest wysoka, gdy system jest nieznany użytkownikowi, lub gdy /10x-plan ma rozpocząć zadanie, które pachnie podaną przyczyną, a nie zweryfikowaną.

**Pomiń, gdy**: zadanie jest czysto mechaniczną zmianą ("zmień nazwę tej funkcji", "zwiększ wersję zależności"), użytkownik sam już opracował ramy i je zweryfikował ("potwierdziłem to — zaplanuj poprawkę"), lub żądanie jest jasno określonym elementem z żadnym leżącym u podstaw założeniem do zakwestionowania.

W razie wątpliwości, ta umiejętność zadaje krótką serię pytań i tanio kończy działanie, jeśli ramy okażą się solidne. Koszt uruchomienia jej na jasnym żądaniu: ~2–3 pytania. Koszt pominięcia jej na błędnie sformułowanym zadaniu: błędny plan i stracony dzień.

## Związek z innymi umiejętnościami

- `/10x-research` — szeroka eksploracja bazy kodu. Frame może przyjmować dokument badawczy jako dane wejściowe, ale go nie zastępuje.
- `/10x-plan` — akceptuje dane wyjściowe Frame jako dane wejściowe. Frame Brief JEST prawidłowym pierwszym argumentem dla /10x-plan.
- `/10x-plan-review` — waliduje istniejący plan. Frame waliduje *założenie* zanim plan powstanie.

Frame Brief jest użyteczny samodzielnie (jako artefakt dyskusji lub do określenia zakresu szybkiej poprawki) — nie wymaga, aby /10x-plan podążał za nim.

## Początkowa odpowiedź

Gdy ta umiejętność zostanie wywołana:

1. **Jeśli podano ścieżkę pliku lub change-id** (np. `/10x-frame @context/changes/foo/research.md` lub `/10x-frame foo`), rozwiąż ją: `<change-id>` rozwiązuje się na `context/changes/<change-id>/research.md` (przeczytaj, jeśli istnieje). Przeczytaj plik W CAŁOŚCI i przejdź do Kroku 1.
2. **Jeśli opis problemu został podany w tekście**, przejdź do Kroku 1.
3. **Jeśli nic nie zostało podane**, odpowiedz:

```
I'll help you check whether you're framing the right problem before planning a solution.

Please share:
1. The observation — what is happening, what you're seeing, or what scope you're considering?
2. Your initial framing — what you think is causing it, the approach you have in mind, or the way you'd cut the work?
3. (Optional) Any related research, prior incidents, or files I should read

Tip: pass research directly — `/10x-frame @context/changes/<change-id>/research.md` (or just `<change-id>`)
```

Następnie poczekaj.

## Proces

### Krok 1: Uchwyć ramy — oddziel obserwację od podanej przyczyny

To najważniejszy krok. Nie pomijaj go. Nie łącz go.

Przeczytaj `context/foundation/lessons.md`, jeśli istnieje, i użyj wcześniejszych lekcji dotyczących kształtu ram (powtarzające się pułapki ramowania i akceptowane zasady) jako podstawy podczas konstruowania mapy wymiarów w Kroku 2 — są one kontekstem nośnym, a nie opcjonalnym czytaniem.

Przeczytaj KAŻDY plik, o którym wspomniał użytkownik, W CAŁOŚCI. Następnie wyodrębnij i zapisz trzy rzeczy, **wyraźnie**:

- **Zgłoszona obserwacja** — dosłowna, obserwowalna rzecz. Nie przyczyna. Nie poprawka. Efekt, który widzi użytkownik lub operator, lub pytanie o zakres/projekt, jak zostało sformułowane.
- **Podana przez użytkownika przyczyna lub podejście** — co według niego powoduje obserwację, lub ramy, które wnosi do pracy.
- **Proponowany przez użytkownika kierunek** — co chce z tym zrobić.

Powtórz je jako trzy oddzielne punkty i potwierdź:

```
Let me make sure I have this right:

  Observation (what's stated):     [literal effect or scope/design question]
  Your initial framing:            [user's theory or approach]
  Your proposed direction:         [what they want to do about it]

I'm going to question the framing before we plan the work. The observation is fixed
ground — that's what we know. Everything else is a hypothesis until verified.
```

Ramy są w tym momencie zablokowane. Nawet jeśli użytkownik się sprzeciwi ("po prostu zaplanuj poprawkę"), nie łącz obserwacji z ramami. Cała umiejętność opiera się na tym rozdzieleniu.

Jeśli użytkownik nie podał jasnych początkowych ram ("coś jest nie tak, napraw to"), pomiń punkt dotyczący ram i zanotuj, że jest to czysto obserwacyjne — umiejętność staje się bardziej otwarta, ale protokół nadal obowiązuje.

### Krok 1.5: Pytania wyjaśniające przed wysyłką

Ten krok zawsze jest wykonywany. Przed zbudowaniem mapy wymiarów (Krok 2) lub wysłaniem równoległych podagentów (Krok 3), zatrzymaj się na jedną rundę pytań wyjaśniających przy każdym wywołaniu. Celem jest usunięcie niejasności dotyczących *obserwacji i zakresu* — "który z tych elementów jest głównym problemem?", "czy to jedna obserwacja, czy kilka?", "czy obserwowalny jest pojedynczym objawem, czy klasą objawów?" — tak aby mapa wymiarów była zbudowana w oparciu o skoncentrowaną obserwację, a nie wielopunktową listę zadań.

Zapytaj użytkownika:
- question: "Which of these items is the leading concern?" (lub podobne, aby usunąć niejasności dotyczące obserwacji/zakresu)
  header: "Clarifying Observation"
  options:
  - label: "Option 1 (describes an observation or scope position)"
  - label: "Option 2 (describes an observation or scope position)"
  - label: "I'm not sure / haven't separated them yet"

Te pytania są ograniczone przez poniższą barierę ochronną nr 4 ("Pytania zawężające ≠ pytania dotyczące rozwiązania"). Pytania przed wysyłką opisują obserwacje lub pozycje zakresu, nigdy przyczyny ani poprawki. Jeśli zauważysz, że tworzysz opcję, która proponuje poprawkę lub podejście, wkroczyłeś na terytorium /10x-plan — zatrzymaj się i przepisz ją jako obserwację.

Zapisz odpowiedzi w rejestrze ramowania wraz z zapisem z Kroku 1; Frame Brief z Kroku 6 zachowuje oba jako oddzielne punkty w sekcji "Initial Framing (preserved)" (nowa linia `Pre-dispatch narrowing`). Oryginalna obserwacja, podana przyczyna i proponowany kierunek pozostają dosłowne z Kroku 1; zawężenie z Kroku 1.5 nakłada się na nie, nie jako zamiennik.

Ten krok nie wysyła podagentów — to pozostaje zadaniem Kroku 3.

### Krok 2: Zmapuj wymiary problemu

Skonstruuj **mapę** wymiarów, z których może pochodzić obserwacja — dla TEJ sytuacji TEGO użytkownika. Nie sięgaj po ogólny szablon; wartość mapy polega na tym, że jest ona dopasowana do systemu, bazy kodu lub przestrzeni projektowej, którą analizujesz.

Jak zbudować mapę:

- **Najpierw przeczytaj.** Otwórz pliki, o których wspomniał użytkownik. Otwórz sąsiednie. Śledź ścieżkę od podanej przyczyny do zaobserwowanego efektu — *czy ta ścieżka to przepływ danych w czasie rzeczywistym, łańcuch decyzji projektowych, czy sekwencja założeń*. Wymiary wynikają z tego, co faktycznie istnieje: etapy wejścia, transformacji, stanu, efektów ubocznych; lub osie przestrzeni projektowej; lub warstwy decyzji o zakresie. Nie wymieniaj wymiarów, dla których nie widziałeś dowodów.
- **Użyj podagentów, gdy powierzchnia jest duża lub nieznana.** Utwórz jednego lub dwóch podagentów Explore z poleceniami takimi jak: "Śledź ścieżkę od <podanej przyczyny> do <zaobserwowanego efektu>. Wymień każdy odrębny etap lub oś, przez którą przechodzi łańcuch, z odniesieniami do pliku:linii lub dokumentu:sekcji." Mapa to to, co zwracają — a nie to, co zgadłeś przed przeczytaniem.
- **Traktuj każdy wymiar jako możliwe źródło.** Użyteczny wymiar to taki, w którym, gdyby ramy pękły w tym punkcie, zobaczyłbyś mniej więcej tę obserwację. Wymiary, które nie mogłyby wiarygodnie wywołać obserwacji, nie należą do mapy.

**Przypnij obserwację do mapy**: w którym wymiarze ląduje ramowanie użytkownika? Gdzie indziej *mogłaby* pochodzić obserwacja? Ramowanie użytkownika to jeden węzeł na mapie; reszta mapy to przestrzeń hipotez.

Przedstaw mapę z powrotem jako tekst, krótko:

```
The observation could originate at any of these dimensions:

  1. [Dimension A] — [what would go wrong / what the framing assumes here]
  2. [Dimension B] — [what would go wrong / what the framing assumes here]   ← user's current framing
  3. [Dimension C] — [what would go wrong / what the framing assumes here]
  4. [Dimension D] — [what would go wrong / what the framing assumes here]

Going to investigate each in parallel before deciding.
```

### Krok 3: Utwórz równoległe agenty hipotez

Użyj funkcji zarządzania zadaniami swojego asystenta kodowania AI, aby zarejestrować jedno zadanie dla każdego wiarygodnego wymiaru. Następnie utwórz równoległe podagenty — zazwyczaj 2–4, maksymalnie 5 — używając narzędzia do zadań, **wszystkie w jednej wiadomości** dla współbieżności.

Dla każdej hipotezy podagent bada: "**Jeśli ramy pękły w tym wymiarze, jakie dowody byśmy się spodziewali zobaczyć i czy takie dowody istnieją?**"

- Użyj `subagent_type: "Explore"` dla "znajdź kod lub dokument, który obsługuje X, pokaż mi strukturę".
- Użyj `subagent_type: "general-purpose"` dla "śledź ten łańcuch i powiedz mi, czy założenie Y jest prawdziwe".

Każde polecenie musi zawierać:

- Dosłowną obserwację z Kroku 1 (dosłownie).
- Konkretną hipotezę wymiaru, która jest testowana.
- Ramowanie oczekiwanych dowodów: "Co byśmy zobaczyli, gdyby TO był wymiar, w którym ramy pękają? Szukaj tego. Zgłoś, czy jest obecne, częściowe, czy nieobecne, z odniesieniami do pliku:linii lub dokumentu:sekcji."
- Dyrektywę tylko do odczytu — bez edycji.

Po powrocie wszystkich, zsyntetyzuj: które hipotezy mają dowody **silne**, **słabe** lub **brak**? Hipoteza, która ma silne dowody, a początkowe ramowanie użytkownika ich nie miało, jest kandydatem do przeformułowania.

### Krok 4: Pytania zawężające (sokratyczne, nie dotyczące rozwiązania)

Zapytaj użytkownika: **Pytania i opcje tutaj są zasadniczo różne od tych w /10x-plan**: w /10x-plan opcje to *wybory rozwiązania*; tutaj opcje to *rozróżnienia hipotez*. Odpowiedź użytkownika zawęża przestrzeń hipotez.

**Zasady dotyczące pytań zawężających:**

- Każde pytanie powinno izolować jeden lub dwa wymiary mapy. Właściwe pytanie to takie, którego odpowiedź włącza lub wyklucza wymiary.
- Opcje opisują **obserwacje lub pozycje projektowe** — co użytkownik faktycznie widzi, lub po której stronie rzeczywistego kompromisu się znajduje — a nie przyczyny ani rozwiązania.
- Nagłówek `header` powinien być krótki: np. "Pattern", "When", "Scope", "Tradeoff".
- Celuj w 2–5 pytań łącznie — wystarczająco, aby triangulować, nie za dużo, aby przeciągać.
- ZAWSZE dołącz opcję "I'm not sure / haven't checked". Pewność użytkownika sama w sobie jest sygnałem; fałszywa pewność jest wrogiem.

Pytanie zawężające, które nie zmienia rankingu hipotez, jest zmarnowane. **Zaprojektuj każde pytanie tak, aby było decydujące.** Jedno dobrze ukierunkowane pytanie, na które szczerze odpowiedziano, często samo rozwiązuje całe pytanie o przeformułowanie.

Jeśli dowody hipotez z Kroku 3 są już rozstrzygające (jedna hipoteza ma silne dowody, inne nie mają żadnych), możesz pominąć pytania i przejść do Kroku 5 — ale powiedz to wyraźnie: "Krok 3 znalazł silne dowody na [hipotezę] i żadnych na pozostałe. Pomijam etap pytań; przeformułowuję bezpośrednio."

### Krok 5: Sprawdzenie między systemami — testowanie wiodącej hipotezy

Przed sfinalizowaniem przeformułowania, przetestuj je pod innym kątem niż badanie, które je wygenerowało. Celem jest ujawnienie dowodów, których badanie hipotez nie wykryło, a nie potwierdzenie tego, w co już wierzysz.

Wybierz te, które są przydatne w danej sytuacji:

- **Niezależne wyszukiwanie.** Utwórz nowego podagenta Explore z poleceniem, które NIE wymienia wiodącej hipotezy. Opisz tylko obserwację i zapytaj: "Co w tym systemie lub przestrzeni projektowej jest najbardziej prawdopodobną przyczyną? Szukaj bez uprzedzeń." Jeśli agent niezależnie dojdzie do tej samej hipotezy, pewność wzrasta. Jeśli ujawni coś innego, jest to sygnał, który warto dokładnie przeczytać.
- **Szukaj wcześniejszych wystąpień.** Przeszukaj `context/changes/**/` i `context/archive/**/`, komunikaty commitów i historię problemów pod kątem podobnych obserwacji lub decyzji o zakresie w tym projekcie. Wcześniejsze incydenty i wcześniejsze decyzje często zawierają odpowiedź lub wykluczają jedną.
- **Sprawdź odwrotność.** Jakie inne dowody przewidywałaby wiodąca hipoteza — których jeszcze nie sprawdziłeś? Zweryfikuj je. Czego NIE powinno być widać, jeśli hipoteza jest prawdziwa? Potwierdź jej brak.
- **Sprawdź ponownie zdrowy rozsądek w stosunku do podanych przez użytkownika ram.** Jeśli ich oryginalne ramy nadal równie dobrze pasują do dowodów, przeformułowanie może być niepotrzebne. Nie zastępuj działających ram bardziej eleganckimi.

Jeśli testowanie pod presją wzmacnia wiodącą hipotezę, zablokuj pewność. Jeśli ujawni wiarygodną alternatywę lub zaprzeczy hipotezie, **zatrzymaj się** i ponownie uruchom Krok 3 z nową hipotezą na mapie. Przeformułowanie jest wartościowe tylko wtedy, gdy przetrwa uczciwą próbę jego obalenia.

### Krok 6: Zsyntetyzuj Frame Brief

Rozwiąż folder zmian przed zapisaniem:

- Jeśli wywołano jako `/10x-frame <change-id>` i `context/changes/<change-id>/` istnieje, zapisz do niego.
- W przeciwnym razie utwórz `<change-id>` w formacie kebab-case z obserwacji i utwórz folder + `change.md` (odzwierciedlając semantykę `/10x-new`) przed zapisaniem.
- Odmów, jeśli rozwiązana ścieżka zaczyna się od `context/archive/` — wydrukuj: "This change is archived. Open a new change with `/10x-new` instead." i ZATRZYMAJ.

Zaktualizuj `change.md`: ustaw `updated: <today>` i, tylko jeśli bieżący `status` to `new`, przejdź do `status: preparing`.

Zapisz brief do `context/changes/<change-id>/frame.md` (pojedynczy artefakt na zmianę).

Użyj tego szablonu:

````markdown
# Frame Brief: [Topic]

> Framing step before /10x-plan. This document captures what is *actually*
> at issue, separated from what was initially assumed.

## Reported Observation

[Literal observable effect or stated scope/design question — copied from
Step 1, unchanged.]

## Initial Framing (preserved)

- **User's stated cause or approach**: [from Step 1]
- **User's proposed direction**: [from Step 1]
- **Pre-dispatch narrowing**: [from Step 1.5 — the observation/scope position the user picked, in their words; "not separated yet" is itself a valid answer worth recording]

## Dimension Map

The observation could originate at any of these dimensions:

1. **[Dimension A]** — [what would go wrong / what the framing assumes here]
2. **[Dimension B]** — [...]  ← initial framing
3. **[Dimension C]** — [...]
4. **[Dimension D]** — [...]

## Hypothesis Investigation

| Hypothesis | Evidence | Verdict |
| --- | --- | --- |
| [Dimension A: brief claim] | [file:line / document:section / observations] | STRONG / WEAK / NONE |
| [Dimension B: initial framing] | [evidence] | STRONG / WEAK / NONE |
| [Dimension C] | [evidence] | STRONG / WEAK / NONE |
| [Dimension D] | [evidence] | STRONG / WEAK / NONE |

## Narrowing Signals

Decisive observations from Step 4 (user reports + sub-agent findings) that
narrowed the hypothesis space:

- [Observation that ruled in or out a dimension]
- [Observation that ruled in or out a dimension]

## Cross-System Convention

[How is this class of observation usually handled? Does the leading
hypothesis match the convention?]

## Reframed (or Confirmed) Problem Statement

> **The actual problem to plan around is**: [one sentence — root, not surface]

[2–3 sentences explaining why this is the real problem and what would change
if it were addressed. If the original framing held up, say so explicitly:
"The initial framing was correct — proceed with the originally proposed
direction." Do not manufacture a reframing if the evidence doesn't support
one.]

## Confidence

- **HIGH** — strong evidence + matches convention + decisive narrowing signal
- **MEDIUM** — evidence points one way but convention or signal weaker
- **LOW** — evidence inconclusive; recommending further reproduction or
  evidence-gathering before planning

[Pick one. If LOW, list the specific verification step needed before /10x-plan.]

## What Changes for /10x-plan

[1–2 sentences: what the plan should actually be about, given the reframe.
If reframe is "no change", state that the original framing held up.]

## References

- Source files: [file:line]
- Related research: `context/changes/<change-id>/research.md` (if present)
- Investigation tasks: [list of TaskCreate IDs from Step 3]
````

Zachowaj zwięzłość briefu — celuj w ~80–150 linii. Tabela hipotez jest sercem; wszystko inne ją wspiera.

### Krok 7: Prezentacja i przekazanie

Wydrukuj jednostronicowe podsumowanie, a następnie zaoferuj przekazanie:

```
═══════════════════════════════════════════════════════════
  FRAME COMPLETE: [Topic]
  Confidence: [HIGH/MEDIUM/LOW]
═══════════════════════════════════════════════════════════

  Reported observation: [one line]
  Initial framing:      [one line]
  Reframed problem:     [one line — or "Initial framing held"]

  ► Brief: context/changes/<change-id>/frame.md
═══════════════════════════════════════════════════════════
```

Następnie zapytaj użytkownika:
- question: "Frame done. How would you like to proceed?"
  header: "Next step"
  options:
  - label: "Hand off to /10x-plan"
    description: "Pass this brief to /10x-plan and start implementation planning."
  - label: "Reproduce / verify first"
    description: "Confidence is too low or the reframe needs a manual check before planning."
  - label: "Discuss before planning"
    description: "I want to push back on the reframe or explore alternatives."
  - label: "Stop here"
    description: "The brief alone is enough — no plan needed right now."
    multiSelect: false

Jeśli użytkownik wybierze "Hand off to /10x-plan", skopiuj polecenie do schowka:

```bash
echo -n "/10x-plan <change-id>" | pbcopy 2>/dev/null || echo -n "/10x-plan <change-id>" | clip.exe 2>/dev/null || echo -n "/10x-plan <change-id>" | xclip -selection clipboard 2>/dev/null || true
```

```powershell
# PowerShell (Windows)
Set-Clipboard "/10x-plan <change-id>"
```

I wydrukuj: `→ /10x-plan <change-id> (✓ copied)`

## Krytyczne bariery ochronne

1. **Dopuszczalny wniosek: "ramowanie było prawidłowe."** Ta umiejętność nie jest wartościowa tylko wtedy, gdy prowadzi do przeformułowania. Jeśli badanie hipotez potwierdza początkowe ramowanie użytkownika, TO JEST udane ramowanie — powiedz to jasno i zatrzymaj się. Wymyślone przeformułowania są gorsze niż brak ram: wprowadzają zamieszanie, które użytkownik musi później rozwiązać.

2. **Obserwacja i podana przyczyna pozostają oddzielne.** Na każdym etapie. Frame Brief zachowuje oryginalne ramowanie dosłownie — nawet po przeformułowaniu — ponieważ przyszli czytelnicy (i /10x-plan-review) muszą widzieć, co było założone, a co odkryte.

3. **Brak projektowania rozwiązania.** Ta umiejętność nigdy nie wybiera podejścia do implementacji. Nie proponuje faz, zmian w plikach ani decyzji technicznych. Tworzy JEDEN artefakt: przeformułowane (lub potwierdzone) sformułowanie problemu. /10x-plan jest odpowiedzialny za rozwiązanie.

4. **Pytania zawężające ≠ pytania dotyczące rozwiązania.** /10x-plan pyta "które podejście?". /10x-frame pyta "gdzie na mapie wymiarów znajduje się rzeczywisty problem?". Ta zasada dotyczy zarówno Kroku 1.5 (zawężanie zakresu/obserwacji przed wysyłką), jak i Kroku 4 (zawężanie hipotez po wysyłce). Opcje opisują obserwacje lub pozycje projektowe, a nie wybory dotyczące sposobu ich rozwiązania. Jeśli zauważysz, że tworzysz pytanie, którego odpowiedź zmienia *kierunek*, wkroczyłeś na terytorium /10x-plan — zatrzymaj się.

5. **Przeczytaj materiał źródłowy, zanim sięgniesz po wcześniejsze.** Materiał źródłowy oznacza kod, dokumenty, wcześniejsze decyzje lub cokolwiek, na czym faktycznie opiera się ramowanie. Kuszące jest rozpoznanie kształtu z danych treningowych i zaproponowanie przeformułowania przed badaniem. Nie rób tego. Hipotezy muszą pochodzić z mapy wymiarów, którą skonstruowałeś w Kroku 2 z TEGO materiału, a dowody muszą pochodzić z odczytów podagentów TEGO projektu. Pewnie brzmiące przeformułowanie bez dowodów file:line lub document:section to tryb awarii, któremu ta umiejętność ma zapobiegać.

6. **Brak wypełniania hipotez.** Jeśli tylko dwa wymiary są wiarygodne, zbadaj dwa. Tworzenie agentów do badania hipotez bez wiarygodności marnuje budżet i sygnalizuje fałszywą rygorystyczność.

7. **Ogranicz czasowo badanie.** Frame powinien zazwyczaj zakończyć się w 2–4 rundach podagentów i 2–5 pytaniach. Jeśli przeciąga się to poza ten czas, przypadek prawdopodobnie wymaga reprodukcji lub zbierania dowodów przed dalszą analizą — zalec to i zatrzymaj się.

## Uwagi

- To jest umiejętność **ramowania**. Badaj i raportuj — nie edytuj kodu, nie pisz planów.
- Bądź konkretny. Konkrety z `file:line` lub `document:section` są lepsze niż ogólniki.
- Rozróżniaj "dowody znalezione w tym projekcie" (weryfikowalne, z file:line lub document:section) od "mam przeczucie z poprzednich systemów, które widziałem" (wcześniejsze, niezweryfikowane). Wcześniejsze są przydatne do formułowania hipotez; tylko zweryfikowane dowody należą do Frame Brief.
- Jeśli użytkownik sprzeciwi się przeformułowaniu, potraktuj to poważnie — może znać kontekst, którego badanie nie uwzględniło. Ponownie uruchom Krok 3 w odpowiedzi na jego sprzeciw, zamiast bronić przeformułowania.
- Frame Brief jest jedynym artefaktem. Zachowaj go krótkim, łatwym do zeskanowania i użytecznym dla /10x-plan.