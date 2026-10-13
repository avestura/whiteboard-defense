// Replicas of Claude Code sessions with the whiteboard-defense plugin.
// The first one replays window.WB_DEMO (docs/demo-data.js), a recording of a
// real eval run made by scripts/build-demo.mjs, so nothing in it is written by
// hand; the drawing mirrors what hooks/register.tsx renders (band, pane,
// status entry, toast). The quiz is scripted.
(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const DEMO = window.WB_DEMO
  const REPORT_TOOL = 'mcp__whiteboard-defense__report'
  const PLUGIN_ORIGIN = 'whiteboard-defense'
  const PROVENANCE = ['USER', 'INFERRED', 'DEFAULT', 'GUESS']

  // The report tool's input as the plugin reads it (toBrief in register.tsx):
  // malformed rows are dropped, blank strings count as absent.
  const text = v => (typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined)
  function toBrief(input) {
    if (!input || !text(input.title)) return null
    return {
      title: text(input.title),
      tier: text(input.tier),
      file: text(input.file),
      decisions: (Array.isArray(input.decisions) ? input.decisions : []).flatMap(r => {
        const p = typeof r?.provenance === 'string' ? r.provenance.toUpperCase() : ''
        return text(r?.decision) && text(r?.choice) && PROVENANCE.includes(p)
          ? [{ decision: text(r.decision), choice: text(r.choice), provenance: p, alternative: text(r.alternative), id: text(r.id) }]
          : []
      }),
      defaults: (Array.isArray(input.defaults) ? input.defaults : []).flatMap(r =>
        text(r?.name) ? [{ name: text(r.name), id: text(r.id), avoid: text(r.avoid) }] : []),
      weakest: text(input.weakest),
      question: text(input.question),
    }
  }
  const countTags = brief => {
    const n = { USER: 0, INFERRED: 0, DEFAULT: 0, GUESS: 0 }
    brief.decisions.forEach(d => { n[d.provenance] += 1 })
    return n
  }
  const statusText = brief => {
    const n = countTags(brief)
    return n.DEFAULT + n.GUESS > 0 ? `wb: ${n.DEFAULT} default, ${n.GUESS} guess` : 'wb: briefed'
  }
  const BRIEF = DEMO ? toBrief(DEMO.report) : null
  const rows = DEMO ? DEMO.transcript : []
  const briefFile = BRIEF?.file ?? '.whiteboard/brief.md'
  // "Wrote 96 lines to <file>" from the recorded write of the brief
  const briefLines = Number(rows.find(r => r.kind === 'tool' && r.label === `Write(${briefFile})`)?.output.match(/Wrote (\d+) lines/)?.[1]) || 0

  const TAG = { USER: 'c-user', INFERRED: 'c-inf', DEFAULT: 'c-def', GUESS: 'c-gue' }

  const QUIZ = [
    {
      q: 'Your API runs on four gunicorn workers and a customer\'s limit is 10 requests per second. What limit do they actually get, and why?',
      a: [
        ['10 per second. The lock keeps the bucket safe.', 'wrong', 'The lock only works inside one process. Each worker keeps its own bucket, so the customer can get up to 40 per second. That is the <span class="c-def">[DEFAULT]</span> in-process state.'],
        ['Up to 40 per second: each worker keeps its own bucket in memory.', 'solid', 'That is the gap to own. The fix is shared state (Redis) or limiting at the gateway.'],
        ['It depends on how the load balancer routes requests.', 'part', 'Routing changes how fast they reach the cap, not the cap. Only sticky routing keeps one customer on one bucket, and then 10 per second holds.'],
      ],
      topic: 'in-process state',
    },
    {
      q: 'Why time.monotonic() instead of time.time()?',
      a: [
        ['monotonic() is faster.', 'wrong', 'Speed is not the reason. time.time() follows the system clock, which can jump when it is adjusted; a jump backwards makes elapsed time negative and breaks the refill math.'],
        ['time.time() can jump when the clock is adjusted, which would break the refill math.', 'solid', 'Right. monotonic() only moves forward, so elapsed time is never negative.'],
        ['So the buckets survive a restart.', 'wrong', 'Monotonic time means nothing across restarts, and the buckets live in memory, so a restart empties them anyway.'],
      ],
      topic: 'the clock choice',
    },
  ]

  const sleep = ms => new Promise(r => setTimeout(r, reduced ? 0 : ms))
  const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
  // Recorded text to safe HTML: everything is escaped first, then only
  // **bold**, `code`, "- " bullets and the four provenance tags come back.
  const md = s => esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<span class="t-b">$1</span>')
    .replace(/`([^`\n]+)`/g, '<span class="t-code">$1</span>')
    .replace(/^- /gm, '\u2022 ')
    .replace(/\[(USER|INFERRED|DEFAULT|GUESS)\]/g, (m, p) => `<span class="${TAG[p]}">${m}</span>`)

  function Term(root) {
    const $ = sel => root.querySelector(sel)
    const t = {
      root,
      run: 0,
      transcript: $('.transcript'),
      band: $('.band'),
      pane: $('.pane'),
      main: $('.term-main'),
      typed: $('.typed'),
      wb: $('.wb'),
      toastEl: $('.toast'),
      add(cls, html) {
        const el = document.createElement('div')
        el.className = cls
        el.innerHTML = html
        t.transcript.append(el)
        while (t.transcript.children.length > 40) t.transcript.firstElementChild.remove()
        return el
      },
      async type(text, id) {
        for (let i = 1; i <= text.length; i++) {
          if (id !== t.run) return false
          t.typed.textContent = text.slice(0, i)
          await sleep(text.length > 60 ? 14 : 32)
        }
        await sleep(250)
        t.typed.textContent = ''
        t.add('t-prompt', esc(text))
        return id === t.run
      },
      async tool(name, out, ms, id) {
        const el = t.add('t-tool running', `<span><span class="name">${name}</span></span>`)
        await sleep(ms)
        if (id !== t.run) return false
        el.classList.remove('running')
        el.insertAdjacentHTML('beforeend', `<span class="out">${out}</span>`)
        return true
      },
      msg(html) { return t.add('t-msg', `<span class="body">${html}</span>`) },
      toast(text) {
        t.toastEl.textContent = text
        t.toastEl.classList.add('on')
        clearTimeout(t.toastTimer)
        t.toastTimer = setTimeout(() => t.toastEl.classList.remove('on'), reduced ? 6000 : 4200)
      },
      reset() {
        t.run += 1
        t.transcript.textContent = ''
        t.typed.textContent = ''
        t.band.hidden = true
        t.band.textContent = ''
        t.report = null
        t.closePane()
        if (t.wb) t.wb.textContent = ''
        t.toastEl.classList.remove('on')
        return t.run
      },
      openPane() { t.pane.hidden = false; t.main.classList.add('has-pane'); renderPane(t) },
      closePane() { if (t.pane) { t.pane.hidden = true; t.main.classList.remove('has-pane') } },
    }
    return t
  }

  function btn(label, hotkey, onPress, primary) {
    const b = document.createElement('button')
    b.type = 'button'
    b.className = 'tbtn' + (primary ? ' primary' : '')
    const i = label.toLowerCase().indexOf(hotkey)
    b.innerHTML = `[ ${esc(label.slice(0, i))}<span class="hk">${esc(label[i])}</span>${esc(label.slice(i + 1))} ]`
    b.setAttribute('aria-label', `${label} (hotkey ${hotkey})`)
    b.addEventListener('click', onPress)
    return b
  }

  function bandPending(t, files) {
    t.band.hidden = false
    t.band.innerHTML = `<span class="t-b">whiteboard</span><span class="t-dim">${files} file${files === 1 ? '' : 's'} changed since last brief</span>`
    t.band.append(btn('Brief me', 'b', () => {}, true), btn('Hide', 'h', () => { t.band.hidden = true }))
  }

  function bandBrief(t) {
    const n = countTags(t.report)
    t.band.hidden = false
    t.band.innerHTML = `<span class="t-b">whiteboard</span><span><span class="t-dim">${esc(t.report.title)} · ${t.report.decisions.length} decisions </span>${n.DEFAULT ? `<span class="c-def">${n.DEFAULT} DEFAULT </span>` : ''}${n.GUESS ? `<span class="c-gue">${n.GUESS} GUESS</span>` : ''}</span>`
    t.band.append(
      btn('Open', 'o', () => t.openPane()),
      btn('Quiz me', 'q', () => quiz(t, true)),
      btn('Hide', 'h', () => { t.band.hidden = true }),
    )
  }

  function renderPane(t) {
    const body = t.pane.querySelector('.pane-body')
    const b = t.report
    if (!b) { body.innerHTML = '<div class="t-dim">No brief yet. Run /whiteboard-defense:whiteboard after some work.</div>'; return }
    const d = b.decisions.map(x =>
      `<span class="row"><span class="${TAG[x.provenance]}">[${x.provenance}]</span> ${esc(x.decision)}: ${esc(x.choice)}${x.id ? ` <span class="t-dim">${esc(x.id)}</span>` : ''}${x.alternative ? ` <span class="t-dim">(not: ${esc(x.alternative)})</span>` : ''}</span>`).join('')
    body.innerHTML = `
      <div><div class="t-b">${esc(b.title)}</div>${b.tier ? `<div class="t-dim">Tier: ${esc(b.tier)}</div>` : ''}${b.file ? `<div class="t-dim">Saved: ${esc(b.file)}</div>` : ''}</div>
      <div><div class="t-b">Decisions</div>${d}</div>
      <div class="defaults"><div class="t-b">Defaults relied on</div>${b.defaults.length ? '' : '<div class="t-dim">None found.</div>'}</div>
      ${b.weakest ? `<div><span class="t-b">Weakest point: </span>${esc(b.weakest)}</div>` : ''}
      ${b.question ? `<div><span class="t-b">Be ready for: </span>${esc(b.question)}</div>` : ''}
      <div class="pane-actions"></div>`
    const defs = body.querySelector('.defaults')
    b.defaults.forEach(({ id, name, avoid }) => {
      const row = document.createElement('div')
      row.innerHTML = `<span class="c-def">${esc(id ?? 'not in catalogue')}</span> ${esc(name)}`
      if (avoid) {
        const line = document.createElement('div')
        line.innerHTML = `<span class="avoid">${esc(avoid)}</span> `
        const copy = document.createElement('button')
        copy.type = 'button'
        copy.className = 'tbtn'
        copy.textContent = '[ copy ]'
        copy.addEventListener('click', async () => {
          try { await navigator.clipboard.writeText(avoid); copy.textContent = '[ copied ]' } catch { copy.textContent = '[ select it ]' }
          setTimeout(() => { copy.textContent = '[ copy ]' }, 1500)
        })
        line.append(copy)
        row.append(line)
      }
      defs.append(row)
    })
    body.querySelector('.pane-actions').append(btn('Quiz me', 'q', () => quiz(t, true), true))
  }

  async function quiz(t, fromBand) {
    const id = ++t.run
    t.report = t.report ?? BRIEF
    if (fromBand) t.add('t-prompt from-plugin', '<span class="origin">whiteboard-defense</span> Use the whiteboard skill in quiz mode.')
    if (!(await t.tool('Read(' + briefFile + ')', briefLines ? `Read ${briefLines} lines` : 'Read brief', 500, id))) return
    const results = []
    for (let i = 0; i < QUIZ.length; i++) {
      const item = QUIZ[i]
      t.msg(`<span class="t-b">Question ${i + 1} of ${QUIZ.length}.</span> ${esc(item.q)}`)
      const box = t.add('answers', '')
      const picked = await new Promise(resolve => {
        item.a.forEach(([text], k) => {
          const b = document.createElement('button')
          b.type = 'button'
          b.className = 'tbtn'
          b.innerHTML = `<span class="k">${k + 1}.</span> ${esc(text)}`
          b.addEventListener('click', () => resolve(k), { once: true })
          box.append(b)
        })
      })
      if (id !== t.run) return
      box.setAttribute('aria-disabled', 'true')
      box.querySelectorAll('button').forEach(b => { b.disabled = true })
      const [text, grade, why] = item.a[picked]
      t.add('t-prompt', esc(text))
      await sleep(500)
      const label = { solid: ['grade-solid', 'Solid.'], part: ['grade-part', 'Partly right.'], wrong: ['grade-wrong', 'Not quite.'] }[grade]
      t.msg(`<span class="${label[0]}">${label[1]}</span> ${why}`)
      results.push([item.topic, grade])
      await sleep(700)
    }
    const good = results.filter(r => r[1] === 'solid').map(r => r[0])
    const redo = results.filter(r => r[1] !== 'solid').map(r => r[0])
    t.msg(`<span class="t-b">Summary.</span> You can defend: ${good.length ? esc(good.join(', ')) : 'nothing yet'}. Revisit: ${redo.length ? esc(redo.join(', ')) : 'nothing'}.`)
  }

  // Replays the recorded session row by row. Turn 1 is everything before the
  // plugin's own prompt; turn 2 is what the skill did when that prompt arrived.
  async function playAuto(t, mode) {
    const id = t.reset()
    if (!DEMO || rows.length === 0) { t.msg('The recording did not load, so there is nothing to replay.'); return }
    const rich = mode === 'rich'
    const written = new Set()
    let turn = 1
    await sleep(500)
    for (const row of rows) {
      if (id !== t.run) return
      if (row.kind === 'prompt' && row.origin === 'user') {
        if (!(await t.type(row.text, id))) return
      } else if (row.kind === 'prompt') {
        turn = 2
        await sleep(1100)
        if (id !== t.run) return
        if (rich) {
          t.band.hidden = true
          t.add('t-prompt from-plugin', `<span class="origin">${PLUGIN_ORIGIN}</span> ${esc(row.text)}`)
        } else {
          t.add('t-note', 'Prompt mode: no band, no automatic trigger. Ask for the brief yourself.')
          await sleep(900)
          if (!(await t.type('/whiteboard-defense:whiteboard', id))) return
        }
      } else if (row.kind === 'text') {
        await sleep(500)
        t.msg(md(row.text))
        await sleep(Math.min(1400, 400 + row.text.length * 4))
      } else if (row.kind === 'tool') {
        if (row.name === REPORT_TOOL && !rich) continue
        await sleep(400)
        if (!(await t.tool(esc(row.label), esc(row.output), /^(Write|Edit)\(/.test(row.label) ? 900 : 600, id))) return
        if (turn === 1 && /^(Write|Edit)\(/.test(row.label)) {
          written.add(row.label)
          if (rich) bandPending(t, written.size)
        }
        if (row.name === REPORT_TOOL && BRIEF) {
          t.report = BRIEF
          const n = countTags(BRIEF)
          if (n.DEFAULT + n.GUESS > 0) t.toast(`Whiteboard: ${n.DEFAULT + n.GUESS} decision(s) you never made. See the band above the prompt.`)
          t.wb.textContent = statusText(BRIEF)
        }
      }
    }
    if (rich && t.report) bandBrief(t)
  }

  async function playQuiz(t) {
    const id = t.reset()
    if (BRIEF) t.wb.textContent = statusText(BRIEF)
    await sleep(400)
    if (!(await t.type('/whiteboard-defense:whiteboard quiz', id))) return
    await sleep(300)
    if (!(await t.tool('Skill(whiteboard-defense:whiteboard)', 'Successfully loaded skill', 500, id))) return
    quiz(t, false)
  }

  function setup(root, play) {
    const t = Term(root)
    let mode = 'rich'
    const pane = root.querySelector('.pane')
    if (pane) pane.querySelector('[data-act="close"]').addEventListener('click', () => t.closePane())
    root.querySelector('[data-act="replay"]').addEventListener('click', () => play(t, mode))
    root.querySelectorAll('.seg button').forEach(b => b.addEventListener('click', () => {
      mode = b.dataset.mode
      root.querySelectorAll('.seg button').forEach(x => x.setAttribute('aria-pressed', String(x === b)))
      play(t, mode)
    }))
    let started = false
    const io = new IntersectionObserver(entries => {
      if (!started && entries.some(e => e.isIntersecting)) { started = true; play(t, mode); io.disconnect() }
    }, { threshold: 0.35 })
    io.observe(root)
  }

  const auto = document.getElementById('demo-auto')
  if (auto && DEMO) {
    const when = new Date(DEMO.recordedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
    const src = document.getElementById('demo-source')
    if (src) src.textContent = `Replayed from a recorded eval run (${DEMO.model}, ${when}). Nothing here is hand-written.`
    const model = auto.querySelector('.statusline span')
    if (model && DEMO.model) model.textContent = `${DEMO.model} · ~/billing-api · main`
    const lines = document.getElementById('demo-lines')
    const n = rows.find(r => r.kind === 'tool' && /^Write\(/.test(r.label))?.output.match(/Wrote (\d+) lines/)?.[1]
    if (lines && n) lines.textContent = `${n} changed lines`
  }
  const quizRoot = document.getElementById('demo-quiz')
  if (auto) setup(auto, playAuto)
  if (quizRoot) setup(quizRoot, t => playQuiz(t))
})()
