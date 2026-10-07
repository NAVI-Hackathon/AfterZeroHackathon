# NAVI Developer B — Phase 2: Real AI Intelligence Integration

> Historical Phase 2 record. Current startup defaults, model allowlist, zero-cost guards and evaluation commands are superseded by [Phase 3](backend-ai-phase-3.md). The Live results below are historical; no new Gemini requests were made in Phase 3.

Backend real AI is implemented and independently verified. **The existing workspace still uses Mock documents and browser-owned state**; Developer A's API adapter is not part of this phase. No frontend layout, motion, persistence or mock website was changed.

## Architecture / files

```text
HTTP → input / file validation → Intelligence / JourneyService
                                  ↓
                     AIProvider (explicit demo or live)
                                  ↓
                 Gemini REST + JSON Schema + Zod
                                  ↓
           normalized facts / visible fields / retrieved facts
                                  ↓
          document validation + evidence / incident consistency
                                  ↓
      deterministic workflow → readiness → next best action
                                  ↓
                injected InMemoryJourneyRepository
```

- `src/services/gemini.service.js`: Gemini provider, native REST, header credential, structured response, safe errors and internal metadata.
- `src/ai/schemas.js`, `src/ai/prompts/`: model-only contracts, aliases, confidence adjustment and separate intent/document/knowledge system instructions.
- `src/services/providerRequest.js`: overall deadline, at most one retry, cancellation.
- `src/services/documentValidationService.js`, `evidenceConsistencyService.js`: evidence sufficiency, backend clock arithmetic, consistency flags.
- `src/services/knowledgeAnswerService.js`, `handoffService.js`: verified context-only answers and known-fact summaries.
- `shared/journey.js`: additive optional evidence fields, clock / timestamp compatibility, optional `consistencyIssues`; old public intent enums/envelope unchanged.
- `scripts/test-gemini.js`, `test/sampleDocuments.js`, `test/ai-phase-2.test.js`: real manual checks, valid synthetic PDFs and 31 additional no-Key tests.

No new package dependency, SDK, agent framework or database was introduced.

## Run

From repository root:

```sh
npm install
# First setup only; do not overwrite an existing local file.
cp apps/api/.env.example apps/api/.env
# Edit GEMINI_API_KEY locally; never put it in chat, frontend or Git.
npm run dev:live  # requires confirmed unbilled Free Tier; see Phase 3
# Without any Key, explicit scripted demo:
npm run dev:navi  # now forces Demo
```

API `http://127.0.0.1:3001/api/health`; NAVI `http://127.0.0.1:5173/`; independent Mock Website `http://127.0.0.1:3000/` (`dev:all`). Stop/restart combined dev after backend or `.env` changes; use `dev:api` for file watching.

Configuration is only in `src/config/env.js`:

| Setting | Default |
| --- | --- |
| `AI_MODE` | `live` (must explicitly choose `demo`) |
| `GEMINI_MODEL` | `gemini-3.5-flash-lite` |
| thinking | `MINIMAL` for default; `LOW` for `gemini-3.8-flash`; omitted for other models |
| `AI_TIMEOUT_MS` | 10000, accepted range 1000–12000 |
| `INTENT_CONFIDENCE_THRESHOLD` | 0.65 (legacy frontend intent disposition) |
| `JOURNEY_CONFIDENCE_THRESHOLD` | 0.75 (server Journey / evidence) |
| `HUMAN_REVIEW_THRESHOLD` | 0.55 |
| `AI_DEBUG_METADATA` | false |

The former 3.8 default exceeded the 10–12-second deadline in initial live QA (one diagnostic intent took ~22 seconds). The selected Flash Lite model completed this test corpus in approximately 1–2 seconds per successful request. This is a small measured sample, not a production latency guarantee. `GEMINI_MODEL` remains configurable; changing models requires live re-evaluation.

## Endpoints / compatibility

| Endpoint | Behavior |
| --- | --- |
| `GET /api/health` | Status and Key configured boolean only |
| `POST /api/intelligence/understand` | Existing `{success,data,meta}` envelope, unchanged |
| `POST /api/analyze-intent` | Flat validated public Intent |
| `POST /api/journeys` | `{message,intentResult?}` → server-owned Journey |
| `GET /api/journeys/:id` | Current Journey |
| `POST /api/journeys/:id/documents` | Multipart `file`; optional `documentType` is a Demo fixture selector only |
| `DELETE /api/journeys/:id/documents/:documentId` | Removes evidence and revokes confirmation |
| `POST /api/journeys/:id/review` | `{confirmed:true}`, only when required information is complete |
| `GET /api/journeys/:id/handoff-summary` | Deterministic summary; `?enhance=true` adds selected-fact narrative |
| `GET /api/knowledge?query=...` | Existing deterministic JSON retrieval retained |
| `POST /api/knowledge/answer` | `{question}` → grounded answer / genuine retrieved source objects |

The contract additions were explained before implementation: preserve existing enums/strict envelopes; add optional visible document fields and consistency issues. The shared schema remains the public single source. No Gemini response object reaches React.

## Intent structured output / normalization

The model is instructed to classify needs, extract stated facts and summarize in Taiwanese Traditional Chinese. User text is data, never instructions. No eligibility promises, policy invention, scores, states or actions are permitted.

```json
{
  "intent": "service_request",
  "serviceType": "flight_delay",
  "confidence": 0.94,
  "summary": "使用者回報東京至台灣航班延誤約七小時。",
  "extractedData": {
    "origin": "Tokyo", "destination": "Taiwan",
    "delayMinutes": 420, "incidentDate": null
  },
  "missingInformation": []
}
```

Public enums are deliberately unchanged for Developer A compatibility:

- intent: `service_request`, `knowledge_query`, `unknown`.
- serviceType: `flight_delay`, `vehicle_accident`, `payment_method_change`, `policy_change`, `policy_information`, `unknown`.

Model-only `missingInformation` is validated but not added to the old strict frontend envelope. Explicit aliases (`service_discovery` / `claim` / `service_navigation` → service_request; `information_query` → knowledge_query; `car_accident` → vehicle_accident; `Flight Delay`, `flight-delay`, `flight_delay_claim` → flight_delay) are normalized. Unsupported labels become unknown, not guessed.

Numeric confidence clamps to 0–1; missing confidence becomes zero; wrong types fail. Unknown intent/service confidence is capped at 0.4 and facts cleared. Recognized flight intent subtracts 0.02 per absent nullable incident field (maximum 0.08), then rounds to 3 decimals. This combines recognized service and structured completeness without claiming calibrated probability. Missing travel facts alone do not prevent a clear flight-delay intent from starting at 35%.

The legacy adapter threshold remains 0.65. Server Journey uses the existing thresholds: <0.55 → HUMAN_REVIEW, 0.55–<0.75 → SERVICE_IDENTIFIED / specialist action; ≥0.75 → supported evidence flow. Unknown produces clarification, unsupported recognized services produce preview only.

## Real document pipeline

1. Bounded multipart body (10 MiB file + 64 KiB overhead), one file, MIME and actual header validation. PDF, PNG, JPEG, WebP supported. Filename is sanitized. Bytes never enter Repository or logs.
2. Gemini receives actual inline base64 media, not filename/expected classification. System instructions forbid file instructions or guessed fields.
3. Model-only flat strict JSON: documentType, confidence, nullable visible fields. Unknown never becomes a requested type.
4. Zod validation → type-specific public document → evidence sufficiency / confidence → backend duration → consistency → deterministic Journey.

```json
{
  "documentType": "boarding_pass",
  "confidence": 0.97,
  "fields": {
    "passengerName": "NAVI TEST PASSENGER", "flightNumber": "BR 196",
    "origin": "NRT", "destination": "TPE", "departureDate": "2026-10-07",
    "actualDepartureDate": null, "scheduledDeparture": "14:20", "actualDeparture": null
  }
}
```

```json
{
  "documentType": "delay_certificate",
  "confidence": 0.96,
  "fields": {
    "passengerName": null, "flightNumber": "BR 196", "origin": "NRT", "destination": "TPE",
    "departureDate": "2026-10-07", "actualDepartureDate": "2026-10-07",
    "scheduledDeparture": "14:20", "actualDeparture": "21:43"
  }
}
```

All model clock fields are **HH:mm**, with dates in separate nullable fields. Live testing caught a model trying to construct an incorrect datetime from `14:20`; constraining the schema to clock values removes that ambiguity. The public schema retains offset ISO timestamps for old Demo providers and existing tests. The model schema cannot supply `delayMinutes`, status, score or stage.

Boarding evidence needs flightNumber **or** origin+destination, plus confidence ≥0.75. The independent travel-information requirement still needs passenger, flight, route and date. Partial verified evidence earns its 20 points but not the missing 15 travel points; Review stays blocked and Next Action asks to re-upload a complete boarding pass. A delay certificate needs both valid times and confidence ≥0.75. Insufficient/low-confidence extraction becomes needs_review, not fake successful evidence.

Backend computes **14:20 → 21:43 = 443 minutes**. Explicit separate dates support overnight differences. Clock values suggesting overnight without an actual date return null; mixed clock/ISO values return null. Full legacy ISO offsets are compared as instants. Negative, invalid or >525600-minute differences are invalid. No guessed midnight rollover or timezone.

## Consistency / workflow

Compare visible flightNumber, departureDate, origin, destination and passengerName across both files; compare explicit reported route/date against documents. Ignore approximate user delay versus precise certificate delay. Flight formatting (`BR 196` / `BR196`) and a small explicit Tokyo/Taipei/country/airport alias set are tolerated; two different airports remain different.

High-severity flags include FLIGHT_NUMBER_MISMATCH, DEPARTURE_DATE_MISMATCH, ORIGIN_MISMATCH, DESTINATION_MISMATCH, PASSENGER_NAME_MISMATCH, each with safe message and document IDs. Cross-document conflicts mark the delay certificate needs_review while retaining previously usable boarding evidence; conflict with incident facts flags that file. Journey becomes HUMAN_REVIEW, Next Action CONTACT_SPECIALIST, never an outright rejection. Replacement/removal recalculates flags and can recover the flow.

No scoring weights changed. Only backend checks control requirements, workflow, readiness and action. Review confirmation adds the last 10 points only after all travel/evidence requirements are complete. READY_TO_PROCEED means navigation readiness, not submitted or approved insurance.

## Grounded knowledge / explainability

JSON retrieval chooses a curated flight-delay topic and actual source records. Unrelated services or unknown questions have no context and return **「目前提供的資料不足以確認。」**, sources=[], with no AI call.

Gemini receives only the selected context. This version deliberately uses **extractive answers**: complete retrieved FAQ answer / source-content passages may be selected and concatenated, without free factual paraphrase. Backend checks every passage and every source ID against context. Unsupported rules, arbitrary prose and fabricated citations fail validation; the returned source objects come from Backend records, not model titles.

Response includes answer, confidence, sources, supported, isMock=true and answerMode:
`grounded_extract`, `demo`, `retrieval_template`, or `insufficient_information`. Prototype knowledge always stays `prototype_guide` / `prototype_faq`; it is not official BNP evidence.

If non-critical wording fails, return the **actual retrieved template**, confidence 0, `answerMode=retrieval_template`, and mark internal fallback metadata. This is not live-to-demo substitution. The old GET knowledge route remains unchanged for compatibility.

## Handoff / internal metadata

Default deterministic summary remains. Optional enhanced summary asks Gemini to select/reorder IDs of known facts only; Backend renders the text. Arbitrary new facts or missing critical incident/reason/conflict facts fail validation. Errors fall back to the deterministic narrative. No workflow mutation or specialist contact occurs.

Provider keeps one latest metadata record per operation in memory: provider, model, operation, latencyMs, schemaValid, fallbackUsed, optional safe errorCode. `getDebugMetadata()` is Backend/manual-tool only; HTTP Journey/Intent/UI never includes it. Optional AI_DEBUG_METADATA logs only this safe record, never file contents, user messages, passenger names, API Key or raw provider errors.

## Errors / retry / timeout

Stable envelope: `{success:false,error:{code,message,retryable}}`, no stack trace or Google response. AI_PROVIDER_ERROR retries only 429 / 5xx / network errors. Invalid JSON/schema retries once. Safety rejection, missing configuration, unknown document and permanent provider errors do not retry. Both attempts share the same overall timeout (no 2×2 nested retries). Deadline → AI_TIMEOUT 504 retryable; user disconnect cancels.

Live critical extraction never uses Demo facts. Failed upload preserves Journey state. Known-but-uncertain files can remain needs_review for specialist handoff. Unsupported/corrupt files fail MIME/header checks before provider invocation. Header checking does not fully parse every PDF/image; undecodable content is handled through the sanitized AI error contract.

## Verification

```sh
npm test                  # 10 frontend + 52 backend tests, no Key needed
npm run build:navi
npm run eval:ai:live -- --plan # current guarded live plan; no requests
npm run eval:ai:live           # manual, Free Tier confirmation + budget + synthetic cache
# Optional real local files; only use files you are authorized to send to Gemini:
# Private-file evaluation flags retired; current CLI accepts curated synthetic samples only.
```

As of Phase 2 QA:

- Existing 31 tests retained; 31 new AI tests → **62/62 passing** (Frontend 10, Backend 52).
- Tests cover structured intent aliases/types, unknown/confidence, genuine multimodal bytes, missing evidence, clock arithmetic, flight/date/route/name conflicts, safe source IDs, unsupported knowledge, hallucinated rules, timeout/error/retry/safety, model state/score/action rejection, handoff fallback, metadata privacy and explicit Demo.
- Real Gemini 5/5 intent classifications passed: Chinese/English flight, payment, accident, unknown; secondary intents correctly remain preview.
- Real Gemini API Golden Path passed: create 35 → actual synthetic boarding PDF 70 → actual synthetic delay PDF 90 → confirmed Review 100; backend delay=443, no consistency flags, no fixture selection hint.
- Real grounded answer passed with actual IDs `claim-guide`, `flight-faq`; unrelated credit-card-fee question returned unsupported, without fabricated sources.
- The manual tool sends clearly labeled synthetic test PDFs, no private passenger data. PDF happy-path verification does not claim noisy camera-image accuracy.
- API Key remains backend-only; ignored local `.env` is not staged/tracked. Public build is checked for the exact Key bytes without printing the secret.

## Known limits / technical debt / next phase

- Frontend server Journey / real upload / grounded-answer adapter is still pending with Developer A; do not describe UI Mock extraction as real AI.
- JSON topic retrieval and extractive answers are intentionally narrow. Add a labeled grounding evaluation before accepting free paraphrase or adding official content; no Vector DB is currently needed.
- Schema checks and model confidence cannot prove OCR truth. Gather camera/PDF samples, ambiguous dates, passenger spelling variations and multilingual airport names; keep user/specialist confirmation.
- Airport alias mapping is small; unfamiliar names can generate conservative false-positive handoff flags. Extend from tested examples, not guessed mappings.
- Separate departure dates handle explicit overnight evidence; ambiguous clock/date/timezone cases stay for review.
- Existing optional client-supplied intentResult is schema-checked but not signed/provenance-verified. Keep it a prototype contract; protect it before any production financial decisions.
- InMemory Repository / metadata / rate limit reset on restart and are process-local; no durable audit trail or authorization. File bytes are request-only, but extracted fields remain transient PII until TTL expiry.
- Provider latency/availability varies. Explicit Demo is for demonstrations; Live failures remain visible. No automatic insurer application or financial eligibility logic exists.

Suggested Phase 3, only after confirmation: coordinate Developer A's Mock/Live adapter and real document states, build a small real-file evaluation corpus, then decide whether official knowledge ingestion or durable storage is justified. No Phase 3 implementation was started.

Official integration references: [Gemini models](https://ai.google.dev/gemini-api/docs/models), [Structured output](https://ai.google.dev/gemini-api/docs/structured-output), [generateContent REST](https://ai.google.dev/api/generate-content), [Document understanding](https://ai.google.dev/gemini-api/docs/document-processing).

## Changed-file manifest

The Phase 2 commit contains these 30 files; local `.env` and pre-existing edits to the historic Phase 2A report are excluded.

```text
README.md
apps/api/.env.example
apps/api/package.json
apps/api/scripts/test-gemini.js
apps/api/src/ai/demoProvider.js
apps/api/src/ai/prompts/documentPrompt.js
apps/api/src/ai/prompts/intentPrompt.js
apps/api/src/ai/prompts/knowledgePrompt.js
apps/api/src/ai/provider.js
apps/api/src/ai/schemas.js
apps/api/src/config/env.js
apps/api/src/routes/journeys.js
apps/api/src/services/documentService.js
apps/api/src/services/documentValidationService.js
apps/api/src/services/evidenceConsistencyService.js
apps/api/src/services/gemini.service.js
apps/api/src/services/handoffService.js
apps/api/src/services/intent.prompt.js
apps/api/src/services/intent.service.js
apps/api/src/services/journeyService.js
apps/api/src/services/knowledgeAnswerService.js
apps/api/src/services/knowledgeService.js
apps/api/src/services/providerRequest.js
apps/api/src/workflow/journeyStateMachine.js
apps/api/test/ai-phase-2.test.js
apps/api/test/sampleDocuments.js
docs/architecture.md
docs/backend-ai-phase-2.md
package.json
shared/journey.js
```
