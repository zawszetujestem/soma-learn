---
project: "SOMA-learn"
researched_at: "2026-08-31"
recommended_platform: "Railway"
runner_up: "Render"
context_type: mvp
tech_stack:
  language: "Python 3.14"
  framework: "Django 6"
  runtime: "Docker container"
---

## Recommendation

**Deploy on Railway.**

Railway najlepiej odpowiada priorytetowi szybkiej iteracji: wykrywa repozytoryjny `Dockerfile`, ma oficjalny przewodnik dla Django, szerokie CLI z wyjściem JSON oraz oficjalny MCP dla VS Code. Aplikacja, PostgreSQL i ewentualny przyszły worker mogą działać w jednym projekcie i komunikować się przez sieć prywatną. Decyzja zakłada mały ruch w jednym regionie i świadomie akceptuje większą odpowiedzialność za standardowy szablon PostgreSQL.

## Platform Comparison

| Platforma | CLI-first | Managed / serverless | Dokumentacja dla agenta | Stabilne API wdrożeń | MCP / integracja | Wynik | Dopasowanie |
|---|---|---|---|---|---|---:|---|
| Railway | Pass | Pass | Pass | Pass | Pass | 5.0/5 | Shortlist 1 |
| Render | Partial | Pass | Pass | Pass | Pass | 4.5/5 | Shortlist 2 |
| Fly.io | Pass | Partial | Pass | Pass | Fail | 4.0/5 | Shortlist 3 |
| Vercel | Pass | Pass | Partial | Pass | Pass | 4.5/5 | Odrzucona: brak docelowego workflow Docker i trwałych workerów |
| Cloudflare Workers | Pass | Pass | Pass | Pass | Pass | 5.0/5 | Odrzucona: pełne Django/Python w Dockerze nie pasuje do runtime Workers |
| Netlify | Pass | Pass | Pass | Pass | Pass | 5.0/5 | Odrzucona: brak runtime dla pełnej aplikacji Django i brak wdrożeń Docker |

Oceny i statusy sprawdzono 2026-08-31 w oficjalnej dokumentacji platform. `Pass` oznacza funkcję produkcyjną bez wskazanego oznaczenia beta/preview; wyjątki są nazwane poniżej.

Railway ma najszerszy sprawdzony zakres CLI: `railway up`, `railway deployment list`, `railway logs`, `railway variable`, `railway domain` i konfigurację infrastruktury jako kod. Dokumentacja udostępnia instrukcje dla Django, Dockerfile i MCP. Docker Compose import nie obsługuje jeszcze całej specyfikacji, a standardowy szablon PostgreSQL jest opisany jako unmanaged.

Render zapewnia Docker, Django, w pełni zarządzany PostgreSQL, Frankfurt, preview, Blueprints i oficjalny MCP. CLI potrafi tworzyć deploy i czytać logi, ale rollback jest wykonywany przez REST API albo panel, dlatego CLI-first ma ocenę `Partial`. Płatny minimalny wariant aplikacja + baza zaczyna się około $13 miesięcznie.

Fly.io ma dojrzałe `flyctl`, natywne budowanie Dockerfile, procesy trwałe i dobre dokumenty w publicznym repozytorium. Wymaga jednak więcej decyzji o maszynach, sieci i skalowaniu, nie oferuje oficjalnego MCP, a Managed Postgres zaczyna się od około $38 miesięcznie plus storage.

Vercel może uruchamiać aplikacje Python/Django jako funkcje, ale nie realizuje przyjętego kontraktu Docker i nie daje stale działającego procesu dla przyszłego workera. Cloudflare Python Workers nie są zgodnym środowiskiem dla pełnego Django w kontenerze. Netlify Functions nie obsługują pełnej aplikacji Django ani obrazów Docker.

### Shortlisted Platforms

#### 1. Railway (Recommended)

Wygrywa dzięki połączeniu prostego wdrożenia Docker, współlokowanych usług, kompletnego CLI i integracji agentowej. Plan Hobby kosztuje $5 miesięcznie i zawiera $5 użycia; dalsze zużycie jest mierzone według CPU, RAM, storage i egress.

#### 2. Render

Najmocniejsza alternatywa, jeśli zarządzanie PostgreSQL ma przeważyć nad szybkością pracy CLI. Oferuje w pełni zarządzaną bazę, Docker, Frankfurt i przewidywalne ceny, ale operacyjny rollback nie jest pełną ścieżką CLI.

#### 3. Fly.io

Najlepszy wybór, jeśli trwałe procesy lub kontrola kontenera staną się głównym wymaganiem. Na obecnym etapie większy ciężar operacyjny i koszt zarządzanej bazy nie są uzasadnione przez małe MVP.

## Anti-Bias Cross-Check: Railway

### Devil's Advocate — Weaknesses

1. Standardowy PostgreSQL jest szablonem opartym na oficjalnym obrazie, ale Railway nazywa takie szablony unmanaged; backupy, aktualizacje i odtwarzanie wymagają świadomej obsługi.
2. Koszt zależy od sekund użycia CPU i pamięci, więc stale działająca aplikacja, baza i przyszły worker mogą przekroczyć pozornie niski plan Hobby.
3. Aktualna referencja CLI nie dokumentuje jednoznacznej komendy rollback do wskazanego wcześniejszego deploymentu; redeploy i usunięcie ostatniego deploymentu nie są tym samym co deterministyczny rollback.
4. Preview dla gałęzi wymaga zaprojektowania środowisk i izolacji bazy; samo `railway up` nie gwarantuje bezpiecznego preview per PR.
5. Oficjalny MCP obejmuje akcje wdrożeniowe i modyfikujące; niewłaściwie szeroki dostęp agenta może zmienić produkcję lub koszty.

### Pre-Mortem — How This Could Fail

Sześć miesięcy po wdrożeniu Railway stał się źródłem ciągłych problemów, ponieważ MVP potraktowało prosty start jako pełną strategię operacyjną. Aplikacja, PostgreSQL i worker działały bez limitów zużycia, więc rachunek rósł wraz z pamięcią i czasem CPU, mimo niewielkiego ruchu użytkowników. Zespół założył, że współlokowany PostgreSQL jest w pełni zarządzany, ale nie przetestował backupu ani odtwarzania. Pierwsza nieudana migracja zablokowała start nowego obrazu, a próba powrotu do wcześniejszego deploymentu cofnęła kod, lecz nie schemat danych. Brak osobnego środowiska preview sprawił, że testy wdrożeniowe korzystały z produkcyjnych zmiennych lub były pomijane. Agent miał szeroki dostęp przez CLI i MCP, więc rutynowy redeploy wykonano na niewłaściwym środowisku. Retencja logów planu Hobby była zbyt krótka, aby odtworzyć incydent po tygodniu. Ostatecznie platforma nie zawiodła technicznie; zawiodły założenia, że automatyczne wykrywanie Dockerfile, prywatna sieć i jeden projekt zastępują politykę migracji, backupów, limitów kosztu, rozdzielenia środowisk oraz minimalnych uprawnień. Migracja na inną platformę stała się pilna dopiero wtedy, gdy dane i proces wdrożeniowy były już silnie związane z Railway.

### Unknown Unknowns

- Dostępność wybranego regionu i konkretnych usług trzeba potwierdzić przy tworzeniu projektu; nazwy i pojemność regionów mogą zmieniać się niezależnie od aplikacji.
- Retencja logów wynosi 3 dni na Free i 7 dni na Hobby; późno zgłoszony problem może nie mieć pełnego śladu platformowego.
- Docker Compose import nie obsługuje jeszcze wszystkich elementów specyfikacji; produkcyjna konfiguracja powinna używać Dockerfile i jawnych usług Railway.
- Zmienne referencyjne między usługami upraszczają konfigurację, ale tworzą zależność od nazw usług i środowisk Railway.
- MCP wymaga tożsamości użytkownika, nie przyjmuje project tokenów i może ujawnić agentowi szerszy zakres konta niż minimalny token CLI dla pojedynczego projektu.

## Operational Story

- **Preview deploys**: utwórz środowisko `staging` przez `railway environment new staging`, przypnij oddzielną bazę i wdrażaj gałąź do tego środowiska; publiczny URL generuje `railway domain`. Preview per PR i jego automatyczne usuwanie wymagają późniejszej konfiguracji CI.
- **Secrets**: wartości produkcyjne przechowuj w Railway Variables i ustawiaj przez `railway variable set`; w CI używaj `RAILWAY_TOKEN` ograniczonego do projektu. Agent może listować nazwy zmiennych, ale nie powinien odczytywać ani wypisywać wartości.
- **Rollback**: człowiek wybiera ostatni zdrowy deployment w historii platformy i uruchamia redeploy tego artefaktu przez panel lub API; zakładany czas 5–10 minut. Migracje bazy nie cofają się automatycznie i wymagają osobnego, wcześniej przygotowanego planu.
- **Approval**: agent może wykonywać read-only `railway status`, `railway deployment list` i `railway logs`. Pierwszy deploy produkcyjny, ustawienie sekretów, zmiana planu, migracje destrukcyjne i usunięcie usługi wymagają człowieka.
- **Logs**: agent używa `railway logs -n 100`, `railway logs --build` i `railway metrics`; odczyt powinien być jawnie skierowany na właściwą usługę i środowisko.

## Risk Register

| Risk | Source | Likelihood | Impact | Mitigation |
|---|---|---:|---:|---|
| Rozjazd kodu i schematu przy rollbacku | Pre-mortem | M | H | Stosuj migracje kompatybilne wstecz i zapisuj osobny plan cofnięcia danych przed produkcją. |
| Brak przetestowanego odtwarzania PostgreSQL | Devil's advocate | M | H | Włącz backupy wolumenu i wykonaj próbne odtworzenie przed przechowywaniem danych użytkowników. |
| Nieprzewidywalny koszt stale aktywnych usług | Devil's advocate | M | M | Ustaw limit zużycia i alert budżetowy; sprawdzaj `railway usage limit status`. |
| Zbyt szerokie uprawnienia agenta | Unknown unknowns | M | H | Zacznij od CLI i tokenu projektu; MCP dodaj dopiero dla powtarzalnych zapytań read-only. |
| Brak izolowanego preview | Research finding | H | M | Utwórz `staging` z osobną bazą przed automatyzacją deployów z PR. |
| Krótka retencja logów Hobby | Unknown unknowns | M | M | Eksportuj logi incydentów i dodaj zewnętrzne logowanie przed wzrostem użycia. |
| Nieobsługiwane elementy Docker Compose | Unknown unknowns | L | M | Użyj pojedynczego Dockerfile dla aplikacji i deklaruj usługi jawnie w Railway. |
| Przyszły worker zwiększa koszt i złożoność | Pre-mortem | M | M | Dodaj worker dopiero po potwierdzeniu wymagania; mierz CPU/RAM jako osobną usługę. |

## Getting Started

1. Uporządkuj zależności zgodnie z `context/foundation/health-check.md`, wybierz kompatybilny Python 3.14 i Django 6 oraz potwierdź czystą instalację.
2. Przygotuj produkcyjny Dockerfile dla Django z serwerem aplikacyjnym, kontrolą zdrowia i portem z `$PORT`; sprawdź lokalnie przez `docker build` i `docker run`.
3. Zainstaluj CLI poleceniem `npm install -g @railway/cli`, wykonaj `railway login`, a przed mutacją potwierdź konto przez `railway whoami`.
4. Utwórz projekt przez `railway init`, dodaj PostgreSQL przez `railway add --database postgres` i skonfiguruj `SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS` oraz referencję `DATABASE_URL` w Railway Variables.
5. Wdróż przez `railway up`, wygeneruj adres przez `railway domain`, sprawdź `railway logs -n 100`, migracje i publiczną odpowiedź aplikacji.

## Out of Scope

The following were not evaluated in this research:
- Docker image configuration
- CI/CD pipeline setup
- Production-scale architecture (multi-region, HA, DR)