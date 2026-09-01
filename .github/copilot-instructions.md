<!-- BEGIN @przeprogramowani/10x-cli -->

---
name: 10xDevs AI Toolkit - Module 3, Lesson 4 (E2E Tests)
description: End-to-end testing with AI tools
license: CC BY-NC-ND 4.0
metadata:
  tags: AI, E2E, testing, Playwright
  version: 1.0.0
  module: 3
  lesson: 4
---

## 10xDevs AI Toolkit - Moduł 3, Lekcja 4 (Testy E2E)

**Do testów E2E użyj umiejętności `/10x-e2e`.** Jest to jedyne źródło prawdy
dla przepływu pracy — ryzyko → test początkowy + reguły → generowanie → przegląd pod kątem pięciu
antywzorców → ponowne zapytanie → weryfikacja. `references/` tej umiejętności
zawierają pełne reguły, antywzorce, wzorzec początkowy i szablon promptu.

Kilka twardych reguł, które obowiązują jeszcze przed wywołaniem umiejętności:

- **Lokatory:** Najpierw `getByRole` / `getByLabel` / `getByText`; `getByTestId`
  tylko wtedy, gdy atrybuty dostępności są niejednoznaczne. Nigdy selektory CSS, XPath
  ani struktura DOM.
- **Nigdy `page.waitForTimeout()`.** Czekaj na stan: `toBeVisible()`,
  `waitForURL()`, `waitForResponse()`.
- **Niezależność testów + czyszczenie.** Każdy test działa samodzielnie — własna konfiguracja,
  akcja, asercja i czyszczenie; unikalne identyfikatory (sufiks znacznika czasu), aby równoległe uruchomienia
  i ponowne uruchomienia nie kolidowały.

Dwie granice, które należy rozróżnić:

- **DOM (migawka) jest domyślny.** Wizja (`--caps=vision`) jest uzupełnieniem dla
  ryzyk wizualnych (układ, z-index, animacja); dla regresji pikseli preferuj
  narzędzia deterministyczne (`toMatchSnapshot`, Argos, Lost Pixel). Wybór/koszt modelu VLM
  to temat debugowania (Lekcja 5), a nie testowania.
- **Healer pomaga w selektorach, szkodzi w logice.** Zmieniony selektor → healer
  odnajduje go ponownie (trasa przez przegląd PR). Zmienione zachowanie biznesowe → healer
  maskuje błąd; ten przypadek nieudanego testu do naprawy to Lekcja 5.

<!-- END @przeprogramowani/10x-cli -->
