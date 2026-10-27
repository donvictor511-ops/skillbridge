# SkillBridge Design System

The single source of truth for how SkillBridge looks. Colors, radius, and shadow
are defined once in `client/src/index.css` (the `@theme` block). Change them
there, never inside components.

## Color tokens

| Token                                               | Use for                                                  |
| --------------------------------------------------- | -------------------------------------------------------- |
| `navy`                                              | Brand, strong headings, dark surfaces                    |
| `brand` (+ `brand-hover`, `brand-active`)           | Primary actions, links, active navigation                |
| `accent` (teal)                                     | Decoration and tinted backgrounds only. Never small text |
| `page` / `surface`                                  | Page background / cards and panels                       |
| `ink` / `muted`                                     | Main text / secondary text                               |
| `line`                                              | Borders and dividers                                     |
| `success`, `warning`, `danger`                      | Backgrounds and icons for status                         |
| `success-strong`, `warning-strong`, `danger-strong` | Small status TEXT (passes contrast)                      |

Rules:

- Never hard-code a hex color in a component.
- Never use the default Tailwind palette (`blue-500`, `slate-300`, ...).
- Status is never shown by color alone: always add text and/or an icon.

## Typography

- Font: system font stack (`font-sans`).
- One `h1` per page. Section titles `h2`. Card titles `h3`.
- Sizes: hero `text-4xl sm:text-5xl`, page title `text-2xl sm:text-3xl`,
  card title `text-lg`, body `text-base` / `text-sm`, captions `text-xs`.
- Body text is never below 14px except badges and captions.

## Spacing and layout

- Page sections: `py-16 sm:py-20`.
- Content width: `max-w-6xl px-4 sm:px-6`.
- Cards: `rounded-2xl`, padding `p-4 sm:p-5` or `p-5 sm:p-8`, gap `gap-6`.
- Controls: `rounded-control`, 44px tall on phones (`h-11`).
- Mobile-first: base classes are for phones; `sm:`, `md:`, `lg:` add more.

## Components (`client/src/components/ui`)

Button, Input, Textarea, Select, Badge, Avatar, Card, Spinner, ErrorMessage,
EmptyState, Skeleton. Use `getButtonClasses` to make a link look like a button.
Preview them at `/design-preview` while running `npm run dev:client`.

## Accessibility rules

- Text contrast at least 4.5:1 (3:1 for large text and focus outlines).
- Visible keyboard focus everywhere (white outline inside `data-surface="dark"`).
- One `<main>` per page, a skip link, and labeled landmarks.
- Decorative icons and illustrations are `aria-hidden`.
- Respect reduced motion: animate only with `motion-safe:`.
- Never fake a feature: unbuilt features are labeled "Planned" or "Not available yet".
