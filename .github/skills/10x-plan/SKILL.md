---
name: 10x-plan
description: Create detailed implementation plans with thorough research and iteration
---

# Plan implementacji

Twoim zadaniem jest tworzenie szczegółowych planów implementacji poprzez interaktywny, iteracyjny proces. Powinieneś być sceptyczny, dokładny i współpracować z użytkownikiem, aby tworzyć wysokiej jakości specyfikacje techniczne.

## Początkowa odpowiedź

Po wywołaniu tej komendy:

1. **Sprawdź, czy podano parametry**:
   - Jeśli jako parametr podano ścieżkę pliku lub odniesienie do zgłoszenia, pomiń domyślną wiadomość
   - Natychmiast W PEŁNI odczytaj wszystkie podane pliki
   - Rozpocznij proces badawczy

2. **Jeśli nie podano parametrów**, odpowiedz:

```
Pomogę Ci stworzyć szczegółowy plan implementacji. Zacznijmy od zrozumienia, co budujemy.

Proszę podać:
1. Opis zadania/zgłoszenia (lub odniesienie do pliku zgłoszenia)
2. Wszelkie istotne konteksty, ograniczenia lub specyficzne wymagania
3. Linki do powiązanych badań lub poprzednich implementacji

Im więcej kontekstu dostarczysz, tym mniej pytań zadam:
- Tylko opis zadania → pełne pytania
- Zadanie + dokument badawczy (`context/changes/<change-id>/research.md`) → mniej pytań; nie będę powtarzać tego, co zostało omówione w badaniach
- Zadanie + brief ramowy (`context/changes/<change-id>/frame.md`) → znacznie mniej pytań; problem jest już sformułowany
- Zadanie + ramka + badania → minimalna liczba pytań; skupiam się tylko na decyzjach dotyczących projektowania rozwiązania, które wymagają Twojego wkładu

Wskazówka: wywołaj bezpośrednio z change-id lub ścieżką — `/10x-plan oauth-login` lub `/10x-plan @context/changes/oauth-login/frame.md`
Aby uzyskać głębszą analizę, spróbuj: `/10x-plan think deeply about @context/changes/oauth-login/research.md`
```

Następnie poczekaj na dane wejściowe użytkownika.

## Kroki procesu

### Krok 1: Gromadzenie kontekstu i wstępna analiza

#### Krok 1.0: Identyfikacja artefaktów nadrzędnych i skalowanie głębokości pytań

Przed jakimkolwiek czytaniem, zidentyfikuj, jakie rodzaje artefaktów nadrzędnych przekazał użytkownik. Każdy z nich reprezentuje już podjęte decyzje — nie pytaj o nie ponownie.

- **Brief ramowy** — ścieżka pasuje do `context/changes/<change-id>/frame.md`, lub zawartość zaczyna się od `# Frame Brief:` / zawiera sekcję `## Reframed`.
- **Dokument badawczy** — ścieżka pasuje do `context/changes/<change-id>/research.md`, lub YAML frontmatter zawiera pola `topic:` i `researcher:`.
- **Istniejący plan** — ścieżka pasuje do `context/changes/<change-id>/plan.md` (tryb wznowienia/dopracowania — poza zakresem tej logiki skalowania).
- **Tylko opis zadania** — żadne z powyższych.

**Liczba pytań i ich zakres skalują się wraz z dostarczonymi informacjami:**

| Artefakty nadrzędne         | NISKI | ŚREDNI | WYSOKI | Co zmienia się w porównaniu do bazowego                                                                                                              |
| --------------------------- | ----- | ------ | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tylko zadanie (bazowe)      | 4–6   | 7–10   | 11–15 | Pełne pytania we wszystkich odpowiednich kategoriach.                                                                                                |
| Zadanie + badania           | 3–5   | 5–7    | 8–11  | Pomiń pytania, których odpowiedź znajduje się już w dokumencie badawczym. Nie odradzaj podagentów, aby znaleźć to, co już zostało zmapowane w badaniach. |
| Zadanie + ramka             | 2–3   | 4–6    | 7–9   | Pomiń kategorie [D]iagnostyczne — ramka ustaliła sformułowanie problemu. Traktuj przeformułowane (lub potwierdzone) oświadczenie problemowe jako autorytatywne. |
| Zadanie + ramka + badania   | 1–2   | 3–5    | 5–7   | Pomiń oba. Zadawaj tylko pytania dotyczące projektowania rozwiązania [S], które naprawdę wymagają wkładu użytkownika.                                |

**Zasada**: każdy przekazany artefakt jest źródłem już podjętych decyzji. Czytanie ich liczy się jako słuchanie użytkownika. Nie pytaj użytkownika o to, co już napisał.

**Gdy obecna jest ramka**, przeczytaj ją W PEŁNI i traktuj jako autorytatywną:
- Skopiuj **Zgłoszoną Obserwację** + **Przeformułowane (lub Potwierdzone) Oświadczenie Problemowe** jako definicję zadania. Nie kwestionuj ponownie ramki.
- Przenieś tabelę **Badanie Hipotez** i **Sygnały Zwężające** do swojej "Analizy Stanu Obecnego" — ta praca jest już wykonana.
- Jeśli ramka ma flagę **Confidence: LOW**, uwzględnij to w "Otwartych Ryzykach i Założeniach" planu i zadaj JEDNO pytanie wyjaśniające, jak postępować (najpierw zweryfikuj, lub planuj z uwzględnieniem ryzyka).
- NIE badaj ponownie ramki. Ramka odpowiada za sformułowanie problemu; Ty odpowiadasz za projekt rozwiązania.

**Gdy obecne są badania**, przeczytaj je W PEŁNI i użyj jako bazę kodu:
- Sekcja "Code References" JEST Twoim ugruntowaniem bazy kodu — nie odradzaj agentów Explore, aby znaleźć te same pliki.
- "Architecture Insights" bezpośrednio zasilają "Current State Analysis".
- Odradzaj podagentów tylko w celu wypełnienia konkretnych luk, których badania nie objęły (np. dokładne pliki, które ten plan zmodyfikuje, jeśli badania były szersze).

#### Krok 1.1: Czytanie i badania

1. **Natychmiast i W PEŁNI przeczytaj wszystkie wymienione pliki**:
   - Pliki referencyjne (np. `context/changes/<change-id>/research.md`, `context/changes/<change-id>/frame.md`)
   - Dokumenty badawcze
   - Briefy ramowe
   - Powiązane plany implementacji
   - Wszelkie wymienione pliki JSON/danych
   - `context/foundation/lessons.md`, jeśli istnieje — traktuj jego zasady jako priorytety podczas badania zakresu, przypadków brzegowych i wyborów architektonicznych; zasady już zaakceptowane przez zespół zawężają, które pułapki projektowe nadal wymagają świeżego kwestionowania.
   - **WAŻNE**: Czytaj pliki BEZ parametrów limit/offset, aby przeczytać całe pliki
   - **KRYTYCZNE**: NIE odradzaj podzadań przed samodzielnym przeczytaniem tych plików w głównym kontekście
   - **NIGDY** nie czytaj plików częściowo - jeśli plik jest wymieniony, przeczytaj go w całości

2. **Odradzaj początkowe zadania badawcze w celu zebrania kontekstu** (pomiń lub zawęź na podstawie Kroku 1.0):
   Zanim zadasz użytkownikowi jakiekolwiek pytania, użyj narzędzia Task z równoległymi podagentami do zbadania:
   - **Agent Explore** (`subagent_type: "Explore"`) — znajdź wszystkie pliki związane z zadaniem, szukaj wzorców, śledź ścieżki kodu. Użyj do odkrywania plików i pytań dotyczących struktury bazy kodu.
   - **Agent ogólnego przeznaczenia** (`subagent_type: "general-purpose"`) — do głębszej analizy, która może wymagać przeczytania wielu plików i syntezy wyników. Użyj do zrozumienia złożonych systemów.

   Przykład: odradzaj 2-3 agentów Explore równolegle dla różnych wymiarów wyszukiwania (np. "znajdź wszystkie pliki związane z X", "znajdź podobne implementacje Y", "znajdź wcześniejsze decyzje dotyczące Z w `context/changes/**/` i `context/archive/**/`").

   Ci agenci będą:
   - Znajdować odpowiednie pliki źródłowe, konfiguracje i testy
   - Śledzić przepływ danych i kluczowe funkcje
   - Zwracać szczegółowe wyjaśnienia z odniesieniami file:line

3. **Przeczytaj wszystkie pliki zidentyfikowane przez zadania badawcze**:
   - Po zakończeniu zadań badawczych, przeczytaj WSZYSTKIE pliki, które zidentyfikowały jako istotne
   - Przeczytaj je W PEŁNI do głównego kontekstu
   - Zapewnia to pełne zrozumienie przed kontynuowaniem

4. **Analizuj i weryfikuj zrozumienie**:
   - Porównaj wymagania zgłoszenia z rzeczywistym kodem
   - Zidentyfikuj wszelkie rozbieżności lub nieporozumienia
   - Zanotuj założenia, które wymagają weryfikacji
   - Określ prawdziwy zakres na podstawie rzeczywistości bazy kodu

5. **Przedstaw świadome zrozumienie i oceń złożoność**:

   Najpierw przedstaw krótkie podsumowanie tego, co znalazłeś:

   ```
   Na podstawie [zgłoszenia i moich badań bazy kodu / Twojego opisu i mojej analizy], rozumiem, że musimy [dokładne podsumowanie].

   Znalazłem, że:
   - [Kluczowe odkrycie — odniesienie do kodu, istniejący zasób, wcześniejsza praca lub ograniczenie domenowe]
   - [Odpowiedni wzorzec, konwencja lub odkryte ograniczenie]
   - [Zidentyfikowana potencjalna złożoność lub przypadek brzegowy]
   ```

   Następnie oceń złożoność zadania i przedstaw ją użytkownikowi do potwierdzenia:

   ```
   **Ocena złożoności: [WYSOKA / ŚREDNIA / NISKA]**

   [2-3 zdaniowe wyjaśnienie, DLACZEGO ten poziom złożoności, odwołujące się do konkretnych czynników:
   liczba dotkniętych systemów, punkty integracji, potrzeby zarządzania stanem,
   zmiany modelu danych, nieznane niewiadome, obszar testowania itp.]

   Chciałbym zadać **[N] pytań** w kilku rundach, aby ustalić ważne
   decyzje dotyczące [wymień kluczowe obszary decyzyjne: architektura, przypadki brzegowe, model danych, UX, testowanie itp.].

   Czy to wydaje się słuszne, czy chciałbyś dostosować poziom złożoności?
   ```

   Zapytaj użytkownika: "Czy ta ocena złożoności odpowiada Twoim oczekiwaniom?" z opcjami:
   - "Zgadzam się — przejdź do [N] pytań" (opis: "Ocena jest dokładna, przejdźmy do szczegółów.")
   - "Wyższa — zadaj więcej pytań" (opis: "Jest więcej złożoności niż zidentyfikowano. Wyjaśnię, czego brakuje.")
   - "Niższa — potrzeba mniej pytań" (opis: "To jest prostsze niż się wydaje. Skupmy się na tym.")

   **Skala złożoności:**

   | Poziom     | Pytania | Kiedy używać                                                                                                                                                                                                                                                                                                           |
   | ---------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
   | **NISKI**  | 4-6     | Proste zadanie z jasnymi wymaganiami. Niewiele ruchomych części, zgodne z ustalonymi wzorcami lub konwencjami, ograniczone niewiadome. Przykłady oprogramowania: zmiana pojedynczego pliku, drobna zmiana konfiguracji. Przykłady poza oprogramowaniem: zarys pojedynczego tematu, prosta zmiana procesu.                 |
   | **ŚREDNI** | 7-10    | Wiele komponentów lub rozważań, które współdziałają. Wymaga decyzji projektowych, ma przypadki brzegowe warte omówienia, pewna niejednoznaczność w podejściu. Przykłady oprogramowania: funkcja obejmująca wiele plików, nowy punkt końcowy API. Przykłady poza oprogramowaniem: wieloczęściowy plan treści, przeprojektowanie przepływu pracy, moduł kursu. |
   | **WYSOKI** | 11-15   | Zagadnienia przekrojowe, znaczące niewiadome, wielu interesariuszy lub ograniczeń. Wymaga myślenia architektonicznego, wiąże się z ryzykiem kosztownej przeróbki, jeśli jest błędne. Przykłady oprogramowania: przeprojektowanie systemu, migracja danych. Przykłady poza oprogramowaniem: strategia uruchomienia wielokanałowego, przegląd programu nauczania, zmiana procesu organizacyjnego. |

   Po potwierdzeniu (lub dostosowaniu) przez użytkownika, przejdź do zadawania pytań.

6. **Zadawaj głębokie, dociekliwe pytania**:

   Zadaj potwierdzoną liczbę pytań w kilku rundach (1-4 pytania na rundę, tyle rund, ile potrzeba).

   **Zasady strukturyzowania pytań:**
   - Każde pytanie powinno mieć 2-4 konkretne opcje
   - Użyj `multiSelect: true` tylko wtedy, gdy wybory nie wykluczają się wzajemnie
   - Nagłówek `header` powinien być krótki (maks. 12 znaków): "Zakres", "Przypadki brzegowe", "Priorytet"
   - Użytkownik zawsze może wybrać "Inne" dla swobodnego wprowadzania

   **Każda opcja MUSI zawierać sygnał rekomendacji i analizę kompromisów:**
   - Oznacz dokładnie jedną opcję jako `⭐ Recommended` w jej etykiecie
   - `description` każdej opcji musi mieć następujący format:
     `[1-zdaniowe co to robi] · Siła: [kluczowa zaleta] · Kompromis: [kluczowy koszt lub ryzyko]`
   - Rekomendacja powinna być oparta na badaniach (wzorce bazy kodu dla oprogramowania, wiedza domenowa i kontekst dla zadań poza oprogramowaniem) — a nie na zgadywaniu

   **Przykład pytania z rekomendacjami (oprogramowanie):** `Conflicts` to `[S]` — architektura rozwiązania; zawsze zadawane, nawet jeśli ramka zdefiniowała problem.

   Zapytaj użytkownika: "Jak system powinien obsługiwać konflikty, gdy dwóch użytkowników edytuje jednocześnie?" z opcjami:
   - "Ostatni zapis wygrywa" (opis: "Późniejszy zapis cicho nadpisuje wcześniejszy. · Siła: Zero dodatkowej złożoności, nie są potrzebne zmiany UI. · Kompromis: Użytkownicy mogą stracić pracę bez ostrzeżenia — akceptowalne tylko, jeśli edycje są rzadkie lub mało istotne.")
   - "⭐ Zalecane: Powiadom i scal" (opis: "Pokaż konflikt użytkownikowi, pozwól mu wybrać, którą wersję zachować. · Siła: Zapobiega utracie danych, jednocześnie utrzymując prosty UX — pasuje do wzorca w istniejącym komponencie EditPanel. · Kompromis: Dodaje modal rozwiązywania konfliktów i subskrypcję WebSocket do wykrywania w czasie rzeczywistym.")
   - "Oparte na blokadach" (opis: "Pierwszy edytor blokuje zasób; inni widzą tylko do odczytu, dopóki nie zostanie zwolniony. · Siła: Całkowicie zapobiega konfliktom — najprostszy model mentalny dla użytkowników. · Kompromis: Zastarzałe blokady wymagają TTL + logiki czyszczenia; blokuje legalną równoczesną pracę.")

   **Przykład pytania z rekomendacjami (poza oprogramowaniem — treść/strategia):** `Depth` to `[D]` — diagnostyczne dotyczące odbiorców/zakresu; pomiń, jeśli brief ramowy już ustalił, dla kogo to jest.

   Zapytaj użytkownika: "Jaki poziom szczegółowości technicznej powinien mieć moduł kursu?" z opcjami:
   - "Przegląd koncepcyjny" (opis: "Zasady wysokiego poziomu, bez kodu. · Siła: Dostępne dla wszystkich poziomów umiejętności, szybsze w produkcji. · Kompromis: Zaawansowani uczniowie mogą uznać to za zbyt płytkie — ryzyko utraty zaangażowania.")
   - "⭐ Zalecane: Praktyczne z przykładami z przewodnikiem" (opis: "Koncepcje połączone z ćwiczeniami krok po kroku. · Siła: Równoważy zrozumienie i praktykę — pasuje do formatu, który uzyskał najwyższe wskaźniki ukończenia w 10xDevs2. · Kompromis: 2-3 razy więcej czasu na przygotowanie na lekcję; wymaga działających repozytoriów przykładów.")
   - "Głębokie zanurzenie z otwartymi wyzwaniami" (opis: "Minimalne rusztowanie, problemy z prawdziwego świata. · Siła: Wymusza prawdziwe rozwiązywanie problemów, najwyższe zatrzymanie nauki. · Kompromis: Wysokie ryzyko rezygnacji dla mniej doświadczonych uczniów; trudniejsze do wsparcia na dużą skalę.")

   **O co pytać** — dostosuj kategorie do dziedziny zadania:

   Najpierw zidentyfikuj dziedzinę zadania: **oprogramowanie**, **treść/edukacja**, **strategia/proces** lub **hybryda**. Następnie wybierz odpowiednie kategorie pytań. Poniższe kategorie są zorganizowane według dziedziny — wybierz to, co istotne, nie narzucaj kategorii oprogramowania zadaniom poza oprogramowaniem.

   **Każda kategoria jest oznaczona `[D]` (diagnostyczna — dotycząca problemu) lub `[S]` (rozwiązanie — dotycząca sposobu budowania).** Gdy w Kroku 1.0 dostarczono brief ramowy, **pomiń wszystkie kategorie `[D]`** — ramka je ustaliła. Zawsze zadawaj kategorie `[S]`, które nadal wymagają wkładu użytkownika.

   **Kategorie uniwersalne (wszystkie dziedziny, wszystkie poziomy):**
   - **Granice zakresu** `[D]`: Co jest włączone, a co wyłączone
   - **Przypadki brzegowe / tryby awarii** `[S]`: Co się dzieje, gdy coś pójdzie nie tak lub stanie się dziwne (obsługa implementacji, nawet jeśli ramka nazwała klasę obserwacji)
   - **Kryteria sukcesu** `[D]`: Skąd wiemy, że to zadziałało — z perspektywy użytkownika końcowego lub interesariusza
   - **Priorytet** `[D]`: Musi być vs miło mieć — co zostanie usunięte, jeśli czas jest ograniczony

   **Kategorie specyficzne dla oprogramowania (dodaj w zależności od złożoności):**

   ŚREDNIE+:
   - **Decyzje dotyczące modelu danych** `[S]`: Schemat, relacje, ograniczenia, migracje
   - **Strategia obsługi błędów** `[S]`: Tryby awarii, logika ponawiania, komunikaty dla użytkownika
   - **Podejście do testowania** `[S]`: Poziom pokrycia, które przypadki brzegowe testować jawnie
   - **Granice wydajności** `[S]`: Oczekiwane obciążenie, akceptowalne opóźnienia, buforowanie

   WYSOKIE:
   - **Wybory architektoniczne** `[S]`: Granice usług, synchroniczne vs asynchroniczne, sterowane zdarzeniami vs żądanie-odpowiedź
   - **Zarządzanie stanem** `[S]`: Gdzie znajduje się stan, gwarancje spójności, rozwiązywanie konfliktów
   - **Model bezpieczeństwa** `[S]`: Granice uwierzytelniania, dostęp do danych, walidacja danych wejściowych
   - **Migracja i wycofywanie** `[S]`: Wdrożenie przyrostowe, strategia wycofywania
   - **Obserwowalność** `[S]`: Kluczowe metryki, alerty, powierzchnia debugowania

   **Kategorie treści / edukacji (dodaj w zależności od złożoności):**

   ŚREDNIE+:
   - **Odbiorcy i wymagania wstępne** `[D]`: Dla kogo to jest, co już wiedzą
   - **Format i medium** `[S]`: Pisemne, wideo, interaktywne, na żywo — i dlaczego
   - **Łuk narracyjny** `[S]`: Jaką podróż odbywa czytelnik/uczeń
   - **Przykłady i ćwiczenia** `[S]`: Co sprawia, że koncepcje się utrwalają

   WYSOKIE:
   - **Zależności programowe** `[D]`: Co musi być nauczone przed czym
   - **Strategia oceny** `[S]`: Jak zweryfikować, czy nauka nastąpiła
   - **Ponowne użycie i modułowość** `[S]`: Czy części mogą być używane samodzielnie lub w innych kontekstach
   - **Dystrybucja i dostęp** `[D]`: Gdzie to się znajduje, jak ludzie to znajdują

   **Kategorie strategii / procesu (dodaj w zależności od złożoności):**

   ŚREDNIE+:
   - **Interesariusze i role** `[D]`: Kto jest zaangażowany, kto decyduje, kto wykonuje
   - **Harmonogram i kamienie milowe** `[S]`: Kluczowe daty, zależności, ścieżka krytyczna
   - **Identyfikacja ryzyka** `[S]`: Co może pójść nie tak, co jest planem awaryjnym
   - **Ograniczenia zasobów** `[D]`: Budżet, czas, ludzie, narzędzia

   WYSOKIE:
   - **Zarządzanie zmianą** `[S]`: Jak osoby dotknięte zmianą dowiadują się o niej i ją przyjmują
   - **Ramy pomiarowe** `[D]`: Wskaźniki wiodące vs opóźnione, jak korygować kurs
   - **Zależności i sekwencjonowanie** `[S]`: Co blokuje co, co może działać równolegle
   - **Plan komunikacji** `[S]`: Kto musi wiedzieć co, kiedy, za pośrednictwem jakiego kanału

   **O co NIE pytać:**
   - Wszystko, co zostało już ustalone w artefaktach nadrzędnych (brief ramowy, dokument badawczy) — ponowne zadawanie pytań to tryb awarii, któremu ma zapobiegać to skalowanie
   - Niskopoziomowe szczegóły implementacji, które możesz określić samodzielnie (na podstawie badań bazy kodu dla oprogramowania, na podstawie plików kontekstowych i wcześniejszych prac dla zadań poza oprogramowaniem)
   - Pytania z oczywistymi odpowiedziami, biorąc pod uwagę już dostarczony kontekst
   - Preferencje, które nie wpływają na strukturę ani sukces planu

   **KRYTYCZNE**: MUSISZ zadać liczbę pytań odpowiednią do potwierdzonego poziomu złożoności *i* skalowania artefaktów nadrzędnych z Kroku 1.0. Nie skracaj tego, gdy nie dostarczono artefaktów nadrzędnych — dokładne pytania zapobiegają kosztownym przeróbkom. Równie ważne jest, aby nie dodawać pytań, gdy ramka lub badania już pokrywają temat — ponowne zadawanie pytań podważa zaufanie do artefaktu nadrzędnego. Każde pytanie powinno wymuszać prawdziwą decyzję, a nie potwierdzać coś oczywistego.

### Krok 2: Badania i odkrycia

Po uzyskaniu wstępnych wyjaśnień od użytkownika, TERAZ jest czas na zajęcie się szczegółami implementacji:

1. **Badaj wzorce implementacji i wcześniejsze prace**:
   W tej fazie samodzielnie odpowiadaj na pytania dotyczące implementacji — nie proś użytkownika o podejmowanie tych decyzji.

   **Dla zadań programistycznych**, badaj bazę kodu:
   - Jakie wzorce baza kodu wykorzystuje dla podobnych funkcji?
   - Jakie jest ustalone podejście do obsługi błędów / logowania / testowania?
   - Które istniejące komponenty lub narzędzia można ponownie wykorzystać?
   - Jakie ograniczenia narzuca obecna architektura?

   **Dla zadań poza oprogramowaniem**, badaj pliki kontekstowe i wcześniejsze prace:
   - Jakie formaty, struktury lub szablony były wcześniej używane do podobnych prac?
   - Jakie istnieją ograniczenia wynikające z wcześniejszych decyzji, odbiorców lub platformy?
   - Jakie powiązane treści lub procesy już istnieją, z którymi to powinno być zgodne?
   - Co działało dobrze (lub nie) w poprzednich iteracjach?

   **To NIE jest do decyzji użytkowników** — Ty określasz to, badając istniejące wzorce, pliki i kontekst.

2. **Jeśli użytkownik poprawi jakiekolwiek nieporozumienie**:
   - NIE akceptuj po prostu poprawki
   - Odradzaj nowe zadania badawcze w celu weryfikacji poprawnych informacji
   - Przeczytaj konkretne pliki/katalogi, które wymienia
   - Kontynuuj dopiero po samodzielnym zweryfikowaniu faktów

3. **Twórz zadania badawcze** za pomocą funkcji tworzenia zadań asystenta kodowania AI, aby śledzić eksplorację (pojawiają się one na pasku stanu użytkownika). Aktualizuj je za pomocą funkcji aktualizacji zadań asystenta kodowania AI w miarę postępów badań.

4. **Odradzaj równoległe podzadania dla kompleksowych badań**:
   - Twórz wielu agentów Task do równoczesnego badania różnych aspektów
   - Użyj odpowiedniego typu agenta dla każdej potrzeby badawczej:

   **Do badania bazy kodu:**
   - **Explore** (`subagent_type: "Explore"`) — Szybkie wyszukiwanie plików/wzorców, analiza struktury kodu
   - **general-purpose** (`subagent_type: "general-purpose"`) — Głęboka analiza wymagająca wieloetapowego rozumowania

   **Dla kontekstu historycznego:**
   - **Explore** — Szukaj w `context/changes/**/research.md` i `context/changes/**/plan.md` (oraz tych samych ścieżkach pod `context/archive/`) powiązanych dokumentów

   Każdy agent będzie:
   - Znajdować odpowiednie pliki i wzorce kodu
   - Identyfikować konwencje i wzorce do naśladowania
   - Szukać punktów integracji i zależności
   - Zwracać konkretne odniesienia file:line
   - Znajdować testy i przykłady

5. **Poczekaj na zakończenie WSZYSTKICH podzadań** przed kontynuowaniem

6. **Przedstaw wyniki i opcje projektowe**:

   Najpierw przedstaw krótkie podsumowanie wyników badań:

   ```
   Na podstawie moich badań, oto co znalazłem:

   **Stan obecny:**
   - [Kluczowe odkrycie dotyczące istniejącego kodu]
   - [Wzorzec lub konwencja do naśladowania]
   ```

   Następnie, jeśli istnieje wiele prawidłowych podejść, przedstaw je jako ustrukturyzowane wybory, pytając użytkownika: "Które podejście implementacyjne powinniśmy zastosować?" z opcjami:
   - "[Nazwa opcji A]" (opis: "[Kluczowe kompromisy: prostsze, ale X, lub szybsze, ale Y]")
   - "[Nazwa opcji B]" (opis: "[Kluczowe kompromisy]")

   Jeśli istnieje wyraźnie jedno najlepsze podejście, pomiń pytanie użytkownika i wyjaśnij, dlaczego je wybrałeś.
   Pytaj tylko wtedy, gdy wybór naprawdę ma znaczenie i nie możesz określić odpowiedzi na podstawie wzorców bazy kodu.

### Krok 3: Opracowanie struktury planu

Po uzgodnieniu podejścia:

1. **Przedstaw zarys planu i uzyskaj ustrukturyzowaną informację zwrotną**:

   Najpierw wydrukuj proponowane fazy jako tekst (informacyjny):

   ```
   Oto moja proponowana struktura planu:

   ## Przegląd
   [1-2 zdaniowe podsumowanie]

   ## Fazy implementacji:
   1. [Nazwa fazy] - [co osiąga]
   2. [Nazwa fazy] - [co osiąga]
   3. [Nazwa fazy] - [co osiąga]
   ```

   Następnie zapytaj użytkownika: "Czy ten podział faz wygląda dobrze?" z opcjami:
   - "Wygląda dobrze, kontynuuj" (opis: "Napisz szczegółowy plan z tymi fazami.")
   - "Wymaga dostosowania" (opis: "Wyjaśnię, co zmienić, zanim napiszesz szczegółowy plan.")
   - "Zbyt szczegółowe" (opis: "Połącz niektóre fazy — to jest prostsze niż się wydaje.")
   - "Zbyt ogólne" (opis: "Podziel niektóre fazy — istnieją ukryte złożoności.")

### Krok 4: Pisanie szczegółowego planu

Po zatwierdzeniu struktury:

1. **Rozwiąż folder zmian, a następnie napisz plan** do `context/changes/<change-id>/plan.md`.
   - Jeśli użytkownik wywołał `/10x-plan <change-id>` i `context/changes/<change-id>/` już istnieje, użyj go.
   - W przeciwnym razie utwórz kebab-case `<change-id>` z tematu i utwórz folder + `change.md` (odzwierciedlając semantykę `/10x-new`) przed zapisaniem.
   - Odmów, jeśli rozwiązana ścieżka zaczyna się od `context/archive/` — wydrukuj: "Ta zmiana jest zarchiwizowana. Zamiast tego otwórz nową zmianę za pomocą `/10x-new`." i ZATRZYMAJ.
   - Zaktualizuj `change.md`: ustaw `status: planned` i `updated: <dzisiaj>`.
   - **Synchronizuj roadmapę** (najlepszy wysiłek): jeśli `context/foundation/roadmap.md` zawiera element, którego `Change ID` jest równe `<change-id>`, zmień status tego elementu na `Status: planning`. Zobacz "## Synchronizacja statusu roadmapy" poniżej. Nigdy nie blokuje; większość zmian nie będzie śledzić roadmapy.
2. **Użyj tej struktury szablonu** (bloki faz zawierają zwykłe punktorzy — `- ` a nie `- [ ]` — a pojedyncza kanoniczna sekcja `## Progress` na dole jest właścicielem stanu pola wyboru, zobacz `references/progress-format.md` dla kontraktu):

````markdown
# [Nazwa funkcji/zadania] Plan implementacji

## Przegląd

[Krótki opis tego, co implementujemy i dlaczego]

## Analiza stanu obecnego

[Co istnieje teraz, czego brakuje, kluczowe odkryte ograniczenia]

## Pożądany stan końcowy

[Specyfikacja pożądanego stanu końcowego po zakończeniu tego planu i sposób jego weryfikacji]

### Kluczowe odkrycia:

- [Ważne odkrycie z odniesieniem file:line]
- [Wzorzec do naśladowania]
- [Ograniczenie, w ramach którego należy działać]

## Czego NIE robimy

[Jawnie wymień elementy poza zakresem, aby zapobiec rozszerzaniu zakresu]

## Podejście do implementacji

[Strategia wysokiego poziomu i uzasadnienie]

## Krytyczne szczegóły implementacji

Ta sekcja zawiera **ograniczenia, pułapki i wymagania dotyczące kolejności, które implementator musi znać, zanim dotknie kodu** — fakty, które LLM określa podczas badań i odkryć (Krok 2), które nie są widoczne tylko ze ścieżek plików.

To NIE jest miejsce do wstępnego decydowania o implementacji. Domyślnie: **pomijaj** całą sekcję. Dołącz nagłówek poniżej TYLKO wtedy, gdy coś naprawdę zaskakującego lub obciążającego ma zastosowanie — i napisz 1-3 zdania, a nie szablony punktorów.

- **Czas i cykl życia** — dołącz tylko wtedy, gdy istnieje nieoczywista kolejność, wyścig lub hak cyklu życia, który implementator mógłby inaczej przeoczyć.
- **Specyfikacja doświadczenia użytkownika** — dołącz tylko wtedy, gdy zachowanie widoczne dla użytkownika ma ograniczenia, których nie można wywnioskować z wymagań użytkownika (np. specyficzne zarządzanie fokusem, zachowanie przewijania).
- **Ograniczenia wydajności** — dołącz tylko wtedy, gdy istnieje rzeczywisty budżet wydajności lub znany punkt krytyczny; pomiń ogólne porady typu "użyj memoizacji".
- **Sekwencjonowanie stanu** — dołącz tylko wtedy, gdy kolejność zmian stanu ma znaczenie, a oczywista kolejność jest błędna.
- **Debugowanie i obserwowalność** — dołącz tylko wtedy, gdy istnieje specyficzna metoda weryfikacji lub potrzeba instrumentacji wykraczająca poza standardowe logowanie.

Jeśli żadne z powyższych nie ma zastosowania, pomiń sekcję całkowicie. Plan bez niej nie jest niekompletny; plan, który wypełnia ją szablonowymi punktorami, jest nadmiernie rozbudowany.

## Faza 1: [Opisowa nazwa]

### Przegląd

[Co osiąga ta faza]

### Wymagane zmiany:

#### 1. [Komponent/Grupa plików]

**Plik**: `path/to/file.ext`

**Cel**: [1-2 zdania określające, co ta zmiana robi i dlaczego. Implementator napisze rzeczywisty kod.]

**Kontrakt**: [Interfejs, sygnatura, pole schematu, trasa, delta struktury plików lub niezmiennik, którego dotyczy zmiana. W przypadku edycji czysto tekstowych, nazwij sekcję lub nagłówek, którego dotyczy.

Fragment kodu pojawia się tutaj TYLKO wtedy, gdy zmiana jest nieoczywista — trudne wyrażenie regularne, nietypowe wywołanie API, nieintuicyjna kolejność, obejście znanego błędu lub kontrakt sygnatury, od którego zależą inne części planu. W przypadku rutynowych edycji (dodanie pola, podłączenie obsługi, naśladowanie istniejącego wzorca), opisz kontrakt i zakończ. Domyślnie: brak fragmentu.]

### Kryteria sukcesu:

#### Weryfikacja automatyczna:

- Migracja stosuje się czysto: `make migrate`
- Testy jednostkowe przechodzą: `make test-component`
- Sprawdzanie typów przechodzi: `npm run typecheck`
- Linting przechodzi: `make lint`
- Testy integracyjne przechodzą: `make test-integration`

#### Weryfikacja ręczna:

- Funkcja działa zgodnie z oczekiwaniami po przetestowaniu przez UI
- Wydajność jest akceptowalna pod obciążeniem
- Obsługa przypadków brzegowych zweryfikowana ręcznie
- Brak regresji w powiązanych funkcjach

**Uwaga implementacyjna**: Po zakończeniu tej fazy i przejściu wszystkich automatycznych weryfikacji, zatrzymaj się tutaj, aby uzyskać ręczne potwierdzenie od człowieka, że testy ręczne zakończyły się sukcesem, zanim przejdziesz do następnej fazy. Bloki faz używają zwykłych punktorów — odpowiadające im pola wyboru `- [ ]` dla tych elementów znajdują się w sekcji `## Progress` na dole planu.

---

## Faza 2: [Opisowa nazwa]

[Podobna struktura z kryteriami sukcesu zarówno automatycznymi, jak i ręcznymi...]

---

## Strategia testowania

### Testy jednostkowe:

- [Co testować]
- [Kluczowe przypadki brzegowe]

### Testy integracyjne:

- [Scenariusze end-to-end]

### Kroki testowania ręcznego:

1. [Konkretny krok do weryfikacji funkcji]
2. [Kolejny krok weryfikacji]
3. [Przypadek brzegowy do ręcznego przetestowania]

## Zagadnienia wydajnościowe

[Wszelkie implikacje wydajnościowe lub potrzebne optymalizacje]

## Uwagi dotyczące migracji

[Jeśli dotyczy, jak obsługiwać istniejące dane/systemy]

## Referencje

- Powiązane badania: `context/changes/<change-id>/research.md`
- Podobna implementacja: `[plik:linia]`

## Postęp

> Konwencja: `- [ ]` oczekujące, `- [x]` wykonane. Dodaj ` — <commit sha>`, gdy krok zostanie zrealizowany. Nie zmieniaj nazw tytułów kroków. Zobacz `references/progress-format.md`.

### Faza 1: <Nazwa fazy 1>

#### Automatyczne

- [ ] 1.1 <Element weryfikacji automatycznej 1 z Fazy 1>
- [ ] 1.2 <Element weryfikacji automatycznej 2 z Fazy 1>

#### Ręczne

- [ ] 1.3 <Element weryfikacji ręcznej 1 z Fazy 1>

### Faza 2: <Nazwa fazy 2>

#### Automatyczne

- [ ] 2.1 <…>
````

Sekcja Postęp jest mechaniczna — emituj jeden `### Faza N: <nazwa>` dla każdej fazy, z podsekcjami `#### Automatyczne` / `#### Ręczne` wyliczającymi każdy punkt Kryteriów Sukcesu z tej fazy jako `- [ ] <faza>.<indeks> <tytuł>`. Pomiń puste podsekcje. Same bloki faz zawierają zwykłe punktorzy `- ` (bez pól wyboru); sekcja `## Postęp` jest jedynym miejscem, gdzie pojawiają się `[ ]` / `[x]`.

### Krok 4.5: Krótki plan (dwustronicowy)

Po napisaniu pełnego planu, wygeneruj zwięzły brief, który da czytelnikowi ogólny obraz, zanim zagłębi się w 500-1000 linii szczegółów. Brief jest pierwszą rzeczą, którą użytkownik czyta — powinien zająć mniej niż 2 minuty i pozostawić jasny model mentalny tego, co plan robi, dlaczego i jakie były kluczowe decyzje.

1. **Napisz brief** do `context/changes/<change-id>/plan-brief.md` (obok `plan.md` w tym samym folderze zmian).

2. **Użyj tego szablonu**:

```markdown
# [Nazwa funkcji/zadania] — Krótki plan

> Pełny plan: `context/changes/<change-id>/plan.md`
> Krótki opis ramowy: `context/changes/<change-id>/frame.md` (jeśli istnieje — w przeciwnym razie pomiń linię)
> Badania: `context/changes/<change-id>/research.md` (jeśli istnieje — w przeciwnym razie pomiń linię)

## Co i dlaczego

[2-3 zdania: co budujemy/robimy i motywacja za tym. Jeśli brief ramowy był danymi wejściowymi, podnieś tutaj dosłownie przeformułowane (lub potwierdzone) oświadczenie problemowe — to jest "dlaczego" w jego najostrzejszej formie.]

## Punkt wyjścia

[1-2 zdania: co istnieje dzisiaj, na czym ten plan się opiera lub co zmienia. Ugruntuj czytelnika w obecnym stanie, aby zrozumiał różnicę. Jeśli ramka to badała, podsumuj z jej badania hipotez, zamiast powtarzać.]

## Pożądany stan końcowy

[2-3 zdania: jak wygląda świat po zakończeniu tego planu. Opisz konkretny, widoczny dla użytkownika wynik — nie metryki, ale doświadczenie lub zdolność, która teraz istnieje.]

## Podjęte kluczowe decyzje

Gdy brief ramowy lub dokument badawczy był danymi wejściowymi, oznacz kolumnę **Źródło**, aby pokazać, skąd pochodzi decyzja. Pozwala to czytelnikom zobaczyć pochodzenie: co zostało ustalone wcześniej, a co zostało zdecydowane podczas tej sesji planowania.

| Decyzja                        | Wybór            | Dlaczego (1 zdanie) | Źródło           |
| ------------------------------ | ----------------- | ----------------- | ---------------- |
| [Obszar decyzji]               | [Co wybrano]      | [Główne uzasadnienie] | Ramka / Badania / Plan |
| [Obszar decyzji]               | [Wybór]           | [Uzasadnienie]    | Ramka / Badania / Plan |
| ...                            | ...               | ...               | ...              |

(Pomiń kolumnę `Źródło`, jeśli nie dostarczono żadnych artefaktów nadrzędnych — każdy wiersz byłby `Plan`.)

## Zakres

**W zakresie:** [Lista punktów tego, co jest włączone]

**Poza zakresem:** [Lista punktów tego, co jest jawnie wyłączone]

## Architektura / Podejście

[1 krótki akapit lub prosty diagram opisujący podejście wysokiego poziomu.
Dla oprogramowania: kluczowe komponenty, przepływ danych, punkty integracji.
Dla zadań poza oprogramowaniem: struktura, przepływ pracy, kluczowe zależności.]

## Fazy w skrócie

| Faza      | Co dostarcza            | Kluczowe ryzyko                  |
| --------- | ----------------------- | -------------------------------- |
| 1. [Nazwa] | [Jednozdaniowy rezultat] | [Główne ryzyko lub obawa]        |
| 2. [Nazwa] | [Jednozdaniowy rezultat] | [Główne ryzyko]                  |
| ...       | ...                     | ...                              |

**Wymagania wstępne:** [Co musi być prawdą przed rozpoczęciem — zależności, dostęp, wcześniejsze prace]
**Szacowany wysiłek:** [Przybliżony rozmiar: np. "~2-3 sesje w 3 fazach" lub "8 tygodni, zespół 2-osobowy"]

## Otwarte ryzyka i założenia

- [Ryzyko lub założenie, które może zmienić plan]
- [Kolejne]

## Kryteria sukcesu (podsumowanie)

[2-3 punkty: jak wiemy, że plan się powiódł, z perspektywy użytkownika]
```

3. **Kluczowe zasady briefu**:
   - Musi mieścić się na około 2 wydrukowanych stronach (~60-80 linii markdown). Jeśli jest dłuższy, skróć.
   - Tabela "Kluczowe decyzje" jest sercem — przedstawia to, co zostało zdecydowane podczas zadawania pytań, aby każdy, kto później czyta plan, zrozumiał wybory bez ponownego czytania wszystkich pytań.
   - "Punkt wyjścia" ugruntowuje czytelnika w tym, co istnieje dzisiaj — bez niego ktoś nieznający projektu nie zrozumie różnicy.
   - "Wymagania wstępne i szacowany wysiłek" na dole tabeli faz daje czytelnikowi szybką kontrolę wykonalności przed podjęciem decyzji o przeczytaniu pełnego planu.
   - Pisz dla kogoś, kto nie brał udziału w rozmowie planistycznej — powinien zrozumieć kształt i uzasadnienie planu tylko z briefu.
   - Link do pełnego planu na górze, aby czytelnik mógł zagłębić się w dowolną sekcję.

### Krok 5: Synchronizacja i przegląd

1. **Potwierdź, że plan + brief wylądowały w folderze zmian**:
   - `ls context/changes/<change-id>/plan.md context/changes/<change-id>/plan-brief.md` powinny oba istnieć.

2. **Skopiuj polecenie szybkiego startu do schowka**:
   - Po napisaniu planu, skopiuj polecenie implementacji do schowka:

   ```bash
   echo -n "/10x-implement <change-id> phase 1" | pbcopy 2>/dev/null || echo -n "/10x-implement <change-id> phase 1" | clip.exe 2>/dev/null || echo -n "/10x-implement <change-id> phase 1" | xclip -selection clipboard 2>/dev/null || true
   ```

   ```powershell
   # PowerShell (Windows)
   Set-Clipboard "/10x-implement <change-id> phase 1"
   ```

3. **Przedstaw zarówno brief, jak i pełny plan**:

   ```
   Stworzyłem plan implementacji:

   📋 Krótki (zacznij tutaj): `context/changes/<change-id>/plan-brief.md`
   📄 Pełny plan: `context/changes/<change-id>/plan.md`

   → /10x-implement <change-id> phase 1 (✓ skopiowano)

   Najpierw przejrzyj brief, a następnie sprawdź pełny plan pod kątem wszelkich potrzebnych dostosowań:
   - Czy fazy są odpowiednio zakresowane?
   - Czy kryteria sukcesu są wystarczająco szczegółowe?
   - Czy jakieś szczegóły techniczne wymagają dostosowania?
   - Brakujące przypadki brzegowe lub uwagi?
   ```

4. **Iteruj na podstawie informacji zwrotnych** - bądź gotów do:
   - Dodawania brakujących faz
   - Dostosowywania podejścia technicznego
   - Wyjaśniania kryteriów sukcesu (zarówno automatycznych, jak i ręcznych)
   - Dodawania/usuwania elementów zakresu

5. **Kontynuuj dopracowywanie**, aż użytkownik będzie zadowolony

## Synchronizacja statusu roadmapy

`context/foundation/roadmap.md` (produkowany przez `/10x-roadmap`) indeksuje każdą Fundację/Fragment za pomocą stabilnego **ID Zmiany**. Gdy planowanie przekształca element roadmapy w konkretny folder zmian + plan, oznacz ten element jako **`planning`**, aby roadmapa odzwierciedlała, że element opuścił backlog i wszedł w aktywną pracę. `/10x-implement` później przenosi ten sam element do `in-progress`, a `/10x-archive` zamyka go do `done`.

Zrób to w Kroku 4 (zaraz po oznaczeniu `change.md` jako `planned`). Wyszukiwanie jest **obowiązkowe**; "najlepszy wysiłek" obejmuje tylko *edycje* — brakująca roadmapa lub nieznaleziony cel jest pomijany cicho i nigdy nie blokuje, nie prosi ani nie przerywa działania. Nie pomijaj sprawdzania, zakładając, że nie ma roadmapy.

1. Sprawdź, czy istnieje `context/foundation/roadmap.md`. Jeśli nie, pomiń ten krok cicho.
2. Przeczytaj plik. Poszukaj `<change-id>` użytego jako `Change ID`:
   - w tabeli `## W skrócie` — wiersz, którego komórka w kolumnie **Change ID** jest dokładnie równa `<change-id>`;
   - oraz w treści `## Fundacje` / `## Fragmenty` — blok `### <ID>: …`, który zawiera linię `- **Change ID:** <change-id>`.

   Dopasowanie jest tylko dokładnym ciągiem znaków. **Brak dopasowania** → wydrukuj `ℹ context/foundation/roadmap.md nie zawiera elementu z Change ID "<change-id>" — roadmapa pozostaje niezmieniona.` i zatrzymaj się tutaj.
3. **Znaleziono dopasowanie** → jeśli status `- **Status:**` elementu jest już `planning`, `in-progress` lub `done`, pozostaw go bez zmian (**tylko do przodu**: nigdy nie cofaj bardziej zaawansowanego statusu) i zatrzymaj się. W przeciwnym razie zastosuj obie edycje — każda niezależna i najlepszy wysiłek; pomiń podedycję, której cel nie znajduje się tam, gdzie umieszcza go szablon `/10x-roadmap`, i zanotuj pominięcie. Dotknij tylko pola `Status`:
   1. **`## W skrócie`** — ustaw komórkę **Status** dopasowanego wiersza na `planning`.
   2. **Treść elementu** — przepisz linię `- **Status:**` elementu na `- **Status:** planning`.

   Następnie zaktualizuj `updated:` w frontmatterze roadmapy na `<dzisiaj>` (pomiń, jeśli nie ma frontmattera).
4. `/10x-plan` nie zatwierdza własnych artefaktów; pozostaw zmianę w drzewie roboczym. Zostanie ona zatwierdzona później wraz z pierwszą fazą `/10x-implement` zmiany (która ponownie zmienia status tego samego elementu na `in-progress`).

## Ważne wytyczne

1. **Bądź sceptyczny**:
   - Kwestionuj niejasne wymagania
   - Wcześnie identyfikuj potencjalne problemy
   - Pytaj "dlaczego" i "co z"
   - Nie zakładaj - weryfikuj za pomocą kodu, plików lub kontekstu

2. **Bądź interaktywny**:
   - Nie pisz całego planu za jednym razem
   - Uzyskaj zgodę na każdym głównym kroku
   - Pozwól na korekty kursu
   - Pracuj wspólnie

3. **Bądź dokładny**:
   - Przeczytaj WSZYSTKIE pliki kontekstowe W CAŁOŚCI przed planowaniem
   - Badaj wzorce za pomocą równoległych podzadań (baza kodu dla oprogramowania, pliki kontekstowe i wcześniejsze prace dla zadań poza oprogramowaniem)
   - Dołącz konkretne odniesienia (plik:linia dla kodu, ścieżki dokumentów dla treści)
   - Pisz mierzalne kryteria sukcesu z wyraźnym rozróżnieniem na automatyczne i ręczne

4. **Bądź praktyczny**:
   - Skup się na przyrostowych, testowalnych zmianach
   - Rozważ migrację i wycofywanie
   - Myśl o przypadkach brzegowych
   - Dołącz "czego NIE robimy"

5. **Śledź postępy**:
   - Użyj funkcji tworzenia zadań asystenta kodowania AI, aby tworzyć zadania planistyczne, i funkcji aktualizacji zadań, aby oznaczać je jako ukończone w miarę postępów
   - Zadania pojawiają się na pasku stanu użytkownika, co zapewnia widoczność
   - Oznaczaj zadania jako ukończone po zakończeniu obszarów badawczych

6. **OBOWIĄZKOWE: Skalowane pytania pogłębione o złożoności**:
   - **PRZED** napisaniem jakiegokolwiek planu, MUSISZ ocenić złożoność (WYSOKA/ŚREDNIA/NISKA) i uzyskać potwierdzenie od użytkownika
   - Zadaj pełną liczbę pytań odpowiadającą złożoności: NISKA=4-6, ŚREDNIA=7-10, WYSOKA=11-15
   - Każda opcja musi zawierać wybór `⭐ Recommended` z analizą siły/kompromisów
   - Omów zakres, przypadki brzegowe, architekturę, model danych, testowanie i wydajność, stosownie do złożoności
   - Zadawaj pytania w rundach po 1-4 pytania — tyle rund, ile potrzeba, aby osiągnąć docelową liczbę
   - NIE pomijaj ani nie skracaj tego kroku — dokładne pytania zapobiegają krytycznym błędom i przeróbkom
   - Poczekaj na odpowiedzi użytkownika przed przejściem do szczegółowego planowania

7. **Brak otwartych pytań w ostatecznym planie**:
   - Jeśli napotkasz otwarte pytania podczas planowania, ZATRZYMAJ SIĘ
   - Natychmiast zbadaj lub poproś o wyjaśnienie
   - NIE pisz planu z nierozwiązanymi pytaniami
   - Plan implementacji musi być kompletny i wykonalny
   - Każda decyzja musi zostać podjęta przed sfinalizowaniem planu
   - Podsekcje "Krytyczne szczegóły implementacji" są opcjonalne: dołącz je tylko wtedy, gdy ma zastosowanie rzeczywiste ograniczenie, pułapka lub wymóg kolejności. Domyślnie pomijaj. Plan bez tej sekcji nie jest niekompletny.

8. **Opisz zamiar, a nie implementację**:
   - Plan mówi implementatorowi **co zmienić i dlaczego**, a nie jak napisać kod
   - Każdy wpis zmiany w sekcji `### Wymagane zmiany:` oddziela `**Cel**` (co i dlaczego) od `**Kontraktu**` (interfejs, sygnatura, pole schematu, trasa, struktura lub niezmiennik, którego dotyczy zmiana). Fragmenty kodu, gdy są potrzebne, znajdują się na końcu `**Kontraktu**`
   - Domyślnie brak fragmentów kodu. Dołącz fragment TYLKO wtedy, gdy zmiana jest nieoczywista (trudne wyrażenie regularne, nietypowe wywołanie API, nieintuicyjna kolejność, obejście, kontrakt sygnatury, od którego zależą inne fazy)
   - W przypadku rutynowych edycji — dodawania pola, podłączania obsługi, naśladowania istniejącego wzorca — opisz `**Cel**` w 1-2 zdaniach, nazwij `**Kontrakt**` w jednym i zakończ. Implementator (człowiek lub agent) odczytuje kod ze ścieżki pliku, otaczającego wzorca i zamiaru
   - Ścieżki plików i krótkie opisy Celu/Kontraktu są zazwyczaj wystarczające. Oprzyj się pokusie wstępnego pisania kodu

## Wytyczne dotyczące kryteriów sukcesu

**Zawsze dziel kryteria sukcesu na dwie kategorie:**

1. **Weryfikacja automatyczna** — polecenia, które agenci mogą uruchomić: `make test`, `npm run lint`, sprawdzanie typów, istnienie konkretnych plików
2. **Weryfikacja ręczna** — testowanie przez człowieka: UI/UX, rzeczywista wydajność, przypadki brzegowe, akceptacja przez użytkownika

Kryteria sukcesu każdej fazy powinny używać pól wyboru `- [ ]` pod nagłówkami `#### Weryfikacja automatyczna:` i `#### Weryfikacja ręczna:`.

## Typowe wzorce

- **Zmiany w bazie danych**: schemat/migracja → metody przechowywania → logika biznesowa → API → klienci
- **Nowe funkcje**: wzorce badawcze → model danych → backend → API → UI
- **Refaktoryzacja**: dokumentowanie zachowania → zmiany przyrostowe → kompatybilność wsteczna → migracja

## Najlepsze praktyki tworzenia podzadań

- **Twórz wiele zadań równolegle** w jednej wiadomości dla równoczesnego wykonania
- **Każde zadanie powinno być skoncentrowane** na konkretnym obszarze ze szczegółowymi instrukcjami (katalogi, co wyodrębnić, oczekiwany format)
- **Żądaj konkretnych odniesień file:line** w odpowiedziach
- **Poczekaj na zakończenie wszystkich zadań** przed syntezą wyników
- **Weryfikuj wyniki podzadań** — jeśli są nieoczekiwane, twórz kolejne i porównuj z rzeczywistym kodem

## Zarządzanie kontekstem

Planowanie może być obciążone kontekstem ze względu na badania + iteracje. Utrzymuj efektywny kontekst:

- **Deleguj badania do podagentów** — zwracają oni podsumowania, utrzymując główny kontekst w ryzach. Nie czytaj ponownie plików, które podagenci już przeanalizowali, chyba że musisz zweryfikować konkretne szczegóły.
- **Syntetyzuj, nie gromadź** — po powrocie podagentów, syntetyzuj wyniki w swoje zrozumienie, zamiast cytować duże bloki dosłownie.
- **Jeśli kontekst wydaje się zdegradowany podczas planowania** — jeśli odpowiedzi stają się powolne lub powtarzalne, zapisz bieżący szkic planu do pliku i zaproponuj użytkownikowi kontynuowanie w świeżym kontekście:
  ```
  Szkic planu został zapisany pod adresem: context/changes/<change-id>/plan.md
  Czy chcesz kontynuować dopracowywanie w nowym oknie?
  → /10x-plan <change-id> (✓ skopiowano)
  ```
  Pozwala to `/10x-plan` załadować szkic i kontynuować iterację z pełnym dostępnym kontekstem.

## Przykład sondowania pytań według typu funkcji

### Przykład 1: Oprogramowanie / Funkcja UI — złożoność ŚREDNIA (np. Paginacja)

Mieszane: `Loading UX` to `[S]` (zachowanie UI — szczegóły rozwiązania); `Scale` to `[D]` (granica problemu — jak duży jest zbiór danych). Z briefem ramowym, pytaj tylko o `Loading UX`; skala powinna już być w przeformułowanym (lub potwierdzonym) oświadczeniu problemowym.

Zapytaj użytkownika: "Co użytkownik powinien widzieć podczas ładowania nowych elementów?" z opcjami:
- "Wbudowany spinner" (opis: "Mały spinner pod istniejącą zawartością. · Siła: Użytkownik nadal widzi bieżące elementy, minimalna praca UI. · Kompromis: Wydaje się wolniejszy niż szkielet — użytkownicy widzą ogólny spinner zamiast kształtu zawartości.")
- "⭐ Zalecane: Ekrany szkieletowe" (opis: "Kształty zastępcze pasujące do układu elementów. · Siła: Postrzegana wydajność jest o 30-40% lepsza — pasuje do istniejącego wzorca komponentu LoadingSkeleton. · Kompromis: Wymaga wariantu szkieletu dla każdego typu elementu; psuje się, jeśli układ się zmieni.")
- "Spinner na całą stronę" (opis: "Zastąp zawartość spinnerem. · Siła: Najprostszy w implementacji — jeden komponent, brak problemów z układem. · Kompromis: Blokuje wszystkie interakcje; wydaje się zepsuty przy wolnych połączeniach.")
Zapytaj użytkownika: "Ile elementów powinno to obsługiwać płynnie?" z opcjami:
- "⭐ Zalecane: Setki" (opis: "Standardowa paginacja offsetowa. · Siła: Prosta, dobrze zrozumiana, działa z istniejącymi zapytaniami SQL. · Kompromis: Psuje się po około 5 tys. elementów — akceptowalne, biorąc pod uwagę obecne wolumeny danych.")
- "Tysiące" (opis: "Paginacja oparta na kursorze + wirtualne przewijanie. · Siła: Obsługuje wzrost bez spadku wydajności. · Kompromis: 2-3 razy więcej pracy implementacyjnej; zmienia kontrakt API.")
- "Dziesiątki tysięcy" (opis: "Filtrowanie po stronie serwera + wirtualna lista + wyszukiwanie. · Siła: Skaluje się w nieskończoność. · Kompromis: Znacząca złożoność; wymaga indeksu wyszukiwania i nowego projektu API.")

### Przykład 2: Treść / Edukacja — złożoność WYSOKA (np. Projekt modułu kursu)

Mieszane: `Outcome` to `[D]` (definiuje, jak wygląda sukces — czyste sformułowanie problemu); `Levels` to `[S]` (strategia obsługi odbiorców — jak ustrukturyzować dostarczanie). Z briefem ramowym, pytaj tylko o `Levels`; wynik powinien być ustalony.

Zapytaj użytkownika: "Co uczeń powinien być w stanie ZROBIĆ po tym module — nie tylko wiedzieć?" z opcjami:
- "⭐ Zalecane: Zbudować działający prototyp" (opis: "Uczeń tworzy funkcjonalny artefakt, używając nauczonych technik. · Siła: Wymusza prawdziwe przeniesienie umiejętności — artefakt dowodzi kompetencji. Pasuje do formatu lekcji 'Innowacje' z 10xDevs3. · Kompromis: Wymaga dobrze zaprojektowanych szablonów startowych i jasnych kryteriów akceptacji; przygotowanie zajmuje 2-3 razy dłużej.")
- "Ukończyć ćwiczenie z przewodnikiem" (opis: "Przewodnik krok po kroku z oczekiwanym wynikiem. · Siła: Niska bariera — każdy kończy, buduje pewność siebie. · Kompromis: Może produkować 'tutorialowych zombie', którzy potrafią podążać, ale nie potrafią samodzielnie zastosować.")
- "Zdać test wiedzy" (opis: "Quiz lub przegląd kodu potwierdzający zrozumienie koncepcyjne. · Siła: Szybki do stworzenia, łatwy do oceniania na dużą skalę. · Kompromis: Testuje rozpoznawanie, a nie produkcję — uczeń może rozumieć, ale nie być w stanie wykonać.")
Zapytaj użytkownika: "Jak ten moduł powinien obsługiwać różne poziomy umiejętności w grupie odbiorców?" z opcjami:
- "Jedna ścieżka, zaawansowana" (opis: "Jedna ścieżka skierowana do doświadczonych programistów. · Siła: Głęboka treść, bez prowadzenia za rękę, szanuje czas ekspertów. · Kompromis: Odstrasza początkujących — odpadną lub zaleją kanały wsparcia.")
- "⭐ Zalecane: Warstwowa głębokość" (opis: "Główna ścieżka, którą wszyscy podążają + opcjonalne sekcje pogłębione. · Siła: Każdy otrzymuje wartość; zaawansowani uczniowie samodzielnie wybierają trudniejszy materiał. · Kompromis: Więcej treści do utrzymania; ryzyko ignorowania 'opcjonalnych' sekcji.")
- "Oddzielne ścieżki dla początkujących/zaawansowanych" (opis: "Dwie równoległe ścieżki rozchodzące się wcześnie. · Siła: Każda grupa odbiorców otrzymuje idealnie dopasowaną treść. · Kompromis: 2x koszt produkcji; dzielenie małej kohorty może zaszkodzić dynamice społeczności.")

### Przykład 3: Strategia / Proces — złożoność ŚREDNIA (np. Przepływ pracy newslettera)

`Bottleneck` to `[D]` — czyste sformułowanie problemu (jaki problem rozwiązać). To jest dokładnie ten rodzaj pytania, do którego istnieje ramka. Z briefem ramowym, pomiń to całkowicie; wiodąca hipoteza jest wąskim gardłem.

Zapytaj użytkownika: "Jakie jest główne wąskie gardło w obecnym procesie newslettera?" z opcjami:
- "⭐ Zalecane: Kuracja trwa zbyt długo" (opis: "Znajdowanie i ocenianie linków to powolny krok. · Siła: Bezpośrednio celuje w czas do publikacji — automatyzacja kuracji daje największe oszczędności czasu na podstawie obecnych czasów procesu. · Kompromis: Automatyczna kuracja ryzykuje utratę osobistego głosu redakcyjnego, który cenią subskrybenci.")
- "Pisanie komentarzy" (opis: "Linki są gotowe, ale pisanie wokół nich jest powolne. · Siła: Wspomagane przez AI pisanie może skrócić to o połowę. · Kompromis: Intensywne pisanie przez AI może sprawić, że newsletter będzie wydawał się generyczny — wymaga starannej kalibracji głosu.")
- "Dystrybucja i harmonogramowanie" (opis: "Treść jest gotowa, ale publikowanie jest ręczne. · Siła: Najłatwiejsze do zautomatyzowania — jasne wejścia i wyjścia. · Kompromis: Najmniejszy wpływ, jeśli kuracja lub pisanie nadal jest wąskim gardłem.")

**Uwaga**: Pytania koncentrują się na **CO powinno się wydarzyć** (wymagania, zachowanie, wyniki) — NIE na **JAK to zaimplementować** (wzorce kodu, konkretne narzędzia). Wybór `⭐ Recommended` jest oparty na badaniach i kontekście — użytkownik zawsze ma ostatnie słowo.