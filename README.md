# BetaKinetics — Diabetes & Nutrition Planning PWA

BetaKinetics is a Progressive Web App concept for recording diabetes-related information, estimating nutrition targets, planning meals, and exploring insulin calculations. The repository uses a React and TypeScript frontend with Vite tooling.

> **Important medical safety notice:** This is an experimental software project, not a medical device or a substitute for clinician guidance. Do not use its insulin calculations or recommendations to make treatment decisions without independent clinical validation and approval from a qualified healthcare professional. Incorrect insulin dosing can cause severe hypoglycemia or other serious harm.

## Project goals

- Record relevant glucose, meal, and insulin information where implemented.
- Explore insulin-on-board (IOB) calculations and dose-tracking workflows.
- Estimate calories and macronutrient targets from user-entered parameters.
- Organize meal-planning and weight-goal information.
- Provide an installable PWA experience with browser storage and offline support where configured.

These are project goals and code-described capabilities; they do not establish clinical accuracy or safety.

## Technology

- React and TypeScript
- Vite
- Tailwind CSS
- React hooks and browser storage
- Progressive Web App tooling

See `package.json` and `vite.config.ts` for the current dependency and build configuration.

## Requirements

- Node.js compatible with the project's Vite and TypeScript dependencies
- npm or another compatible package manager

## Development setup

```bash
git clone https://github.com/nksdev/BetaKinetics.git
cd BetaKinetics
npm install
npm run dev
```

Open the local URL printed by Vite.

## Build and type-check

```bash
npm run build
npm run lint
```

The `lint` script currently runs TypeScript's no-emit check. A successful build or type-check does not validate medical formulas or clinical behavior.

## Before any real-world use

- Have every calculation reviewed by qualified diabetes clinicians.
- Test units, boundary conditions, rounding, time zones, missing data, and insulin-action assumptions.
- Clearly distinguish recorded data from estimates.
- Do not infer a dose from incomplete or stale inputs.
- Protect health information and avoid uploading identifiable records to public repositories or external services.
- Keep treatment decisions under the user's established care plan.

## Repository notes

The repository includes application source, a technical report, build configuration, and a number of development/fix scripts. Review those scripts before running them and confirm that the app builds cleanly from the current branch.

## Maintainer

[Naman Kumar Sonker](https://github.com/nksdev)

## License

See [LICENSE](LICENSE).
