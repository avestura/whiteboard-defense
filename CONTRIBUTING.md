# Contributing

The most useful contribution is a new entry in the defaults catalogue: `plugins/whiteboard-defense/skills/whiteboard/references/defaults-catalogue.md`.

## Adding a default

1. Pick the area and the next free ID: `D-<AREA>-<NN>`.
2. Fill in:
   - **Trigger**: the kind of request that surfaces it.
   - **Default**: what agents commonly do, concretely. "Purple gradient" is useful; "bad design" is not.
   - **Alternatives**: two or three real options.
   - **Avoid line**: a paste-ready exclusion, if it is a creative default.
3. Regenerate the index the skill reads: `node scripts/catalogue-index.mjs`. CI fails if `SKILL.md`'s index is out of date.
4. Add an eval scenario that plants the pattern (see [evals/README.md](evals/README.md)) and check it passes: `node evals/run.mjs --only <name>`.
5. Say which agent and model version you saw it on, in the PR description. Defaults change between versions, and entries that no longer hold should be removed.

Write the **Trigger** broadly enough to match real work. The agent matches by meaning, but a trigger like "a prototype becoming a service" was too narrow to catch an in-memory rate limiter.

Rules:

- Observed behavior only. No claims about training or internals.
- One pattern per entry.
- Keep it short.

## Changing the skill

`SKILL.md` is the product. Keep the provenance tags and the "Not verified" section; the rest is negotiable. Run `node evals/run.mjs` before and after a change to the skill and compare: it costs real model calls, so it is not part of CI.

Never use an eval scenario's case as an example in `SKILL.md` or the catalogue ("in-memory rate limiter", "return every customer", "state in Redis"). Agents copy examples nearly word for word, so the eval then measures recall of the example instead of matching. Take examples from catalogue entries no scenario covers. If you change behavior, update `examples/sample-brief.md` and the README table.

## Testing locally

```sh
claude plugin validate .
claude plugin marketplace add ./
claude plugin install whiteboard-defense@whiteboard-defense
```

For Codex and OpenCode, run `sh install.sh codex opencode` from the checkout; it installs from the local tree.
