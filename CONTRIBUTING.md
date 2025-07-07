🎨 Kitloop Color & Style Guidelines
Purpose: Ensure consistent, clean, and maintainable styling across the Kitloop codebase by standardizing color usage according to the official brand palette.

✅ Objective
Audit and refactor the entire Kitloop codebase to:

Replace hardcoded or inconsistent color values

Enforce usage of Tailwind utility classes based on defined design tokens

Maintain clean, readable, and scalable styling practices

🎯 Brand Color Rules
Primary Brand Color
PurposeHEXTailwind Class
Primary color#00856Fkitloop-accent
Hover variant#00745Ekitloop-accent-hover

Allowed:

bg-kitloop-accent

text-kitloop-accent

hover:bg-kitloop-accent-hover

Not allowed:

bg-[#00856F], text-[#00856F]

bg-green-500, text-green-600

Tailwind default greens/teals (unless justified for secondary use)

Secondary / Neutral Colors
NameHEXTailwind ClassUsage
Background#FFFBEBbg-kitloop-backgroundMain section backgrounds
Text#051923text-kitloop-textPrimary typography
Light gray#F5F5F5bg-kitloop-light-grayInput backgrounds, muted cards
Medium gray#E0E0E0border-kitloop-medium-grayBorders, separators

Do not use raw gray-100/200 or #e8e8e8 unless explicitly necessary.

🔧 Refactoring Instructions
Replace hardcoded color values (e.g. #00856F, #67AE6E, #e8e8e8) with the appropriate Tailwind classes listed above.

Use only Tailwind utility classes, no inline styles with color unless there's a technical constraint.

Do not overwrite values in tailwind.config.ts – use the defined kitloop color tokens.

Check all .tsx, .css, and .html files in:

components/

pages/

src/

🧼 Style Cleanup Goals
No duplicated or similar color tones across the UI

No magic HEX values in components

Full usage of semantic Tailwind classes for branding

📦 Optional (recommended)
If you detect visual duplication (e.g., multiple variations of green used for the same element type), consolidate everything under the Kitloop accent color.
