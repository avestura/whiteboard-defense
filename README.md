# Whiteboard Defense

**Know what your AI agent built, and where it just used its defaults.**

A skill and plugin for Claude Code, Codex, and OpenCode. After substantial work, it briefs you on how the thing works, which decisions were made, who made each one (you, the context, or the agent's habit), where it fails, and the questions you should be able to answer if someone pulled you aside at a whiteboard.

Site: https://github.avestura.dev/whiteboard-defense/

## Why

Mitchell Hashimoto's [whiteboard defense](https://x.com/mitchellh/status/2100249348345057389): you should be able to explain any customer-facing system you shipped and defend its decisions, even if you did not write the code. PoCs and demos are exempt. Anything customers touch is not.

Agents make dozens of decisions you never see. Many are not decisions at all, but defaults: the same logo idea, the same slide-deck mechanics, the same stack. Anthropic's own advice for Opus 5.5 is to name the styles you do *not* want, because a general "avoid generic" mostly swaps one default for another. This project extends that idea past design: it tells you where defaults were used, so you can steer next time.

## Install

One command. It installs for every supported agent it finds on your PATH.

macOS / Linux / Git Bash:

```sh
curl -fsSL https://raw.githubusercontent.com/avestura/whiteboard-defense/main/install.sh | sh
```

Windows PowerShell:

```powershell
irm https://raw.githubusercontent.com/avestura/whiteboard-defense/main/install.ps1 | iex
```

Pick agents explicitly: `... | sh -s -- claude codex opencode`. Remove with `--uninstall`.

### Per agent, manually

**Claude Code**

```sh
claude plugin marketplace add avestura/whiteboard-defense
claude plugin install whiteboard-defense@whiteboard-defense
```

Run it with `/whiteboard-defense:whiteboard`.

**Codex**: copy the skill into your personal skills directory, then run `$whiteboard`.

```sh
git clone https://github.com/avestura/whiteboard-defense && cp -r whiteboard-defense/plugins/whiteboard-defense/skills/whiteboard ~/.agents/skills/
```

There is also a Codex plugin marketplace entry: `codex plugin marketplace add avestura/whiteboard-defense`, then install it from the plugins directory in the app.

**OpenCode**: same skill directory (`~/.agents/skills` is read by OpenCode too), plus the command file.

```sh
cp -r whiteboard-defense/plugins/whiteboard-defense/skills/whiteboard ~/.agents/skills/
cp whiteboard-defense/opencode/commands/whiteboard.md ~/.config/opencode/commands/
```

Run it with `/whiteboard`.

## Use

| Command | What you get |
|---|---|
| (automatic) | A short digest after each substantial task. Chat-only digest, full brief saved to `.whiteboard/`. |
| `/whiteboard` | Full brief for the current work. |
| `/whiteboard full <PR, branch, or path>` | Full brief for something that already exists. |
| `/whiteboard defaults` | Only the "defaults I relied on" section, with paste-ready `Avoid:` lines. |
| `/whiteboard quiz` | One question at a time, graded against the real code. |
| `/whiteboard config` | Show or change preferences. |

(Claude Code prefixes the plugin name: `/whiteboard-defense:whiteboard`. Codex uses `$whiteboard`.)

A brief tags every decision:

- **[USER]**: you asked for it.
- **[INFERRED]**: context forced it (evidence named).
- **[DEFAULT]**: you did not specify it and the agent went with its habit.
- **[GUESS]**: the agent was unsure.

See [`examples/sample-brief.md`](examples/sample-brief.md).

### Preferences

Create `.whiteboard/config.json` in a project, or `~/.config/whiteboard-defense/config.json` globally. Or just tell the agent "turn off automatic whiteboard briefs".

```json
{
  "auto": "short",
  "output": "both",
  "directory": ".whiteboard",
  "minimumSize": "substantial"
}
```

- `auto`: `short` (default), `full`, or `off`
- `output`: `both` (default), `chat`, or `file`
- `tier`: set `"poc"` to skip automatic briefs in a project that is a demo

### Claude Code: rich UI

In Claude Code the plugin also draws in the interface. This is on by default:

- **A band above the prompt**: `N files changed since last brief [Brief me]`, then after a brief, `8 decisions · 2 DEFAULT · 1 GUESS [Open] [Quiz me] [Hide]`.
- **A brief pane** (`Open`): every decision with its colored tag, each default with its catalogue ID and a copy button for its `Avoid:` line, the weakest point, and the question to be ready for.
- **A status line entry**: `wb: 2 default, 1 guess`.
- **Reliable automatic briefs**: the plugin counts the lines changed by edits, and when a turn ends past the threshold (30 lines by default) it asks for a short brief. Edits to `.whiteboard/` are not counted, and `auto: "off"` or `tier: "poc"` in `.whiteboard/config.json` turn it off.

Switch back to the plain skill at any time:

```
/whiteboard-ui prompt     # skill only: no band, pane, status or automatic trigger
/whiteboard-ui rich       # back to the UI
```

The same settings (`ui`, `auto`, `autoThreshold`) are rows in `/config`.

Codex and OpenCode use the skill alone. OpenCode's v2 plugin API has UI slots and panels too; a port is possible but not built yet.

## What this can and cannot do

Honest limits, because a tool about honesty should have them:

- The agent cannot see its own weights. `[DEFAULT]` means "you did not specify it, nothing forced it, and it matches a habitual pattern" and not "proven model bias".
- The "why" is reconstructed from the conversation and the diff. It is usually right and can still be wrong. Shaky reconstructions are tagged `[GUESS]`.
- The defaults catalogue is the strongest piece and also the least complete. It is community-extendable. See [CONTRIBUTING.md](CONTRIBUTING.md).
- It does not replace reading the parts that matter. It tells you where to look.
- In Codex, OpenCode, and Claude Code's prompt mode, automatic briefs depend on the agent honoring the skill description, which is probabilistic. If one is skipped, run `/whiteboard`. Claude Code's rich UI triggers them from the plugin instead.

## Repository layout

```
.claude-plugin/marketplace.json        Claude Code marketplace
.agents/plugins/marketplace.json       Codex marketplace
plugins/whiteboard-defense/
  .claude-plugin/plugin.json           Claude Code manifest
  plugin.json                          Codex / portable manifest
  hooks/register.tsx                   Claude Code UI: band, pane, status, auto-trigger
  types/index.d.ts                     its state contract
  tests/register.test.ts               run with: claude plugin test plugins/whiteboard-defense
  skills/whiteboard/
    SKILL.md                           the skill (shared by all three agents)
    references/defaults-catalogue.md   known default patterns
    references/brief-template.md
opencode/commands/whiteboard.md        OpenCode slash command
evals/                                 catalogue-matching regression evals (real sessions)
scripts/catalogue-index.mjs            regenerates the catalogue index inside SKILL.md
install.sh, install.ps1                one-command installers
docs/                                  GitHub Pages site
```

## License

MIT
