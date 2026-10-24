# LiftWise data and loading behavior

## Client

- Mutable queries are fresh for one minute. The exercise catalogue, exercise details and AI instructions are fresh for 24 hours; streak data for five minutes. Pull-to-refresh and explicit retries bypass freshness. Returning to the app refreshes active stale queries, except while writes are pending. Network state pauses reads while offline and resumes them on reconnection. Writes fail through their normal error/rollback path instead of being queued for another account/session.
- Exercise search filters the downloaded catalogue locally. Typing makes no API requests. Exercise details reuse catalogue records and timestamps instead of loading them again.
- Home and Workouts share one complete workout metadata list. Home selects four cards from it; opening Workouts reuses the list. Creating a routine inserts the returned record. Successful cover/order/bookmark changes keep their confirmed cache values without a redundant refetch. Failed mutations roll back and reconcile.
- Home and History reuse one 22-day calendar request. It includes started/completed timestamps and durations, so changing the selected Home day calculates stats locally. The preceding night is included for sessions that cross midnight.
- History loads 20 rows per page, uses a stable timestamp/ID cursor, and filters selected days on the server. Its totals cover the entire selected interval, not only downloaded pages. Page-load errors have a retry button.
- Successful query data is restored before mounting the signed-in screens. Storage is scoped to the verified session UID, expires after 24 hours, and is bounded to 50 queries / 2 million JSON characters. Tokens, support payloads and mutation payloads are excluded. Persistence waits for optimistic writes to settle. Signing out removes that account's stored query cache and prevents queued writes from recreating it.
- A saved local session no longer waits for the profile network request before rendering. Profile refresh runs in the background; concurrent refreshes share the request. Account edits still refresh when returning from the account browser.
- Remote images use the installed Expo Image module with memory/disk caching, downscaling and short transitions. Unsigned public Cloudinary images request automatic quality/format and a maximum delivery width of 960 px. Third-party, signed, and local URLs are preserved. Existing uploads already use the picker quality setting and the backend's size/type checks.

## Backend

- List/calendar/bookmark/history reads are coalesced and cached per user/resource in a bounded 512-entry process cache for 30 seconds; streak reads for 60 seconds. Mutations invalidate their affected resource. Other backend instances can serve their existing snapshot until its short TTL expires. Identity checks and shared account profile reads are never cached here.
- Catalogue refresh is coalesced and cached for 15 minutes instead of 30 seconds.
- History pages fetch at most `limit + 1` documents. The first page also uses Firestore count/sum aggregation; subsequent pages reuse the displayed totals. This reduces downloaded documents and payloads; aggregation still has its own Firestore index-read cost.
- Calendar queries project timestamps and duration instead of full exercise/set snapshots. Projection reduces payload size, not the number of billed document reads.
- Preference PATCH reads only the app profile, accepts an allowlist of fields, and skips unchanged writes. Initial onboarding retains the shared-gender transaction. Unchanged exercise orders also skip writes. Cover updates use an existence-enforcing update after upload rather than a second transaction read.
- Streak dates are stored in `liftwise_users/{uid}/liftwiseActivityYears/{UTC-year}`. Saving a session and adding its timestamp to the year document commit in one batch. This deliberately adds one summary write per completion to replace repeated full-history reads. A missing version marker triggers a one-time backfill; array unions preserve concurrent session additions. Original timestamps retain local-time-zone streak behavior. Completed sessions remain immutable snapshots.

## Release and verification

Deploy the updated `chefu-inc-backend/firestore.indexes.json` and wait for the history aggregate index to finish building, then deploy the backend before releasing the updated app. The same file excludes the summary timestamp arrays from indexing. No live data was changed while developing or testing this work. Backfill happens only when the deployed streak endpoint is requested.

Run `npm run typecheck` and `node --test tests/*.test.cjs` in LiftWise. Run `npm run build` and `npm run test:liftwise` in the backend. Tests cover cache reuse/isolation, queued sign-out writes, optimistic persistence exclusion, targeted updates, local-day calculations, cursor ties, preference no-ops and streak backfill.

On a device, verify cold/warm launch, offline cached browsing, account switching, history scrolling/date filters, failed writes, and returning after an account edit. Live Firestore billing and device performance have not been benchmarked; the savings above follow from the changed request/query paths and isolated tests.
