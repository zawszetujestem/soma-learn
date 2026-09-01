---
name: 10x-archive
description: Archive a completed change by moving its folder into context/archive/ and stamping change.md with archived status
---

# /10x-archive — Zamknij Zmianę

Przenieś ukończony folder zmiany z `context/changes/<change-id>/` do `context/archive/<created-date>-<change-id>/`, oznacz `change.md` statusem `status: archived` + `archived_at`, użyj `git mv`, aby zachować historię plików, i — jeśli `context/foundation/roadmap.md` zawiera element roadmapy, którego `Change ID` jest równe `<change-id>` — zamknij również ten element: zmień jego `Status` na `done` i dodaj wpis do sekcji `## Done` roadmapy.

Bramka jest **łagodna, tylko ostrzegawcza** — `/10x-archive` blokuje tylko w przypadku niezacommitowanych zmian w folderze zmiany. Wszystko inne (niekompletny Postęp, brak impl-review, status nie w `{implemented, impl_reviewed}`) jest wyświetlane jako ostrzeżenie, po którym następuje monit o potwierdzenie; użytkownik nadal może archiwizować.

Po archiwizacji, każda inna umiejętność 10x odmawia zapisu w `context/archive/<...>/` (każda chroniona umiejętność sprawdza rozwiązany prefiks ścieżki i przerywa działanie z ustalonym komunikatem). Zarchiwizowane foldery są domyślnie tylko do odczytu.

## Początkowa Odpowiedź

Po wywołaniu tej komendy:

1. **Sprawdź, czy podano jakiś argument**:
   - Jeśli podano argument, przeanalizuj go (patrz "Analiza Argumentów" poniżej) i przejdź do "Rozwiązanie".
   - Jeśli NIE podano argumentu, odpowiedz następującym komunikatem i **ZATRZYMAJ**:

```
I'll archive a completed change. Please provide a change-id (kebab-case slug) or path:

Examples:
  /10x-archive context-dir-restructure
  /10x-archive @context/changes/oauth-login/

You can list active changes with: `ls context/changes/`
```

   Następnie **poczekaj**, aż użytkownik poda argument.

## Analiza Argumentów

Weź pierwszy token oddzielony białymi znakami. Znormalizuj:

1. Usuń początkowe `@`, jeśli występuje.
2. Usuń końcowe `/`, jeśli występuje.
3. Jeśli wynik zawiera `/`, weź ostatni niepusty segment ścieżki.

Wynikiem jest `<change-id>`.

## Rozwiązanie

1. Rozwiąż `<change-id>` do `context/changes/<change-id>/`. Jeśli ta ścieżka nie istnieje:
   - Sprawdź `context/archive/` pod kątem katalogu, którego nazwa kończy się na `-<change-id>` — jeśli znaleziono, wydrukuj: `error: change "<change-id>" is already archived at <path>.` i ZATRZYMAJ.
   - W przeciwnym razie wydrukuj: `error: no change folder at context/changes/<change-id>/. Run `ls context/changes/` to list active changes.` i ZATRZYMAJ.
2. Odczytaj frontmatter `context/changes/<change-id>/change.md` (`status`, `created`).
   - Jeśli `status: archived`, wydrukuj: `error: change "<change-id>" is already archived in change.md but its folder is still under context/changes/. Inspect manually before re-running.` i ZATRZYMAJ.
   - Jeśli `created` brakuje lub nie jest w formacie `YYYY-MM-DD`, wydrukuj: `error: change.md.created is missing or malformed; cannot derive archive folder name.` i ZATRZYMAJ.

## Twarda odmowa: niezacommitowane zmiany

Dwa wstępne sprawdzenia. Każde niepowodzenie blokuje archiwizację.

**1. Niezacommitowane edycje w folderze zmiany.** Uruchom polecenie shella, aby sprawdzić `git status --porcelain "context/changes/<change-id>/"`.

Jeśli wynik jest niepusty, **zablokuj** i wydrukuj:

```
✗ Cannot archive: context/changes/<change-id>/ has uncommitted changes.

  <one line per offending path from git status --porcelain>

Commit or stash them first, then re-run /10x-archive.
```

**2. Istniejące już zmiany w stagingu.** Krok commitowania archiwum (patrz "Przenieś i oznacz" poniżej) łączy wszystko, co jest w stagingu w momencie commitowania. Jeśli użytkownik ma niezwiązane zmiany w stagingu z wcześniejszej pracy, trafiłyby one cicho do commita `chore(archive): close ...`. Uruchom polecenie shella, aby sprawdzić `git diff --cached --quiet`.

Jeśli kod wyjścia jest różny od zera, **zablokuj** i wydrukuj:

```
✗ Cannot archive: pre-existing staged changes would be bundled into the archive commit.

  <output of `git diff --cached --name-only`>

Either commit them first or `git reset` to unstage, then re-run /10x-archive.
```

Każde niepowodzenie → ZATRZYMAJ. Nie przechodź do monitu ostrzegawczego; są to twarde blokady.

Jeśli `git` jest niedostępny lub repozytorium nie jest repozytorium git, wydrukuj: `warning: not a git repository — skipping uncommitted-changes block.` i kontynuuj. (Archiwizacja nadal działa bez git; tracimy tylko zachowanie historii poprzez `git mv` i pomijamy krok commitowania archiwum.)

## Łagodne ostrzeżenia (nieblokujące)

Zbierz następujące ostrzeżenia, a następnie przedstaw je wszystkie naraz z jednym monitem o potwierdzenie.

1. **Sprawdzenie statusu**: odczytaj `change.md.status`. Jeśli NIE jest w `{implemented, impl_reviewed}`, dodaj do kolejki: `Status is "<status>"; expected "implemented" or "impl_reviewed".`
2. **Sprawdzenie oczekującego postępu**: przeanalizuj sekcję `## Progress` pliku `context/changes/<change-id>/plan.md` (jeśli `plan.md` istnieje). Dla każdego bloku `### Phase N:`, zidentyfikuj jego podsekcje `#### Automated` i `#### Manual` i policz wiersze `- [ ]` pod każdą z nich oddzielnie. Niech `<X>` = całkowita liczba oczekujących automatycznych zadań we wszystkich fazach, `<Y>` = całkowita liczba oczekujących ręcznych zadań we wszystkich fazach, `<N>` = `<X> + <Y>`.

   - **Jeśli plan używa podsekcji Auto/Manual** (dowolny blok `### Phase N:` zawiera nagłówek `#### Automated` lub `#### Manual`) i `<N> > 0`, dodaj do kolejki: `<N> Progress items still pending (<X> automated, <Y> manual): <comma-separated list of "N.M <title>" tokens, truncated to 5 with "…" if longer>.` Uporządkuj połączoną listę tokenów najpierw według elementów automatycznych (w kolejności dokumentu), a następnie według elementów ręcznych (w kolejności dokumentu); limit obcięcia do 5 dotyczy połączonej listy.
   - **Starsze rozwiązanie zastępcze**: jeśli żaden blok `### Phase N:` w Progress nie zawiera nagłówka `#### Automated` ani `#### Manual`, wróć do oryginalnego zachowania — policz wiersze `- [ ]` pod podnagłówkami `### Phase`; jeśli jakieś pozostały, dodaj do kolejki: `<N> Progress items still pending: <comma-separated list of "N.M <title>" tokens, truncated to 5 with "…" if longer>.` (bez rozbicia w nawiasach). Zachowuje to zerową zmianę zachowania dla planów utworzonych przed workflow-v2.
   - Jeśli `plan.md` brakuje, dodaj do kolejki: `No plan.md found in change folder.` i pomiń liczenie postępu.
3. **Sprawdzenie brakującego impl-review**: przeszukaj `context/changes/<change-id>/reviews/impl-review*.md`. Jeśli nic nie pasuje, dodaj do kolejki: `No impl-review found at reviews/impl-review*.md.`
4. **Sprawdzenie brakującego SHA**: przeanalizuj sekcję `## Progress` pliku `plan.md` (jeśli istnieje). Policz wiersze `- [x]`, których linia NIE kończy się na ` — <sha>`, gdzie `<sha>` to 7+ znaków szesnastkowych (tj. wyrażenie regularne ` — [0-9a-f]{7,}$` nie pasuje). Jeśli liczba jest różna od zera, dodaj do kolejki: `<N> Progress rows missing SHA suffix: <comma-separated "N.M <title>" tokens, truncated to 5 with "…" if longer>.` Wiersze bez SHA są uzasadnione dla faz z pustym diffem i dla planów, które zostały ukończone przed wprowadzeniem kontraktu SHA — jest to łagodny sygnał, a nie wada. Pomiń cicho, jeśli `plan.md` brakuje (sprawdzenie oczekującego postępu już to obejmowało).

Jeśli co najmniej jedno ostrzeżenie zostało dodane do kolejki, wydrukuj:

```
⚠ /10x-archive warnings for <change-id>:

  - <warning 1>
  - <warning 2>
  - <warning 3>
```

Następnie zapytaj użytkownika:
- pytanie: `Archive "<change-id>" anyway?`
  nagłówek: `Archive`
  opcje:
  - etykieta: `Continue archiving`
    opis: `Move the folder to context/archive/ despite the warnings.`
  - etykieta: `Resume implementation`
    opis: `Don't archive. Suggest /10x-implement <change-id> next.`
  - etykieta: `Cancel`
    opis: `Don't archive. Exit cleanly without further action.`
  multiSelect: false

**Wskazówka tylko dla ręcznych zadań**: jeśli powyższe sprawdzenie oczekującego postępu dodało ostrzeżenie, którego rozbicie było dokładnie `0 automated, <Y> manual` z `<Y> ≥ 1`, dodaj ` (Recommended)` do etykiety `Continue archiving`, aby monit wyraźnie zachęcał do archiwizacji — ręczne sprawdzenia są często celowo odkładane, a archiwizacja jest oczekiwaną ścieżką. We wszystkich innych przypadkach (mieszane oczekujące, tylko automatyczne, ostrzeżenie o starszym rozwiązaniu zastępczym lub brak ostrzeżenia o postępie), przedstaw etykiety dosłownie.

- **Kontynuuj archiwizację** → przejdź do "Przenieś i oznacz" poniżej.
- **Wznów implementację** → wydrukuj `→ /10x-implement <change-id>` i skopiuj to do schowka za pomocą `pbcopy 2>/dev/null || clip.exe 2>/dev/null || xclip -selection clipboard 2>/dev/null || true` (lub `Set-Clipboard` w PowerShell) (najlepszy wysiłek, wieloplatformowy). ZATRZYMAJ.
- **Anuluj** → wydrukuj `Cancelled. Folder unchanged.` i ZATRZYMAJ.

Jeśli nie ma ostrzeżeń w kolejce, pomiń monit i przejdź bezpośrednio.

## Przenieś i oznacz

1. **Oblicz miejsce docelowe archiwum**:
   - `CREATED=$(awk '/^created:/ {print $2; exit}' context/changes/<change-id>/change.md)` (prefiks daty, np. `2026-04-29`).
   - `DEST="context/archive/${CREATED}-<change-id>"`.
   - Jeśli `$DEST` już istnieje, wydrukuj: `error: archive destination "<DEST>" already exists. Inspect manually.` i ZATRZYMAJ.

2. **Oznacz `change.md`** (na miejscu, przed przeniesieniem):
   - Ustaw `status: archived`.
   - Ustaw `archived_at: <ISO-8601 datetime, today, UTC>` — wygenerowane przez `date -u +"%Y-%m-%dT%H:%M:%SZ"`.
   - Ustaw `updated: <today as YYYY-MM-DD>`.
   - Użyj operacji edycji pliku, aby zaktualizować każdą z trzech linii frontmatter. NIE dotykaj żadnych innych pól; w szczególności pozostaw `created` i `change_id` bez zmian.

3. **Przenieś folder**:
   - Preferuj `git mv "context/changes/<change-id>" "$DEST"`, aby historia była zachowana.
   - Jeśli `git mv` zawiedzie (nie jest to repozytorium git, lub git odmawia z jakiegoś powodu), wróć do `mkdir -p context/archive`, a następnie `mv "context/changes/<change-id>" "$DEST"`. Wydrukuj ostrzeżenie, jeśli użyto rozwiązania zastępczego.
   - Potwierdź po przeniesieniu: `[ -d "$DEST" ] && [ ! -d "context/changes/<change-id>" ]`. Jeśli którekolwiek sprawdzenie zawiedzie, wydrukuj diagnostykę i ZATRZYMAJ.

4. **Przygotuj znacznik do zmiany nazwy.** Operacja edycji pliku w kroku 2 zmodyfikowała `change.md` w drzewie roboczym, ale `git mv` tylko przygotowuje zmianę nazwy z zawartością pliku z HEAD. Uruchom `git add "$DEST/change.md"`, aby znacznik frontmatter znalazł się w tym samym commicie co zmiana nazwy.

5. **Zamknij pasujący element roadmapy.** Uruchom to przy **każdej** archiwizacji — wyszukiwanie roadmapy jest obowiązkowe. "Najlepszy wysiłek" dotyczy tylko *edycji*: brakująca roadmapa lub nieznaleziony cel edycji jest pomijany cicho i nigdy nie blokuje, nie cofa ani nie monituje o archiwizację. NIE oznacza to "założenia, że nie ma roadmapy i pominięcia sprawdzenia". Niepatrzenie jest wadą — potwierdzenie (krok 7) musi zgłosić wynik w obu przypadkach.

   1. Sprawdź istnienie pliku: `test -f context/foundation/roadmap.md`. Jeśli brak, pomiń ten krok cicho.
   2. Zapisz, czy plik jest już brudny: `ROADMAP_PREDIRTY=$(git status --porcelain context/foundation/roadmap.md 2>/dev/null)`. (Używane w podkroku 7 do podjęcia decyzji, czy przygotować go do commita archiwum.)
   3. Odczytaj `context/foundation/roadmap.md`. Poszukaj `<change-id>` użytego jako `Change ID`:
      - w tabeli `## At a glance` — wiersz, którego komórka w kolumnie **Change ID** jest dokładnie równa `<change-id>`;
      - oraz w treściach `## Foundations` / `## Slices` — blok `### <ID>: …`, który zawiera linię `- **Change ID:** <change-id>`.

      `<ID>` to lokalny identyfikator tego elementu w roadmapie (`F-NN` lub `S-NN`); `<Outcome>` to tekst jego linii `- **Outcome:**` (zachowaj początkowe `(foundation) ` jeśli występuje).
   4. **Brak dopasowania** → wydrukuj `ℹ context/foundation/roadmap.md has no item with Change ID "<change-id>" — roadmap left untouched.` i pomiń resztę tego kroku. Dopasowanie jest tylko dokładnym ciągiem; fragment roadmapy może generować kilka zmian, więc bliskie dopasowanie jest celowo *nie* zamykane.
   5. **Znaleziono dopasowanie** → zastosuj trzy poniższe edycje za pomocą operacji edycji pliku. Każda jest niezależna i stanowi najlepszy wysiłek: jeśli cel nie znajduje się tam, gdzie umieszcza go szablon `/10x-roadmap` (ręcznie edytowana roadmapa, starszy format), pomiń tę podedycję, kontynuuj i zanotuj, co zostało pominięte — nigdy nie przerywaj archiwizacji z powodu kształtu roadmapy. Dotykaj tylko pól wymienionych tutaj; pozostaw `Outcome`, `Prerequisites`, `Parallel with`, `Risk` itp. bez zmian.
      1. **`## At a glance`** — w dopasowanym wierszu tabeli ustaw komórkę w kolumnie **Status** na `done`.
      2. **Treść elementu** — w bloku `### <ID>: …` przepisz linię `- **Status:**` na `- **Status:** done`.
      3. **Sekcja `## Done`** — dodaj jeden punkt pod nagłówkiem `## Done`, w formacie udokumentowanym dla tej sekcji:

         ```
         - **<ID>: <Outcome>** — Archived <today> → `context/archive/<CREATED>-<change-id>/`. Lesson: —.
         ```

         `<today>` to `date -u +%F` (`YYYY-MM-DD`); `<CREATED>` to wartość obliczona w kroku 1 "Oblicz miejsce docelowe archiwum". Jeśli roadmapa nie ma nagłówka `## Done`, dodaj nagłówek i ten punkt na końcu pliku.
   6. Zaktualizuj frontmatter roadmapy: ustaw `updated: <today as YYYY-MM-DD>`. Pozostaw wszystkie inne klucze (`created`, `version`, `status`, `prd_version`, `main_goal`, `top_blocker`, …) bez zmian. Jeśli plik nie ma frontmatter YAML, pomiń ten podkrok.
   7. **Przygotuj to do commita archiwum** — tylko jeśli `git` jest dostępny **i** `ROADMAP_PREDIRTY` (podkrok 2) był pusty. Następnie uruchom `git add context/foundation/roadmap.md`, aby zamknięcie roadmapy znalazło się w tym samym commicie co zmiana nazwy + znacznik. Jeśli `ROADMAP_PREDIRTY` był niepusty, plik miał już niezacommitowane zmiany; pozostaw zamknięcie roadmapy w drzewie roboczym i wydrukuj `⚠ context/foundation/roadmap.md had pre-existing uncommitted changes — closed roadmap item <ID> in the working tree but did NOT stage it. Commit it yourself.` Jeśli `git` jest niedostępny, edycja pozostaje w drzewie roboczym (wstępne sprawdzenie już ostrzegało).
   8. Zapamiętaj `<ID>` i `<Outcome>` dla danych wyjściowych potwierdzenia.

6. **Zacommituj archiwum.** Utwórz jeden commit:

   ```bash
   git commit -m "$(cat <<'EOF'
   chore(archive): close <change-id>
   EOF
   )"
   ```

   Bez treści — temat jest mechaniczny, a diff (zmiana nazwy + znacznik frontmatter, plus zamknięcie roadmapy, gdy pasuje) jest oczywisty. Nigdy nie przekazuj flag `--no-verify` ani flag omijających podpisywanie. Jeśli hak pre-commit zawiedzie, napraw podstawowy problem i utwórz NOWY commit.

   Pomiń ten krok całkowicie, jeśli `git` jest niedostępny lub repozytorium nie jest repozytorium git (wstępne sprawdzenie już ostrzegało).

7. **Wydrukuj potwierdzenie**:

```
✓ Archived <change-id>
  context/changes/<change-id>/  →  <DEST>/

change.md updated:
  status:       archived
  archived_at:  <ISO datetime>
  updated:      <today>

roadmap.md:     closed <ID> "<Outcome>"  →  Status: done, entry added to ## Done    ← if matched; else print: no item with Change ID "<change-id>" — checked, left untouched. Always print one of the two; it proves the lookup ran.

Committed as: <short SHA> chore(archive): close <change-id>

The folder is now read-only by convention. To start a new change: /10x-new <new-id>
```

## Obsługa błędów

- Każdy nieoczekiwany błąd systemu plików podczas przenoszenia pozostawia folder źródłowy na miejscu — przygotowane edycje `change.md` lądują przed przeniesieniem, więc w przypadku częściowej awarii użytkownik widzi `status: archived` w `context/changes/<change-id>/change.md`, ale folder nadal znajduje się w `context/changes/`. `/10x-status` zgłosi to jako ostrzeżenie `status drift: archived in wrong folder`. Ponowne uruchomienie `/10x-archive` jest bezpieczne: sprawdzenie rozwiązania na początku wykryje `status: archived` i poprosi użytkownika o ręczne sprawdzenie.
- NIE próbuj wycofywać zmian — edycje change.md oznaczają intencję, a częściowy stan można odzyskać ręcznie.
- Krok zamykania roadmapy (krok 5 "Przenieś i oznacz") jest izolowany: każda awaria jest wychwytywana, odnotowywana w danych wyjściowych potwierdzenia i pomijana. Nigdy nie przerywa archiwizacji i nigdy nie wywołuje wycofania zmian. Częściowo zastosowaną edycję roadmapy można odzyskać ręcznie.

## Czego ta umiejętność NIE robi

- Nie dodaje SHA do elementów Progress — `/10x-implement` jest jedynym autorem sufiksu SHA na końcu fazy. Bramka archiwum wymusza obecność SHA jako sygnał tylko ostrzegawczy (patrz sprawdzenie łagodnego ostrzeżenia 4); nigdy nie przepisuje wiersza bez SHA.
- Nie uruchamia `pnpm test` / `pnpm build` / `pnpm ci:local` jako bramki — bramka jest celowo łagodna, tylko ostrzegawcza.
- Nie wypycha. Commit archiwum ląduje lokalnie; `git push` jest decyzją użytkownika.
- Nie przepisuje roadmapy poza zamknięciem jednego dopasowanego elementu. Gdy `context/foundation/roadmap.md` ma element, którego `Change ID` jest równe zarchiwizowanemu `<change-id>`, ta umiejętność zmienia tylko `Status` tego elementu (komórka tabeli + linia treści `### <ID>:`), dodaje jeden punkt `## Done` i aktualizuje datę `updated:`. Nigdy nie zmienia kolejności fragmentów, nie przelicza grafu zależności, nie edytuje innych elementów ani nie tworzy roadmapy, która nie istnieje. Brak dopasowania (lub brak pliku roadmapy) → roadmapa pozostaje nietknięta.
- Nie zapisuje do `context/archive/<...>/` po przeniesieniu; zarchiwizowane foldery są domyślnie tylko do odczytu. Inne umiejętności 10x (`/10x-research`, `/10x-frame`, `/10x-plan`, `/10x-plan-review`, `/10x-implement`, `/10x-impl-review`, `/10x-tdd`, `/10x-goal-implement`) odmawiają, gdy rozwiązana ścieżka zaczyna się od `context/archive/`.
- Nie dearchiwizuje. Aby ponownie odwiedzić zarchiwizowaną zmianę, otwórz nową zmianę za pomocą `/10x-new` i odwołaj się do zarchiwizowanego folderu w celu uzyskania kontekstu.