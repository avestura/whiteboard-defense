// Turns a `claude -p --output-format stream-json --verbose` recording into a
// compact transcript the site can replay (docs/demo.js, built by
// scripts/build-demo.mjs):
//
//   { kind: 'prompt', origin: 'user' | 'plugin', text }
//   { kind: 'text', text }
//   { kind: 'tool', name, label, output }
//
// Thinking blocks and system, rate-limit and lifecycle events are dropped.
// Absolute paths never survive: the session cwd is made relative, and any
// other home-directory path is collapsed to "~".

// What the plugin submits when a turn ends (PROMPTS.short in hooks/register.tsx).
// The stream does not echo submitted prompts, only the origin of the turn.
export const PLUGIN_PROMPT =
  'Use the whiteboard skill in short mode for the work in the previous turn. This was triggered automatically by the whiteboard-defense plugin.'

const slashes = s => s.replace(/\\/g, '/')

// Strips the session cwd and any user-home path from free text.
export function scrub(text, cwd) {
  let out = slashes(String(text))
  if (cwd) {
    const base = slashes(cwd).replace(/\/+$/, '')
    const esc = base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    out = out.replace(new RegExp(`${esc}(/|$)`, 'gi'), '')
  }
  return out.replace(/[A-Za-z]:\/Users\/[^/\s"']+/g, '~').replace(/\/(?:home|Users)\/[^/\s"']+/g, '~')
}

const oneLine = (s, max = 90) => {
  const line = String(s).split('\n').map(l => l.trim()).find(Boolean) ?? ''
  if (line.length <= max) return line
  const cut = line.slice(0, max)
  const stop = cut.lastIndexOf('. ')
  return stop > 30 ? cut.slice(0, stop + 1) : cut.slice(0, max - 3).trimEnd() + '...'
}

const lineCount = s => {
  const lines = String(s).split('\n')
  if (lines.at(-1) === '') lines.pop()
  return lines.length
}

// "mcp__whiteboard-defense__report" -> "whiteboard-defense - report (MCP)"
function mcpLabel(name) {
  const [, server, ...tool] = name.split('__')
  return `${server} - ${tool.join('__')} (MCP)`
}

function labelFor(block, cwd) {
  const input = block.input ?? {}
  const rel = p => scrub(p ?? '', cwd)
  switch (block.name) {
    case 'Write': case 'Edit': case 'MultiEdit': case 'Read': return `${block.name}(${rel(input.file_path)})`
    case 'NotebookEdit': return `NotebookEdit(${rel(input.notebook_path)})`
    case 'Skill': return `Skill(${input.skill ?? ''})`
    case 'Glob': return `Glob(${scrub(input.pattern ?? '', cwd)})`
    case 'Grep': return `Grep(${scrub(input.pattern ?? '', cwd)})`
    case 'Bash': return `Bash(${oneLine(scrub(input.command ?? '', cwd), 60)})`
    default: return block.name.startsWith('mcp__') ? mcpLabel(block.name) : block.name
  }
}

function outputFor(block, result, cwd) {
  const input = block.input ?? {}
  if (block.name === 'Write') return `Wrote ${lineCount(input.content ?? '')} lines to ${scrub(input.file_path ?? '', cwd)}`
  if (block.name === 'Skill') return 'Successfully loaded skill'
  if (block.name === 'Edit' || block.name === 'MultiEdit') return `Updated ${scrub(input.file_path ?? '', cwd)}`
  const content = result?.content
  const text = Array.isArray(content) ? content.map(c => c.text ?? '').join('\n') : String(content ?? '')
  if (block.name === 'Read') return `Read ${lineCount(text.replace(/^\s*\d+[\t→]/gm, ''))} lines`
  return oneLine(scrub(text, cwd))
}

/**
 * @param {string} stream  stream-json, one event per line
 * @param {{cwd?: string, prompt?: string}} [opts]  cwd of the session; the first user prompt
 *   (the stream does not echo it)
 */
export function buildTranscript(stream, { cwd = '', prompt = '' } = {}) {
  // Split into turns at each `result` event; the result carries the turn's origin.
  const turns = [{ events: [], origin: null }]
  for (const line of stream.split('\n')) {
    let msg
    try { msg = JSON.parse(line) } catch { continue }
    turns.at(-1).events.push(msg)
    if (msg.type === 'result') {
      turns.at(-1).origin = msg.origin ?? null
      turns.push({ events: [], origin: null })
    }
  }

  const out = []
  const pending = new Map() // tool_use id -> { row, block }
  turns.forEach((turn, i) => {
    if (i === 0 && prompt) out.push({ kind: 'prompt', origin: 'user', text: scrub(prompt, cwd) })
    if (i > 0 && turn.origin?.kind === 'plugin') out.push({ kind: 'prompt', origin: 'plugin', text: PLUGIN_PROMPT })
    for (const msg of turn.events) {
      if (msg.type === 'assistant') {
        for (const block of msg.message?.content ?? []) {
          if (block.type === 'text' && block.text.trim()) out.push({ kind: 'text', text: scrub(block.text.trim(), cwd) })
          if (block.type === 'tool_use') {
            const row = { kind: 'tool', name: block.name, label: labelFor(block, cwd), output: '' }
            out.push(row)
            pending.set(block.id, { row, block })
          }
        }
      } else if (msg.type === 'user' && Array.isArray(msg.message?.content)) {
        for (const block of msg.message.content) {
          const hit = block.type === 'tool_result' ? pending.get(block.tool_use_id) : null
          if (hit) hit.row.output = outputFor(hit.block, block, cwd)
        }
      }
    }
  })
  return out
}
