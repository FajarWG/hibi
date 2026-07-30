---
name: design-taste-frontend
description: Brutalist frontend skill. The agent designs and redesigns interfaces in a web-brutalist / neo-brutalist language by default — raw structure, thick hard borders, offset drop shadows with no blur, monospace-forward type, square corners, high contrast, and one loud accent. Audit-first on redesigns, strict pre-flight check.
---

# tasteskill: Brutalist Frontend Skill

> Default aesthetic is **web brutalism / neo-brutalism**. Landing pages, portfolios, product surfaces, redesigns.
> Brutalism is the baseline here, not one option among many. Deviate only when the brief explicitly asks for a different language.

---

## 0. BRIEF INFERENCE (Read the Room, Then Commit to Brutalism)

Before touching code, infer what the user wants — but the design language is already decided: **brutalist**. What you infer is *how loud*, *how playful*, and *how dense* the brutalism is.

### 0.A Read these signals first
1. **Page kind** — landing, portfolio, product/app surface, editorial, redesign.
2. **Brutalism flavor words** — "raw / concrete / hard" (severe brutalism: mono, black-on-white, no color) vs. "neo-brutalist / playful / Gumroad-y / Figma-y" (bright flat color blocks, thick black borders, hard shadows) vs. "editorial brutalist" (huge type, exposed grid).
3. **Reference signals** — linked URLs, screenshots, named products (Gumroad, Figma community, Bloomberg terminal, Balenciaga, Brutalist Websites gallery).
4. **Audience** — the audience picks the *intensity*, not the language. B2B still gets brutalism, just calmer.
5. **Existing brand assets** — logo, color, type. On redesigns these are starting material (Section 11).
6. **Quiet constraints** — accessibility-first, public-sector, regulated. These OVERRIDE loudness (bigger tap targets, stronger contrast) but keep the brutalist skeleton.

### 0.B Output a one-line "Design Read" before generating
State: **"Reading this as: \<page kind> for \<audience>, brutalist language, leaning \<severe mono / neo-brutalist color-block / editorial>."**

Examples:
- *"Reading this as: SaaS landing for developers, brutalist language, leaning neo-brutalist color-block (thick borders, hard shadows, one electric accent)."*
- *"Reading this as: study-app product surface, brutalist language, leaning functional-severe (mono labels, square panels, hairline-to-thick borders, minimal color)."*

### 0.C If the brief is ambiguous, ask one question, do not guess
Ask exactly **one** clarifying question, only when the read genuinely diverges. Example: *"Severe black-and-white brutalism, or neo-brutalist with a loud accent color?"* If you can infer, do not ask.

### 0.D Anti-Default Discipline
Do not fall back to soft SaaS defaults: rounded cards, blurred glassmorphism, AI-purple gradients, soft drop shadows, pastel everything, centered hero over mesh gradient. Brutalism is the correction to that slop, so lean into: square corners, hard borders, offset shadows, exposed grid, honest structure.

---

## 1. THE THREE DIALS

After the design read, set three dials. Everything below is gated by these.

* **`RAWNESS: 8`** — 1 = polished neo-brutalism (soft-ish), 10 = severe concrete brutalism (unstyled-looking, mono, monochrome).
* **`MOTION_INTENSITY: 4`** — 1 = static, 10 = cinematic. Brutalism runs LOW by default; motion is snappy, mechanical, no easing-fancy.
* **`VISUAL_DENSITY: 6`** — 1 = airy poster, 10 = terminal/cockpit. Brutalism trends denser than soft UI.

**Baseline:** `8 / 4 / 6`. Override conversationally, never by asking the user to edit this file.

### 1.A Dial Inference
| Signal | RAWNESS | MOTION | DENSITY |
|---|---|---|---|
| "neo-brutalist / playful / Gumroad / bright" | 5-7 | 4-6 | 4-6 |
| "raw / concrete / severe / unstyled / terminal" | 8-10 | 2-3 | 6-9 |
| "editorial brutalist / poster / huge type" | 6-8 | 3-5 | 3-5 |
| "trust-first / public-sector / accessible" | 5-6 | 2-3 | 5-6 |
| "redesign — preserve" | match existing | +1 | match |
| "redesign — overhaul to brutalist" | 8 | +1 | +1 |

---

## 2. THE BRUTALIST DESIGN LANGUAGE (Core Rules)

There is **no official brutalism package**. Build with native CSS + Tailwind v4 + a component library you own (shadcn/ui). Be honest in comments: this is a hand-built brutalist system, not a vendored one.

### 2.A Non-negotiable brutalist primitives
* **SQUARE CORNERS.** `border-radius: 0` everywhere by default. No `rounded-*` unless a control's behavior demands a pill (rare, documented). Set `--radius: 0`.
* **THICK, HARD BORDERS.** Default `2px` solid; structural dividers `3-4px`. Border color is the strong foreground (near-black in light, near-white in dark), not a faint hairline gray. Faint `border-gray-200` hairlines are banned.
* **OFFSET DROP SHADOWS, NO BLUR.** The signature move: `box-shadow: 4px 4px 0 0 <foreground>` (blur radius = 0). Never soft blurred shadows. On `:active`, translate the element into its shadow (`translate-x-[4px] translate-y-[4px]` + remove shadow) to simulate a physical press.
* **HIGH CONTRAST.** Off-black on off-white (or inverted). No low-contrast gray-on-gray text.
* **MONO-FORWARD TYPE.** Headings and labels in a monospace or heavy grotesk, often `UPPERCASE` with tight or wide tracking. Body may stay sans for readability at length.
* **EXPOSED STRUCTURE.** Show the grid. Visible column lines, labeled sections, raw form outlines. Don't hide the scaffolding; celebrate it.
* **ONE LOUD ACCENT.** A single saturated accent used as flat fills on blocks/buttons/tags. No gradients as decoration. No second competing accent.

### 2.B Brutalism flavors (pick one per project, lock it)
| Flavor | How it reads |
|---|---|
| **Severe / concrete** (RAWNESS 8-10) | Monochrome, mono type, hairline-to-thick black borders, almost no color, looks "unstyled on purpose." |
| **Neo-brutalist color-block** (RAWNESS 5-7) | Bright flat color blocks, thick black borders, hard offset shadows, playful. Gumroad / Figma-community energy. |
| **Editorial brutalist** (RAWNESS 6-8) | Oversized type as the hero, exposed baseline grid, big black rules, minimal chrome. |

**One flavor per project.** Do not mix severe-mono panels with candy-colored neo-brutalist cards in the same tree.

---

## 3. DEFAULT ARCHITECTURE & CONVENTIONS

### 3.A Stack
* **Framework:** React / Next.js. Default to Server Components. Any component with motion, scroll, or pointer logic is an isolated `'use client'` leaf.
* **Styling:** **Tailwind v4** (use `@tailwindcss/postcss`, not the legacy `tailwindcss` plugin). Radius token set to 0.
* **Animation:** **Motion** (`import { motion } from "motion/react"`). Brutalist motion is snappy and mechanical — prefer short linear/steps easing over springy overshoot.
* **Fonts:** `next/font` or self-host with `font-display: swap`. Monospace for display/labels (e.g. Geist Mono, JetBrains Mono, Space Mono, IBM Plex Mono) + a readable sans or grotesk for body (Geist, Space Grotesk, Archivo). Never `<link>` Google Fonts in production.

### 3.B State
* Local `useState` for isolated UI. Global state only to avoid deep prop-drilling (Zustand / Jotai / context).
* **NEVER** track continuous input (scroll, mouse, physics) in `useState`. Use Motion's `useMotionValue` / `useScroll` / `useTransform`.

### 3.C Icons
* **Allowed (priority):** `@phosphor-icons/react`, `hugeicons-react`, `@radix-ui/react-icons`, `@tabler/icons-react`. Brutalism favors sharp, geometric, or duotone weights.
* **Discouraged:** `lucide-react` (unless the project already uses it).
* **NEVER hand-roll SVG icon paths.** One family per project. Standardize weight/strokeWidth globally.

### 3.D Emoji
Discouraged by default. Use icon glyphs. Allow only for an explicitly playful/social brief.

### 3.E Responsiveness & Layout Mechanics
* Breakpoints `sm 640 / md 768 / lg 1024 / xl 1280 / 2xl 1536`.
* Contain with `max-w-[1400px] mx-auto` or `max-w-7xl`.
* Full-height sections use `min-h-[100dvh]`, never `h-screen`.
* Use CSS Grid, not flex percentage math. Brutalism *wants* a visible grid — expose column gaps and rules.

### 3.F Dependency Verification (mandatory)
Before importing any 3rd-party lib, check `package.json`. If missing, output the install command first. Never assume a library exists.

---

## 4. DESIGN ENGINEERING DIRECTIVES

### 4.1 Typography
* **Display / Headlines:** heavy weight, `tracking-tight` or wide `tracking-[0.15em]` if uppercase, `leading-none` to `leading-[1.05]`. Monospace or heavy grotesk. Big and blunt.
* **Body:** `text-base leading-relaxed max-w-[65ch]`, readable sans/grotesk. Do not set long body copy in mono.
* **Labels / eyebrows / meta:** monospace UPPERCASE is *on-brand* here (unlike soft-UI skills). Still don't stamp one on every single section — vary.
* **Emphasis:** bold or the accent color, or a solid highlight block behind the word. Not random serif injection.
* **ITALIC DESCENDER CLEARANCE:** italic display words with `y g j p q` need `leading-[1.1]` min + `pb-1` reserve.

### 4.2 Color
* **One accent, locked across the whole page.** Flat fills, no gradients as decoration. Saturated is fine (brutalism embraces loud), but consistent.
* **Neutrals:** off-black + off-white. No pure `#000`/`#fff` (kills depth) unless the flavor is deliberately severe-concrete and you accept it.
* **Color-block sections** (neo-brutalist flavor): each block is a flat solid fill with a thick border. Blocks can alternate accent / white / black, but from a locked palette of 2-3 fills, not a rainbow.
* **Shadows are colored with the foreground**, not black-on-color randomly. `4px 4px 0 0 var(--foreground)`.

### 4.3 Layout Diversification
* **ANTI-CENTER BIAS** when `RAWNESS > 4` (default): favor split-screen, hard left-alignment, asymmetric grid, exposed column rules. Centered hero OK only for editorial/manifesto brutalism where the type IS the design.
* Expose the grid: visible gutters, `divide-x`/`divide-y` with thick strong dividers, labeled cells.

### 4.4 Materiality, Shadows, Cards
* **Cards = square panels with a thick border and a hard offset shadow.** No soft elevation, no blur.
* **SHADOW CONSISTENCY:** one offset distance for the page (e.g. all `4px 4px 0`), one direction. Interactive elements press into the shadow on `:active`.
* **SHAPE LOCK:** radius 0 everywhere. If any pill exists (rare), it is documented and behavior-justified.
* **BORDER LOCK:** one border-weight scale (e.g. 2px default, 4px structural). Applied consistently — no random 1px hairline next to a 4px slab.

### 4.5 Interactive UI States
Always implement full cycles:
* **Loading:** blocky skeletons matching final layout (square, bordered), not soft spinners.
* **Empty:** composed, bordered, tells you how to populate.
* **Error:** inline for forms, hard-bordered alert blocks otherwise.
* **Tactile feedback:** on `:active`, translate into the shadow (`translate-x-[3px] translate-y-[3px]` and drop the shadow). This is the core brutalist button feel.
* **BUTTON CONTRAST CHECK (a11y):** button text readable vs. fill, WCAG AA (4.5:1 body, 3:1 large 18px+). Loud accent fills must still pass.
* **CTA WRAP BAN:** primary CTA text fits one line at desktop, 1-3 words.
* **NO DUPLICATE CTA INTENT:** one label per intent across the whole page.
* **FORM CONTRAST CHECK (a11y):** inputs, placeholders, focus rings, labels all pass WCAG AA. Focus ring is a hard offset or thick outline, not a soft glow.

### 4.6 Forms
* Label ABOVE input, `gap-2`. Helper text present in markup. Error text BELOW.
* Inputs are square, thick-bordered, no rounded corners, no inner shadow. Focus = border thickens or a hard offset outline appears.
* No placeholder-as-label, ever.

### 4.7 Layout Discipline (Hard Rules)
* **Hero fits the initial viewport:** headline ≤ 2 lines, subtext ≤ 20 words AND ≤ 4 lines, CTA visible without scroll. Plan font size and asset together.
* **Hero top padding cap:** `pt-24` max at desktop.
* **Hero stack discipline:** max 4 text elements (eyebrow OR brand strip, headline, subtext, CTAs). No trust micro-strip, pricing teaser, or tagline crammed into the hero.
* **Navigation on ONE line at desktop, height ≤ 80px** (default 64-72). In brutalism the nav can carry a thick bottom border / rule.
* **Section-Layout-Repetition:** a layout family appears at most once. ≥ 4 different families across 8 sections.
* **Grid over one-sided repetition:** don't stack 6 identical image-left/text-right rows. Vary composition and cell sizes; exposed asymmetric grid is on-brand.
* **EYEBROW RESTRAINT:** mono-uppercase eyebrows are on-brand for brutalism but still don't put one above *every* section. Max ~1 per 2-3 sections; vary.
* **Mobile collapse explicit per section:** high-RAWNESS asymmetric layouts collapse to single column (`w-full px-4`) below `md`.

### 4.8 Image & Visual Asset Strategy
Landing pages and portfolios are visual products. Text-only pages are incomplete.
1. **Image-generation tool first** if available — section-specific assets at correct aspect ratios. Brutalist treatment: high-contrast, duotone, halftone, or raw un-retouched photography, often inside a thick border.
2. **Real web images second:** `https://picsum.photos/seed/{descriptive-seed}/{w}/{h}`, or brand/stock URLs the brief provides.
3. **Last resort:** leave clearly-labeled placeholder slots (`<!-- TODO: hero image 1600x1200 -->`) and tell the user which images are needed.
* **Div-based fake screenshots are banned.** Use a real screenshot, generated image, real component preview, or nothing.
* **Real logos for social proof** (Simple Icons / devicon), rendered single-color to fit the monochrome scheme; or a generated monogram for invented brands. Logo wall = logos only, no category labels.
* **Hand-rolled decorative SVGs discouraged** except simple geometric marks (a square, a rule, a monogram) that suit brutalism.

### 4.9 Content Density
* Brutalism tolerates higher density, but still cut ruthlessly on marketing surfaces: headline ≤ 8 words, sub-paragraph ≤ 25 words per section.
* Long lists (> 5) get a real component: grouped columns, card grid, tabs/accordion, scroll-snap pills — not an endless `<ul>`.
* **COPY SELF-AUDIT (before ship):** re-read every visible string. Cut grammatically-broken, unclear-referent, or fake-thoughtful AI copy. Plain functional sentences beat cute wordplay.
* **Fake-precise numbers** (`92%`, `4.1×`) must be real, labeled mock, or cut.
* **One copy register per page.**

### 4.10 Quotes & Testimonials
* Max 3 lines of quote body. Attribution = name + role (+ company). Never name-only.
* Real typographic quotes or none. No em-dash inside (Section 9.G).
* Brutalist treatment: quote inside a thick-bordered block with a hard offset shadow, attribution in mono.

### 4.11 Theme Lock
* ONE theme for the whole page (light, dark, or auto). No section inverts mid-scroll — except a deliberate, single, hard color-block transition (allowed once).
* Section-level fills within the same theme family are fine (that IS neo-brutalist color-blocking); flipping the whole theme randomly is broken.

---

## 5. MOTION (Brutalist Register)

Brutalist motion is mechanical and blunt. Use it sparingly and with intent.
* **MOTION MUST BE MOTIVATED:** each animation communicates hierarchy, storytelling, feedback, or state change. If you can't justify it in one sentence, drop it.
* **Preferred feel:** short durations (120-250ms), linear or `steps()` easing, hard cuts, instant hover state flips, the press-into-shadow on `:active`. Avoid soft springy overshoot and long parallax unless the flavor is playful neo-brutalist and it's justified.
* **MARQUEE max one per page.** A blunt mono marquee suits brutalism, but only once.
* **Motion claimed = motion shown:** if `MOTION_INTENSITY > 4`, actually ship working motion; else drop the dial and ship clean static.
* **Forbidden:** `window.addEventListener("scroll", ...)`, `window.scrollY` in React state, `requestAnimationFrame` loops touching React state. Use `useScroll()`, ScrollTrigger, IntersectionObserver, or CSS scroll-driven animations.
* **Reduced motion (mandatory) for anything `MOTION_INTENSITY > 3`:** wrap with `useReducedMotion()` (Motion) or `@media (prefers-reduced-motion)` (CSS); collapse loops/parallax/physics to static.

---

## 6. PERFORMANCE & ACCESSIBILITY GUARDRAILS

* **Hardware acceleration:** animate only `transform` and `opacity`. `will-change` sparingly.
* **Reduced motion:** mandatory above `MOTION_INTENSITY 3` (see Section 5).
* **Dark mode:** design both modes from the start. Tailwind `dark:` or CSS variables — pick one. Maintain contrast (WCAG AA body, AAA target hero) and brand fidelity across modes. No pure `#000`/`#fff` unless deliberately severe.
* **Core Web Vitals:** LCP < 2.5s (hero image `priority`/preloaded), INP < 200ms, CLS < 0.1. Run Lighthouse before declaring done.
* **DOM cost:** grain/noise on fixed `pointer-events-none` layers only, never scrolling containers. Lazy-load below-the-fold and heavy libs (Three.js, GSAP).
* **Z-index restraint:** systemic layers only (nav, modal, overlay, grain). Document the scale.
* **Contrast in brutalism specifically:** loud accent fills and hard focus outlines must still pass AA. High contrast is a brutalist feature, so this is usually easy — verify anyway.

---

## 7. DIAL DEFINITIONS

### RAWNESS (1-10)
* **1-4 (polished neo-brutalist):** color blocks, thick black borders, hard shadows, but tidy spacing and a friendly accent. Approachable.
* **5-7 (default neo-brutalist):** bolder borders, bigger offset shadows, mono labels, exposed grid, one loud accent.
* **8-10 (severe / concrete):** monochrome, mono everything, looks near-unstyled, dense, hairline-to-slab borders, minimal or no color.

### MOTION_INTENSITY (1-10)
* **1-3 (static):** hover/active only. Default-safe under reduced motion.
* **4-7 (mechanical):** short linear/steps transitions, hard state flips, press-into-shadow, occasional blunt marquee/reveal.
* **8-10 (choreographed):** scroll-triggered reveals, pinned sections — only if the flavor justifies it. Never `window` scroll listeners.

### VISUAL_DENSITY (1-10)
* **1-3 (poster):** huge type, big empty zones, few elements. Editorial brutalism.
* **4-7 (product):** standard app spacing, exposed grid, labeled panels.
* **8-10 (terminal/cockpit):** tight padding, thick 1px-to-slab rules instead of gaps, `font-mono` for all numbers.

---

## 8. DARK MODE PROTOCOL

Dual-mode by default. Brutalism inverts cleanly: light = off-black ink on off-white paper; dark = off-white on off-black, borders and offset shadows flip to the light foreground. Pick a token strategy (Tailwind `dark:` OR CSS variables) and lock it. Enforce contrast, hierarchy parity, and brand fidelity in both modes. Respect `prefers-color-scheme` unless the brand insists. Test both modes before finishing.

---

## 9. AI TELLS (Forbidden Patterns)

Brutalism is partly a rejection of soft-UI slop. These are still banned.

### 9.A Visual
* **NO soft blurred drop shadows.** Brutalist shadows are hard offset (blur 0) only.
* **NO rounded corners by default.** Radius 0.
* **NO faint hairline gray borders.** Borders are thick and strong.
* **NO neon outer glows, NO glassmorphism/backdrop-blur** as decoration.
* **NO AI-purple / blue gradient glows.** One flat accent.
* **NO pure black (`#000`)** unless severe-concrete flavor deliberately uses it.
* **NO custom mouse cursors.**

### 9.B Typography
* **NO Inter as a default display face** — use mono or a heavy grotesk. Inter-as-body acceptable only for accessibility-first briefs.
* Control hierarchy with weight, case, and the accent — not just raw size.

### 9.C Layout
* **NO 3 identical equal feature cards.** Use asymmetric exposed grid, color-block bento, zigzag.
* Mathematically clean spacing; no floating awkward gaps.

### 9.D Content ("Jane Doe" effect)
* **NO generic names** (John Doe, Sarah Chan) — realistic, locale-appropriate names.
* **NO generic avatars / SVG eggs.**
* **NO fake-perfect numbers** (99.99%, 50%). Use organic values or label as mock.
* **NO startup-slop brand names** (Acme, Nexus, SmartFlow).
* **NO filler verbs** (Elevate, Seamless, Unleash, Revolutionize).

### 9.E Resources
* **NO hand-rolled SVG icons** (use a library). **NO div-based fake screenshots.** **NO broken Unsplash links** (use Picsum seeds or generated images). shadcn/ui never shipped in default state — restyle to brutalism (square, thick border, hard shadow).

### 9.F Production-Test Tells (banned unless brief demands)
* NO version labels in hero (V0.6, BETA, INVITE-ONLY) unless it's a launch.
* NO section-number eyebrows (`00 / INDEX`, `001 · Capabilities`).
* NO `01 / 4` pagination on tiles, NO scroll cues (`↓ scroll`).
* Middle-dot (`·`) rationed to ≤ 1 per metadata line.
* NO decorative colored status dots except real semantic state.
* NO photo-credit captions as decoration, NO version footers on marketing pages.
* NO locale/time/weather strips unless the brief is genuinely place/timezone-focused.
* NO micro-meta-sentences under eyebrows.
* NO pills/labels overlaid on images (caption below, outside the image).
* NOTE: mono-uppercase eyebrows and exposed grid lines that ORGANIZE REAL CONTENT are on-brand for brutalism — the ban is on *decorative* enumeration and *fake* meta, not on honest structural labeling.

### 9.G EM-DASH BAN (non-negotiable)
**Em-dash (`—`) and en-dash-as-separator (`–`) are COMPLETELY banned** everywhere visible: headlines, eyebrows, pills, body, quotes, attribution, captions, buttons, alt text. No "limited use" allowance. Replace with a period, comma, colon, parentheses, line break, or a plain hyphen `-`. Ranges (`2018-2026`, `€40-80k`) use a hyphen. The only permitted dash is the regular hyphen `-` (and minus in math). A single `—` or `–` fails Pre-Flight.

---

## 10. REFERENCE VOCABULARY (Brutalist Pattern Names)

* **Color-Block Bento** — flat solid tiles, thick borders, hard offset shadows, alternating fills from a locked palette.
* **Exposed-Grid Section** — visible column rules / `divide-x` slabs, labeled cells.
* **Slab Hero** — oversized mono/grotesk headline, hard rule beneath, blunt CTA block.
* **Press Button** — square, thick border, offset shadow, presses into shadow on `:active`.
* **Sticker Tag** — small square/skewed label with border + hard shadow (neo-brutalist).
* **Terminal Panel** — mono, dense, hairline-to-slab dividers, tabular numbers.
* **Marquee Rule** — single blunt scrolling text band (max one per page).
* **Ransom / Stacked Type** — mixed-weight blocky headline, high contrast (use with restraint).

---

## 11. REDESIGN PROTOCOL

### 11.A Detect the mode (first action)
* **Greenfield** — dial baseline from Section 1.
* **Redesign — preserve** — modernise toward brutalism without breaking brand recognition. Audit first, extract brand tokens, evolve.
* **Redesign — overhaul to brutalist** — apply the brutalist language over existing content + IA.

If ambiguous, ask once: *"Preserve the existing brand while adding brutalist styling, or full brutalist overhaul?"*

### 11.B Audit before touching
Document: brand tokens (color, type, radius, logo), information architecture, content blocks, patterns to preserve vs retire, current dial reading, SEO baseline (the #1 redesign risk).

### 11.C Preservation rules
Do not change IA, slugs, anchor IDs, nav labels, form field names/order, logo, or legal copy without explicit approval. Extract and keep the brand accent (recolor it into the single locked accent). Preserve copy voice unless a rewrite is requested. Do not regress accessibility wins.

### 11.D Modernisation levers (priority order)
1. **Set radius to 0, borders to thick-strong, shadows to hard offset** — the fastest brutalist shift, propagates through tokens.
2. **Typography** — flip display/labels to mono/grotesk, uppercase where it fits.
3. **Spacing & exposed grid** — reveal structure, add rules/dividers.
4. **Color** — collapse to off-black/off-white + one locked accent (flat fills).
5. **Motion** — swap soft transitions for snappy mechanical ones + press-into-shadow.
6. **Hero & key-section recomposition**, then full block replacement only when unsalvageable.

### 11.E What never changes silently
URL structure, nav labels, form field names/order, logo/wordmark, legal/consent copy.

---

## 12. FINAL PRE-FLIGHT CHECK

Run every box. If any fails, the output is not done.

- [ ] **Design read** declared (Section 0.B), brutalist flavor named?
- [ ] **Dials** explicit and reasoned from the brief?
- [ ] **Radius 0 everywhere** (`--radius: 0`, no stray `rounded-*` without a documented behavioral reason)?
- [ ] **Borders thick and strong** (2px default / 3-4px structural, foreground-colored), no faint hairline grays?
- [ ] **Shadows hard offset, blur 0**, one consistent offset + direction, no soft blurred shadows anywhere?
- [ ] **Press-into-shadow** on interactive `:active`?
- [ ] **One locked accent**, flat fills, no decorative gradients, used identically across the page?
- [ ] **One brutalist flavor** (severe / neo-brutalist / editorial) locked, not mixed?
- [ ] **Mono/grotesk display + labels**; body readable; not long body copy in mono?
- [ ] **ZERO em-dashes (`—`/`–`)** anywhere visible (Section 9.G)?
- [ ] **Theme Lock**: one theme for the page (color-block sections within the same theme are fine)?
- [ ] **Button contrast** AA against loud fills; **CTA fits one line**; **no duplicate CTA intent**?
- [ ] **Form contrast** AA (inputs/placeholder/focus/labels); square thick-bordered inputs; label above input?
- [ ] **Hero fits viewport** (≤ 2-line headline, ≤ 20-word subtext, CTA visible), top padding ≤ `pt-24`, ≤ 4 text elements?
- [ ] **Nav one line** at desktop, height ≤ 80px?
- [ ] **Section-layout repetition**: ≥ 4 families across 8 sections; no 6 identical rows?
- [ ] **Eyebrow restraint**: mono eyebrows are on-brand but not on every section (≤ ~1 per 2-3)?
- [ ] **Real images** (gen-tool → Picsum seed → labeled placeholder); NO div-fake screenshots, NO hand-rolled decorative SVGs beyond simple marks?
- [ ] **Logo wall = logos only**, real/generated marks, single-color to fit scheme?
- [ ] **Copy self-audit** done; no broken/fake-thoughtful strings; numbers real or labeled mock?
- [ ] **Motion motivated**, mechanical register, marquee ≤ 1, reduced-motion honored above dial 3?
- [ ] **No `window` scroll listeners**; `useScroll`/ScrollTrigger/IO/CSS only?
- [ ] **Dark mode** defined and tested both ways; no pure `#000`/`#fff` unless deliberately severe?
- [ ] **Mobile collapse** explicit for asymmetric layouts (`w-full px-4`, single column < md)?
- [ ] **Viewport stability** (`min-h-[100dvh]`, never `h-screen`)?
- [ ] **`useEffect` animations** have cleanup?
- [ ] **Loading / empty / error** states provided, blocky and bordered?
- [ ] **Icons** from an allowed family only, no hand-rolled paths?
- [ ] **AI Tells (Section 9)** absent: soft shadows, rounded corners, hairline borders, glassmorphism, AI-purple, Inter-as-display, Jane Doe, Acme?
- [ ] **Core Web Vitals** plausibly hit?

If a single box cannot be honestly ticked, fix it before delivering.

---

## Appendix — Brutalist Token & Primitive Snippets

Hand-built brutalist system (no vendored package). Tailwind v4 + CSS variables.

```css
:root {
  --radius: 0rem;                 /* square corners everywhere */
  --border-weight: 2px;           /* structural: 3-4px */
  --bg: oklch(0.98 0 0);          /* off-white paper */
  --fg: oklch(0.16 0 0);          /* off-black ink */
  --accent: oklch(0.62 0.20 25);  /* one loud, flat accent — recolor to brand */
  --shadow-brutal: 4px 4px 0 0 var(--fg);
  --shadow-brutal-sm: 2px 2px 0 0 var(--fg);
}
.dark {
  --bg: oklch(0.16 0 0);
  --fg: oklch(0.97 0 0);
  --shadow-brutal: 4px 4px 0 0 var(--fg);
}
```

```css
/* Press button: square, thick border, hard shadow, press into shadow */
.btn-brutal {
  border: var(--border-weight) solid var(--fg);
  border-radius: 0;
  box-shadow: var(--shadow-brutal);
  transition: transform 120ms steps(2, end), box-shadow 120ms steps(2, end);
}
.btn-brutal:active {
  transform: translate(4px, 4px);
  box-shadow: 0 0 0 0 var(--fg);
}
@media (prefers-reduced-motion: reduce) {
  .btn-brutal { transition: none; }
}
```

```css
/* Square bordered panel with hard offset shadow */
.panel-brutal {
  border: var(--border-weight) solid var(--fg);
  border-radius: 0;
  box-shadow: var(--shadow-brutal);
  background: var(--bg);
}
```

Install commands, when a real design system is genuinely required instead of brutalism (rare), still verify against `package.json` first:

```bash
npx shadcn@latest init          # own the components, then restyle to brutalism
npx shadcn@latest add button card badge input
```

**End.** Brutalism here is hand-built: square corners, thick strong borders, hard offset shadows, mono-forward type, one loud flat accent, exposed structure. It is the default, not an option.
