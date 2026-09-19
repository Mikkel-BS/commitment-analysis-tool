# Norwegian political coherence — research corpus 0.1

This is a separate, Norwegian Bokmål data module. Select **Norwegian politics** in the website's area selector to use it. It does not replace the philosophy dataset.

## What the records mean

28 editorial formulations, 9 conditional rules, 6 passage-checked official sources and 8 synthetic examples. These are not party positions, live project facts, a legal opinion, a national economic model, or an exhaustive coherence check. No absence of warnings establishes that a package is coherent.

Claim types are policy choices, self-imposed constraints and scenario assumptions. No claim is automatically affirmed. A source link explains a concept or institution; it does **not** mean its publisher advocates the policy or verifies a user's assumption. Source-free entries are explicitly stipulated choices, definitions or hypothetical assumptions, never unattributed factual findings.

Each rule distinguishes its own editorial inference from what its sources establish. `supports`, `doesNotEstablish` and the passage locator in each source record make that boundary auditable. Sources were read on 19 September 2026; exact-page archival copies and independent expert review remain outstanding. No current numerical climate target or budget estimate is encoded. Earlier discussion's figures must not be reused as current baselines without checking their budget vintage.

## File contract

- `manifest.json`: scope, version, limitations and review triggers.
- `claims.json`: stable ID, type, area, statement, qualification and source references.
- `rules.json`: explicit signed premises, required context, finding type, caveat, alternatives and evidence requirements.
- `sources.json`: source provenance and limits of support.
- `scenarios.json`: synthetic regression examples, never party templates.
- `../../scripts/norway-engine.mjs`: pure reference evaluator.
- `../../scripts/validate-norway.mjs`: executable strict record validation and regression tests, run by `npm test`.

The validator is not a general JSON Schema implementation. It checks exact keys and allowed types/enums for the core records, references, safety invariants and behavioral fixtures. A distributable JSON Schema and a validated scenario-input API are future work. Do not claim automated tests establish substantive political or empirical truth.

## Evaluation semantics

Affirm means select the precise statement. Deny means reject that statement, not merely decline to support a policy. Undecided and absent are neither. In particular, “no viable grid remedy exists” must not be inferred because no remedy has been entered.

All premises within one evaluated package must refer to the **same** actor, period, baseline and any rule-specific project, location, deadline, budget or emissions boundary. The reference evaluator requires nonempty context fields, but cannot verify their truth or detect misleading labels. It accepts already-normalized, trusted package input, not arbitrary imported party records. Keep different projects, versions, years and actors in separate evaluations; a future import layer must enforce compatible scopes per assertion before calling it.

A rule whose premises match but whose context is missing returns `needs-context`, not a finding. A complete match returns a `conditional-finding` with the signed premise set and context. This is provenance for an explicit local rule, not a globally minimal unsatisfiable core. Findings never add beliefs, propagate negations, produce a party score, or recommend a vote.

Three output categories:

1. **Conditional incompatibility:** an accounting or definitional conflict under explicitly chosen boundaries.
2. **Unsupported inference:** the supplied evidence does not entail the asserted conclusion; it does not prove the conclusion false.
3. **Implementation pressure:** a difficulty in the selected scenario, not a demonstrated impossibility.

## Evidence before real-world use

An analyst must supply the evidence listed by each rule. Current examples are deliberately synthetic. Before labeling an empirical finding as evidence-backed, introduce assertion-level source locators, dates, uncertainty, coverage and reviewer status. The present evaluator does not enforce that evidence gate and must not be marketed as an automatic factual audit.

For quantitative extensions require currency and price year; annual versus cumulative values; gross versus net; government level; reference scenario; uncertainty ranges; and unique financing IDs to prevent reuse of the same savings. Separate financing identities from behavioral estimates and resource constraints. Separate MW from TWh, and annual energy balances from hourly and locational adequacy. Do not invent numerical estimates to fill missing data.

For party attribution require exact programme passage and page, programme period, national/local branch, source URL, publication date, explicit versus inferred endorsement, and human review. A vote on a bundled budget is not endorsement of every component; silence is undecided. Government agreements and later compromises need separate records. Apply the same evidential standard to every party.

## Deferred subject areas

Current statutory targets, EEA/procurement rules, Sami rights and consultation, price forecasts, macroeconomics and party programme extraction need dedicated primary-source review. They are not implemented. A project's energy or financial feasibility never overrides a rights-based constraint. No automatic legal judgments should be added from generic institutional summaries.

## Maintenance

Run `npm test` and `git diff --check`. For every new rule add a trigger, remove each premise in turn, reverse its polarity, leave it undecided, remove context, and add at least one substantive near-miss scenario. Record source changes and semantic changes in version history. Review on the manifest's date or when its listed events occur; a review date is metadata, not an automated monitoring task.

The UI keeps scenario assumptions visible, distinguishes lack of evidence from rejection, and shows limitations alongside warnings. It requires common-scope confirmation and exposes missing context. No political preference analytics or automatic URL sharing. The interface does not independently validate user-supplied evidence.
