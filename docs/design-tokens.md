# Hibi Design Tokens

## Design read

Personal daily-practice tool for a serious Japanese learner, in a **web-brutalist** language: square corners, thick strong borders, hard offset shadows (no blur), monospace-forward headings and labels, high contrast, one loud flat accent. Focused sessions stay dense and functional.

| Surface | Rawness | Motion intensity | Visual density |
|---|---:|---:|---:|
| Marketing and auth | 7 | 4 | 5 |
| App shell | 7 | 3 | 6 |
| Focused study session | 8 | 2 | 6 |

The installed `design-taste-frontend` skill is a brutalist skill and is used across all surfaces. Product surfaces still use shadcn/ui as the component base, restyled to the brutalist primitives below.

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

- **Square corners everywhere.** `--radius` is `0`, so every `rounded-*` utility resolves to 0. Do not add explicit `rounded-full`/`rounded-*` unless a control's behavior truly requires it (documented).
- **Thick, strong borders.** Default border is `2px` in the strong foreground color (the unlayered `.border` rule in `globals.css` bumps every `border` utility to 2px). Structural dividers use `border-2`/`border-4` on the foreground. Faint hairline-gray borders are not used.
- **Hard offset shadows, no blur.** Use `.shadow-brutal` (`4px 4px 0 0 foreground`) or `.shadow-brutal-sm` (`3px 3px 0`). Never soft blurred shadows.
- **Press-into-shadow.** Interactive elements shift into their shadow on `:active` (Button variants do this; `.press-brutal` is the reusable helper).

A pill/full radius is used only when behavior justifies it (e.g. the floating timer), and is the documented exception.

## Type

- Interface body: Geist (sans), for readable long text.
- **Headings and labels: Geist Mono, uppercase** — applied via the `font-heading` utility (`--font-heading` is the mono family; `globals.css` adds `text-transform: uppercase`). This is the brutalist display voice.
- Numbers and elapsed time: Geist Mono with tabular figures.
- Japanese text: Noto Sans JP, applied explicitly with `font-jp` and `lang="ja"`, and kept `normal-case` so kana/kanji are never uppercased.
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
