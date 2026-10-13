---
name: whiteboard
description: Produces a "whiteboard defense" brief after substantial coding, design, or content work, so the user can explain and defend what was shipped. Lists the decisions made, who made each one (user, inferred, or the agent's default), the alternatives not taken, failure modes, and questions the user should be able to answer. Flags where the agent silently relied on a default (the usual logo, slide-deck format, UI style, library choice, architecture). Use at the end of any substantial task that is, or may become, customer-facing; when the user asks "what did you decide", "what should I know about this", "whiteboard", "defend this", or "quiz me"; or via /whiteboard. Skip for PoCs, demos, and throwaway experiments the user has said they do not need to understand.
---

# Whiteboard defense

The standard this skill serves: **at any moment, the user could be pulled aside and asked to explain any customer-facing system they shipped, and defend the decisions behind it.** They do not need line-level knowledge. They need the high-level model: how it works, why X and not Y, what a malicious actor could do, where it fails.

You (the agent) made many decisions while working. Most the user never saw. Your job is to surface them, honestly, in a form the user can learn from in two minutes.

Two things matter above all:

1. **Provenance.** For every decision, say who made it. The user must be able to tell "I asked for this" from "the agent picked this on its own".
2. **Defaults.** Say where you filled a gap with your habitual choice instead of a deliberate one. Models fall back on a small set of default styles and patterns; the user wants those named, not hidden.

## Modes

Read the first word of the user's arguments, if any.

| Invocation | Mode | Behavior |
|---|---|---|
| automatic (end of substantial task) | `short` | Chat-only digest, at most 15 lines. Writes the full file if config says so. |
| `/whiteboard` or `$whiteboard` | `full` | Full brief for the current work. |
| `full <target>` | `full` | Full brief for a target: a PR number, branch, commit range, or path. Read the diff yourself. |
| `defaults` | `defaults` | Only the "Defaults I relied on" section. |
| `quiz` | `quiz` | Interactive drill. See "Quiz mode". |
| `config` | `config` | Show or change preferences. See "Preferences". |
| `ship` / `poc` | `tier` | Record whether the work is customer-facing or a PoC. See "Tiering". |

## Preferences

Read config before doing anything. Look in this order and use the first file found; if none exists, use the defaults.

1. `.whiteboard/config.json` in the project root
2. `~/.config/whiteboard-defense/config.json`

```json
{
  "auto": "short",
  "output": "both",
  "directory": ".whiteboard",
  "minimumSize": "substantial",
  "language": "en"
}
```

- `auto`: `"short"` (default), `"full"`, or `"off"`. When `"off"`, never produce a brief unless explicitly invoked.
- `output`: `"both"` (default: summary in chat, full brief in a file), `"chat"`, or `"file"` (chat shows only a one-line pointer).
- `directory`: where briefs are saved. Default `.whiteboard`.
- `minimumSize`: `"substantial"` (default) or `"any"`.

When the user says things like "turn off automatic whiteboard briefs" or "always save to docs/decisions", edit the config file (project-level unless they say global) and confirm in one line. Do not ask where to put it; use the project file.

**"Substantial"** means: new feature, new component or service, architectural change, new dependency, data model or schema change, auth/permission/payment/crypto change, public API change, visual design or branding work, a generated document or presentation. It does **not** mean: typo fixes, renames, formatting, comment edits, a one-line bug fix with an obvious cause, answering a question, or reading code. If in doubt, stay silent in automatic mode.

## Tiering

Mitchell Hashimoto's rule: PoCs, demos, and experiments do not need to be understood; customer-facing work does. Respect that.

- If the user has said the work is a PoC, demo, spike, or throwaway (this session or in `.whiteboard/config.json` as `"tier": "poc"`), do not produce an automatic brief. Add one line at most: `Marked as PoC, so no whiteboard brief. Run /whiteboard if this ships.`
- If you cannot tell, treat it as customer-facing only when there are signs: auth, payments, user data, deployment config, a public API, a README aimed at users, a release or version bump. Otherwise stay silent in automatic mode.
- Never ask the user to classify every task. Infer, and state the inference in the brief header.

## How to build the brief

Work from what you actually know. Sources, in order of reliability:

1. The user's own words in this conversation (what they asked for, constrained, rejected).
2. The diff or files you produced or changed (re-read them; do not rely on memory of what you intended).
3. Your own reasoning during the task.

Do not invent a rationale after the fact and present it as if it were deliberate. If you made a choice without weighing alternatives, that is a **default**, and you must say so.

### Provenance tags

Every decision gets exactly one tag:

- **[USER]**: the user asked for it or approved it explicitly. Quote or paraphrase the instruction.
- **[INFERRED]**: the user did not say it, but context made it the clear choice (an existing codebase convention, a stated constraint, the only option that works with the stack). Name the evidence.
- **[DEFAULT]**: the user did not specify it, nothing in the context forced it, and you went with your habitual choice. This is the tag the user cares most about.
- **[GUESS]**: you were unsure and picked something plausible. Say what you were unsure about.

Be conservative: when torn between [INFERRED] and [DEFAULT], choose [DEFAULT]. A false [DEFAULT] costs the user a few seconds; a false [INFERRED] hides exactly what they wanted to know.

### Detecting defaults

For each decision area touched by the work, ask: *if the user had given me a different prompt with the same requirements, would I have made the same choice anyway?* If yes, and the user did not specify it, it is a default.

Check the work against `references/defaults-catalogue.md`. Match entries by their trigger. When you match one, cite its ID (for example `D-LOGO-01`) and say what the common alternatives are. The catalogue is a prompt for your own honesty, not a list to recite: only report entries that actually apply to this work. Also report defaults that are **not** in the catalogue; the catalogue is incomplete by design.

Categories to scan every time:

- Visual identity: logo, color palette, typography, layout, iconography, imagery, motion
- Document/presentation structure: format, navigation, keyboard shortcuts, sections, tone
- Naming: product, project, variables, files, routes, tables
- Architecture: framework, language, database, state management, folder structure, patterns
- Libraries and services: which package, which hosted service, which version
- Behavior: error handling style, validation, logging, retries, timeouts, pagination, caching
- Security posture: auth method, session handling, secrets handling, input trust
- Copy and content: headlines, microcopy, README shape, commit style, example data
- Scope: what you left out, what you added without being asked

### Naming "styles you don't want"

For each [DEFAULT] in a creative or design area, end with a ready-to-paste exclusion the user can add to their next prompt, for example: `Avoid: a single-letter monogram logo, a dot or underscore accent, gradient purple-to-blue backgrounds.` Specific patterns steer far better than "avoid generic".

## Output: full brief

Use `references/brief-template.md` as the skeleton. The sections, in order:

1. **Header**: what was built, tier (customer-facing / PoC / unclear, and why you think so), date.
2. **The 60-second version**: three to five sentences. What it is, how it works at the level you would say aloud at a whiteboard, and the one decision most worth defending.
3. **How it works**: the mental model. A small ASCII diagram if it helps (components and the direction data flows). Name the main data structures and why they were chosen.
4. **Decisions**: a table. Columns: Decision, Choice, Provenance tag, Alternative not taken, Why it matters. Order by consequence, not by the order you made them. Aim for 5-12 rows; do not pad.
5. **Defaults I relied on**: only [DEFAULT] and [GUESS] items, each with the catalogue ID if any, the alternatives, and the paste-ready exclusion line. If there are none, say so and explain why you believe that. Do not leave this section out.
6. **Where it fails**: concrete failure modes with triggers. Include scale limits, partial failures, bad input, and concurrency.
7. **If someone malicious is involved**: what each untrusted party (user, other tenant, network attacker, compromised dependency) can do. If you did not analyze a party, say that.
8. **Defend it**: four to six questions a skeptical reviewer would ask, each with a two-to-three sentence answer the user could give. At least one must be a "why X instead of Y" and one a "where does this fail".
9. **Not verified**: what you did not test or could not check. Be explicit; an untested path is something the user must not claim to understand.

### Quality rules

- Write for someone who did not watch you work and will read this once.
- Prefer specific over general. "Chose SQLite because there is one writer and the dataset fits in memory" beats "Chose a simple database".
- Do not praise the work. Do not hedge everything. Where you are uncertain, say it once, in the right place.
- Keep the whole file under roughly 150 lines. Link to code with `path:line` rather than pasting it.
- Do not claim a test passed unless you ran it.
- Never omit an unflattering truth (a shortcut, a TODO, a known bug). Those are what the user most needs to know before being asked.

## Output: short digest

At most 15 lines, in this shape:

```
Whiteboard (short): <what was built, one line>
How it works: <one or two sentences>
Key decisions: <up to 3, each with [USER]/[INFERRED]/[DEFAULT]/[GUESS]>
Relied on defaults: <comma-separated list with catalogue IDs, or "none found">
Weakest point: <the single most likely failure or gap>
Be ready to answer: "<the one hardest question>"
Full brief: .whiteboard/<file>   (or: run /whiteboard for the full brief)
```

If `output` is `both` or `file`, also write the full brief in the same turn (see below), so the pointer is real.

## Saving the brief

When saving: ensure the directory exists, write `<directory>/<YYYY-MM-DD>-<slug>.md` where the slug is three to five lowercase words from the work, and never overwrite an existing brief (append `-2`). Do not add the directory to `.gitignore` and do not commit it; tell the user in one line that it is uncommitted and let them decide.

## Quiz mode

Goal: make the user practice defending the work, not read about it.

1. Use the most recent brief (file or this session). If none exists, build the analysis silently first.
2. Ask **one** question at a time, from the "Defend it" list and the Decisions table. Mix "why X over Y", "where does this fail", and "what if an attacker...".
3. Wait for the answer. Do not hint beforehand.
4. Grade it briefly against what is actually true in the code: **solid**, **partly right** (say what is missing), or **wrong** (say what is true). One or two sentences. Then show the model answer only if the user was not solid.
5. After five questions or when the user says stop, summarize: which decisions the user can defend, and which to revisit. Offer to save the summary.

Never grade against an answer you invented. If you are unsure what the code does, read it before grading.

## Honesty limits

State these when relevant, never hide them:

- You cannot introspect your own training. "[DEFAULT]" means "unspecified by the user and matches a habitual pattern", not "proven to be a model bias".
- Your account of why you made a choice is a reconstruction from context. It is usually right; it can still be wrong. Where the reconstruction is shaky, use [GUESS].
- The user is accountable for what they ship. The brief informs them; it does not replace reading the parts that matter.
