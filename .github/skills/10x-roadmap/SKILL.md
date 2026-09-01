---
name: 10x-roadmap
description: >
  Milestone-driven roadmap manager: open an outcome-scoped milestone from
  source materials (primary: the PRD), decompose it into vertical end-to-end
  slices in context/foundation/roadmap.md, track the milestone as connected
  slices complete, close it when every slice is done, and loop into the next
  milestone. Use AFTER /10x-prd (and after the tech-stack selection /
  bootstrap step, when applicable). Trigger phrases: "write the roadmap",
  "generate roadmap", "create the roadmap from PRD", "stwórz roadmapę",
  "open a milestone", "close the milestone", "milestone status", "what
  should I build first", "what's next on the roadmap". Do NOT use for
  per-change planning — that's /10x-plan's job.
---

# Mapa drogowa: Zarządzanie mapą drogową oparte na kamieniach milowych dla context/foundation/roadmap.md

Ta umiejętność jest pomostem między **produktem** (PRD lub innymi materiałami źródłowymi) a **planowaniem poszczególnych zmian** (`/10x-plan`) i działa jako **kierownik projektu na poziomie kamieni milowych**. Praca jest grupowana w **kamienie milowe**: partia połączonych fragmentów o określonym wyniku, dokładnie jeden otwarty w danym momencie, śledzony w samym `roadmap.md`. Każde wywołanie najpierw rozdziela się na stan kamienia milowego (Krok 0): jeśli żaden kamień milowy nie jest otwarty, umiejętność prosi o materiały źródłowe i otwiera jeden; jeśli kamień milowy jest aktywny, zgłasza status i rekomenduje następny ruch; jeśli wszystkie fragmenty są gotowe, zamyka kamień milowy i przechodzi do otwierania następnego — z zaktualizowanych materiałów źródłowych lub z własnego opisu użytkownika.

W ramach otwartego kamienia milowego zadanie dekompozycji umiejętności pozostaje niezmienione: odczytaj materiały źródłowe, automatycznie zbadaj bazę kodu, **wywnioskuj decydującą propozycję sekwencjonowania** (główny cel, fragment gwiazdy północnej, obszary inwestycji, główny bloker), ujawnij tylko prawdziwą niepewność, której artefakty nie mogą rozwiązać, i wygeneruj `context/foundation/roadmap.md`, który zawiera pionowe, widoczne dla użytkownika fragmenty w kolejności zależności — gotowe do przekazania do `/10x-plan <change-id>`.

## Warstwa kamieni milowych — maszyna stanów znajduje się w pliku referencyjnym

Cykl życia kamienia milowego (stany, zasady wykrywania, przejścia, niezmienniki) jest określony w **`references/milestone-state.md`**, celowo pominięty w tym pliku. **Czytaj go tylko wtedy, gdy wywołanie działa na poziomie kamienia milowego** — pierwsze uruchomienie, wznowienie/sprawdzenie statusu, zamknięcie kamienia milowego lub otwarcie następnego kamienia milowego. Czysta ponowna dekompozycja już otwartego kamienia milowego nie wymaga tego.

Dwa fakty potrzebne przed podjęciem decyzji o załadowaniu:

- Stan jest **wywodzony wyłącznie z `roadmap.md`** (frontmatter `milestone_id` / `milestone_status` + statusy elementów). Nie ma pliku stanu bocznego.
- Identyfikatory kamieni milowych to `M-<seq>` z `milestone_id` w formacie kebab-case; kamienie milowe są **określone wynikiem, nigdy nie są ograniczone czasowo** — kamień milowy zamyka się, gdy jego fragmenty są `done`, a nie gdy upłynie data. To nie jest sprint.

**Postawa: opiniotwórczy rekomendator, oszczędny wywiad.** Umiejętność działa jak doświadczony lider techniczny, który przeczytał PRD, zbadał bazę kodu i przedstawił rekomendację — ale który nadal pyta człowieka o 2-3 kluczowe decyzje przed zobowiązaniem. Zasady wywiadu (limit 3 pytań, silne rekomendacje, brak słomianych kukieł, wyjątek niestandardowego MVP) są określone raz, w Kroku 5.

Jest to umiejętność **dekompozycji + sekwencjonowania**, a nie planowania niskiego poziomu. NIGDY nie wybiera frameworków, ścieżek plików, schematów, bibliotek ani szczegółów implementacji — te należą do `/10x-plan`. NIGDY nie przypisuje szacunków czasu, rozmiarów koszulek, punktów ani dat kalendarzowych — wykonanie agentowe jest nieliniowe, a szacunki budżetowane czasowo byłyby kłamstwem. Co ONA ROBI, to: nazywa fragmenty, sekwencjonuje je według zależności i określonego celu, ujawnia, co blokuje, i kieruje otwarte pytania tam, gdzie można je rozwiązać.

Umiejętność jest **AI-natywna** na cztery konkretne sposoby: (1) wyraża kolejność jako graf zależności, a nie kalendarz; (2) oznacza fragmenty, które mogą być wykonywane równolegle przez oddzielne uruchomienia agentów; (3) wypycha „blokujące niewiadome” tam, gdzie człowiek może je rozwiązać, zamiast pozwalać im po cichu wślizgnąć się do implementacji; (4) inwentaryzuje istniejącą bazę kodu za pomocą subagentów, zamiast pytać użytkownika, co już jest na miejscu.

## Kiedy używać, kiedy pominąć

**Użyj, gdy**: użytkownik chce otworzyć kamień milowy i go zdekomponować (typowy pierwszy materiał źródłowy: nietrywialny `context/foundation/prd.md` z wypełnionymi FR i historyjkami użytkownika), sprawdzić status kamienia milowego/mapy drogowej lub zamknąć ukończony kamień milowy i otworzyć następny. Typowe wyzwalacze: właśnie zakończono `/10x-prd`, właśnie zakończono bootstrap, powrót do projektu i pytanie „co dalej”, lub wszystkie fragmenty mapy drogowej zostały zarchiwizowane.

**Pomiń, gdy**: PRD jest puste (duże `## Open Questions`, `# TODO: domain rule`) — najpierw wskaż `/10x-prd` (lub nadrzędne `/10x-shape`); mapa drogowa z pustego PRD odziedziczy pustkę. Pomiń również, gdy użytkownik chce szczegółowo zaplanować *pojedynczą* zmianę — to zadanie `/10x-plan`. Mapa drogowa jest liczbą mnogą; plan jest liczbą pojedynczą.

## Związek z innymi umiejętnościami

- `/10x-shape` i `/10x-prd` — tworzą nadrzędne PRD, które ta umiejętność konsumuje. Jeśli `shape-notes.md` zawiera blok `## Forward: technical-roadmap` (gdzie shape parkuje zawartość przeznaczoną dla mapy drogowej), ta umiejętność go podnosi.
- `10x-tech-stack-selector` — działa między `/10x-prd` a tą umiejętnością w łańcuchu bootstrap. Jeśli `context/foundation/tech-stack.md` istnieje, ta umiejętność odczytuje go jako dane wejściowe do wyprowadzenia `## Foundations` (szkielet uwierzytelniania, szkielet wdrożenia, obserwowalność — wszystko, co implikował krok wyboru stosu technologicznego) i do skrócenia sond bazowych dla już zadeklarowanych warstw.
- `/10x-plan` — konsument niższego szczebla. Użytkownik wybiera element mapy drogowej i wywołuje `/10x-plan <change-id>`; ta umiejętność tworzy folder zmiany, tworzy szczegółowy plan i zmienia `Status` dopasowanego elementu mapy drogowej na `planning`. Mapa drogowa NIE tworzy wstępnie folderów zmian; jeden fragment może wygenerować wiele zmian, gdy `/10x-plan` odkryje, że element jest nadal zbyt szeroki (tylko pierwszy posuwa status wspólnego elementu).
- `/10x-implement` (i jego autonomiczny odpowiednik `/10x-goal-implement`) — dalej w dół. Kiedy implementacja *rozpoczyna się* dla zmiany, której `Change ID` pasuje do elementu mapy drogowej, zmienia `Status` tego elementu na `in-progress` — odpowiednik otwartej pracy do zmiany `done` przez `/10x-archive`. Ta umiejętność sama w sobie nadal emituje tylko `proposed` / `ready` / `blocked` podczas generowania; pośrednie stany cyklu życia (`planning`, `in-progress`) są teraz zapisywane w dół, gdy zmiana przechodzi przez plan → implementację. Każda zmiana w dół pasuje do `Change ID`, jest najlepszym wysiłkiem (brak dopasowania to ciche pominięcie) i jest tylko do przodu (nigdy nie cofa bardziej zaawansowanego statusu).
- `/10x-archive` — zamyka pętlę na końcu. Kiedy zmiana, której `Change ID` pasuje do elementu mapy drogowej, zostanie zarchiwizowana, `/10x-archive` zmienia `Status` tego elementu na `done` (w `## At a glance` i w bloku treści elementu) i dodaje wpis do `## Done`. Ta umiejętność nigdy nie wypełnia wstępnie `## Done`; `/10x-archive` jest jej jedynym autorem.
- `/10x-frame`, `/10x-research` — ortogonalne. Działają na pojedynczej zmianie, a nie na mapie drogowej.

## Początkowa odpowiedź — Krok 0: rozdzielenie stanu kamienia milowego

Po wywołaniu tej umiejętności, rozdziel PRZED wykonaniem jakiejkolwiek pracy dekompozycyjnej:

1. **Sprawdź stan kamienia milowego** (tanio, nie potrzebny jeszcze plik referencyjny):

   ```bash
   test -f context/foundation/roadmap.md && head -20 context/foundation/roadmap.md
   ```

   - Brak pliku lub obecny bez klucza frontmatter `milestone_id` → **brak otwartego kamienia milowego** (pierwsze uruchomienie lub starsza mapa drogowa).
   - `milestone_status: open` → kamień milowy aktywny lub gotowy do zamknięcia (zależy od statusów elementów — przeczytaj cały plik, aby to stwierdzić).
   - `milestone_status: done` → poprzedni kamień milowy zamknięty, następny jeszcze nie otwarty.

2. **O ile kamień milowy nie jest otwarty z niedokończonymi elementami, a użytkownik wyraźnie nie poprosił o świeżą dekompozycję** — tj. przy pierwszym uruchomieniu, adopcji starszej wersji, sprawdzeniu statusu/następnego ruchu, zamknięciu lub otwarciu następnego kamienia milowego — **przeczytaj teraz `references/milestone-state.md`** i postępuj zgodnie z pasującym przejściem. Przejścia delegują z powrotem do Kroków 1–10 poniżej, gdzie potrzebna jest dekompozycja.

3. **Jeśli kamień milowy jest otwarty, a użytkownik poprosił o ponowne wygenerowanie dekompozycji** (lub przekazał argument ścieżki źródłowej, np. `/10x-roadmap @path/to/prd.md`), pomiń plik referencyjny: przechwyć ścieżkę (usuń początkowe `@`), w przeciwnym razie domyślnie użyj `context/foundation/prd.md` i przejdź bezpośrednio do Kroku 1. Regeneracja zachowuje frontmatter kamienia milowego i `## Milestone History` dosłownie i przenosi statusy elementów za pomocą `Change ID` (tylko do przodu).

## Interaktywne monity — niezależne od hosta

Zawsze, gdy procedura mówi „zapytaj użytkownika”, użyj dowolnego ustrukturyzowanego narzędzia do interaktywnych pytań, które udostępnia agent hosta (na innych hostach, dowolnego narzędzia, które zadaje użytkownikowi pytanie z oznaczonymi opcjami). Jeśli żadne nie jest dostępne, wróć do zwykłej konwersacyjnej wiadomości z listą oznaczonych opcji — nie blokuj procedury. Podaj, które narzędzie wybrałeś (lub że wróciłeś do zwykłego czatu) za pierwszym razem, gdy zapytasz, aby użytkownik mógł cię poprawić.

Bloki pytań pojawiają się w Krokach 1, 3, 4, 5 i 9 oraz w przejściach kamieni milowych w `references/milestone-state.md` — krótkie, ustrukturyzowane wybory. Krok 5 zadaje każde pytanie jako własne ustrukturyzowane pytanie; jego podsumowanie syntezy jest zwykłym markdownem (bez dodatkowego pytania).

## Równoległe badania bazowe — niezależne od hosta

Zawsze, gdy procedura mówi o użyciu subagentów lub uruchomieniu równoległych sond, użyj dowolnego narzędzia do badań w tle / tworzenia zadań, które udostępnia host (na innych hostach, dowolnego narzędzia, które tworzy izolowanego agenta i zwraca podsumowanie), rozsyłając sondy w jednym wywołaniu wsadowym. Jeśli żadne nie istnieje, uruchom te same sondy sekwencyjnie w głównym kontekście. Obie ścieżki muszą zwrócić ten sam kształt podsumowania bazowego z dowodami plików.

## Proces

### Krok 1: Uzyskaj i przeczytaj materiały źródłowe

**Podczas otwierania kamienia milowego** (pierwsze uruchomienie lub przejście do następnego kamienia milowego z `references/milestone-state.md`), zapytaj, z czego powinien być zbudowany kamień milowy — nie zakładaj, ale rekomenduj PRD:

Zapytaj użytkownika:
- question: "Jakie są materiały źródłowe dla tego kamienia milowego?"
  header: "Źródła"
  options:
  - label: "PRD w context/foundation/prd.md (Zalecane)"
    description: "Standardowa ścieżka: kamień milowy określony na podstawie FR i historyjek użytkownika z PRD. Uruchom /10x-prd najpierw, jeśli jeszcze nie istnieje."
  - label: "Inne dokumenty — podam ścieżki"
    description: "Specyfikacje, briefy, dokumenty badawcze. Fragmenty będą śledzić ich zawartość, zapisane jako kotwice zakresu w karcie kamienia milowego."
  - label: "Sam opiszę kamień milowy"
    description: "Swobodny opis, bez dokumentu. Destyluję go do kotwic zakresu MS-NN, do których śledzą fragmenty."
  - label: "Anuluj"
    description: "Wyjdź bez zmian."
  multiSelect: false

Dla kolejnych kamieni milowych, `references/milestone-state.md` doprecyzowuje te opcje (zaktualizowane PRD vs następna transza tego samego PRD). Gdy wywołanie zawierało jawny argument ścieżki, pomiń pytanie i użyj tej ścieżki.

Rozwiąż i zweryfikuj ścieżki wejściowe:

```bash
test -f "<resolved-path>"
```

Jeśli plik istnieje, **przeczytaj go W CAŁOŚCI** (bez `limit`/`offset`). Jeśli użytkownik wybrał samodzielny opis, przechwyć jego opis dosłownie — staje się on kartą `## Milestone` z numerowanymi kotwicami zakresu `MS-NN`, a sprawdzenie gotowości PRD z Kroku 3 zostaje zastąpione sprawdzeniem kotwicy (< 2 destylowalnych kotwic `MS-NN` → poproś użytkownika o doprecyzowanie opisu, a następnie ZATRZYMAJ, jeśli nie może).

Jeśli nazwany plik nie istnieje, zapytaj za pomocą wybranego interaktywnego narzędzia do pytań:

Zapytaj użytkownika:
- question: "Nie znaleziono źródła pod adresem `<resolved-path>`. Jak chcesz postąpić?"
  header: "Wejście?"
  options:
  - label: "Najpierw uruchom /10x-prd (Zalecane)"
    description: "Zatrzymaj się tutaj. Uruchom /10x-prd, aby utworzyć prd.md, a następnie ponownie wywołaj /10x-roadmap."
  - label: "Podaj inną ścieżkę"
    description: "Poczekam, aż podasz mi ścieżkę."
  - label: "Anuluj"
    description: "Wyjdź bez zmian."
  multiSelect: false

W przypadku „Najpierw uruchom /10x-prd”: wydrukuj wiadomość przekierowania i ZATRZYMAJ. W przypadku „Podaj inną ścieżkę”: poczekaj na dane wejściowe użytkownika. W przypadku „Anuluj”: ZATRZYMAJ.

### Krok 2: Odczytaj dodatkowe dane wejściowe (najlepszy wysiłek)

Przeczytaj je, jeśli istnieją; w przeciwnym razie zanotuj ich brak i kontynuuj:

- `context/foundation/shape-notes.md` — poszukaj sekcji `## Forward: technical-roadmap`. Jeśli jest obecna, podnieś jej punkty dosłownie jako kandydatów na dane wejściowe mapy drogowej (użytkownik już je tam umieścił podczas kształtowania).
- `context/foundation/tech-stack.md` — informuje sekcję `## Foundations` ORAZ skraca sondy bazowe (warstwa już zadeklarowana tutaj jest zgłaszana jako „zgodnie z tech-stack.md” bez ponownego sondowania).
- `context/foundation/roadmap.md` — jeśli już istnieje, zachowaj go na Krok 9 (obsługa kolizji). NIE modyfikuj go jeszcze.
- `context/foundation/lessons.md` — jeśli jest obecny, przeskanuj w poszukiwaniu wszelkich reguł dotyczących kolejności lub gotowości (np. „zawsze wysyłaj najryzykowniejszy fragment jako pierwszy”). Traktuj jako priorytety, a nie jako dogmat.

### Krok 3: Sprawdzenie gotowości PRD

Przed generowaniem, oceń PRD na podstawie heurystyki gotowości 0–4. Każdy sygnał wnosi 1 punkt:

1. **Wizja i opis problemu są nietrywialne** — sekcja istnieje, zawiera ≥ 2 zdania, NIE zawiera `# TODO`.
2. **Co najmniej jedna wypełniona historyjka użytkownika** — istnieje nagłówek `### US-NN:` z blokiem Given/When/Then pod nim (nie `# TODO`).
3. **Co najmniej jeden FR typu `must-have`** — istnieje linia pasująca do `^- FR-\d{3}: .* (P|p)riority: must-have$`.
4. **Logika biznesowa wypełniona** — pierwsza niepusta linia sekcji `## Business Logic` to zdanie deklaratywne (nie `# TODO: domain rule`).

Udokumentuj heurystykę wyraźnie w rozmowie:

```
Sprawdzenie gotowości PRD (heurystyka, 4 sygnały, po 1 punkcie):
  [✓|✗] Wizja i opis problemu nietrywialne
  [✓|✗] ≥ 1 wypełniona historyjka użytkownika
  [✓|✗] ≥ 1 FR typu must-have
  [✓|✗] Logika biznesowa wypełniona

  Wynik: <N>/4
  Otwarte pytania w PRD: <liczba>
```

**Wynik ≥ 3**: PRD jest gotowe do mapy drogowej; przejdź do Kroku 4.

**Wynik < 3**: wyraźnie ostrzeż. Nazwij, czego brakuje i dlaczego jest to ważne dla mapy drogowej (NIE ogólne „Twoje PRD jest słabe”):

```
To PRD uzyskało <N>/4 w heurystyce gotowości mapy drogowej. Brakujące sygnały:

  - <nazwa sygnału>: <jednolinijkowa konsekwencja dla mapy drogowej>
  - ...

Mapa drogowa wygenerowana z pustego PRD będzie miała wiele fragmentów oznaczonych statusem:
zablokowane, z pierwszą niewiadomą będącą luką w PRD. Jest to prawidłowy stan pośredni
— mapa drogowa ujawnia, co blokuje — ale jeśli masz czas, aby najpierw dopracować
PRD, wynikowa mapa drogowa będzie znacznie bardziej użyteczna.
```

Następnie zapytaj za pomocą wybranego interaktywnego narzędzia do pytań:

Zapytaj użytkownika:
- question: "Jak chcesz postąpić?"
  header: "Cienkie PRD"
  options:
  - label: "Najpierw dopracuj PRD (Zalecane)"
    description: "Zatrzymaj się tutaj. Rozwiąż otwarte pytania / TODO w PRD, a następnie ponownie wywołaj /10x-roadmap."
  - label: "Kontynuuj mimo to"
    description: "Generuj z tego, co jest. Puste obszary pojawią się jako zablokowane fragmenty z luką w PRD jako ich niewiadomą."
  - label: "Anuluj"
    description: "Wyjdź bez zmian."
  multiSelect: false

W przypadku „Najpierw dopracuj PRD”: wydrukuj przekierowanie i ZATRZYMAJ. W przypadku „Kontynuuj mimo to”: kontynuuj z zapisanym wynikiem, aby Krok 6 mógł oznaczyć słabe obszary.

### Krok 4: Automatyczne badanie bazowe

Ocena „co już jest na miejscu” nie powinna spoczywać na użytkowniku — baza kodu jest źródłem prawdy. Użyj wybranego narzędzia do badań w tle / tworzenia zadań, jeśli jest dostępne, aby równolegle zinwentaryzować każdą warstwę. Jeśli takie narzędzie nie istnieje, uruchom te same sondy sekwencyjnie w głównym kontekście. Każda sonda zwraca jednozdaniowy werdykt: **obecny** (z dowodami plików), **nieobecny** lub **częściowy** (szkielet istnieje, ale nie jest podłączony). Następnie przedstaw inwentaryzację do potwierdzenia przez użytkownika, zanim zostanie ona przekazana do Foundations.

**Warstwy do zbadania** (pomiń warstwę, jeśli `tech-stack.md` już nazywa wybór tej warstwy — zgłoś „zgodnie z tech-stack.md: <wybór>” zamiast sondowania):

| Warstwa | Czego szuka sonda |
|---|---|
| Frontend | Framework UI, narzędzia do budowania, routing, biblioteki komponentów — zależności `package.json`, pliki konfiguracyjne frameworka |
| Backend / API | Framework serwera, trasy API, obsługi żądań — punkty wejścia, pliki tras, kontrolery |
| Dane | Sterownik DB, ORM/konstruktor zapytań, narzędzia do schematów/migracji, dane początkowe — pliki schematów, katalogi migracji |
| Uwierzytelnianie | Integracja dostawcy uwierzytelniania, obsługa sesji/tokenów, middleware uwierzytelniania — konfiguracja uwierzytelniania, pliki middleware |
| Wdrożenie / infrastruktura | Cel hostingu, konfiguracja kontenera, przepływy CI/CD, infrastruktura jako kod — `Dockerfile`, `.github/workflows`, YAML wdrożenia |
| Obserwowalność | Biblioteka logowania, śledzenie błędów, metryki, pulpity nawigacyjne — importy sentry/datadog/otel, middleware logowania |

**Uruchom wszystkie sondy w jednym wywołaniu wsadowym, jeśli host to obsługuje.** Każdy monit jest krótki i samodzielny; delegowani agenci zwracają tylko jeden akapit każdy, więc główny kontekst pozostaje mały. Przykład dla uwierzytelniania:

> Zinwentaryzuj warstwę uwierzytelniania/tożsamości tej bazy kodu. Zgłoś w mniej niż 100 słowach: (1) czy istnieje integracja dostawcy uwierzytelniania? Nazwij ją. (2) Czy istnieją ścieżki kodu do wydawania lub weryfikacji sesji/tokenów? Podaj plik:linię. (3) Czy istnieje middleware uwierzytelniania na poziomie trasy? Podaj. Jeśli warstwa jest nieobecna, powiedz „nieobecna” — nie spekuluj. Nie sugeruj zmian. Nie pisz ani nie edytuj plików.

Dostosuj ten sam szablon dla każdej warstwy. Zawsze wymagaj: werdyktu obecny/nieobecny/częściowy, ≤ 100 słów, dowodów plików, gdy są obecne, bez spekulacji, bez edycji.

Po powrocie wszystkich sond, przedstaw użytkownikowi jednookranowe podsumowanie bazowe:

```
Baza kodu (automatycznie zbadana):

  Frontend:      <obecny | nieobecny | częściowy> — <jedna linia, ze wskaźnikiem pliku>
  Backend/API:   <…>
  Dane:          <…>
  Uwierzytelnianie:   <…>
  Wdrożenie/infra:  <…>
  Obserwowalność: <…>
```

Następnie potwierdź:

Zapytaj użytkownika:
- question: "Czy ta baza odpowiada Twojemu rozumieniu? Coś do poprawienia lub dodania, zanim zostanie uwzględnione w Foundations?"
  header: "Baza"
  options:
  - label: "Wygląda dobrze — kontynuuj"
    description: "Użyj tej bazy jako danych wejściowych dla Foundations i sekcji ## Baseline mapy drogowej."
  - label: "Popraw jedną lub więcej warstw — wyjaśnię"
    description: "Swobodna korekta. Ponownie zapiszę warstwę(y) przed kontynuowaniem."
  - label: "Dodaj coś, czego nie ma na liście"
    description: "Swobodna forma. Rzeczy, które sondy przeoczyły (zaplanowane, ale nie podłączone, szkielet z innego repozytorium itp.)."
  multiSelect: true

Zapisz potwierdzoną bazę. Bezpośrednio zasila Krok 6a (Foundations): warstwy **obecne** → Foundations je pomija; **nieobecne** lub **częściowe** → otwiera się slot Foundations. Zasila również sekcję `## Baseline` mapy drogowej dosłownie.

### Krok 5: Oszczędny wywiad — 2-3 pytania kotwiczne, każde z silną rekomendacją

PRD zawiera **produkt**. Baza (Krok 4) zawiera **to, co już istnieje**. Ten krok tworzy ramy mapy drogowej — `main_goal`, `north_star`, obszary inwestycji, `top_blocker` — poprzez ograniczony wywiad: maksymalnie **trzy pytania kotwiczne**, każde zawierające jedną silną **rekomendację** opartą na cytowanej linii artefaktu plus 1-2 alternatywy z jednolinijkowym uzasadnieniem „dlaczego to jest również rozsądne”. Użytkownik wybiera rekomendację, wybiera alternatywę lub swobodnie ją nadpisuje; obszary inwestycji są *wywodzone* z odpowiedzi, a nie zadawane. Jest to złoty środek między dwoma trybami awarii, przez które przeszła umiejętność: **ciche automatyczne ramowanie** (podejmowanie kluczowych decyzji bez ludzkiej bramki) i **nieograniczone odkrywanie** (pytanie o to, na co artefakty już odpowiadają). Jeśli `shape-notes.md` zawierał blok `## Forward: technical-roadmap`, włącz go do rekomendacji — nie wyciągaj ponownie treści, które użytkownik już tam umieścił. Jeśli kotwica jest nadal nierozstrzygnięta po osiągnięciu limitu, **podejmij decyzję** za pomocą rekomendacji, zapisz ją w frontmatterze z jednolinijkowym uzasadnieniem i kontynuuj — użytkownik może ją nadpisać w dowolnym momencie.

**5a. Wywnioskuj rekomendacje i alternatywy, które są faktycznie rozsądne.**

Dla każdej kotwicy poniżej, wywnioskuj *zarówno* rekomendację, JAK I alternatywy — oparte na konkretnych cytatach z frontmattera PRD / `## Vision` / `## Success Criteria` / `## NFRs` / `## Open Questions` / bazy / `tech-stack.md`. Alternatywa jest „rozsądna” tylko wtedy, gdy prawdziwy sygnał w artefaktach ją wspiera LUB jest to powszechna, możliwa do obrony wartość domyślna dla kształtu produktu. **Nie wymieniaj słomianych kukieł.** Jeśli tylko jedna wartość jest wiarygodna (żadna prawdziwa alternatywa nie jest możliwa do obrony na podstawie artefaktów), powiedz to — ta kotwica zostanie przedstawiona z jedną rekomendacją i opcją awaryjną „nadpisz własnymi słowami”.

- **`main_goal`** — wybierz z `market-feedback` | `quality` | `low-complexity` | `speed` | `learn` | `other`. Sygnały: `timeline_budget` (ciasny → speed lub low-complexity), `target_scale` (mały → low-complexity; masowy → quality), sformułowanie kryteriów sukcesu („uczyć się od prawdziwych użytkowników” → market-feedback; „zweryfikować najbardziej ryzykowne założenie” → market-feedback; „brak incydentów przy uruchomieniu” → quality), ton wizji (eksploracyjne hobby → learn; twardy termin → speed). Alternatywy to *pokrewne* wartości, które te same dowody mogłyby rozsądnie wspierać — np. `market-feedback` i `speed` często współistnieją, gdy PRD mówi „wysyłaj, aby szybko się uczyć”.

- **`north_star`** — najmniejszy, kompleksowy, widoczny dla użytkownika przepływ, który, jeśli zostanie wysłany jako pierwszy, udowadnia podstawową hipotezę wizji PRD. Zazwyczaj odnosi się do US-NN o wysokim priorytecie ORAZ do głównego kryterium sukcesu. Rozsądne alternatywy to *inne* kandydatury na fragmenty, które również odnoszą się do głównego kryterium sukcesu lub do US-NN o wysokim priorytecie, z mniejszą liczbą wymagań wstępnych lub z różnymi konsekwencjami sekwencjonowania. Jeśli istnieje więcej niż trzech kandydatów, przedstaw trzech najlepszych.

- **`top_blocker`** — wybierz z `skills` | `capacity` | `time` | `decisions` | `external` | `motivation` | `none`. Sygnały: ≥ 3 nierozwiązane `## Open Questions` w PRD → `decisions`; ambitny zakres vs. niezgodność `timeline_budget` → `time` lub `capacity`; zależność od dostawcy wymieniona w PRD, która nie została jeszcze zakontraktowana → `external`; stos technologiczny wymienia warstwę, której zespół nigdy nie wdrożył → `skills`; żadne nie występuje → `none`. Rozsądne alternatywy to *pokrewne* typy blokad, które występują na podobnych sygnałach — np. `time` i `capacity` często występują jednocześnie w przypadku napięcia między zakresem a terminem.

- **Obszary inwestycji** (NIE pytane — wywodzone w 5d) — dla każdego z `frontend`, `backend`, `data`, `infra`: zdecyduj `invest deeply` vs `go simple`. Sygnały: NFR PRD, które blokują uruchomienie w warstwie (prywatność / opóźnienie / poprawność → inwestuj tam), luki w bazach, które odpowiadają must-have PRD (brak uwierzytelniania + must-have dla wielu użytkowników → inwestuj w uwierzytelnianie), otwarte pytania skoncentrowane w jednej warstwie (nierozwiązane decyzje tam → inwestuj) i wybrany `main_goal` (`quality` zwiększa warstwy prywatności/obserwowalności; `learn` zwiększa nieznaną warstwę; `speed` / `low-complexity` domyślnie utrzymuje wszystko proste). NIE promuj warstwy do „inwestuj” bez podania sygnału PRD/bazy/main_goal.

**5b. Pomiń kotwicę tylko wtedy, gdy artefakt jest jednoznaczny.** Jeśli frontmatter PRD lub kryteria sukcesu *dosłownie określają* wartość (np. `timeline_budget: "1 tydzień do wysyłki"` plus „musimy uruchomić przed X” → `main_goal: speed`), pomiń to pytanie i ogłoś pominięcie z wybraną wartością i cytatem, który ją blokuje. Nigdy nie pomijaj, gdy istnieje jakakwiek wiarygodna alternatywa — potwierdzenie użytkownika w prawdziwym wyborze jest warte więcej niż zaoszczędzone sekundy. W praktyce zazwyczaj zadasz 2-3 pytania; możesz zadać mniej, ale NIGDY więcej niż 3.

**5c. Przeprowadź wywiad — jedno ustrukturyzowane pytanie na kotwicę, w kolejności.**

Dla każdej niepominiętej kotwicy — `main_goal`, następnie `north_star`, następnie `top_blocker` — użyj wybranego interaktywnego narzędzia do pytań. Każde pytanie jest osobnym wywołaniem (sekwencyjnym, a nie wsadowym). Format:

Zapytaj użytkownika:
- question: "<pytanie kotwiczne w języku naturalnym, w języku użytkownika>"
  header: "<krótki nagłówek — np. Cel | Gwiazda | Główne ryzyko / Goal | North star | Blocker>"
  options:
  - label: "<Wartość rekomendacji> (Zalecane)"
    description: "<Jednolinijkowe uzasadnienie, z cytatem/wskaźnikiem artefaktu, który uzasadnia rekomendację.>"
  - label: "<Wartość alternatywy A>"
    description: "Rozsądne, gdy <jednolinijkowy warunek, który artefakty częściowo wspierają>; wybierzesz to, gdy <konsekwencja sekwencjonowania/zakresu>."
  - label: "<Wartość alternatywy B>"
    description: "Rozsądne, gdy <jednolinijkowy warunek>; wybierzesz to, gdy <konsekwencja>."
  - label: "Coś innego — wyjaśnię"
    description: "Swobodna forma. Podaj wartość i powód; zapiszę oba i odpowiednio je uporządkuję."
  multiSelect: false

Zasady dla bloku opcji:
- **Rekomendacja jest zawsze opcją 1**, z sufiksem „(Zalecane)” na etykiecie.
- **Każda alternatywa zawiera własną klauzulę „dlaczego rozsądne”** powiązaną z sygnałem artefaktu — nie „alternatywa: jakość”, ale „alternatywa: jakość — rozsądne, gdy poprawność uruchomienia jest ważniejsza niż sygnał od pierwszego użytkownika”. Alternatywa bez takiej klauzuli jest słomianą kukłą; usuń ją.
- **Maksymalnie 2 alternatywy** plus swobodna opcja awaryjna (łącznie 2-4 opcje). Dłuższe listy męczą użytkownika bez dodawania sygnału.
- **Opcje gwiazdy północnej nazywają kandydatów na fragmenty, a nie abstrakcyjne wartości** — każda etykieta to `<kandydat US-NN> — <jednolinijkowy wynik>`.
- **Jeśli tylko jedna wartość jest wiarygodna** (5a nie znalazło rozsądnej alternatywy), przedstaw tylko rekomendację i „Coś innego — wyjaśnię” oraz ujawnij w tekście pytania: „artefakty wspierają tutaj tylko jedno odczytanie; zgłoś, jeśli Twoje odczytanie się różni”.

**5d. Wywnioskuj obszary inwestycji (bez pytania).**

Po uzyskaniu 2-3 odpowiedzi na pytania kotwiczne, wywnioskuj obszary inwestycji na podstawie: (1) wybranego `main_goal`, (2) NFR PRD blokujących uruchomienie w warstwie, (3) luk w bazach danych mapowanych na FR typu must-have, (4) koncentracji otwartych pytań. Ogłoś wywnioskowaną inwestycję w podsumowaniu syntezy (5e). Użytkownik może ją nadpisać w jednej linii; nie jest proszony o wybór.

**5e. Podsumowanie syntezy — potwierdź bez pytania.**

Wyślij pojedynczą wiadomość w formacie Markdown, która zatwierdza ramy. Bez nowych pytań. Odzwierciedlaj język użytkownika od początku do końca (polskie PRD → polskie podsumowanie). Kształt:

```markdown
Zatwierdzanie ram mapy drogowej:

- **Cel sekwencjonowania: `<main_goal>`.** <Jednolinijkowe uzasadnienie, łączące się z odpowiedzią użytkownika i wskaźnikiem artefaktu.>
- **Gwiazda przewodnia: `<S-NN candidate> — <Outcome>`.** <Jednolinijkowe powiązanie tego fragmentu z głównym kryterium sukcesu lub najbardziej ryzykownym założeniem.>
- **Główne ryzyko / bloker: `<top_blocker>`.** <Jednolinijkowe z konkretnym sygnałem — liczbą otwartych pytań, nazwanym dostawcą, niezgodnością terminów itp.>
- **Inwestycje: w `<layer>` głęboko; reszta lekko.** <Jednolinijkowe — wywiedzione z main_goal + NFR + luki w bazach; nie pytane.>

Powiedz "go" żeby ruszyć dalej, albo nadpisz dowolną linię ("inwestycja powinna być w data, nie infra"). Nie będę pytał ponownie o to, co już ustaliliśmy.
```

Gdy użytkownik powie „go” lub pozostanie cicho po przekroczeniu następnego kroku, kontynuuj z zablokowanymi ramami. Nadpisania poszczególnych linii są akceptowane i ponownie rejestrowane bez ponownego pytania o inne kotwice.

**5f. Wyjątek niestandardowego kształtu MVP.**

„Niestandardowy kształt MVP” to produkt, który nie pasuje do znanego wzorca: nie jest to pulpit nawigacyjny SaaS, nie jest to aplikacja CRUD, nie jest to platforma treści, nie jest to oczywisty wrapper AI, nie jest to strona marketingowa. Sygnały: `## Vision` PRD opisuje nową interakcję lub domenę; `## User Stories` nie grupują się wokół znanej encji (tworzenie/czytanie/aktualizowanie/usuwanie `<rzeczy>`); `tech-stack.md` deklaruje nieoczywiste narzędzia (silniki gier, mosty sprzętowe, wyspecjalizowane środowiska uruchomieniowe, nowe kształty agentów); sformułowanie użytkownika podkreśla nową mechanikę, a nie znany wzorzec.

Gdy PRD wygląda na niestandardowo ukształtowane:

1. **Otwórz wywiad, ujawniając to** w wiadomości poprzedzającej pierwsze pytanie kotwiczne: *"To PRD nie pasuje do znanego wzorca MVP (brak pulpitu nawigacyjnego SaaS / CRUD / treści / kształtu wrappera AI). Moje rekomendacje dla następnych 2-3 pytań są słabsze niż zwykle — mocno się sprzeciw, jeśli moje odczytanie jest błędne."*
2. **Złagodź rekomendację dla `north_star` i wszelkich pochodnych obszarów inwestycji.** Sformułuj opis rekomendacji jako *"Moje najlepsze odczytanie to X, ale sygnał artefaktu jest słaby"* zamiast *"PRD §Vision mówi X"*.
3. **Dopuść do dwóch dodatkowych wymian** oprócz trzech pytań kotwicznych. Niestandardowe MVP nagradzają dialog; intuicja projektowa użytkownika wykonuje więcej pracy niż mogą to zrobić artefakty. Dalsze pytania to swobodny tekst, a nie nowe ustrukturyzowane pytania.

Jest to jedyna ścieżka, w której umiejętność skłania się ku dialogowi, a nie od niego — i jedyna ścieżka, która pozwala na dalsze pytania. Całkowity limit w ramach tego wyjątku: 3 kotwice + 2 dalsze pytania = 5 wymian; poza nim, 3 pytania kotwiczne, brak dalszych pytań, jedno podsumowanie syntezy.

**5g. Zasady dotyczące sformułowań i języka (dotyczą każdego pytania kotwicznego i podsumowania).**

- **Odzwierciedlaj język użytkownika od początku do końca.** Polskie PRD → polskie pytania, opcje i podsumowanie. Tłumacz nazwy sekcji (`Open Questions` → `Otwarte pytania`, `Functional Requirements` → `Wymagania funkcjonalne`, `Non-Goals` → `Poza zakresem`, `Success Criteria` → `Kryteria sukcesu`). Brak angielskich fragmentów, takich jak „north star”, „blocker”, „must-have” w polskim pytaniu lub etykiecie opcji — parafrazuj („gwiazda przewodnia”, „główne ryzyko”, „konieczne”).
- **Tłumacz wewnętrzny żargon umiejętności na prosty język produktu.** *"Privacy posture"* → *"polityka prywatności dostawcy AI"*. *"North star"* → *"pierwsza historyjka, która udowadnia, że produkt działa"*. *"Blocking unknowns"* → *"pytania bez odpowiedzi, które blokują dalsze planowanie"*. Użytkownik nigdy nie powinien musieć otwierać dokumentacji tej umiejętności, aby zrozumieć pytanie.
- **Cytaty w opisach opcji zasługują na swoje miejsce.** Cytat taki jak *"tech-stack wskazuje Astro + Supabase + OpenRouter"* to zrzut nazw, chyba że następna klauzula mówi, dlaczego jest to ważne dla *tej* kotwicy. Albo włącz implikację, albo usuń cytat.
- **Rekomendacja musi być możliwa do obrony, a nie agresywna.** Jednolinijkowe uzasadnienie rekomendacji opiera się na linii artefaktu, a nie na pewnym tonie. Jeśli nie możesz wskazać cytatu, obniż rangę — przedstaw kotwicę z dwiema alternatywami o równej wadze (i swobodną opcją awaryjną) i pozwól użytkownikowi wybrać.

### Krok 6: Dekompozycja i sekwencjonowanie

Ten krok to miejsce, w którym umiejętność zarabia na swoje utrzymanie. Zbuduj zawartość mapy drogowej **w pamięci** (jeszcze nie na dysku).

**6a. Zidentyfikuj podstawy (Foundations).** Podstawa to przekrojowy warunek wstępny, który sam w sobie nie ma widocznego dla użytkownika wyniku, ale odblokowuje nazwane pionowe fragmenty, zmniejsza nazwaną blokującą niewiadomą lub tworzy infrastrukturę weryfikacyjną wymaganą przez nazwany fragment. Jest to umowa umożliwiająca, a nie pozwolenie na tworzenie mapy drogowej w poziomie. Źródła:

- Decyzje `tech-stack.md`, które implikują prace szkieletowe (dostawca uwierzytelniania → szkielet uwierzytelniania; wybrany cel wdrożenia → szkielet wdrożenia; wybrane monitorowanie → baza obserwowalności).
- `## Non-Functional Requirements` PRD, które wymagają infrastruktury (np. NFR „p95 < 800ms” implikuje podstawową instrumentację wydajności).
- `## Access Control` PRD, jeśli jest to coś więcej niż „pojedynczy użytkownik, brak uwierzytelniania”.
- **Baza z Kroku 4** — wszystko zgłoszone jako **nieobecne** lub **częściowe** jest kandydatem na Foundations. Wszystko zgłoszone jako **obecne** jest pomijane (i odnotowane w `## Baseline`).
- **Krok 5 „Gdzie inwestować”** — wybory „invest deeply” promują podstawę do własnego, jawnego fragmentu (np. „warstwa danych — invest deeply” + nieobecna baza → F-NN jawna podstawa projektowania danych, a nie tylko niejawny krok migracji).

Nie wymyślaj podstaw, których PRD nie implikuje (nie „ustawiaj Storybooka”, chyba że coś to wymusza). Nie twórz ogólnej podstawy „warstwy danych”, „warstwy API”, „warstwy UI” ani „systemu uwierzytelniania”, chyba że możesz nazwać element `S-NN` niższego szczebla, który odblokowuje, blokującą niewiadomą, którą zmniejsza, lub ścieżkę weryfikacji, którą umożliwia.

**Limit zakresu podstaw.** Podstawa musi być najmniejszym przekrojowym elementem umożliwiającym, który pozwala na kontynuowanie nazwanego pionowego fragmentu. Może ustanawiać minimalną umowę, szkielet, politykę lub ścieżkę weryfikacji; NIE może ukończyć całej warstwy architektonicznej przed pracami widocznymi dla użytkownika. Jeśli wynik podstawy brzmi jak „warstwa danych/API/UI/uwierzytelniania jest kompletna”, podziel ją lub włącz minimalną potrzebną pracę do pierwszego fragmentu `S-NN`, który ją konsumuje. Test: po wdrożeniu podstawy, co najmniej jeden fragment `S-NN` niższego szczebla powinien nadal integrować i wykorzystywać tę warstwę poprzez rzeczywistą funkcjonalność użytkownika.

**Zasada progresywnego ujawniania.** Preferuj wprowadzanie elementów technicznych w momencie, gdy pierwszy fragment widoczny dla użytkownika ich potrzebuje. Podstawa jest uzasadniona tylko wtedy, gdy jej odłożenie w czasie sprawiłoby, że pierwszy pionowy fragment byłby niemożliwy do zaplanowania, niebezpieczny lub niemożliwy do zweryfikowania. „Będziemy potrzebować tej warstwy w końcu” to za mało.

Identyfikatory podstaw to `F-NN` (dwucyfrowe z zerem wiodącym, zaczynając od `F-01`).

**6b. Rozłóż powierzchnię widoczną dla użytkownika na fragmenty.** Przejdź przez `## User Stories` i `## Functional Requirements` PRD. Pogrupuj je w pionowe, kompleksowe fragmenty, gdzie każdy fragment:

- Dostarcza **pojedynczą, widoczną dla użytkownika funkcjonalność** określoną jako „użytkownik może…”.
- Dotyka każdej warstwy potrzebnej do urzeczywistnienia tej funkcjonalności (dane + logika + interfejs), od góry do dołu.
- Jest wystarczająco mały, aby jedno wywołanie `/10x-plan` wygenerowało wykonalny plan, ale wystarczająco duży, aby fragment był znaczący sam w sobie (fragment to zazwyczaj jeden US-NN, czasami dwa, gdy są ściśle powiązane — np. „tworzenie” i „listowanie” tej samej encji).

NIE dziel w poziomie („fragment bazy danych”, „fragment API”, „fragment UI”). Fragmenty poziome to antywzorzec, któremu ta umiejętność ma zapobiegać. Domyślna dekompozycja jest pionowa: każdy fragment widoczny dla użytkownika powinien tworzyć użyteczną funkcjonalność, którą agent może zaimplementować i zweryfikować od początku do końca. Praca pozioma jest dozwolona tylko jako nazwana podstawa z wyraźnym powodem niższego szczebla.

Identyfikatory fragmentów to `S-NN` (dwucyfrowe z zerem wiodącym, zaczynając od `S-01`).

Każdy `F-NN` i `S-NN` otrzymuje również stabilny **Change ID** w formacie kebab-case. Change ID to pomost do `/10x-plan`, a później element backlogu w Jira/Linear. Preferuj zwięzłe, zorientowane na wyniki nazwy, takie jak `first-gated-generation`, `minimal-auth-for-generation` lub `srs-review-session`.

**Granulacja i równowaga fragmentów.** Fragmenty mapy drogowej powinny być w przybliżeniu porównywalne pod względem wysiłku planistycznego i wagi koncepcyjnej, mimo że nie zawierają szacunków. Unikaj jednego fragmentu, który pochłania większość PRD, podczas gdy późniejsze fragmenty to drobne elementy dopracowania. Jeśli jeden fragment kandydujący odnosi się do wielu FR typu must-have lub wielu niepowiązanych historyjek użytkownika, podziel go według widocznych dla użytkownika wyników, faz przepływu pracy, person lub granic ryzyka, aż każdy `S-NN` będzie czymś, co jeden `/10x-plan <change-id>` może spójnie rozważyć.

Użyj tych wyzwalaczy podziału:

- Fragment obejmuje więcej niż jedną główną akcję użytkownika (np. „importuj, edytuj, udostępniaj i raportuj”).
- Fragment łączy konfigurację, podstawowy przepływ pracy i administrację w jednym elemencie.
- Fragment spełnia większość FR typu must-have, podczas gdy inne fragmenty mają tylko po jednym drobnym FR.
- Linia ryzyka fragmentu zawiera więcej niż jedno niezależne ryzyko.
- Fragment potrzebuje niepowiązanych niewiadomych, należących do różnych osób lub warstw.

NIE dziel według warstw, aby naprawić rozmiar. Dziel według węższych pionowych wyników. Na przykład, zastąp „kompletny system przepisów” przez „użytkownik może zapisać pierwszy przepis”, „użytkownik może wyszukiwać zapisane przepisy” i „użytkownik może udostępnić przepis” — a nie „schemat przepisów”, „API przepisów” i „UI przepisów”.

**6c. Zbuduj graf zależności.** Dla każdego fragmentu i podstawy, zidentyfikuj wymagania wstępne:

- **Inne identyfikatory podstaw**, których fragment potrzebuje (np. S-03 potrzebuje F-01 uwierzytelniania).
- **Inne identyfikatory fragmentów**, których dane lub funkcjonalności ten fragment konsumuje (np. S-04 „oceń przepis” zależy od S-03 „zobacz przepisy”).
- **Stan zewnętrzny** (np. „zasiana tabela składników”). Konkretny, a nie ogólnikowy.

Dla każdej podstawy, zidentyfikuj również **Odblokowania**:

- jeden lub więcej pionowych fragmentów `S-NN` niższego szczebla, które podstawa bezpośrednio umożliwia, LUB
- jedną lub więcej blokujących niewiadomych, które zmniejsza, LUB
- jedną lub więcej nazwanych ścieżek weryfikacji wymaganych przez fragment niższego szczebla.

Jeśli podstawa nie ma jasnych Odblokowań, usuń ją lub włącz pracę do pierwszego pionowego fragmentu, który jej potrzebuje.

Następnie dla każdego elementu, wywnioskuj **Równolegle z** — fragmenty, których wymagania wstępne są podzbiorem lub rodzeństwem wymagań wstępnych tego fragmentu i które od niego nie zależą. Agenci AI mogą rozdzielić się na te fragmenty. Jeśli dwa fragmenty nie mają żadnych zależności i żaden nie blokuje drugiego, są równoległe. Gdy bloker nr 1 (Krok 5) to **pojemność**, bądź szczególnie hojny w obliczaniu równoległości — to najbardziej użyteczna dźwignia dla użytkownika.

**6d. Sortowanie topologiczne, z uwzględnieniem głównego celu.** Najpierw podstawy (w kolejności zależności między nimi), następnie fragmenty w kolejności zależności. Umieść fragment **gwiazdy północnej** tak wcześnie, jak pozwalają na to jego wymagania wstępne — nie odkładaj go na później dla symetrycznego porządku. Następnie rozstrzygnij remisy według głównego celu (Krok 5):

- **Informacje zwrotne z rynku** → remisy rozstrzygane na korzyść fragmentu, który ujawnia najbardziej ryzykowne założenie (często integracja lub logika domenowa). Wczesne ujawnienie ryzyka jest ważniejsze niż maksymalizacja wartości demonstracyjnej fragmentu 1.
- **Jakość / rzemiosło** → Podstawy sekwencjonowane bardziej chętnie; podstawy obserwowalności i kontroli dostępu NIE są odkładane za fragmenty widoczne dla użytkownika.
- **Niska złożoność / szybkie zwycięstwo** → remisy rozstrzygane na korzyść najmniejszego możliwego fragmentu; agresywne parkowanie.
- **Szybkość uruchomienia** → najpierw ścisła ścieżka must-have; elementy nieistotne są parkowane, a nie sekwencjonowane późno.
- **Nauka technologii / eksploracja** → remisy rozstrzygane na korzyść fragmentów, które najwcześniej wykorzystują nieznaną technologię; wartość uczenia się liczy się tutaj jako wartość dla użytkownika.

Jeśli `## Open Roadmap Questions` zawiera decyzję istotną dla sekwencjonowania (np. „czy najpierw wysyłamy na urządzenia mobilne?”), NIE wybieraj sekwencji, która przesądza o odpowiedzi — pozostaw dotknięte fragmenty jako `Status: blocked` do czasu rozwiązania pytania.

**6e. Zidentyfikuj blokujące niewiadome.** Dla każdego fragmentu, wymień:

- **Blokery** (zewnętrzne, oczekujące) — zatwierdzenie dostawcy, zasób projektowy, decyzja interesariusza. Jeśli brak, napisz `—`. Odpowiedź na pytanie „Zewnętrzne” blokera nr 1 z Kroku 5 zasila te blokery.
- **Niewiadome** (pytania do zbadania) — rzeczy, na które mapa drogowa nie może odpowiedzieć, a `/10x-plan` również nie powinien próbować. Każda niewiadoma zawiera: pytanie, właściciela, status blokowania (tak/nie — czy planowanie jest zablokowane do czasu rozwiązania?). Odpowiedź na pytanie „Decyzje” blokera nr 1 z Kroku 5 zasila te niewiadome.

Fragment ze `Status: blocked` istnieje, gdy co najmniej jedna niewiadoma ma `Block: yes`. Zadaniem mapy drogowej jest ujawnienie ich, aby użytkownik mógł je rozwiązać, zanim `/10x-plan` zostanie zmarnowany na fragment, którego nie można zaplanować.

**6f. Wygeneruj `## Open Roadmap Questions`.** Dwa źródła:

- `## Open Questions` z PRD — skopiuj dosłownie, w razie potrzeby zmień numerację. Te są nadal otwarte.
- Nowe pytania, które pojawiły się w Kroku 5 i obejmują wiele fragmentów („czy faktycznie powinniśmy wysyłać na urządzenia mobilne?”).

Niewiadome dotyczące poszczególnych fragmentów pozostają w fragmencie; przekrojowe niewiadome znajdują się tutaj.

**6g. Wygeneruj `## Parked`.** Podnieś `## Non-Goals` z PRD. Dodaj również wszystko, co Krok 5 ujawnił jako odłożone — szczególnie gdy głównym celem jest **szybkość uruchomienia** lub blokerem nr 1 jest **czas/pojemność**, ta sekcja rośnie. Każdy wpis: jednolinijkowy element, jednolinijkowe uzasadnienie.

**6h. Wywnioskuj `## Streams` (pomoc nawigacyjna).** Strumienie to *wygenerowany widok* grafu zależności — NIE zastępują one porządku topologicznego w `## Foundations` + `## Slices` i nie wprowadzają nowych identyfikatorów. Ich zadanie: przedstawić czytelnikowi proponowaną kolejność czytania równoległych ścieżek na jednym ekranie. Wyprowadzenie: jeden strumień na każdą podstawę, która kotwiczy odrębny łańcuch wymagań wstępnych (`F-NN` → fragmenty wymieniające ją w wymaganiach wstępnych, w kolejności zależności); fragment bez wymagań wstępnych podstawy jest własnym jednoelementowym strumieniem (nigdy nie jest to kubeł „Różne”); fragment zależny od wielu nagłówków strumieni dołącza do najbardziej pochodnego, z nazwą połączenia w notatce tego strumienia („dołącza do strumienia A w S-01”) — nigdy nie jest duplikowany w strumieniach. Wygeneruj jeden wiersz tabeli markdown na strumień — `Stream | Theme | Chain | Note` — Chain łączący istniejące identyfikatory mapy drogowej za pomocą `→`, Theme opisowy, a nie promocyjny („Pętla recenzji”, a nie „Zabójcza funkcja”), Note jedna klauzula łącząca strumień z `main_goal` lub nazywająca połączenie. Limit: 2-5 strumieni — więcej oznacza, że graf jest zbyt podzielony (zwiń strumienie jednofunkcyjne w strumień sąsiedniej podstawy); mniej niż 2 oznacza, że porządek topologiczny już jest czytelny, więc pomiń sekcję. Strumienie NIE są kanoniczne: w przypadku jakiegokolwiek konfliktu, porządek topologiczny wygrywa, a definicja strumienia jest błędna.

### Krok 7: Wygeneruj zawartość mapy drogowej

Użyj tego dokładnego szablonu (nazwy sekcji są umową; narzędzia niższego szczebla i `/10x-plan` mogą je wyszukiwać):

````markdown
---
project: <from PRD frontmatter>
version: 1
status: draft                    # draft | active | locked
created: <YYYY-MM-DD>
updated: <YYYY-MM-DD>
prd_version: <int from PRD frontmatter, or `—` for non-PRD sources>
main_goal: <market-feedback | quality | low-complexity | speed | learn | other>
top_blocker: <skills | capacity | time | decisions | external | motivation | none>
milestone_id: <kebab-case, outcome-oriented — e.g. first-usable-deck>
milestone_seq: <int, 1 for the first milestone>
milestone_status: open           # open | done
---

# Mapa drogowa: <Projekt>

> Wywiedzione z <materiałów źródłowych> + automatycznie zbadana baza kodu.
> Edytuj na miejscu; archiwizuj, gdy zostanie zastąpione.
> Poniższe fragmenty są wymienione w kolejności zależności. Tabela „W skrócie” to indeks.

## Kamień milowy

**M-<seq>: <Nazwa kamienia milowego>** — Status: otwarty

- **Cel:** <1-2 zdania: wynik, który ten kamień milowy udowadnia lub dostarcza — zorientowany na wynik, bez dat>.
- **Materiały źródłowe:** <`context/foundation/prd.md` (v<N>) | wymienione ścieżki dokumentów | „opis użytkownika (poniższe kotwice)”>
- **Gotowe, gdy:** każdy F-NN i S-NN poniżej jest `done`<, plus wszelkie jawne linie akceptacji podane przez użytkownika>.
- **Kotwice zakresu:** <Identyfikatory PRD, z których korzysta ten kamień milowy (zakresy FR-NNN, US-NN) — lub, dla kamieni milowych pochodzących z opisu, numerowane elementy `MS-NN` destylowane dosłownie z opisu użytkownika:>
  - MS-01: <jedno oświadczenie o zakresie>
  - MS-02: <…>
  (Pomiń listę MS całkowicie, gdy źródłem jest PRD lub inny dokument.)

## Podsumowanie wizji

<2-3 zdania zaczerpnięte z sekcji Vision & Problem Statement PRD. NIE jest to ponowne
stwierdzenie — wystarczy, aby czytelnik mógł się zorientować bez otwierania prd.md.

Jeśli podsumowanie opiera się na terminie strategii produktu — najczęściej „wedge”, ale także
„beachhead”, „primary metric”, „validation milestone”, „north star” — zdefiniuj go
w tekście przy pierwszym użyciu, w jednym krótkim zdaniu w prostym języku. Przykład:
„Klin produktu — jedyna cecha, która, jeśli zostanie usunięta, sprawia, że produkt
jest nie do odróżnienia od ogólnego narzędzia AI — polega na tym, że karty muszą być zarówno
oparte na AI w tekście wklejonym przez uczącego się, jak i zatwierdzone przez człowieka, zanim
trafią do talii.” Czytelnik, który nie przeszedł kursu strategii produktu, musi
być w stanie przeczytać sekcję bez wcześniejszej wiedzy.>

## Gwiazda północna

**<ID fragmentu>: <Wynik>** — <jedno zdanie o tym, dlaczego jest to kamień milowy walidacji, powiązane z głównym celem>.

> Jednolinijkowe wyjaśnienie dla czytelnika, co oznacza „gwiazda północna”: najmniejszy
> kompleksowy fragment, którego pomyślne dostarczenie udowodniłoby podstawową hipotezę produktu
> — umieszczony tak wcześnie, jak pozwalają na to wymagania wstępne, ponieważ wszystko inne ma znaczenie
> tylko wtedy, gdy to działa. Dołącz to wyjaśnienie za PIERWSZYM razem, gdy „gwiazda północna” pojawi się w
> treści dokumentu; nie powtarzaj go później.

## W skrócie

| ID | Change ID | Wynik (użytkownik może …) | Wymagania wstępne | Odniesienia do PRD | Status |
|---|---|---|---|---|---|
| F-01 | <kebab-case-change-id> | (podstawa) <wynik podstawy> | — | NFR-XX | proposed |
| F-02 | <kebab-case-change-id> | (podstawa) <wynik podstawy> | F-01 | NFR-YY | proposed |
| S-01 | <kebab-case-change-id> | <wynik użytkownika> | F-01 | US-01, FR-001 | ready |
| S-02 | <kebab-case-change-id> | <wynik użytkownika> | S-01 | US-02, FR-003 | proposed |
| S-03 | <kebab-case-change-id> | <wynik użytkownika> | S-01, F-02 | US-03, FR-005 | blocked |

## Strumienie

Pomoc nawigacyjna — grupuje elementy, które współdzielą łańcuch wymagań wstępnych. Kanoniczna kolejność nadal znajduje się w grafie zależności poniżej; ta tabela to proponowana kolejność czytania równoległych ścieżek.

| Strumień | Temat | Łańcuch | Uwaga |
|---|---|---|---|
| A | <Temat> | `F-01` → `S-01` → `S-02` | <Jednolinijkowe uzasadnienie łączące strumień z głównym celem.> |
| B | <Temat> | `F-02` → `S-03` | <Dołącza do strumienia A w `S-NN`, jeśli ma zastosowanie, w przeciwnym razie samodzielny.> |
| C | <Temat> | `S-NN` | <Samodzielny fragment bez wymagań wstępnych podstawy.> |

(2–5 strumieni; każdy `F-NN` i `S-NN` pojawia się dokładnie w jednym strumieniu. Pomiń tę sekcję całkowicie, jeśli graf zależności jest zbyt mały, aby strumienie dodawały wartość — patrz Krok 6h.)

## Baza

Co już jest na miejscu w bazie kodu na dzień `<YYYY-MM-DD>` (automatycznie zbadane + potwierdzone przez użytkownika).
Poniższe podstawy zakładają, że te elementy są obecne i NIE tworzą ich ponownie.

- **Frontend:** <obecny | nieobecny | częściowy> — <jedna linia, wskaźnik pliku, jeśli obecny>
- **Backend / API:** <…>
- **Dane:** <…>
- **Uwierzytelnianie:** <…>
- **Wdrożenie / infrastruktura:** <…>
- **Obserwowalność:** <…>

## Podstawy

### F-01: <Tytuł podstawy>

- **Wynik:** (podstawa) <jedno zdanie o tym, co jest teraz na miejscu — niewidoczne dla użytkownika>.
- **Change ID:** <kebab-case-change-id>
- **Odniesienia do PRD:** <NFR-NN, sekcja kontroli dostępu itp. — bądź konkretny>
- **Odblokowuje:** <identyfikatory S-NN niższego szczebla, identyfikatory/pytania blokujące niewiadome lub nazwane ścieżki weryfikacji>
- **Wymagania wstępne:** <identyfikatory fragmentów/podstaw i stan zewnętrzny — lub `—`>
- **Równolegle z:** <identyfikatory, które mogą działać równolegle, lub `—`>
- **Blokery:** <zewnętrzne oczekujące, lub `—`>
- **Niewiadome:** <pytania, lub `—`>
- **Ryzyko:** <jedna linia: dlaczego sekwencjonowane tutaj, co może pójść nie tak>
- **Status:** proposed | ready | blocked

(Powtórz dla każdego F-NN.)

## Fragmenty

### S-01: <Tytuł fragmentu>

- **Wynik:** <użytkownik może …>
- **Change ID:** <kebab-case-change-id>
- **Odniesienia do PRD:** <FR-NNN, US-NN, NFR-N — każdy FR typu must-have, który ten fragment spełnia, każdy US-NN, który rozwija>
- **Wymagania wstępne:** <identyfikatory fragmentów/podstaw i stan zewnętrzny>
- **Równolegle z:** <identyfikatory, lub `—`>
- **Blokery:** <zewnętrzne oczekujące, lub `—`>
- **Niewiadome:**
  - <pytanie> — Właściciel: <użytkownik|zespół|TBD>. Blokuje: <tak|nie>.
  - (lub `—` jeśli brak)
- **Ryzyko:** <jedna linia>
- **Status:** proposed | ready | blocked

(Powtórz dla każdego S-NN, w kolejności zależności.)

## Przekazanie do backlogu

| ID mapy drogowej | Change ID | Sugerowany tytuł zadania | Gotowe do `/10x-plan` | Uwagi |
|---|---|---|---|---|
| F-01 | <kebab-case-change-id> | <tytuł zadania dla Jira/Linear> | no | <dlaczego lub `—`> |
| S-01 | <kebab-case-change-id> | <tytuł zadania dla Jira/Linear> | yes | Uruchom `/10x-plan <change-id>` |

Ta tabela to czyste przekazanie do Jira/Linear lub dowolnego backlogu opartego na MCP. Zawiera jeden wiersz dla każdego `F-NN` i `S-NN`. Powinna być wystarczająco kompaktowa, aby można ją było skopiować do zadań, ale nie może duplikować szczegółowej treści mapy drogowej.

## Otwarte pytania dotyczące mapy drogowej

1. **<Pytanie>** — Właściciel: <kto>. Blokuje: <które identyfikatory fragmentów to blokuje, lub `roadmap-wide`>.
2. ...

(Każdy wpis odzwierciedla kształt `## Open Questions` z PRD. Niewiadome dotyczące poszczególnych fragmentów pozostają w fragmencie.)

## Zaparkowane

- **<Element>** — Dlaczego zaparkowane: <odniesienie do §Non-Goals PRD, lub uzasadnienie z wywiadu>.
- ...

## Historia kamieni milowych

(Tylko dołączanie. Przenoszone dosłownie do mapy drogowej każdego kolejnego kamienia milowego; puste przy pierwszym kamieniu milowym. Wpisy zamknięcia są zapisywane przez przejście `READY_TO_CLOSE → CLOSED` tej umiejętności. Format:)

- **M-<seq>: <Nazwa kamienia milowego>** (`<milestone_id>`) — zamknięty <RRRR-MM-DD>. <Jednolinijkowy wynik.>

## Zrobione

(Puste przy pierwszym generowaniu. `/10x-archive` dodaje tutaj wpis — i zmienia `Status` tego elementu na `done` — gdy zmiana, której `Change ID` pasuje do elementu, zostanie zarchiwizowana. NIE wypełniaj wstępnie. Format:)

- **<ID fragmentu>: <Wynik>** — Zarchiwizowane <RRRR-MM-DD> → `context/archive/<RRRR-MM-DD-change-id>/`. Lekcja: <wskaźnik do lessons.md, jeśli istnieje, lub `—`>.
````

**Semantyka pól, szczegółowo:**

- **Wynik** jest prowadzony przez czasownik. Fragmenty: *"użytkownik może się zalogować i zobaczyć pustą lodówkę"*. Podstawy: *"(podstawa) szkielet uwierzytelniania wylądował; tokeny wydane za pośrednictwem skonfigurowanego dostawcy"*. Nigdy fraza rzeczownikowa ("system uwierzytelniania"); zawsze deklaratywny stan świata.
- **Change ID** jest w formacie kebab-case, stabilny i odpowiedni dla `context/changes/<change-id>/`. Nie używaj `F-01` / `S-01` jako identyfikatora zmiany; są to identyfikatory kolejności lokalne dla mapy drogowej.
- **Odblokowuje** pojawia się tylko w Foundations. Nazywa powód istnienia tej Fundacji: konkretne fragmenty `S-NN`, blokujące niewiadome lub nazwane ścieżki weryfikacji. Fundacja bez Odblokowań to dryf poziomy.
- **Odniesienia do PRD** używają dosłownych identyfikatorów z PRD (`FR-001`, `US-01`, `NFR-02`). Nie parafrazuj. Każdy FR typu must-have w PRD musi pojawić się w co najmniej jednym `PRD refs` fragmentu po samokontroli w Kroku 8.
- **Wymagania wstępne** mieszają identyfikatory fragmentów (`S-01`, `F-02`) i stan zewnętrzny, oddzielone przecinkami. Stan zewnętrzny to prosty angielski („zasiana tabela składników”, „opublikowane tokeny projektowe”). Jedno pole, niepodzielone.
- **Równolegle z** ma charakter informacyjny. Obliczone na podstawie grafu zależności: dowolny fragment X, gdzie moje wymagania wstępne i wymagania wstępne X nie mają między sobą ścieżki. Puste = `—`.
- **Blokery** to *tylko zewnętrzne oczekujące* (dostawca, projekt, decyzja interesariusza). Rzeczy, których zespół nie może jednostronnie rozwiązać. Jeśli zespół MOŻE to rozwiązać, jest to niewiadoma, a nie bloker.
- **Niewiadome** to pytania do zbadania. Każde zawiera właściciela i flagę blokady. Blokada=tak podnosi status fragmentu do `blocked`.
- **Ryzyko** to jedna linia: dlaczego sekwencjonowane tutaj, co może pójść nie tak, dlaczego jest to bezpieczniejsza kolejność niż alternatywy. Nie jest to analiza pośmiertna. Nie jest to katastrofizowanie. Po prostu kluczowy powód, dla którego przyszły czytelnik musi zrozumieć sekwencję.
- **Status** cykl życia: `proposed` (domyślny przy pierwszym generowaniu) | `ready` (wszystkie wymagania wstępne spełnione, brak blokujących niewiadomych — `/10x-plan` może działać) | `planning` | `in-progress` | `done` | `blocked` (jedna lub więcej niewiadomych z `Block: yes`). Ta umiejętność emituje tylko `proposed`, `ready` i `blocked` przy generowaniu; reszta jest zapisywana w dół (patrz „Związek z innymi umiejętnościami”), z najlepszym wysiłkiem i tylko do przodu.
- **Frontmatter `main_goal` / `top_blocker`** rejestruje odpowiedzi z Kroku 5, aby przyszły ponowny odczyt (lub recenzent) mógł na pierwszy rzut oka zobaczyć stronniczość sekwencjonowania bez otwierania historii rozmów.

**Twarda zasada — nigdy nie wymyślaj fragmentów.** Każdy fragment musi odnosić się do identyfikatora kotwicy źródłowej (zasada 1). Jeśli wywiad ujawnił coś, czego źródła nie deklarują („och, a potrzebujemy też trybu offline”), to NIE staje się to fragmentem — staje się otwartym pytaniem mapy drogowej (prawdziwa luka) lub wpisem zaparkowanym (jawnie odłożonym). Mapa drogowa sekwencjonuje to, co deklarują źródła; nie rozszerza ich.

**Brak jednostek czasu. Brak szacunków. Brak ocen złożoności.** (Zasada 5.) Kolejność jest zakodowana w wymaganiach wstępnych; tempo jest ujawniane poprzez blokery i niewiadome. Chęć napisania „to powinno zająć kilka godzin” oznacza, że dryfujesz w stronę terytorium `/10x-plan` — zatrzymaj się.

### Krok 8: Samokontrola

Przed zapisem na dysku, zweryfikuj mapę drogową w pamięci:

1. **Frontmatter** — wszystkie 11 kluczy obecnych (`project`, `version`, `status`, `created`, `updated`, `prd_version`, `main_goal`, `top_blocker`, `milestone_id`, `milestone_seq`, `milestone_status`).
2. **Wymagane sekcje** — istnieją te nagłówki `##`, w tej kolejności: `Milestone`, `Vision recap`, `North star`, `At a glance`, `Streams` (opcjonalnie — obecne, jeśli Krok 6h zdecydował, że strumienie dodają wartość), `Baseline`, `Foundations`, `Slices`, `Backlog Handoff`, `Open Roadmap Questions`, `Parked`, `Milestone History`, `Done`. Gdy `Streams` są obecne, liczba wynosi 13; bez nich, 12.
3. **Schemat dla każdego wpisu** — każdy S-NN ma 9 obowiązkowych pól (`Outcome`, `Change ID`, `PRD refs`, `Prerequisites`, `Parallel with`, `Blockers`, `Unknowns`, `Risk`, `Status`). Każdy F-NN ma te pola plus `Unlocks`.
4. **Pokrycie PRD** — każdy FR typu `must-have` z PRD (grep `^- FR-\d{3}: .* must-have$`) pojawia się w co najmniej jednym `PRD refs` fragmentu. To samo dotyczy każdego `### US-NN:`. Jeśli must-have nie jest pokryty, samokontrola NIE POWODZI SIĘ.
5. **Integralność grafu zależności** — brak cykli. Każdy identyfikator wymieniony w `Prerequisites` istnieje gdzieś w dokumencie. Kolejność w `## Foundations` i `## Slices` to sortowanie topologiczne: żaden fragment nie zależy od czegoś, co pojawia się po nim.
6. **Spójność tabeli „W skrócie”** — wiersze tabeli odpowiadają treściom sekcji. `Change ID`, `Prerequisites`, `PRD refs`, `Status` każdego wiersza odpowiadają dosłownie polom treści.
7. **Spójność statusu** — każdy `blocked` fragment ma co najmniej jedną niewiadomą z `Block: yes`. Każdy `ready` fragment ma wszystkie wymagania wstępne już w stanie `done` (dzisiaj oznacza to: brak wymagań wstępnych LUB wszystkie wymagania wstępne to podstawy, które baza zgłasza jako `present`).
8. **Brak wymyślonych fragmentów** — `PRD refs` każdego fragmentu zawiera co najmniej jeden rzeczywisty identyfikator kotwicy źródłowej: identyfikator PRD (`FR-\d{3}` lub `US-\d{2}`) dla kamieni milowych pochodzących z PRD, lub kotwicę karty `MS-\d{2}` dla kamieni milowych pochodzących z opisu. Mieszane źródła mogą mieszać typy identyfikatorów, ale każda kotwica musi istnieć w dokumencie źródłowym lub w karcie `## Milestone`.
9. **Spójność bazy ↔ podstaw** — żadna podstawa nie tworzy ponownie warstwy, którą sekcja `## Baseline` zgłasza jako `present`. Jeśli baza mówi, że uwierzytelnianie jest obecne, a nadal istnieje `F-NN` dla szkieletu uwierzytelniania, jest to błąd samokontroli (albo baza jest błędna, albo podstawa jest zbędna).
10. **Umowa o włączaniu podstaw** — każda podstawa ma wypełnione `Unlocks` co najmniej jednym fragmentem `S-NN` niższego szczebla, nazwaną blokującą niewiadomą lub nazwaną ścieżką weryfikacji. Ogólna podstawa, taka jak „warstwa bazy danych” bez powodu niższego szczebla, jest błędem samokontroli.
11. **Integralność Change ID** — każdy F-NN i S-NN ma unikalny Change ID w formacie kebab-case; każdy F-NN i S-NN pojawia się dokładnie raz w `## Backlog Handoff`; każdy wiersz przekazania odwołuje się do istniejącego ID mapy drogowej i powtarza ten sam Change ID. Brak spacji, dat, etykiet statusu lub ID mapy drogowej jako Change ID.
12. **Równowaga granulacji fragmentów** — żaden `S-NN` nie może pochłonąć większości nietrywialnego PRD, podczas gdy pozostałe fragmenty są drobnymi resztkami. Jeśli jeden fragment odnosi się do większości FR typu must-have, więcej niż dwóch niepowiązanych wpisów US-NN, wielu głównych akcji użytkownika lub niepowiązanych ryzyk/niewiadomych, samokontrola NIE POWODZI SIĘ, chyba że PRD naprawdę ma tylko jeden widoczny dla użytkownika przepływ pracy. Napraw to, dzieląc na węższe pionowe wyniki, a nie tworząc fragmenty warstw.
13. **Limit zakresu podstaw** — żadna podstawa nie może ukończyć całej warstwy z wyprzedzeniem. Wynik i ryzyko muszą pokazywać minimalną umowę umożliwiającą, a `Unlocks` musi nazywać pionowe fragmenty, które nadal będą integrować tę warstwę poprzez zachowanie widoczne dla użytkownika. Jeśli podstawa brzmi jak „zbuduj warstwę danych/API/UI/uwierzytelniania”, samokontrola NIE POWODZI SIĘ. Podziel ją, zawęź lub włącz minimalną potrzebną pracę do pierwszego konsumującego `S-NN`.
14. **Progresywne ujawnianie elementów technicznych** — każdy przekrojowy element techniczny pojawia się albo w pierwszym pionowym fragmencie, który go potrzebuje, albo w podstawie, która jest wymagana, zanim ten fragment będzie mógł być zaplanowany, zweryfikowany lub bezpieczny. Jeśli element techniczny jest wprowadzany tylko dlatego, że będzie przydatny później, samokontrola NIE POWODZI SIĘ, a ta praca przenosi się do pierwszego fragmentu, który faktycznie go używa.
15. **Pokrycie strumieni** (tylko jeśli sekcja `## Streams` została wygenerowana) — każdy `F-NN` i każdy `S-NN` wymieniony w `## At a glance` pojawia się dokładnie w jednej komórce `Chain` strumienia. Duplikaty i pominięcia powodują błąd. Komórki Chain odwołują się tylko do istniejących identyfikatorów mapy drogowej (brak wymyślonych identyfikatorów). Liczba strumieni wynosi 2–5. Jeśli dokument ma < 2 kandydatów na strumienie, sekcja powinna zostać pominięta (limit Kroku 6h).
16. **Integralność kamienia milowego** — `milestone_status` jest `open` przy generowaniu; `milestone_seq` jest o 1 większy niż najwyższy zamknięty `M-<seq>` w `## Milestone History` (1, gdy historia jest pusta); karta `## Milestone` `M-<seq>` odpowiada `milestone_seq`; każda kotwica `MS-NN` odwołująca się do dowolnego fragmentu istnieje w karcie; `## Milestone History` została przeniesiona dosłownie (nigdy nie edytowana, nigdy nie skracana) przy regeneracji i otwieraniu następnego kamienia milowego.
17. **Terminy strategiczne są definiowane w tekście** — przeskanuj wygenerowaną treść pod kątem listy żargonu z zasady 13; każdy wymieniony termin, który się pojawia, musi zawierać swoją jednolinijkową definicję w **pierwszym** wystąpieniu (identyfikatory w stylu `FR-001`/`S-02` i nazwy własne narzędzi/usług są zwolnione). Niezdefiniowane pierwsze użycie POWODZI SIĘ; termin, którego nie można zdefiniować w jednym zdaniu, zostaje zastąpiony prostym językiem i ponownie wygenerowany.

Jeśli którykolwiek z testów zakończy się niepowodzeniem, **przerwij zapis** i zgłoś konkretną awarię:

```
Samokontrola mapy drogowej NIE POWIODŁA SIĘ:

  - <konkretna awaria, np. „FR-007 (must-have) nie jest pokryty przez żaden fragment”
     lub „Fragment S-04 wymienia S-06 w wymaganiach wstępnych, ale S-06 pojawia się później w dokumencie”
     lub „F-02 (szkielet uwierzytelniania) jest zbędny — baza zgłasza uwierzytelnianie jako obecne”>
  - ...

Mapa drogowa NIE została zapisana. Napraw awarię i wygeneruj ponownie, lub — jeśli test jest
błędny — zgłoś błąd umiejętności. Przerwania samokontroli chronią narzędzia niższego szczebla przed
dryfem.
```

Następnie ZATRZYMAJ.

### Krok 9: Sprawdzenie kolizji

```bash
test -f context/foundation/roadmap.md
```

Jeśli plik nie istnieje, zapisz do `context/foundation/roadmap.md` i przejdź do Kroku 10.

Jeśli plik istnieje, konwencja dokumentacji podstawowej to **edycja na miejscu** dla stopniowego dopracowywania, **archiwizacja, a następnie zastąpienie** dla pełnej regeneracji. Ta umiejętność tworzy *pełną* mapę drogową z PRD; precyzyjne dopracowywanie wykracza poza zakres. Domyślnie więc archiwizuj, a następnie zastąp, ale zapytaj za pomocą wybranego interaktywnego narzędzia do pytań:

Zapytaj użytkownika:
- question: "context/foundation/roadmap.md już istnieje. Jak chcesz postąpić?"
  header: "Kolizja"
  options:
  - label: "Archiwizuj i zastąp (Zalecane)"
    description: "Przenieś istniejący plik do context/foundation/archive/<dzisiaj>-roadmap.md, a następnie zapisz nową mapę drogową. Historia zachowana zgodnie z konwencją README podstawy."
  - label: "Nadpisz bez archiwizacji"
    description: "Zastąp na miejscu. Istniejąca zawartość zostanie utracona (chyba że ją zatwierdziłeś). Użyj tylko, jeśli istniejąca mapa drogowa jest pusta lub tymczasowa."
  - label: "Anuluj"
    description: "Wyjdź bez zapisów. Brak rozwiązania kolizji."
  multiSelect: false

W przypadku „Archiwizuj i zastąp”: utwórz `context/foundation/archive/`, jeśli brakuje, przenieś istniejący plik do `context/foundation/archive/<dzisiaj>-roadmap-<milestone_id>.md` (dzisiejsza data w formacie `RRRR-MM-DD`; usuń sufiks `-<milestone_id>` dla starszych plików bez niego), a następnie zapisz nową zawartość. Jeśli plik już istnieje pod tą ścieżką archiwum (regenerowany dwukrotnie w ciągu jednego dnia), dodaj `-2`, `-3` itd.

W przypadku „Nadpisz bez archiwizacji”: zapisz nową zawartość, nadpisując na miejscu.

W przypadku „Anuluj”: ZATRZYMAJ.

### Krok 10: Przekazanie

Po zapisie, podsumuj:

```
═══════════════════════════════════════════════════════════
  MAPA DROGOWA WYGENEROWANA
═══════════════════════════════════════════════════════════

  Projekt:           <projekt>
  Kamień milowy:         M-<seq>: <nazwa>  (<milestone_id>)  —  otwarty
  Ścieżka:              context/foundation/roadmap.md
  Główny cel:         <main_goal>            (stronniczość sekwencjonowania)
  #1 bloker:        <top_blocker>          (co planować)
  Baza obecna:  <warstwy zgłoszone jako obecne, oddzielone przecinkami>
  Podstawy:       <liczba>
  Fragmenty:            <liczba>
  Podział statusu:  ready: N  |  proposed: M  |  blocked: K
  Pokrycie PRD:      <pokryte FR typu must-have> / <wszystkie FR typu must-have>
  Otwarte pytania mapy drogowej:    <liczba>
  Zaparkowane elementy:      <liczba>

  Gwiazda północna:  <ID fragmentu> — <Wynik>

═══════════════════════════════════════════════════════════
```

Następnie **zarekomenduj jeden następny ruch** — nie oddawaj listy „gotowych” i nie proś użytkownika o wybór. Wybierz jeden element mapy drogowej do zaplanowania jako pierwszy i uzasadnij to w jednej linii. Użytkownik może nadpisać, ale domyślna powierzchnia to rekomendacja, a nie menu.

**Zasada wyboru zalecanego następnego ruchu** (stosuj w kolejności, pierwsze dopasowanie wygrywa):

1. Jeśli gwiazda północna jest `ready`, zarekomenduj ją. Gwiazda północna to kamień milowy walidacji; odkładanie jej w czasie powoduje utratę sygnału.
2. W przeciwnym razie, jeśli podstawa, od której gwiazda północna bezpośrednio zależy, jest `ready`, zarekomenduj tę podstawę i wyraźnie powiedz „to odblokowuje gwiazdę północną <S-NN>”.
3. W przeciwnym razie, jeśli żaden fragment nie jest `ready`, zarekomenduj rozwiązanie pytania otwartego lub blokera o największym wpływie (tego, który odblokowuje najwięcej elementów niższego szczebla). Żaden ruch planistyczny nie jest dostępny, dopóki to nie zostanie rozwiązane.
4. W przeciwnym razie zarekomenduj fragment `ready`, który odblokowuje najwięcej elementów niższego szczebla (największe rozgałęzienie w grafie zależności). Rozstrzygnij remisy według głównego celu (Krok 6d).

Format:

```
► **Twój następny ruch:** `/10x-plan <change-id>` na **<ID mapy drogowej>: <Wynik>**.

  Dlaczego ten jako pierwszy: <jedno zdanie — kluczowy powód: to JEST gwiazda
  północna / odblokowuje gwiazdę północną / ma największe rozgałęzienie / to
  najmniejsza kompleksowa walidacja, którą możemy teraz wysłać>.

  Następnie, w kolejności: <następny gotowy ID>: <Wynik> → <następny>: <Wynik>.
  (Pełna lista w `## Backlog Handoff`.)

  Zablokowane — pozostają zaparkowane, dopóki ich niewiadome nie zostaną rozwiązane:
    - <ID fragmentu>: <Niewiadoma> (Właściciel: <kto>)
    - ...
  (Rozwiązanie któregokolwiek z nich podnosi status fragmentu do `ready` i zmienia moją
  rekomendację; wróć, a ponownie zarekomenduję.)
```

Jeśli żaden fragment nie jest `ready` i żadna podstawa również nie jest `ready` (przypadek 3), zastąp rekomendację:

```
► **Brak dostępnego ruchu planistycznego.** Każdy fragment jest zablokowany.
  Najważniejsza niewiadoma do rozwiązania:

    <Pytanie> — Właściciel: <kto>. Odblokowuje: <S-NN, S-MM, ...>.

  Rozwiązanie tego promuje <liczba> fragmentów i jest jedyną zmianą, która
  najbardziej otwiera mapę drogową. Rozwiąż to, a następnie ponownie wywołaj `/10x-roadmap`, aby
  ponownie zarekomendować.
```

ZATRZYMAJ. Nie łącz automatycznie z inną umiejętnością — użytkownik decyduje, kiedy planować. Ale NIE obniżaj rekomendacji do listy wielokrotnego wyboru; jeśli użytkownik chce innego fragmentu, mówi o tym.

## Krytyczne zasady bezpieczeństwa

1. **Materiały źródłowe są źródłem.** Każdy fragment odnosi się do identyfikatora kotwicy źródłowej — identyfikatorów PRD (`FR-NNN`/`US-NN`) dla kamieni milowych pochodzących z PRD, kotwic karty `MS-NN` dla kamieni milowych pochodzących z opisu. Ramowanie z Kroku 5 ujawnia kontekst celu/gwiazdy północnej/inwestycji/blokera wywnioskowany ze źródeł; baza ujawnia to, co już istnieje; żadne z nich nie rozszerza źródeł. Elementy mapy drogowej bez śledzenia źródła są błędem samokontroli.

2. **Najpierw fragmenty pionowe.** Fragment dostarcza widoczną dla użytkownika funkcjonalność od początku do końca. Fragmenty poziome („warstwa API”, „schemat”) to antywzorzec, któremu ta umiejętność ma zapobiegać. Podstawy są *jedynym* wyjątkiem — są to jawnie przekrojowe elementy umożliwiające, znajdują się w osobnej sekcji, zawierają `Unlocks` i są oznaczone `(foundation)`, aby żaden czytelnik nie pomylił ich z pracą widoczną dla użytkownika.

3. **Zrównoważona granulacja bez szacunków.** Fragmenty nie otrzymują etykiet rozmiaru, ale ich zakres musi być porównywalny. Mapa drogowa, w której `S-01` zawiera prawie całe PRD, a `S-02`/`S-03` to drobne resztki, jest złą mapą drogową. Podziel zbyt duże elementy według węższych, widocznych dla użytkownika wyników, faz przepływu pracy, person lub granic ryzyka — nigdy według warstwy technicznej.

4. **Podstawy to minimalne odblokowania, a nie projekty ukończenia warstw.** Podstawa może stworzyć najmniejszy warunek wstępny potrzebny do rozpoczęcia pracy pionowej. Nie może wstępnie budować całej warstwy bazy danych/API/UI/uwierzytelniania. Jeśli element techniczny może być wprowadzony w pierwszym fragmencie widocznym dla użytkownika, który go potrzebuje, umieść go tam; to utrzymuje integrację pionową i stopniowo ujawnia tylko potrzebne elementy.

5. **Brak szacunków, brak jednostek czasu.** Brak „Dzień 1”, brak „2 tygodnie”, brak „mały/średni/duży”, brak punktów. Wykonanie agenta AI jest nieliniowe, a szacunki budżetowane czasowo kłamią. Kolejność jest zakodowana w wymaganiach wstępnych; tempo jest ujawniane poprzez blokery i niewiadome. Mapa drogowa opisuje kształt, a nie harmonogram.

6. **Brak niskopoziomowych szczegółów technicznych.** Brak nazw frameworków (te znajdują się w `tech-stack.md`), brak ścieżek plików, brak definicji schematów, brak kodu, brak wyborów bibliotek. Jeśli zauważysz, że to piszesz, przekroczyłeś terytorium `/10x-plan` — zatrzymaj się i pozwól `/10x-plan` wykonać swoją pracę w dół.

7. **Ujawnij niewiadome, nie tuszuj ich.** Niewiadome dotyczące poszczególnych fragmentów z `Block: yes` promują `Status: blocked`. Przekrojowe niewiadome trafiają do `## Open Roadmap Questions`. Jeśli PRD ma TODO, mapa drogowa dziedziczy je jako niewiadome zablokowanych fragmentów. Wartość mapy drogowej polega częściowo na pokazywaniu użytkownikowi, co JESZCZE nie jest możliwe do zaplanowania.

8. **Baza jest automatycznie badana, a nie pytana.** Nie pytaj użytkownika „co już jest na miejscu?” — uruchom równoległe subagenty Explore (Krok 4) i pozwól bazie kodu odpowiedzieć. Następnie poproś użytkownika tylko o potwierdzenie lub poprawienie. Jest to umowa, która sprawia, że Foundations są uczciwe: podstawa istnieje tylko wtedy, gdy baza mówi, że warstwa jest nieobecna lub częściowa.

9. **Samokontrola przerywa w przypadku dryfu.** Brak wymaganych sekcji, uszkodzony graf zależności, niepokryte FR typu must-have, wymyślone fragmenty, zbyt duże fragmenty, ukończenie warstwy podstawowej, sprzeczności między bazą a podstawami — wszystko to przerywa zapis z konkretnym błędem. Brak cichej poprawki.

10. **Konwencja dokumentacji podstawowej.** `roadmap.md` to dokument podstawowy zgodnie z `context/foundation/README.md`. Domyślna obsługa kolizji to archiwizacja, a następnie zastąpienie (historia trafia do `foundation/archive/<dzisiaj>-roadmap.md`); precyzyjne dopracowywanie wykracza poza zakres tej umiejętności (edytuj ręcznie, jeśli tego potrzebujesz).

11. **Tylko uniwersalny język.** Brak odniesień do 10xDevs / kohorty / certyfikacji w jakimkolwiek wyjściu widocznym dla użytkownika lub w jakimkolwiek artefakcie zapisanym na dysku. Umiejętność jest ogólnym generatorem map drogowych.

12. **Nigdy nie łącz automatycznie.** Krok 10 to ogłoszenie, a nie wywołanie. Użytkownik wybiera, kiedy (i który) fragment przekazać do `/10x-plan`. Automatyczne łączenie pominęłoby recenzję wygenerowanej mapy drogowej przez człowieka.

13. **Definiuj terminy strategiczne w tekście przy pierwszym użyciu.** Słownictwo strategii produktu — `wedge`, `beachhead`, `north star`, `validation milestone`, `primary metric`, `must-have path`, `product-market fit`, `thin end of the wedge`, `riskiest assumption`, `core hypothesis` — to wewnętrzny skrót umiejętności i PRD, a nie wiedza powszechna; mapa drogowa musi być czytelna dla członka zespołu (lub przyszłego siebie), który nie przeszedł kursu strategii produktu. Przy PIERWSZYM wystąpieniu dowolnego takiego terminu w treści dokumentu, dołącz jednolinijkową definicję w tekście (w nawiasie, z myślnikiem lub krótkim zdaniem uzupełniającym); nie powtarzaj jej później. Jeśli pojęcia nie można zdefiniować w jednym zdaniu, zastąp je prostym językiem („najmniejszy kompleksowy przepływ, który udowadnia, że produkt działa” jest lepsze niż „klin”, którego nie można skompresować w jedną klauzulę). Dotyczy to prozy widocznej dla użytkownika w wygenerowanym dokumencie — nie pytań wywiadowych (5g je obejmuje) ani semantyki pól tego pliku. Sprawdzenie samokontroli nr 17 to egzekwuje.

14. **Oszczędny wywiad z silnymi rekomendacjami — nie ciche automatyczne ramowanie, nie nieograniczone odkrywanie.** Zasady z Kroku 5 są normatywne: maksymalnie 3 pytania kotwiczne (`main_goal`, `north_star`, `top_blocker`), obszary inwestycji wywodzone, a nie pytane, każde pytanie jedna rekomendacja oparta na cytowanej linii artefaktu plus 1-2 prawdziwe alternatywy (słomiane kukły zabronione), pominięcia tylko wtedy, gdy artefakty dosłownie określają wartość, dalsze pytania tylko w ramach wyjątku niestandardowego MVP (5f). Zalecany następny ruch z Kroku 10 to ta sama zasada zastosowana do przekazania: jedna rekomendacja z jednolinijkowym uzasadnieniem, a nie lista „gotowych do planowania”, którą użytkownik musi sortować.

15. **Kamienie milowe zapętlają się, ale nigdy nie są ograniczone czasowo.** Dokładnie jeden kamień milowy otwarty w danym momencie; zamyka się tylko wtedy, gdy każdy F-NN/S-NN jest `done` (lub użytkownik jawnie go porzuca), a następnie pętla otwiera się ponownie z nowymi materiałami źródłowymi lub opisem użytkownika. Stan kamienia milowego jest wywodzony wyłącznie z `roadmap.md` — brak plików bocznych. Specyfikacja cyklu życia znajduje się w `references/milestone-state.md`, ładowana TYLKO dla operacji na poziomie kamienia milowego (rozdzielenie w Kroku 0). Umiejętności niższego szczebla pozostają ślepe na kamienie milowe; ta umiejętność wykrywa ukończenie kamienia milowego przy następnym wywołaniu.

## Uwagi

- Ta umiejętność to **generator dokumentów plus śledzenie kamieni milowych**. Wynikiem jest `context/foundation/roadmap.md`, kropka. Planowanie poszczególnych zmian odbywa się w `/10x-plan`.
- Sonda bazowa (Krok 4) zastępuje to, co kiedyś było pytaniem „co już jest na miejscu?”. Subagenci są tańsi niż uwaga użytkownika, a baza kodu jest bardziej niezawodna niż pamięć.
- Gdy umiejętność regeneruje istniejącą mapę drogową, zarchiwizowana poprzednia wersja jest najczystszym celem różnicowania, aby zobaczyć, jak zmieniło się zrozumienie projektu — to jest udogodnienie, dla którego zaprojektowano konwencję dokumentacji podstawowej.