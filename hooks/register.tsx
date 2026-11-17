import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { ToolTally, TodoItem, Mood } from '../types'

const PANE = 'daily-page'

const tally = atom(
  { plugin: 'daily-page', key: 'tally' } as const,
  { edits: 0, reads: 0, searches: 0, runs: 0 },
  { shape: 'tally-1' },
)
const todos = atom({ plugin: 'daily-page', key: 'todos' } as const, [] as TodoItem[], {
  shape: 'todos-1',
})
const DEFAULT_MOOD: Mood = { emoji: '🐤', name: 'dab', caption: 'is keeping watch' }
const mood = atom({ plugin: 'daily-page', key: 'mood' } as const, DEFAULT_MOOD, {
  shape: 'mood-1',
})

type Category = 'edits' | 'reads' | 'searches' | 'runs'

const CATEGORY_BY_TOOL: Record<string, Category> = {
  Edit: 'edits',
  Write: 'edits',
  NotebookEdit: 'edits',
  MultiEdit: 'edits',
  Read: 'reads',
  NotebookRead: 'reads',
  Glob: 'searches',
  Grep: 'searches',
  WebSearch: 'searches',
  WebFetch: 'searches',
  Bash: 'runs',
  BashOutput: 'runs',
  KillBash: 'runs',
}

const MOOD_BY_CATEGORY: Record<Category, Mood> = {
  edits: { emoji: '🍄', name: 'the sprout', caption: 'is tending the page' },
  reads: { emoji: '🦉', name: 'the owl king', caption: 'is thinking it over' },
  searches: { emoji: '🦉', name: 'the owl king', caption: 'is hunting for it' },
  runs: { emoji: '🐝', name: 'the bees', caption: 'are buzzing' },
}

const TODO_MARK: Record<TodoItem['status'], string> = {
  completed: '☑',
  in_progress: '▸',
  pending: '☐',
}

function marks(n: number): string {
  return '⎮'.repeat(Math.min(n, 12))
}

function todayTitle(): string {
  const d = new Date()
  const weekday = d.toLocaleDateString(undefined, { weekday: 'long' }).toLowerCase()
  const month = d.toLocaleDateString(undefined, { month: 'short' }).toLowerCase()
  return `${weekday}, ${month} ${d.getDate()}`
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'daily-page',
      description: 'Open the daily page panel',
    })
    void $.ui.open({ id: PANE, title: todayTitle() })

    return next(e)
  })

  on('command.run', { command: 'daily-page' }, async $ => {
    await $.ui.open({ id: PANE, title: todayTitle() })

    return { text: 'Daily page opened.' }
  })

  on('tool.call', { tool: 'TodoWrite' }, async ($, e, next) => {
    await update($, todos, () => e.todos)

    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    const category = CATEGORY_BY_TOOL[e.tool]

    if (category !== undefined) {
      await update($, tally, t => ({ ...t, [category]: t[category] + 1 }))
      await update($, mood, () => MOOD_BY_CATEGORY[category])
    }

    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Progress } = $.ui.resolve(e)
    const t = await read($, tally)
    const list = await read($, todos)
    const m = await read($, mood)
    const usage = await $.session.usage()
    const contextPercent = usage.context.percent ?? 0
    const pencilLeft = Math.max(0, Math.round(100 - contextPercent))
    const fiveHour = usage.rateLimits.find(r => r.kind === 'five_hour')?.percentUsed
    const week = usage.rateLimits.find(r => r.kind === 'seven_day')?.percentUsed

    return (
      <Box flexDirection="column" padding={1} backgroundColor="#f4ecdc">
        <Box flexDirection="column" alignItems="center" borderStyle="round" borderColor="#a89a7e" padding={1}>
          <Text size="title">{m.emoji}</Text>
          <Text weight="bold" color="#2a241d">
            {m.name}
          </Text>
        </Box>
        <Box marginTop={1}>
          <Text dimColor color="#544a3d">
            {m.caption}
          </Text>
        </Box>

        <Box flexDirection="column" marginTop={1}>
          <Text dimColor color="#6a5f50">
            this page
          </Text>
          <Text color="#2a241d">edits    {marks(t.edits).padEnd(13)}{t.edits}</Text>
          <Text color="#2a241d">reads    {marks(t.reads).padEnd(13)}{t.reads}</Text>
          <Text color="#2a241d">searches {marks(t.searches).padEnd(13)}{t.searches}</Text>
          <Text color="#2a241d">runs     {marks(t.runs).padEnd(13)}{t.runs}</Text>
        </Box>

        <Box
          flexDirection="column"
          marginTop={1}
          borderStyle="round"
          borderColor="#e0a5ad"
          backgroundColor="#f6cdd4"
          padding={1}
        >
          <Text weight="bold" color="#8c3b47">
            to do
          </Text>
          {list.length === 0 ? (
            <Text dimColor color="#7a4a51">
              nothing yet
            </Text>
          ) : (
            list.map(item => (
              <Text color="#4a2a30">
                {TODO_MARK[item.status]} {item.content}
              </Text>
            ))
          )}
        </Box>

        <Box flexDirection="column" marginTop={1}>
          <Progress label="pencil left" value={pencilLeft} max={100} valueText={`${pencilLeft}%`} />
          {(fiveHour !== undefined || week !== undefined) && (
            <Text dimColor color="#6a5f50">
              used: 5h {fiveHour !== undefined ? Math.round(fiveHour) : '–'}% · week{' '}
              {week !== undefined ? Math.round(week) : '–'}%
            </Text>
          )}
        </Box>
      </Box>
    )
  })
}
