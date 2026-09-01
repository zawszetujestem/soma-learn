---
name: 10x-lesson
description: Capture a recurring rule or pattern into context/foundation/lessons.md. Use when you spot a class of bug or design pitfall worth surfacing for future reviews and implementations.
---

# /10x-lesson — Zapisz powtarzającą się regułę

Dołącz pojedynczy wpis do `context/foundation/lessons.md`, aby przyszłe uruchomienia `/10x-frame`, `/10x-research`, `/10x-plan`, `/10x-plan-review`, `/10x-implement` i `/10x-impl-review` odczytywały go jako wcześniejszy. Jest to proaktywny bliźniak opcji triage "Accept as recurring rule" w `/10x-impl-review` — wywołaj go w trakcie pracy, gdy zauważysz wzorzec wart uwagi, nie czekając na ustrukturyzowaną recenzję.

"Lekcja" to powtarzająca się reguła — nie jednorazowa poprawka błędu. Kryterium jest: "to zmieniłoby ramy lub poprawkę w przeszłych pracach i będzie się powtarzać". Jeśli jest to opis pojedynczego incydentu, to jest to niewłaściwa umiejętność.

## Początkowa odpowiedź

Gdy ta umiejętność zostanie wywołana:

1. **Jeśli opis swobodny został podany w wierszu** (np. `/10x-lesson feature flags should always have a kill date`), użyj go jako zalążka dla pola Rule i przejdź do wywiadu.
2. **Jeśli nic nie zostało podane**, odpowiedz:

```
Zapiszę powtarzającą się regułę w context/foundation/lessons.md.

Zadam cztery krótkie pytania, a następnie dodam wpis. Cztery pola to:
  1. Context — gdzie ta reguła ma zastosowanie (podsystem / faza / wzorzec pliku)
  2. Problem — co dzieje się źle bez tej reguły
  3. Rule — sama reguła, w jednym lub dwóch zdaniach
  4. Applies to — do których umiejętności ta reguła powinna być najbardziej brana pod uwagę (frame / plan / implement / review)

Następnie czekaj.
```

## Proces

### Krok 1: Wywiad

Poproś użytkownika o zebranie czterech pól. Możesz je zgrupować w jednej rundzie czterech swobodnych pytań (każdy zestaw opcji to po prostu `["I'll fill it in"]` — tzn. użytkownik wybiera "Other", aby wpisać odpowiedź) lub przeprowadzić cztery kolejne rundy. Obie formy są w porządku; celem jest, aby to użytkownik, a nie umiejętność, napisał treść.

Nic nie wypełniaj wstępnie. Użytkownik podaje każde pole. Jeśli w wywołaniu przekazano swobodny zamiar, wyświetl go jako sugestię obok monitu Rule — nie jako domyślny.

Cztery pola, z jednowierszowymi wskazówkami:

- **Context** — gdzie ta reguła ma zastosowanie? Podsystem / faza / wzorzec pliku. Bądź wystarczająco konkretny, aby przyszła umiejętność mogła dopasować wzorzec (np. "każda faza, która dodaje flagę funkcji", "badania nad systemami wielodostępnymi", a nie "wszędzie").
- **Problem** — co konkretnie dzieje się źle, jeśli reguła jest naruszona? Przytocz przeszły incydent lub powtarzający się kształt awarii. Jedno lub dwa zdania.
- **Rule** — sama reguła, w trybie rozkazującym ("Zawsze...", "Nigdy...", "Przed X, zrób Y"). Jedno lub dwa zdania. Czytelnik przyszłej recenzji powinien być w stanie wkleić to dosłownie do wniosku.
- **Applies to** — lista nazw umiejętności oddzielonych przecinkami, dla których ta reguła powinna być najbardziej brana pod uwagę: `frame`, `research`, `plan`, `plan-review`, `implement`, `impl-review`. Użyj `all`, jeśli reguła obejmuje cały cykl życia.

### Krok 2: Echo i potwierdzenie

Wyrenderuj proponowany wpis jako blok markdown i pokaż go użytkownikowi. Poproś użytkownika o potwierdzenie:

- question: "Dołączyć tę lekcję do `context/foundation/lessons.md`?"
  header: "Potwierdź"
  options:
  - label: "Dołącz"
    description: "Zapisz wpis tak, jak pokazano."
  - label: "Edytuj"
    description: "Pozwól mi poprawić jedno lub więcej pól przed zapisaniem."
  - label: "Anuluj"
    description: "Odrzuć — nic nie zapisuj."
    multiSelect: false

Proponowany kształt wpisu (jest to kanoniczny format wpisu lekcji):

```markdown
## <Tytuł reguły — krótkie, imperatywne wyrażenie, pochodzące z pola Rule>

- **Context**: <Pole Context>
- **Problem**: <Pole Problem>
- **Rule**: <Pole Rule>
- **Applies to**: <Pole Applies-to>
```

Nagłówek H2 JEST tytułem reguły. Utrzymuj go krótko — lista H2 to to, co przyszłe umiejętności skanują najpierw.

### Krok 3: Samodzielne uruchomienie i dołączenie

Jeśli plik `context/foundation/lessons.md` nie istnieje, utwórz go z tym kanonicznym 5-wierszowym nagłówkiem (osadzonym w wierszu — bez oddzielnego pliku szablonu; ten sam nagłówek jest używany przez gałąź triage "Accept as recurring rule" w `/10x-impl-review` i tutaj):

```
# Lessons Learned

> Rejestr tylko do dodawania powtarzających się reguł i wzorców. Odczytywany ponownie na początku przez /10x-frame, /10x-research, /10x-plan, /10x-plan-review, /10x-implement, /10x-impl-review.

```

Jeśli plik istnieje, pozostaw go bez zmian i dołącz na końcu. Nie zmieniaj kolejności, nie usuwaj duplikatów ani nie formatuj istniejących wpisów — plik jest tylko do dodawania.

Użyj narzędzia do edycji plików (lub narzędzia do zapisu plików w przypadku uruchomienia) do wprowadzenia zmiany. Po dołączeniu, ponownie odczytaj plik i potwierdź, że nowy H2 jest ostatnią sekcją.

### Krok 4: Wynik echa

Wydrukuj ścieżkę i tytuł reguły:

```
Dołączono do context/foundation/lessons.md:
  ## <Tytuł reguły>
```

Stop. Nie łącz się z innymi umiejętnościami. Użytkownik wywołał to dla pojedynczego przechwycenia; uszanuj zakres.

## Uwagi

- **Tylko do dodawania.** Nigdy nie edytuj ani nie usuwaj istniejących lekcji za pomocą tej umiejętności. Jeśli reguła wymaga rewizji, użytkownik otwiera plik i edytuje go bezpośrednio — to celowe tarcie, ponieważ bezmyślne przepisywanie powtarzających się reguł jest trybem awarii, któremu ta konwencja zapobiega.
- **Jeden wpis na wywołanie.** Jeśli użytkownik ma wiele lekcji do przechwycenia, wywołuje umiejętność wielokrotnie. Grupowe wprowadzanie zachęca do wpisów niedokończonych.
- **Samodzielne uruchomienie jest domyślne.** Nie mów użytkownikowi "najpierw uruchom /10x-init" — utwórz plik z kanonicznym nagłówkiem przy pierwszym użyciu. (`/10x-init` tworzy szkielet katalogu `/context`; ta umiejętność zarządza `lessons.md` od początku do końca.)
- **Nic nie wypełniaj wstępnie.** W przeciwieństwie do gałęzi triage `/10x-impl-review` (która wstępnie wypełnia Context i Problem z wyniku), ta proaktywna umiejętność oczekuje, że użytkownik wykona pisanie. Taka jest cena przechwytywania reguł poza ustrukturyzowaną recenzją.
