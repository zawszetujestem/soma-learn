# Test Plan

> Phased test rollout for this project. Strategy is frozen at the top
> (§1–§5); cookbook patterns at the bottom (§6) fill in as phases ship.
> Read before writing any new test.
>
> Refresh: re-run `/10x-test-plan --refresh` when stale (see §8).
>
> Last updated: 2026-09-01

## 1. Strategy

Tests follow three non-negotiable principles for this project:

1. **Cost × signal.** The cheapest test that gives a real signal for the
   risk wins. Do not promote to e2e because e2e "feels safer." Do not put a
   vision model on top of a deterministic visual diff that already catches
   the regression.
2. **User concerns are first-class evidence.** Risks anchored in "the
   team is worried about X, and the failure would surface somewhere in
   <area>" carry the same weight as PRD lines or hot-spot data.
3. **Risks are scenarios, not code locations.** This plan documents *what
   could fail* and *why we believe it's likely* — drawn from documents,
   interview, and codebase *signal* (churn, structure, test base). It does
   NOT claim to know which line owns the failure. That knowledge is
   produced by `/10x-research` during each rollout phase. If the plan and
   research disagree about where the failure lives, research is the
   ground truth.

Hot-spot scope used for likelihood weighting: `apps/`, `soma_config/`, `manage.py`.

## 2. Risk Map

The top failure scenarios this project must protect against, ordered by
risk = impact × likelihood. Risks are failure scenarios in user / business
terms, not test names. The Source column cites the *evidence that surfaced
this risk* — never a specific file as "where the failure lives" (that is
research's job, see §1 principle #3).

| # | Risk (failure scenario) | Impact | Likelihood | Source (evidence — not anchor) |
|---|--------------------------|--------|------------|--------------------------------|
| 1 | Mentor sees a student's data without an active relationship (missing ownership check) | High | High | PRD Guardrails; interview Q1, Q4; hot-spot dir `apps/learning/` |
| 2 | A user opens a course they are not entitled to by swapping an id (course ownership not verified) | High | Medium | PRD FR-002, FR-004; interview Q1 |
| 3 | Deleting an account fails to scrub all personal data (e.g. invitation email survives) | High | Medium | roadmap S-06; PRD Access Control Changes |
| 4 | A migration deletes/breaks rows in production | High | Medium | interview Q2; existing seed/soft-delete data migrations |
| 5 | A login/registration change (email as USERNAME_FIELD) locks users out | Medium | Medium | interview Q3; hot-spot dir `apps/accounts/` |
| 6 | A second acceptance, or acceptance of an expired invitation, creates a relationship | Medium | Medium | PRD FR-003, FR-004 (lifecycle abuse) |
| 7 | Invitation token or personal data leaks into logs or error bodies | Medium | Low | PRD (secret-abuse lens) |

### Risk Response Guidance

| Risk | What would prove protection | Must challenge | Context `/10x-research` must ground | Likely cheapest layer | Anti-pattern to avoid |
|------|-----------------------------|----------------|-------------------------------------|-----------------------|-----------------------|
| #1 | Mentor query returns, and mentor views render, only students with an active relationship | "Logged in + is_mentor" implies access to *this* student's data | The access selector and every view that lists a student's data; how relationship status is filtered | integration | happy-path-only access test; asserting "is_mentor" instead of ownership |
| #2 | A non-entitled user gets 403 (or no matching row) for a course they don't own | "Authenticated" implies entitled to any course by id | How course access is gated per view; whether membership is checked at all today | integration | asserting 200 for logged-in user without an entitlement fixture |
| #3 | Soft-deleting an account leaves no PII in any table that referenced it | Soft-delete of a row scrubs all references automatically | Every field/model that stores email or PII linked to a user; on_delete cascades | unit + integration | asserting only the user row is anonymized while referenced PII is ignored |
| #4 | Migrations apply idempotently and reversibly without touching user rows | "Migration ran once" equals "safe on production data" | Forward/reverse paths of each data migration; seed get_or_create idempotency | migration test + `makemigrations --check` | testing only forward path; reverse that deletes by title/field |
| #5 | A user can log in with email after any auth change; registration creates a student | "LoginView with email field" implies all auth works | AuthenticationForm + UserManager flows; USERNAME_FIELD behavior | unit + integration | asserting password/login on the wrong identifier field |
| #6 | Accepting an already-accepted or expired invitation is rejected without creating a relationship | "POST succeeds" implies a relationship was rightly created | Invitation state transitions and expiry; accept path transactionality | unit + integration | testing only the happy accept path |
| #7 | Raw token and PII never appear in logs, error bodies, or responses | "Stored hashed" implies "never logged" | Where tokens/PII are passed, stored, and surfaced | unit + integration (grep-style assertion) | asserting storage shape while ignoring log/error output |

## 3. Phased Rollout

Each row is a discrete rollout phase that will open its own change folder
via `/10x-new`. Status moves left-to-right through the values below; the
orchestrator updates Status as artifacts appear on disk.

| # | Phase name | Goal (one line) | Risks covered | Test types | Status | Change folder |
|---|------------|-----------------|---------------|------------|--------|---------------|
| 1 | Critical-path coverage | Defend access isolation and course entitlement | #1, #2 | integration | complete | testing-critical-path-coverage |
| 2 | Integration around hot-spots | Catch regressions in relationship lifecycle and account deletion | #3, #6 | unit + integration | not started | — |
| 3 | Auth regression | Prove login/registration/roles survive change | #5 | unit + integration | not started | — |
| 4 | Quality-gates wiring | Lock the migration floor and secret hygiene | #4, #7 | migration + gates | not started | — |

## 4. Stack

The classic test base for this project. AI-native tools (if any) carry a
`checked:` date so future readers can see which lines need re-verification.

| Layer | Tool | Version | Notes |
|-------|------|---------|-------|
| unit + integration | Django test runner (unittest) | Django 6.1 | existing runner; 9 test files under `apps/*/tests/` |
| lint + typecheck | Ruff / mypy | 0.16.5 / 2.3.1 | configured in `pyproject.toml` |
| e2e | none yet | — | not justified at MVP scale |
| accessibility | none yet | — | not in scope for first rollout |
| AI-native | not available in current session | n/a | no browser/vision MCP exposed |

**Stack grounding tools (current session):**

- Docs: none — no docs MCP in session; framework versions read from `pyproject.toml` and `stack-assessment.md`; checked: 2026-09-01
- Search: none — no search MCP in session; checked: 2026-09-01
- Runtime/browser: none — no Playwright/browser MCP; not used; checked: 2026-09-01
- Provider/platform: none — no CI provider configured yet (`ci_provider: null`); checked: 2026-09-01

## 5. Quality Gates

The full set of gates that must pass before a change reaches production.
"Required for §3 Phase N" means the gate is enforced once that rollout
phase lands; before that, the gate is `planned`.

| Gate | Where | Required? | Catches |
|------|-------|-----------|---------|
| `manage.py check` | local | required | config/routing drift |
| unit + integration | local | required | logic regressions |
| ruff + mypy | local | required | lint/type drift |
| `makemigrations --check --dry-run` | local + CI | required after §3 Phase 4 | missing migrations (risk #4) |

## 6. Cookbook Patterns

How to add new tests in this project. Each sub-section is filled in once
the relevant rollout phase ships; before that, the sub-section reads
"TBD — see §3 Phase N."

### 6.1 Adding a unit test

- **Location**: `apps/<app>/tests/test_*.py`
- **Naming**: `test_*.py` module, `test_<behavior>` method.
- **Reference test**: `apps/core/tests/test_views.py`.
- **Run locally**: `.venv/Scripts/python.exe manage.py test <app>`

### 6.2 Adding an integration test

- **Location**: `apps/<app>/tests/test_*.py` (no separate integration dir at MVP scale).
- **Mocking policy**: use Django test DB (`TestCase`); never mock internal modules.
- **Reference test**: `apps/learning/tests/test_access.py`.
- **Run locally**: `.venv/Scripts/python.exe manage.py test <app>`.

### 6.3 Adding a test for access/isolation

- **Test type**: integration (view test via `client.force_login` + selector test).
- **Pattern**: create two mentors/two students + distinct `CourseInstance` rows, assert ownership gate (200 for member, 403 for stranger, 302 for anonymous) and selector scoping.
- **Reference test**: `apps/learning/tests/test_views.py`, `apps/learning/tests/test_access.py`.
- **When to add a selector edge case**: when a pair has both an ended and an active relationship across different course instances.

### 6.4 Adding a migration test

- TBD — see §3 Phase 4.

### 6.5 Per-rollout-phase notes

(Optional. After each phase lands, /10x-implement appends a 2-3 line note
here capturing anything surprising the rollout phase taught.)

## 7. What We Deliberately Don't Test

Exclusions agreed during the rollout (Phase 2 interview, Q5).

- **Django admin panel** — small trusted surface, low blast radius.
  Re-evaluate if admin grows beyond internal use. (Source: interview Q5.)

## 8. Freshness Ledger

- Strategy (§1–§5) last reviewed: 2026-09-01
- Stack versions last verified: 2026-09-01
- AI-native tool references last verified: 2026-09-01

Refresh (`/10x-test-plan --refresh`) when:

- a new top-3 risk surfaces from the roadmap or archive,
- a recommended tool's `checked:` date is older than three months,
- the project's tech stack changes (new framework, new test runner),
- §7 negative-space no longer matches what the team believes.