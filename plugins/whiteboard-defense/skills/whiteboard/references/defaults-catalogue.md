# Defaults catalogue

Patterns that AI coding and design agents commonly fall back on when the prompt does not specify otherwise. Entries are community-observed tendencies, not proven facts about any model, and they change between model versions. Treat each as a question to ask of the work: *did I choose this deliberately, or because it is what I always do?*

How to use: match an entry by its **Trigger**. If the work matches and the user did not specify it, report it as `[DEFAULT]` with the ID. Offer the **Alternatives** and a paste-ready `Avoid:` line. Entries are not exhaustive; report unlisted defaults too.

ID scheme: `D-<AREA>-<NN>`. To add one, see CONTRIBUTING.md.

---

## Visual identity

### D-LOGO-01: Monogram logo
- **Trigger**: asked for a logo, mark, or icon without a concept.
- **Default**: a single letter or initial, often inside a circle or rounded square.
- **Alternatives**: a wordmark, an abstract shape from the product's mechanism, a pictorial mark, a pattern or grid.
- **Avoid line**: `Avoid: a single-letter monogram, letters in circles or rounded squares.`

### D-LOGO-02: Accent dot
- **Trigger**: logo or wordmark.
- **Default**: a dot, period, or underscore added as the "distinctive" element.
- **Alternatives**: no accent; custom letterform; a shape that carries meaning.
- **Avoid line**: `Avoid: a dot, period, or underscore accent on the wordmark.`

### D-LOGO-03: Gradient logo
- **Trigger**: logo, app icon.
- **Default**: a two-color gradient fill on a simple geometric shape.
- **Alternatives**: flat single-color mark, high-contrast two-tone, outline.

### D-COLOR-01: Purple/indigo-to-blue gradient
- **Trigger**: any page, app, or slide with no brand colors given.
- **Default**: indigo or violet accents, often with a purple-to-blue gradient on hero areas or buttons.
- **Alternatives**: a palette derived from the subject (materials, place, era), a single saturated accent on neutrals, an earthy or print-inspired palette.
- **Avoid line**: `Avoid: purple/indigo/violet accents and purple-to-blue gradients.`

### D-COLOR-02: Dark mode with glowing accents
- **Trigger**: "modern", "developer", "AI", or "tech" product pages.
- **Default**: near-black background, neon or glow accents, subtle radial gradients.
- **Alternatives**: light paper-like backgrounds, mid-tone colored backgrounds, high-contrast monochrome.

### D-TYPE-01: Inter / system sans stack
- **Trigger**: any UI with no typography direction.
- **Default**: Inter or the system sans stack, regular weights, even hierarchy.
- **Alternatives**: a distinctive display face paired with a text face; serif body; monospaced accents chosen for the subject.
- **Avoid line**: `Avoid: Inter, Roboto, Arial, and system-ui as the primary typeface.`

### D-LAYOUT-01: Centered hero, two buttons
- **Trigger**: landing page.
- **Default**: centered headline, subhead, a primary and a secondary button, then a screenshot or illustration below.
- **Alternatives**: asymmetric or left-aligned layouts, content-first pages, the product itself as the hero.
- **Avoid line**: `Avoid: a centered hero with two buttons; use an asymmetric layout.`

### D-LAYOUT-02: Three-up feature cards with icons
- **Trigger**: a "features" section.
- **Default**: three equal cards, each with an icon, a short title, and a sentence.
- **Alternatives**: a single narrative column, a table, an annotated screenshot, a worked example.
- **Avoid line**: `Avoid: grids of equal cards with icons; no emoji or icon-in-circle bullets.`

### D-UI-01: Rounded cards with soft shadows
- **Trigger**: any dashboard or app UI.
- **Default**: large border radii, subtle drop shadows, pill-shaped badges, lots of padding.
- **Alternatives**: hard borders, tight density, square corners, table-first layouts.

### D-UI-02: Emoji as iconography
- **Trigger**: bullets, headings, or buttons needing an icon.
- **Default**: emoji (rockets, sparkles, checkmarks) used as icons.
- **Alternatives**: a consistent icon set, text only, custom marks.

### D-IMG-01: Stock-style illustration or abstract blobs
- **Trigger**: a section needing imagery and none supplied.
- **Default**: abstract gradient blobs, floating shapes, or generic isometric illustrations.
- **Alternatives**: real diagrams of the system, actual screenshots, no imagery.

---

## Presentations and documents

### D-SLIDES-01: Standard HTML deck mechanics
- **Trigger**: a local HTML presentation.
- **Default**: click or arrow to advance, `N` toggles speaker notes, `F` for fullscreen, progress bar at the bottom, a title slide then "agenda", one idea per slide with large heading.
- **Alternatives**: scroll-based narrative, a single-page poster, printed handout format, live-code or diagram-led slides.
- **Avoid line**: `Avoid: the click-to-advance deck with an N-for-notes toggle, a progress bar, and an agenda slide.`

### D-SLIDES-02: Opening and closing formula
- **Trigger**: any deck.
- **Default**: title, agenda, problem, solution, features, roadmap, "Thank you / Questions?".
- **Alternatives**: start with the demo or the surprising number; end on the decision needed.

### D-DOC-01: README skeleton
- **Trigger**: a new project README.
- **Default**: badges, emoji-headed sections ("Features", "Installation", "Usage", "Contributing", "License"), a bullet list of features.
- **Alternatives**: lead with a runnable example; explain the model before the features; no badges.

### D-DOC-02: Triplet phrasing and em-dash prose
- **Trigger**: any written copy.
- **Default**: lists of three adjectives or nouns, "not just X, but Y" constructions, heavy em-dash use, "seamless", "robust", "powerful".
- **Alternatives**: concrete nouns, numbers, plain sentences.

---

## Naming

### D-NAME-01: Invented product names
- **Trigger**: asked to name a product or project.
- **Default**: portmanteaus or short coined words ending in -ly, -ify, -ora, or built from "Flow", "Sync", "Hub", "Forge", "Nexus", "Pulse".
- **Alternatives**: a literal descriptive name, a word from the problem domain, a name that is checkable for availability.

### D-NAME-02: Generic identifiers
- **Trigger**: variable, class, and file naming with no convention in the repo.
- **Default**: `utils`, `helpers`, `Manager`, `Handler`, `Service`, `data`, `result`.
- **Alternatives**: names that state the responsibility.

---

## Architecture and stack

### D-STACK-01: Default web stack
- **Trigger**: a web app with no stack named.
- **Default**: React with TypeScript, Vite or Next.js, Tailwind, a REST or tRPC API, PostgreSQL or SQLite.
- **Alternatives**: server-rendered HTML with a small amount of JS, a static site, a stack your team already operates.
- **Why it matters**: operational burden, hiring, and lock-in follow from this choice.

### D-STACK-02: Reach for a framework or dependency
- **Trigger**: a small utility need.
- **Default**: add a package instead of writing 20 lines.
- **Alternatives**: standard library; vendored snippet. Check maintenance, license, and supply-chain exposure.

### D-ARCH-01: Layered folders
- **Trigger**: scaffolding a new project.
- **Default**: `src/components`, `src/utils`, `src/services`, `src/types` regardless of project size.
- **Alternatives**: feature-based folders; a single file until it hurts.

### D-ARCH-02: Premature abstraction
- **Trigger**: any feature with one implementation.
- **Default**: an interface, factory, or config layer "for future flexibility".
- **Alternatives**: concrete code until a second use appears.

### D-ARCH-03: Single-process, in-memory state
- **Trigger**: any service code that keeps state between requests (counters, caches, sessions, queues), or a prototype becoming a service.
- **Default**: state held in process memory or local files, so a restart loses it and a second instance or worker gets its own copy.
- **Alternatives**: external store, explicit persistence, idempotent operations.

---

## Behavior

### D-ERR-01: Catch, log, continue
- **Trigger**: any I/O or parsing.
- **Default**: a broad `try/catch` that logs and returns a default, hiding failures from callers.
- **Alternatives**: fail fast; typed errors; surfacing partial failure to the user.

### D-ERR-02: Optimistic input trust
- **Trigger**: request handlers, file parsers, CLI args.
- **Default**: validate shape lightly or not at all; assume well-formed, same-origin, non-hostile input.
- **Alternatives**: schema validation at the boundary; size and rate limits.

### D-NET-01: No timeouts, no retry budget
- **Trigger**: any network call.
- **Default**: library default timeouts (often none) and either no retry or an unbounded one.
- **Alternatives**: explicit timeouts, bounded retries with backoff and jitter, circuit breaking.

### D-DATA-01: Unbounded lists
- **Trigger**: any list endpoint or query.
- **Default**: return everything; no pagination or limits.
- **Alternatives**: cursor pagination; hard caps.

### D-TEST-01: Happy-path tests
- **Trigger**: tests written along with a feature.
- **Default**: tests that mirror the implementation and cover the success path, with mocks everywhere.
- **Alternatives**: boundary and failure cases; integration tests over mocks.

---

## Security posture

### D-SEC-01: Secrets in env or config files
- **Trigger**: any credential.
- **Default**: `.env` file or hard-coded placeholder with a note to move it.
- **Alternatives**: a secrets manager; short-lived credentials.

### D-SEC-02: Roll-your-own session or auth
- **Trigger**: login requirement.
- **Default**: JWT in localStorage, or hand-rolled password hashing with a common algorithm and default parameters.
- **Alternatives**: a vetted library or hosted identity provider; httpOnly cookies; a stated threat model.

### D-SEC-03: Permissive CORS and CSP
- **Trigger**: browser-facing API.
- **Default**: `Access-Control-Allow-Origin: *` or no content-security policy "to make it work".
- **Alternatives**: an explicit origin list; a restrictive CSP.

### D-SEC-04: Trust by obscurity
- **Trigger**: IDs, links, or admin routes.
- **Default**: rely on unguessable URLs or sequential IDs without an authorization check per object.
- **Alternatives**: authorization on every object access.

---

## Process and scope

### D-SCOPE-01: Unrequested extras
- **Trigger**: any task.
- **Default**: adds a config system, logging, dark mode toggle, extra pages, or documentation the user did not request.
- **Alternatives**: do what was asked; list extras as suggestions.

### D-SCOPE-02: Silent omission
- **Trigger**: any ambiguous requirement.
- **Default**: pick an interpretation and say nothing about the other.
- **Alternatives**: state the assumption in the output.

### D-GIT-01: Commit message style
- **Trigger**: a commit message with no project convention.
- **Default**: an imperative summary plus a bulleted body, often generic ("Update", "Improve", "Refactor").
- **Alternatives**: follow the repo's history; explain *why*.

### D-DATA-02: Placeholder content
- **Trigger**: mock data, examples, seed data.
- **Default**: "John Doe", "Acme Corp", "Lorem ipsum", `user@example.com`, round numbers.
- **Alternatives**: realistic data from the domain, including edge cases (long names, empty values, non-ASCII).
