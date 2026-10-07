# NAVI — actual architecture (Developer B Phase 3 · zero-cost evaluation)

**AI interprets. The system decides.** NAVI is a service navigation layer, not an insurer's eligibility or claim submission system. The mock insurance website is a separate application.

## Implemented backend

```mermaid
flowchart TD
  HTTP[Express API: bounded inputs / CORS / rate limit] --> Intent[Intent service]
  HTTP --> Journey[JourneyService]
  HTTP --> Knowledge[Curated JSON retrieval]
  Intent --> AI[AIProvider: Demo default / explicit Live]
  Journey --> Documents[File signature / MIME / size validation]
  Documents --> AI
  Knowledge --> AI
  AI --> Demo[Offline scripted Demo]
  AI --> Guard[Free Tier attestation / CI block / 12-attempt budget]
  Guard --> Gemini[Gemini Developer API: approved model only]
  Gemini --> Schema[Structured JSON + Zod + normalization]
  Demo --> Schema
  Schema --> Facts[Interpreted facts only]
  Facts --> Validation[Evidence validation + cross-document / incident consistency]
  Validation --> Rules[Deterministic workflow / readiness / next action]
  Journey --> Rules
  Rules --> Repo[Injected InMemoryJourneyRepository]
  Knowledge --> Grounding[Verify extractive answer + retrieved source IDs]
  Grounding --> Answer[Prototype-labeled answer / explicit template fallback]
```

`apps/api/src/services/gemini.service.js` implements the provider interface with native fetch, not a Google SDK imported into controllers. `ai/prompts/` holds separate system instructions. `ai/schemas.js` validates model-only outputs; `shared/intelligence.js` and `shared/journey.js` define public contracts. The model cannot supply scores, workflow stages or actions. Missing facts remain null.

Demo is the default; ordinary dev scripts force Demo. Live requires an explicit command and `GEMINI_FREE_TIER_CONFIRMED=true` after a human verifies the project has no Billing. The tool cannot verify billing from an API Key. CI cannot call live AI. All attempts, including retries, share a hard 12-request budget per provider/process; no automatic reset or paid fallback. 429 backs off once, then stops live evaluation. Quota/guard failures are not hidden by wording fallbacks.

The only approved live model is `gemini-3.5-flash-lite`, configured centrally. A single 10-second deadline covers at most two attempts. Live intent/document failures return safe API errors and leave the stored Journey unchanged. Only non-critical knowledge/handoff wording can use the actual retrieved/known-fact template, explicitly labeled.

Workflow scoring is unchanged: incident 20 + service 15 + complete travel information 15 + boarding evidence 20 + delay certificate 20 + confirmation 10. Complete Golden Path remains **35 → 70 → 90 → 100**. Evidence conflict or low document confidence triggers human review; partial travel information cannot produce a ready-for-review journey. None of these states is an eligibility decision.

Only extracted fields and bounded server Journey records are stored in memory; file bytes are request-scoped. Repository TTL/capacity and rate limits remain process-local. There is no database, authentication, durable storage, insurer submission or specialist connection.

## Current frontend integration boundary

```text
React Landing → /api/intelligence/understand → explicit Demo / Free Tier Gemini intent → validated NAVI envelope
                                                             → existing browser workflow
                                                             → Mock document UI / sources
```

Developer B did not modify `apps/web`. The server-owned Journey, real document pipeline, grounded answer and enhanced handoff are callable via HTTP/CLI; the workspace has not yet adopted them. Developer A must add the existing Mock/Live adapter without changing UI or motion. Browser persistence remains the existing sessionStorage implementation. API tests are not evidence that the UI is reading real documents.

## Repository layout / independent sites

- `apps/web`: React/Vite NAVI, `127.0.0.1:5173`; dev `/api` proxy to 3001.
- `apps/api`: Express NAVI API, `127.0.0.1:3001`; Gemini Key only in ignored local `.env`.
- `apps/mock-site`: independent Next.js mock insurance website, `127.0.0.1:3000`; owns routing/assets/styles and imports original `data/` and `lib/contracts/`.
- `shared/`: NAVI Zod public contracts; original mock-site contracts are preserved separately.
- `knowledge/`: labeled prototype FAQs, sources, Journey requirements and score rules; no official coverage claims.

`npm run dev:all` starts three separate processes. There is no embedded assistant or automatic cross-site transport. Current demo switches tabs manually. Original `SPEC.md` describes broader planned work, not the implementation status.

## Delivered / deferred

| Capability | Status |
| --- | --- |
| Real structured Intent Understanding | Implemented; Chinese/English/secondary/unknown live tests passed |
| Server-owned Journey / workflow / scoring / next action | Implemented; deterministic |
| Real PDF/PNG/JPEG/WebP document transport + extraction | Implemented; synthetic PDF Live Golden Path passed |
| Evidence validation / consistency | Implemented; conflicts flagged for human review |
| JSON-grounded AI with verified prototype source IDs | Implemented; conservatively extractive |
| AI handoff / safe metadata | Implemented; optional known-fact selection and template fallback |
| Frontend real document / server Journey adapter | Not integrated in this Developer B phase |
| RAG / Vector DB / MongoDB / Auth / Multi-Agent | Not implemented |

See [Backend AI Phase 2](backend-ai-phase-2.md) for schemas, endpoints, tests, operational setup and limitations. Historic Phase 2A and Backend Demo Phase 1 reports remain records of those earlier phases.

## Phase 3 evaluation boundary

`apps/api/eval/cases.jsonl` contains 120 authored synthetic cases: intent 30, document 20, consistency 30, knowledge 20, security/business-boundary 20. Local evaluation uses Demo/fixtures and tests deterministic behavior; stored adversarial outputs do not prove live prompt-injection resistance. The fixed Live manifest selects 5 intent + 2 PDF + 2 knowledge samples, maximum 12 outbound attempts including retries.

Evaluation-only filesystem caching hashes model, version, prompt, input and schema. Raw responses are schema-validated again on replay; grounding and expected facts are independently checked. Cache hits are not fresh live samples. `--refresh` skips cache without bypassing the budget. Production uploads never use this cache. Local evaluation / test / build / status / plan make no Gemini requests. Unit tests allow only mock transport and loopback fetch.

No new runtime dependency or hosted service was added. No Search/Maps tools, Batch, Vertex, paid Context Caching, paid model fallback, OCR or external storage path exists. All provider account checks remain manual; free-tier quotas and availability can change. Current Phase 3 has no fresh Live results, deliberately preserving the zero-cost boundary. See [Phase 3 operation and evaluation](backend-ai-phase-3.md).
