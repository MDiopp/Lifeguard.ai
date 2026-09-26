Lifeguard AI Design Details

1. Product Feel

Calm, professional, precise safety software.
Normal operation should feel quiet.
Urgency should appear only when something is wrong.
Visually, the product should feel like a premium summer resort and modern aquatic safety system rather than dark enterprise software.

2. Core Design Principles

On monitoring, Human vs AI, and analysis screens, video is the primary focus.

The homepage is an exception: it may prioritize brand, typography, and decorative aquatic artwork over video.

Minimize unnecessary UI.

Use strong visual hierarchy.

Alerts should change the interface noticeably.

Red is reserved for critical states.

Avoid generic SaaS dashboard patterns.

Functional screens should avoid decorative clutter. The homepage may use restrained decorative elements when they support the aquatic/summer identity.

3. Visual References

Reference 1 — Homepage

Use the user-provided homepage reference as the primary composition reference for the current homepage implementation.

Key traits to preserve:

Warm cream canvas

Large expressive serif/italic hero typography

Clean sans-serif navigation and supporting copy

Abstract layered turquoise/seafoam waves rising from the bottom

Warm sun-yellow circular/organic shape near the upper-right

Spacious editorial composition

Two prominent entry CTAs: Monitoring and Human vs AI

Minimal decorative dots/lines are acceptable

Do not include a camera feed, live monitoring card, swimmer count, alert count, status card, or other operational dashboard UI on the homepage.

4. Color System

Visual Direction

The product should use a bright, colorful, summer-inspired coastal palette.

The interface should feel:

Warm

Aquatic

Energetic

Friendly

Premium

Playful without feeling childish

The design should evoke:

Clear tropical water

Sunlight

Poolside environments

Summer resorts

Lifeguard / beach culture

Avoid dark AI-dashboard styling unless a specific screen genuinely benefits from it.

Core Palette

Sand Cream: #FDF7EA

Primary background color

Warm alternative to pure white

Used for calmer sections and readable content areas

Seafoam: #BEEFEA

Soft aquatic background/accent

Used for large atmospheric areas and secondary backgrounds

Lagoon: #39B8D0

Main aquatic brand color

Used for interactive elements, water visuals, selected states, and brand accents

Deep Teal: #0F7F8F

Strong contrast color

Used for buttons, headings, navigation emphasis, and darker UI elements

Sun Yellow: #F7C75B

Warm highlight color

Used sparingly for sunlight, accents, and moments of emphasis

Coral: #F28C72

Secondary warm accent

Used sparingly for personality and visual balance

Text Colors

Primary Text: #173F47

Secondary Text: #52767C

Muted Text: #7C989D

Text on Dark/Aquatic Surfaces: #FFFFFF

Status Colors

Safe: #2E9D72

Monitoring: #E6B94A

Warning: #F28C4B

Critical: #D94C4C

Usage Rules

Sand Cream should be the default neutral background instead of pure white.

Lagoon and Deep Teal should define the main brand identity.

Seafoam should be used to create softer aquatic sections and atmosphere.

Sun Yellow and Coral should be used sparingly as expressive accents.

Do not use every bright color at once.

Large saturated areas should usually be limited to water, sun, or major decorative backgrounds.

Functional UI should remain readable and restrained.

Red is reserved for genuine critical alerts and should never be decorative.

Green should only communicate safe or successful states.

Avoid purple/blue "AI startup" gradients.

Avoid neon colors.

Avoid generic dark SaaS styling.

Avoid excessive use of gradients unless they are intentionally used to represent sky, sunlight, water, or atmosphere.

Background Philosophy

Backgrounds should feel designed, not empty.

Possible background treatments:

Animated water

Gentle waves

Sunlight caustics

Soft summer sky gradients

Light cloud movement

Subtle ripple effects

Abstract aquatic shapes

Stylized pool or beach environments

Background motion should feel smooth and organic rather than flashy.

Color Hierarchy

Most screens should follow this rough hierarchy:

Sand Cream / light background

Lagoon / Seafoam as the dominant environmental color

Deep Teal for structure and contrast

Sun Yellow / Coral for personality

Semantic status colors only when needed

General Rule

The interface should look beautiful even before any alert colors appear.

Color should establish a clear summer / water / lifeguard identity without making the product feel childish or overly playful.

5. Typography

For the homepage:

Use an expressive editorial serif for the Lifeguard AI wordmark and main hero headline.

Italic serif styling is encouraged for the hero if it matches the reference.

Use a clean modern sans-serif for navigation, body copy, buttons, labels, and product UI.

The hero headline should feel distinctive and elegant rather than like a generic SaaS heading.

Avoid futuristic "AI" display fonts, monospaced branding, and overly techy typography.

Keep body copy highly readable.

For operational product screens:

Prefer the sans-serif UI typeface for clarity and density.

Serif display type may appear sparingly in branding but should not interfere with operational readability.

6. Spacing

Use only:

4px

8px

12px

16px

24px

32px

48px

64px

Rules:

Prefer consistent spacing over arbitrary values.

Related elements should sit closer together.

Separate unrelated sections with larger gaps.

7. Shape and Surface Rules

Border Radius:

Small controls:

Cards/panels:

Large containers:

Borders:

Use subtle borders when needed.

Shadows:

Minimal or none.

Rules:

Do not put everything inside a rounded card.

Avoid excessive pills.

Avoid glowing borders.

8. Main Screens

9. Demo Flow

The hackathon demo is a Human vs AI challenge designed to demonstrate how Lifeguard AI can help identify swimmers showing signs of distress.

The experience should be immediately understandable, interactive, visually polished, and easy to complete in a short judging session.

Demo Device Setup

The demo uses two devices:

iPad — Judge Interface

The iPad is the judge-facing device.

It should:

Display the Human vs AI challenge.

Play the clean pool footage.

Allow the judge to directly tap a swimmer they believe is showing signs of distress.

Record the judge's selected swimmer.

Record the judge's detection time.

Avoid showing any AI-generated hints during the round.

The judge should not need to use swimmer numbers, menus, or other indirect controls.

The interaction should feel as simple as:

"See someone in distress? Tap them."

Laptop — Lifeguard AI System

The laptop runs the primary Lifeguard AI system.

It should:

Run the backend and AI/CV pipeline.

Analyze the same video independently.

Track swimmers throughout the footage.

Record which swimmer or swimmers Lifeguard AI flags.

Record Lifeguard AI's detection time.

Generate swimmer location and visual descriptions when possible.

Display the detailed Results and AI Analysis Replay after each round.

Both devices should remain synchronized throughout the demo.

Judge Swimmer Selection

The judge selects a swimmer by tapping directly on them in the video on the iPad.

When the judge taps:

Record the tap location relative to the displayed video.

Normalize the coordinates relative to the video dimensions.

Record the exact video timestamp of the tap.

Compare the tap location against the tracked swimmer bounding boxes at that timestamp.

Determine which swimmer the judge selected.

Store:

Selected swimmer ID

Tap coordinates

Detection timestamp

Whether the selected swimmer was actually showing distress

A brief visual confirmation should appear after a successful tap, such as:

A subtle ring

A ripple

A temporary highlight

This confirmation should disappear quickly and should not reveal any AI information.

If the judge taps an area where no swimmer is detected, display a short message such as:

"No swimmer selected — tap directly on a swimmer."

The judge should then be allowed to try again.

The interaction should feel responsive and natural.

Overall Demo Flow

Judge opens the Human vs AI experience on the iPad.

A short intro explains the challenge:

Watch the pool footage.

Identify anyone showing signs of distress.

Tap the swimmer as soon as you believe they may need help.

Try to identify the situation before Lifeguard AI does.

Judge begins the round.

Pool footage starts playing on the iPad.

The judge sees only clean footage.
No AI overlays or analysis should be visible.

Lifeguard AI analyzes the same footage independently on the laptop.

The judge taps a swimmer they believe is in distress.

Lifeguard AI may also independently flag a swimmer during the round.

The system records:

Judge's selected swimmer

Judge's detection time

Lifeguard AI's selected swimmer

Lifeguard AI's detection time

Ground-truth distressed swimmer(s)

The round transitions into the Results / Reveal state.

Human and AI performance are compared.

The correct distressed swimmer or swimmers are revealed.

The AI Analysis Replay is shown on the laptop.

The replay explains:

Who Lifeguard AI flagged

Where they were located

What behavior contributed to the alert

When the alert occurred

Judge proceeds to the next round.

Round Progression

The challenge contains three rounds.

Each round should increase in difficulty.

Round 1 — Easy

Purpose:

Teach the judge how the challenge works.

Establish trust.

Give the human a realistic chance to win.

Characteristics:

One distressed swimmer.

Relatively obvious signs of distress.

Small or moderate number of swimmers.

Limited visual distraction.

The human should have a strong chance of detecting the swimmer before the AI.

This round should make the competition feel fair rather than intentionally rigged in favor of Lifeguard AI.

Round 2 — Moderate

Purpose:

Make the competition more challenging.

Demonstrate Lifeguard AI's ability to notice subtler behavioral changes.

Characteristics:

One distressed swimmer.

More swimmers in the scene.

More general activity and distraction.

Distress behavior should be less visually obvious.

Human and AI detection times should feel competitive.

Round 3 — Difficult

Purpose:

Demonstrate the value of continuous automated attention.

Show how multiple simultaneous swimmers make human monitoring more difficult.

Characteristics:

Crowded or visually busy pool environment.

Distress should be subtle.

Consider including multiple distressed swimmers.

Distressed swimmers may begin showing concerning behavior at different times.

The challenge may shift from:

"Who notices the swimmer first?"

to:

"Can you identify everyone who needs attention?"

For example:

Swimmer A begins showing distress at 8 seconds.

Swimmer B begins showing distress at 13 seconds.

The judge may select multiple swimmers.

Lifeguard AI independently attempts to identify both.

Round 3 may compare:

First detection time

Number of distressed swimmers correctly identified

Missed swimmers

False positives

Possible results:

Human:

First alert: 4.8 seconds

Correct detections: 1 / 2

Missed swimmers: 1

False positives: 0

Lifeguard AI:

First alert: 2.6 seconds

Correct detections: 2 / 2

Missed swimmers: 0

False positives: 0

Rounds 1 and 2 should remain single-target rounds so the rules are easy to understand before introducing the more complex final challenge.

During the Challenge

Do not show:

AI bounding boxes

AI-selected swimmer

AI risk scores

AI confidence values

AI behavioral analysis

Any cue that could influence where the judge looks

The judge-facing iPad should display only:

Round number

Minimal instructions

Pool footage

Optional subtle progress information

Tap feedback after the judge makes a selection

The video should remain the dominant visual element.

Results / Reveal

After each round, clearly show:

Judge's selected swimmer

Judge's detection time

Lifeguard AI's selected swimmer

Lifeguard AI's detection time

Correct distressed swimmer

Whether each selection was correct

Which side detected the incident first

For rounds with multiple distressed swimmers, also show:

Correct detections

Missed swimmers

False positives

The reveal should feel satisfying and dramatic without becoming excessively flashy.

Animation and typography are encouraged.

The user should be able to understand the result within a few seconds.

AI Analysis Replay

After the result is revealed, replay the relevant section of footage on the laptop with Lifeguard AI's internal analysis visible.

The replay may include:

Highlighted swimmer

Tracking ID

Bounding box or tracking indicator

Approximate pool location

Visual description of the swimmer

Movement history

Behavioral indicators

Risk progression

Exact moment the AI generated its alert

Example swimmer description:

"Adult male wearing yellow swim trunks, upper-right area of the pool."

Example behavioral explanation:

"Limited forward movement, sustained vertical posture, and irregular arm movement persisted long enough to trigger an alert."

The system should describe what it observed rather than presenting the output as human-like internal thoughts.

Use labels such as:

"AI Analysis"

or

"Why this swimmer was flagged"

instead of:

"What the AI was thinking."

Distress Language

The system should generally use language such as:

"Possible distress"

"Signs of distress detected"

"Swimmer may require attention"

"Potential drowning risk"

Avoid presenting the system as definitively determining that someone is drowning.

Lifeguard AI should be framed as an attention-assistance system rather than a replacement for professional judgment.

Demo Design Philosophy

The demo should feel like a polished interactive experience rather than a technical test interface.

The judge should understand the challenge almost immediately.

Prioritize:

Large video

Minimal instructions

Direct tap interaction

Responsive feedback

Smooth transitions

Strong reveal moments

Clear separation between judge-facing and AI-facing information

Minimal clutter

Consistent summer / aquatic visual identity

The experience should reinforce the core product message:

Lifeguard AI is not intended to replace lifeguards.

It acts as an additional set of eyes that continuously monitors swimmers and helps direct human attention toward people who may need help.

10. Interaction and Motion

Motion is an important part of the Lifeguard AI visual identity.

The interface should feel fluid, responsive, elegant, and alive.

Animations should reinforce the aquatic / summer theme without making the product feel childish or distracting.

General Motion Direction

Encourage:

Smooth wave-like motion

Gentle parallax

Water ripple effects

Cursor-reactive backgrounds

Subtle sunlight movement

Soft floating decorative elements

Fluid transitions between sections and pages

Elegant text reveals

Smooth state transitions

Responsive hover and press feedback

Avoid:

Excessive bouncing

Overly playful cartoon motion

Constant pulsing

Generic fade-in animations on everything

Excessive glow effects

Motion that makes operational information harder to read

Animation purely for decoration when it interferes with usability

Homepage Motion

The homepage may be the most visually expressive part of the product.

Possible effects include:

Animated water or waves

Waves that gently move or splash

Cursor interaction that creates ripples or displacement

Sunlight or caustic movement

Clouds drifting slowly

Subtle parallax between foreground and background elements

Decorative elements responding slightly to cursor movement

Smooth animated transitions into Monitoring or Human vs AI

The homepage should feel alive even before the user interacts with it.

Monitoring Motion

Monitoring should be calmer and more restrained.

Normal state:

Minimal movement

Subtle tracking indicators

Smooth updates

No distracting background animation

When potential distress is detected:

Attention should progressively shift toward the swimmer

Tracking indicators may become more prominent

Warning information should enter smoothly

The rest of the interface may subtly reduce visual emphasis

Critical states should feel immediate and clear

Motion should help direct attention, not create spectacle.

Human vs AI Motion

The Human vs AI experience may be more energetic.

Encourage:

Smooth round transitions

Countdown animation

Tap ripple feedback

Subtle video-state transitions

Dramatic but tasteful results reveal

Animated timing comparison

Smooth transition into AI Analysis Replay

During the actual challenge, motion should not influence where the judge looks.

Results / Reveal Motion

The reveal should feel satisfying and memorable.

Possible ideas:

Detection times animate into view

Human and AI results appear with a slight stagger

Correct swimmer is revealed after the timing comparison

Winner/result message enters last

Replay CTA appears after the reveal completes

Avoid turning the reveal into a flashy game-show animation.

AI Analysis Replay Motion

Analysis visuals should appear progressively as the footage replays.

Possible elements:

Tracking box follows the swimmer

Trajectory draws over time

Risk indicator progresses smoothly

Behavioral signals appear when they become relevant

Detection moment is clearly marked

Motion Timing

General guidance:

Hover / press feedback: approximately 150–200ms

Small UI transitions: approximately 200–300ms

Larger page/state transitions: approximately 400–700ms

Background environmental motion: slow and continuous

These values are guidelines rather than strict requirements.

Accessibility

Respect reduced-motion preferences.

Critical information must never depend on animation alone.

All animated interactions should still be understandable in a static state.

11. Responsive Behavior

Lifeguard AI should feel intentionally designed for each device rather than simply shrinking the desktop layout.

General Principles

Preserve strong visual hierarchy at all screen sizes.

Avoid horizontal scrolling unless absolutely necessary.

Maintain large, readable type and clear touch targets.

Simplify layouts rather than squeezing desktop UI onto smaller screens.

Decorative artwork may be reduced or repositioned on smaller devices.

Important functional content always takes priority over decoration.

Laptop / Desktop

Primary use:

Full Lifeguard AI monitoring experience

AI Analysis Replay

Incident review

Main product navigation

Guidelines:

Take advantage of the wider canvas.

Video may occupy a large portion of the screen.

Supporting information may appear alongside the feed.

Decorative homepage elements can be more elaborate.

Maintain generous spacing and strong composition.

iPad

Primary use:

Human vs AI judge interface

Guidelines:

Design specifically for touch.

Video should be the dominant element.

Touch targets should be large and obvious.

Judge should be able to tap directly on swimmers.

Minimal UI should surround the footage during the challenge.

No small desktop-style controls.

Avoid interactions that depend on hover.

During the demo, the iPad should feel like a dedicated challenge device rather than a scaled-down desktop app.

Phone

Primary use:

Optional alert / companion experience

Quick system status

Incident notification

Viewing critical information

Guidelines:

Use a single-column layout.

Reduce decorative content.

Prioritize:

Alert state

Swimmer description

Location

Live status

Clear actions

The phone experience does not need to reproduce the full monitoring interface.

Navigation

Desktop:

Full navigation may be visible.

Tablet:

Navigation may be simplified.

Phone:

Use compact navigation such as a menu or condensed header.

Video Behavior

Preserve video aspect ratio.

Do not crop important swimmers when resizing.

Ensure tap coordinates remain accurate regardless of displayed video size.

On iPad, video should remain large enough for precise swimmer selection.

On phone, monitoring video may be reduced in favor of critical incident information.

Background and Decorative Elements

Animated backgrounds should scale gracefully.

Reduce complexity on smaller screens when necessary.

Avoid large effects that obscure content.

Maintain the summer / aquatic identity on every device.

Performance

Heavy visual effects should degrade gracefully on lower-powered devices.

Complex water or WebGL effects may be simplified on mobile.

Prioritize smooth interaction over maximum visual complexity.

Laptop:

Full monitoring dashboard.

iPad:

Human vs AI judge interface.

Large touch targets.

Minimal UI.

Phone:

Optional responsive alert view.

12. Anti-Ai Design Rules

DO NOT:

Use purple/blue AI gradients.

Add generic metric cards.

Add unnecessary sidebars.

Add excessive rounded containers.

Add random glows.

Add decorative charts.

Add icons without purpose.

Use generic "AI dashboard" styling.

Invent new colors or spacing values.

Make everything visually important.

Instead:

Prioritize video.

Use restraint.

Use strong typography.

Use spacing and hierarchy.

Keep normal states quiet.

Make alerts unmistakable.

13. Questions to Ask During Design

For every screen:

What should the user notice first?

What should they notice second?

Is anything here unnecessary?

Can I remove 20% of the interface?

Does this look like a real product or a hackathon dashboard?

Does every color have a reason?

Is the spacing consistent?

Would this still make sense from several feet away?

14. Implementation Instructions for AI

Before making frontend changes:

Read this entire file.

Follow the established visual system.

Do not introduce new design patterns without a clear reason.

Ask before making major visual changes.

Preserve consistency across all screens.

15. Creative Freedom

Astra is encouraged to take creative liberty with the visual design as long as it follows the established design system and product goals.

Astra may freely explore:

Layout composition

Background artwork

Animated water / waves / sunlight

Micro-interactions

Page transitions

Decorative aquatic elements

Asymmetrical layouts

Section composition

Motion timing

Visual storytelling

Astra should prioritize originality, elegance, and strong art direction over conventional dashboard patterns.

However, Astra must preserve:

The established color palette

The typography system

The intended purpose of each page

Clear information hierarchy

Accessibility and readability

Semantic use of status colors

The summer / coastal / lifeguard identity

Do not default to generic SaaS or AI-dashboard conventions.

If a creative decision conflicts with usability, usability should win.

16. Design Goal

The finished product should feel custom-designed and visually memorable enough to stand out in a portfolio.

It should not look like a generic AI-generated website.

Prefer bold, intentional art direction over familiar template patterns.

Homepage Art Direction

For the current implementation, the homepage should closely follow the user-provided reference rather than inventing a new immersive scene.

The first viewport should feel warm, artistic, summery, and editorial.

Composition

Use Sand Cream (#FDF7EA) as the dominant homepage canvas.

Place the Lifeguard AI wordmark in the upper-left.

Keep the primary navigation in the upper-right / upper-center area.

Use a small uppercase eyebrow above the main headline.

Use one large expressive serif/italic hero headline on the left.

Place a short supporting sentence underneath.

Place two clear CTAs beneath the copy:

Primary: Start Monitoring

Secondary: Try Human vs AI

Use abstract layered aquatic waves across the lower portion of the viewport.

Use a restrained Sun Yellow shape near the upper-right for warmth and balance.

Small decorative circles/dots/lines may be used sparingly.

Homepage Content Rules

The homepage is an entry point, not a monitoring dashboard.

Do NOT place any of the following on the homepage:

Live camera feed

Fake camera preview

Swimmer count

Alert count

"All clear" status card

Incident table

Risk score

Detection bounding boxes

Monitoring metrics

Operational dashboard panels

Those elements belong on /monitor, /demo, /incidents, or analysis views.

Motion

Keep motion lightweight and artistic:

Gentle wave drift

Very subtle parallax

Small floating decorative movement

Soft hover/press feedback

Optional cursor-reactive movement if it remains understated

Do not make the homepage dependent on complex WebGL, generated artwork, or heavy animation.

Goal

The homepage should look intentionally art-directed while remaining simple enough to implement quickly. It should establish the Lifeguard AI identity and immediately direct the user toward either Monitoring or Human vs AI.