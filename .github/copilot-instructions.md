# SOMA Learn: instrukcje dla Copilota

- Przed zmianami sprawdzaj właściwe dokumenty w `DOC/` i istniejące wzorce w kodzie; kod jest źródłem prawdy, jeśli dokumentacja jest nieaktualna.
- Przy pełnych funkcjonalnościach używaj agenta `SOMA Orchestrator` albo promptu `/soma-feature`. Koordynator deleguje pracę wyspecjalizowanym agentom i przekazuje ich ustalenia dalej.
- Przed implementacją zbierz brakujące wymagania od właściwych agentów i użytkownika. Nie twórz kodu ani testów funkcjonalnych, dopóki wszystkie istotne pytania i decyzje implementacyjne nie zostaną wyjaśnione.
- Pracuj w TDD: po zatwierdzeniu kompletnego obrazu ustal kryteria akceptacji, dodaj lub zaktualizuj testy, uruchom je, a następnie implementuj najmniejszą zmianę.
- Zachowuj istniejącą architekturę i stack. Projekt opisuje Django REST Framework, React i Celery w razie potrzeby; nie dodawaj technologii bez uzasadnienia.
- Po implementacji wymagaj QA: testów względem kryteriów, regresji odpowiedniego zakresu i audytu ryzyk. Nie deklaruj zaliczenia testów ani audytu, jeśli nie zostały wykonane.
- Po pozytywnym QA aktualizuj dokumentację zgodnie ze zmianą i zweryfikuj, że opis odpowiada implementacji.
- Uruchamiaj testy i kontrole właściwe dla zmienionego obszaru. W podsumowaniu podaj zmiany, wyniki testów i audytu oraz nierozwiązane ryzyka.

## Agenci

Role i ich zakresy opisano w [`DOC/AGENTS.md`](../DOC/AGENTS.md) oraz `DOC/agents/`. Pełny przepływ prowadzi `SOMA Orchestrator`; role specjalistyczne mogą być też wybrane samodzielnie z listy agentów.