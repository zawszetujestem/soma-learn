# SOMA Learn — frontend

## Wymagania

- Node.js i npm

## Uruchomienie lokalne

Z katalogu głównego repozytorium:

```bash
cd frontend
npm ci
npm run dev -- --host 127.0.0.1
```

## Testy i build

Uruchom z katalogu `frontend/`:

```bash
npm test
npm run build
```

Frontend korzysta z React 19, Vite 8 i React Router 7. Testy są oparte na Vitest i Testing Library. Widok używa lokalnych fontów oraz grafiki SVG osadzonej w kodzie.

## Trasy i zakres

- `/` — strona główna wyjaśniająca SOMA, z sekcjami dla ucznia, rodzica i mentora. Pierwszą grupą są ósmoklasiści; maturzyści są planowani później.
- `/kursy` — krótki pusty stan „Kursy pojawią się wkrótce”; nie ma jeszcze ofert kursów.
- `/logowanie` — logowanie e-mailem i hasłem, potem 6-cyfrowy kod z allauth (`/_allauth/browser/v1/`); po pełnym uwierzytelnieniu token DRF jest wymieniany przez `/api/auth/token/exchange/` i zapisywany w `sessionStorage`. Logowanie Google jest dostępne tylko dla zweryfikowanych kont. Ponowne wysłanie kodu ma 60 s cooldown, nie resetuje czasu wygaśnięcia (kod ważny 10 min) i po wygaśnięciu jest zablokowane.

Zaproszenia uczniów przez mentora są opisane jako planowane, ale nie są zaimplementowane. Frontend nie udostępnia jeszcze działających kursów.

## Weryfikacja

Końcowe QA prototypu nie wykazało blockerów. `npm test` zakończył się wynikiem 10/10, `npm run build` zakończył się powodzeniem, a `get_errors` nie zgłosił błędów.

Ręczna inspekcja w Chrome/CDP objęła bezpośrednie otwarcie tras oraz emulowane viewporty 320×844 i 390×844. Na stronie głównej `document.scrollWidth` odpowiadał szerokości viewportu; na `/kursy` i `/logowanie` przy 390×844 wynosił 390 px. Zrzuty ekranu desktop i mobile zostały obejrzane wizualnie. Kontrasty wskazane podczas QA zostały poprawione.

Nie wykonano testu z czytnikiem ekranu ani pełnego audytu WCAG.