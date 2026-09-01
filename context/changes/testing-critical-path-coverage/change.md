---
change_id: testing-critical-path-coverage
title: Pokrycie testami izolacji dostępu i uprawnień do kursu
status: implemented
created: 2026-09-01
updated: 2026-09-01
archived_at: null
---

## Notes

Faza 1 rolloutu `context/foundation/test-plan.md`: obrona ryzyka #1 (mentor widzi dane ucznia bez aktywnej relacji) i #2 (użytkownik otwiera kurs, do którego nie ma uprawnień). Warstwa: testy integracyjne — najtańszy sygnał dla kontroli własności (nie tylko `is_mentor`).