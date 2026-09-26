# Monitoring Station preview

Only `/monitor` is implemented here. One camera record identifies Pool Deck 1,
Deep End. There is no live camera, CV pipeline, notification service, analysis
route or incident-history route in this implementation.

`preview.ts` is the temporary data boundary: three authored snapshots (normal,
possible distress, critical), a camera identity, a swimmer description, normalized
tracking bounds, sample media timestamps and observable signals. There is no
frontend distress inference. The preview selector switches snapshots explicitly.
The illustrated feed stays static so the displayed sample frame and event remain
aligned; nothing is labeled live.

`MonitorFeed` reserves one aspect-ratio-preserving media surface. The illustration
is shared with the demo without changing its rendering. The optional video branch
provides native controls and an unavailable state, but actual footage and its
matching tracking data are not present and have not been tested.

Acknowledgement and notification-preview flags belong to the selected sample
state and reset when another sample state is chosen. Acknowledging never clears
the visual severity. No action sends messages or persists an operational record.
Review Analysis opens an availability note; it does not navigate to or implement
the future analysis route.

For real integration, replace sample snapshots with backend events keyed by
camera ID and alert ID; handle connection freshness/health separately from normal
monitoring. Hide stale tracking and normal-status claims on disconnect. Preserve
source aspect ratio and align tracks to media time. Replace local button feedback
with acknowledgement/notification requests and confirmed success/failure states.
Additional cameras can use the existing camera shape and a compact selector;
the current preview intentionally exposes only one source.

Run `npm run build` and `npm test` in `frontend`. Monitor checks cover state
transitions, persistent urgency after acknowledgment, honest notification feedback,
analysis availability, source count, responsive layout and keyboard access.
