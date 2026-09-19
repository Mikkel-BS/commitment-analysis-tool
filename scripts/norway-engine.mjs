// Pure, browser-compatible reference evaluator. Never derives user beliefs.
export function evaluate(rules, selections, context = {}) {
  const results = [];
  for (const rule of rules) {
    // Absent and undecided are neither affirmation nor denial.
    if (!Object.entries(rule.premises).every(([id, value]) => selections[id] === value)) continue;
    const missingContext = rule.scope.filter(key => typeof context[key] !== 'string' || !context[key].trim());
    results.push({
      rule: rule.id,
      state: missingContext.length ? 'needs-context' : 'conditional-finding',
      kind: rule.kind,
      status: rule.status,
      missingContext,
      premises: Object.entries(rule.premises).map(([claim, polarity]) => ({ claim, polarity })),
      context: Object.fromEntries(rule.scope.filter(key => !missingContext.includes(key)).map(key => [key, context[key]])),
      warning: 'Applies only if the selected scenario premises are accurate and share these boundaries.'
    });
  }
  return results;
}
