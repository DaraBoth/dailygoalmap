# Orbit UI Migration Plan (Magic UI)

## Goal
Replace all custom "Liquid Glass" and "Neumorphism" styles with a modern, clean, and performant **Magic UI** design system.

## Strategy
1. **Foundation Level**:
    - [x] Replace `index.css` with standard Tailwind/Shadcn variables.
    - [x] Remove `liquidStyle.tsx` and legacy utilities.
    - [x] Standardize core primitives: `Button`, `Input`, `Card`.

2. **Component Level**:
    - [ ] Audit and update `Dialog`, `Sheet`, `DropdownMenu` to remove glass effects.
    - [ ] Replace custom `motion.div` animations with Magic UI logic (e.g., `BlurFade`, `BorderBeam`).

3. **Page Level**:
    - **Home**: Implement `HeroVideoDialog`, `Marquee`, `BentoGrid`.
    - **Dashboard**: Use `Sidebar` (Shadcn) + `Resizable` panels.
    - **Goal Detail**: Use `OrbitingCircles` or `AnimatedBeam` for dependency visualization.

## Color System (Orbit Theme)
- **Primary**: Indigo/Violet Gradient (`from-indigo-500 to-purple-500`)
- **Background**: Clean White (Light) / Deep Space Navy (Dark)
- **Accents**: Cyan/Pink for localized highlights.

## Key Magic UI Components to Integrate
- `RetroGrid`: Background for landing page.
- `TypingAnimation`: For AI chat responses.
- `ShimmerButton`: For primary CTAs.
- `BorderBeam`: For highlighting active cards.
