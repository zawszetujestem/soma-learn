---
title: SOMA Learn — wytyczne stylu homepage i widoków produkcyjnych
type: frontend-guidelines
language: pl
scope: "Homepage / oraz wszystkie istniejące widoki produkcyjne auth, kursów, wspólny header/footer i NotFound"
---

# SOMA Learn — wytyczne stylu homepage i widoków produkcyjnych

Jedno kanoniczne źródło zatwierdzonego stylu i jego realizacji. Punktem wyjścia jest [specyfikacja frontendu](SOMA_Learn_specyfikacja_frontend.md), zachowana jako wierna konwersja wersji 1.0. Ten dokument zapisuje późniejsze ustalenia, nie zatwierdza całego proponowanego produktu.

## Zatwierdzenie i granice — 31.10.2026, późniejsze rozszerzenie

- Nowa homepage zastępuje `/` z typograficznym logo.
- Zatwierdzona homepage zawiera **jawnie przykładowe kursy** i **statyczny podgląd lekcji**, nie dashboard.
- **Matura jest planowana**, bez dostępności, zapisów, sprzedaży lub obietnicy terminu.
- Manrope lokalny jest przyjętym założeniem technicznym.
- Początkowe zatwierdzenie dotyczyło wyłącznie `/`. **Późniejsza jawna zgoda użytkownika rozszerza kafelkowy styl homepage na wszystkie istniejące widoki produkcyjne**: logowanie, rejestrację, reset hasła, weryfikację e-maila, callback Google, katalog/szczegóły kursów, widoki mentora, edytor i podgląd wersji, moderację, dołączenie i instancję ucznia, wspólny header/footer oraz NotFound.
- Warianty ABC usunięto w całości. `/wzory/*` trafia do zwykłego NotFound, bez przekierowania; produkcyjny podgląd wersji kursu pozostaje dostępny na dotychczasowej trasie.
- To zmiana stylu istniejących ekranów, nie zatwierdzenie nowych funkcji lub tras proponowanych w specyfikacji. Bez zmian API, handlerów, `useLogoutFlow`, uprawnień, auth, lifecycle kursów, prywatności, limitów załączników ani obsługi konfliktu rewizji 409. Katalog nadal wymaga logowania.

## Kierunek i kolory

Nowoczesny minimalistyczny EdTech: przyjazny, nie infantylny, geometryczny, bez doodli. Warm White jako tło, białe powierzchnie kafelków, Deep Ink dla treści; oszczędne akcenty. Obecny hero homepage ma dekoracyjną **przerywaną krzywą z czterema kolorowymi punktami** (Coral, Lime, lawendowy, Blue), nie schody ani fikcyjny panel.

| Token w `.sl-home` i `.app-shell` | Nazwa | HEX | Zastosowanie |
|---|---|---|---|
| `--sl-blue` | Electric Blue | `#2936C8` | CTA, „soma.”, focus, numery kroków |
| `--sl-lime` | Fresh Lime | `#C6E875` | pozytywne akcenty, ścieżka ósmoklasisty |
| `--sl-coral` | Soft Coral | `#FF9377` | akcent ilustracji i kart |
| `--sl-paper` | Warm White | `#F7F6F0` | tło i powierzchnie pomocnicze |
| `--sl-ink` | Deep Ink | `#20243A` | tekst, „learn”, obrys przycisków |

Pomocnicza linia: `--sl-line: #d9d9df`; karty: `#fff`; periwinkle `#e8ebff` dla hero i wybranych powierzchni pomocniczych (`--sl-periwinkle` w shellu). Na Lime/Coral stosuj Deep Ink, nie biały tekst. Na Blue stosuj biały tekst; Blue jako tekst na bieli lub Warm White. Lime/Coral nie nadają się na drobny tekst na jasnym tle. Sprawdzaj rzeczywiście użyte pary: tekst ≥4,5:1, duży tekst i wymagane elementy nietekstowe ≥3:1. Linie czysto dekoracyjne nie zastępują granic funkcjonalnych kontrolek; shell używa obrysu `#75788c` dla pól formularzy.

## Typologo i lokalny font

`soma.`: lowercase, bold 800, Electric Blue. Wyraźny odstęp przed mniejszym `learn` (500, Deep Ink). Bez symbolu. Link ma nazwę „SOMA Learn, strona główna”.

Realizacja: tekst w inline SVG `viewBox="0 0 240 52"`, rozmiary 44/29, pozycje x=0/136. Eksportowany `HomeLogo` z `home/HomePage.jsx` jest współdzielony przez homepage oraz header/footer w App; rozszerzenie stylu nie zmienia jego DOM. To działający logotyp, nie finalny niezależny plik z konturami; taki asset wymaga zatwierdzenia kerningu. Fallback nie może powodować nachodzenia słów.

Rodzina: `'Manrope Variable', Manrope, system-ui, sans-serif`. `fonts.css` deklaruje lokalne WOFF2 z `@fontsource-variable/manrope`, latin i latin-ext, `font-display: swap`. Sprawdzaj polskie litery i brak zewnętrznych żądań fontów. Font jest przypisany pod `.sl-home` i `.app-shell`, bez nowej globalnej reguły fontu. Strzałki mogą korzystać z fallbacku. Manifest i lock zachowują DM Sans, Fraunces i Manrope; usunięto cztery nieużywane zależności fontów podglądów: Quicksand, Fredoka, Nunito i Lilita One.

## Skala i interakcje

- Kontener do 1200 px; breakpointy 600 i 900 px, mobile-first. Homepage ma zewnętrzny padding 16 px mobile, 24 px od 600 px, 32 px od 900 px; kontenery wewnętrzne 20/40 px. Shell ma padding 20 px / 40 px od 900 px.
- `.sl-tile` nadaje białe tło, promień 20 px i subtelny cień. Header/footer homepage mają 16 px, hero 24 px i periwinkle; białe karty ścieżek mają 18 px. Sekcje kafelkowe mają odstępy i padding według końcowych nadpisań w `home.css`, nie wcześniejszej skali 48/80 px dla całej strony.
- W shellu header/footer mają promień 24 px, karty/formularze/sekcje 20 px, białe powierzchnie i subtelny cień; intro auth ma 24 px i periwinkle. Kontrolki i akcje zawijają się; zagnieżdżone siatki mogą się kurczyć zamiast maskować overflow.
- Homepage: H1 32–40 px mobile / 48–64 px desktop, H2 26–30 / 32–40; waga 800. Shell: H1 32–56 px, H2 26–36 px z lokalnymi wariantami auth; H3 23 px.
- Tekst bazowy 16 px, line-height 1.65; lead desktop 18 px. Nawigacja i tekst pomocniczy 14 px, eyebrow 13 px.
- Linki nawigacyjne min. 44 px wysokości, przyciski min. 48 px; pola tekstowe shellu min. 48 px. Natywne checkboxy/radia mają 18 px.
- Przejścia przycisków 180 ms. Scoped reduced-motion wyłącza przejścia; istniejąca globalna reguła wyłącza płynne przewijanie.
- Kotwice pozostają natywne. Nie blokuj domyślnej nawigacji bez zapewnienia prawidłowego punktu startowego kolejnego Tab.
- Focus: obrys 3 px Blue z offsetem 4 px i białą poświatą; skip link homepage widoczny po fokusie. Sprawdzaj H1, landmarki i logiczną hierarchię nagłówków w konkretnych widokach.

## Treść, routing i SOMA

Hero: **„Ogarnij egzamin. Krok po kroku.”** Kolejność: header → hero → ścieżki → metoda → przykładowe kursy → statyczna lekcja → O nas → końcowe CTA → stopka.

Header homepage: Kursy (`/kursy`), Jak działa SOMA? (`#metoda`), O nas (`#o-nas`), Zaloguj się (`/logowanie`) lub Wyloguj, Zacznij naukę (gość `/rejestracja`, zalogowany `/kursy`). Wspólny header pozostałych tras zachowuje kolejność: Jak działa SOMA (`/#metoda`), Kursy, Logowanie lub Wyloguj. Katalog nadal wymaga auth. CTA prowadzą wyłącznie do istniejących tras lub prawdziwych sekcji. Końcowe „Utwórz konto” na homepage jest ukryte po zalogowaniu.

Wylogowanie zachowuje wspólny `useLogoutFlow`: busy/disabled, niepotwierdzenie z alertem i „Ponów wylogowanie”, potwierdzenie z `role="status"`; stan przetrwa zmianę nagłówka.

Metoda: **Cel → Plan → Mały krok → Postęp**, następnie refleksja i adaptacja planu. [Compass 1.0](soma/SOMA_Compass_1.0.md) jest fundamentem (projekt do zatwierdzenia), [Playbook 0.1](soma/SOMA_Playbook_0.1.md) praktyką, a [Applications 0.1](soma/SOMA_Applications_0.1.md) zasadami produktu (oba robocze). Nie zmienia to ich statusu ani nie zatwierdza proponowanych nazw i funkcji. Postęp opisuj uczciwie: ukończenie zadania nie musi oznaczać opanowania umiejętności. Bez presji, kar za przerwy i gwarancji wyniku.

Każda przykładowa karta homepage ma „Przykład”, zakres i poziom; sekcja wyjaśnia brak związku z dostępnością oferty. Preview homepage to statyczna ilustracja kroku z czasem i rezultatem, bez oceniania, zapisu lub danych osobistych. „O nas” opisuje podejście, nie wymyślony zespół. Nie dodawaj fikcyjnych cen, ocen, uczniów, referencji, AI, funkcji panelu ani mechanik grywalizacji.

## Implementacja i granice stylowania

Kod: [HomePage.jsx](../frontend/src/home/HomePage.jsx), [home.css](../frontend/src/home/home.css), [fonts.css](../frontend/src/home/fonts.css), [App.jsx](../frontend/src/App.jsx), [app-shell.css](../frontend/src/app-shell.css), [main.jsx](../frontend/src/main.jsx). `.sl-home` pozostaje odrębnym layoutem `/`; `.app-shell` obejmuje pozostałe istniejące widoki produkcyjne. Scoped tokeny shellu mapują istniejące nazwy zmiennych na wspólny styl bez przebudowy formularzy i edytorów. Nie dodawaj globalnych nadpisań `body`, `html`, `:root` ani maskowania overflow.

**Kolejność kaskady:** `main.jsx` importuje `styles.css`, następnie `app-shell.css`. Nie przenoś importu shellu do App przed style bazowe: niezależne QA ujawniło P2, w którym reguły bazowe wygrywały z nadpisaniami. Kolejność poprawiono i potwierdzono testem oraz stylami computed w przeglądarce.

Usunięte pliki wariantów ABC: `frontend/src/design-preview/HomeVariants.jsx`, `frontend/src/design-preview/homeVariants.css`, `frontend/tests/design-preview.test.jsx`. Nie dotyczy to `courses/VersionPreviewPage.jsx`. Trasy i użytkowe zasady kursów opisuje [frontend README](../frontend/README.md#trasy-i-zakres), bez powielania kontraktów API tutaj.

Przy zmianach wymagaj TDD i niezależnego QA: treść, linki i auth/retry, klawiatura/skip/kotwice, reduced motion, kontrast faktycznych kolorów, polski font, overflow przy 320/390 px i desktop, reflow oraz regresja wypełnionych kursów, edytorów i auth. Sprawdzaj też NotFound dla `/wzory/*`.

## Odbiór — rozdzielenie etapów

**Historyczna homepage, 31.10.2026:** QA PASS; 260 passed / 1 skipped, build OK. Chrome 156/CDP: 320/390/768/960/1440 bez overflow, kontrast tekstu minimum 7,05:1, lokalny font i 18 polskich liter, focus i skip, zoom 200%/400% oraz odstępy tekstu; wówczas regresja wizualna innych tras bez zmian. Poprawione kotwice: 12/12 scenariuszy z reduced motion i bez; auth/logout także z zamockowanym API. To zapis wcześniejszej realizacji, **nie odbiór późniejszych kafelków homepage**. Ich osobne QA zmiany nadrzędnej pozostaje do potwierdzenia.

**Rozszerzenie stylu produkcyjnego, 31.10.2026:** przekazane niezależne CODE QA **PASS** po poprawce P2 kaskady. Pełny frontend 289 passed / 1 skipped, build PASS; regresja 10 plików / 155 passed. Szczegółowy zakres, TDD, środowisko i ograniczenia: [frontend README — Weryfikacja](../frontend/README.md#weryfikacja). Dokumentacja nie stanowi ponownego wykonania CODE QA.

Obserwacja P3, nieblokująca i niepotwierdzona jako regresja: w głęboko wypełnionym edytorze przy 320×900 część textarea pozostawała częściowo poniżej viewportu podczas Tab (`TestEditor.jsx:23`, `LessonItemEditor.jsx:29`). Widok był przewijalny, focus widoczny, bez poziomego obcięcia i blokady edycji. Nie dokumentuj tego jako naprawionego błędu.

Nie wykonano pełnego WCAG, screen readera, Core Web Vitals/Lighthouse, Firefox/Safari, fizycznych urządzeń, pełnego rzeczywistego E2E auth, testów backendu ani penetracji dla rozszerzenia. Responsive-equivalent viewporty nie są natywnym zoomem; zrzuty zapisano tylko w pamięci i nie oceniono wizualnie. PASS nie oznacza pełnej zgodności WCAG ani odbioru estetyki.

Dodatkowa inspekcja koordynatora po CODE QA: obejrzano zrzuty rzeczywistego logowania przy 1440 px i rejestracji przy 390 px; potwierdzono spójny wygląd kafelków, logo i formularzy, bez widocznego obcięcia. W obu próbkach `scrollWidth` odpowiadał viewportowi, a overflow shellu był `visible`. Nie jest to wizualny odbiór wszystkich ekranów kursów ani osobne QA kafelków homepage.
