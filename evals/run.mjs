#!/usr/bin/env node
// Catalogue-matching regression evals for the whiteboard skill.
//
// Each scenario runs a real headless Claude Code session with the plugin
// loaded from this checkout, then scores the brief the skill hands to the
// plugin's report tool (mcp__whiteboard-defense__report):
//
//   expectDefaults  IDs that must be flagged as a default: in defaults[], or on
//                   a decision tagged DEFAULT or GUESS
//   expectUser      IDs that must be cited on a decision tagged USER
//   forbidDefaults  IDs that must NOT be flagged as a default
//   forbidUser      IDs that must NOT be cited as a user choice ("known pattern, your call")
//
// Scenarios:  evals/scenarios/<name>/scenario.json  (+ files/ for fixtures)
//   mode "fixture": files/ is copied into a fresh repo and the skill is asked
//                   for a full brief of it, given the original request
//   mode "live":    the prompt is run as-is; the plugin's automatic trigger
//                   must produce the brief (covers the end-to-end path)
//
// Usage: node evals/run.mjs [--only a,b] [--runs N] [--model M] [--concurrency N]
// Costs real model calls: roughly one or two turns per scenario per run.
import { spawn, spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildTranscript } from './transcript.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const pluginDir = join(root, 'plugins', 'whiteboard-defense')
const REPORT = 'mcp__whiteboard-defense__report'

const args = process.argv.slice(2)
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  return i === -1 ? fallback : args[i + 1]
}
const model = opt('model', 'claude-sonnet-5-5')
const runs = Number(opt('runs', '1'))
const concurrency = Number(opt('concurrency', '3'))
const only = opt('only', '')?.split(',').filter(Boolean) ?? []
const timeoutMs = Number(opt('timeout', '600')) * 1000

const scenarios = readdirSync(join(here, 'scenarios'))
  .filter(name => only.length === 0 || only.includes(name))
  .map(name => ({ name, dir: join(here, 'scenarios', name), ...JSON.parse(readFileSync(join(here, 'scenarios', name, 'scenario.json'), 'utf8')) }))
if (scenarios.length === 0) throw new Error('no scenarios matched')

const fixturePrompt = request =>
  'Use the whiteboard skill to write a full brief for the work in this directory. ' +
  'These files were written by an AI agent in response to the request below, and the user specified nothing beyond it. ' +
  'Treat the files as your own work when deciding provenance.\n\n' +
  `Request: "${request}"`

// A plugin's tools are served on 127.0.0.1; a proxy that catches loopback
// traffic (a NO_PROXY of wildcards like 127.*) hides them from the session.
const env = { ...process.env, NO_PROXY: `127.0.0.1,localhost${process.env.NO_PROXY ? ',' + process.env.NO_PROXY : ''}` }

function runClaude(cwd, prompt) {
  return new Promise(resolve => {
    const child = spawn('claude', [
      '-p', '--plugin-dir', pluginDir, '--model', model,
      '--allowedTools', `Read,Write,Edit,Glob,Grep,Skill,${REPORT}`,
      '--output-format', 'stream-json', '--verbose',
    ], { cwd, env, stdio: ['pipe', 'pipe', 'pipe'] })
    let out = ''
    let err = ''
    const timer = setTimeout(() => child.kill(), timeoutMs)
    child.stdout.on('data', d => { out += d })
    child.stderr.on('data', d => { err += d })
    child.on('close', code => { clearTimeout(timer); resolve({ code, out, err }) })
    child.stdin.end(prompt)
  })
}

function lastReport(stream) {
  let report = null
  for (const line of stream.split('\n')) {
    let msg
    try { msg = JSON.parse(line) } catch { continue }
    if (msg.type !== 'assistant') continue
    for (const block of msg.message?.content ?? []) {
      if (block.type === 'tool_use' && block.name === REPORT) report = block.input
    }
  }
  return report
}

function score(s, report) {
  if (report === null) return { pass: false, problems: ['no brief reached the report tool'], flagged: [], user: [] }
  const decisions = Array.isArray(report.decisions) ? report.decisions : []
  const defaults = Array.isArray(report.defaults) ? report.defaults : []
  const tag = d => String(d.provenance ?? '').toUpperCase()
  const flagged = new Set([
    ...defaults.map(d => d.id),
    ...decisions.filter(d => tag(d) === 'DEFAULT' || tag(d) === 'GUESS').map(d => d.id),
  ].filter(Boolean))
  const user = new Set(decisions.filter(d => tag(d) === 'USER').map(d => d.id).filter(Boolean))
  const problems = []
  for (const id of s.expectDefaults ?? []) if (!flagged.has(id)) problems.push(`missed ${id}`)
  for (const id of s.expectUser ?? []) if (!user.has(id)) problems.push(`${id} not cited as USER`)
  for (const id of s.forbidDefaults ?? []) if (flagged.has(id)) problems.push(`wrongly flagged ${id}`)
  for (const id of s.forbidUser ?? []) if (user.has(id)) problems.push(`${id} wrongly cited as USER`)
  return { pass: problems.length === 0, problems, flagged: [...flagged], user: [...user] }
}

// The text of one "## <heading>" section of a brief, up to the next "## ".
function section(md, heading) {
  const lines = md.split('\n')
  const start = lines.findIndex(l => l.trim().toLowerCase().startsWith(`## ${heading.toLowerCase()}`))
  if (start === -1) return null
  const end = lines.findIndex((l, i) => i > start && l.startsWith('## '))
  return lines.slice(start + 1, end === -1 ? undefined : end).join('\n')
}

// Scores the saved brief, the file the user reads, the same way as the report.
function scoreFile(s, cwd) {
  const dir = join(cwd, '.whiteboard')
  const files = existsSync(dir) ? readdirSync(dir).filter(f => f.endsWith('.md') && !f.startsWith('quiz')).sort() : []
  if (files.length === 0) return { file: null, problems: ['no brief file saved in .whiteboard/'] }
  const file = join(dir, files[files.length - 1])
  const md = readFileSync(file, 'utf8')
  const defaults = section(md, 'Defaults I relied on')
  const decisions = section(md, 'Decisions')
  const problems = []
  if (defaults === null) problems.push('brief file has no "Defaults I relied on" section')
  if (decisions === null) problems.push('brief file has no "Decisions" section')
  const has = (text, id) => text !== null && text.includes(id)
  for (const id of s.expectDefaults ?? []) if (!has(defaults, id)) problems.push(`file: ${id} missing from defaults`)
  for (const id of s.expectUser ?? []) {
    if (!has(decisions, id)) problems.push(`file: ${id} missing from decisions`)
    if (has(defaults, id)) problems.push(`file: user-requested ${id} listed as a default`)
  }
  for (const id of s.forbidDefaults ?? []) if (has(defaults, id)) problems.push(`file: ${id} wrongly listed as a default`)
  for (const id of s.forbidUser ?? []) {
    const cited = (decisions ?? '').split('\n').some(l => l.includes(id) && /your call|\[USER\]/i.test(l))
    if (cited) problems.push(`file: ${id} wrongly cited as a user choice`)
  }
  return { file, problems }
}

async function runOne(s, i) {
  const cwd = mkdtempSync(join(tmpdir(), `wbd-eval-${s.name}-`))
  if (s.mode === 'fixture') cpSync(join(s.dir, 'files'), cwd, { recursive: true })
  spawnSync('git', ['init', '-q'], { cwd })
  const started = Date.now()
  const prompt = s.mode === 'live' ? s.prompt : fixturePrompt(s.request)
  const { code, out, err } = await runClaude(cwd, prompt)
  const report = lastReport(out)
  const result = { scenario: s.name, run: i + 1, code, seconds: Math.round((Date.now() - started) / 1000), cwd, ...score(s, report), report }
  result.transcript = buildTranscript(out, { cwd, prompt }) // replayed by the site's demo (scripts/build-demo.mjs)
  // Short digests (the live, automatic path) are never saved; only full briefs are.
  const saved = s.mode === 'fixture' ? scoreFile(s, cwd) : { file: null, problems: [] }
  result.briefFile = saved.file
  result.problems.push(...saved.problems)
  if (/"type":"rate_limit_event"[^\n]*"status":"rejected"/.test(out)) {
    result.problems.unshift('rate limited: the session never ran, so this is not a skill result; rerun later')
    result.rateLimited = true
  } else if (code !== 0) result.problems.push(`claude exited ${code}: ${err.trim().split('\n').pop() ?? ''}`)
  result.pass = result.problems.length === 0
  const mark = result.pass ? 'PASS' : 'FAIL'
  console.log(`${mark}  ${s.name} #${i + 1} (${result.seconds}s)  flagged: ${result.flagged.join(', ') || '-'}${result.problems.length ? '  ' + result.problems.join('; ') : ''}`)
  return result
}

const jobs = scenarios.flatMap(s => Array.from({ length: runs }, (_, i) => () => runOne(s, i)))
const results = []
console.log(`${jobs.length} run(s), model ${model}, concurrency ${concurrency}\n`)
const workers = Array.from({ length: Math.min(concurrency, jobs.length) }, async () => {
  while (jobs.length) results.push(await jobs.shift()())
})
await Promise.all(workers)

const byScenario = new Map()
for (const r of results) {
  const s = byScenario.get(r.scenario) ?? { pass: 0, total: 0 }
  s.total += 1
  if (r.pass) s.pass += 1
  byScenario.set(r.scenario, s)
}
console.log('\nscenario            pass rate')
for (const [name, s] of [...byScenario].sort()) console.log(`${name.padEnd(20)}${s.pass}/${s.total}`)
const passed = results.filter(r => r.pass).length
console.log(`\ntotal ${passed}/${results.length}`)

const outDir = join(here, 'results')
if (!existsSync(outDir)) mkdirSync(outDir)
const file = join(outDir, `${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
writeFileSync(file, JSON.stringify({ model, runs, results }, null, 2))
console.log(`details: ${file}`)
process.exit(passed === results.length ? 0 : 1)
