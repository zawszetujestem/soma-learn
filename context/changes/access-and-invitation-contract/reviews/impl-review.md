<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Kontrakt ról i zaproszeń uczeń-mentor

- **Plan**: `context/changes/access-and-invitation-contract/plan.md`
- **Scope**: Phase 1–3 of 3
- **Date**: 2026-09-01
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 3 warnings, 5 observations

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

### F1 — Email in the invitation is not normalized before matching

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: apps/learning/services.py:47, 91-93
- **Detail**: `issue_invitation` stores the email exactly as passed, while accounts normalize the domain on user creation. `accept_invitation` compares `invitation.email != student.email` case-sensitively, so a legit invitee whose account email differs only in case is wrongly rejected. Plan binds the invitation to a "znormalizowany e-mail".
- **Fix**: Normalize the email in `issue_invitation` (reuse `get_user_model().objects.normalize_email`) and keep the accept-time comparison on normalized values.
  - Strength: Matches the accounts manager normalization already in use; removes the case-mismatch class entirely.
  - Tradeoff: One extra normalization call at issue time.
  - Confidence: HIGH — same normalize_email pattern exists in apps/accounts/managers.py.
  - Blind spot: None significant.
- **Decision**: FIXED (Fix now) — email normalized in issue/reissue/accept

### F2 — accept_invitation can surface a raw IntegrityError

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: apps/learning/services.py:96-101
- **Detail**: `Relationship.objects.create` is not guarded against the `unique_active_relationship` constraint. A student accepting a second invitation for the same mentor/course raises an uncaught `IntegrityError` instead of a domain `ServiceError`.
- **Fix**: Pre-check for an existing active relationship (or catch `IntegrityError`) and raise a `ServiceError` subclass.
  - Strength: Keeps the service contract clean; callers never see a DB-level exception.
  - Tradeoff: One extra existence query on the accept path.
  - Confidence: HIGH — the constraint exists in apps/learning/models.py:56-63.
  - Blind spot: None significant.
- **Decision**: FIXED (Fix now) — pre-check active relationship, raise ServiceError

### F3 — Missing double-accept test

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: apps/learning/tests/test_services.py
- **Detail**: Plan's Phase 2 contract lists "podwójna akceptacja" among the abuse cases to cover, but no test accepts an already-accepted token.
- **Fix**: Add a test asserting that a second `accept_invitation` for the same token raises `InvitationNotUsableError`.
- **Decision**: FIXED (Fix now) — double-accept test added

### F4 — Unplanned ruff per-file-ignores in pyproject.toml

- **Severity**: 🗒️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Scope Discipline
- **Location**: pyproject.toml
- **Detail**: Added `[tool.ruff.lint.per-file-ignores]` for `**/migrations/*.py` (E501, I001). Not in the plan, but harmless supporting config for generated migrations.
- **Fix**: Document as a plan addendum or accept as-is.
- **Decision**: SKIPPED — harmless supporting config, accepted as addendum

### F5 — Invitation.Status.EXPIRED is never assigned

- **Severity**: 🗒️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Architecture
- **Location**: apps/learning/services.py:85-86
- **Detail**: Expiry is derived from `expires_at` (consistent with the source-of-truth decision), so `Status.EXPIRED` stays unused and stale pending rows accumulate with no cleanup path.
- **Fix**: Leave expiry derived; optionally sweep expired pending rows later or drop the enum value.
- **Decision**: SKIPPED — expiry derived from expires_at (conscious decision)

### F6 — select_for_update is a no-op on SQLite

- **Severity**: 🗒️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: apps/learning/services.py:80
- **Detail**: The concurrency guard in `accept_invitation` only takes effect on PostgreSQL; SQLite ignores row locks, so the local suite does not exercise it.
- **Fix**: None required now; note it in the test strategy.
- **Decision**: SKIPPED — SQLite no-op, effective on PostgreSQL

### F7 — end_relationship has a benign race

- **Severity**: 🗒️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: apps/learning/services.py:102-106
- **Detail**: Mutates a caller-loaded instance without re-reading it inside the transaction; two concurrent enders could both pass the `status == ACTIVE` check. Idempotent-ish, so low impact.
- **Fix**: Re-fetch under `select_for_update()` inside the atomic block if strictness matters.
- **Decision**: SKIPPED — benign, near-idempotent race

### F8 — get_user_model resolved at import time

- **Severity**: 🗒️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: apps/learning/services.py:18
- **Detail**: Module-level `UserModel = get_user_model()` can raise `AppRegistryNotReady` if imported before the app registry loads; the models use `settings.AUTH_USER_MODEL` strings instead.
- **Fix**: Resolve the model lazily inside functions, mirroring the models layer.
- **Decision**: SKIPPED — services imported after app registry loads
