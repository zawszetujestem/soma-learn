# Kontrakt ról i zaproszeń uczeń-mentor — Krótki plan

> Pełny plan: `context/changes/access-and-invitation-contract/plan.md`

## Co i dlaczego

F-01 ustanawia kontrakt tożsamości i dostępu wymagany przed pierwszym logowaniem mentora oraz zaproszeniem ucznia. Najważniejszy niezmiennik: mentor otrzymuje dostęp do ucznia tylko przez zaakceptowaną, aktywną relację do konkretnego kursu.

## Punkt wyjścia

Django ma włączone sesje i auth, ale używa domyślnego użytkownika oraz nie ma modeli domenowych. Bazy nie zawierają danych produktowych, więc to ostatni bezpieczny moment na ustawienie własnego modelu użytkownika.

## Pożądany stan końcowy

Konto loguje się e-mailem i może mieć role ucznia i mentora. Siedmiodniowe zaproszenie jest związane z kursem i e-mailem; ponowienie zastępuje token. Akceptacja tworzy audytowalną relację, którą obie strony mogą zakończyć, natychmiast odbierając mentorowi dostęp.

## Kluczowe podjęte decyzje

| Decyzja | Wybór | Dlaczego |
|---|---|---|
| Model konta | Custom user przed pierwszą migracją | Unikalny e-mail jest identyfikatorem logowania |
| Role | Niezależne uczeń i mentor | Jedno konto może działać w obu rolach |
| Mentor | Rola nadawana przez administratora | Brak samodzielnej eskalacji uprawnień |
| Zakres zgody | Relacja per kurs | Zaproszenie daje najmniejsze potrzebne uprawnienia |
| Ważność | 7 dni | Ogranicza użycie starego linku |
| Ponowienie | Unieważnij stare, utwórz nowe | Każda ponowna wysyłka ma świeży token |
| Zakończenie | Dostępne obu stronom | Uczeń kontroluje zgodę, mentor porządkuje relacje |
| Historia | Tylko rekord audytowy | Po zakończeniu mentor nie czyta danych ucznia |
| Testy | Modele, cykl życia i izolacja | F-01 chroni granicę bezpieczeństwa, nie UI |

## Zakres

**W zakresie:** użytkownik e-mailowy, role, minimalny kurs, zaproszenie, relacja, usługi cyklu życia, selektor dostępu, migracje i testy.

**Poza zakresem:** formularze i widoki, wysyłka e-mail, zawartość kursu, zadania, OAuth, 2FA i produkcja.

## Architektura / Podejście

`accounts` posiada tożsamość, a `learning` minimalny kurs i relacje. Jawne usługi transakcyjne wystawiają, akceptują i kończą relacje; widoki kolejnych slice'ów będą wywoływać te usługi zamiast duplikować reguły.

## Fazy w skrócie

| Faza | Co dostarcza | Kluczowe ryzyko |
|---|---|---|
| 1. Tożsamość i role | Email login i konto z wieloma rolami | Model użytkownika musi powstać przed migracjami |
| 2. Zaproszenie i relacja | Pełny kontrakt cyklu życia per kurs | Token, e-mail i akceptacja muszą być atomowe |
| 3. Izolacja i PostgreSQL | Dowód utraty dostępu i działające migracje Compose | Reset nie może dotknąć danych poza lokalnym wolumenem |

**Wymagania wstępne:** brak danych produktowych; lokalny wolumen Compose jest jednorazowy.
**Szacowany nakład pracy:** około 3 sesje w 3 fazach.

## Otwarte ryzyka i założenia

- Reset wolumenu PostgreSQL wymaga ręcznego potwierdzenia przed fazą 3.
- F-01 definiuje minimalny kurs tylko jako kotwicę zgody; pełny kurs należy do S-01.
- Retencja audytowa poza MVP nie jest określona.

## Kryteria sukcesu (podsumowanie)

- Konto może mieć obie role, ale mentor nie nadaje ich sobie sam.
- Tylko właściwy uczeń akceptuje aktywne zaproszenie do wskazanego kursu.
- Zakończenie relacji zachowuje audyt i usuwa dostęp mentora.