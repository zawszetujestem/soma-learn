# Mentor loguje się i wchodzi do pierwszego gotowego kursu — Krótki plan

> Pełny plan: `context/changes/mentor-enters-first-course/plan.md`
> Research: `context/changes/mentor-enters-first-course/research.md`

## Co i dlaczego

F-01 ustalił kontrakt tożsamości (`accounts.User` z logowaniem e-mailem) i dostarczył model `Course`, ale nie ma żadnej powierzchni HTTP ani szablonów. S-01 to pierwsza warstwa produktowa: mentor loguje się e-mailem i hasłem i wchodzi do jednego gotowego kursu. To pierwsze zintegrowanie konta, danych i prostego interfejsu (FR-001, FR-002).

## Punkt wyjścia

Dziś działa tylko `/healthz/` i panel admina. Brak widoków logowania/rejestracji, `accounts/urls.py`, tras, szablonów, ustawień `LOGIN_URL`/`LOGIN_REDIRECT_URL` i seeda kursu. `Course` istnieje w `learning`, ale powstaje wyłącznie w testach.

## Pożądany stan końcowy

Konto loguje się e-mailem i hasłem; nowe konto jest domyślnie uczniem, a rolę mentora nadaje administrator. Zalogowany mentor trafia na listę z jednym gotowym kursem i wchodzi do niego; uczeń dostaje 403, anonim jest przekierowany do logowania. Szkielet aplikacji pozostaje uruchamialny.

## Kluczowe podjęte decyzje

| Decyzja | Wybór | Dlaczego | Źródło |
| --- | --- | --- | --- |
| Identyfikator logowania | `email` (pole `email` w formularzu) | `USERNAME_FIELD="email"` wymaga pola e-mail w `AuthenticationForm` | Research / F-01 |
| Logowanie/rejestracja | Wbudowane `LoginView`/`LogoutView` + własne formularze | Mniej kodu, zgodne z Django 6 | Research |
| Rola mentora | Nadawana tylko przez admina | Kontrakt F-01: brak samodzielnej eskalacji | F-01 |
| Kurs | Jeden gotowy kurs, bez katalogu | FR-002 zachowuje wybór, MVP ma jeden kurs | PRD / Research |
| Seed kursu | Idempotentna migracja danych (`get_or_create`) | Kurs musi istnieć bez ręcznej akcji | Research |
| Dostęp do kursu | `LoginRequiredMixin` + check `is_mentor` | Dane produktu tylko za bramką uwierzytelniania | PRD / Research |

## Zakres

**W zakresie:** logowanie e-mailem i hasłem, rejestracja konta, wylogowanie, lista jednego gotowego kursu, wejście do kursu, seed kursu, szablony i testy.

**Poza zakresem:** katalog kursów, zaproszenia/akceptacja (S-02), treść kursu i zadania (S-03/S-04/S-05), OAuth/2FA, edytor kursów, upload wideo, nadawanie roli mentora samodzielnie.

## Architektura / Podejście

`accounts` przejmuje tożsamość i powierzchnię logowania/rejestracji; `learning` przejmuje widoki kursu i seed gotowego kursu. Widoki Django wywołują istniejące usługi domenowe, zamiast powielać reguły — warstwa HTTP buduje na kontrakcie F-01.

## Fazy w skrócie

| Faza | Co dostarcza | Kluczowe ryzyko |
| --- | --- | --- |
| 1. Logowanie i rejestracja | Formularze, widoki, szablony, ustawienia redirectów | `AuthenticationForm` musi działać z polem `email` |
| 2. Wejście mentora do kursu | Widoki kursu z bramką `is_mentor` + seed | Seed musi być idempotentny |
| 3. Testy i pełna walidacja | Pokrycie przepływu + pełna pętla jakości | Regresje szkieletu `/healthz/` |

**Wymagania wstępne:** F-01 zaimplementowany (`accounts.User`, `Course`, role); lokalne bramki jakości przechodzą.
**Szacowany nakład pracy:** ~2–3 sesje w 3 fazach.

## Otwarte ryzyka i założenia

- Rozjazd statusu: `change.md` F-01 = `impl_reviewed`, ale `roadmap.md` pokazuje `in-progress` — roadmapa przejdzie na `done` dopiero przy `/10x-archive`.
- Minimalny zakres „gotowego kursu" na pierwszy pilot — decyzja użytkownika, nie blokuje (seed tworzy kurs z tytułem roboczym).
- Czy po zalogowaniu mentor ląduje na liście kursów czy od razu w kursie — przyjęto listę (FR-002 mówi o wyborze); łatwe do zmiany w fazie 2.

## Kryteria sukcesu (podsumowanie)

- Mentor loguje się e-mailem i hasłem i wchodzi do jednego gotowego kursu.
- Uczeń bez roli mentora nie wejdzie do kursu (403); anonim trafia do logowania.
- Rejestracja tworzy konto ucznia bez roli mentora; `/healthz/` i admin pozostają sprawne.
