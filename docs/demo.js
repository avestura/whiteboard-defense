// Simulated Claude Code sessions with the whiteboard-defense plugin.
// The transcript is adapted from a real headless run; the drawing mirrors
// what hooks/register.tsx renders (band, pane, status entry, toast).
(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const BRIEF = {
    title: 'ratelimit.py: token-bucket rate limiter',
    tier: 'customer-facing (limits calls to the customer API)',
    file: '.whiteboard/2026-10-13-token-bucket-rate-limiter.md',
    decisions: [
      ['USER', 'Algorithm', 'Token bucket', 'fixed window, sliding log'],
      ['INFERRED', 'Language', 'Python', 'the repo is Python'],
      ['DEFAULT', 'State location', 'In-process memory', 'Redis'],
      ['DEFAULT', 'Refill', 'Lazy, on each call', 'background timer'],
      ['DEFAULT', 'Clock', 'time.monotonic()', 'time.time()'],
      ['GUESS', 'Concurrency', 'threading.Lock', 'asyncio.Lock'],
    ],
    defaults: [
      ['D-ARCH-03', 'In-memory single-process state', 'Avoid: per-process rate-limit state; share buckets across workers (Redis).'],
      ['not in catalogue', 'Lazy refill', null],
      ['not in catalogue', 'threading.Lock without knowing the server model', 'State the server model (threaded or async) before choosing a lock.'],
    ],
    weakest: 'State is per process: four workers give each customer four buckets, so up to 4x the limit.',
    question: 'What limit does a customer really get with four gunicorn workers?',
  }
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
    const n = { DEFAULT: 0, GUESS: 0 }
    BRIEF.decisions.forEach(d => { if (d[0] in n) n[d[0]] += 1 })
    t.band.hidden = false
    t.band.innerHTML = `<span class="t-b">whiteboard</span><span><span class="t-dim">${esc(BRIEF.title)} · ${BRIEF.decisions.length} decisions </span><span class="c-def">${n.DEFAULT} DEFAULT</span> <span class="c-gue">${n.GUESS} GUESS</span></span>`
    t.band.append(
      btn('Open', 'o', () => t.openPane()),
      btn('Quiz me', 'q', () => quiz(t, true)),
      btn('Hide', 'h', () => { t.band.hidden = true }),
    )
  }

  function renderPane(t) {
    const body = t.pane.querySelector('.pane-body')
    const d = BRIEF.decisions.map(([p, what, choice, alt]) =>
      `<span class="row"><span class="${TAG[p]}">[${p}]</span> ${esc(what)}: ${esc(choice)} <span class="t-dim">(not: ${esc(alt)})</span></span>`).join('')
    body.innerHTML = `
      <div><div class="t-b">${esc(BRIEF.title)}</div><div class="t-dim">Tier: ${esc(BRIEF.tier)}</div><div class="t-dim">Saved: ${esc(BRIEF.file)}</div></div>
      <div><div class="t-b">Decisions</div>${d}</div>
      <div class="defaults"><div class="t-b">Defaults relied on</div></div>
      <div><span class="t-b">Weakest point: </span>${esc(BRIEF.weakest)}</div>
      <div><span class="t-b">Be ready for: </span>${esc(BRIEF.question)}</div>
      <div class="pane-actions"></div>`
    const defs = body.querySelector('.defaults')
    BRIEF.defaults.forEach(([id, name, avoid]) => {
      const row = document.createElement('div')
      row.innerHTML = `<span class="c-def">${esc(id)}</span> ${esc(name)}`
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
    if (fromBand) t.add('t-prompt from-plugin', '<span class="origin">whiteboard-defense</span> Use the whiteboard skill in quiz mode.')
    if (!(await t.tool('Read(' + BRIEF.file + ')', 'Read 96 lines', 500, id))) return
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

  async function playAuto(t, mode) {
    const id = t.reset()
    await sleep(500)
    if (!(await t.type('Write ratelimit.py: a token-bucket rate limiter for our customer API.', id))) return
    await sleep(500)
    t.msg('I\'ll write a token-bucket limiter as one class.')
    if (!(await t.tool('Write(ratelimit.py)', 'Wrote 48 lines to ratelimit.py', 900, id))) return
    if (mode === 'rich') bandPending(t, 1)
    await sleep(500)
    t.msg('Wrote <span class="t-code">ratelimit.py</span>: a thread-safe <span class="t-code">TokenBucket</span> with <span class="t-code">allow()</span> and <span class="t-code">retry_after()</span>. I haven\'t run it.')
    await sleep(1100)
    if (id !== t.run) return

    if (mode === 'prompt') {
      t.add('t-note', 'Prompt mode: no band, no automatic trigger. Ask for the brief yourself.')
      await sleep(900)
      if (!(await t.type('/whiteboard-defense:whiteboard', id))) return
    } else {
      t.band.hidden = true
      t.add('t-prompt from-plugin', '<span class="origin">whiteboard-defense</span> Use the whiteboard skill in short mode for the work in the previous turn.')
    }
    await sleep(500)
    if (!(await t.tool('Skill(whiteboard-defense:whiteboard)', 'Successfully loaded skill', 600, id))) return
    if (!(await t.tool('Write(' + BRIEF.file + ')', 'Wrote 96 lines', 800, id))) return
    if (mode === 'rich') {
      if (!(await t.tool('whiteboard-defense - report (MCP)', 'Shown to the user in the Whiteboard Defense band and pane', 600, id))) return
      t.toast('Whiteboard: 4 decision(s) you never made. See the band above the prompt.')
      t.wb.textContent = 'wb: 3 default, 1 guess'
    }
    await sleep(400)
    t.msg(
      '<span class="t-b">Whiteboard (short):</span> ratelimit.py, a thread-safe token-bucket limiter. Not wired up or run yet.\n' +
      'Key decisions: token bucket <span class="c-user">[USER]</span> · in-process state <span class="c-def">[DEFAULT]</span> · threading.Lock <span class="c-gue">[GUESS]</span>\n' +
      'Relied on defaults: in-memory single-process state (D-ARCH-03), lazy refill, monotonic clock\n' +
      'Weakest point: state is per process, so four workers allow up to 4x the limit.\n' +
      'Be ready to answer: "What limit does a customer really get with four gunicorn workers?"\n' +
      '<span class="t-dim">Full brief: ' + BRIEF.file + '</span>')
    if (mode === 'rich') bandBrief(t)
  }

  async function playQuiz(t) {
    const id = t.reset()
    t.wb.textContent = 'wb: 3 default, 1 guess'
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
  const quizRoot = document.getElementById('demo-quiz')
  if (auto) setup(auto, playAuto)
  if (quizRoot) setup(quizRoot, t => playQuiz(t))
})()
