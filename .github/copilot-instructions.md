# SOMA Learn: instrukcje dla Copilota

- Przed zmianami sprawdzaj właściwe dokumenty w `DOC/` i istniejące wzorce w kodzie; kod jest źródłem prawdy, jeśli dokumentacja jest nieaktualna.
- Przy pełnych funkcjonalnościach używaj agenta `SOMA Orchestrator` albo promptu `/soma-feature`. Koordynator deleguje pracę wyspecjalizowanym agentom i przekazuje ich ustalenia dalej.
- Przed implementacją zbierz brakujące wymagania od właściwych agentów i użytkownika. Nie twórz kodu ani testów funkcjonalnych, dopóki wszystkie istotne pytania i decyzje implementacyjne nie zostaną wyjaśnione.
- Pracuj w TDD: po zatwierdzeniu kompletnego obrazu ustal kryteria akceptacji, dodaj lub zaktualizuj testy, uruchom je, a następnie implementuj najmniejszą zmianę.
- Zachowuj istniejącą architekturę i stack. Projekt opisuje Django REST Framework, React i Celery w razie potrzeby; nie dodawaj technologii bez uzasadnienia.
- Po implementacji wymagaj QA: testów względem kryteriów, regresji odpowiedniego zakresu i audytu ryzyk. Nie deklaruj zaliczenia testów ani audytu, jeśli nie zostały wykonane.
- Po pozytywnym QA aktualizuj dokumentację zgodnie ze zmianą i zweryfikuj, że opis odpowiada implementacji.
- Uruchamiaj testy i kontrole właściwe dla zmienionego obszaru. W podsumowaniu podaj zmiany, wyniki testów i audytu oraz nierozwiązane ryzyka.
- Obsługa błędów HTTP: każda odpowiedź API o statusie 4xx lub 5xx musi zawierać niepuste pole `message` z jasnym, bezpiecznym dla użytkownika opisem błędu. Zachowuj status HTTP, istniejące kody maszynowe, szczegóły walidacji i kontrakty frameworków; adaptuj odpowiedź na granicy API zamiast po cichu pomijać lub nadpisywać błąd. Frontend ma wyświetlać otrzymany komunikat albo świadomie mapować kod błędu na lokalizowany komunikat, nie zastępując znanych błędów ogólnym tekstem. Testuj status, kształt odpowiedzi i komunikat dla dodanych lub zmienionych ścieżek błędów. W diagnostyce uwzględniaj status, endpoint/operację i bezpieczny kod błędu, ale nigdy nie zapisuj haseł, kodów OTP, tokenów, cookies ani innych sekretów.

## Dokumenty SOMA obowiązujące przy pracy nad funkcjonalnościami

Przed analizą, projektowaniem, implementacją i QA każdej funkcjonalności korzystaj z dokumentów Markdown w [`DOC/soma/`](../DOC/soma/). Sprawdź ich aktualne wersje i status; w obrębie tej samej zmiany przekazuj ustalenia między rolami zamiast ponownie odczytywać niezmienione materiały.

| Dokument | Rola |
|---|---|
| [SOMA Compass](../DOC/soma/SOMA_Compass_1.0.md) | W co wierzymy: filozofia, zasady, niezmienne jądro, role i granice SOMA. |
| [SOMA Playbook](../DOC/soma/SOMA_Playbook_0.1.md) | Jak stosować SOMA krok po kroku: kierunek, ścieżka, pula zadań, cykl, codzienny krok, refleksja i adaptacja. |
| [SOMA Applications](../DOC/soma/SOMA_Applications_0.1.md) | Jak projektować produkty i usługi: przełożenie frameworka na SOMA Learn, UX, motywację, sensowny postęp, prywatność oraz odrębność produktu. |

- Zachowuj świadomy kierunek, wykonalne małe kroki, realistyczny rytm, adaptację, refleksję i samodzielność użytkownika. Przerwy i odpoczynek nie wymagają kary ani odpracowywania. Mentor i AI wspierają, nie przejmują kontroli.
- Nie utożsamiaj ukończenia zadania, kliknięć ani dni aktywności z opanowaniem umiejętności. Grywalizacja jest opcjonalną mechaniką produktu, nie obowiązkowym elementem frameworka; nie wprowadzaj jej ani globalnych rankingów bez uzgodnionego zakresu.
- Przełóż istotne zasady na wymagania i kryteria akceptacji, a w QA sprawdź ich realizację. Nie dodawaj wszystkich elementów procesu do każdej małej funkcji; wskaż, które dotyczą zmiany, a które nie mają zastosowania.
- Dokumenty określają kierunek projektowania, nie dowodzą istnienia funkcji w kodzie. Ich status roboczy, przykłady, szablony i mapa nazw produktu nie zatwierdzają automatycznie nowych funkcji, zmian API, nazw ani licencji. Zmiany jądra SOMA wymagają jawnej decyzji i wersjonowania.
- Przy rozbieżności oddziel fakty o obecnej implementacji od docelowych zasad SOMA i uzgodnionego zakresu. Zgłoś konflikt koordynatorowi/użytkownikowi przed implementacją; nie ignoruj zasad z powodu starego kodu ani nie zmieniaj zachowania poza wymaganiem.
- Przy UI korzystaj także z [specyfikacji frontendu](../DOC/SOMA_Learn_specyfikacja_frontend.md), uwzględniając jej status i późniejsze ustalenia. Nie traktuj propozycji routingu, komponentów, fontów i funkcji jako zatwierdzonych ani nie nadpisuj nimi późniejszych decyzji użytkownika.

## Zatwierdzony styl homepage i widoków produkcyjnych

Przy pracy nad UI sprawdzaj [kanoniczne wytyczne stylu](../DOC/FRONTEND_STYLE.md): zapisują zatwierdzenie homepage, późniejsze jawne rozszerzenie na wszystkie istniejące widoki produkcyjne i usunięcie ABC oraz faktyczny odbiór względem źródłowej specyfikacji. Paleta, typologo i granice scoped stylu mają jedno źródło; nie kopiuj ich do każdej roli. To nie zatwierdza nowych funkcji ani proponowanych tras. [Scoped instrukcja UX](instructions/soma-learn-ux.instructions.md) obejmuje właściwy kod i testy.

## Konfiguracje ról

Role i ich zakresy opisano w [`DOC/AGENTS.md`](../DOC/AGENTS.md) oraz `DOC/agents/`. Pełny przepływ prowadzi `SOMA Orchestrator`; role specjalistyczne mogą być też wybrane samodzielnie z listy agentów.