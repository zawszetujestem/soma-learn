---
name: 10x-implement
description: Implement technical plans from context/changes/<change-id>/plan.md with verification
---

# Implementacja planu

Twoim zadaniem jest zaimplementowanie zatwierdzonego planu technicznego z `context/changes/<change-id>/plan.md`. Plany te zawierają fazy ze specyficznymi zmianami oraz kanoniczną sekcję `## Progress` na dole, która steruje stanem wykonania (zobacz `references/progress-format.md`).

## Konfiguracja początkowa

Po wywołaniu tej komendy:

1. **Rozwiąż plan**:
   - Jeśli wywołano jako `/10x-implement <change-id> [phase N]`, rozwiąż do `context/changes/<change-id>/plan.md`.
   - Jeśli wywołano z `@context/changes/<change-id>/plan.md` lub pełną ścieżką, zaakceptuj.
   - **Odmów, jeśli rozwiązana ścieżka zaczyna się od `context/archive/`** — wydrukuj "This change is archived. Open a new change with `/10x-new` instead." i ZATRZYMAJ.
   - Jeśli nic nie zostało podane, odpowiedz poniższą wiadomością i **ZATRZYMAJ i czekaj**:

```
I'll help you implement an approved technical plan. Please provide:

1. A change-id (e.g., `/10x-implement oauth-login phase 1`), or
2. A full path (e.g., `@context/changes/oauth-login/plan.md`).

You can list active changes with: `ls context/changes/`

Tip: Make sure the plan has been reviewed and approved before implementation.
```

## Rozpoczęcie pracy

Po podaniu ścieżki do planu:

- Przeczytaj plan w całości. Sekcja `## Progress` na dole jest autorytatywna dla stanu wykonania — znaczniki wyboru (`- [x]`) znajdują się TYLKO tam. Bloki faz zawierają zwykłe punktorzy `- ` (bez pól wyboru).
- Przeczytaj `context/foundation/lessons.md`, jeśli istnieje, i przyswój każdy wpis przed rozpoczęciem jakiejkolwiek fazy — są to zaakceptowane, powtarzające się zasady zespołu i muszą kształtować każdy wybór implementacyjny, którego dokonasz w tym przebiegu.
- Przeczytaj wszystkie pliki wymienione w planie (odwołania do badań, ram, plików źródłowych w tym samym folderze zmian)
- **Czytaj pliki w całości** - nigdy nie używaj parametrów limit/offset, potrzebujesz pełnego kontekstu
- Dogłębnie przemyśl, jak poszczególne elementy pasują do siebie
- **Zaktualizuj `change.md`**: przy wejściu ustaw `status: implementing` (tylko jeśli aktualnie w `{planned, plan_reviewed}`) i `updated: <today>`.
- **Zsynchronizuj roadmapę** (najlepszy wysiłek, raz przy wejściu): jeśli `context/foundation/roadmap.md` zawiera element, którego `Change ID` jest równe `<change-id>`, zmień status tego elementu na `Status: in-progress`. Zobacz "## Synchronizacja statusu roadmapy" poniżej. Jest to odpowiednik `/10x-archive`'s `done` flip dla otwartych prac; nigdy nie blokuje, a większość zmian nie będzie śledzona w roadmapie.
- Policz całkowitą liczbę faz (z nagłówków `## Phase N:`) i utwórz jeden wpis TaskCreate dla każdej fazy (pojawiają się one na pasku statusu użytkownika):
  - Dla każdej fazy utwórz zadanie z `subject: "Phase N: [Phase Name]"` i `activeForm: "Implementing Phase N"`
  - Ustaw bieżącą fazę na `in_progress` za pomocą TaskUpdate przed rozpoczęciem pracy
  - Oznacz każdą fazę jako `completed` za pomocą TaskUpdate, gdy jej kryteria sukcesu zostaną spełnione
- **Znajdź następny oczekujący krok**, skanując sekcję `## Progress`: pierwsza linia `- [ ]` w kolejności dokumentu to miejsce, od którego zaczynasz. Jeśli podano argument `phase N`, przejdź do pierwszej linii `- [ ]` wewnątrz `### Phase N:`.
- Rozpocznij implementację, jeśli rozumiesz, co należy zrobić

## Filozofia implementacji

Plany są starannie projektowane, ale rzeczywistość może być skomplikowana. Twoim zadaniem jest:

- Postępować zgodnie z intencją planu, jednocześnie dostosowując się do tego, co znajdziesz
- W pełni zaimplementować każdą fazę przed przejściem do następnej
- Zweryfikować, czy Twoja praca ma sens w szerszym kontekście bazy kodu
- Aktualizować pola wyboru w planie w miarę ukończenia sekcji

Gdy coś nie pasuje dokładnie do planu, zastanów się dlaczego i jasno to zakomunikuj. Plan jest Twoim przewodnikiem, ale Twoja ocena również ma znaczenie.

Jeśli napotkasz niezgodność:

- ZATRZYMAJ SIĘ i dogłębnie zastanów się, dlaczego plan nie może być przestrzegany
- Przedstaw problem jasno w formie tekstu:

  ```
  Issue in Phase [N]:
  Expected: [what the plan says]
  Found: [actual situation]
  Why this matters: [explanation]
  ```

- Następnie zapytaj użytkownika: "How should I handle this mismatch?" z następującymi opcjami:
  - "Adapt and continue" (opis: "Dostosuj implementację do rzeczywistości. Wyjaśnię adaptację.")
  - "Skip this part" (opis: "Przejdź do następnej sekcji/fazy. Ta zmiana nie jest potrzebna.")
  - "Stop and re-plan" (opis: "Ta niezgodność jest zbyt znacząca. Najpierw musimy zaktualizować plan.")

## Śledzenie plików zmienionych podczas fazy

Rytuał zatwierdzania końca fazy (zobacz "Podejście do weryfikacji" poniżej) przygotowuje pliki z **zestawu zmienionych plików**, który utrzymujesz w pamięci roboczej przez całą fazę. Ten zestaw jest kanonicznym wejściem do `git add` — nigdy nie wracaj do heurystyki `git status` dla decyzji o przygotowaniu.

**Dyscyplina**:

- Za każdym razem, gdy modyfikujesz plik za pomocą swojego asystenta kodowania AI podczas bieżącej fazy, dodaj jego ścieżkę względną do repozytorium do zestawu zmienionych plików.
- Zestaw zawsze zawiera `context/changes/<change-id>/plan.md`, ponieważ każda faza powoduje co najmniej jedną modyfikację w sekcji `## Progress`. Dodaj go przy wejściu do fazy, nawet zanim jakiekolwiek pola wyboru zostaną zmienione.
- **Bootstrap fazy 1**: w pierwszej fazie zmiany, również zasiej zestaw zmienionych plików wszystkimi nieśledzonymi lub zmodyfikowanymi plikami wewnątrz `context/changes/<change-id>/` — zazwyczaj `change.md`, `research.md`, `plan.md` i innymi plikami kontekstowymi utworzonymi podczas planowania. Pliki te są częścią zmiany i powinny trafić do pierwszego commita, zamiast pozostawać jako nieśledzone resztki.
- Zestaw **resetuje się na każdej granicy fazy**. Po zakończeniu commita końca fazy, wyczyść go przed rozpoczęciem następnej fazy.
- Ta lista zastępuje wszelkie heurystyki z `git status`. Jeśli zestaw zmienionych plików to `{a.md, b.md, plan.md}`, ale `git status --porcelain` również zgłasza `c.md` jako brudny, `c.md` jest niezwiązany — obsłuż go za pomocą monitu o brudną ścieżkę w rytuale, nigdy nie pakuj go cicho do commita.

## Śledzenie odniesień do problemów/zadań dla commitów

Przed zaproponowaniem jakiejkolwiek wiadomości commitu na koniec fazy lub epilogu, przeskanuj kontekst rozmowy w poszukiwaniu odniesień do problemów lub zadań w systemie śledzenia związanych z tą pracą implementacyjną, w tym kluczy Jira (na przykład `ABC-123`), identyfikatorów problemów Linear (na przykład `ENG-123`), odniesień do problemów/PR GitHub (na przykład `#123`, `GH-123` lub pełnych adresów URL problemów/PR GitHub) lub jawnych linków do zadań z Jira, Linear lub GitHub.

- Jeśli obecne są jedno lub więcej odniesień, umieść je w treści wiadomości commitu pod linią `Refs:`, zachowując dokładne identyfikatory/adresy URL podane przez użytkownika, jeśli to możliwe.
- Jeśli dotyczy wiele odniesień, wymień je oddzielone przecinkami w jednej linii `Refs:`.
- Nie wymyślaj ani nie wnioskuj odniesień do śledzenia z change-id, nazwy gałęzi lub nazw plików. Używaj tylko odniesień widocznych w bieżącym kontekście rozmowy lub wyraźnie podanych przez użytkownika.
- Zastosuj tę samą linię `Refs:` do każdego commitu na koniec fazy i do commitu epilogu, chyba że użytkownik zawęzi odniesienie do konkretnej fazy.

## Synchronizacja statusu roadmapy

`context/foundation/roadmap.md` (produkowany przez `/10x-roadmap`) indeksuje każdą Fundację/Fragment za pomocą stabilnego **Change ID**. `/10x-archive` już zamyka pętlę na drugim końcu — gdy zmiana jest archiwizowana, zmienia odpowiadający element roadmapy na `Status: done`. Ten krok łączy początek: gdy implementacja *rozpoczyna się*, oznacz odpowiadający element jako **`in-progress`**, aby roadmapa pokazywała bieżącą pracę zamiast przeskakiwać bezpośrednio z `ready` na `done`.

Uruchom to **raz, przy wejściu** do zmiany (zaraz po stemplu `change.md` → `implementing`) — nie na fazę. Wyszukiwanie jest **obowiązkowe**; "najlepszy wysiłek" dotyczy tylko *edycji* — brakująca roadmapa lub nieznaleziony cel jest pomijany cicho i nigdy nie blokuje, nie monituje, nie cofa ani nie przerywa działania. Nie pomijaj sprawdzenia, zakładając, że nie ma roadmapy.

1. Sprawdź, czy `context/foundation/roadmap.md` istnieje. Jeśli nie ma, pomiń ten krok cicho.
2. Zapisz, czy plik jest już brudny: `ROADMAP_PREDIRTY=$(git status --porcelain context/foundation/roadmap.md 2>/dev/null)` — używane w kroku 5 do podjęcia decyzji o przygotowaniu.
3. Przeczytaj plik. Poszukaj `<change-id>` użytego jako `Change ID`:
   - w tabeli `## At a glance` — wiersz, którego komórka w kolumnie **Change ID** jest dokładnie równa `<change-id>`;
   - oraz w treściach `## Foundations` / `## Slices` — blok `### <ID>: …`, który zawiera linię `- **Change ID:** <change-id>`.

   `<ID>` to lokalny identyfikator roadmapy tego elementu (`F-NN` lub `S-NN`). Dopasowanie jest tylko dokładnym ciągiem znaków — fragment może wygenerować kilka zmian, więc bliskie dopasowanie jest celowo *nie* dotykane. **Brak dopasowania** → wydrukuj `ℹ context/foundation/roadmap.md has no item with Change ID "<change-id>" — roadmap left untouched.` i pomiń resztę tego kroku.
4. **Znaleziono dopasowanie** → odczytaj bieżący `- **Status:**` elementu. Jeśli jest już `in-progress` lub `done`, pozostaw go bez zmian (**tylko do przodu**: nigdy nie cofaj bardziej zaawansowanego statusu) i przejdź do kroku 5. W przeciwnym razie zastosuj obie edycje za pomocą odpowiedniego narzędzia — każda niezależna i z najlepszym wysiłkiem; jeśli cel nie znajduje się tam, gdzie umieszcza go szablon `/10x-roadmap` (ręcznie edytowana lub starsza formatka roadmapy), pomiń tę pod-edycję, kontynuuj i zanotuj, co zostało pominięte. Dotknij tylko pola `Status`; pozostaw `Outcome`, `Prerequisites`, `Change ID` itp. bez zmian.
   1. **`## At a glance`** — w dopasowanym wierszu ustaw komórkę w kolumnie **Status** na `in-progress`.
   2. **Treść elementu** — przepisz linię `- **Status:**` elementu na `- **Status:** in-progress`.

   Następnie zaktualizuj `updated:` w frontmatterze roadmapy na `<today>` (pozostaw wszystkie inne klucze bez zmian; pomiń to, jeśli plik nie ma frontmattera).
5. **Włącz zmianę do historii tej zmiany.** Jeśli `git` jest dostępny **i** `ROADMAP_PREDIRTY` (krok 2) był pusty, dodaj `context/foundation/roadmap.md` do zestawu zmienionych plików bieżącej fazy, aby zmiana statusu trafiła do commita fazy, zamiast pozostawać brudna. Jeśli `ROADMAP_PREDIRTY` był niepusty, plik miał już niezapisane edycje: pozostaw zmianę w drzewie roboczym, wyłącz `context/foundation/roadmap.md` Z zestawu zmienionych plików i wydrukuj `⚠ context/foundation/roadmap.md had pre-existing uncommitted changes — flipped roadmap item <ID> to in-progress in the working tree but did NOT stage it. Commit it yourself.` Jeśli `git` jest niedostępny, edycja po prostu pozostaje w drzewie roboczym.

## Podejście do weryfikacji

Po zaimplementowaniu fazy:

- Uruchom sprawdzenia kryteriów sukcesu (zazwyczaj `make check test` obejmuje wszystko)
- Napraw wszelkie problemy przed kontynuowaniem
- Zaktualizuj swój postęp w swoich zadaniach i w sekcji `## Progress` planu
- **Modyfikuj TYLKO sekcję `## Progress`.** Bloki faz (Overview, Changes Required, Success Criteria) są tylko do odczytu. Użyj swojego asystenta kodowania AI, aby zmodyfikować plan, aby zmienić `- [ ] N.M <title>` na `- [x] N.M <title>` w Progress, gdy każdy krok zostanie ukończony. NIE edytuj punktorów bloków faz, NIE dodawaj znaczników postępu w komentarzach HTML na dole planu i NIE zapisuj żadnego pliku stanu.
- **Uruchom rytuał zatwierdzania końca fazy**: Po pomyślnym przejściu wszystkich automatycznych sprawdzeń dla fazy, przejdź przez ten sekwencyjny rytuał, aby utworzyć jeden commit Conventional-Commits i zapisać krótki SHA z powrotem do każdego wiersza Progress zmienionego podczas fazy.

  1. **Bramka ręcznego potwierdzenia.** Poinformuj człowieka, że automatyczna weryfikacja zakończyła się pomyślnie i wymień elementy ręcznej weryfikacji z planu. Zatrzymaj się tutaj. Nie kontynuuj, dopóki człowiek nie potwierdzi, że testy ręczne zakończyły się sukcesem. Użyj tego formatu:

     ```
     Phase [N] Complete - Ready for Manual Verification

     Automated verification passed:
     - [List automated checks that passed]

     Please perform the manual verification steps listed in the plan:
     - [List manual verification items from the plan]

     Let me know when manual testing is complete so I can proceed to the commit step.
     ```

     **Ręczne podsumowanie międzyfazowe (tylko faza końcowa).** Przed wydrukowaniem komunikatu bramki, określ, czy bieżąca faza jest fazą końcową: przeskanuj sekcję `## Progress` w poszukiwaniu nagłówków `### Phase M:` i traktuj bieżącą fazę jako końcową, jeśli w kolejności dokumentu nie istnieje nagłówek z `M > N`. Jeśli bieżąca faza **nie jest** końcowa, komunikat bramki ma dokładnie powyższy format — bez podsumowania. Jeśli bieżąca faza **jest** końcowa, po bloku "Please perform the manual verification steps listed in the plan:", przeskanuj całą sekcję Progress w poszukiwaniu wierszy `- [ ]`, które znajdują się pod podsekcją `#### Manual` w dowolnej fazie **innej niż bieżąca**. Jeśli takie wiersze istnieją, dołącz następujący blok do komunikatu bramki (w kolejności dokumentu, jeden wiersz na linię, sformatowany jako `<phase>.<index> <title>` — usuń wszelkie prefiksy `- [ ]` i wszelkie sufiksy ` — <sha>`):

     ```
     Pending manual checks from earlier phases:
     - [phase.index title]
     ```

     Jeśli nie ma oczekujących ręcznych wierszy z wcześniejszych faz, całkowicie pomiń blok podsumowania. Bramka nadal wstrzymuje się na potwierdzenie od człowieka; jest to informacyjne, a nie twarda blokada. Fazy pośrednie (każda faza, która nie jest fazą końcową) zachowują oryginalny format bramki bez podsumowania.

  2. **Oblicz zestaw przygotowawczy.** Weź zestaw zmienionych plików utrzymywany podczas fazy (zobacz "Śledzenie plików zmienionych podczas fazy" powyżej) i połącz go z `{context/changes/<change-id>/plan.md}`. Plik planu jest zawsze przygotowywany, ponieważ każda faza powoduje co najmniej jedną modyfikację w sekcji `## Progress`.

  3. **Wykryj niezwiązane brudne ścieżki.** Uruchom `git status --porcelain` i przetnij z ścieżkami *poza* zestawem przygotowawczym. Jeśli zestaw brudnych, ale nietkniętych plików nie jest pusty, przedstaw problematyczne ścieżki i zapytaj użytkownika: "<N> unrelated path(s) are dirty. How should I handle them?" z następującymi opcjami:
     - "Continue — stage only the planned set (Recommended)" (opis: "Zatwierdź tylko pliki zmienione w tej fazie. Pozostaw niezwiązane ścieżki brudne do oddzielnego obsłużenia.")
     - "Stage all" (opis: "Dodaj niezwiązane ścieżki do tego commita. Bierzesz odpowiedzialność za szerszy zakres.")
     - "Abort" (opis: "Przerwij commit fazy. Najpierw rozwiąż brudne ścieżki, a następnie ponownie uruchom rytuał.")

     Jeśli zestaw brudnych, ale nietkniętych plików jest pusty, pomiń ten krok.

  4. **Przygotuj jawnie według ścieżki.** Wykonaj `git add` dla każdego pliku w wybranym zestawie według nazwy. NIE używaj `git add -A` ani `git add .` — tylko jawne ścieżki.

  5. **Sprawdź pusty diff.** Uruchom `git diff --cached --quiet`. Kod wyjścia 0 oznacza brak przygotowanego diffa. Jeśli pusty, wydrukuj:

     ```
     Phase [N] had no diff to commit; rows remain SHA-less; archive warn-only will surface them.
     ```

     Ustaw `SHA=""` i przejdź do kroku 8.

  6. **Zaproponuj wiadomość Conventional-Commits.** Zbuduj linię tematu w formie `<type>(<change-id>): <phase title> (p<N>)`, gdzie `<type>` to jeden z `feat / fix / chore / refactor / docs` wybrany na podstawie charakteru fazy (np. `feat` dla nowego zachowania widocznego dla użytkownika, `chore` dla edycji promptów/dokumentów, `refactor` dla restrukturyzacji bez zmiany zachowania). Tytuł fazy jest znaczącą częścią i prowadzi; sufiks `(p<N>)` zawiera indeks fazy. Zbuduj krótką treść zawierającą listę zmienionych plików, plus linię `Refs:` z "Śledzenie odniesień do problemów/zadań dla commitów", jeśli ma zastosowanie. Zapytaj użytkownika: "Approve commit message?" z następującymi opcjami:
     - "Approve as proposed (Recommended)" (opis: "Użyj wiadomości w zaproponowanej formie.")
     - "Edit subject line" (opis: "Zastąp temat; zachowaj treść.")
     - "Override entirely" (opis: "Zastąp zarówno temat, jak i treść.")

  7. **Zatwierdź za pomocą heredoc.** Wykonaj `git commit` zgodnie z globalnym protokołem wiadomości commitu:

     ```bash
     git commit -m "$(cat <<'EOF'
     <type>(<change-id>): <phase title> (p<N>)

     <short body listing touched files>
     <Refs: issue/task references, if applicable>
     EOF
     )"
     ```

     Nigdy nie przekazuj flag `--no-verify`, `--amend` ani flag omijających podpisywanie. Jeśli hak pre-commit zawiedzie, napraw podstawowy problem i utwórz NOWY commit — oryginalny commit NIE nastąpił, więc poprawianie dotknęłoby commitu poprzedniej fazy.

  8. **Zapisz krótki SHA.** Wykonaj `git rev-parse --short HEAD` i zapisz jako `SHA`. Pomiń ten krok, jeśli `SHA=""` zostało ustawione w kroku 5.

  9. **Zapisz SHA z powrotem do Progress.** Dla każdego wiersza Progress zmienionego podczas tej fazy, wykonaj ukierunkowaną modyfikację:

     - Znajdź: `- [x] N.M <title>` (bez istniejącego sufiksu ` — <sha>` na końcu linii)
     - Zastąp: `- [x] N.M <title> — <SHA>`

     Pomiń wiersze, które już zawierają sufiks SHA (bezpieczeństwo wznowienia: jeśli rytuał zostanie ponownie uruchomiony po częściowym przebiegu, nie dodawaj podwójnie). Jeśli `SHA=""`, całkowicie pomiń dodawanie — wiersze pozostają bez SHA, a `/10x-archive` wyświetli je jako ostrzeżenia informacyjne w ramach swojego sprawdzenia braku SHA.

  10. **Zaktualizuj `change.md`.** Ustaw `updated: <today>`; zachowaj `status: implementing` (idempotentne do ostatniej fazy). W ostatniej fazie ustaw `status: implemented` po zapisaniu SHA (zobacz "Po wszystkich fazach" poniżej).

  11. **Zresetuj zestaw zmienionych plików.** Wyczyść go przed rozpoczęciem następnej fazy. Rytuał jest samodzielny dla każdej fazy.

- **Decyzja o następnej fazie**: Jeśli istnieje następna faza, pomóż użytkownikowi zdecydować, czy kontynuować, czy zacząć od nowa.

  Zapytaj użytkownika: "Phase [N] complete. How to proceed?" z następującymi opcjami:
  - "Continue to Phase [N+1]" (opis: "Pozostań w tym kontekście i przejdź do następnej fazy.")
  - "Clear context first" (opis: "Skopiuj polecenie wznowienia do schowka. Rozpocznij od nowa dla Fazy [N+1].")
  - "Review this phase first" (opis: "Uruchom /10x-impl-review, aby zweryfikować implementację z planem przed kontynuowaniem.")

  **Jeśli użytkownik wybierze recenzję**: Uruchom `/10x-impl-review @[path-to-plan] phase [N]`, aby przejrzeć właśnie ukończoną fazę. Po zakończeniu recenzji, ponownie przedstaw decyzję o kontynuowaniu/wyczyszczeniu (tym razem bez opcji recenzji).

  **Jeśli użytkownik wybierze kontynuowanie**: Przejdź bezpośrednio do następnej fazy — przeczytaj sekcję planu dla następnej fazy, ustaw zadanie na `in_progress` i zaimplementuj. Nie ma potrzeby ponownego czytania całego planu ani już załadowanych plików.

  **Jeśli użytkownik wybierze wyczyszczenie**: Skopiuj polecenie wznowienia do schowka i wyświetl je:
  1. Kopiuj:
     ```bash
     echo -n "/10x-implement <change-id> phase [next-phase-number]" | pbcopy 2>/dev/null || echo -n "/10x-implement <change-id> phase [next-phase-number]" | clip.exe 2>/dev/null || echo -n "/10x-implement <change-id> phase [next-phase-number]" | xclip -selection clipboard 2>/dev/null || true
     ```

     ```powershell
     # PowerShell (Windows)
     Set-Clipboard "/10x-implement <change-id> phase [next-phase-number]"
     ```
  2. Wyświetl:
     ```
     → /10x-implement <change-id> phase [next-phase-number] (✓ copied)
     ```

Jeśli polecono wykonać wiele faz kolejno, pomiń AskUserQuestion między fazami.

nie zaznaczaj elementów w krokach testowania ręcznego, dopóki użytkownik nie potwierdzi.

## Śledzenie stanu

**Sekcja `## Progress` w `plan.md` jest jedynym źródłem prawdy.** Brak pliku stanu. Brak znaczników komentarzy. Zobacz `references/progress-format.md` dla umowy formatu.

### Po każdym kroku

Użyj swojego asystenta kodowania AI, aby modyfikować dokładnie jedną linię Progress na raz:

- Znajdź: `- [ ] N.M <title>`
- Zastąp: `- [x] N.M <title>`

Nie dodawaj sufiksu SHA przy modyfikacji pojedynczego kroku — SHA jest zapisywane z powrotem na końcu fazy przez rytuał commitu (zobacz "Podejście do weryfikacji" powyżej), a tylko SHA zamykającego commitu trafia do każdego wiersza, który został zmieniony podczas fazy. W trakcie fazy, ukończone wiersze mają `[x]` bez sufiksu SHA; jest to prawidłowy stan pośredni.

### Po każdej fazie

Gdy wszystkie elementy `- [ ]` wewnątrz `### Phase N:` są teraz `- [x]`:

1. Uruchom rytuał zatwierdzania końca fazy (zobacz "Podejście do weryfikacji" powyżej): ręczne potwierdzenie → przygotowanie → monit o brudną ścieżkę → commit → zapis SHA.
2. `change.md.updated` jest aktualizowany jako część kroku 10 rytuału.

Fazy z pustym diffem (tylko weryfikacja ręczna lub fazy no-op) nic nie zatwierdzają i pozostawiają swoje wiersze bez SHA; `/10x-archive` wyświetli je jako ostrzeżenia informacyjne w ramach swojego sprawdzenia braku SHA. Jest to celowe — nie każda faza produkuje kod.

### Po wszystkich fazach

Gdy każdy `- [ ]` w całej sekcji `## Progress` jest teraz `- [x]`:

1. **Obronne wyświetlanie oczekujących elementów.** Przeskanuj całą sekcję `## Progress` jeszcze raz w poszukiwaniu wierszy `- [ ]`. W normalnym przebiegu jest to operacja no-op — warunek wyzwalający dla "Po wszystkich fazach" to już "każdy `- [ ]` jest `- [x]`", więc wyświetlanie nie powinno nic znaleźć. Istnieje, aby wszelkie nieoczekiwane pozostałości były jawne, a nie cicho utracone (np. jeśli częściowe uruchomienie, ręczna edycja lub ścieżka wznowienia ominęła wyzwalacz). Jeśli liczba jest różna od zera, wymień każdy wiersz jako `<phase>.<index> <title>` pogrupowany według podsekcji Automated vs Manual w kolejności dokumentu, a następnie zapytaj użytkownika: "<N> Progress item(s) still pending. How to proceed?" z następującymi opcjami:
   - "Pause (Recommended)" (opis: "ZATRZYMAJ bez zmiany statusu change.md. Ręcznie zajmij się pozostałościami, a następnie ponownie wejdź na ścieżkę epilogu.")
   - "Proceed to epilogue" (opis: "Zmień status na: implemented i tak uruchom commit epilogu. Pozostałości zostaną wyświetlone jako ostrzeżenia w /10x-archive.")

   W przypadku "Pause": ZATRZYMAJ natychmiast. NIE aktualizuj `change.md`, NIE uruchamiaj commitu epilogu. W przypadku "Proceed to epilogue": kontynuuj z krokami 2–4 poniżej. Jeśli liczba wynosi zero, pomiń ten krok i kontynuuj.

2. Zaktualizuj `change.md`: ustaw `status: implemented`, `updated: <today>`. (NIE ustawiaj `archived_at` — to należy do `/10x-archive`.)
3. NIE zapisuj żadnego znacznika postępu w komentarzu HTML na dole planu.
4. **Uruchom commit epilogu.** Commit ostatniej fazy nie może zawierać własnego SHA (kurczak i jajko), więc zapis SHA z powrotem do wierszy Progress ostatniej fazy plus zmiana statusu `change.md` pozostają brudne w drzewie roboczym po zakończeniu rytuału ostatniej fazy. Utwórz jeden zamykający commit, aby je zapisać — w przeciwnym razie twarda odmowa `/10x-archive` (niezatwierdzone ścieżki w folderze zmiany) zablokuje. Kroki:
   1. Przygotuj dokładnie `context/changes/<change-id>/plan.md` i `context/changes/<change-id>/change.md` (jawne ścieżki, bez `git add -A`).
   2. Uruchom `git diff --cached --quiet`; jeśli kod wyjścia 0, pomiń epilog (nic do zatwierdzenia) i zatrzymaj się tutaj.
   3. Zaproponuj temat `chore(<change-id>): close out plan (epilogue)` z krótką treścią odnotowującą końcowy zapis SHA planu + change.md → implemented, plus linię `Refs:` z "Śledzenie odniesień do problemów/zadań dla commitów", jeśli ma zastosowanie. Poproś użytkownika o zatwierdzenie jako proponowane / edycję tematu / całkowite zastąpienie (te same opcje co w rytuale fazy).
   4. Zatwierdź za pomocą heredoc zgodnie z globalnym protokołem (nigdy `--no-verify` / `--amend`).
   5. NIE zapisuj własnego SHA epilogu z powrotem do planu — jego jedynym zadaniem jest czyste zapisanie końcowych edycji.

### "Gdzie jestem?" — wywnioskowane, nie przechowywane

Przeanalizuj sekcję `## Progress`. Pierwsza linia `- [ ]` to następny krok. Bieżąca faza to nagłówek `### Phase N:` bezpośrednio nad nią. Ukończenie to `count([x]) / count([ ] + [x])`. Bez JSON, bez znaczników, bez pliku pomocniczego — tylko sekcja Progress.

## Ukończenie planu

Gdy WSZYSTKIE fazy są zaimplementowane i zweryfikowane (każde pole wyboru Progress jest `[x]`):

1. Potwierdź, że `change.md.status` jest teraz `implemented`.
2. Przedstaw podsumowanie ukończenia, a następnie zaoferuj ostateczną recenzję:

```
All phases implemented! 🎉

Summary:
- Phases completed: [N]
- Files changed: [list key files]
```

Zapytaj użytkownika: "Plan complete. Would you like a final implementation review?" z następującymi opcjami:
  - "Run full review (/10x-impl-review)" (opis: "Kompleksowa recenzja wszystkich faz w stosunku do planu. Wykrywa problemy międzyfazowe.")
  - "Skip review — I'm satisfied" (opis: "Recenzja nie jest potrzebna. Oznacz plan jako ukończony.")

Jeśli użytkownik wybierze recenzję → uruchom `/10x-impl-review <change-id>` (brak numeru fazy = pełna recenzja planu).

## Jeśli utkniesz

Gdy coś nie działa zgodnie z oczekiwaniami:

- Najpierw upewnij się, że przeczytałeś i zrozumiałeś cały odpowiedni kod
- Zastanów się, czy baza kodu ewoluowała od czasu napisania planu
- Przedstaw jasno niezgodność i poproś o wskazówki

Używaj podzadań oszczędnie — głównie do ukierunkowanego debugowania lub eksploracji nieznanego terenu:

- **Explore** (`subagent_type: "Explore"`) — Szybkie wyszukiwanie plików, wzorców, podobnego kodu
- **general-purpose** (`subagent_type: "general-purpose"`) — Dogłębna analiza wymagająca wieloetapowego rozumowania

## Wznowienie pracy

Jeśli sekcja `## Progress` planu ma istniejące znaczniki `[x]`:

- Ufaj, że ukończona praca jest wykonana
- Kontynuuj od pierwszej linii `- [ ]`
- Zweryfikuj poprzednią pracę tylko wtedy, gdy coś wydaje się nie tak

Pamiętaj: Implementujesz rozwiązanie, a nie tylko zaznaczasz pola. Miej na uwadze cel końcowy i utrzymuj dynamikę.
