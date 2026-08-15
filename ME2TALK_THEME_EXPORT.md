# Me2talk UI Theme Export

This document is a portable visual specification for apps in the me2talk ecosystem. It describes the current frontend theme and component conventions without coupling the consuming app to this repository.

## Design direction

- Dark-first, calm, modern, friendly, and slightly futuristic.
- The interface should feel lightweight and spacious rather than dense.
- Use mint for positive state, action emphasis, connectivity, and success.
- Use coral for errors, warnings, moderation, and destructive actions.
- Use blue sparingly for secondary actions and admin information.
- Prefer subtle translucent borders and surfaces over heavy solid outlines.
- Use rounded corners, but keep them moderate: `rounded-md` for controls and `rounded-lg`/`rounded-xl` for cards and dialogs.

## Typography

The current app does not load a web font. Use this exact system-first stack:

```css
font-family: Inter, ui-sans-serif, system-ui, -apple-system,
  BlinkMacSystemFont, "Segoe UI", sans-serif;
```

Typography scale used most often:

| Purpose | Size | Weight | Tailwind-style equivalent |
|---|---:|---:|---|
| Page hero title | 36–48px | 600 | `text-4xl sm:text-5xl font-semibold` |
| Section/card title | 18–24px | 600 | `text-lg` to `text-2xl font-semibold` |
| Room title/header | 16–18px | 600 | `text-base sm:text-lg font-semibold` |
| Body text | 14–16px | 400 | `text-sm` or `text-base` |
| Secondary body text | 14px | 400 | `text-sm text-white/55–70` |
| Labels | 12–14px | 500 | `text-xs`/`text-sm font-medium` |
| Metadata | 11–12px | 400–600 | `text-xs text-white/45` |
| Eyebrow/overline | 12–14px | 600 | `text-sm uppercase tracking-wide` |

Recommended line heights:

- Body: `1.5` to `1.75`.
- Headings: `1.15` to `1.3`.
- Long-form information pages: `leading-7` or approximately `1.75`.

Use `tracking-tight` for large headings and `tracking-wide`/`tracking-widest` only for uppercase labels.

## Color tokens

These are the core theme tokens from `frontend/tailwind.config.ts` and `frontend/src/styles.css`:

| Token | Hex | Usage |
|---|---|---|
| `ink` | `#0d1117` | Main page background |
| `panel` | `#141a23` | Cards, panels, chat/sidebar surfaces |
| `field` | `#1d2633` | Inputs, selects, inset controls |
| `mint` | `#45d483` | Primary positive action, success, active state |
| `coral` | `#ff7a59` | Error, warning, destructive/moderation action |
| Admin blue | `#258ff4` | Admin primary action |
| Admin blue hover | `#1d7edb` | Admin hover state |
| Light blue | `#55aaff` | Admin secondary data emphasis |
| Gold | `#ffd84d` | Supporter/reward/points emphasis |
| Primary text | `#f6f8fa` | Main text |

Common alpha treatments:

```text
bg-mint/10–15       positive tinted surface
border-mint/20–50   positive border
bg-coral/10–15      error/destructive tinted surface
border-coral/30–40  error border
bg-white/5          quiet control/surface
border-white/10     default border
text-white/45       metadata
text-white/55–70    secondary text
text-white/85–90    readable body text
```

The global page background also uses two soft radial glows:

```css
background:
  radial-gradient(circle at 12% 8%, rgba(69, 212, 131, 0.13), transparent 26rem),
  radial-gradient(circle at 88% 18%, rgba(255, 122, 89, 0.12), transparent 24rem),
  #0d1117;
```

## Layout and spacing

- Use a centered content container: `max-w-5xl` for information pages and `max-w-7xl` for admin/data-heavy pages.
- Horizontal page padding: `px-4 sm:px-6 lg:px-8`.
- Standard page vertical padding: `py-8`.
- Card padding: `p-4` for compact cards, `p-5` for normal cards, `p-6` for prominent dashboard cards.
- Component spacing: use Tailwind `gap-2`, `gap-3`, `gap-4`, and `gap-5`; avoid arbitrary spacing unless needed for alignment.
- Prefer responsive grids such as `grid gap-4 md:grid-cols-2 xl:grid-cols-4`.
- Tables should be wrapped in `overflow-x-auto` and given a practical `min-w-*` instead of being forced to collapse on mobile.
- Room UI is viewport-locked: `fixed inset-0 h-[100dvh] max-h-[100dvh] overflow-hidden`.

## Shape, borders, and elevation

```text
Controls: rounded-md
Cards: rounded-lg or rounded-xl
Pills/status badges: rounded-full
Default border: border-white/10
Strong focus border: focus:border-mint
Panel shadow: shadow-xl shadow-black/15
Modal/drawer shadow: shadow-2xl shadow-black/30–45
```

Use `backdrop-blur` for sticky/translucent headers and modal overlays. Keep shadows soft and dark; avoid large colored shadows except for intentional focus/glow states.

## Buttons and controls

Primary user action:

```tsx
className="inline-flex h-10 items-center justify-center gap-2 rounded-md
  bg-mint px-4 text-sm font-semibold text-ink transition
  hover:bg-mint/90 disabled:cursor-not-allowed disabled:opacity-40"
```

Secondary/quiet action:

```tsx
className="inline-flex h-9 items-center gap-2 rounded-md bg-white/5
  px-3 text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
```

Text input/select:

```tsx
className="h-11 w-full rounded-md border border-white/10 bg-field px-3
  text-sm text-white outline-none placeholder:text-white/30
  focus:border-mint"
```

Error notice:

```tsx
className="rounded-md border border-coral/40 bg-coral/15 px-4 py-3
  text-sm text-coral"
```

Success notice:

```tsx
className="rounded-md border border-mint/30 bg-mint/10 px-4 py-3
  text-sm text-mint"
```

## Surface hierarchy

Use this visual hierarchy consistently:

1. `ink`: app background.
2. `panel`: primary content surfaces and cards.
3. `field`: editable/inset controls.
4. `white/5` to `white/10`: quiet controls, table headers, secondary surfaces.
5. `mint`/`coral`/blue/gold: semantic emphasis only.

Do not use pure white cards in the dark product UI except for an explicitly branded third-party sign-in surface such as Google Sign-In.

## Navigation and headers

- Header height is compact: approximately `h-12` on room mobile layouts and `sm:h-16` on larger layouts.
- Use a thin `border-b border-white/10`.
- Keep the title left-aligned and truncate long names.
- Hide non-essential button labels on small screens; keep icons and accessible `aria-label`/`title`.
- Use `text-sm font-medium` for navigation actions and `text-xs uppercase tracking-widest` for product-area labels.

## Dialogs, drawers, and overlays

- Overlay: `fixed inset-0 z-50 bg-black/70 p-4 backdrop-blur-sm`.
- Dialog surface: `w-full max-w-md rounded-lg border border-white/10 bg-[#182635] p-5 shadow-2xl`.
- Larger editor surface: `max-w-2xl`.
- Close controls are icon buttons with `rounded-md p-2 text-white/50 hover:bg-white/10`.
- Stop pointer propagation inside the dialog when clicking the backdrop closes it.

## Avatars and status

- Avatar shapes are circular: `rounded-full`.
- Common sizes: 28px (`h-7 w-7`), 40px (`h-10 w-10`), and 96px (`h-24 w-24`).
- Use a subtle border: `border border-white/15`.
- Fallback avatars may use a mint/white/coral gradient with `shadow-inner`.
- Presence indicators use small circles; mint means active/connected and coral means unavailable/error.

## Responsive behavior

- Base styles target narrow mobile first.
- Add `sm:` for wider controls and page padding, `md:` for two-column forms/grids, and `lg:`/`xl:` for desktop sidebars and dashboards.
- Chat drawers become static side panels on large screens (`lg:static lg:translate-x-0`).
- Keep touch targets at least 36–44px high (`h-9`, `h-10`, `h-11`, or `h-12`).
- Never rely on hover alone for essential actions; provide click/touch equivalents.
- Use `min-w-0 truncate` for usernames, room names, and email addresses.

## Accessibility and interaction

- Maintain visible `focus:border-mint` or an equivalent focus ring.
- Every icon-only button needs an accessible label and/or title.
- Keep semantic status colors paired with text or icons; color alone must not communicate the state.
- Disable buttons during async work and use `disabled:opacity-40` or `disabled:opacity-60`.
- Use `aria-modal`, `role="dialog"`, and `aria-labelledby` for modal editors.
- Preserve readable contrast for body text; use white alpha values above `/45` only for metadata.

## Copy-paste implementation brief for another Codex task

```text
Apply the Me2talk ecosystem theme to this app.

Use a dark-first UI with:
- Font stack: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif.
- Background: #0d1117 (ink), with subtle mint and coral radial glows.
- Surfaces: #141a23 (panel), #1d2633 (field).
- Mint #45d483 for primary positive actions and active states.
- Coral #ff7a59 for errors and destructive actions.
- Admin/secondary blue #258ff4, hover #1d7edb, light blue #55aaff.
- Gold #ffd84d for supporter/reward emphasis.

Use rounded-md controls, rounded-lg/rounded-xl cards, rounded-full badges,
border-white/10 borders, soft dark shadows, and restrained translucent white
surfaces. Use 36–48px semibold page headings, 18–24px semibold section titles,
14–16px body text, and 11–12px metadata. Use max-w-5xl for content pages and
max-w-7xl for admin/data pages, with px-4 sm:px-6 lg:px-8 and mobile-first
responsive grids. Keep room layouts viewport-locked and make tables horizontally
scrollable on mobile. Preserve visible focus states, accessible icon labels,
44px-ish touch targets, and semantic text alongside status colors.

Do not introduce a different font, light theme, saturated gradients, excessive
rounded pills, or unrelated visual redesigns. Reuse these tokens in the target
app's own design-token system instead of copying arbitrary component markup.
```

## Source of truth in this repository

- Global font/background: `frontend/src/styles.css`
- Tailwind color and shadow tokens: `frontend/tailwind.config.ts`
- Representative room layout: `frontend/src/components/RoomPage.tsx`
- Representative cards/forms: `frontend/src/components/HomePage.tsx`
- Representative information-page typography: `frontend/src/components/InfoPage.tsx`
- Representative data/admin layout: `frontend/src/components/admin/AdminApp.tsx`
