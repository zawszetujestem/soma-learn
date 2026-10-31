---
title: SOMA Learn — Specyfikacja dla frontend developera
version: '1.0'
type: frontend-specification
language: pl
status: 'Paleta i kierunek logotypu zaakceptowane; pozostałe elementy wskazane jako propozycje'
source: SOMA_Learn_specyfikacja_frontend.pdf
---

# SOMA Learn

**Specyfikacja dla frontend developera | Wersja 1.0**

Platforma kursów szkolnych dla uczniów 10–18 lat. Pierwszy etap: przygotowanie do egzaminu ósmoklasisty i matury. Kierunek: nowoczesny EdTech, minimalistyczny, technologiczny, przyjazny, ale nie infantylny.

**Status:** paleta kolorystyczna i kierunek logotypu zaakceptowane. Układ stron, funkcje oraz font docelowy to propozycje do zatwierdzenia.

## 1. Logo i identyfikacja wizualna

**Logotyp (kompozycja):** `soma. learn`

Wybrany wariant: typograficzny. „soma.” małymi literami, pogrubione, Electric Blue; „learn” mniejsze, Deep Ink. Obowiązkowy wyraźny odstęp między kropką a słowem „learn”. Bez dodatkowego symbolu w podstawowym logotypie.

Font do testów: Manrope ExtraBold / Medium, alternatywnie Plus Jakarta Sans. Podgląd w źródłowym PDF jest referencją kompozycji, nie finalnym plikiem logo. Przygotować docelowy SVG po zatwierdzeniu kerningu.

| Kolor | HEX | Zastosowanie |
|---|---|---|
| Electric Blue | `#2936C8` | CTA i identyfikacja |
| Fresh Lime | `#C6E875` | Postęp i pozytywne akcje |
| Soft Coral | `#FF9377` | Akcent |
| Warm White | `#F7F6F0` | Tło |
| Deep Ink | `#20243A` | Tekst |

Kontrolować kontrast WCAG AA.

## 2. Styl interfejsu

- Tła Warm White, powierzchnie kart białe, granatowe nagłówki i teksty.
- Zaokrąglenia: 8 / 12 / 20 / 28 px. Proste, geometryczne formy i oszczędne ilustracje.
- Animacje 150–250 ms, z obsługą `prefers-reduced-motion`.
- Typografia: H1 48–64 px desktop / 32–40 px mobile; H2 32–40 / 26–30; tekst 16–18 / 16 px.
- Kontener maksymalnie 1200 px; padding desktop 32–48 px, mobile 16–20 px.

## 3. Architektura informacji i routing (propozycja)

| Ścieżka | Funkcja |
|---|---|
| `/` | Strona główna, oferta, metoda SOMA |
| `/kursy` | Katalog, filtry egzaminu i przedmiotu |
| `/kursy/[slug]` | Szczegóły kursu, program, CTA |
| `/logowanie`, `/rejestracja` | Dostęp do konta |
| `/panel` | Dashboard ucznia |
| `/panel/kursy/[id]` | Ścieżka, moduły, lekcje |
| `/panel/lekcje/[id]` | Materiał i ćwiczenia |
| `/panel/postepy` | Postęp, cele, refleksja |

## 4. Strona główna — kolejność sekcji

- Header: logo, Kursy, Jak działa SOMA?, O nas, Zaloguj się, Zacznij naukę.
- Hero: „Ogarnij egzamin. Krok po kroku.” + opis + CTA „Odkryj kursy”.
- Dwa główne kierunki: Egzamin ósmoklasisty / Matura.
- Jak działa SOMA?: Cel → Plan → Mały krok → Postęp.
- Katalog lub przykładowe karty kursów z zakresem i poziomem.
- Podgląd lekcji lub panelu ucznia, następnie końcowe CTA i stopka.

## 5. Panel ucznia i metoda SOMA

Dashboard powinien odpowiadać na trzy pytania: **Co mam zrobić dzisiaj? Co już potrafię? Jaki jest następny krok?**

| Framework | Element w interfejsie |
|---|---|
| Vision | Cel: egzamin ósmoklasisty lub matura |
| Path | Ścieżka przygotowań i moduły |
| Cycle | Plan na tydzień |
| Daily Focus | Jedno realistyczne zadanie na dziś |
| Reflection | Co już umiem, a co warto powtórzyć? |

Wymagane komponenty dashboardu: postęp kursu, zadanie dnia, lista modułów, CTA „Rozpocznij”, feedback i podsumowanie cyklu.

## 6. Biblioteka komponentów

- **Layout:** `Header`, `Footer`, `Container`.
- **UI:** `Button`, `Card`, `Badge`, `ProgressBar`, `Tabs`, `Modal`, `FormField`.
- **Kursy:** `CourseCard`, `CourseFilters`, `CourseOutline`, `LessonCard`.
- **Nauka:** `DailyFocus`, `LearningPath`, `CycleSummary`, `ReflectionForm`.

## 7. Zasady UX wynikające z manifestu

- Brak kar za przerwy i utracone serie dni.
- Zadania o osiągalnym zakresie, z jasnym celem i przewidywanym czasem.
- Widoczny postęp oparty na rzeczywistym ukończeniu materiału.
- Błędy wywołują wyjaśnienie i ponowną próbę, nie zawstydzający komunikat.
- Uczeń może dostosować tempo i plan w ramach programu kursu.
- Po cyklu krótka refleksja: co działa, co wymaga poprawy.

## 8. Wymagania techniczne

- Mobile-first, responsywność i semantyczny HTML.
- Dostępność WCAG 2.2 AA: focus, klawiatura, kontrast, etykiety formularzy.
- Logo SVG (wariant jasny i ciemny), fonty WOFF2, fallbacki.
- Optymalizacja obrazów, wydajności i Core Web Vitals.
- Stany: default, hover, focus, disabled, loading, error, success, empty.
- Ochrona danych niepełnoletnich i minimalizacja danych osobowych.

## 9. Etapowanie i kryteria odbioru

- **Etap 1:** finalny logotyp SVG, design tokens, komponenty bazowe, responsywna strona główna.
- **Etap 2:** katalog i strony kursów.
- **Etap 3:** dashboard i lekcje.

**Odbiór etapu 1:** poprawny odstęp kropka–learn, spójne kolory, poprawny mobile i desktop, dostępne przyciski i formularze, czytelne ścieżki do obu typów egzaminów.

## 10. Otwarte decyzje produktowe

Stack frontendowy, backend i API, logowanie, zakup i dostęp do kursów, format lekcji (wideo/tekst/quiz), zapis postępów, panel rodzica, CMS, analityka i administracja. Nie są jeszcze zatwierdzone.

**Zasada nadrzędna:** SOMA Learn ma dawać uczniowi poczucie kierunku, kontroli i osiągalnego postępu, bez presji i bez infantylnego języka wizualnego.

---

> Uwaga dotycząca wersjonowania: dokument jest wierną konwersją wcześniejszej specyfikacji frontend 1.0. Nie uwzględnia automatycznie późniejszych ustaleń dotyczących SOMA Compass, SOMA Playbook ani nazewnictwa grywalizacji w SOMA Learn.
