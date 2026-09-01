---
change_id: ux-polish
title: Poprawki UX/UI warstwy szablonów
status: in_progress
created: 2026-09-01
updated: 2026-09-01
archived_at: null
---

## Notes

S-07 z `context/foundation/roadmap.md`: czysto prezentacyjna warstwa szablonów — nawigacja, komunikaty i stany puste zamiast surowych formularzy i list. Bez zmian w `.py`; logikę domena zapewnia S-06 i wcześniejsze slice'y.

Link „Usuń konto" wskazuje `accounts:delete-account` (trasę dostarczy S-06). Rendering przez `{% url ... as delete_account_url %}` + `{% if delete_account_url %}` sprawia, że link pojawi się dopiero, gdy trasa zaistnieje — do tego czasu strony działają bez `NoReverseMatch`.