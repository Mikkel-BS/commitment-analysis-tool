# AGENTS.md

## Project purpose

Commitment Atlas is a static, client-side tool with selectable philosophy-of-religion and Norwegian-policy areas. It maps arguments and assumptions; it must not present disputed judgments as settled logical contradictions.

## Repository structure

- `index.html`, `styles.css`, `app.js`: dependency-free browser application.
- `areas.js`: area registry, dataset normalization, evaluator dispatch and share-link handling.
- `data/norway/`: Norwegian policy research corpus; read its README and AUDIT before changing its semantics.
- `scripts/norway-engine.mjs`: conditional policy evaluator; does not verify assumptions or derive beliefs.
- `data/claims.json`: atomic commitments and their definitions.
- `data/rules.json`: entailments, incompatibilities, and tensions.
- `data/positions.json`: editable starting templates, not definitions of users.
- `data/sources.json`: bibliographic records.
- `data/schema.json`: normative schema definitions.
- `scripts/validate.mjs`: dataset integrity and reasoning-safety checks.
- `.github/workflows/pages.yml`: GitHub Pages deployment.

## Development constraints

- Keep the application deployable as a static GitHub Pages site.
- Prefer browser-native HTML, CSS, and JavaScript. Do not introduce a build system or runtime dependency without a clear need.
- Preserve responsive behavior and basic keyboard/semantic accessibility.
- Store user selections locally or in shareable URL state; do not add tracking or transmit selections.
- Keep area sessions isolated. Share selections/context only after an explicit user action; preserve legacy philosophy links. Policy findings require the same scenario scope and must retain their conditional status.
- Do not edit generated deployment output. The repository root is the deployed artifact.

## Philosophical content rules

- Keep claims sufficiently atomic that users can affirm or deny them independently.
- Treat position templates only as revisable starting points.
- Distinguish deductive consequences from dialectical pressure:
  - A `deductive` rule may derive a conclusion.
  - A `dialectical` rule may surface a tension but must not derive or negate a commitment.
  - Contested or interpretation-dependent rules must not be marked deductive.
- Use `formal` only for relations whose validity follows from logical form under the encoded definitions.
- Use `conceptual` when the result depends on the dataset's explicit definitions.
- Make load-bearing premises visible. Include a caveat, recognized objections, and appropriate sources for every substantive rule.
- Phrase explanations neutrally. The tool should locate disagreement, not decide which belief the user should abandon.
- Avoid silently strengthening traditional positions. Qualify modal, temporal, and freedom-related claims carefully.
- Prefer stable, scholarly reference works or primary literature. Do not add a source that does not directly support the associated formulation or dialectic.

## Data-editing checklist

When changing the JSON corpus:

1. Check that every claim and rule ID is unique and stable.
2. Verify every claim, source, premise, conclusion, and template reference.
3. Confirm that the rule's `kind`, `status`, and `strength` match its explanation.
4. Test both the triggering case and a nearby non-triggering case.
5. Run:

```bash
npm test
```

The validator must pass before committing.

## General verification

For interface changes, also run a local server and test the primary flow at desktop and mobile widths:

```bash
npm run serve
```

Check claim search and filtering, affirm/deny toggles, position templates, analysis counts, expandable rationale and sources, shareable URL restoration, clearing selections, and the Method view.

Before finishing:

```bash
npm test
git diff --check
```

Keep commits focused and explain any philosophical modeling judgment in the commit or pull-request description.
