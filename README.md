# Commitment Atlas

An interactive, client-side commitment analysis tool with two selectable areas: philosophy of religion and Norwegian politics. Users affirm, deny or leave statements undecided; the app exposes relationships while keeping assumptions visible.

## Choosing an area

Use **Choose an area** above the main workspace. Each area retains its own selections, filters and context for the current tab session. Reloading clears unshared work. Philosophy uses position templates; Norwegian politics uses explicitly synthetic scenarios, not party platforms.

Norwegian policy mode asks for scenario context and confirmation that the selected statements share the same scope. Missing fields or confirmation produce **Needs context**, not a finding. Completed findings remain conditional: the application does not verify facts, costings, legal claims or policy assumptions. Changing a selection or context requires confirming scope again.

**Copy a link to this map** explicitly exports only the current area's selections and context as a URL fragment. Recipients must confirm scope themselves. Old philosophy query links remain readable. Choices are never automatically written to the URL or sent to an analytics service. There are no external font requests.

`areas.js` is the area registry, normalization, evaluation adapter and share-link codec. `app.js` renders the shared interface. The policy adapter calls `scripts/norway-engine.mjs`; philosophy retains direct rule matching. Adding an area requires a registered dataset, a suitable evaluator and adapter tests.

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

## Philosophy audit and hiddenness example

The philosophy corpus contains 25 claims, 11 rules, and 8 editable templates. [The editorial audit](data/AUDIT.md) documents each original rule and its limitations. `assessment` separates inferential validity from disputed premises, states scope and framework, and records the review level. Rule-level `citations` identify source roles and section/topic locators. This is an editorial audit, not independent specialist approval.

Middle knowledge no longer entails actual free actions. The creative-freedom deduction requires an explicit bridge to a different total created order. The simplicity objection requires necessary existence and remains dialectical. The divine-determination rule is now interpretive pressure because the connection to prior-condition determination needs clarification.

Two hiddenness templates demonstrate an incomplete argument and a conditional deduction. The reconstruction uses G → ¬N and N to conclude ¬G, where G denotes only the specified perfectly loving personal God. Both premises remain disputed. Missing or opposed premises block the deduction; their rejection does not prove God exists. No individual’s resistance or motives are diagnosed.

The validator enforces the keywords used in the claim/rule JSON Schema and rejects unsupported keywords. Tests cover every rule’s triggering and omitted/opposed-premise cases, the hiddenness truth table, and all 27 hiddenness selection states. Structural and logical checks do not verify premise truth or interpretive fidelity.

Analysis still matches explicit selections directly; displayed consequences do not trigger additional rules. It is not a global consistency check. Incomplete-argument guidance is presently available only for hiddenness. Shared links use current data rather than pinning a historical corpus version.

## GitHub Pages

The included workflow publishes the repository root on pushes to `main`. In repository settings, set **Pages → Build and deployment → Source** to **GitHub Actions** once if needed.

## Scope

The initial corpus is deliberately small. It focuses on divine knowledge, freedom, providence, time, immutability, and simplicity. Every substantive relation is intended to remain inspectable and revisable through ordinary pull requests.
