# Gold Loan UI Theme Reference

This system uses a shared design system in theme.py.

## Source of Truth
- Theme module: theme.py
- Shared instance: GOLD_THEME

## Visual Direction
- Style: clean desktop dashboard with soft gray surfaces and strong blue actions.
- Feel: modern, readable, card-based, with strong information hierarchy.

## Color Tokens
- App background: #eef2f7
- Surface: #ffffff
- Surface alt: #f7f9fc
- Sidebar: #e9eef7
- Sidebar active: #415bd8
- Border: #d9e1ef
- Primary text: #1f2937
- Muted text: #64748b
- Accent: #415bd8
- Accent hover: #374fc2
- Success: #14b8a6
- Warning: #f97316
- Danger: #ef4444

## Typography
- Family: Segoe UI
- H1: 20 bold
- H2: 16 bold
- H3: 13 bold
- Body: 10 regular
- Body bold: 10 bold
- Small: 9 regular

## Spacing + Shapes
- Surface cards use 1px soft borders.
- Base radius token: 12 (for future custom rounded Canvas components).
- Shadow token: #d4dce9 (for future layered card/shadow patterns).
- Buttons are flat with strong contrast and hover states.

## Responsiveness Rules
- Every main page body should be inside a scrollable canvas viewport.
- Never assume fixed height for content sections.
- Use fill both + expand true on major containers.
- Use wraplength for long labels and paths.
- For dashboard metrics, use grid with weighted columns to adapt on resize.

## Usage Rules For Future Screens
1. Import GOLD_THEME from theme.py.
2. Use GOLD_THEME.make_card for section containers.
3. Use GOLD_THEME.make_button for all actions.
4. Use GOLD_THEME.make_entry for all text input controls.
5. Use GOLD_THEME.make_scrollbar for consistent scrolling style.
6. Avoid hardcoded colors in new pages.
7. Keep all new pages in the same palette and typography system.
