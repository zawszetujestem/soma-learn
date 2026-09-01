# Plan implementacji kontraktu ról i zaproszeń uczeń-mentor

## Przegląd

Zmiana ustanawia minimalny, testowalny kontrakt tożsamości, zaproszeń i relacji per kurs wymagany przez F-01. Nie dostarcza jeszcze ekranów ani przepływu HTTP; przygotowuje bezpieczne granice, na których S-01 i S-02 zbudują logowanie oraz akceptację zaproszenia.

## Analiza stanu bieżącego

Projekt korzysta z wbudowanej infrastruktury sesji Django, ale nie deklaruje `AUTH_USER_MODEL`, nie ma modeli domenowych ani własnych migracji. Lokalny host nie ma zastosowanych migracji ani pliku bazy. Kontenerowy PostgreSQL zawiera wyłącznie migracje walking skeleton i może zostać zresetowany po ręcznym potwierdzeniu.

### Kluczowe odkrycia:

- `soma_config/settings.py` włącza auth, sesje i middleware, ale nadal używa domyślnego użytkownika Django.
- `apps/core/tests/test_views.py` ustanawia wzorzec testów Django w pakiecie `tests/`.
- `compose.yaml` automatycznie uruchamia migracje; zmiana modelu użytkownika wymaga resetu pustego wolumenu developerskiego przed kolejnym startem.
- PRD wymaga kont z wieloma rolami, zaproszenia związanego z e-mailem i kursem oraz braku dostępu mentora po zakończeniu relacji.

## Pożądany stan końcowy

Konto loguje się unikalnym adresem e-mail i może jednocześnie mieć role ucznia i mentora. Rolę mentora nadaje administrator, a konto zwykłe domyślnie ma rolę ucznia. Mentor może wystawić siedmiodniowe zaproszenie do konkretnego kursu; ponowne wystawienie unieważnia poprzednie aktywne zaproszenie. Akceptacja przez konto o zgodnym e-mailu tworzy jedną aktywną relację per mentor, uczeń i kurs. Każda strona może zakończyć relację; rekord audytowy pozostaje, ale mentor traci dostęp do danych ucznia.

## Czego NIE robimy

- Nie implementujemy formularzy rejestracji i logowania, tras produktu ani szablonów.
- Nie wysyłamy wiadomości e-mail i nie budujemy interfejsu zaproszeń.
- Nie implementujemy zawartości kursu, zadań, planningu ani tablicy cyklu.
- Nie dodajemy OAuth, 2FA, automatycznego doboru zadań ani produkcyjnego wdrożenia.
- Nie definiujemy długoterminowej retencji danych ucznia poza zachowaniem metadanych relacji.

## Podejście do implementacji

Utworzyć aplikację `accounts` z niestandardowym użytkownikiem opartym na auth Django oraz aplikację `learning` z minimalnym kursem, zaproszeniem i relacją. Reguły cyklu życia umieścić w jawnych funkcjach usługowych działających transakcyjnie, zamiast rozpraszać je po widokach lub sygnałach. Uprawnienie mentora do danych ucznia wyrazić jednym zapytaniem obejmującym wyłącznie aktywne relacje.

## Krytyczne szczegóły implementacji

`AUTH_USER_MODEL` musi zostać ustawiony przed wygenerowaniem pierwszej migracji `accounts`; migracja `learning` zależy od swappable user model. Surowy token zaproszenia jest zwracany tylko przy wystawieniu, natomiast w bazie przechowywany jest wyłącznie jego skrót. Reset kontenerowego wolumenu jest ręczną, destrukcyjną bramką i następuje dopiero po przejściu testów na bazie testowej.

## Phase 1: Tożsamość i role

### Przegląd

Wprowadzić niestandardowy model użytkownika z logowaniem e-mailem i niezależnymi rolami ucznia oraz mentora.

### Wymagane zmiany:

#### 1. Aplikacja kont

**Pliki**: `apps/accounts/apps.py`, `apps/accounts/models.py`, `apps/accounts/managers.py`, `apps/accounts/admin.py`, `apps/accounts/migrations/0001_initial.py`

**Cel**: Dodać użytkownika bez pola username, z unikalnym znormalizowanym e-mailem, rolą ucznia domyślnie aktywną i rolą mentora nadawaną przez administratora. Konto może mieć obie role; konto administracyjne nie musi być uczestnikiem domenowym.

**Umowa**: `USERNAME_FIELD = "email"`; role są niezależnymi wartościami logicznymi `is_student` i `is_mentor`; manager tworzy zwykłe konto oraz superusera zgodnie z kontraktem Django.

#### 2. Konfiguracja projektu

**Plik**: `soma_config/settings.py`

**Cel**: Zarejestrować aplikację kont i ustawić model użytkownika przed migracjami domenowymi.

**Umowa**: `AUTH_USER_MODEL = "accounts.User"`; konfiguracja healthchecka, bazy i bezpieczeństwa pozostaje bez zmian.

#### 3. Testy tożsamości

**Pliki**: `apps/accounts/tests/test_managers.py`, `apps/accounts/tests/test_models.py`

**Cel**: Udowodnić logowanie e-mailem, normalizację, role wielokrotne, domyślną rolę ucznia i kontrakt superusera.

**Umowa**: Testy używają `get_user_model()` i nie importują konkretnej klasy użytkownika przez warstwy domenowe.

### Kryteria sukcesu:

#### Weryfikacja automatyczna:

- Migracje nie mają niezapisanych zmian: `.venv/Scripts/python.exe manage.py makemigrations --check --dry-run`.
- Testy aplikacji kont przechodzą: `.venv/Scripts/python.exe manage.py test apps.accounts`.
- Django, Ruff i mypy przechodzą dla zmienionego kodu.

#### Weryfikacja ręczna:

- Administrator Django pokazuje e-mail oraz obie role i pozwala nadać rolę mentora.

---

## Phase 2: Zaproszenie i relacja per kurs

### Przegląd

Dodać minimalną tożsamość kursu oraz audytowalne modele zaproszenia i relacji wraz z transakcyjnym cyklem życia.

### Wymagane zmiany:

#### 1. Aplikacja nauki i modele

**Pliki**: `apps/learning/apps.py`, `apps/learning/models.py`, `apps/learning/migrations/0001_initial.py`

**Cel**: Zdefiniować minimalny kurs, zaproszenie związane z mentorem, kursem i znormalizowanym e-mailem oraz relację mentor-uczeń per kurs.

**Umowa**: Zaproszenie ma stany `pending`, `accepted`, `revoked`, `expired`, siedmiodniowe `expires_at` i przechowuje skrót tokenu. Relacja ma stany `active`, `ended`, zachowuje daty początku/końca i uniemożliwia więcej niż jedną aktywną relację dla tej samej trójki mentor–uczeń–kurs.

#### 2. Usługi cyklu życia

**Plik**: `apps/learning/services.py`

**Cel**: W jednym miejscu zaimplementować wystawienie, ponowne wystawienie, akceptację oraz zakończenie relacji.

**Umowa**: Wystawienie wymaga roli mentora; ponowienie transakcyjnie unieważnia aktywne zaproszenie i generuje nowy token. Akceptacja wymaga roli ucznia, zgodnego e-maila, aktywnego i niewygasłego tokenu oraz atomowo tworzy relację. Zakończenie jest dozwolone mentorowi lub uczniowi należącemu do relacji.

#### 3. Testy kontraktu

**Pliki**: `apps/learning/tests/test_models.py`, `apps/learning/tests/test_services.py`

**Cel**: Pokryć happy path oraz nadużycia: zła rola, obcy e-mail, wygaśnięcie, ponowienie tokenu, podwójna akceptacja i zakończenie przez obcą osobę.

**Umowa**: Testy używają czasu świadomie kontrolowanego przez wartości `expires_at`; nie zależą od wysyłki e-mail ani tras HTTP.

### Kryteria sukcesu:

#### Weryfikacja automatyczna:

- Migracje obu aplikacji stosują się na pustej bazie testowej.
- Testy `apps.learning` przechodzą dla wszystkich stanów i przypadków nadużyć.
- Pełny zestaw testów, Ruff i mypy przechodzą.

#### Weryfikacja ręczna:

- W shellu Django wystawienie zwraca surowy token, ale rekord zaproszenia nie przechowuje go w jawnej postaci.

---

## Phase 3: Granice dostępu i walidacja PostgreSQL

### Przegląd

Udowodnić izolację danych przez aktywną relację i sprawdzić cały kontrakt na świeżej bazie PostgreSQL w lokalnym zestawie usług.

### Wymagane zmiany:

#### 1. Selektor dostępu mentora

**Pliki**: `apps/learning/services.py`, `apps/learning/tests/test_access.py`

**Cel**: Udostępnić jedno zapytanie zwracające wyłącznie uczniów z aktywną relacją mentora w danym kursie.

**Umowa**: Relacje zakończone pozostają w bazie jako audyt, ale nigdy nie rozszerzają wyniku selektora; mentor niezwiązany z relacją nie widzi ucznia.

#### 2. Walidacja kontenerowej bazy

**Pliki**: `compose.yaml`, `context/changes/access-and-invitation-contract/plan.md`

**Cel**: Po ręcznej zgodzie zresetować wyłącznie developerski wolumen bez danych produktowych, zastosować nowe migracje i uruchomić pełne kontrole w obrazie aplikacji.

**Umowa**: Nie zmieniać danych poza lokalnym wolumenem Compose; nie wykonywać operacji na Railway ani produkcji.

### Kryteria sukcesu:

#### Weryfikacja automatyczna:

- Testy izolacji aktywnej i zakończonej relacji przechodzą.
- Pełny zestaw testów, `manage.py check`, Ruff, mypy i `pip check` przechodzą lokalnie.
- Po zatwierdzonym resecie Compose migracje stosują się, oba kontenery są zdrowe, a `/healthz/` zwraca HTTP 200.

#### Weryfikacja ręczna:

- Użytkownik potwierdza usunięcie wyłącznie developerskiego wolumenu PostgreSQL przed resetem.
- Użytkownik potwierdza, że zakończona relacja zachowuje metadane audytowe, ale nie daje mentorowi dostępu do ucznia.

---

## Strategia testowania

### Testy jednostkowe:

- Manager użytkownika, normalizacja e-maila i kombinacje ról.
- Stany zaproszenia, siedmiodniowe wygaśnięcie i ograniczenia relacji.
- Walidacja uczestników i tokenów usług cyklu życia.

### Testy integracyjne:

- Wystawienie → zastąpienie tokenu → akceptacja → aktywna relacja → zakończenie → utrata dostępu.
- Izolacja między dwoma mentorami, uczniami i kursami.
- Migracje na SQLite test runnera oraz PostgreSQL w Compose.

### Kroki testowania ręcznego:

1. Sprawdzić role użytkownika w panelu administratora.
2. Sprawdzić, że surowy token jest dostępny tylko w wyniku wystawienia.
3. Potwierdzić reset lokalnego wolumenu i zachowanie audytowego rekordu relacji.

## Uwagi dotyczące wydajności

Zapytanie dostępu mentora musi filtrować po mentorze, kursie i aktywnym statusie relacji. Indeksy i ograniczenia powinny wynikać bezpośrednio z tych filtrów; nie projektujemy optymalizacji dla skali poza małym MVP.

## Uwagi dotyczące migracji

Zmiana `AUTH_USER_MODEL` jest bezpieczna wyłącznie przed utrwaleniem danych produktowych. Host nie ma lokalnej bazy, a wolumen Compose zawiera tylko migracje walking skeleton. Reset wolumenu wymaga ręcznej zgody i następuje po przejściu testów; nie tworzymy migracji danych ze starego `auth.User`.

## Referencje

- Tożsamość zmiany: `context/changes/access-and-invitation-contract/change.md`
- Roadmapa: `context/foundation/roadmap.md` — F-01
- Kontrakt produktu: `context/foundation/prd.md` — FR-001, FR-003, FR-004
- Reguły repozytorium: `AGENTS.md`
- Konfiguracja projektu: `soma_config/settings.py`
- Wzorzec testów: `apps/core/tests/test_views.py`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Tożsamość i role

#### Automated

- [ ] 1.1 Migracje nie mają niezapisanych zmian
- [ ] 1.2 Testy aplikacji kont przechodzą
- [ ] 1.3 Django, Ruff i mypy przechodzą

#### Manual

- [ ] 1.4 Administrator pokazuje e-mail i obie role

### Phase 2: Zaproszenie i relacja per kurs

#### Automated

- [ ] 2.1 Migracje stosują się na pustej bazie testowej
- [ ] 2.2 Testy cyklu życia i nadużyć przechodzą
- [ ] 2.3 Pełne testy, Ruff i mypy przechodzą

#### Manual

- [ ] 2.4 Baza nie przechowuje surowego tokenu

### Phase 3: Granice dostępu i walidacja PostgreSQL

#### Automated

- [ ] 3.1 Testy izolacji relacji przechodzą
- [ ] 3.2 Lokalne bramki jakości przechodzą
- [ ] 3.3 Compose stosuje migracje i pozostaje zdrowy

#### Manual

- [ ] 3.4 Reset dotyczy wyłącznie developerskiego wolumenu
- [ ] 3.5 Zakończona relacja zachowuje audyt bez dostępu mentora