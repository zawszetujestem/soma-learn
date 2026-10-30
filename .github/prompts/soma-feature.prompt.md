---
name: SOMA Feature
description: "Uruchamia pełny, koordynowany cykl realizacji funkcjonalności SOMA Learn: doprecyzowanie wymagań, plan, implementację, testy, audyt QA i dokumentację."
agent: SOMA Orchestrator
argument-hint: "Opisz funkcjonalność, użytkowników, oczekiwane zachowanie i ograniczenia."
---

Zrealizuj poniższe wymaganie jako kompletną funkcjonalność SOMA Learn.

Wymaganie:
${input}

Najpierw przeprowadź analizę z `SOMA Orchestrator`. Poproś zaangażowanych agentów o wskazanie brakujących decyzji biznesowych i implementacyjnych. Jeśli są istotne niewiadome, przedstaw mi konkretne pytania i zatrzymaj się bez tworzenia kodu, testów funkcjonalnych ani dokumentacji funkcji. Po moich odpowiedziach potwierdź z agentami kompletność obrazu; dopiero wtedy zaplanuj i zaimplementuj zmianę w TDD, zweryfikuj ją testami i niezależnym audytem QA, a po pozytywnym QA zaktualizuj właściwą dokumentację. W raporcie podaj wyniki testów i audytu oraz jawnie wskaż niewykonane kontrole i otwarte ryzyka.