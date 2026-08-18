# AI LeadFlow Design System

This document is the visual source of truth for AI LeadFlow and its Nova Dental demo. Use the existing Tailwind CSS setup; keep choices limited and consistent.

## 1. Brand personality

Calm, trustworthy, clear, capable, and human. The product should feel like modern healthcare software: polished and welcoming, never flashy or overly playful. Avoid gradients, visual clutter, and unsupported clinical claims.

## 2. Color system

Use a small, cool-neutral palette with teal as the primary accent.

- Background: near-white
- Surface: white
- Primary text: deep slate
- Muted text: slate gray
- Primary action: teal, with a darker teal hover state
- Border: light cool gray
- Status: green for success, amber for warning, red for error, blue for information

Do not use color as the only way to communicate status.

## 3. Typography

Use the existing Geist sans font. Use a single clear hierarchy: one page `h1`, section `h2` headings, and readable body copy with comfortable line height. Reserve monospaced text for technical values only.

## 4. Spacing

Use Tailwind's default spacing scale. Favor generous vertical spacing for public pages and a tighter, consistent rhythm for dashboards. Reuse a small set of gaps rather than inventing one-off values.

## 5. Layout and containers

Center page content in a responsive container with horizontal padding. Keep long-form copy at a readable measure. Public pages may use spacious, full-width sections; dashboards should prioritize dense, scannable information without feeling cramped.

## 6. Buttons

Use three treatments only: primary teal, secondary neutral, and text/link.

- Give buttons clear, action-led labels.
- Keep height and padding consistent.
- Provide visible hover, disabled, and keyboard focus states.
- Preserve comfortable touch targets on mobile.

## 7. Cards

Cards use a white surface, light border, modest corner radius, and minimal shadow. Use them to group related content, not as decoration. Keep card padding and heading spacing consistent.

## 8. Forms and inputs

Every input has a visible label. Use clear help text and concise error messages. Placeholders are examples, not labels. Keep fields predictable in height, show focus clearly, and associate validation messages with their inputs.

## 9. Navigation

Public navigation is simple and conversion-focused, with a clear primary CTA. Dashboard navigation emphasizes the active location and preserves hierarchy. Use semantic `nav` elements and accessible labels for navigation groups.

## 10. Tables and dashboard UI

Optimize for scanning: clear column headings, stable alignment, light row separation, and restrained controls. Align numbers consistently, make overflow manageable on small screens, and do not hide critical data solely for layout convenience.

## 11. Status badges

Badges are compact, text-first labels with a subtle semantic tint. Pair status color with readable text or an icon when useful. Keep the status vocabulary small and consistent across the product.

## 12. Responsive design

Build mobile-first with Tailwind. Stack multi-column content on narrow screens, retain readable type and touch targets, and let tables scroll horizontally when needed. Do not depend on hover for essential interaction.

## 13. Accessibility

Use semantic landmarks and heading order. Maintain sufficient contrast, visible keyboard focus, and descriptive link and button labels. Prefer native controls where possible, respect reduced-motion preferences, and mark decorative elements as hidden from assistive technology.

## 14. Public website vs. admin dashboard

Nova Dental's public site prioritizes reassurance, hierarchy, generous whitespace, and conversion. AI LeadFlow's dashboard prioritizes speed, clarity, lead-management tasks, and data density. Both share the same palette, typography, spacing, and interaction patterns so they remain one coherent product.
