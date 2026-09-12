# Mosaic — Visual Style Guide

Extracted from the working product (`src/app/globals.css`, `src/components/ui/`).
Paste this whole file into a chat when asking for slides, so the deck and the
demo recording look like the same company made them.

---

## 1. The idea in one line

Warm paper, ink text, evergreen accent, and an **earthy risk ramp** — brick,
ochre, sage — deliberately instead of stoplight red/amber/green. It should read
as a considered clinical tool, not a dashboard. Calm, printed, humane.

Two rules carry most of the character:

- **Nothing floats.** Surfaces are separated by hairline borders, not shadows.
  There are exactly two drop shadows in the entire application.
- **The risk colours are muted on purpose.** These are real residents. A
  screaming red alert would be the wrong register.

---

## 2. Colour

### Grounds and surfaces

| Token | Hex | Use |
|---|---|---|
| paper | `#f2efe9` | Page background. The default slide background. |
| surface | `#fbfaf7` | Slightly lifted panel on paper |
| raised | `#ffffff` | Cards, the topmost layer |
| line | `#ded5c6` | Hairline borders, dividers |
| line-soft | `#eae3d7` | Quieter dividers inside a card |

### Text

| Token | Hex | Use |
|---|---|---|
| ink | `#191814` | Headlines and primary text. Near-black, never pure black. |
| ink-soft | `#45423a` | Body copy |
| muted | `#746d62` | Labels, captions, eyebrows |
| faint | `#9d9689` | Disabled, placeholder, least important |

### Accent — evergreen

| Token | Hex | Use |
|---|---|---|
| accent | `#0f6b4f` | Primary buttons, links, the brand colour |
| accent-deep | `#07422f` | Section header bars, hover states |
| accent-bright | `#16a06f` | Highlights, chart lines, emphasis |
| accent-soft | `#d8ebe1` | Tinted background behind accent text |

### Risk ramp — brick, ochre, sage

| Level | Solid | Soft background | Use |
|---|---|---|---|
| high | `#c23b1c` | `#fbe3da` | High isolation risk, alerts |
| mid | `#c4820a` | `#fcefd4` | Moderate risk, warnings |
| low | `#3f8a5c` | `#dfeee4` | Low risk, healthy, success |

Pair a solid with its soft as background plus foreground. Never use the solid as
a large fill except in an alert bar.

---

## 2b. The mark

Four rounded tiles in a 2x2 grid: three evergreen, one brick, with the two
diagonal tiles at 42% opacity. A mosaic, and a stand-in for the residents the
product is trying to fit together. The single brick tile is the resident at
risk — it is the whole product in one shape, so do not recolour it.

Files, both 24x24 viewBox scaled to 512px:

| File | Use |
|---|---|
| `public/mosaic-mark.svg` | Transparent. Preferred — scales cleanly. |
| `public/mosaic-mark.png` | Transparent, for tools that reject SVG. |
| `public/mosaic-mark-on-paper.svg` | Rounded paper tile behind it, for avatars and favicons. |
| `public/mosaic-mark-on-paper.png` | Same, raster. |

Geometry, if it has to be rebuilt: on a 24x24 canvas, four 9.5x9.5 rects with
2.5 corner radius at (1,1), (13.5,1), (1,13.5) and (13.5,13.5). Top-left
`#0f6b4f` full opacity, top-right and bottom-left `#0f6b4f` at 0.42,
bottom-right `#c23b1c` full opacity.

Pair it with the wordmark "Mosaic" set in Fraunces, weight 500.

---

## 3. Type

Three families, all on Google Fonts.

- **Fraunces** — display. Headlines, numbers that matter, the wordmark. Weight
  500, letter-spacing `-0.015em`, optical sizing on. Variable axes SOFT, WONK,
  opsz are in use, so the WONK axis is on-brand rather than a mistake.
- **Inter** — sans. All body copy, labels, UI text.
- **Geist Mono** — mono. Scores and figures only, always with tabular numerals
  so digits don't shift.

### Scale

Pick from this ladder. It replaced twenty-five ad-hoc sizes, so don't invent
steps between them.

| Name | Size | Line height | Use |
|---|---|---|---|
| display | 64px | 1.0 | Slide title, the one big number |
| headline | 44px | 1.1 | Section opener |
| title | 28px | 1.25 | Card heading, stat value |
| lead | 20px | 1.55 | Standfirst, pull quote |
| body | 16px | 1.6 | Body copy |
| caption | 14px | 1.5 | Secondary text |
| micro | 12px | 1.45 | Labels, footnotes |

### Eyebrow

The small label above a heading: 12px, weight 600, `letter-spacing: 0.09em`,
uppercase, colour `muted`. Used constantly. On a slide it is the best way to
label a section without adding a second heading.

---

## 4. Shape and surface

- **Radii**: `16px` for cards, `12px` for panels and buttons, `8px` for small
  controls, fully round for pills, badges and avatars.
- **Borders**: 1px solid `line` or `line-soft`. This is how separation is
  expressed.
- **Shadows**: effectively none. If something must lift, one soft large shadow
  at low opacity — never a stack of elevation levels.
- **Section headers**: a solid bar, `accent-deep` background with white text,
  12px radius, roughly 20px horizontal and 12px vertical padding. The alert
  variant swaps the background to `high`. This is the most recognisable element
  in the product — worth reusing on slides.

---

## 5. Translating this to slides

- **Background**: `paper` `#f2efe9` on every slide. Not white.
- **Title slide**: Fraunces at display size in `ink`, with an eyebrow in
  `muted` above it. Leave a lot of space.
- **One number per slide** where possible: Fraunces at 64px, the label beneath
  in `muted` at caption size. The statistics in this pitch are the argument.
- **Statistics about harm** (loneliness, dementia risk, staffing shortfall):
  `high` `#c23b1c` on `high-soft` `#fbe3da`. Muted brick, not alarm red.
- **Statistics about improvement**: `low` `#3f8a5c` on `low-soft` `#dfeee4`.
- **Product and brand moments**: `accent` `#0f6b4f`, or the `accent-deep` bar
  with white text for a section divider.
- **Charts**: single `accent-bright` line on paper, hairline `line` axes, no
  gridlines, no legend if one series. Labels in `muted` at micro size.
- **Screenshots**: they already sit on paper, so let them bleed to the edge
  rather than framing them in a white card.

### Avoid

- Pure white backgrounds and pure black text
- Drop shadows, gradients, glows
- Stoplight red and green
- A fourth typeface, or Fraunces for body copy
- Filling a slide with the accent colour

---

## 6. Motion, if the deck animates

Easing `cubic-bezier(0.2, 0.7, 0.3, 1)`, durations 400–800ms. Content rises 10px
while fading in. Staggered reveals step by roughly 60ms. Nothing bounces except
the logo mark, which uses `cubic-bezier(0.2, 1.25, 0.4, 1)`.

---

## 7. Copy tone

Matches the interface: plain, specific, unhurried. Full sentences. Say what
happened and what it means. No exclamation marks, no marketing verbs, no
"revolutionary" or "AI-powered". The product's own microcopy reads like
*"Filtered out: also at elevated isolation risk. Mosaic won't pair two
withdrawing residents."* — aim for that.
