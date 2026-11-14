# MYZJX — Soft cloth interaction & adaptive media (v6)

## Intent
Default cursor is visually neutral: NO coloured light or dark spotlight following the pointer. Hover depresses only the card's own media surface like a softly stretched cloth, then rebounds.

## Implemented design
- Remove three-blob kinetic cursor field and its CSS/JS. Ambient page colour follows scroll/focus, never mouse.
- Exactly two visible concentric rounded surfaces: outer card shell and one inner image/video/editorial stage. The actual image/video fills the inner clip edge to edge without its own padding, radius, shadow or border.
- Image stage dimensions use unmodified source aspect ratio (Astro image metadata). No 0.93 scale or 1.64 limit, no letterboxing. A 16:9 image or video gives a 16:9 window.
- Article cover and single-image software gallery also follow source aspect. Software pages with two screenshots preserve the distinct side-by-side comparison layout.
- Local pressure uses a subtle ring highlight plus <=0.6deg spring-following tilt. No global canvas/shader or perpetual RAF. Mobile, reduced-motion and forced-colors stay static.

## Validation
- Desktop Safari: zero kinetic light DOM, no external card halo. Local pressure x coordinate responds to mouse and fades to zero after exit; stage transform is subtle and bounded.
- Every image: media bounding box equals inner stage, padding/radius are zero; inner radius equals outer radius minus inset; actual stage ratio matches original within 0.03.
- Video: 16:9 frame, poster/video same stage, lazy video load unchanged.
- 320/390/768/1440 responsive no horizontal scroll; dark/light modes and focus handling work.
- CI Astro build/type checks and Safari screenshots; deploy tested Vercel preview without repeated production builds if Vercel rate-limited.
