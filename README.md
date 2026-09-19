# Commitment Atlas

An interactive, client-side commitment analysis tool for philosophy of religion. Users affirm or deny atomic claims; the app exposes consequences and tensions while keeping disputed assumptions visible.

## Run locally

```bash
npm test
npm run serve
```

Open `http://localhost:4173`. No build step or runtime dependencies are required.

## Editorial model

- `data/claims.json`: atomic propositions, definitions, and sources.
- `data/rules.json`: explicit premise sets, conclusions/targets, strength, caveats, objections, and sources.
- `data/positions.json`: editable starting points—not definitions or classifications of users.
- `data/sources.json`: bibliographic records.
- `data/schema.json`: normative JSON Schema definitions.

Only `deductive` rules may derive conclusions. `dialectical` rules can surface a tension but never silently add or negate a commitment. Run `npm test` after any data edit; the validator checks referential integrity and guards that separation.

## GitHub Pages

The included workflow publishes the repository root on pushes to `main`. In repository settings, set **Pages → Build and deployment → Source** to **GitHub Actions** once if needed.

## Scope

The initial corpus is deliberately small. It focuses on divine knowledge, freedom, providence, time, immutability, and simplicity. Every substantive relation is intended to remain inspectable and revisable through ordinary pull requests.
