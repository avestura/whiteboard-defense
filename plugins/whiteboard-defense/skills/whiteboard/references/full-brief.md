# Full brief

Read this only for `full` and `defaults` modes, after the matching steps in SKILL.md.

## Sections

Use `references/brief-template.md` as the skeleton. The sections, in order:

1. **Header**: what was built, tier (customer-facing / PoC / unclear, and why you think so), date.
2. **The 60-second version**: three to five sentences. What it is, how it works at the level you would say aloud at a whiteboard, and the one decision most worth defending.
3. **How it works**: the mental model. A small ASCII diagram if it helps (components and the direction data flows). Name the main data structures and why they were chosen.
4. **Decisions**: a table. Columns: Decision, Choice, Provenance tag (with the catalogue ID when one matched), Alternative not taken, Why it matters. Order by consequence, not by the order you made them. Aim for 5-12 rows; do not pad.
5. **Defaults I relied on**: only [DEFAULT] and [GUESS] items, never [USER] ones even when they match the catalogue, each with the catalogue ID if any, the alternatives, and the paste-ready exclusion line. If there are none, say so and explain why you believe that. Do not leave this section out.
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


### Naming "styles you don't want"

For each [DEFAULT] in a creative or design area, end with a ready-to-paste exclusion the user can add to their next prompt, for example: `Avoid: a single-letter monogram logo, a dot or underscore accent, gradient purple-to-blue backgrounds.` Specific patterns steer far better than "avoid generic".

## Saving


When saving: ensure the directory exists, write `<directory>/<YYYY-MM-DD>-<slug>.md` where the slug is three to five lowercase words from the work, and never overwrite an existing brief (append `-2`). Do not add the directory to `.gitignore` and do not commit it; tell the user in one line that it is uncommitted and let them decide.

