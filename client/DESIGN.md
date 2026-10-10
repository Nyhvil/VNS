# Design System Specification: The Vigilant Sentinel

## 1. Overview & Creative North Star
**The Vigilant Sentinel** is the creative North Star for this design system. In the world of high-stakes security, "standard" is the enemy of clarity. This system rejects the cluttered, line-heavy aesthetic of traditional dashboards in favor of an **Editorial Security** approach. 

We treat data not as a spreadsheet, but as a high-end publication. By utilizing intentional asymmetry, expansive breathing room, and deep tonal layering, we create a sense of calm authority. The interface doesn't just show data; it curates it, guiding the user’s eye to threats with surgical precision while maintaining a sophisticated, premium atmosphere.

---

## 2. Colors: Tonal Depth & The "No-Line" Rule
The palette is rooted in high-contrast professionalism. We use a sophisticated navy-black for structural authority and an energetic yellow (`#FFD700`) to represent the "spark" of human intervention and primary action.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders to section off content. Boundaries must be defined solely through background color shifts or subtle tonal transitions. 
*   **Surface (`#f7f9fb`)**: The canvas.
*   **Surface-Container-Low (`#f2f4f6`)**: Secondary zones or sidebar backgrounds.
*   **Surface-Container-Lowest (`#ffffff`)**: The primary "paper" for high-priority data cards.

### Surface Hierarchy & Nesting
To create depth without clutter, treat the UI as a series of physical layers. 
*   **Base:** `surface`
*   **Level 1 (Sections):** `surface-container`
*   **Level 2 (Interactive Cards):** `surface-container-lowest` (White) to create a "lifted" effect.
*   **Level 3 (Overlays):** Semi-transparent `surface-variant` with a 20px backdrop-blur for glassmorphism.

### Signature Textures
Main CTAs and critical data headers should utilize a **Subtle Kinetic Gradient**. Transitioning from `primary` (#705d00) to `primary_container` (#FFD700) at a 135-degree angle provides a "soul" to the UI that flat color cannot replicate.

---

## 3. Typography: The Editorial Hierarchy
We use **Inter** for its neutral, architectural quality. The hierarchy is designed to feel like a premium financial report—authoritative and highly legible.

*   **Display (lg/md):** Reserved for "Hero" metrics (e.g., Total Threats Blocked). Use tight letter-spacing (-0.02em) to look custom and "designed."
*   **Headline (sm/md):** Used for card titles. These should be `on_surface` (#191c1e) to provide a heavy anchor for the eye.
*   **Body (md):** Our workhorse. Ensure a generous line-height (1.5) to maintain the "Editorial" feel.
*   **Label (sm):** Uppercase with +0.05em tracking for technical metadata and secondary timestamps.

---

## 4. Elevation & Depth: Tonal Layering
Traditional drop shadows are often a crutch for poor layout. In this system, depth is achieved through **Tonal Layering**.

*   **The Layering Principle:** Place a `surface-container-lowest` card on a `surface-container-low` background. This creates a soft, natural lift without a single pixel of shadow.
*   **Ambient Shadows:** For floating elements (Modals, Popovers), use "Ambient Light" shadows. 
    *   *Shadow:* `0px 24px 48px rgba(25, 28, 30, 0.06)`
    *   The shadow is a tinted version of the `on-surface` color, making it feel integrated into the environment.
*   **The "Ghost Border" Fallback:** If a border is required for accessibility in data-dense tables, use the `outline_variant` token at **15% opacity**. Never use 100% opaque lines.
*   **Glassmorphism:** Use `surface_container_low` at 70% opacity with a `blur(12px)` for navigation bars to let background data "ghost" through, maintaining the user's sense of place.

---

## 5. Components: The Sentinel Kit

### Cards & Data Visualization
*   **Rule:** Forbid divider lines. Use vertical white space (1.5rem to 2rem) or `surface_container` shifts to separate content.
*   **Layout:** Use asymmetrical card sizes. A large "Primary Intelligence" card paired with two smaller "Telemetry" cards creates a more engaging, custom feel than a rigid 3-column grid.

### Buttons: The Kinetic CTAs
*   **Primary:** Background: `primary_container` (#FFD700); Text: `on_primary_container` (#705e00). Roundedness: `md` (0.75rem).
*   **Secondary:** Ghost-style. No border. `on_surface` text with a subtle `surface_container_high` background on hover.
*   **States:** On press, apply a subtle inner shadow to mimic the button physically depressing.

### Inputs & Fields
*   **Styling:** Fill-only. Use `surface_container_high` as the background. No border.
*   **Focus State:** A 2px "Ghost Border" using `primary` at 40% opacity.

### Security Chips
*   **Semantic Feedback:** 
    *   *Safe:* `secondary_container` with `on_secondary_container` text.
    *   *High Risk:* `error_container` (#ffdad6) with `on_error_container` (#93000a) text.
*   **Shape:** `full` (pill-shaped) to contrast against the `md` roundedness of cards.

### Additional Dashboard Components
*   **The Pulse Indicator:** A small, animated dot using semantic colors (Green/Orange/Red) with a radiating "ripple" effect to show live data streaming.
*   **Security Progress Bars:** Use a thick (8px) track with `surface_container_highest` and a `primary` (#705d00) fill.

---

## 6. Do's and Don'ts

### Do:
*   **Embrace the White Space:** If a section feels crowded, remove a border and add 16px of padding.
*   **Use Intentional Asymmetry:** Align high-priority text to the left, but place supporting metrics in a "staggered" grid to avoid a "template" look.
*   **Prioritize Typography:** Let the size and weight of Inter do the work of a container.

### Don't:
*   **Don't use pure black:** Use `on_surface` (#191c1e) for text to keep the "navy" professional undertone.
*   **Don't use 1px dividers:** Not for lists, not for headers, not for sidebars. Use tonal shifts.
*   **Don't over-round:** Keep the `md` (0.75rem) standard for cards. Going too round (e.g., 2rem) makes the security dashboard feel like a toy; staying too sharp (0px) feels dated.