# Evals

Regression tests for the part of the skill that is easiest to get quietly wrong: matching the work against the defaults catalogue, and tagging who made each choice.

Each scenario runs a real headless Claude Code session with the plugin loaded from this checkout and scores the brief twice:

- **the report**: what the skill hands to the plugin's `report` tool (IDs on `defaults[]` and on decisions, with their provenance);
- **the saved file** (fixture scenarios; short digests are not saved): the brief in `.whiteboard/`, the one a person reads. Expected defaults must appear under "Defaults I relied on"; user-requested IDs must appear under "Decisions" and not under defaults; forbidden IDs must not appear under defaults at all, not even as "not a default" (ruled-out checks belong on the "Checked and ruled out" line).

```sh
node evals/run.mjs                          # every scenario once
node evals/run.mjs --only logo,slides       # some
node evals/run.mjs --runs 3                 # repeat to see flakiness
node evals/run.mjs --model claude-opus-5-5  # another model
```

Needs `claude` on your PATH and spends real model calls: about one turn per fixture scenario, two for a live one. Results go to `evals/results/` (not committed); the exit code is non-zero if any run fails.

## Scenarios

| Scenario | Kind | Must flag | Must not flag |
|---|---|---|---|
| `ratelimit-live` | live, through the automatic trigger | D-ARCH-03 | |
| `customers-every` | fixture | D-ERR-01; D-DATA-01 cited as **USER** | D-DATA-01 as a default (the user asked for every customer) |
| `logo` | fixture | D-LOGO-01, D-LOGO-02, D-COLOR-01 | |
| `slides` | fixture | D-SLIDES-01, D-SLIDES-02 | |
| `rates-client` | fixture | D-NET-01, D-ERR-01 | |
| `login` | fixture | D-SEC-02 | |
| `redis-control` | fixture, negative control | | D-ARCH-03 as a default or as a user choice (state is in Redis, as asked: the pattern was avoided) |

A **fixture** scenario plants known defaults in `files/` and gives the original request, so the expected answer does not depend on what a model happens to generate. A **live** scenario generates the work and relies on a default the model reliably uses.

Extra IDs beyond the expected ones are not failures: the catalogue overlaps (the slide deck's violet gradient is also D-COLOR-01). They are listed in the output for review.

## Adding one

Create `evals/scenarios/<name>/scenario.json`:

```json
{
  "mode": "fixture",
  "request": "What the user originally asked for.",
  "expectDefaults": ["D-XXX-01"],
  "expectUser": [],
  "forbidDefaults": [],
  "forbidUser": [],
  "why": "One line on why these IDs, for whoever reads a failure."
}
```

and put the work under `files/`. Plant defaults unambiguously; a scenario that fails because the fixture is debatable teaches nothing. Every new catalogue entry should come with a scenario, and a negative control where a false positive is likely.
