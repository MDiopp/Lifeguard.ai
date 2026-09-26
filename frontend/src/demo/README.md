# Two-round Human vs AI frontend

`/demo` is a standalone, touch-first preview. There are exactly two rounds.
The homepage is unchanged; no other product routes or backend services are added.

## Temporary data boundary

`preview.ts` contains all authored swimmers, positions, sample motion, tap
resolution and sample AI results. None of these are CV detections. Both rounds
use a labeled SVG illustration because real pool clips are not available yet.
Sample outcomes are for reviewing the interface, not AI performance evidence.

`DemoPage.tsx` owns intro, countdown, active, submitted, ending, results and
completion states. It records normalized tap coordinates and media time. Empty
taps can be retried; the first swimmer selection locks the round. No selection
ends at the round duration. Pausing or hiding the tab freezes active play;
returning to a hidden tab requires an explicit resume. Refresh starts over.

`PoolStage.tsx` renders a clean stage during the round. No AI overlays, selection
labels or results are mounted until the reveal. Touch/click selects directly;
keyboard users move a spatial cursor with arrows and select with Enter/Space.
Reduced motion disables decorative/countdown/ripple animation; scripted swimmer
movement remains essential challenge content and can be paused.

## Connecting real footage later

1. Provide two local clips, corresponding metadata and time-aligned track data.
   Set each round's `videoSrc` only together with that data. Merely adding a clip
   does not make the illustration's fixture tracks valid for that video.
2. Replace the preview boundary with FastAPI session, tap-resolution and result
   responses using the architecture document's HTTP/WebSocket separation.
3. Submit `{ x, y, timestamp }` relative to the displayed media. The video branch
   preserves its intrinsic aspect ratio and captures `video.currentTime` at the
   tap; it uses muted inline playback for iPad. Handle server selection feedback
   and errors before transitioning to submitted/results states.
4. Keep ground truth, AI selections and timing out of the active-round UI. Wait
   for the real round-complete/result event before revealing real comparisons.
   Current short ending delays and results are explicitly local preview behavior.

The video element is prepared for integration, but actual clip playback, iPad
codec compatibility and backend synchronization cannot be validated until the
clips and server exist. No network requests or fabricated backend are required
by the preview. The generic video-error UI returns the judge to the introduction.

## Validation

From `frontend`, run `npm run build` then `npm test`. Tests cover two rounds,
countdown, touch and keyboard taps, empty taps, pause, timeouts, reveal fairness,
early guesses, completion/restart, responsive layouts, reduced motion and the
existing homepage regressions. Review screenshots in `test-results/`.
