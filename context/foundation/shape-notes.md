---
project: "SOMA"
context_type: brownfield
product_type: web-app
target_scale:
  users: small
  qps: null
  data_volume: null
created: 2026-08-31
updated: 2026-08-31
timeline_budget:
  delivery_weeks: 6
  hard_deadline: null
  after_hours_only: true
checkpoint:
  current_phase: 8
  phases_completed: [1, 2, 3, 4, 5, 6, 7]
  gray_areas_resolved:
    - topic: "context type"
      decision: "Brownfield; the existing Django scaffold is the baseline for a new product module."
    - topic: "change category"
      decision: "New product module."
    - topic: "primary persona"
      decision: "Primary-school student preparing for an exam."
    - topic: "authentication"
      decision: "Email and password or OAuth, with an email 2FA code on a new device."
    - topic: "roles"
      decision: "Student and mentor; the mentor can plan and track progress for students who accept an invitation."
    - topic: "MVP flow"
      decision: "One mentor-led, preconfigured course with invitations, task completion, progress tracking, and staged unlocking."
    - topic: "delivery budget"
      decision: "Six weeks of after-hours work; sustained-effort cost explicitly accepted on 2026-08-31."
    - topic: "MVP authentication"
      decision: "Email and password only; OAuth and 2FA are outside MVP."
    - topic: "course materials"
      decision: "One preconfigured course with text, images, and links; no media uploads."
    - topic: "cycle planning"
      decision: "Mentor and student agree on a cycle goal; the mentor manually moves selected tasks from backlog to the cycle board."
    - topic: "domain rule"
      decision: "A student works only on current-cycle tasks, and completion requires mentor approval; rejection sends the task to corrections."
    - topic: "MVP device support"
      decision: "Desktop browser only."
    - topic: "product surface"
      decision: "No change; SOMA remains a web application."
    - topic: "initial user scale"
      decision: "Small; one mentor and a handful of students."
  frs_drafted: 10
  quality_check_status: accepted
---

## Bieżący System

SOMA istnieje obecnie jako szkielet aplikacji Django. Nie ma jeszcze działającego przepływu produktowego, użytkowników ani danych produktowych wymagających zachowania.

## Wizja i Oświadczenie o Problemie

Nowy moduł produktu ma wspierać ucznia szkoły podstawowej w przygotowaniu do egzaminu. Uczeń ma trudność z utrzymaniem motywacji wystarczająco długo, aby przejść przez cały proces przygotowań.

Obecnie uczeń płaci za korepetycje albo samodzielnie przebija się przez książki z zadaniami.

## Użytkownik i Persona

Główną personą jest uczeń szkoły podstawowej przygotowujący się do egzaminu.

Drugorzędną personą jest mentor lub korepetytor, który wykorzystuje SOMA do zarządzania planem przygotowań swoich uczniów i śledzenia ich postępów.

## Kontrola Dostępu

SOMA ma dwie role: ucznia i mentora. Uczeń uczy się według planu i kontroluje dostęp do swoich danych. Mentor może tworzyć lub modyfikować plan przygotowań oraz śledzić postęp wyłącznie przypisanych uczniów.

Relacja mentor-uczeń powstaje po wysłaniu zaproszenia przez mentora i zaakceptowaniu go przez ucznia. Docelowy model logowania obejmuje e-mail i hasło albo OAuth oraz kod 2FA przy nowym urządzeniu. MVP obsługuje wyłącznie e-mail i hasło; OAuth i 2FA pozostają poza zakresem pierwszej wersji.

## Kryteria Sukcesu

### Podstawowe

- Uczeń przyjmuje zaproszenie do gotowego kursu i kończy pierwsze zadanie w ciągu 7 dni.
- Mentor widzi ukończenie zadania i może odblokować uczniowi kolejny etap kursu.

### Dodatkowe

- Po ukończeniu bieżącego zadania uczeń widzi swój kolejny krok w przygotowaniach.

### Bariery ochronne

- Mentor ma dostęp wyłącznie do danych uczniów, którzy zaakceptowali jego zaproszenie.

## Przepływ MVP

1. Mentor loguje się i wybiera jeden gotowy kurs dostępny w systemie.
2. Mentor wysyła na e-mail ucznia prywatne zaproszenie do kursu.
3. Uczeń loguje się i akceptuje zaproszenie przypisane do jego adresu e-mail.
4. Mentor i uczeń ustalają cel bieżącego cyklu, a mentor przenosi wybrane zadania z backlogu na tablicę cyklu.
5. Uczeń korzysta z przygotowanych tekstów, obrazów i linków oraz przesuwa zadanie ze stanu `Do zrobienia` do `W trakcie`, a następnie do `Do sprawdzenia`.
6. Mentor widzi status i datę ostatniej zmiany, po czym przenosi zadanie do `Poprawki` albo `Zatwierdzone`.
7. Uczeń wykonuje ewentualne poprawki i widzi kolejne bieżące zadania; zablokowane zadania pozostają w backlogu.

## Potwierdzenie harmonogramu

Potwierdzono dnia 2026-08-31: 6-tygodniowy MVP wymaga stałego zaangażowania; użytkownik zaakceptował.

## Historie Użytkowników

### US-01: Uczeń rozpoczyna kurs prowadzony przez mentora

- **Given** uczeń otrzymał od mentora zaproszenie do gotowego kursu, przypisane do swojego adresu e-mail
- **When** uczeń loguje się, akceptuje zaproszenie i przesuwa pierwsze zadanie przez pracę do stanu `Do sprawdzenia`
- **Then** mentor widzi postęp ucznia oraz przenosi zadanie do `Poprawki` albo `Zatwierdzone`

#### Kryteria Akceptacji

- Uczeń może wejść wyłącznie do kursu, do którego przyjął zaproszenie.
- Ukończenie zadania jest widoczne dla przypisanego mentora.
- Zadanie zatwierdzone przez mentora spełnia kryterium ukończenia pierwszego zadania.
- Uczeń widzi na tablicy zadania bieżącego cyklu, ale nie może rozpocząć zablokowanych zadań z backlogu.

## Wymagania Funkcjonalne

- FR-001: Uczeń lub mentor może zalogować się e-mailem i hasłem. Priorytet: musi-być. Zmiana: nowa
  > Sokrates: Rozważono, że 2FA na nowym urządzeniu nadmiernie komplikuje sześciotygodniowe MVP. Rozwiązanie: OAuth i 2FA przeniesiono poza MVP.
- FR-002: Mentor może wybrać jeden gotowy kurs dostępny w systemie. Priorytet: musi-być. Zmiana: nowa
  > Sokrates: Rozważono, że wybór jest zbędny przy jednym kursie. Rozwiązanie: zachowano możliwość, aby sprawdzić przepływ przyszłego katalogu.
- FR-003: Mentor może wysłać uczniowi prywatne zaproszenie do wybranego kursu, przypisane do adresu e-mail ucznia. Priorytet: musi-być. Zmiana: nowa
  > Sokrates: Rozważono ryzyko przekazania linku innej osobie. Rozwiązanie: zaproszenie może zaakceptować tylko konto o wskazanym adresie e-mail.
- FR-004: Uczeń może zaakceptować zaproszenie do kursu. Priorytet: musi-być. Zmiana: nowa
  > Sokrates: Rozważono, że osobna akceptacja opóźnia rozpoczęcie kursu. Rozwiązanie: zachowano ją, ponieważ uczeń ma kontrolować dostęp do swoich danych.
- FR-005: Mentor i uczeń mogą ustalić cel cyklu, a mentor może przenieść wybrane zadania z backlogu na tablicę bieżącego cyklu. Priorytet: musi-być. Zmiana: nowa
  > Sokrates: Rozważono połączenie przypisania z odblokowaniem całego etapu. Rozwiązanie: zachowano osobny wybór, ponieważ mentor przypisuje tylko część zadań z etapu.
- FR-006: Uczeń może zobaczyć na tablicy materiał w formie tekstu, obrazu lub linku oraz zadania bieżącego cyklu. Priorytet: musi-być. Zmiana: nowa
  > Sokrates: Rozważono koszt pełnego systemu zarządzania multimediami. Rozwiązanie: MVP korzysta z wcześniej przygotowanych tekstów, obrazów i linków, bez uploadu wideo.
- FR-007: Uczeń może przenieść zadanie ze stanu `Do zrobienia` do `W trakcie`, a następnie do `Do sprawdzenia`. Priorytet: musi-być. Zmiana: nowa
  > Sokrates: Rozważono, że samodzielne oznaczenie `Ukończone` daje niewiarygodny postęp. Rozwiązanie: uczeń zgłasza zadanie do sprawdzenia, a ukończenie wymaga decyzji mentora.
- FR-008: Mentor może zobaczyć tablicę bieżącego cyklu, statusy zadań i daty ostatnich zmian przypisanego ucznia oraz przenieść zadanie do `Poprawki` albo `Zatwierdzone`. Priorytet: musi-być. Zmiana: nowa
  > Sokrates: Rozważono, że rozbudowany dashboard przekroczy zakres MVP. Rozwiązanie: monitoring ograniczono do tablicy cyklu, statusów i dat zmian.
- FR-009: Mentor może ręcznie kontrolować, które zadania są dostępne na tablicy cyklu, a które pozostają zablokowane w backlogu. Priorytet: musi-być. Zmiana: nowa
  > Sokrates: Rozważono ryzyko oczekiwania ucznia na ręczną decyzję mentora. Rozwiązanie: wymaganie pozostaje bez zmian, ponieważ planning z mentorem jest rdzeniem pierwszej wersji.
- FR-010: Uczeń może zobaczyć bieżące zadania na tablicy cyklu oraz zablokowane zadania w backlogu bez możliwości ich rozpoczęcia. Priorytet: musi-być. Zmiana: nowa
  > Sokrates: Rozważono połączenie następnego kroku z samym widokiem materiału. Rozwiązanie: zachowano osobny podział tablica/backlog, aby uczeń widział bieżący zakres i dalszą ścieżkę.

## Zmiany Logiki Biznesowej

Uczeń pracuje wyłącznie nad zadaniami bieżącego cyklu, a zadanie staje się ukończone dopiero po zatwierdzeniu przez przypisanego mentora; odrzucenie kieruje je do poprawek.

Reguła przyjmuje zadania wybrane wspólnie podczas planningu oraz zmiany statusów dokonywane przez ucznia i mentora. Jej wynikiem jest aktualny stan tablicy cyklu i zakres pracy dostępny dla ucznia.

Uczeń napotyka regułę podczas pracy na tablicy, gdzie może zmieniać status tylko dostępnych zadań. Mentor napotyka ją podczas sprawdzania, gdy zatwierdza zadanie albo zwraca je do poprawek.

## Wymagania Niefunkcjonalne

- Każda zmiana statusu zadania otrzymuje widoczne potwierdzenie w ciągu 1 sekundy.
- Żaden mentor nie może odczytać danych ucznia bez aktywnej relacji zaakceptowanej przez tego ucznia.
- Pełny przepływ MVP jest używalny na komputerze w aktualnej wersji jednej z głównych przeglądarek desktopowych.

## Cele Niezwiązane z Projektem

- OAuth i 2FA nie wchodzą do MVP, aby uwierzytelnianie nie przesłoniło przepływu nauki.
- Upload wideo i edytor kursów nie wchodzą do MVP; pierwszy przepływ korzysta z jednego wcześniej przygotowanego kursu.
- Automatyczne dobieranie zadań nie wchodzi do MVP; mentor ręcznie ustala zakres cyklu z uczniem.
- Rozbudowany dashboard i analityka nie wchodzą do MVP; monitoring ogranicza się do tablicy, statusów i dat zmian.
- Pełna obsługa telefonu nie wchodzi do MVP; gwarantowany jest przepływ na komputerze.

## Ograniczenia i Zachowane Zachowanie

Nie zidentyfikowano istniejących funkcji ani danych produktowych, które muszą zostać zachowane. Nie są wymagane migracje danych, kompatybilność z istniejącymi kontraktami ani utrzymanie integracji. Bazą techniczną jest obecny szkielet Django, który musi pozostać uruchamialny.

## Otwarte Pytania

1. Jak reguła przepływu SOMA powinna zmienić się przy stukrotnie większej liczbie uczniów na mentora? Właściciel: użytkownik. Termin: przed planowaniem skalowania poza MVP. Blokuje MVP: nie.
2. Jakie są docelowe natężenie ruchu i wolumen danych? Właściciel: użytkownik. Termin: podczas oceny stosu po PRD. Blokuje MVP: nie.

## Kontrola jakości

- Kontrola dostępu: obecna.
- Logika biznesowa: obecna jako jednozdaniowa reguła.
- Artefakty projektu: obecne z prawidłowym checkpointem.
- Potwierdzenie kosztów harmonogramu: obecne dla 6 tygodni pracy po godzinach.
- Cele niezwiązane z projektem: obecne.
- Zachowane zachowanie: obecny szkielet Django musi pozostać uruchamialny.
- Luki blokujące: brak.