import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Brief, BriefDecision, Pending, Provenance } from '../types'

// Rich UI for Claude Code: a band above the prompt, a brief pane, a status
// entry, a `report` tool the skill hands its brief to, and automatic briefs
// triggered at the end of a turn. With the `ui` option set to `prompt` the
// module registers only `/whiteboard-ui` (to switch back) and the skill works
// exactly as it does in Codex and OpenCode.

const PLUGIN = 'whiteboard-defense'
const PANE = 'whiteboard'
const EDIT_TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit'])
const NONE: Pending = { files: [], lines: 0 }

const brief = atom({ plugin: 'whiteboard-defense', key: 'brief' } as const, null)
const pending = atom({ plugin: 'whiteboard-defense', key: 'pending' } as const, NONE)
const isHidden = atom({ plugin: 'whiteboard-defense', key: 'isHidden' } as const, false)

const TAG_COLOR: Record<Provenance, string> = {
  USER: 'suggestion',
  INFERRED: 'success',
  DEFAULT: 'error',
  GUESS: 'warning',
}

const PROMPTS = {
  brief: 'Use the whiteboard skill: write the full brief for the work so far.',
  short: 'Use the whiteboard skill in short mode for the work in the previous turn. This was triggered automatically by the whiteboard-defense plugin.',
  quiz: 'Use the whiteboard skill in quiz mode.',
}

type ProjectConfig = { auto?: string; tier?: string }

const isProvenance = (v: unknown): v is Provenance =>
  v === 'USER' || v === 'INFERRED' || v === 'DEFAULT' || v === 'GUESS'

const str = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined

/** Turns the report tool's input into a Brief, dropping malformed rows. */
export function toBrief(input: Record<string, unknown>): Brief | string {
  const title = str(input.title)
  if (title === undefined) return 'title is required'
  const rawDecisions = Array.isArray(input.decisions) ? input.decisions : []
  const decisions: BriefDecision[] = []
  for (const row of rawDecisions) {
    const r = (row ?? {}) as Record<string, unknown>
    const decision = str(r.decision)
    const choice = str(r.choice)
    const provenance = typeof r.provenance === 'string' ? r.provenance.toUpperCase() : ''
    if (decision === undefined || choice === undefined || !isProvenance(provenance)) continue
    decisions.push({ decision, choice, provenance, alternative: str(r.alternative), id: str(r.id) })
  }
  const rawDefaults = Array.isArray(input.defaults) ? input.defaults : []
  const defaults = rawDefaults.flatMap(row => {
    const r = (row ?? {}) as Record<string, unknown>
    const name = str(r.name)
    return name === undefined ? [] : [{ name, id: str(r.id), avoid: str(r.avoid) }]
  })
  return {
    title,
    tier: str(input.tier),
    file: str(input.file),
    decisions,
    defaults,
    weakest: str(input.weakest),
    question: str(input.question),
  }
}

/** Rough count of lines an edit touched; good enough for a threshold. */
export function linesTouched(tool: string, input: Record<string, unknown>): number {
  const count = (s: unknown) => (typeof s === 'string' && s !== '' ? s.split('\n').length : 0)
  if (tool === 'Write') return count(input.content)
  if (tool === 'Edit') return Math.max(count(input.old_string), count(input.new_string))
  if (tool === 'MultiEdit' && Array.isArray(input.edits)) {
    return input.edits.reduce<number>((n, edit) => {
      const e = (edit ?? {}) as Record<string, unknown>
      return n + Math.max(count(e.old_string), count(e.new_string))
    }, 0)
  }
  if (tool === 'NotebookEdit') return count(input.new_source)
  return 0
}

export function isBriefFile(path: string): boolean {
  return /(^|[\\/])\.whiteboard[\\/]/.test(path)
}

function countTags(b: Brief): Record<Provenance, number> {
  const n: Record<Provenance, number> = { USER: 0, INFERRED: 0, DEFAULT: 0, GUESS: 0 }
  for (const d of b.decisions) n[d.provenance] += 1
  return n
}

/** The project's .whiteboard/config.json, shared with the skill; {} when absent or invalid. */
async function projectConfig($: EngineInterface): Promise<ProjectConfig> {
  try {
    return JSON.parse(await $.fs.read('.whiteboard/config.json')) as ProjectConfig
  } catch {
    return {}
  }
}

export const register: Register = (on, options) => {
  const mode = options.ui === 'prompt' ? 'prompt' : 'rich'
  const threshold = typeof options.autoThreshold === 'number' ? options.autoThreshold : 30

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'whiteboard-ui',
      description: 'Whiteboard Defense: switch between the rich UI and prompt-only mode',
      argumentHint: 'rich | prompt',
    })
    if (mode === 'rich') {
      // Not awaited: the tool is first needed at a turn's end, and a slow
      // loopback connection (a proxy that catches 127.0.0.1) must not hold
      // the session's start.
      void $.tool.register({
        name: 'report',
        isDeferred: false,
        description:
          'Hand a finished whiteboard-defense brief to the Whiteboard Defense UI, which shows it to the user in a band above the prompt and a pane. Call it once after every brief the whiteboard skill produces (short or full), with the same content. Not for anything else.',
        inputSchema: {
          type: 'object',
          required: ['title', 'decisions', 'defaults'],
          properties: {
            title: { type: 'string', description: 'What was built, one line' },
            tier: { type: 'string', description: 'customer-facing, PoC, or unclear' },
            file: { type: 'string', description: 'Path of the saved brief, if one was written' },
            decisions: {
              type: 'array',
              items: {
                type: 'object',
                required: ['decision', 'choice', 'provenance'],
                properties: {
                  decision: { type: 'string' },
                  choice: { type: 'string' },
                  provenance: { type: 'string', enum: ['USER', 'INFERRED', 'DEFAULT', 'GUESS'] },
                  alternative: { type: 'string' },
                  id: { type: 'string', description: 'Catalogue ID when this decision matches one, whatever its provenance' },
                },
              },
            },
            defaults: {
              type: 'array',
              description: 'The [DEFAULT] and [GUESS] items from "Defaults I relied on"',
              items: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: { type: 'string' },
                  id: { type: 'string', description: 'Catalogue ID such as D-LOGO-01' },
                  avoid: { type: 'string', description: 'The paste-ready "Avoid:" line' },
                },
              },
            },
            weakest: { type: 'string', description: 'The single most likely failure or gap' },
            question: { type: 'string', description: 'The hardest question the user should be ready for' },
          },
        },
      }).catch(() => $.ui.toast('Whiteboard Defense: the report tool did not register; briefs will show in chat only.'))
    }
    return next(e)
  })

  on('command.run', { command: 'whiteboard-ui' }, async ($, e) => {
    const want = e.args.trim()
    if (want !== 'rich' && want !== 'prompt') {
      return { text: `Whiteboard Defense UI is ${mode}. Use /whiteboard-ui rich or /whiteboard-ui prompt.` }
    }
    if (want === mode) return { text: `Already in ${mode} mode.` }
    const { deny } = await $.config.set({ key: `${PLUGIN}.ui`, value: want })
    if (deny !== undefined) return { text: `Could not switch: ${deny}` }
    return {
      text:
        want === 'prompt'
          ? 'Switched to prompt mode: no band, pane or automatic trigger. The skill still works via /whiteboard-defense:whiteboard.'
          : 'Switched to the rich UI.',
    }
  })

  if (mode === 'prompt') return

  on('tool.call', { tool: 'mcp__whiteboard-defense__report' }, async ($, e) => {
    const made = toBrief(e as unknown as Record<string, unknown>)
    if (typeof made === 'string') return { deny: `whiteboard report rejected: ${made}` }
    await update($, brief, () => made)
    await update($, pending, () => NONE)
    await update($, isHidden, () => false)
    const tags = countTags(made)
    const flagged = tags.DEFAULT + tags.GUESS
    $.ui.status(flagged > 0 ? `wb: ${tags.DEFAULT} default, ${tags.GUESS} guess` : 'wb: briefed')
    if (flagged > 0) $.ui.toast(`Whiteboard: ${flagged} decision(s) you never made. See the band above the prompt.`)
    return { result: 'Shown to the user in the Whiteboard Defense band and pane. Do not repeat the decisions table in chat beyond the short digest.' }
  }).catch(() => ({ deny: 'whiteboard report failed inside the plugin; the brief in chat still stands.' }))

  on('tool.call', async ($, e, next) => {
    const ran = await next(e)
    if (!EDIT_TOOLS.has(String(e.tool)) || ran.deny !== undefined || ran.isError === true) return ran
    const input = e as unknown as Record<string, unknown>
    const path = str(input.file_path) ?? str(input.notebook_path)
    if (path === undefined || isBriefFile(path)) return ran
    const lines = linesTouched(String(e.tool), input)
    await update($, pending, p => ({
      files: p.files.includes(path) ? p.files : [...p.files, path].slice(-200),
      lines: p.lines + lines,
    }))
    await update($, isHidden, () => false)
    return ran
  }).catch(($, e, next) => next(e))

  on('turn.complete', async ($, e, next) => {
    const done = await next(e)
    if (e.agentId !== undefined || e.reason !== 'answer') return done
    const p = await read($, pending)
    if (p.files.length === 0 || p.lines < threshold) return done
    const cfg = await projectConfig($)
    const auto = cfg.auto ?? (typeof options.auto === 'string' ? options.auto : 'short')
    if (auto === 'off' || cfg.tier === 'poc') return done
    // Reset first so a brief turn that fails to report cannot re-trigger itself.
    await update($, pending, () => NONE)
    void $.prompt.submit({ text: auto === 'full' ? PROMPTS.brief : PROMPTS.short })
    return done
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || (await read($, isHidden))) return next(e)
    const b = await read($, brief)
    const p = await read($, pending)
    if (b === null && p.files.length === 0) return next(e)

    const { Box, Text, Button } = $.ui.resolve(e)
    const ask = (text: string) => () => void $.prompt.submit({ text })
    const tags = b === null ? null : countTags(b)

    return (
      <Box flexDirection="row" flexWrap="wrap" gap={1}>
        <Text bold>whiteboard</Text>
        {p.files.length > 0 ? (
          <Text dimColor>
            {p.files.length} file{p.files.length === 1 ? '' : 's'} changed since last brief
          </Text>
        ) : null}
        {b !== null && tags !== null && p.files.length === 0 ? (
          <Text wrap="truncate-end">
            <Text dimColor>{b.title} · {b.decisions.length} decisions </Text>
            {tags.DEFAULT > 0 ? <Text color={TAG_COLOR.DEFAULT}>{tags.DEFAULT} DEFAULT </Text> : null}
            {tags.GUESS > 0 ? <Text color={TAG_COLOR.GUESS}>{tags.GUESS} GUESS</Text> : null}
          </Text>
        ) : null}
        {p.files.length > 0 ? <Button key="brief" label="Brief me" hotkey="b" variant="primary" onPress={ask(PROMPTS.brief)} /> : null}
        {b !== null ? <Button key="open" label="Open" hotkey="o" onPress={() => void $.ui.open({ id: PANE, title: 'Whiteboard brief' })} /> : null}
        {b !== null ? <Button key="quiz" label="Quiz me" hotkey="q" onPress={ask(PROMPTS.quiz)} /> : null}
        <Button key="hide" label="Hide" hotkey="h" onPress={() => update($, isHidden, () => true)} />
      </Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e)
    const b = await read($, brief)
    if (b === null) {
      return (
        <Box flexDirection="column">
          <Text dimColor>No brief yet. Run /whiteboard-defense:whiteboard after some work.</Text>
        </Box>
      )
    }
    return (
      <Box flexDirection="column" gap={1}>
        <Box flexDirection="column">
          <Text bold>{b.title}</Text>
          {b.tier !== undefined ? <Text dimColor>Tier: {b.tier}</Text> : null}
          {b.file !== undefined ? <Text dimColor>Saved: {b.file}</Text> : null}
        </Box>
        <Box flexDirection="column">
          <Text bold>Decisions</Text>
          {b.decisions.map(d => (
            <Text>
              <Text color={TAG_COLOR[d.provenance]}>[{d.provenance}]</Text> {d.decision}: {d.choice}
              {d.id !== undefined ? <Text dimColor> {d.id}</Text> : null}
              {d.alternative !== undefined ? <Text dimColor> (not: {d.alternative})</Text> : null}
            </Text>
          ))}
        </Box>
        <Box flexDirection="column">
          <Text bold>Defaults relied on</Text>
          {b.defaults.length === 0 ? <Text dimColor>None found.</Text> : null}
          {b.defaults.map((d, i) => (
            <Box flexDirection="column">
              <Text>
                <Text color={TAG_COLOR.DEFAULT}>{d.id ?? 'not in catalogue'}</Text> {d.name}
              </Text>
              {d.avoid !== undefined ? (
                <Box flexDirection="row" gap={1}>
                  <Text dimColor>{d.avoid}</Text>
                  <Button
                    key={`copy-${i}`}
                    label="copy"
                    onPress={press => void $.ui.copy({ text: d.avoid ?? '', surface: press.surface })}
                  />
                </Box>
              ) : null}
            </Box>
          ))}
        </Box>
        {b.weakest !== undefined ? (
          <Text>
            <Text bold>Weakest point: </Text>
            {b.weakest}
          </Text>
        ) : null}
        {b.question !== undefined ? (
          <Text>
            <Text bold>Be ready for: </Text>
            {b.question}
          </Text>
        ) : null}
        <Box flexDirection="row" gap={1}>
          <Button key="quiz" label="Quiz me" hotkey="q" variant="primary" onPress={() => void $.prompt.submit({ text: PROMPTS.quiz })} />
        </Box>
      </Box>
    )
  })
}
