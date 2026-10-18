# Design System: The Great Ledger (Impeccable Guild Edition)

## Visual Personality
**Cozy Fantasy Ledger**: Warm aged parchment, medieval serif headings (`Cinzel`), gilded gold borders, wax seals, glowing gems, and tactical RPG cards.

## Color Tokens & Palette
- `Primary Gold`: `#d97706` / `#fef3c7` (Gilded accents & highlights)
- `Ink Charcoal`: `#1c1917` / `#78716c` (Deep text & manuscript notes)
- `Sapphire Blue`: `#1e3a8a` (XP & magical attributes)
- `Ruby Crimson`: `#991b1b` (Bounty seals & damage)
- `Emerald Green`: `#065f46` (Gold coins & success states)

## Component State Rules
Every interactive component MUST support 5 states:
1. **Default**: Parchment card background, clear borders, icon alignment.
2. **Hover**: Gold ambient glow, subtle -2px lift (`translateY(-2px)`), transition `all 0.2s ease`.
3. **Active/Pressed**: Inset press effect (`transform: scale(0.98)`).
4. **Disabled**: Muted 45% opacity, grayscale, `cursor: not-allowed`.
5. **Empty**: Muted parchment icon callout with clear action guidance.

## Spacing & Layout Rules
- Base grid spacing: 4px / 8px / 12px / 16px / 24px.
- Touch targets: Minimum 38px height for all buttons and interactive tabs.
- Card padding: Consistent 12px-16px inner padding.
