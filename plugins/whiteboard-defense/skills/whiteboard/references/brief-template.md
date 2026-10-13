# Whiteboard brief: <what was built>

- Date: <YYYY-MM-DD>
- Tier: <customer-facing | PoC | unclear>. <One line on why you think so.>
- Scope of this brief: <task, PR, branch, or paths>

## The 60-second version

<Three to five sentences. What it is, how it works at whiteboard level, and the one decision most worth defending.>

## How it works

```
<optional ASCII diagram: components and data flow>
```

<Main data structures and why. Main control flow in plain words.>

## Decisions

| Decision | Choice | Provenance | Alternative not taken | Why it matters |
|---|---|---|---|---|
| <area> | <what was chosen> | [USER] / [INFERRED] / [DEFAULT] / [GUESS], plus catalogue ID if matched | <the realistic alternative> | <consequence if wrong> |

Provenance key: **[USER]** you asked or approved. **[INFERRED]** context made it the clear choice (evidence named). **[DEFAULT]** unspecified, not forced, the agent's habitual pick. **[GUESS]** the agent was unsure.

## Defaults I relied on

### <short name> (<catalogue ID or "not in catalogue">)

- You did not specify: <what>
- I chose: <what>
- Common alternatives: <2-3>
- Paste into your next prompt: `Avoid: <specific patterns>.`

<If none: "None found. I believe this because ...". Never omit this section.>

## Where it fails

- <trigger> leads to <failure>. Mitigation: <present | absent>.

## If someone malicious is involved

- **<party>**: can <capability>. Stopped by <control> | not stopped.
- Not analyzed: <parties you did not consider>.

## Defend it

1. **Why <X> instead of <Y>?**
   <Two to three sentence answer the user could give.>
2. **Where does this fail?**
   <Answer.>
3. **What does <untrusted party> get if they <act>?**
   <Answer.>
4. **<Question about a data structure or boundary>**
   <Answer.>

## Not verified

- <What was not run, tested, or checked. Do not claim understanding of these.>
