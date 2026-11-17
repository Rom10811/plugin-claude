export type ToolTally = {
  edits: number
  reads: number
  searches: number
  runs: number
}

export type TodoItem = {
  content: string
  status: 'pending' | 'in_progress' | 'completed'
  activeForm: string
}

export type Mood = {
  emoji: string
  name: string
  caption: string
}

declare module 'claude-code' {
  interface PluginState {
    'daily-page': {
      tally: Shaped<ToolTally>
      todos: Shaped<TodoItem[]>
      mood: Shaped<Mood>
    }
  }
}
