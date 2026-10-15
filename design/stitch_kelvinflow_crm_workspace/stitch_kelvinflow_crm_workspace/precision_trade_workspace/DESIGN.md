---
name: Precision Trade Workspace
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#434655'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#747686'
  outline-variant: '#c4c5d7'
  surface-tint: '#2151da'
  primary: '#0037b0'
  on-primary: '#ffffff'
  primary-container: '#1d4ed8'
  on-primary-container: '#cad3ff'
  inverse-primary: '#b7c4ff'
  secondary: '#565e74'
  on-secondary: '#ffffff'
  secondary-container: '#dae2fd'
  on-secondary-container: '#5c647a'
  tertiary: '#004e47'
  on-tertiary: '#ffffff'
  tertiary-container: '#00685f'
  on-tertiary-container: '#7be7d9'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dce1ff'
  primary-fixed-dim: '#b7c4ff'
  on-primary-fixed: '#001551'
  on-primary-fixed-variant: '#0039b5'
  secondary-fixed: '#dae2fd'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3f465c'
  tertiary-fixed: '#89f5e7'
  tertiary-fixed-dim: '#6bd8cb'
  on-tertiary-fixed: '#00201d'
  on-tertiary-fixed-variant: '#005049'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  headline-lg:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Geist
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Geist
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Geist
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: -0.005em
  body-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.02em
  mono-num-lg:
    fontFamily: JetBrains Mono
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.02em
  mono-num-md:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: -0.01em
  mono-num-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 14px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-sm: 0.75rem
  gutter-lg: 1.5rem
  margin: 1.5rem
  margin-mobile: 0.75rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style

This design system is built strictly for high-density, high-accuracy global trade quotation processing. The brand personality balances engineering rigor with immediate cognitive legibility: pragmatic, silent, dependable, and swift. It rejects consumer-facing marketing flair, aggressive gradients, decorative illustrations, and superfluous micro-interactions in favor of utilitarian speed.

The design movement combines **Corporate Modern** with **Technical Minimalism**, inspired by high-performance operational tools like Essor CRM. It serves international sales representatives, supply chain operators, and quote desk analysts who spend 8+ hours a day cross-referencing multi-currency line items, HS codes, and AI-parsed inquiry documents. The visual tone must evoke absolute control and reliability—every visual artifact exists solely to reduce input error, accelerate document ingestion, and surface actionable quote decisions.

## Colors

The application operates on an intentional, low-glare light canvas designed for all-day legibility across dense data tables and multi-column comparison sheets.

### Foundation & Surfaces
- **App Canvas**: `#F5F5F7` provides a clean, neutral workspace foundation that distinguishes structural panels from white content cards without harsh contrast.
- **Surface Pure White**: `#FFFFFF` for the fixed navigation sidebar, document preview panes, data cards, and input panels.
- **Surface Subdued / Zebra Stripe**: `#F8FAFC` for alternate table rows, read-only calculation tiles, and code/tag blocks.

### Primary & Action
- **Primary Cobalt**: `#1D4ED8` serves as the single focal anchor across the workspace. Used exclusively for primary interactive commitments (generate quote, finalize terms), active navigation tabs, and system focus rings.
- **Primary Hover**: `#1E40AF`
- **Primary Subdued / Tint**: `#EFF6FF` for selected table rows and primary badge backgrounds.

### Status Indicators (Pill Badges & Ingestion States)
To support instantaneous status recognition across multi-line quotation requests, badges follow standardized semantic pairs:
- **Parsed / Approved (Green)**: Surface `#ECFDF5`, Border `#A7F3D0`, Text `#047857`
- **Pending / Action Required (Amber)**: Surface `#FFFBEB`, Border `#FDE68A`, Text `#B45309`
- **Error / Parsing Failed (Red)**: Surface `#FEF2F2`, Border `#FECACA`, Text `#B91C1C`
- **Draft / Inactive (Slate)**: Surface `#F1F5F9`, Border `#E2E8F0`, Text `#475569`

### Neutral Hierarchy & Borders
- **Text Headings / Values**: `#0F172A` (Slate 900)
- **Text Body**: `#334155` (Slate 700)
- **Text Muted / Secondary Meta**: `#64748B` (Slate 500)
- **Text Placeholder / Disabled**: `#94A3B8` (Slate 400)
- **Border Default**: `#E2E8F0` (Slate 200) for structural card frames, dividers, and input borders.
- **Border Subtle**: `#F1F5F9` (Slate 100) for inner grid lines and row separators.

## Typography

Typography prioritizes tabular precision, strict alignment, and immediate bilingual readability across Chinese trade documentation and Western commercial invoicing.

- **Headlines (`Geist`)**: Used sparingly for page headers, modal titles, and section dividers. Tight tracking and crisp geometry anchor functional views without dominating screen real estate.
- **Body & UI Controls (`Inter`)**: Used across standard UI interactions, form fields, and narrative message bodies. Inter’s open counters and unified baseline guarantee clarity in Chinese–English paired sentences.
- **Data, Figures & Currency (`JetBrains Mono`)**: Applied to all FOB/CIF figures, SKU identifiers, HS codes, exchange rates, and quantities. Tabular numerals ensure vertical columns remain perfectly aligned when scrolling down quotation matrices.

## Layout & Spacing

The workspace enforces a fixed-fluid hybrid architecture optimized for desktop wide-screen productivity:

- **Sidebar Anchor**: Fixed `224px` left rail, non-collapsible on standard desktops (collapsible into an overlay drawer below `1024px`).
- **Main Canvas Grid**: A fluid 12-column layout sits inside the remaining viewport. It features a horizontal page margin of `1.5rem` (24px) and an internal column gutter of `1rem` (16px).
- **Dual-Pane Workflows**: When reviewing quote parsing against source PDFs/Excel inquiries, the main canvas splits into an asymmetric 45% (source document viewer) / 55% (structured quote matrix) layout separated by a `1rem` gutter.
- **Rhythm & Density**: Vertical spacing adheres to a strict 4px/8px modular scale. Form fields and table rows favor compact padding (`0.5rem` to `0.75rem`) to ensure minimum vertical scrolling while maintaining touch and click precision.

## Elevation & Depth

Visual separation relies on sharp structural surfaces, 1px low-contrast borders (`#E2E8F0`), and restrained micro-shadows rather than multi-layered ambient elevations.

- **Canvas Tier (0dp)**: `#F5F5F7` provides the structural background for the entire application window.
- **Workspace Surfaces (1dp)**: White `#FFFFFF` cards, sidebar panels, and utility bars are bounded by a 1px solid border (`#E2E8F0`) and supported by a subtle micro-shadow: `0 1px 2px 0 rgba(15, 23, 42, 0.04)`.
- **Active Card & Hover Tier (2dp)**: Interactive quote line items or draggable elements elevate slightly on hover: `0 4px 6px -1px rgba(15, 23, 42, 0.06), 0 2px 4px -2px rgba(15, 23, 42, 0.04)`.
- **Floating Overlays & Context Popovers (3dp)**: Currency pickers, column customizers, and autocomplete dropdowns: `0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -4px rgba(15, 23, 42, 0.03)` with a solid `#E2E8F0` border.
- **Modals & Critical Dialogs (4dp)**: `0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.04)` over a semi-opaque `#0F172A`/40 backdrop.

## Shapes

The design uses a calibrated shape hierarchy balancing crisp organizational geometry with soft human ergonomics:

- **Cards & Primary Modules**: Standardized to `12px` (inner content modules) and `16px` (large outer workspace containers).
- **Controls & Form Fields**: Standardized to `8px` (`0.5rem`) for text inputs, currency selects, and button elements, maintaining a unified height of 36px (default) or 32px (compact data grid).
- **Status Badges & Chips**: Strict full pill shape (`9999px`) to create clear differentiation between actionable square inputs and passive state indicators.

## Components

### Buttons
- **Primary Button**: Background `#1D4ED8`, text `#FFFFFF`, border none. Hover `#1E40AF`, active `#1E3A8A`. Height 36px, padding 0 16px, font size 13px, weight 500, corner radius 8px. Focus ring: 2px offset with `#1D4ED8`.
- **Secondary Button**: Background `#FFFFFF`, text `#334155`, border 1px solid `#CBD5E1`. Hover background `#F8FAFC`, border `#94A3B8`.
- **Danger Button**: Background transparent, text `#DC2626`, border none. Hover background `#FEF2F2`. When elevated to primary danger: background `#DC2626`, text `#FFFFFF`.
- **Ghost / Tool Button**: Background transparent, text `#64748B`, corner radius 6px. Used for grid row action bars and table icon buttons.

### Status Pill Badges
Pill badges are strictly non-interactive and use height 22px, padding 0 8px, font size 11px, weight 600, rounded 9999px, with a 6px diameter inner status dot:
- **Parsed / Approved**: Light green background `#ECFDF5`, border `#A7F3D0`, dot `#10B981`, label `#047857`.
- **Pending Action**: Light amber background `#FFFBEB`, border `#FDE68A`, dot `#F59E0B`, label `#B45309`.
- **Parsing Failed**: Light red background `#FEF2F2`, border `#FECACA`, dot `#EF4444`, label `#B91C1C`.

### Sidebar Navigation
- Width: Fixed `224px`. Background `#FFFFFF`, right border 1px solid `#E2E8F0`.
- Nav Items: Height 36px, corner radius 6px, margin 2px 12px. Normal state: text `#64748B`, hover background `#F8FAFC`, text `#0F172A`. Active state: background `#EFF6FF`, text `#1D4ED8`, font weight 600, with a 3px active vertical indicator in `#1D4ED8` on the left border.

### Quotation Data Grid & Cards
- **Card**: Pure `#FFFFFF` surface, corner radius `14px`, 1px solid `#E2E8F0`, padding `1rem` (16px), subtle micro-shadow.
- **Table Cells**: Compact height 40px. Column headers set in 11px uppercase `Inter`, weight 600, text `#64748B`, background `#F8FAFC`. Values use tabular numbers in `JetBrains Mono` 13px.

### Input Fields & Selects
- Height: 36px, background `#FFFFFF`, border 1px solid `#CBD5E1`, text `#0F172A`, placeholder `#94A3B8`, corner radius 8px, horizontal padding 10px.
- Focus: Border `#1D4ED8`, box-shadow `0 0 0 3px rgba(29, 78, 216, 0.12)`.
- Input Addons (Currency prefix `$` / `¥`, units `kg`, `CBM`): Background `#F8FAFC`, border 1px solid `#CBD5E1`, font family `JetBrains Mono`, text `#64748B`.

### Checkboxes & Radios
- Size: 16x16px. Border 1.5px solid `#CBD5E1`, corner radius 4px (checkbox) or 50% (radio).
- Checked: Background `#1D4ED8`, border `#1D4ED8`, checkmark white 1.5px stroke. Focus ring `#1D4ED8` at 20% opacity.