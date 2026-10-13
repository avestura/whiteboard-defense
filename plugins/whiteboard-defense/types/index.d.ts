export type Provenance = 'USER' | 'INFERRED' | 'DEFAULT' | 'GUESS'

export type BriefDecision = {
  decision: string
  choice: string
  provenance: Provenance
  alternative?: string
}

export type BriefDefault = {
  name: string
  id?: string
  avoid?: string
}

export type Brief = {
  title: string
  tier?: string
  file?: string
  decisions: BriefDecision[]
  defaults: BriefDefault[]
  weakest?: string
  question?: string
}

/** Changes made since the last brief, counted from Edit/Write tool calls. */
export type Pending = { files: string[]; lines: number }

declare module 'claude-code' {
  interface PluginState {
    'whiteboard-defense': {
      brief: Brief | null
      pending: Pending
      isHidden: boolean
    }
  }
}
