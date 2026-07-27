# Blockmind Labs — Claude × ElevenLabs Hybrid Design System

## Overview
A warm, editorial design system inspired by Claude's terracotta-and-cream aesthetic and ElevenLabs' precision minimalism. Combines Claude's organic warmth with ElevenLabs' technical sophistication.

---

## Color Palette

### Light Theme (Landing Page)

#### Canvas & Surfaces
| Token | Hex | Usage |
|-------|-----|-------|
| `--bg` | `#FAF9F5` | Page background — warm parchment |
| `--bg-soft` | `#F5F3EE` | Subtle background alternation |
| `--bg-band` | `#EDEBE4` | Section bands, code blocks |
| `--surface` | `#FFFFFF` | Card surfaces |
| `--surface-soft` | `#FAF9F5` | Nested surfaces |
| `--surface-hover` | `#F5F3EE` | Hover states |

#### Text
| Token | Hex | Usage |
|-------|-----|-------|
| `--text` | `#141413` | Primary text — warm near-black |
| `--text-strong` | `#292524` | Headlines, emphasis |
| `--text-muted` | `#777169` | Secondary text |
| `--text-soft` | `#A8A29E` | Tertiary, placeholders |
| `--text-faint` | `#D6D3CC` | Disabled, decorative |

#### Brand & Accent
| Token | Hex | Usage |
|-------|-----|-------|
| `--brand` | `#C15F3C` | Terracotta — primary accent |
| `--brand-hover` | `#A8503A` | Hover state |
| `--brand-active` | `#8F4332` | Active/pressed state |
| `--brand-soft` | `rgba(193, 95, 60, 0.08)` | Brand tint |
| `--brand-faint` | `rgba(193, 95, 60, 0.04)` | Brand subtle |

#### Borders
| Token | Hex | Usage |
|-------|-----|-------|
| `--border` | `#E5E3DC` | Default borders |
| `--border-soft` | `#EDEBE4` | Subtle dividers |
| `--border-strong` | `#D6D3CC` | Emphasis borders |

#### Semantic
| Token | Hex | Usage |
|-------|-----|-------|
| `--success` | `#3D7A45` | Success states |
| `--warning` | `#B58D1A` | Warning states |
| `--danger` | `#C44B3F` | Error states |
| `--info` | `#4A7FB5` | Information |

### Dark Theme (Chat Interface)

#### Canvas & Surfaces
| Token | Hex | Usage |
|-------|-----|-------|
| `--bg` | `#0A0A09` | Page background — studio dark |
| `--bg-soft` | `#141413` | Subtle background |
| `--surface` | `#1C1917` | Card surfaces |
| `--surface-soft` | `#292524` | Elevated surfaces |
| `--surface-hover` | `#3D3D3A` | Hover states |

#### Text
| Token | Hex | Usage |
|-------|-----|-------|
| `--text` | `#FAF9F5` | Primary text — warm white |
| `--text-strong` | `#FFFFFF` | Headlines |
| `--text-muted` | `#A8A29E` | Secondary text |
| `--text-soft` | `#777169` | Tertiary |
| `--text-faint` | `#57534E` | Disabled |

#### Brand (Dark)
| Token | Hex | Usage |
|-------|-----|-------|
| `--brand` | `#D97A5C` | Lighter terracotta for dark |
| `--brand-hover` | `#E89070` | Hover (lighter in dark) |
| `--brand-soft` | `rgba(217, 122, 92, 0.15)` | Brand tint |

#### Borders (Dark)
| Token | Hex | Usage |
|-------|-----|-------|
| `--border` | `rgba(255, 255, 255, 0.08)` | Subtle hairlines |
| `--border-strong` | `rgba(255, 255, 255, 0.15)` | Emphasis |

---

## Typography

### Font Stack
- **Display**: `Georgia, 'Times New Roman', serif` (editorial authority)
- **Body**: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
- **Mono**: `'JetBrains Mono', 'Fira Code', ui-monospace, monospace`

### Type Scale
| Role | Size | Weight | Line Height | Tracking |
|------|------|--------|-------------|----------|
| Display | 72px (4.5rem) | 400 | 1.05 | -0.02em |
| H1 | 56px (3.5rem) | 400 | 1.10 | -0.015em |
| H2 | 40px (2.5rem) | 500 | 1.20 | -0.01em |
| H3 | 28px (1.75rem) | 500 | 1.30 | -0.005em |
| H4 | 20px (1.25rem) | 500 | 1.40 | 0em |
| Body | 16px (1rem) | 400 | 1.60 | 0.01em |
| Body Small | 14px (0.875rem) | 400 | 1.50 | 0.01em |
| Caption | 12px (0.75rem) | 500 | 1.40 | 0.05em |
| Overline | 11px (0.6875rem) | 500 | 1.60 | 0.1em |

### Principles
- **Serif for headlines**: Georgia carries editorial authority
- **Sans for UI**: Inter handles all functional elements
- **Weight 400-500 only**: No bold headlines — medium is the ceiling
- **Positive tracking on small text**: Airy readability

---

## Spacing Scale
| Token | Value | Usage |
|-------|-------|-------|
| `--space-1` | 4px | Tight gaps |
| `--space-2` | 8px | Small gaps |
| `--space-3` | 12px | Compact padding |
| `--space-4` | 16px | Standard padding |
| `--space-5` | 20px | Medium gaps |
| `--space-6` | 24px | Card padding |
| `--space-8` | 32px | Section gaps |
| `--space-10` | 40px | Large gaps |
| `--space-12` | 48px | Section padding |
| `--space-16` | 64px | Major sections |
| `--space-20` | 80px | Hero spacing |
| `--space-24` | 96px | Page margins |

---

## Border Radius
| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 6px | Small elements |
| `--radius-md` | 8px | Inputs, standard cards |
| `--radius-lg` | 12px | Featured cards |
| `--radius-xl` | 16px | Hero containers |
| `--radius-2xl` | 24px | Large containers |
| `--radius-full` | 9999px | Pill buttons, badges |

---

## Shadows

### Light Theme
```css
/* Whisper — barely visible */
--shadow-sm: 0 1px 2px rgba(20, 20, 19, 0.04);

/* Standard card */
--shadow-md: 0 1px 3px rgba(20, 20, 19, 0.04),
             0 4px 12px rgba(20, 20, 19, 0.02);

/* Elevated */
--shadow-lg: 0 4px 8px rgba(20, 20, 19, 0.04),
             0 12px 32px rgba(20, 20, 19, 0.03);

/* Ring shadow (interactive states) */
--ring: 0 0 0 1px rgba(20, 20, 19, 0.08);
```

### Dark Theme
```css
/* Cards use ring, not shadow */
--shadow-card: 1px solid rgba(255, 255, 255, 0.06);

/* Glow effect for active elements */
--glow-brand: 0 0 24px rgba(217, 122, 92, 0.15);
```

---

## Buttons

### Primary (Pill)
```css
.btn-primary {
  background: #C15F3C;
  color: #FFFFFF;
  border-radius: 9999px;
  padding: 12px 24px;
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.01em;
  transition: all 150ms ease;
}
.btn-primary:hover {
  background: #A8503A;
  box-shadow: 0 2px 8px rgba(193, 95, 60, 0.25);
}
```

### Secondary (Pill)
```css
.btn-secondary {
  background: transparent;
  color: #141413;
  border: 1px solid #E5E3DC;
  border-radius: 9999px;
  padding: 12px 24px;
  font-weight: 500;
}
.btn-secondary:hover {
  background: #FAF9F5;
  border-color: #D6D3CC;
}
```

### Ghost
```css
.btn-ghost {
  background: transparent;
  color: #777169;
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
}
.btn-ghost:hover {
  background: rgba(20, 20, 19, 0.04);
  color: #141413;
}
```

---

## Cards

### Standard Card
```css
.card {
  background: #FFFFFF;
  border: 1px solid #E5E3DC;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(20, 20, 19, 0.04),
              0 4px 12px rgba(20, 20, 19, 0.02);
  transition: all 200ms ease;
}
.card:hover {
  border-color: #D6D3CC;
  box-shadow: 0 4px 8px rgba(20, 20, 19, 0.04),
              0 12px 32px rgba(20, 20, 19, 0.03);
  transform: translateY(-1px);
}
```

### Dark Card (Chat)
```css
.card-dark {
  background: #1C1917;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
}
```

---

## Navigation
```css
.nav {
  background: rgba(250, 249, 245, 0.92);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid #E5E3DC;
  height: 64px;
}
```

---

## Hero Section
```css
.hero {
  background: #0A0A09; /* Dark cinematic */
  color: #FAF9F5;
  position: relative;
  overflow: hidden;
}
.hero::before {
  /* Gradient orb — ElevenLabs style */
  content: '';
  position: absolute;
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(193, 95, 60, 0.15) 0%, transparent 70%);
  top: -200px;
  right: -100px;
  pointer-events: none;
}
```

---

## Dark Sections (ElevenLabs Pattern)
- Use `#0A0A09` for product demos, code showcases
- Use `#1C1917` for elevated dark surfaces
- Alternate light/dark sections for visual rhythm
- Dark sections use warm white text (#FAF9F5)

---

## Animations
```css
/* Transitions */
--duration-fast: 150ms;
--duration-normal: 200ms;
--duration-slow: 300ms;

/* Easing */
--ease-out: cubic-bezier(0.0, 0.0, 0.2, 1);
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);

/* Hover lift */
.card:hover { transform: translateY(-1px); }

/* Button press */
.btn:active { transform: scale(0.98); }
```

---

## File Structure
```
apps/chat-pwa/src/
├── tokens.css      # Design tokens (colors, spacing, typography)
├── landing.css     # Landing page (light theme)
├── components.css  # Chat components (dark theme)
├── layout.css      # Chat layout (dark theme)
```

---

## Key Principles
1. **Warm over cool**: Every neutral has yellow/brown undertone
2. **Serif for headlines**: Georgia brings editorial authority
3. **Pill buttons**: 9999px radius for all CTAs
4. **Ring shadows**: Interactive states use ring, not drop shadow
5. **Dark sections**: Use for product demos, code, contrast
6. **Generous whitespace**: Let content breathe
7. **Subtle depth**: Shadows at <5% opacity
