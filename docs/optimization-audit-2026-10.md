# LiftWise performance and reliability audit — 25 October 2026

## Result and scope

Reviewed LiftWise's Expo client, NestJS LiftWise module, shared authentication/middleware, Firestore initialization/index configuration, Cloudinary delivery, Gemini guidance, and checked-in deployment configuration. Implemented the high-confidence gaps described below without a web build, paid infrastructure, deployment, or production data access. Existing caching and optimistic updates were retained.

This is a source-level audit with automated tests, not a production load certification. Firebase billing, deployed rules, live instance counts, database/storage locations, device frame rates, and real network latency were unavailable. Emulator integration was prepared and attempted, but Firebase CLI 15.34.1 requires Java 21; this machine has Java 17. That run did not execute the emulator test. Do not interpret skipped integration tests as passed.

Actual stack: Expo 57/React Native 0.86, TanStack Query, AsyncStorage and SecureStore; NestJS 11, singleton Firebase Admin, custom CheFu OAuth/SSO backed by Firebase, Firestore, Cloudinary and Google Gemini. Mobile workout operations use NestJS exclusively, with no direct mobile Firestore SDK/listeners. Firebase client offline persistence therefore does not provide workout synchronization; the local journal serves that purpose.

## Inventory and implemented changes

| Feature / priority | Existing implementation | Gap / previous behavior | Change and location | Expected impact | Verification / status |
|---|---|---|---|---|---|
| Server state / P1 | Shared TanStack Query client, 1-minute mutable freshness, 24-hour catalogue/detail freshness, bounded user-scoped disk persistence, request deduplication | Correctly implemented already | Retained `query-client.ts`, `query-persistence.ts`, `use-query-persistence.ts` | Reuses confirmed data across navigation/restarts | Existing cache/account/race tests; already optimized |
| Optimistic changes / P0 | Bookmark, preference, cover/order/delete updates with scoped rollback; guarded buttons | New paginated workout caches needed equivalent updates | Added `optimistic-workout-pages.ts`; extended `optimistic-workouts.ts` and `workout-cache.ts` | Immediate changes across detail/Home/pages, no success refetch | Concurrent rollback and pagination tests; implemented |
| Active workouts / P0 | Timer and individual sets were local memory; no intermediate server writes | Termination could lose reps, weights, completed sets and start time | Account-scoped durable `workout-journal.ts`; active route checkpoints set/pause changes, debounced inputs, background and 30-second timer checkpoints; restores an independent workout snapshot, values and timer | Recovery without per-set or per-second Firestore writes | Journal recovery, storage failure, account isolation tests; implemented, device termination test pending |
| Completion retries / P0 | Immediate POST, random server ID, no offline completion | Lost HTTP responses could produce duplicate sessions; offline completion failed | One durable outbox in the journal; stable request ID, serialized storage, account checks before send, bounded exponential backoff with jitter, foreground/reconnect resume, 10-failure automatic retry ceiling, explicit History retry | One accepted session even after a lost response; no competing TanStack write queue | Client durability/concurrency tests, backend replay/conflict tests; implemented; real emulator concurrency pending |
| Unsynced feedback / P0 | No durable pending state | UI could imply server completion when only local data existed | `workout-completion-sync.tsx`, `pending-workouts.tsx`, History banner/toasts | Users can distinguish local saves from confirmed server history | Typecheck/journal tests; implemented, native UI verification pending |
| Home workouts / P1 | Home selected four from the entire downloaded collection | Every cold dashboard loaded all templates | Home requests limit 4 under `workouts/recent`; backend defaults legacy requests to 20, max 100 | Bounds Home query to four matching records rather than N | Bounded-query tests; implemented |
| Workout library / P1 | Complete metadata array and local substring search | Unbounded initial query/payload | Cursor endpoint `GET /liftwise/workouts/page`, 20-row infinite list; stable createdAt + document ID ordering | Initial list transfers at most 21 rows including cursor lookahead | 47-record pagination/timestamp-tie test; implemented |
| Workout search / P1 | Local name/muscle substring matching | Pagination must not silently restrict search to first page | Explicit search progressively downloads remaining pages with a 300ms delay; ordinary browsing stays bounded | No per-keystroke backend search; full substring semantics retained | Typecheck and page tests; implemented; large-list search can still download all metadata intentionally |
| Summary payloads / P1 | Projection still included full nested exercise snapshots | Large exercise descriptions/instructions downloaded for counts | Store exerciseCount/totalSets when creating/copying; select counts only. Older records fall back through one bounded getAll RPC | Smaller list responses and Firestore transfer; same document-read billing for normal summaries | Backend tests; implemented. Legacy fallback adds reads until records are recreated/migrated |
| History / P1 | 20-row cursor pages, count/sum first-page aggregation, immutable detail cache | Already addressed previously | Retained; completion invalidates only lists/calendar/streak | No repeated full-history transfers for navigation | Existing history/aggregate tests; already optimized |
| Dashboard / P1 | Home/History share a 22-day calendar; Home computes selected-day stats locally | Already addressed previously | Retained date/timezone behavior | Changing a Home day makes no request | Local-day boundary tests; already optimized |
| Streak schema / P2 | Year documents accumulated every unique session timestamp | Array size grew with session count; initial backfill read whole history | Version 2 monthly summaries with distinct UTC-minute timestamps; max 44,640 entries/month. Bounded 200-session resumable backfill; source sessions and old summaries remain intact | Bounded summary document size; repeated sessions in one minute do not enlarge it. More summary documents than yearly model | Multi-page backfill, date boundary tests in fractional-offset zones, session atomicity tests; implemented; index deployment required |
| Catalogue / P1 | 15-minute coalesced server catalogue and 24-hour persisted client cache; local search | Revalidation downloaded unchanged JSON | SHA-256 ETag based on response content; cached catalogue supplies If-None-Match and reuses data on 304. Added CORS request header | Smaller unchanged revalidation responses; authentication/server requests remain | Backend content-version tests and client 304 reuse test; implemented |
| Images / P1 | Expo Image memory/disk caching; unsigned Cloudinary f_auto/q_auto, width 960; upload size/signature checks | Tiny rows could request 960px images | `cached-image.tsx` selects pixel-density widths from numeric styles, rounded to stable 160px buckets; fallback 960; signed/other-provider URLs untouched | Smaller thumbnail transfers/decodes where width is known | URL tests/typecheck; implemented; actual image-byte/device measurement pending |
| AI / P1 | Gemini general exercise guidance, process-level promise cache, static source fallback, authenticated routes | No explicit output cap, timeout, user budget, concurrency cap or source/model cache version | Version/content/model keyed bounded 24-hour cache; max 768 output tokens, 15-second timeout, four concurrent generations, 20 fresh generations/user/day and 500 total/day through existing RuntimeLimitService; source fallback retained | Bounds model work and failure waits. Counters apply to cache misses, not every cached read | Build and fallback/limiter tests; implemented; live tokens/quality/cost not measured |
| AI offline display / P1 | Cached/source instructions existed but pending skeleton could hide them | Offline request could remain pending while usable guidance was available | Show existing guidance immediately in `ai-coach-modal.tsx` | Offline guidance remains usable | Typecheck; implemented |
| API transport / P1 | Bearer tokens reused, refresh coalesced | No overall fetch deadline; queued writes needed account ownership verification | 30-second network fetch timeout, external cancellation forwarding, expected UID/token check before completion request; private/no-store LiftWise responses | Bounded network waits, prevents sending another account's queued payload | Transport account-isolation test; implemented. Response-body parsing is not separately timed |
| Authentication / P0 | Local JWT validation plus shared revocation check per request, DPoP when applicable; app=liftwise guard | Revocation reads cost money but are deliberate security behavior | Retained, no unsafe auth cache added | Immediate revocation behavior preserved | Guard/SSO/security tests; already optimized where safe |
| Listeners / P0 | No mobile Firestore onSnapshot or query polling; network/AppState subscriptions clean up | No duplicate Firestore subscriptions found | Retained; new outbox subscriptions clean up and only sync foreground | No added listener billing or background polling | Source review/tests; reviewed |
| Backend cache / P1 | Per-user bounded 512-entry read cache, coalescing, failure eviction, 30-second mutable TTL | No simple local hit diagnostics | Added aggregate hit/miss/coalesced/failure/eviction counters, no identifiers/payload logs | Lightweight internal diagnostics; no new monitoring writes | Existing cache tests/build; implemented |
| Indexes / P2 | Date/aggregation index and yearly-array exemption already present | Nested unqueried snapshots and new monthly arrays indexed unnecessarily | Added exemptions for sessions.sets/exercises, workouts.exercises, liftwiseActivityMonths.startedAt; retained all existing composites | Lower index fanout/storage; document writes remain billable individually | Query source review/JSON validation; implemented in configuration, not deployed |
| Infrastructure / P3 | Fly config: iad, shared 1 CPU/1GB, auto-start/stop, minimum zero; gzip compression middleware; Cloudinary CDN | Live topology and database location unavailable | No capacity/provider/region changes made | Avoids speculative infrastructure costs; cold-start/region latency still needs measurement | Checked-in configuration reviewed; live configuration required |
| Shortcuts / P0 | New expo-quick-actions registration in root layout | Missing /progress route, inline callback could replay initial launch, navigation before auth/router ready, duplicate plugin | `app-shortcuts.tsx` queues valid IDs until authenticated/onboarded/router ready; stable callback; three existing targets; old progress IDs open Home; plugin registered once | Correct cold/warm launch handling; optional native errors do not block startup | Typecheck, route/config test; implemented; rebuilt native launch testing pending |

## Database and synchronization contract

- Completion `requestId` is optional for old clients, required by the new outbox. It becomes a session document ID beneath the verified owner, not an ownership parameter. A replay with identical canonical data returns the original ID without writes; a changed payload returns 409. The create precondition and activity summary update are one atomic batch. A simultaneous create failure (ALREADY_EXISTS) checks the stored payload. Legacy clients without request IDs cannot benefit from retry deduplication.
- Local completion is acknowledged only after durable storage. The server then becomes authoritative after synchronization. A successful server response followed by failed local acknowledgement is safe to retry with the same ID.
- Outbox records are isolated by SSO UID and retained through sign-out; another account cannot submit or see them. Confirmed query caches are cleared separately. No access/refresh tokens enter AsyncStorage. Unsynced fitness data is device-local AsyncStorage, **not encrypted storage**; include device backup/encryption/privacy requirements in release review.
- Timer display updates once per second while foregrounded; elapsed/rest calculations use timestamps so backgrounding does not require ticking. At most 100 pending completions and 2 million serialized journal characters. Storage failure keeps the previous saved state and does not report success. Pending records are never silently expired/deleted. After ten failures, manual retry is required, rather than endless requests. Uninstalling/clearing app storage still removes unsynced records.
- Pending completions are intentionally absent from confirmed server totals until accepted. History shows their separate status. Deleting a template before its pending session first syncs can produce a retained 404; validation/409 failures also remain saved for support/recovery. Sessions beyond the existing 24-hour interval limit require attention; they are not discarded. This is not a full arbitrary-edit offline engine.
- Monthly timestamps are rounded down to UTC minute only in derived streak summaries; original session timestamps remain exact. Current IANA timezone offsets are minute-aligned; tested half/quarter-hour zones preserve local dates. Historical second-offset timezone interpretations are not a guaranteed compatibility target.
- New summaries have a hard cardinality of 31*24*60 = 44,640 short timestamps (17 characters each), independently of how many sessions occur. Exempt this array from indexing **before release**, to avoid approaching index-entry limits. Its raw strings are about 759KB at maximum cardinality; actual encoded overhead must also be considered. If sustained per-user workloads approach this artificial worst case, adopt a bitset representation rather than increasing array cardinality.
- Backfill resumes from `metadata/activity.streakV2Cursor`, unions pages atomically with its checkpoint and sets streakVersion=2 after the final page. Failures retain original data; repeating pages is safe. Deploy a consistent backend version before generating v2 data. Multiple process caches may serve old mutable data for up to 30 seconds; no distributed cache was added.

## Measurements and savings assumptions

These are assertions against the isolated Firestore adapter and real TanStack Query cache, **not measured Firestore billing or production latency**. Authentication, rate-limit storage, index entries, empty-query minimums, aggregation billing and retries may add charges beyond these counts.

| Scenario / test fixture | Previous source behavior or baseline | Verified new behavior |
|---|---|---|
| Cold Home with N templates | N list records, then select four | Request limit 4; summary-only projection for new records |
| First workout page, 47 templates | All 47 metadata records | 21 records (20 returned + lookahead); three pages yield exactly 47 unique IDs |
| First history page, 47 sessions | Existing optimization already bounded | 21 adapter records + one aggregate operation; repeated same page uses cache; subsequent pages do not repeat aggregate |
| Two identical completion submissions | Two random session IDs, two session + two summary writes | Two total document writes; replay adds zero writes, but adds one identity-scoped existence read |
| 405 legacy sessions in three UTC minutes | One entry per unique exact timestamp | Three derived entries, bounded 200-row reads; all 405 source sessions retained |
| Unchanged catalogue revalidation | Full JSON payload | HTTP 304; existing cached array reused; no additional version endpoint |
| Exercise keystrokes | Already local | Zero search API requests; preserved |
| Query cache revisit while fresh | Already deduplicated | One fetch shared across repeated fetchQuery calls |

Example **conditional estimate**, not a billing forecast: with 100 templates, a cold uncached Home list falls from 100 matching documents to four (96% fewer list documents). This does not mean 96% lower total app bill; shared revocation checks, other Home endpoints, cache hit rates and repeated navigation change the denominator. No currency savings are asserted without regional prices and measured production usage.

Image widths and JSON ETags should reduce bytes, but no invented byte/latency percentage is reported. AI costs require actual usageMetadata and model/region pricing; configured token limits are ceilings, not measured usage.

## Verification and reproducibility

Commands run: app `npx tsc --noEmit`, `node --test tests/*.test.cjs`; backend `npm run build`, `npm run test:liftwise`, `npm run test:security`. See final verification below for totals. No web export/build or native build was run.

Prepared real Firestore integration: `liftwise-emulator.spec.ts` uses a random test owner in demo-liftwise, rejects non-loopback emulator hosts, sends eight concurrent identical completions and checks atomic idempotency. No production credentials/project are used. Run with Java 21+:

```powershell
npx --yes firebase-tools@latest emulators:exec --only firestore --project demo-liftwise --config scripts/liftwise-emulator.json "npm run test:liftwise:emulator"
```

The supplied rules file is **emulator-only deny-all**; never deploy it over the shared project's rules. Admin SDK integration tests bypass rules and do not establish production client-rule safety. No deployed Firestore rules were available in these repositories.

Prepared opt-in Query Explain:

```powershell
npx tsx --env-file=.env scripts/liftwise-query-explain.ts --allow-live-plan --uid=<test-account-uid>
```

It prints plans/metrics for Home, workout-page and history-page queries, not document contents. Add `--analyze` only when accepting real query execution charges. It was not run against a live project. Compare indexes used, scanned entries/documents, returned count and duration; distinguish plan-only estimates from executed metrics.

For production-like benchmarks, use the same seeded test account/device/network and release build before/after: capture request count, compressed response bytes, p50/p95 duration, Firestore usage, and cache hits for Home, tabs x10, exercise search/details, create/complete/history, airplane mode/reconnect/restart/account switch. Record cold and warm cache separately. Use React Native/Android profiling for JS/UI frames and memory; do not infer release performance from development timings.

## Deployment, configuration and rollback

1. Rotate the Sentry auth token exposed in the conversation and update CI's SENTRY_AUTH_TOKEN secret. It is private build tooling material, never EXPO_PUBLIC. `.env.local` is ignored and untracked; environment values were not read for this audit.
2. Review/deploy the checked-in index configuration to the intended shared Firestore project, then wait until ready. Keep existing composites. Only deploy indexes, not emulator rules. Monthly array exemption is a prerequisite for the new schema.
3. Deploy backend before the new app: stable completion IDs must be honored before enabling durable retries. Releasing the client against the old backend would allow duplicate completion writes. No deployment was performed here.
4. Run emulator concurrency, native cold/warm shortcut launch, offline completion/reconnect, process termination/recovery and multi-account tests before release. Quick actions require a newly built native binary; an OTA JS update alone cannot add the native module/plugin. They are not an Expo Go capability.
5. For a strict cross-instance AI budget, configure the existing `RUNTIME_LIMIT_STORE=firestore`, with TTL cleanup for `runtime_liftwise_ai_limits.expiresAt` and other runtime limit collections. Default local limits are per process and reset with it; Firestore mode adds limiter transactions. Choose deliberately; it also affects existing platform-wide rate/replay limits. TTL cleanup creates billable deletes.
6. Fly's checked-in region is Virginia; actual Firestore and Cloudinary origins are unknown. Measure RTT/cold starts and user distribution before changing region/minimum instances. No provider/size change is justified by the repository alone.
7. Current Sentry configuration enables default PII, logs and relatively broad session replay sampling. Review masking/health-data collection, consent, retention and sampling before commercial release. This audit did not silently rewrite the user's newly configured telemetry. Disable verbose health payload logging; do not log tokens or workout contents.
8. Configure Google Cloud/Firebase budgets and anomaly alerts for reads/writes/egress/AI; budgets are notifications, not guaranteed hard spending caps. Build dashboards for actual Firestore usage/billing, API p50/p95 and error rate, Fly CPU/memory/restarts, Cloudinary delivered bytes, model input/output tokens. Use aggregate cache diagnostics, not per-request document logging. Existing request logs are suppressed at log level in the checked-in production bootstrap; confirm deployed exporters before assuming telemetry is collected.
9. Roll back client presentation/cache changes independently if needed. Keep the backend completion-idempotency contract while any released client can retry queued sessions. Do not clear journals to roll back. Existing session data and v1 summaries were not deleted; an old v1-only backend will have stale streaks for new v2 sessions until summaries are rebuilt. Prefer rolling forward or temporarily deriving streaks from immutable sessions; do not blindly revert the summary reader. Index exemptions can be restored without deleting application data.

No new runtime dependency or paid service was introduced for optimization. expo-quick-actions and Sentry were user additions; preserved and reviewed. Firebase CLI was invoked through npx for the emulator attempt, not added to package.json. Backend adds only an emulator-test script.

## Changed file inventory

App: `src/app/_layout.tsx`, `app.json`, active-workout route, exercise-picker route, Workouts and History tabs; `components/app-shortcuts.tsx`, `pending-workouts.tsx`, `workout-completion-sync.tsx`, `home/my-workouts.tsx`, `exercise/ai-coach-modal.tsx`, `ui/cached-image.tsx`; `lib/app-shortcuts.ts`, `workout-journal.ts`, `api.ts`, `auth-client.ts`, `image-url.ts`, `optimistic-workout-pages.ts`, `optimistic-workouts.ts`, `workout-cache.ts`; `hooks/use-workout-timer.ts`; journal/API/optimistic tests and this documentation. User commits during the session may already contain some changes; this inventory describes the work rather than current unstaged status.

Backend: LiftWise service/controller/catalog/read-cache/types/spec; `common/http-security.ts`; `firestore.indexes.json`; emulator spec/config/rules and Query Explain script; package test script and endpoint docs.

## Remaining risks and deferred work

- Production load/billing measurements, native/device validation, emulator execution and deployed rule/IAM review remain required. This is not proof of support for millions of concurrent users.
- Process-local user cache invalidation is eventually consistent between instances. A distributed cache would add complexity/expense; adopt only after topology and consistency measurements justify it.
- Guidance cache is process-local, so cold instances can regenerate the same answer. Limits and concurrency caps bound exposure; persistent approved guidance or a reviewed static catalogue is a future optimization if actual AI bills warrant its extra reads/writes and review workflow. Rate-limited/outage fallback can remain cached for 24 hours.
- Workout substring search deliberately traverses pages when searching; very large personal libraries may justify indexed token search later. The exercise catalogue remains an admin-controlled full download, appropriate for the current seeded size; substantially larger datasets need a new catalogue format.
- Stable completion IDs cover session creation, not arbitrary retries of template creation/duplicate or Cloudinary uploads. Existing UI guards stop repeated taps; lost-response template retries still need a future persisted creation request ID. Never enable automatic retries for these non-idempotent mutations.
- Pending conflict/validation/deleted-template failures are retained for manual recovery rather than silently discarded or rewritten. History retry alone cannot repair an invalid payload or restore a deleted template. A support/export/edit workflow is still needed for those exceptional cases.
- Existing calendar date-range queries bound time, not result count. Normal fitness usage is small; unusually large per-user event counts should be tested before adding capped responses that would break statistics. Auth revocation reads remain intentional.

## Checklist

- [x] Firestore reads optimized in reviewed LiftWise queries
- [x] Firestore writes optimized for no-ops and completion retries
- [x] Redundant API requests removed/reused where verified
- [x] Query pagination optimized (history and workout lists)
- [x] Realtime subscriptions reviewed
- [x] Client caching reviewed
- [x] Offline capabilities reviewed and durable completion implemented
- [x] Exercise catalog optimized with content revalidation
- [x] Image delivery optimized in code
- [x] Dashboard aggregation optimized/reused
- [x] Workout persistence optimized and tested locally
- [x] AI Coach costs bounded in code; live cost measurement remains
- [x] NestJS backend optimized in LiftWise/shared request paths
- [x] Cloud infrastructure reviewed from repository configuration
- [ ] Security and abuse protections fully verified in deployed infrastructure (rules/IAM and telemetry review pending)
- [ ] Benchmarks and tests completed across production-like devices/emulator/cloud (local automated checks completed; remaining checks above)


## Final local verification

25 October 2026: app TypeScript check passed; 74 app tests passed. Backend build passed; 33 LiftWise tests and 15 security tests passed. Both working copies passed `git diff --check`. The emulator integration was attempted but did not execute because Java 21+ is required and Java 17 is installed. Live Query Explain, device/end-to-end tests and production billing benchmarks were not run. No deployment or web compilation occurred.
