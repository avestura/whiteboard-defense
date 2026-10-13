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
| automatic (end of substantial task) | `short` | Chat-only digest, at most 15 lines. Cheap by design: no file, no reference files read. |
| `/whiteboard` or `$whiteboard` | `full` | Full brief for the current work. |
| `full <target>` | `full` | Full brief for a target: a PR number, branch, commit range, or path. Read the diff yourself. |
| `defaults` | `defaults` | Only the "Defaults I relied on" section. |
| `quiz` | `quiz` | Interactive drill. Read `references/quiz.md`. |
| `config` | `config` | Show or change preferences. See "Preferences". |
| `ship` / `poc` | `tier` | Record whether the work is customer-facing or a PoC. See "Tiering". |

## Claude Code rich UI

When the tool `mcp__whiteboard-defense__report` is available, the Whiteboard Defense plugin draws the brief in Claude Code's interface (a band above the prompt, a pane, a status entry) and decides when automatic briefs run. Then:

- **Do not start automatic briefs yourself.** The plugin counts changed lines and asks for a short brief at the end of a turn when it is due. Its request says it was "triggered automatically by the whiteboard-defense plugin".
- **When the plugin asks**, apply Tiering and "Substantial" as usual. If the work does not qualify, reply in one line and do not call the tool.
- **After every brief you produce** (short or full, automatic or invoked), call `mcp__whiteboard-defense__report` once with the same content: title, tier, saved file path, the Decisions table rows with their provenance tags and catalogue IDs, the "Defaults I relied on" items with catalogue IDs and `Avoid:` lines, the weakest point, and the hardest question. In full mode write the file first so the path is real; in short mode omit the path.
- Keep the chat digest as specified; the pane holds the detail, so do not paste the decisions table twice.

When the tool is not available (Codex, OpenCode, or Claude Code with the UI set to `prompt`), ignore this section.

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

- `auto`: `"short"` (default), `"full"`, `"suggest"` (Claude Code UI only: show a "Brief me" button instead of spending a turn), or `"off"`. When `"off"`, never produce a brief unless explicitly invoked.
- `output` (full briefs only): `"both"` (default: summary in chat, full brief in a file), `"chat"`, or `"file"` (chat shows only a one-line pointer). Short digests are never saved.
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

### Matching the catalogue (required, in every mode)

The catalogue index below lists every known default pattern. Do this before writing any brief, short or full:

1. List the decisions the work contains, including ones you made without noticing (where state lives, how errors are handled, what was left out).
2. Compare **every** decision against **every** index entry by meaning, not wording. The work rarely uses the entry's words: `except Exception: log; return None` is D-ERR-01; a list endpoint with no limit is D-DATA-01; a token kept in `localStorage` is D-SEC-02.
3. Tag each match by who chose it, then cite its ID where that tag belongs:
   - **[DEFAULT] or [GUESS]** (you chose it): cite the ID in the Decisions table, in "Defaults I relied on", in the short digest's "Relied on defaults" line, and in the report tool's `defaults[].id` and `decisions[].id`.
   - Match on the entry's **Pattern**, never on its topic. A decision about the same subject (where state lives, how errors are handled) is not a match unless it does what the Pattern describes. Test before citing: if the choice is one of the entry's **Alternatives** in `references/defaults-catalogue.md`, the work avoided the pattern, so it goes on the ruled-out line and nowhere else, whoever made the choice.
   - **[USER]** (the user explicitly asked for exactly this, such as "use emoji for the icons" for D-UI-02): cite the ID in the Decisions table only, as "known pattern D-XXX-NN, your call", and in `decisions[].id`. Do **not** list it under "Defaults I relied on", in "Relied on defaults", or in `defaults[]`: you did not rely on a default, the user decided. If the user's request only *allowed* the pattern without asking for it, it is still [DEFAULT]. If the user asked for something that *avoids* the pattern (realistic seed data instead of placeholders for D-DATA-02, a plain descriptive name instead of a coined one for D-NAME-01), the entry did not match: put it on the ruled-out line, not in the Decisions table.
   - An ID next to a decision, in the table or in `decisions[].id`, always means "this decision **is** that pattern". Never attach an ID to a decision that avoids, fixes or resolves a pattern, not even as a note; that belongs on the ruled-out line alone.
4. In full mode only, read `references/defaults-catalogue.md` once for each match's alternatives and `Avoid:` line; do not guess the text. Short mode works from the index alone.
5. If you considered an entry and ruled it out (the work avoids the pattern, or the user asked for the opposite), say so in one line directly under the Decisions table: `Checked and ruled out: D-DATA-02 (seed data uses real edge cases: long names, empty values, non-ASCII).` Never mention ruled-out IDs inside "Defaults I relied on": that section lists only defaults the work actually relies on.
6. Before finishing, re-check each [DEFAULT] and [GUESS] item that has no ID against the index once more. Only then write "not in catalogue". Writing "no catalogue IDs matched" without doing step 2 is a failure of this skill.

The catalogue is a prompt for your own honesty, not a list to recite: report only entries that apply to this work. Also report defaults that are **not** in it; the catalogue is incomplete by design.

#### Catalogue index

<!-- catalogue-index:start (generated by scripts/catalogue-index.mjs; do not edit) -->
- **D-LOGO-01** Monogram logo. When: asked for a logo, mark, or icon without a concept. Pattern: a single letter or initial, often inside a circle or rounded square.
- **D-LOGO-02** Accent dot. When: logo or wordmark. Pattern: a dot, period, or underscore added as the "distinctive" element.
- **D-LOGO-03** Gradient logo. When: logo, app icon. Pattern: a two-color gradient fill on a simple geometric shape.
- **D-COLOR-01** Purple/indigo-to-blue gradient. When: any page, app, or slide with no brand colors given. Pattern: indigo or violet accents, often with a purple-to-blue gradient on hero areas or buttons.
- **D-COLOR-02** Dark mode with glowing accents. When: "modern", "developer", "AI", or "tech" product pages. Pattern: near-black background, neon or glow accents, subtle radial gradients.
- **D-TYPE-01** Inter / system sans stack. When: any UI with no typography direction. Pattern: Inter or the system sans stack, regular weights, even hierarchy.
- **D-LAYOUT-01** Centered hero, two buttons. When: landing page. Pattern: centered headline, subhead, a primary and a secondary button, then a screenshot or illustration below.
- **D-LAYOUT-02** Three-up feature cards with icons. When: a "features" section. Pattern: three equal cards, each with an icon, a short title, and a sentence.
- **D-UI-01** Rounded cards with soft shadows. When: any dashboard or app UI. Pattern: large border radii, subtle drop shadows, pill-shaped badges, lots of padding.
- **D-UI-02** Emoji as iconography. When: bullets, headings, or buttons needing an icon. Pattern: emoji (rockets, sparkles, checkmarks) used as icons.
- **D-IMG-01** Stock-style illustration or abstract blobs. When: a section needing imagery and none supplied. Pattern: abstract gradient blobs, floating shapes, or generic isometric illustrations.
- **D-SLIDES-01** Standard HTML deck mechanics. When: a local HTML presentation. Pattern: click or arrow to advance, `N` toggles speaker notes, `F` for fullscreen, progress bar at the bottom, a title slide then "agenda", one idea per slide with large heading.
- **D-SLIDES-02** Opening and closing formula. When: any deck. Pattern: title, agenda, problem, solution, features, roadmap, "Thank you / Questions?".
- **D-DOC-01** README skeleton. When: a new project README. Pattern: badges, emoji-headed sections ("Features", "Installation", "Usage", "Contributing", "License"), a bullet list of features.
- **D-DOC-02** Triplet phrasing and em-dash prose. When: any written copy. Pattern: lists of three adjectives or nouns, "not just X, but Y" constructions, heavy em-dash use, "seamless", "robust", "powerful".
- **D-NAME-01** Invented product names. When: asked to name a product or project. Pattern: portmanteaus or short coined words ending in -ly, -ify, -ora, or built from "Flow", "Sync", "Hub", "Forge", "Nexus", "Pulse".
- **D-NAME-02** Generic identifiers. When: variable, class, and file naming with no convention in the repo. Pattern: `utils`, `helpers`, `Manager`, `Handler`, `Service`, `data`, `result`.
- **D-STACK-01** Default web stack. When: a web app with no stack named. Pattern: React with TypeScript, Vite or Next.js, Tailwind, a REST or tRPC API, PostgreSQL or SQLite.
- **D-STACK-02** Reach for a framework or dependency. When: a small utility need. Pattern: add a package instead of writing 20 lines.
- **D-ARCH-01** Layered folders. When: scaffolding a new project. Pattern: `src/components`, `src/utils`, `src/services`, `src/types` regardless of project size.
- **D-ARCH-02** Premature abstraction. When: any feature with one implementation. Pattern: an interface, factory, or config layer "for future flexibility".
- **D-ARCH-03** Single-process, in-memory state. When: any service code that keeps state between requests (counters, caches, sessions, queues), or a prototype becoming a service. Pattern: state held in process memory or local files, so a restart loses it and a second instance or worker gets its own copy.
- **D-ERR-01** Catch, log, continue. When: any I/O or parsing. Pattern: a broad `try/catch` that logs and returns a default, hiding failures from callers.
- **D-ERR-02** Optimistic input trust. When: request handlers, file parsers, CLI args. Pattern: validate shape lightly or not at all; assume well-formed, same-origin, non-hostile input.
- **D-NET-01** No timeouts, no retry budget. When: any network call. Pattern: library default timeouts (often none) and either no retry or an unbounded one.
- **D-DATA-01** Unbounded lists. When: any list endpoint or query. Pattern: return everything; no pagination or limits.
- **D-TEST-01** Happy-path tests. When: tests written along with a feature. Pattern: tests that mirror the implementation and cover the success path, with mocks everywhere.
- **D-SEC-01** Secrets in env or config files. When: any credential. Pattern: `.env` file or hard-coded placeholder with a note to move it.
- **D-SEC-02** Roll-your-own session or auth. When: login requirement. Pattern: JWT in localStorage, or hand-rolled password hashing with a common algorithm and default parameters.
- **D-SEC-03** Permissive CORS and CSP. When: browser-facing API. Pattern: `Access-Control-Allow-Origin: *` or no content-security policy "to make it work".
- **D-SEC-04** Trust by obscurity. When: IDs, links, or admin routes. Pattern: rely on unguessable URLs or sequential IDs without an authorization check per object.
- **D-SCOPE-01** Unrequested extras. When: any task. Pattern: adds a config system, logging, dark mode toggle, extra pages, or documentation the user did not request.
- **D-SCOPE-02** Silent omission. When: any ambiguous requirement. Pattern: pick an interpretation and say nothing about the other.
- **D-GIT-01** Commit message style. When: a commit message with no project convention. Pattern: an imperative summary plus a bulleted body, often generic ("Update", "Improve", "Refactor").
- **D-DATA-02** Placeholder content. When: mock data, examples, seed data. Pattern: "John Doe", "Acme Corp", "Lorem ipsum", `user@example.com`, round numbers.
<!-- catalogue-index:end -->

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

## Output: full brief

For `full` and `defaults` modes, read `references/full-brief.md` (sections, quality rules, `Avoid:` lines, saving) and `references/brief-template.md`. Short mode needs neither.

## Output: short digest

At most 15 lines, in this shape:

```
Whiteboard (short): <what was built, one line>
How it works: <one or two sentences>
Key decisions: <up to 3, each with [USER]/[INFERRED]/[DEFAULT]/[GUESS]>
Relied on defaults: <comma-separated list with catalogue IDs, or "none found">
Weakest point: <the single most likely failure or gap>
Be ready to answer: "<the one hardest question>"
Full brief: run /whiteboard
```

Do not write a file in short mode; the last line always points to `/whiteboard`.

## Saving the brief

Only full briefs are saved; see `references/full-brief.md`.

## Quiz mode

Read `references/quiz.md` and follow it.

## Honesty limits

State these when relevant, never hide them:

- You cannot introspect your own training. "[DEFAULT]" means "unspecified by the user and matches a habitual pattern", not "proven to be a model bias".
- Your account of why you made a choice is a reconstruction from context. It is usually right; it can still be wrong. Where the reconstruction is shaky, use [GUESS].
- The user is accountable for what they ship. The brief informs them; it does not replace reading the parts that matter.
