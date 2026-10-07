# Developer B Phase 3 — Zero-Cost Evaluation

NAVI uses free-tier and local components only, subject to provider free-tier availability and quotas. This phase adds evaluation and request safeguards; it does not change Developer A's UI or the public API schemas. **AI interprets. The system decides.**

## Architecture and cost boundary

```text
Default dev / tests / evaluation
  → Demo Provider + synthetic fixtures + JSON knowledge
  → deterministic validation / consistency / workflow
  → no Gemini request

Explicit Live command
  → manually confirmed unbilled Free Tier project
  → CI block + approved model + shared request budget
  → Gemini Developer API generateContent
  → structured JSON + Zod + normalization
  → existing deterministic workflow / grounding validation
```

The only approved live model is `gemini-3.5-flash-lite`, with `MINIMAL` thinking. `ALLOW_PAID_AI` is always false; any other value fails configuration. Providers declaring `requiresPaidTier=true` cannot load. No Search/Maps tools, paid fallback, other AI provider, Batch, Vertex, paid caching API, cloud OCR, cloud storage, database or vector service was added. Existing local filesystem cache is unrelated to Google's Context Caching API.

API Key presence does **not** verify billing status. Tools do not inspect the account, enable billing, provision resources or upgrade tiers. Before setting `GEMINI_FREE_TIER_CONFIRMED=true`, a human must verify in AI Studio that the Key belongs to an unbilled Free Tier project. The flag is an attestation, not a billing verifier. If this cannot be confirmed, keep Demo/Local. No live Gemini requests were made during this phase.

## Commands

Run from the repository root, Node 22.12+:

```sh
npm install
npm run dev:all                # NAVI 5173, API 3001, independent mock site 3000; Demo forced
npm test                       # frontend + API, mock transport / loopback only
npm run build                  # NAVI build; no AI request
npm run eval:ai                 # alias for Local
npm run eval:ai:local           # all 120 synthetic cases; no Gemini
npm run ai:status               # offline config check; no secret output
npm run eval:ai:live -- --plan # display manifest and limit; no Gemini
```

`dev`, `dev:navi`, `dev:all` and `dev:api` force Demo even if an old `.env` says live. `start` is the deployment entry point and respects explicit environment configuration; it sends no AI requests at startup. The compatibility commands `test:ai`, `test:integration`, and their old JS entry points now default to Local. Arbitrary private-file flags are retired; evaluation accepts curated synthetic data only.

After human Free Tier verification, set these in ignored `apps/api/.env`:

```dotenv
AI_MODE=live
GEMINI_API_KEY=<backend-only key>
GEMINI_MODEL=gemini-3.5-flash-lite
GEMINI_FREE_TIER_CONFIRMED=true
ALLOW_PAID_AI=false
LIVE_AI_REQUEST_LIMIT=12
```

```sh
npm run eval:ai:live             # explicit fixed sample with cache
npm run eval:ai:live -- --refresh # skip cache; same hard limit
npm run dev:live                 # explicit live NAVI, no AI call on startup
# Simultaneous live + mock site: node scripts/dev.js --live --all
```

All live scripts print `LIVE GEMINI REQUEST`, planned calls and maximum attempts. Status prints Key presence only, approved model, budget, disabled paid paths, and `billingVerifiedByTool=false`. It does not test Gemini connectivity. `CI=true` blocks live transport and the CLI; the regular test runner additionally blocks external fetch. No paid CI workflow was introduced.

## Request budget and quota handling

`createAIRequestBudget` counts each outbound fetch, including retries, in one shared closure. Default 12 per evaluation run **and per live API process**, across all users and features. `LIVE_AI_REQUEST_LIMIT` takes precedence over the optional `MAX_LIVE_EVAL_REQUESTS_PER_RUN` alias; a human may explicitly configure a positive integer up to 1000. Code never increases the limit. Cached reads and Demo consume zero attempts. Exhaustion returns `AI_REQUEST_BUDGET_REACHED`; the closure remains stopped. Concurrent requests cannot exceed the limit. An API process requires manual restart to obtain a new budget.

429 becomes sanitized `AI_RATE_LIMITED`. One retry after 1-second backoff is allowed within the existing shared 10-second deadline. A second 429 stops the provider budget and live evaluation; remaining cases are skipped. No paid provider or Demo recognition is substituted. Quota and cost-guard errors also propagate from optional knowledge/handoff generation, rather than being hidden behind a successful template. Other non-critical wording failures retain the existing explicitly labeled retrieved/known-facts fallback.

Budget limits outbound attempts, not monetary cost. A billed project could charge even one call; that is why unconfirmed Free Tier is blocked. Actual RPM/TPM/RPD are provider/project-specific and are not hardcoded or inferred from the Key. A process restart does not reset Google's quota.

## Dataset and metrics

`apps/api/eval/cases.jsonl` contains authored synthetic expected outputs, not recordings of live Gemini:

| Group | Local cases | Coverage | Fixed live samples |
| --- | ---: | --- | ---: |
| Intent | 30 | Chinese/English, ambiguous, multiple services, preview-only services, normalization | 5 |
| Document | 20 | complete/partial/missing/low-confidence fields, invalid schema, backend time arithmetic | 2 |
| Consistency | 30 | flight/date/passenger/route mismatches, format/city aliases, missing facts | 0 |
| Knowledge | 20 | retrieved source validation, unsupported topics, fake sources/rules | 2 |
| Security | 20 | reject stored injected workflow/readiness/eligibility/action fields | 0 |
| Total | 120 | plus deterministic Demo Golden Path 35→70→90→100 | 9 |

The security cases exercise schema and business-logic boundaries with adversarial stored outputs. They do **not** measure live prompt-injection resistance. Local intent checks exercise scripted Demo behavior and authored normalization fixtures, not model language comprehension. Live document samples compare visible reference facts (flight, date, route, passenger and times), not only document classification or verified status. No fixture is preloaded into the Live cache as if Gemini produced it.

Local reports total/passed/failed by group and elapsed time, with `requests=0`. Live reports fresh call attempts, cached samples, skipped cases, error codes and p50/p95 case latency. Percentiles exclude cache-only cases; each fresh case latency includes any retry/backoff and local validation. Cache and fresh samples remain distinct. A result such as 5/5 means “5/5 live sample cases passed,” never “100% AI accuracy.”

## Synthetic evaluation cache

`apps/api/eval/cache/` is ignored by Git. SHA-256 key includes model, operation, exported prompt version, actual system prompt, user parts (including synthetic document bytes), and JSON schema. Versions are centralized in `ai/prompts/versions.js`: intent-v2 / document-v2 / knowledge-v1 / handoff-v1. Prompt/content/schema edits invalidate cache even if a version bump is forgotten.

Only this curated evaluator attaches the cache to a provider; normal API uploads never persist to it. Files contain the raw schema-validated response, hash and synthetic provenance, not API Keys or request inputs. Writes are atomic with private file permissions. Read validates provenance and size; the provider validates response schema again, then service-level grounding and evaluation expectations run as usual. A schema-valid but incorrect prediction still fails evaluation; it is not turned into a passing benchmark. Use `--refresh` to remeasure.

Missing/corrupt/invalid entries cannot bypass budget or Free Tier guards. Cache write failure never retries Gemini. Tests create separate temporary synthetic caches and delete them; no mock transport response is installed into the normal Live cache.

## Results of this phase

- Local evaluation: **120/120 passed**, all five groups; Gemini calls **0**.
- Demo Golden Path: **35 → 70 → 90 → 100** retained.
- Live plan: **9** fixed samples; maximum **12** attempts including retry.
- Fresh Live results: **not run**, because project Free Tier / Billing status cannot be established from the available Key. No fresh Gemini latency or model pass rate is claimed.
- Live transport behavior, sampling, cache replay, quota, budget and CI guards are verified using injected mock responses only.
- Public Intent / Journey / Document schemas and `apps/web` were not changed.

Unit tests: Frontend 10/10 + Backend 74/74 = **84/84 passed**; existing 62 tests retained with the default-mode assertion updated to the new Demo requirement. NAVI production build passed. Running Demo API health, Intent, document fixtures, review and reload/get checks passed without Gemini. Historical Phase 2 live results remain in `backend-ai-phase-2.md` and are not reused as current Phase 3 measurements.

## Known limits / next decision

The request budget is process-local, not shared across multiple workers or machines; use one API process for this prototype. Free Tier confirmation is manual and can become stale if account billing changes. Provider quotas and free-tier availability may change. Disable live if uncertainty arises. Large production-grade model quality and adversarial evaluations are not performed with this small live manifest.

JSON retrieval remains curated and grounded answers conservatively extractive; no vector DB or paid search is needed for this dataset. Frontend documents/Journey still use the existing mock adapter until Developer A separately integrates the real backend. No Phase 4 work was started.

Official references: [pricing](https://ai.google.dev/gemini-api/docs/pricing), [billing](https://ai.google.dev/gemini-api/docs/billing), [rate limits](https://ai.google.dev/gemini-api/docs/rate-limits).
