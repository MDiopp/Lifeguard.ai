# Lifeguard AI homepage

A standalone React + TypeScript Waterline homepage. Read the root
`architecture.md` and `design_details.md` before changing the architecture or visual system.

## Local development

Requires Node.js 22.12+ (validated on Node 24) and npm. From this directory:

```sh
npm ci
npm run dev
```

Open `http://localhost:5173`. The dev server listens on the local network for
tablet review. Artwork is served locally; the page needs no external
services at runtime. The root Python `.venv` is not used by this frontend.

```sh
npm run build     # TypeScript checks followed by a production build
npm run preview   # Serve the production build locally
npm test          # Browser checks against the production build
```

Run `npm run build` before `npm test`. Browser tests use locally installed
Microsoft Edge through Playwright, without downloading another browser. They
cover six review widths, first-viewport composition, preview controls, keyboard use,
actual rendering pause/resume, reduced motion, touch scrolling, zoom-equivalent
reflow, text contrast, WebGL unavailability/context recovery, and local-only requests. Screenshots
are saved under the ignored `test-results/` directory.

## Structure

- `src/pages/HomePage.tsx` owns homepage content and the single expanded preview.
- `src/components/waterline/WaterlineEnvironment.tsx` owns the scene lifecycle and
  pointer interactions. Its `renderer.ts` owns GPU resources and the animation
  loop; `shaders.ts` contains the sky, surface reflections, underwater caustics,
  sunlight, and ripple refraction. Replace this folder independently of page UI.
- `src/hooks/useMotionPreference.ts` combines system preference, saved manual
  pause, and tab visibility. System reduced-motion always takes priority.
- `src/styles/tokens.css` contains the specified palette and spacing scale.
- `SiteHeader`, `MotionToggle`, and `ExperiencePreview` are reusable UI components.

The water is an original procedural WebGL scene: a single draw per frame, at most
four ripple sources, a capped pixel budget, and resolution reduction on sustained
slow frames. Pausing and reduced motion stop rendering; resizing still redraws
the static scene. The tab visibility hook stops animation in hidden tabs.

Local JPEG posters appear before the first frame and whenever WebGL is unavailable
or loses its context. These are rendered from the same scene at desktop, portrait,
and compact dimensions. With the dev server running, regenerate them using:

```sh
node scripts/capture-waterline.mjs
```

The new homepage uses system sans-serif typography. Licensed Fraunces assets from
the previous composition remain available in `public/fonts/` but are not requested
by this page. No new runtime libraries were needed for Waterline.

## Deliberately deferred

Human vs AI and Monitoring are honest inline descriptions, not implemented
experiences. There are no other screens, backend requests, detection logic,
mock results, or video feeds. The architectural routes can be introduced when
those screens are built.
