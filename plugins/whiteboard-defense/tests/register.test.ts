import { describe, expect, test } from 'claude-code/testing'
import type { RenderPropsOf } from 'claude-code'

import { isBriefFile, linesTouched, toBrief } from '../hooks/register'

const PLUGIN = 'whiteboard-defense'
const REPORT = 'mcp__whiteboard-defense__report'
const BAND = {
  component: 'AbovePrompt',
  requestId: 'above-prompt',
  props: { hasSurvey: false, isWorking: false, maxRows: 4, bodyColumns: 100 } as unknown as RenderPropsOf['AbovePrompt'],
} as const

const REPORTED = {
  title: 'Invoice share links',
  tier: 'customer-facing',
  decisions: [
    { decision: 'Credential', choice: 'Bearer token', provenance: 'USER' },
    { decision: 'Revocation', choice: 'None', provenance: 'DEFAULT', alternative: 'Delete endpoint' },
    { decision: 'Expiry', choice: '7 days', provenance: 'guess' },
    { decision: 'Broken row', provenance: 'USER' },
  ],
  defaults: [{ name: 'No revocation', id: 'D-SCOPE-02', avoid: 'Every link must be revocable.' }],
  weakest: 'Leaked links live until expiry',
}

describe('parsing', () => {
  test('toBrief keeps valid rows and normalizes provenance', () => {
    const b = toBrief(REPORTED)
    if (typeof b === 'string') throw new Error(b)
    expect(b.decisions.map(d => d.provenance)).toEqual(['USER', 'DEFAULT', 'GUESS'])
    expect(b.defaults[0]?.id).toBe('D-SCOPE-02')
  })

  test('toBrief rejects a brief with no title', () => {
    expect(toBrief({ decisions: [] })).toBe('title is required')
  })

  test('linesTouched and isBriefFile', () => {
    expect(linesTouched('Write', { content: 'a\nb\nc' })).toBe(3)
    expect(linesTouched('Edit', { old_string: 'a', new_string: 'a\nb' })).toBe(2)
    expect(isBriefFile('/repo/.whiteboard/2026-10-13-x.md')).toBe(true)
    expect(isBriefFile('C:\\repo\\.whiteboard\\x.md')).toBe(true)
    expect(isBriefFile('/repo/src/whiteboard.ts')).toBe(false)
  })
})

describe('rich UI', () => {
  test('a report fills the band with the DEFAULT count', async ($, on) => {
    on('ui.render', ($, e) => h($.ui.resolve(e).Box, null))
    const ran = await $.tool.call({ tool: REPORT, ...REPORTED })
    expect(ran.deny).toBeUndefined()
    for (const surface of ['terminal', 'desktop'] as const) {
      const ui = await $.ui.mount({ plugin: PLUGIN, surface, ...BAND })
      expect(await ui.find({ text: /1 DEFAULT/ })).toBeDefined()
      expect(await ui.find({ key: 'quiz' })).toBeDefined()
      await ui.unmount()
    }
    const ui = await $.ui.mount({ plugin: PLUGIN, surface: 'terminal', ...BAND })
    await ui.press({ key: 'hide' })
    expect(await ui.find({ key: 'quiz' })).toBeUndefined()
    await ui.unmount()
  })

  test('a report without a title is refused', async $ => {
    const ran = await $.tool.call({ tool: REPORT, decisions: [], defaults: [] })
    expect(ran.deny).toContain('title is required')
  })

  test('prompt mode draws nothing of its own', { options: { ui: 'prompt' } }, async ($, on) => {
    on('ui.render', ($, e) => h($.ui.resolve(e).Box, null))
    const ui = await $.ui.mount({ plugin: PLUGIN, surface: 'terminal', ...BAND })
    expect(await ui.find({ key: 'hide' })).toBeUndefined()
    await ui.unmount()
  })
})
