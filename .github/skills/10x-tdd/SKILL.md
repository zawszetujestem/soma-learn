---
name: 10x-tdd
description: Drive an approved plan from context/changes/<change-id>/plan.md phase by phase, test-first, through red→green→refactor — only for TDD'able phases not yet implemented; everything else routes to /10x-implement. Use when the user says "tdd", "test-first", "red green refactor", or wants to execute a plan via TDD.
---

# 10x TDD — Wykonanie planu w pierwszej kolejności testów

Doprowadzasz zatwierdzony plan techniczny z `context/changes/<change-id>/plan.md` do końca **jedna faza na raz, najpierw testy**. Ta umiejętność ma zastosowanie tylko wtedy, gdy implementacja produkcyjna fazy jest nadal nieobecna. Dla każdej kwalifikującej się fazy uruchamiasz klasyczną pętlę:

```
CZERWONY  →  napisz nieudany test, który przypina następne zachowanie
ZIELONY   →  napisz minimalny kod produkcyjny, aby go zaliczyć
REFAKTOR  →  posprzątaj, a test pozostanie zielony
```

Ta umiejętność jest **test-first odpowiednikiem `/10x-implement`**. Odczytuje ten sam plan, modyfikuje tę samą kanoniczną sekcję `## Progress` i używa tego samego rytuału zatwierdzania na koniec fazy oraz przekazywania do schowka. Jedyną różnicą jest kolejność: tutaj nieudany test jest pisany **przed** kodem produkcyjnym. Ponieważ ta kolejność jest kluczowa, nie używaj tej umiejętności do dodawania testów po tym, jak implementacja już istnieje. Ponieważ obie umiejętności współdzielą `## Progress`, możesz je swobodnie przeplatać — TDD fazę tutaj, przekazać następną fazę do `/10x-implement`, wrócić, a stan nigdy nie zostanie utracony.

Ścieżka planu: `$ARGUMENTS`

## Co zakłada ta umiejętność — i czego nie zrobi

- **Infrastruktura testowa już istnieje.** Zakłada się, że runner (Vitest / Playwright / Jest / pytest / …), sposób uruchamiania pojedynczego pliku oraz konwencje testowe projektu są już na miejscu. Ta umiejętność je **odkrywa**; **nie** instaluje runnera, nie tworzy konfiguracji, nie tworzy fixture'ów ani nie konfiguruje CI. Jeśli w ogóle nie ma runnera, zatrzymaj się i powiedz użytkownikowi, aby najpierw go skonfigurował (wskaż mu `/10x-test-plan` dla fazowego wdrożenia testów lub `/10x-bootstrapper` dla tworzenia szkieletu).
- **Implementacja produkcyjna jeszcze nie istnieje.** TDD działa tylko wtedy, gdy nieudany test może prowadzić implementację. Jeśli odpowiednie zachowanie fazy, punkt końcowy, komponent, migracja, okablowanie lub inna zmiana produkcyjna już istnieje, zatrzymaj się natychmiast; nie pisz testów retrospektywnych i nie kontynuuj fazy pod etykietą TDD. Powiedz użytkownikowi, aby użył `/10x-implement <change-id> phase N`, aby kontynuować już rozpoczętą fazę.
- **Prowadzi implementację, a nie tylko szkielet testowy.** W przeciwieństwie do starego przepływu "napisz wszystkie testy z góry", ta umiejętność pisze mały nieudany test, a następnie natychmiast go zazielenia, faza po fazie. Nie ma oddzielnej partii osieroconych nieudanych testów.
- **Kontroluje każdą fazę pod kątem tego, czy test-first faktycznie pasuje i czy implementacja jest nieobecna.** Niektóre fazy (konfiguracja, tworzenie szkieletu, dopracowanie wizualne, okablowanie infrastruktury) nie mogą być sensownie prowadzone przez nieudany test. Już rozpoczęta implementacja również nie może zostać przywrócona do prawdziwego TDD. Takie przypadki są przekierowywane lub zatrzymywane, jak opisano poniżej.

## Przegląd faz

```
SETUP            →  Rozwiąż plan, przeczytaj w całości, potwierdź istnienie infrastruktury testowej, utwórz zadania dla każdej fazy
Dla każdej fazy:
  ├─ GATE        →  Czy ta faza jest TDD'owalna i czy implementacja jest nieobecna? Jeśli nie → przekieruj lub zatrzymaj
  ├─ RED/GREEN/REFACTOR  →  Pętla dla każdego zachowania w fazie, aż do spełnienia kryteriów sukcesu
  └─ PHASE END   →  Pełny zestaw zielony → ręczna brama → rytuał zatwierdzania → decyzja o następnej fazie (schowek)
Po wszystkich fazach →  Podsumowanie ukończenia + opcjonalne /10x-impl-review
```

Każda faza kończy się punktem kontrolnym użytkownika. Nigdy nie pomijaj fazy po cichu ani nie łącz dwóch faz w jedno zatwierdzenie.

---

## Konfiguracja

Gdy ta umiejętność zostanie wywołana:

1. **Rozwiąż plan**:
   - `/10x-tdd <change-id> [phase N]` → `context/changes/<change-id>/plan.md`.
   - `@context/changes/<change-id>/plan.md` lub pełna ścieżka → zaakceptuj bez zmian.
   - **Odmów, jeśli rozwiązana ścieżka zaczyna się od `context/archive/`** — wydrukuj "This change is archived. Open a new change with `/10x-new` instead." i ZATRZYMAJ.
   - Jeśli nic nie zostało podane, wydrukuj poniższą wiadomość i **ZATRZYMAJ i czekaj**:

```
Będę realizować zatwierdzony plan test-first (czerwony → zielony → refaktoryzacja), faza po fazie. Proszę podać:

1. Identyfikator zmiany (np. `/10x-tdd oauth-login phase 1`), lub
2. Pełną ścieżkę (np. `@context/changes/oauth-login/plan.md`).

Możesz wyświetlić aktywne zmiany za pomocą: `ls context/changes/`

Wskazówka: plan powinien być już przejrzany i zatwierdzony — ta umiejętność go implementuje, a nie pisze.
```

2. **Przeczytaj plan w całości** — każdą fazę, każdy blok Changes Required, każdy element Success Criteria. Nigdy nie używaj limit/offset; potrzebujesz pełnego kontekstu. Sekcja `## Progress` na dole jest **autorytatywna dla stanu wykonania** — znaczniki (`- [x]`) znajdują się TYLKO tam (patrz `references/progress-format.md`). Bloki faz zawierają zwykłe punktorzy `- `, bez pól wyboru.

3. **Przeczytaj `context/foundation/lessons.md`** jeśli istnieje i przyswój każdy wpis przed rozpoczęciem jakiejkolwiek fazy — są to zaakceptowane powtarzające się zasady zespołu i muszą kształtować każdy wybór implementacyjny w tym przebiegu.

4. **Potwierdź istnienie infrastruktury testowej (lekkie sprawdzenie — nie badaj całego świata):**
   - Jeśli istnieje `context/foundation/test-stack.md`, przeczytaj go — rejestruje on runnera, środowisko, konwencje i polecenia uruchamiania. Użyj go i pomiń skanowanie. Jeśli wygląda na nieaktualny (odwołuje się do narzędzi/konfiguracji, które już nie istnieją), zanotuj to dla użytkownika i wróć do szybkiego skanowania.
   - W przeciwnym razie wykonaj **szybkie** skanowanie konwencji (to nie jest faza intensywnych badań infrastruktury): znajdź konfigurację testową i 1-2 reprezentatywne istniejące pliki testowe, aby poznać styl importu, zagnieżdżanie describe/it, wzorce mocków i polecenie do uruchomienia **pojedynczego** pliku testowego. Wystarczy pojedynczy `Glob` dla `*.test.*` / `*.spec.*` plus przeczytanie jednego przykładu.
   - **Jeśli w ogóle nie ma runnera i konfiguracji testowej**, ZATRZYMAJ:

```
Ten plan wymaga runnera testowego, zanim będę mógł go realizować test-first — nie znalazłem żadnego
(brak konfiguracji vitest/jest/playwright/pytest, brak skryptów testowych, brak istniejących plików *.test.*).

Ta umiejętność zakłada, że infrastruktura testowa już istnieje; nie skonfiguruje jej. Opcje:
  • Najpierw skonfiguruj runnera, a następnie ponownie uruchom /10x-tdd.
  • Użyj /10x-implement, aby zbudować plan bez test-first.
  • Użyj /10x-test-plan dla fazowej strategii wdrażania testów.
```

5. **Zaktualizuj `change.md`**: ustaw `status: implementing` (tylko jeśli aktualnie w `{planned, plan_reviewed}`) i `updated: <today>`.

6. **Utwórz jedno zadanie na fazę** (pojawiają się one na pasku stanu użytkownika): dla każdego nagłówka `## Phase N:` utwórz zadanie z `subject: "Phase N: [Phase Name]"` i `activeForm: "TDD Phase N"`. Oznacz bieżącą fazę jako `in_progress` przed rozpoczęciem; oznacz ją jako `completed`, gdy jej kryteria sukcesu zostaną spełnione.

7. **Znajdź punkt początkowy**: przeskanuj `## Progress` — pierwszy `- [ ]` w kolejności dokumentu to miejsce, od którego zaczynasz. Jeśli podano argument `phase N`, przejdź do pierwszego `- [ ]` pod `### Phase N:`.

> **Konwencja schowka.** Wszędzie tam, gdzie ta umiejętność mówi *skopiuj `X` do schowka*, przekaż dokładny ciąg `X` do schowka platformy — spróbuj `pbcopy` (macOS), następnie `clip.exe` (Windows/WSL), następnie `xclip -selection clipboard` (Linux) i cicho wróć, jeśli żadne nie istnieją. Następnie wyświetl skopiowane polecenie w osobnym wierszu z sufiksem `(✓ copied)`.

---

## Brama kwalifikacyjna TDD — uruchamiana przed każdą fazą

Zanim napiszesz choć jeden test dla fazy, zdecyduj o dwóch rzeczach w tej kolejności:

1. **Brak implementacji** — implementacja produkcyjna fazy nie jest jeszcze obecna.
2. **Zdolność do TDD** — faza może być sensownie prowadzona przez nieudany test.

Faza kwalifikuje się do tej umiejętności tylko wtedy, gdy oba warunki są prawdziwe.

### Zatrzymanie istniejącej implementacji

Najpierw sprawdź `Changes Required`, `Success Criteria` fazy i oczekujące wiersze `## Progress`, a następnie wykonaj ukierunkowane wyszukiwanie kodu dla plików, symboli, punktów końcowych, migracji, poleceń, interfejsów użytkownika lub wpisów konfiguracyjnych, które faza ma dodać lub zmienić. Jest to szybkie sprawdzenie rzeczywistości, a nie szerokie badanie.

Jeśli podstawowa implementacja dla fazy jest już obecna lub częściowo obecna, ZATRZYMAJ się natychmiast. Nie dodawaj testów po fakcie, nie refaktoryzuj istniejącego kodu, nie oznaczaj wierszy Progress i nie oferuj kontynuowania w linii. TDD nie działa dla już istniejącego kodu, ponieważ nieudany test nie prowadzi już implementacji.

Wydrukuj ten blok, uzupełniając konkretne dowody:

```
Faza [N] ma już implementację, więc nie mogę jej prowadzić za pomocą TDD.

TDD nie działa dla już istniejącego kodu; nieudany test musi poprzedzać kod produkcyjny. Tutaj znalazłem istniejącą implementację:
- [dowody pliku/symbolu/punktu końcowego/itp.]

Użyj /10x-implement, aby kontynuować tę fazę:
→ /10x-implement <change-id> phase [N]
```

Skopiuj `/10x-implement <change-id> phase [N]` do schowka zgodnie z konwencją schowka, wyświetl go z `(✓ copied)` po pomyślnym wykonaniu i ZATRZYMAJ. `/10x-implement` może kontynuować fazę z istniejącego kodu i stanu planu.

Jeśli implementacja jest nieobecna, przejdź do sprawdzenia zdolności do TDD.

### Sprawdzenie zdolności do TDD

Po potwierdzeniu braku implementacji, zdecyduj, czy faza może być **sensownie prowadzona przez nieudany test**. Faza jest TDD'owalna, gdy istnieje **obserwowalny wynik, który można potwierdzić, zanim kod będzie istniał**.

| TDD'owalne — prowadź tutaj | Nie TDD'owalne — przekieruj do `/10x-implement` |
|---|---|
| Czyste funkcje, transformacje danych, parsery, walidatory | Czyste tworzenie szkieletu: tworzenie katalogów, plików konfiguracyjnych, edycje `package.json`/manifestu |
| Maszyny stanów / reduktory / obliczanie flag | Okablowanie i infrastruktura: pliki CI, Dockerfile, konfiguracja środowiska, konfiguracja wdrożenia |
| Kontrakty żądanie API → odpowiedź (status, kształt, uwierzytelnianie, bramkowanie) | Dopracowanie wizualne / stylizacyjne bez zautomatyzowanej ścieżki asercji w stosie |
| Logika biznesowa z jasnymi wejściami/wyjściami | Eksploracyjne spiki, gdzie kontrakt nie jest jeszcze znany |
| Przepływy integracji przez granice, które można mockować (DB/KV/HTTP) | Dokumentacja, komentarze, edycje tylko treści |
| Naprawy błędów (najpierw napisz nieudany repro) | Cienkie połączenia, gdzie test tylko powtarzałby implementację (tautologiczne) |

**Jak zastosować sprawdzenie zdolności do TDD:**

- Jeśli implementacja jest nieobecna, a faza jest **wyraźnie TDD'owalna**, stwierdź to w jednym wierszu i przejdź do pętli red-green-refactor.
- Jeśli faza jest **wyraźnie nie TDD'owalna**, uruchom **przekierowanie** (poniżej).
- Jeśli jest **mieszana lub niejednoznaczna** (np. faza, która tworzy szkielet konfiguracji *i* dodaje walidator z prawdziwą logiką), zapytaj użytkownika: "Faza [N] to częściowo tworzenie szkieletu, częściowo logika. Jak mam ją prowadzić?" z opcjami:
  - "TDD testowalną część (Zalecane)": "Będę red-green-refactor [logikę] i implementować tworzenie szkieletu w linii jako proste kroki."
  - "Przekieruj całą fazę do /10x-implement": "Przekaż całą fazę — skopiuj polecenie wznowienia do schowka."
  - "TDD całą fazę mimo wszystko": "Wymuś test-first nawet dla cienkich części. Może to prowadzić do testów o niskiej wartości."

### Przekieruj fazę nie TDD'owalną do `/10x-implement`

Podaj *dlaczego* faza nie pasuje (jedno lub dwa zdania, oparte na powyższej tabeli), a następnie zapytaj użytkownika: "Faza [N] nie jest dobrym kandydatem do test-first. Jak chcesz to rozwiązać?" z opcjami:
  - "Przekaż do /10x-implement (Zalecane)": "Skopiuj `/10x-implement <change-id> phase N` do schowka. Wyczyść kontekst, uruchom, a następnie wznów TDD w następnej fazie."
  - "Implementuj w linii tutaj (bez test-first)": "Zbuduję tę fazę bezpośrednio z planu i uruchomię jej kryteria sukcesu — a następnie przejdę do bramy następnej fazy."
  - "Pomiń — już zrobione": "Oznacz wiersze Progress fazy i przejdź do następnej fazy."

**W przypadku "Przekaż":** skopiuj `/10x-implement <change-id> phase [N]` do schowka (zgodnie z konwencją schowka), wydrukuj poniższy blok i ZATRZYMAJ — `/10x-implement` odwróci wiersze Progress tej fazy i uruchomi własny rytuał zatwierdzania. Powiedz użytkownikowi, aby wznowił TDD później.

```
Faza [N] nie jest materiałem do test-first — [jednolinijkowy powód].

→ /10x-implement <change-id> phase [N] (✓ skopiowano)

Wyczyść kontekst (`/clear`), uruchom to, a następnie wróć z:
→ /10x-tdd <change-id> phase [N+1]
```

**W przypadku "Implementuj w linii":** zbuduj fazę bezpośrednio z planu (zgodnie z `lessons.md` i istniejącymi konwencjami), uruchom jej zautomatyzowane kryteria sukcesu, a następnie przejdź do rytuału zakończenia fazy — ale pomiń ramkę RED/GREEN w komunikacie zatwierdzenia (użyj zwykłego tematu `feat`/`chore`/`refactor`). Następnie przejdź do bramy następnej fazy.

**W przypadku "Pomiń":** odwróć wiersze Progress fazy `[ ]` → `[x]` (bez SHA, ponieważ nic nie zostało zatwierdzone) i przejdź do następnej fazy.

---

## Cykl Red-Green-Refactor

W fazie TDD'owalnej pracuj zachowanie po zachowaniu. Każdy krok `#### Automated` w Progress fazy (lub każde odrębne zachowanie w Changes Required) to jedno przejście przez pętlę. Utrzymuj pętlę ciasną — mały test, mały kod, często uruchamiaj.

### Budżet testowy na fazę

Napisz **skoncentrowany** zestaw, a nie wyczerpujące pokrycie — zazwyczaj **2-5 testów na fazę**. Wybierz zachowania, które dowodzą, że faza działa i wychwyciłyby rzeczywiste regresje. Ustanawiasz wzorzec; deweloper rozszerza go później. Nie pisz testu dla każdego gettera lub stałej.

### CZERWONY — najpierw napisz nieudany test

1. Napisz **jeden** test (lub ścisłą grupę) dla następnego zachowania, zgodnie z konwencjami odkrytymi w Setup — styl importu, zagnieżdżanie describe/it, istniejące pomocniki mocków. Nie wymyślaj nowych wzorców.
2. Nazwij go dla **wyniku**, a nie mechanizmu. Dobrze: `"zwraca 429, gdy token przekracza 20 zgłoszeń na godzinę"`. Źle: `"wywołuje rateLimiter.check()"`.
3. Testuj **wyniki, a nie wewnętrzne elementy** — sprawdzaj wartości zwracane, renderowane wyjście, odpowiedzi HTTP lub kształt stanu, nigdy wywołania prywatnych metod ani kolejność wykonania.
4. **Uruchom tylko ten plik testowy** z wywołaniem pojedynczego pliku projektu odkrytym w Setup (np. forma `run <path>` runnera, wyjście przycięte do końca) i potwierdź, że **nie udaje się z właściwego powodu** — błąd asercji lub "moduł nie znaleziony / nie zaimplementowany" dla kodu, który masz zamiar napisać, **nie** błąd składniowy lub uszkodzony import w samym teście. Krótko pokaż użytkownikowi czerwony wynik.

Nigdy nie używaj `it.skip()` / `xit()`, aby "zaliczyć" fazę — pominięty test jest niewidoczny. Czerwień jest celem.

### ZIELONY — minimalny kod do zaliczenia

5. Napisz **najmniejszy** kod produkcyjny, który sprawi, że nieudany test przejdzie. Oprzyj się budowaniu przed testem — przyszłe zachowania mają swój własny krok RED.
6. Ponownie uruchom test. Potwierdź **zielony**. Jeśli inne testy się zepsuły, zmieniłeś zachowanie — napraw kod (nie testy), aż zestaw będzie ponownie zielony.

### REFAKTOR — posprzątaj, pozostań zielony

7. Gdy test jest zielony, popraw nazwy, usuń duplikaty, zacieśnij typy — **bez zmiany zachowania**. Uruchom ponownie po każdej znaczącej zmianie; test musi pozostać zielony. Pomiń ten krok, gdy nie ma nic do posprzątania.

8. **Oznacz krok jako wykonany.** Odwróć dokładnie ten wiersz w `## Progress`: `- [ ] N.M <title>` → `- [x] N.M <title>` (brak SHA jeszcze — SHA ląduje na końcu fazy). Następnie wróć do RED dla następnego zachowania.

Powtarzaj RED→GREEN→REFACTOR, aż każdy krok `#### Automated` w fazie będzie `[x]`, a kryteria sukcesu fazy zostaną spełnione.

---

## Zakończenie fazy

Gdy wszystkie wiersze `#### Automated` w `### Phase N:` są `[x]`, uruchom rytuał zakończenia fazy (odzwierciedla to `/10x-implement` — jedno zatwierdzenie Conventional-Commits na fazę, a następnie zapisz jego krótki SHA z powrotem do odwróconych wierszy).

> **Twardy niezmiennik — zatwierdzaj tylko na zielono.** Nigdy nie proponuj, nie przygotowuj ani nie twórz zatwierdzenia, gdy jakikolwiek test w zakresie jest CZERWONY, pominięty w celu udawania zaliczenia lub w inny sposób uszkodzony. Zatwierdzenie jest oferowane **tylko po osiągnięciu stanu ZIELONEGO (lub REFAKTOR) i zaliczeniu pełnego zestawu**. Krok RED to przejściowy punkt kontrolny, który pokazujesz użytkownikowi, nigdy granica zatwierdzenia. Jeśli zestaw jest czerwony na końcu fazy, napraw kod, aż będzie zielony — nie przechodź do kroku 1 rytuału z nieudanymi testami.

Utrzymuj **zestaw zmodyfikowanych plików** przez całą fazę: każdy plik, który modyfikujesz (testy *i* kod produkcyjny) trafia do niego, plus `context/changes/<change-id>/plan.md` (zawsze — edytujesz jego Progress). W **pierwszej fazie** zmiany, również zasil go wszystkimi nieśledzonymi/zmodyfikowanymi plikami w `context/changes/<change-id>/` (`change.md`, `research.md` itp.). Zestaw **resetuje się na każdej granicy fazy**.

1. **Uruchom pełny zestaw** (nie tylko pojedyncze pliki) i potwierdź zielony. Napraw wszelkie uszkodzenia międzyfazowe przed zatwierdzeniem.

2. **Brama ręcznego potwierdzenia.** Powiedz człowiekowi, że automatyczna weryfikacja przeszła, wymień elementy ręcznej weryfikacji planu dla tej fazy i wstrzymaj się. Nie kontynuuj, dopóki nie potwierdzi.

```
Faza [N] zakończona (test-first) — gotowa do ręcznej weryfikacji

Automatyczna weryfikacja przeszła:
- [testy teraz zielone: wymień kluczowe]
- [inne automatyczne sprawdzenia: lint, typy, pełny zestaw]

Proszę wykonać ręczne kroki weryfikacji z planu:
- [ręczne elementy dla tej fazy]

Daj mi znać, kiedy ręczne testowanie zostanie zakończone, abym mógł zatwierdzić.
```

   W **ostatniej fazie** również zsumuj wszystkie nadal oczekujące wiersze `#### Manual` z wcześniejszych faz (informacyjnie; brama nadal tylko wstrzymuje, nie blokuje na stałe).

3. **Wykryj niezwiązane brudne ścieżki.** Uruchom `git status --porcelain`; przetnij z ścieżkami **poza** zestawem zmodyfikowanych. Jeśli takie istnieją, przedstaw je i zapytaj użytkownika, czy zatwierdzić tylko zaplanowany zestaw (Zalecane), przygotować wszystkie, czy przerwać. Jeśli żadne, pomiń.

4. **Przygotuj jawnie według ścieżki** — `git add` każdy plik w zestawie zmodyfikowanych według nazwy. Nigdy `git add -A` / `git add .`.

5. **Sprawdzenie pustego diffa.** `git diff --cached --quiet`; jeśli wyjście 0, wydrukuj, że faza nie miała diffa (wiersze pozostają bez SHA), ustaw `SHA=""` i przejdź do kroku 8.

6. **Zaproponuj wiadomość Conventional-Commits** i poproś użytkownika o jej zatwierdzenie (zatwierdź jako zaproponowane / edytuj temat / nadpisz). Temat: `<type>(<change-id>): <tytuł fazy> (p<N>)`. Dla faz TDD'owanych, preferuj `test`/`feat` i wspomnij o charakterze test-first w treści. Dołącz wiersz `Refs:`, jeśli rozmowa zawiera rzeczywiste odniesienia Jira/Linear/GitHub (nigdy nie wymyślaj ich z change-id lub gałęzi).

7. **Zatwierdź** za pomocą pojedynczego `git commit` z treścią heredoc, zgodnie z globalnym protokołem wiadomości zatwierdzenia: zatwierdzony wiersz tematu, a następnie krótka treść wymieniająca dodane testy + zmodyfikowany kod produkcyjny (i wiersz `Refs:`, gdy ma to zastosowanie). Nigdy nie przekazuj flag `--no-verify` / `--amend` / pomijania podpisywania. Jeśli hak pre-commit zawiedzie, napraw przyczynę i utwórz NOWE zatwierdzenie.

8. **Zapisz i zapisz z powrotem SHA.** `git rev-parse --short HEAD` → `SHA`. Dla każdego wiersza Progress odwróconego w tej fazie, zmodyfikuj `- [x] N.M <title>` → `- [x] N.M <title> — <SHA>` (pomiń wiersze, które już zawierają SHA; jeśli `SHA=""`, pomiń — `/10x-archive` wyświetla wiersze bez SHA jako ostrzeżenia informacyjne).

9. **Zaktualizuj `change.md`**: `updated: <today>`; utrzymuj `status: implementing` do ostatniej fazy.

10. **Zresetuj zestaw zmodyfikowanych plików** przed następną fazą.

### Decyzja o następnej fazie

Zapytaj użytkownika: "Faza [N] zakończona (test-first). Jak postępować?" z opcjami:
  - "Kontynuuj do Fazy [N+1]": "Pozostań w tym kontekście; uruchom bramę zdolności do TDD dla następnej fazy i kontynuuj."
  - "Najpierw wyczyść kontekst": "Skopiuj polecenie wznowienia do schowka. Zacznij od nowa dla Fazy [N+1]."
  - "Najpierw przejrzyj tę fazę": "Uruchom /10x-impl-review, aby zweryfikować implementację względem planu przed kontynuowaniem."

**Kontynuuj:** przeczytaj następną fazę, ustaw jej zadanie jako `in_progress`, uruchom bramę TDD, kontynuuj. Nie ma potrzeby ponownego czytania całego planu.

**Przejrzyj:** uruchom `/10x-impl-review @<path-to-plan> phase [N]`, a następnie ponownie przedstaw decyzję o kontynuowaniu/czyszczeniu (bez opcji przeglądu).

**Wyczyść:** skopiuj `/10x-tdd <change-id> phase [N+1]` do schowka (zgodnie z konwencją schowka) i wyświetl jako `→ /10x-tdd <change-id> phase [N+1] (✓ skopiowano)`.

Jeśli polecono uruchomić wiele faz kolejno, pomiń to pytanie między fazami. Nie zaznaczaj wierszy **ręcznych**, dopóki użytkownik nie potwierdzi.

---

## Śledzenie stanu

**Sekcja `## Progress` w `plan.md` jest jedynym źródłem prawdy** — brak pliku stanu, brak znaczników komentarzy (patrz `references/progress-format.md`). Ta umiejętność mutuje Progress dokładnie tak jak `/10x-implement`: odwróć `[ ]` → `[x]` dla każdego kroku, gdy zostanie wykonany; dołącz SHA zamykającego zatwierdzenia do każdego odwróconego wiersza, za jednym razem na końcu fazy. W trakcie fazy, ukończone wiersze mają `[x]` bez SHA — prawidłowy stan pośredni. Ponieważ obie umiejętności zapisują tę samą sekcję identycznie, zmiana może być prowadzona przez jedną lub obie, w dowolnej kolejności.

**"Gdzie jestem?" jest wywnioskowane, a nie przechowywane:** pierwszy wiersz `- [ ]` to następny krok; jego otaczający `### Phase N:` to bieżąca faza; ukończenie to `count([x]) / count([ ] + [x])`.

---

## Po wszystkich fazach

Gdy każdy `- [ ]` w całej sekcji `## Progress` jest `[x]`:

1. **Skanowanie obronne w poszukiwaniu maruderów.** Ponownie przeskanuj w poszukiwaniu pozostałych `- [ ]`. W normalnym przepływie nie ma żadnych. Jeśli jakieś istnieją (ręczna edycja lub pominięty wyzwalacz je pozostawił), wymień je pogrupowane według Automated/Manual i zapytaj użytkownika, czy **Wstrzymać** (ZATRZYMAJ, nie dotykaj `change.md`) czy **Przejść do epilogu**.

2. **Zaktualizuj `change.md`**: `status: implemented`, `updated: <today>`. (NIE ustawiaj `archived_at` — to jest `/10x-archive`.)

3. **Zatwierdzenie epilogu.** Zapis SHA ostatniej fazy i zmiana statusu `change.md` pozostają brudne po ostatnim rytuale. Przygotuj dokładnie `plan.md` + `change.md` (jawne ścieżki), sprawdź `git diff --cached --quiet` (pomiń, jeśli puste), zaproponuj `chore(<change-id>): close out plan (epilogue)`, zatwierdź i zatwierdź za pomocą heredoc. NIE zapisuj z powrotem własnego SHA epilogu.

4. **Podsumowanie ukończenia + opcjonalny przegląd:**

```
Wszystkie fazy zaimplementowane test-first! 🎉

Podsumowanie:
- Ukończone fazy: [N]  ([k] TDD'owane, [j] przekierowane do /10x-implement)
- Dodane testy: [liczba] w [plikach]
- Zmienione pliki: [kluczowe pliki]
```

   Następnie zapytaj użytkownika: uruchomić `/10x-impl-review <change-id>` (przegląd całego planu) czy pominąć.

---

## Wytyczne TDD

### Co sprawia, że test jest dobry w tym przypadku

- Opisuje **co** system robi, a nie **jak** to robi wewnętrznie.
- Nie udaje się z **właściwego powodu** — zachowanie jeszcze nie istnieje, a nie zepsuty test.
- Jest **stabilny** — przetrwa refaktoryzację, psuje się tylko wtedy, gdy zmienia się zachowanie.
- Jest **minimalny** — najmniejsze zachowanie, które ma znaczenie, najprostsza konfiguracja.

### Czego unikać

- Testowania szczegółów implementacji (stan prywatny, wewnętrzna kolejność wywołań, sekwencjonowanie efektów ubocznych).
- Nadmiernego mockowania — jeśli wszystko jest mockowane, testujesz swoje mocki. Nie mockuj testowanej rzeczy; mockuj jej współpracowników (KV, DB, HTTP).
- Testów migawkowych dla logiki biznesowej (migawki służą do stabilności renderowania interfejsu użytkownika).
- Prawie identycznych testów z nieco innymi nazwami; testów dla trywialnego kodu.
- Budowania kodu produkcyjnego przed nieudanym testem — każde zachowanie najpierw zasługuje na swój krok RED.

### Obsługa niejasności planu

Jeśli kryteria akceptacji fazy są niejasne ("działa zgodnie z oczekiwaniami"), nie zgaduj. Sprawdź Desired End State i Changes Required fazy pod kątem konkretnych danych wejściowych/wyjściowych. Jeśli nadal jest niejasne, zadaj użytkownikowi jedno ukierunkowane pytanie o to, jak wygląda "sukces", zanim napiszesz test RED.

### Obsługa niezgodności planu z rzeczywistością

Jeśli faza nie może zostać zaimplementowana zgodnie z opisem, ZATRZYMAJ się i przedstaw to jasno:

```
Problem w Fazie [N]:
Oczekiwano: [co mówi plan]
Znaleziono: [rzeczywista sytuacja]
Dlaczego to ma znaczenie: [wyjaśnienie]
```

Następnie zapytaj użytkownika — Dostosuj i kontynuuj / Pomiń tę część / Zatrzymaj i ponownie zaplanuj.

### Umiejscowienie plików

Postępuj zgodnie z konwencją odkrytą w Setup. Domyślne, jeśli żadna nie istnieje:

- **Testy jednostkowe** — obok pliku źródłowego (`src/[module]/thing.test.ts`).
- **Testy integracyjne / API** — w `tests/` (`tests/[feature]/thing.test.ts`).
- **Testy E2E** — katalog e2e na poziomie projektu (`tests/e2e/[feature].spec.ts`).

### Jeśli utkniesz

Używaj podzadań oszczędnie — `Explore` do szybkiego wyszukiwania plików/wzorców, `general-purpose` do wieloetapowej analizy nieznanego terenu. Najpierw upewnij się, że przeczytałeś odpowiedni kod; rozważ, że baza kodu mogła ewoluować od czasu napisania planu.
