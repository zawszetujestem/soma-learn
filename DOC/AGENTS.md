# Agenci projektu soma-learn

Ta sekcja opisuje agentów, którzy będą współpracować przy tworzeniu aplikacji.

Konfiguracje agentów dla GitHub Copilot w VS Code znajdują się w `.github/agents/`. Pełny przepływ prowadzi `SOMA Orchestrator`; uruchom go z listy agentów albo użyj promptu `/soma-feature` w chacie. Koordynator najpierw doprecyzowuje wymagania z użytkownikiem i właściwymi specjalistami, a implementację rozpoczyna dopiero po potwierdzeniu, że nie ma istotnych niewiadomych. Następnie prowadzi planowanie, implementację, testy, audyt QA i aktualizację dokumentacji.

## Agenci

1. `Framework Analyst` – analizuje i ulepsza framework SOMA.
2. `Business Analyst` – analizuje wymagania biznesowe i tworzy user stories.
3. `Task Planner` – dzieli user stories na zadania programistyczne.
4. `Backend Developer` – tworzy backend w Pythonie + Django REST Framework.
5. `Frontend Developer` – tworzy frontend w React.
6. `Mobile Specialist` – projektuje rozwiązania mobilne i responsywne.
7. `QA Engineer` – testuje funkcjonalności i zgłasza błędy.
8. `Documentation Writer` – tworzy i aktualizuje dokumentację.
9. `Technology Advisor` – doradza wybór technologii i architektury.
10. `DevOps Engineer` – przygotowuje Docker, CI/CD i wdrożenie w chmurze.

## Kluczowe zasady pracy

- Dla homepage i wszystkich istniejących widoków produkcyjnych obowiązuje jedno źródło [zatwierdzonych wytycznych stylu](FRONTEND_STYLE.md), linkowane przez właściwe role i scoped instrukcję UX. Późniejsze zatwierdzenie rozszerza zakres stylu i usuwa warianty ABC, nie zatwierdza nowych funkcji ze specyfikacji.

- Każda funkcjonalność uwzględnia dokumenty w [DOC/soma](soma/): [Compass](soma/SOMA_Compass_1.0.md) określa filozofię i zasady, [Playbook](soma/SOMA_Playbook_0.1.md) praktyczne stosowanie, a [Applications](soma/SOMA_Applications_0.1.md) projektowanie produktów. Koordynator przekazuje właściwe ustalenia rolom, analityk przekłada je na kryteria, developerzy realizują je w uzgodnionym zakresie, a QA weryfikuje zgodność.
- Szczegółowe reguły źródeł, statusów roboczych, konfliktów i zakresu są we [wspólnych instrukcjach Copilota](../.github/copilot-instructions.md#dokumenty-soma-obowiązujące-przy-pracy-nad-funkcjonalnościami) i konfiguracjach poszczególnych agentów. Dokumenty nie zatwierdzają automatycznie nowych funkcji ani przykładów nazw. Przy UI obowiązuje także [specyfikacja frontendu](SOMA_Learn_specyfikacja_frontend.md) z uwzględnieniem późniejszych ustaleń.
- Praca musi być prowadzona w trybie TDD.
- Backend powinien korzystać z Django REST Framework.
- Frontend jest budowany w React.
- Do kolejkowania zadań używane jest Celery, gdy jest to potrzebne.
- Aplikacja ma docelowo działać w chmurze.
- Agenci korzystają z najoptymalniejszych modeli i optymalizują pracę poprzez zapamiętywanie kontekstu oraz tworzenie ułatwiającej dokumentacji, aby zminimalizować niepotrzebne zapytania i analizę zbędnych plików.
- Dokumentacja musi być aktualizowana na bieżąco po każdej zaakceptowanej funkcjonalności.
