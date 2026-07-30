# Hibi Design Tokens

## Design read

Personal daily-practice tool for a serious Japanese learner. Calm product language, focused sessions, restrained motion.

| Surface | Design variance | Motion intensity | Visual density |
|---|---:|---:|---:|
| Marketing and auth | 8 | 6 | 3 |
| App shell | 5 | 4 | 5 |
| Focused study session | 3 | 3 | 3 |

The installed `design-taste-frontend` skill is used fully for marketing and auth surfaces. Product surfaces use shadcn/ui as the design system while retaining the skill's anti-slop rules.

## Component system

- **Only design system:** shadcn/ui, Radix foundation.
- **Complex reference blocks:** selected from 21st.dev, then adapted to these tokens.
- **Icons:** `@phosphor-icons/react`, one family across visible UI.
- **Not allowed:** HeroUI and `@heroui/*`.
- **Not allowed as an icon family:** Lucide. Some shadcn registry components may generate Lucide imports; replace them with Phosphor before shipping.

## Color

One accent family: deep teal.

| Token | Light | Dark | Purpose |
|---|---|---|---|
| `--primary` | `oklch(0.5 0.082 197)` | `oklch(0.76 0.086 192)` | Main action and active state |
| `--ring` | same as primary | same as primary | Keyboard focus |
| `--background` | near-white | cool near-black | Page surface |
| `--card` | near-white | elevated cool charcoal | Real hierarchy only |

There is no purple accent and no unrelated accent per feature.

### Semantic exception: review grades

Again, Hard, Good, and Easy must be distinguishable at a glance. Their red, amber, green, and blue values are semantic status colors, not competing brand accents. They are exposed as:

- `--color-grade-again`
- `--color-grade-hard`
- `--color-grade-good`
- `--color-grade-easy`

Do not reuse these for decorative UI.

## Shape

- Cards and panels: 12px (`rounded-xl`).
- Inputs: 8px (`rounded-lg`).
- Compact controls: scale derived from the same 12px base.
- Floating timer and intentionally pill-shaped controls: full radius.

A pill is used only when its behavior justifies it. Do not turn every badge or card into a pill.

## Type

- Interface: Geist.
- Numbers and elapsed time: Geist Mono with tabular figures.
- Japanese text: Noto Sans JP, applied explicitly with `font-jp` and `lang="ja"`.
- No serif.
- UI copy is English. Japanese meanings and glosses are Indonesian.

## Motion

- Default library: `motion/react`.
- Client-only leaf components own animations.
- Animate transform and opacity, not width, height, top, or left.
- Every animation honors `prefers-reduced-motion`.
- Timer collapse communicates reduced obstruction, so it is a motivated state transition.
- Focused review sessions stay mostly static.

## Layers

| Layer | z-index |
|---|---:|
| App header | 30 |
| Study timer | 40 |
| Dialog overlay | 50 |
| Toast | library default, above dialog |

Do not add arbitrary z-index values outside this scale without documenting a new layer.

## Accessibility

- WCAG AA minimum for text and controls.
- Labels remain above inputs; placeholders never replace labels.
- Keyboard focus uses `--ring`.
- Icon-only buttons always have an accessible name.
- Reduced motion yields instant state changes.
- Both light and dark themes must be checked before a feature is complete.
