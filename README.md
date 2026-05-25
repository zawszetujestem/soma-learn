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

1. Sprawdź dokumentację w folderze `DOC`.
2. Przeczytaj `soma/README.md`, aby poznać zasady frameworku.
3. Wybierz i uruchom środowisko wirtualne.
4. Rozpocznij pracę nad pierwszym user story w ramach TDD.

## Dokumentacja

Cała dokumentacja projektu znajduje się w folderze `DOC`.
- `DOC/README.md` – wstęp do dokumentacji,
- `DOC/PROJECT.md` – opis projektu, cele i zakres,
- `DOC/AGENTS.md` – role agentów,
- `DOC/diagram.mmd` – diagram przepływu pracy.

## Aktualny status

W tej chwili projekt ma przygotowaną strukturę dokumentacyjną oraz wstępny framework SOMA. Kolejnym krokiem jest rozwój modułów backendowych, frontendowych i testów.
