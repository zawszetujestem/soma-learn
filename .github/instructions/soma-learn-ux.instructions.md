---
description: "Zatwierdzony styl homepage i istniejących widoków produkcyjnych SOMA Learn oraz kryteria UX dla kodu i testów."
applyTo: "frontend/src/home/**,frontend/src/App.jsx,frontend/src/AuthPages.jsx,frontend/src/main.jsx,frontend/src/styles.css,frontend/src/app-shell.css,frontend/src/courses/**,frontend/src/useLogoutFlow.js,frontend/tests/home.test.jsx,frontend/tests/App.test.jsx,frontend/tests/app-shell.test.jsx,frontend/tests/session-navigation.test.jsx,frontend/tests/trusted-browser.test.jsx,frontend/tests/password-field.test.jsx,frontend/tests/password-reset.test.jsx,frontend/tests/courses/**"
---

Przed zmianą korzystaj z [kanonicznych wytycznych stylu](../../DOC/FRONTEND_STYLE.md) oraz [źródłowej specyfikacji](../../DOC/SOMA_Learn_specyfikacja_frontend.md). Wytyczne zapisują późniejsze zatwierdzenie i faktyczną realizację; propozycje całego produktu w specyfikacji nie są automatycznie zatwierdzone.

Późniejsze jawne zatwierdzenie obejmuje styl wszystkich istniejących widoków produkcyjnych: homepage pod `.sl-home`, auth, kursy, wspólny header/footer i NotFound pod `.app-shell`. Warianty ABC usunięto; `/wzory/*` trafia do zwykłego NotFound bez przekierowania, ale produkcyjny podgląd wersji kursu pozostaje. Zachowuj istniejące API, handlery, `useLogoutFlow`, uprawnienia, auth, lifecycle, prywatność, limity załączników i konflikty rewizji 409; nie dodawaj funkcji z propozycji. Palety i zasad logo nie kopiuj do konfiguracji agentów — odsyłaj do wytycznych.

Zachowuj kolejność importów `styles.css` → `app-shell.css` w `main.jsx` i współdzielony istniejący `HomeLogo`, zgodnie z wytycznymi. Nie maskuj overflow.

Pracuj w TDD; w QA sprawdzaj jawne przykłady, planowaną maturę, statyczny preview, lokalny polski font, kontrast, focus, natywne kotwice/reduced motion oraz mobile overflow w wypełnionych widokach auth i kursów, głębokich edytorach i dialogach. Odróżniaj responsive-equivalent reflow od natywnego zoomu, pomiary od inspekcji estetyki oraz historyczny odbiór homepage od osobnego QA jej późniejszych kafelków. Raportuj niewykonane kontrole i niepotwierdzone obserwacje, nie jako naprawione błędy.
