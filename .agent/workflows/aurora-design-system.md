---
description: Aurora design system reference — use when translating mobile screens to web pages.
---

# Aurora Design System — Reference

Canonical source of truth for UI patterns used across the Aurora mobile app. Reference this when building or refactoring web pages to ensure **exact visual parity** with the mobile version.

---

## 0. Workflow Rules

### Implementation Mode

The **user** implements all code changes. The AI assistant operates in **Ask mode** (read-only) and provides:

- Complete, copy-paste-ready code snippets with exact file paths
- Small, focused batches (not guides or partial implementations)
- Every variable declared must be used; no dead code

### Visual Parity Goal

The web version must look **exactly like the mobile version** — same color scheme, same dark theme, same component styling. The only differences should be **layout adaptations** for desktop/tablet viewport widths:

- Mobile's single-column stacked layout → responsive multi-column grids where appropriate
- Mobile's bottom tab bar → desktop sidebar + mobile bottom nav (already implemented in layouts)
- Mobile's full-screen modals → centered overlay dialogs
- Mobile's swipe gestures → click/hover interactions

**Do NOT substitute the light web theme for the mobile dark theme.** The web must use the same AURORA dark palette.

---

## 1. Color Palette

### Primary Tokens (`src/constants/aurora-colors.ts`)

| Token | Hex / Value | Usage |
|-------|-------------|-------|
| `bg` | `#0B0D30` | Default screen background |
| `bgDeep` | `#080B25` | Counselor home, deeper sections |
| `bgMessages` | `#080C2A` | Messages screen background |
| `bgResources` | `#120B2E` | Resources screen background |
| `card` | `#10143C` | Card / surface background |
| `cardAlt` | `#0D1238` | Alternate card surface |
| `cardDark` | `#0A0C28` | Dark card variant |
| `navBg` | `#070A2E` | Navigation bar background |
| `blue` | `#2D6BFF` | Primary accent, links, active states |
| `blueLight` | `#4D8BFF` | Lighter blue accent |
| `purple` | `#7C3AED` | Purple accent |
| `purpleDeep` | `#4A00E0` | Deep purple (gradients) |
| `purpleBright` | `#8B2CF5` | Bright purple highlight |
| `green` | `#22C55E` | Success, approve actions |
| `amber` | `#FEBD03` | Warnings, pending states |
| `red` | `#EF4444` | Error, reject, destructive actions |
| `orange` | `#F97316` | Orange accent |
| `textPrimary` | `#FFFFFF` | Primary text on dark backgrounds |
| `textSec` | `#7B8EC8` | Secondary / descriptive text |
| `textMuted` | `#4B5693` | Muted / placeholder text |
| `border` | `rgba(255,255,255,0.08)` | Default card & divider borders |
| `borderLight` | `rgba(255,255,255,0.12)` | Slightly brighter borders |

### Mood Colors

| Emotion | Hex |
|---------|-----|
| Joy / Happy | `#FEBD03` |
| Sadness / Sad | `#086FE6` |
| Anger / Angry | `#F90038` |
| Surprise | `#FF7105` |
| Neutral | `#94A3B8` |

### Semantic RGBA Overlays (recurring patterns)

| Purpose | Value |
|---------|-------|
| Blue icon well | `rgba(45,107,255,0.12)` to `rgba(45,107,255,0.2)` |
| Blue border accent | `rgba(45,107,255,0.35)` to `rgba(45,107,255,0.4)` |
| Purple insight bg | `rgba(124,58,237,0.15)` to `rgba(124,58,237,0.25)` |
| Purple insight border | `rgba(124,58,237,0.3)` |
| Green approve bg | `rgba(34,197,94,0.2)` |
| Green approve border | `rgba(34,197,94,0.4)` |
| Red reject bg | `rgba(239,68,68,0.15)` |
| Red reject border | `rgba(239,68,68,0.3)` |
| Amber pending bg | `rgba(245,158,11,0.15)` |
| Amber pending border | `rgba(245,158,11,0.3)` |
| Modal overlay | `rgba(0,0,0,0.5)` (sometimes `0.55`) |
| Glass tab tint | `rgba(7,10,46,0.38)` |
| Glass tab border | `rgba(255,255,255,0.16)` |

---

## 2. Typography

### Font Sizes (React Native `fontSize` values)

| Scale | Size | Usage |
|-------|------|-------|
| Micro | `8–10` | Timestamps, dot labels, metadata |
| Caption | `11–12` | Section labels, badges, secondary info |
| Body | `13–14` | Descriptions, card body text |
| Name | `15–16` | User names, card titles |
| Section title | `18–20` | Section headings |
| Page title | `22–28` | Screen titles, hero numbers |
| Stat number | `28–32` | Large stat display values |

### Font Weights

| Weight | Usage |
|--------|-------|
| `400` | Body text, descriptions |
| `500` | Metadata, subtle emphasis |
| `600` | Names, labels, badges, buttons |
| `700` | Section headings, card titles, CTAs |
| `800` | Page titles, stat numbers, primary headings |

### Letter Spacing

- Uppercase section labels: `0.8` to `1.5`
- Badge / chip labels: `0.5`
- All other text: default (0)

---

## 3. Spacing System

### Screen-Level

| Area | Value |
|------|-------|
| Screen horizontal padding | `16–20` |
| Screen top padding (inside SafeArea) | `16–20` |
| Screen bottom padding | `32–40` (+ tab bar clearance) |
| Tab bar clearance | `~80–85` (varies by role) |

### Section-Level

| Area | Value |
|------|-------|
| Section title margin-bottom | `12–16` |
| Between sections | `16–24` |
| Between section header and content | `8–12` |

### Card / Row-Level

| Area | Value |
|------|-------|
| Card padding | `14–20` |
| Card gap (between cards) | `10–12` |
| Row horizontal padding | `16–20` |
| Row vertical padding | `12–16` |
| Internal row gap | `8–14` |
| Icon-to-text gap | `6–14` |

---

## 4. Border Radius

| Size | Value | Usage |
|------|-------|-------|
| XS | `4` | Dot indicators, tiny elements |
| SM | `8` | Small badges, status pills |
| MD | `10–12` | Buttons, input fields, toggles, chips |
| LG | `14–16` | Cards, list rows, carousel items |
| XL | `18` | Large cards, chat bubbles |
| 2XL | `20–24` | Modal sheets (top corners), avatars, search bars |
| Full | `28–36` | FAB, tab bar pill, full-round elements |

---

## 5. Shadows

Shadows are used sparingly — most cards use flat `borderWidth: 1` with `AURORA.border` instead of shadows.

| Element | Shadow Values |
|---------|---------------|
| Mood selected bubble | `shadowColor` = emotion color, `shadowOpacity: 0.7`, `shadowRadius: 10`, `elevation: 8` |
| FAB (floating action button) | `shadowColor: '#000'`, `shadowOpacity: 0.5`, `shadowRadius: 12`, `elevation: 8` |
| Tab bar | `shadowColor: '#000'`, `shadowOffset: {0, 10}`, `shadowOpacity: 0.35`, `shadowRadius: 20`, `elevation: 20` |
| Primary CTA | `shadowOffset: {0, 3–4}`, `shadowOpacity: 0.4–0.5` |
| General cards | **No shadow** — flat border only |

---

## 6. Component Patterns

### Cards

```
Background:  AURORA.card (#10143C)
Border:      1px AURORA.border (rgba(255,255,255,0.08))
Radius:      14–16
Padding:     14–20
Gap:         10–12 between cards
```

### Status Badges

```
Pattern:     Colored background + matching text
Radius:      8
Padding:     horizontal 10, vertical 4
Font:        12, weight 600

Pending:     bg rgba(245,158,11,0.2)  text #F59E0B
Approved:    bg rgba(34,197,94,0.2)   text #22C55E
Rejected:    bg rgba(239,68,68,0.2)   text #EF4444
```

### Action Buttons (Approve / Reject style)

```
Layout:      flex row, centered, gap 6
Radius:      10
Padding:     vertical 10
Border:      1px with matching rgba color
Background:  Low-opacity rgba of accent color
Icon:        18px
Text:        14, weight 600
Disabled:    opacity via !!updatingId check
```

### Icon Wells (circular icon containers)

```
Size:        48×48 (large) or 36×36 (medium)
Radius:      50% (24 or 18)
Background:  rgba(45,107,255,0.2) for blue
             rgba(124,58,237,0.15) for purple
             Other accent rgbas as needed
Icon size:   24 (large) or 20 (medium)
```

### Section Headers

```
Title:       18–20, weight 700–800, color #FFFFFF
Add button:  Row layout, radius 12
             bg rgba(45,107,255,0.15)
             border 1px rgba(45,107,255,0.4)
             icon 18, text 13 weight 700, color AURORA.blue
```

### Warning / Info Banners

```
Radius:      12
Padding:     14
Border:      1px with accent rgba
Background:  Low-opacity rgba of accent color
Text:        14, weight 600, accent color
```

### Bottom Sheet Modals

```
Overlay:     rgba(0,0,0,0.5)
Sheet bg:    AURORA.bg (#0B0D30)
Top radius:  24
Handle:      40×4, radius 2, bg AURORA.border
Header:      row, space-between, px 20, py 16–20
             border-bottom 1px AURORA.border
Close icon:  X, 22px, color AURORA.textSec
Title:       18, weight 700, color #FFFFFF
Body:        padding 20, scrollable
```

### Form Inputs (Aurora dark theme)

```
Background:  AURORA.card
Radius:      12
Border:      1px AURORA.border
Text color:  #FFFFFF
Font:        15
Padding:     horizontal 14, vertical 12
Placeholder: AURORA.textMuted
Textarea:    minHeight 100, textAlignVertical 'top'
```

### Form Labels

```
Color:       AURORA.textSec
Font:        12, weight 600
Spacing:     letterSpacing 0.5
Margin:      bottom 8
```

### Primary Submit Button

```
Background:  AURORA.blue (#2D6BFF)
Radius:      14
Padding:     vertical 14
Text:        16, weight 700, color #FFFFFF
Disabled:    opacity 0.6
```

### Target Role Selector (Announcements)

```
Layout:      row, gap 8
Button:      flex 1, py 10, px 12, radius 12
             border 1px AURORA.border, bg AURORA.card
Active:      border AURORA.blue, bg rgba(45,107,255,0.15)
Text:        12, weight 600, AURORA.textSec
Active text: AURORA.blue
```

---

## 7. Empty & Loading States

### Loading

```
Centered ActivityIndicator, size "large", color AURORA.blue
Often full-flex container with centered content
```

### Empty State

```
Centered vertically, padding 40–60
Icon:     48px, color AURORA.textMuted, marginBottom 12
Title:    16, color AURORA.textSec
Subtitle: 13, color AURORA.textMuted, marginTop 4, text-center
```

### Pull to Refresh

```
RefreshControl tintColor: AURORA.blue
```

### Disabled / Updating

```
Buttons: opacity set by disabled prop
Inline spinner: ActivityIndicator size "small" with matching accent color
```

---

## 8. Navigation Patterns

### Screen Headers (stack screens)

```
Row layout, centered vertically
Padding:   horizontal 20, vertical 16
Border:    bottom 1px AURORA.border
Back:      ArrowLeft 22px, color #FFFFFF, padding 4, marginRight 12
Title:     18, weight 700, color #FFFFFF
```

### Tab Bar (floating glass)

```
Position:    absolute bottom 20
Height:      72
Radius:      36 (pill shape)
Background:  BlurView intensity 58, tint "dark"
Tint:        rgba(7,10,46,0.38)
Border:      hairline rgba(255,255,255,0.16)
Shadow:      black, offset (0,10), opacity 0.35, radius 20
Icons:       focused 24px, unfocused 22px
Labels:      10, weight 600
Colors:      active AURORA.blue, inactive AURORA.textMuted
Active pill:  rgba(45,107,255,0.2), border rgba(45,107,255,0.35), radius 16
```

---

## 9. Web Translation Quick Reference

When translating these mobile patterns to web (Tailwind CSS v4):

| Mobile (RN) | Web (Tailwind) |
|--------------|----------------|
| `AURORA.bg` (#0B0D30) | `bg-[#0B0D30]` or add as custom token — **match the mobile hex exactly** |
| `AURORA.card` (#10143C) | `bg-[#10143C]` with `border border-white/8 rounded-[14px]` |
| `AURORA.blue` (#2D6BFF) | `text-[#2D6BFF]` / `bg-[#2D6BFF]` |
| `AURORA.green` (#22C55E) | `text-green-500` / `bg-green-500` |
| `AURORA.red` (#EF4444) | `text-red-500` / `bg-red-500` |
| `AURORA.textPrimary` (#FFF) | `text-white` |
| `AURORA.textSec` (#7B8EC8) | `text-[#7B8EC8]` |
| `AURORA.textMuted` (#4B5693) | `text-[#4B5693]` |
| `AURORA.border` | `border-white/8` |
| `AURORA.borderLight` | `border-white/12` |
| `rgba(45,107,255,0.15)` | `bg-[rgba(45,107,255,0.15)]` or `bg-[#2D6BFF]/15` |
| `rgba(45,107,255,0.4)` | `border-[#2D6BFF]/40` |
| `borderRadius: 14` | `rounded-[14px]` |
| `borderRadius: 24` | `rounded-3xl` |
| `fontSize: 18, fontWeight: 700` | `text-lg font-bold` |
| `fontSize: 24, fontWeight: 800` | `text-2xl font-extrabold` |
| `padding: 20` | `p-5` |
| `gap: 14` | `gap-3.5` |
| `StyleSheet modal overlay` | Fixed overlay div with `bg-black/50` |
| `View + SafeAreaView` | `<div>` with proper padding |
| `ScrollView` | Native scrolling (`overflow-y-auto`) |
| `TouchableOpacity` | `<button>` with `cursor-pointer` |
| `ActivityIndicator` | `animate-spin rounded-full border-b-2 border-[#2D6BFF]` spinner div |
| `lucide-react-native` | `lucide-react` (same icon names) |
| `expo-haptics` | Omit (no web equivalent) |
| `Alert.alert()` | `window.confirm()` or custom modal |

### Theme Directive

The web **must use the same dark theme** as mobile. Both platforms share the AURORA dark palette:

- **Do** use `AURORA.bg` (#0B0D30) as the page/layout background
- **Do** use `AURORA.card` (#10143C) for card surfaces
- **Do** use white text on dark backgrounds, matching the mobile hierarchy
- **Do** use the same rgba overlays for badges, icon wells, and accents
- **Do** preserve web font families: `font-heading` (Buenos Aires), `font-body` (Euclid Circular A)
- **Do** keep pre-built web utilities where they already match (`btn-aurora`, `gradient-aurora`, etc.)
- **Do** add new Tailwind tokens to `src/index.css` `@theme` block if needed to avoid excessive arbitrary values

### Layout Adaptations (web only)

The only differences from mobile should be structural layout changes for larger viewports:

- **Sidebar navigation** (desktop) + **bottom tab bar** (mobile breakpoint) — already implemented in layout files
- **Multi-column grids** where mobile stacks single-column (e.g., stat cards, resource lists)
- **Centered overlay dialogs** instead of full-screen bottom sheets
- **Wider content areas** with `max-w-7xl` constraint
- **Hover states** replacing touch feedback

---

## 10. Gradient Patterns

Used sparingly in mobile:

| Context | Colors |
|---------|--------|
| Profile save button | `['#4A00E0', '#8E2DE2', '#00C6FF']` |
| Web hero/loading | `linear-gradient(135deg, #3257FE, #010632)` — via `gradient-aurora` |
| Web light bg | `linear-gradient(135deg, #E4E3DF, #F0F4FF)` — via `gradient-aurora-light` |
| Web buttons | `btn-aurora` (blue-to-green gradient) |

---

## 11. Interaction Conventions

| Pattern | Mobile | Web |
|---------|--------|-----|
| Tap feedback | `activeOpacity={0.7–0.85}` | `hover:` states + `cursor-pointer` |
| Haptic | `triggerHaptic('light')` on taps | Omit |
| Pull to refresh | `RefreshControl` | Refresh button with `RefreshCw` icon |
| Swipe actions | Gesture-based | Click-based actions |
| Bottom sheets | `Modal` + `animationType="slide"` | Fixed overlay + centered/bottom card |
| Confirmations | `Alert.alert()` with buttons | `window.confirm()` or custom dialog |
| Navigation | `router.push()` / `router.back()` | `useNavigate()` / `<Link>` |
