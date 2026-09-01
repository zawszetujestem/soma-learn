<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Mentor loguje się i wchodzi do pierwszego gotowego kursu

- **Plan**: `context/changes/mentor-enters-first-course/plan.md`
- **Scope**: Phase 1–3 of 3
- **Date**: 2026-09-01
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 2 warnings, 7 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | WARNING |
| Scope Discipline | WARNING |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | PASS |

## Findings

### F1 — Case-sensitive duplicate-email check lets a 500 slip through

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: apps/accounts/forms.py:18
- **Detail**: `clean_email` filters with `User.objects.filter(email=email)` (case-sensitive), while `UserManager.normalize_email` lowercases the domain at save time. Registering `duplicate@EXAMPLE.COM` when `duplicate@example.com` exists passes validation and then hits the unique constraint as an unhandled `IntegrityError` (HTTP 500).
- **Fix**: Check with `email__iexact` (or normalize before the existence check), and optionally catch `IntegrityError` in the view as a belt-and-braces guard.
  - Strength: Matches the manager normalization already in use and closes the whole mismatch class.
  - Tradeoff: One query parameter change; no schema work.
  - Confidence: HIGH — `normalize_email` exists in apps/accounts/managers.py:19.
  - Blind spot: None significant.
- **Decision**: FIXED — email__iexact in clean_email

### F2 — Reverse migration deletes any course with the seed title

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: apps/learning/migrations/0002_seed_ready_course.py:15
- **Detail**: `unseed_ready_course` deletes every `Course` with the seed title, including one created by a real user later. Plan asked for a no-op or targeted reverse.
- **Fix**: Capture the seeded `pk` on forward and delete only that `pk` on reverse (or make reverse a no-op).
  - Strength: Removes the only destructive path in the migration.
  - Tradeoff: Tiny extra state to pass between forward/reverse.
  - Confidence: HIGH — `get_or_create` already returns the instance.
  - Blind spot: None significant.
- **Decision**: FIXED — reverse is now a no-op

### F3 — DEBUG defaults to True in settings

- **Severity**: 🗒️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: soma_config/settings.py:38
- **Detail**: Pre-existing (not introduced by S-01): `DEBUG` defaults to `True`, so a missing env in production runs with debug on. The guard at line 41 only fires when `DEBUG=False`.
- **Fix**: Default `DEBUG=False` or fail fast when env is unset outside dev.
- **Decision**: SKIPPED — reverting; breaks local dev without .env

### F4 — Register redirect hardcodes the URL name

- **Severity**: 🗒️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: apps/accounts/views.py:14
- **Detail**: Plan said "redirect na `LOGIN_REDIRECT_URL`"; implementation hardcodes `"learning:course-list"` — same value today, but two sources of truth.
- **Fix**: Read `settings.LOGIN_REDIRECT_URL` in the register view.
- **Decision**: FIXED — reads settings.LOGIN_REDIRECT_URL

### F5 — Seed get_or_create omits `defaults`

- **Severity**: 🗒️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: apps/learning/migrations/0002_seed_ready_course.py:10
- **Detail**: Plan specified `get_or_create(title=..., defaults={...})`; implementation omits `defaults`. Harmless today (`Course` has only `title` + `created_at`), but matches the contract less precisely.
- **Fix**: Add `defaults={}` for explicitness, or leave as-is.
- **Decision**: FIXED — added defaults={}

### F6 — Unplanned files bundled in the change commit

- **Severity**: 🗒️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Scope Discipline
- **Location**: commit 18a3be7
- **Detail**: The commit includes `.github/*` (10x-cli tooling), `opencode.json`, `pyproject.toml` and F-01 (`access-and-invitation-contract`) files alongside S-01. These are harmless supporting/tooling artifacts, not part of the S-01 plan.
- **Fix**: Accept as addendum, or keep future changes in change-scoped commits.
- **Decision**: ACCEPTED — harmless supporting/tooling artifacts

### F7 — Course-entry gate lacks negative tests

- **Severity**: 🗒️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: apps/learning/tests/test_views.py:39-45
- **Detail**: `CourseEntryView` uses the same `MentorRequiredMixin` as the list view, but tests only assert the mentor happy path on entry; student-403 and anonymous-redirect are covered only for the list.
- **Fix**: Add student-forbidden and anonymous-redirect tests for `learning:course-entry`.
- **Decision**: FIXED — added student-403 and anonymous-redirect tests

### F8 — Cross-app template dependency on base.html

- **Severity**: 🗒️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: apps/learning/templates/learning/course_list.html:1
- **Detail**: `learning` templates extend `base.html` living under `apps/accounts/templates/`. Works via `APP_DIRS=True`, but creates a dependency from `learning` to `accounts`.
- **Fix**: Move the shared layout to `apps/core/templates/` (or a shared templates dir).
- **Decision**: FIXED — base.html moved to apps/core/templates/

### F9 — CourseListView is unpaginated

- **Severity**: 🗒️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: apps/learning/views.py:19
- **Detail**: `CourseListView` returns all courses with no pagination. Fine for the one seeded course; unbounded later.
- **Fix**: Paginate or cap the queryset.
- **Decision**: SKIPPED — MVP has one course
