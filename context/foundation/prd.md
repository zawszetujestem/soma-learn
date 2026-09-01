---
project: "SOMA"
version: 1
status: draft
created: 2026-08-31
context_type: brownfield
product_type: web-app
target_scale:
  users: small
  qps: null
  data_volume: null
timeline_budget:
  delivery_weeks: 6
  hard_deadline: null
  after_hours_only: true
---

## Current System Overview

SOMA istnieje obecnie jako uruchamialny szkielet aplikacji webowej Django. Nie ma jeszcze działającego przepływu produktowego, użytkowników ani danych produktowych. Obecny system nie oferuje funkcji związanych z kursami, planowaniem nauki ani współpracą ucznia z mentorem.

## Problem Statement & Motivation

Uczeń szkoły podstawowej przygotowujący się do egzaminu ma trudność z utrzymaniem motywacji wystarczająco długo, aby przejść przez cały proces przygotowań. Obecnie płaci za korepetycje albo samodzielnie przebija się przez książki z zadaniami.

Zmiana ma dodać pierwszy moduł produktu, który łączy samodzielną pracę ucznia z planowaniem i weryfikacją prowadzoną przez mentora.

# TODO: trigger for making this change now — see Open Questions

## User & Persona

Główną personą jest uczeń szkoły podstawowej przygotowujący się do egzaminu. Uczeń korzysta z SOMA, aby pracować nad ograniczonym zakresem bieżącego cyklu, widzieć postęp i utrzymać ciągłość przygotowań.

Drugorzędną personą jest mentor lub korepetytor, który wykorzystuje SOMA do zarządzania planem przygotowań swoich uczniów i śledzenia ich postępów.

## Success Criteria

### Primary

- Uczeń przyjmuje zaproszenie do gotowego kursu i kończy pierwsze zadanie w ciągu 7 dni.
- Mentor widzi ukończenie zadania i może odblokować uczniowi kolejny etap kursu.

### Secondary

- Po ukończeniu bieżącego zadania uczeń widzi swój kolejny krok w przygotowaniach.

### Guardrails

- Mentor ma dostęp wyłącznie do danych uczniów, którzy zaakceptowali jego zaproszenie.
- Istniejący szkielet aplikacji pozostaje uruchamialny.

## User Stories

### US-01: Uczeń rozpoczyna kurs prowadzony przez mentora

- **Given** uczeń otrzymał od mentora zaproszenie do gotowego kursu, przypisane do swojego adresu e-mail
- **When** uczeń loguje się, akceptuje zaproszenie i przesuwa pierwsze zadanie przez pracę do stanu `Do sprawdzenia`
- **Then** mentor widzi postęp ucznia oraz przenosi zadanie do `Poprawki` albo `Zatwierdzone`

#### Acceptance Criteria

- Uczeń może wejść wyłącznie do kursu, do którego przyjął zaproszenie.
- Ukończenie zadania jest widoczne dla przypisanego mentora.
- Zadanie zatwierdzone przez mentora spełnia kryterium ukończenia pierwszego zadania.
- Uczeń widzi na tablicy zadania bieżącego cyklu, ale nie może rozpocząć zablokowanych zadań z backlogu.

Przed tą zmianą system nie oferował przepływu kursu ani współpracy ucznia z mentorem.

## Scope of Change

- [new] FR-001: Uczeń lub mentor może zalogować się e-mailem i hasłem. Priorytet: musi-być.
  > Sokrates: Rozważono, że 2FA na nowym urządzeniu nadmiernie komplikuje sześciotygodniowe MVP. Rozwiązanie: OAuth i 2FA przeniesiono poza MVP.
- [new] FR-002: Mentor może wybrać jeden gotowy kurs dostępny w systemie. Priorytet: musi-być.
  > Sokrates: Rozważono, że wybór jest zbędny przy jednym kursie. Rozwiązanie: zachowano możliwość, aby sprawdzić przepływ przyszłego katalogu.
- [new] FR-003: Mentor może wysłać uczniowi prywatne zaproszenie do wybranego kursu, przypisane do adresu e-mail ucznia. Priorytet: musi-być.
  > Sokrates: Rozważono ryzyko przekazania linku innej osobie. Rozwiązanie: zaproszenie może zaakceptować tylko konto o wskazanym adresie e-mail.
- [new] FR-004: Uczeń może zaakceptować zaproszenie do kursu. Priorytet: musi-być.
  > Sokrates: Rozważono, że osobna akceptacja opóźnia rozpoczęcie kursu. Rozwiązanie: zachowano ją, ponieważ uczeń ma kontrolować dostęp do swoich danych.
- [new] FR-005: Mentor i uczeń mogą ustalić cel cyklu, a mentor może przenieść wybrane zadania z backlogu na tablicę bieżącego cyklu. Priorytet: musi-być.
  > Sokrates: Rozważono połączenie przypisania z odblokowaniem całego etapu. Rozwiązanie: zachowano osobny wybór, ponieważ mentor przypisuje tylko część zadań z etapu.
- [new] FR-006: Uczeń może zobaczyć na tablicy materiał w formie tekstu, obrazu lub linku oraz zadania bieżącego cyklu. Priorytet: musi-być.
  > Sokrates: Rozważono koszt pełnego systemu zarządzania multimediami. Rozwiązanie: MVP korzysta z wcześniej przygotowanych tekstów, obrazów i linków, bez uploadu wideo.
- [new] FR-007: Uczeń może przenieść zadanie ze stanu `Do zrobienia` do `W trakcie`, a następnie do `Do sprawdzenia`. Priorytet: musi-być.
  > Sokrates: Rozważono, że samodzielne oznaczenie `Ukończone` daje niewiarygodny postęp. Rozwiązanie: uczeń zgłasza zadanie do sprawdzenia, a ukończenie wymaga decyzji mentora.
- [new] FR-008: Mentor może zobaczyć tablicę bieżącego cyklu, statusy zadań i daty ostatnich zmian przypisanego ucznia oraz przenieść zadanie do `Poprawki` albo `Zatwierdzone`. Priorytet: musi-być.
  > Sokrates: Rozważono, że rozbudowany dashboard przekroczy zakres MVP. Rozwiązanie: monitoring ograniczono do tablicy cyklu, statusów i dat zmian.
- [new] FR-009: Mentor może ręcznie kontrolować, które zadania są dostępne na tablicy cyklu, a które pozostają zablokowane w backlogu. Priorytet: musi-być.
  > Sokrates: Rozważono ryzyko oczekiwania ucznia na ręczną decyzję mentora. Rozwiązanie: wymaganie pozostaje bez zmian, ponieważ planning z mentorem jest rdzeniem pierwszej wersji.
- [new] FR-010: Uczeń może zobaczyć bieżące zadania na tablicy cyklu oraz zablokowane zadania w backlogu bez możliwości ich rozpoczęcia. Priorytet: musi-być.
  > Sokrates: Rozważono połączenie następnego kroku z samym widokiem materiału. Rozwiązanie: zachowano osobny podział tablica/backlog, aby uczeń widział bieżący zakres i dalszą ścieżkę.

## Constraints & Compatibility

### Compatibility

- Nie ma istniejących funkcji produktowych, kontraktów ani integracji, które wymagają kompatybilności wstecznej.
- Nie ma istniejących danych produktowych do przeniesienia.
- Obecny szkielet aplikacji musi pozostać uruchamialny.

### Quality Constraints

- Każda zmiana statusu zadania otrzymuje widoczne potwierdzenie w ciągu 1 sekundy.
- Żaden mentor nie może odczytać danych ucznia bez aktywnej relacji zaakceptowanej przez tego ucznia.
- Pełny przepływ MVP jest używalny na komputerze w aktualnej wersji jednej z głównych przeglądarek desktopowych.

## Business Logic Changes

Uczeń pracuje wyłącznie nad zadaniami bieżącego cyklu, a zadanie staje się ukończone dopiero po zatwierdzeniu przez przypisanego mentora; odrzucenie kieruje je do poprawek.

Reguła przyjmuje zadania wybrane wspólnie podczas planningu oraz zmiany statusów dokonywane przez ucznia i mentora. Jej wynikiem jest aktualny stan tablicy cyklu i zakres pracy dostępny dla ucznia.

Uczeń napotyka regułę podczas pracy na tablicy, gdzie może zmieniać status tylko dostępnych zadań. Mentor napotyka ją podczas sprawdzania, gdy zatwierdza zadanie albo zwraca je do poprawek.

## Access Control Changes

Zmiana dodaje dwie role: ucznia i mentora. Uczeń uczy się według planu i kontroluje dostęp do swoich danych. Mentor może tworzyć lub modyfikować plan przygotowań oraz śledzić postęp wyłącznie przypisanych uczniów.

Relacja mentor-uczeń powstaje po wysłaniu zaproszenia przez mentora i zaakceptowaniu go przez ucznia. MVP obsługuje logowanie e-mailem i hasłem. Użytkownik bez uwierzytelnienia nie uzyskuje dostępu do kursu ani danych ucznia.

## Non-Goals

- OAuth i 2FA nie wchodzą do MVP, aby uwierzytelnianie nie przesłoniło przepływu nauki.
- Upload wideo i edytor kursów nie wchodzą do MVP; pierwszy przepływ korzysta z jednego wcześniej przygotowanego kursu.
- Automatyczne dobieranie zadań nie wchodzi do MVP; mentor ręcznie ustala zakres cyklu z uczniem.
- Rozbudowany dashboard i analityka nie wchodzą do MVP; monitoring ogranicza się do tablicy, statusów i dat zmian.
- Pełna obsługa telefonu nie wchodzi do MVP; gwarantowany jest przepływ na komputerze.

## Open Questions

1. **Dlaczego zmiana jest potrzebna właśnie teraz?** Właściciel: użytkownik. Termin: przed przeglądem PRD. Blokuje MVP: nie.
2. **Jak reguła przepływu SOMA powinna zmienić się przy stukrotnie większej liczbie uczniów na mentora?** Właściciel: użytkownik. Termin: przed planowaniem skalowania poza MVP. Blokuje MVP: nie.
3. **Jakie są docelowe natężenie ruchu i wolumen danych?** Właściciel: użytkownik. Termin: podczas oceny stosu po PRD. Blokuje MVP: nie.