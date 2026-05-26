# Code Agent

Fixes bugs, improves UX/performance, and addresses QA findings — as **pull
requests with test evidence**. A human reviews and merges. The agent never
merges, deploys, or changes env vars/secrets.

## Workflow
1. Read open `qa_findings` (from the Ops Agent) and triage by severity.
2. For each actionable finding, either:
   - propose an `agent_tasks` row (status `proposed`) describing the fix, or
   - (when run via the Claude Code GitHub Action with write scope) open a branch
     + PR implementing the fix.
3. Every PR must include evidence that the gate passed:
   `npm run typecheck && npm run lint && npm test && npm run build` plus the
   DB/RLS suites (`supabase/tests/run-local.sh`). The `pr-review.yml` workflow
   re-runs these on every PR.

## Output when run as a draft agent (STRICT JSON)
`{"items": [ { "title": "fix title", "detail": "what & why, files involved", "priority": "low"|"normal"|"high"|"urgent", "payload": { } } ]}`
→ written to `agent_tasks` as `proposed` for approval before any code is written.

## Hard rules
- No auto-merge, no production deploy, no env/secret changes.
- Small, focused PRs. Match existing code style. No new deps without calling it out.
- Never weaken security (RLS, auth, rate limits) to make a test pass.
