# SOMA Learn

SOMA Learn to nowoczesna platforma edukacyjna dla uczniów oparta na frameworku SOMA (Self-Organized Micro Agile).

Aplikacja pomaga uczniom rozwijać wiedzę dzięki:

- krótkim sprintom nauki,
- planowaniu celów,
- adaptacyjnym ścieżkom rozwoju,
- współpracy uczeń ↔ nauczyciel,
- gamifikacji i systemowi postępów.

Projekt startuje od nauki matematyki dla polskich uczniów, ale architektura jest zaprojektowana tak, aby łatwo rozszerzyć ją na kolejne przedmioty i moduły AI wspierające edukację.

## Dlaczego SOMA?

SOMA (Self-Organized Micro Agile) to framework pracy własnej inspirowany Agile, skupiony na:

- mikro-sprintach,
- iteracyjnym rozwoju,
- regularnej refleksji,
- adaptacyjnym planowaniu,
- budowaniu samodzielności ucznia.

## Cel projektu

Projekt ma na celu stworzenie aplikacji edukacyjnej, która:

- pomaga uczniom utrzymać rytm nauki,
- zmniejsza poczucie przeciążenia,
- wspiera długoterminowy rozwój kompetencji,
- automatyzuje planowanie i wsparcie dzięki AI.

## Architektura i technologie

- Backend: Python + Django REST Framework,
- Frontend: React,
- Kolejki: Celery (w razie potrzeby),
- Konteneryzacja: Docker,
- Docelowo: wdrożenie w chmurze.

## Jak zacząć

### Lokalny Docker

Wymagany jest Docker Desktop z kontenerami Linux i Docker Compose v2. Nie trzeba instalować lokalnie Pythona, Node.js ani PostgreSQL. Z katalogu głównego repozytorium:

```powershell
docker compose up --build --wait
```

| Usługa | Adres |
|---|---|
| Frontend | http://localhost:5174 |
| Panel administratora | http://localhost:8001/admin/ |
| Swagger API | http://localhost:8001/api/docs/ |
| Mailpit (wiadomości i kody logowania) | http://localhost:8027 |
| SMTP dla aplikacji na hoście | `127.0.0.1:1027` (bez TLS i logowania) |
| PostgreSQL 18 | `db:5432`, tylko wewnątrz sieci kontenerów |

Na nowej bazie migracje automatycznie tworzą administratora:

- e-mail: `admin@soma-learn.local`
- hasło: `Local-Only-Admin-482!`

To publiczne dane **wyłącznie do lokalnego developmentu**, nie do produkcji. Logowanie w aplikacji dodatkowo wymaga kodu z Mailpita. Panel Django korzysta z hasła administratora.

Stos ma osobną nazwę `soma-learn-local-dev` i nowy wolumen `soma-learn-local-dev-pg18-data`. Nie importuje SQLite ani danych ze starych kontenerów. Porty Mailpita zmieniono na **1027/8027**, ponieważ wcześniejszy `soma-learn-mailpit-1` zajmuje 1026/8026; stare zasoby pozostają nietknięte.

Backend i frontend mają podmontowany kod oraz automatyczne przeładowanie. Vite korzysta z pollingu na Windowsie i osobnego linuksowego wolumenu `node_modules`. Po zmianie zależności wykonaj ponownie `docker compose up --build --wait`.

### Opcjonalna konfiguracja

Start nie wymaga pliku środowiskowego. Własne wartości ustawisz przez zmienne `DOCKER_*` z [przykładu](.env.docker.example):

```powershell
Copy-Item .env.docker.example .env.docker
# Dostosuj .env.docker przed pierwszym startem.
docker compose --env-file .env.docker up --build --wait
```

Nie nadpisuj istniejącego `.env`. `.env.docker` jest ignorowany przez Git. Przy własnym pliku dodawaj `--env-file .env.docker` do **każdego** polecenia Compose. Istniejące ustawienia aplikacji, np. `DATABASE_URL` czy `USE_SQLITE`, są jawnie nadpisane lokalną konfiguracją kontenerów.

Zmiana `DOCKER_SUPERUSER_PASSWORD` po utworzeniu konta nie zmienia jego hasła. Do zmiany istniejącego hasła użyj:

```powershell
docker compose exec backend python manage.py changepassword admin@soma-learn.local
```

Nie zmieniaj danych dostępowych PostgreSQL po inicjalizacji wolumenu bez odpowiedniej zmiany kont w bazie.

### Zarządzanie i testy

```powershell
docker compose ps
docker compose logs --tail 100 backend frontend
docker compose down
docker compose up --wait

docker compose exec backend python manage.py test users learning --noinput
docker compose exec frontend npm test
docker compose exec frontend npm run build
```

`down` zachowuje bazę. **`docker compose down -v` nieodwracalnie usuwa dane tego stosu**, w tym administratora i konta użytkowników; używaj tylko do świadomego resetu. Następny start tworzy pustą bazę i administratora ponownie. Mailpit nie ma trwałego wolumenu: wiadomości znikają po usunięciu kontenera.

Kontrakty konfiguracji Docker uruchamia się osobno na hoście z Node.js/npm i Dockerem (w kontenerze frontendu są pomijane, bo nie ma tam całego repozytorium ani dostępu do Docker CLI):

```powershell
Set-Location frontend
$env:DOCKER_CONFIG_CLI = '1'
npm.cmd test -- tests/docker-config.test.js
Remove-Item Env:DOCKER_CONFIG_CLI
Set-Location ..
```

Jeśli start zgłasza zajęty port, sprawdź `docker ps` i właściciela procesu; nie zatrzymuj cudzych usług ani nie usuwaj starych wolumenów. Błąd migracji lub brak gotowości usługi diagnozuj przez `docker compose logs --tail 100`.

### Zakres i ograniczenia

- To środowisko lokalne: `DEBUG=true`, Django `runserver`, Vite i jawne przykładowe hasła. Brak HTTPS i konfiguracji produkcyjnej.
- Google nie jest skonfigurowane; przycisk może być widoczny, ale nie należy go używać. Rejestracja, potwierdzenie e-maila, logowanie i reset hasła korzystają z Mailpita.
- Domyślna domena Django Sites to `example.com` (może występować w temacie wiadomości). Można ją zmienić w panelu administratora.
- QA potwierdziło istniejące wcześniej ograniczenia aplikacji: token DRF pozostaje ważny po wylogowaniu i resecie hasła; ponowne logowanie w ciągu 60 s może zwrócić `429`. Nie są to regresje Dockera; unieważnianie tokenów wymaga osobnej poprawki przed wdrożeniem produkcyjnym.
- Nie dodano CI/CD, Celery, migracji danych ani wdrożenia do chmury.

## Dokumentacja

Cała dokumentacja projektu znajduje się w folderze `DOC`.
- `DOC/README.md` – wstęp do dokumentacji,
- `DOC/PROJECT.md` – opis projektu, cele i zakres,
- `DOC/AGENTS.md` – role agentów,
- `DOC/diagram.mmd` – diagram przepływu pracy.

## Aktualny status

Projekt zawiera backend Django/DRF, frontend React, obsługę kont i kursów oraz lokalny stos Docker z PostgreSQL i Mailpit. Niezależne QA konteneryzacji potwierdziło start czterech zdrowych usług, logowanie, reset hasła, trwałość bazy i hot reload. Regresja: 207 testów backendu OK, 117 testów frontendu OK (6 kontraktów Docker pominiętych w kontenerze, zaliczonych osobno na hoście), build frontendu OK. To kontrola jakości zakresu Docker, nie pełny audyt bezpieczeństwa.
