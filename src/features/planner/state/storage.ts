import { uid } from '../../../lib/uid'
import { PLANNER_SEED } from './seed'
import { PLANNER_STORAGE_KEY, type PlannerState, type Group, type BoardPage, type Channel } from './types'

export const AVATAR_COLORS = [
  'linear-gradient(135deg, #ff885e, #ff516a)',
  'linear-gradient(135deg, #ffcd6a, #ffa85c)',
  'linear-gradient(135deg, #82b1ff, #665fff)',
  'linear-gradient(135deg, #a0de7e, #54cb68)',
  'linear-gradient(135deg, #53edd6, #28c9b7)',
  'linear-gradient(135deg, #72d5fd, #2a9ef1)',
  'linear-gradient(135deg, #e0a2f3, #d669ed)',
  'linear-gradient(135deg, #ff8b9c, #ff5757)',
] as const

export function sampleState(): PlannerState {
  const p1Id = uid()
  const p2Id = uid()
  const bp1 = uid()
  return {
    unassignedPages: [
      {
        id: p1Id,
        name: 'Page 1',
        channels: [
          { id: uid(), name: 'Ideas', desc: 'Stuff to sort later', emoji: '💡' },
          { id: uid(), name: 'Memes', desc: '', emoji: '😂' },
        ],
      },
      { id: p2Id, name: 'Page 2', channels: [] },
    ],
    activeUnassignedPage: p1Id,
    boardPages: [{ id: bp1, name: 'Page 1' }],
    activeBoardPage: bp1,
    groups: [
      {
        id: uid(), name: 'Project HQ', color: AVATAR_COLORS[2], pageId: bp1,
        channels: [
          { id: uid(), name: 'Announcements', desc: 'Important updates from the team' },
          { id: uid(), name: 'General', desc: 'Casual chat for everyone' },
          { id: uid(), name: 'Resources', desc: 'Docs, links, and references' },
        ],
      },
      {
        id: uid(), name: 'Engineering', color: AVATAR_COLORS[5], pageId: bp1,
        channels: [
          { id: uid(), name: 'Backend', desc: 'API, database, infra' },
          { id: uid(), name: 'Frontend', desc: 'UI, design system, web' },
        ],
      },
      {
        id: uid(), name: 'Community', color: AVATAR_COLORS[3], pageId: bp1,
        channels: [{ id: uid(), name: 'Introductions', desc: 'Say hi when you join' }],
      },
    ],
  }
}

// Convert raw object from old storage formats into the current PlannerState shape.
export function migrate(raw: Record<string, unknown>): PlannerState {
  const s = raw as Record<string, unknown> & Partial<PlannerState> & {
    unassigned?: Channel[]
    groups?: Array<Partial<Group> & {
      channels?: Channel[]
      pages?: Array<{ id: string; name: string; channels: Channel[] }>
      activePage?: string
    }>
  }

  // Unassigned pages
  if (!Array.isArray(s.unassignedPages) || s.unassignedPages.length === 0) {
    const legacy = Array.isArray(s.unassigned) ? s.unassigned : []
    const p1 = { id: uid(), name: 'Page 1', channels: legacy }
    const p2 = { id: uid(), name: 'Page 2', channels: [] }
    s.unassignedPages = [p1, p2]
    s.activeUnassignedPage = p1.id
    delete s.unassigned
  } else if (!s.activeUnassignedPage || !s.unassignedPages.find((p) => p.id === s.activeUnassignedPage)) {
    s.activeUnassignedPage = s.unassignedPages[0].id
  }

  // Group page model: flatten any g.pages back into g.channels
  if (Array.isArray(s.groups)) {
    for (const g of s.groups) {
      if (Array.isArray(g.pages)) {
        const flat = g.pages.flatMap((p) => (Array.isArray(p.channels) ? p.channels : []))
        g.channels = Array.isArray(g.channels) ? g.channels.concat(flat) : flat
        delete g.pages
        delete g.activePage
      }
      if (!Array.isArray(g.channels)) g.channels = []
    }
  } else {
    s.groups = []
  }

  // Board pages
  if (!Array.isArray(s.boardPages) || s.boardPages.length === 0) {
    s.boardPages = [{ id: uid(), name: 'Page 1' }]
  }
  if (!s.activeBoardPage || !s.boardPages.find((p: BoardPage) => p.id === s.activeBoardPage)) {
    s.activeBoardPage = s.boardPages[0].id
  }
  const validBoardIds = new Set(s.boardPages.map((p) => p.id))
  const fallback = s.boardPages[0].id
  for (const g of s.groups) {
    if (!g.pageId || !validBoardIds.has(g.pageId)) g.pageId = fallback
  }

  return s as PlannerState
}

// Returns whatever is in localStorage today, migrated. Returns null if there's nothing
// (so the caller can decide to seed from a bundled data file before falling back to sample).
export function loadPlannerStateRaw(): PlannerState | null {
  try {
    const raw = localStorage.getItem(PLANNER_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.groups)) return null
    return migrate(parsed)
  } catch {
    return null
  }
}

// Convenience for callers that just want a state, falling back to sample on miss.
export function loadPlannerState(): PlannerState {
  return loadPlannerStateRaw() ?? sampleState()
}

// Return the hard-coded planner seed bundled in source.
export function getPlannerSeed(): PlannerState | null {
  try {
    // Dynamic require avoided — the seed is imported as a normal ES module by the store.
    return migrate(structuredClone(PLANNER_SEED as unknown as Record<string, unknown>))
  } catch {
    return null
  }
}

export function savePlannerState(state: PlannerState) {
  localStorage.setItem(PLANNER_STORAGE_KEY, JSON.stringify(state))
}

// One-time Factory channels migration (preserves the previously-deployed behavior).
export function runFactoryMigration(): void {
  const FLAG = 'telegram-planner-factory-reset-2026-05-09'
  if (localStorage.getItem(FLAG)) return
  try {
    const raw = localStorage.getItem(PLANNER_STORAGE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const groups = Array.isArray(parsed.groups) ? (parsed.groups as Array<Record<string, unknown>>) : []
    const factory = groups.find((g) => g['name'] === 'Factory')
    if (!factory) return
    const names = ['Mento','lightbook','founderapp','calinda','decurate','autobotic','campaignpromiser','dialoto','hivestream','redtest','personkey','socialhunt','rentthen','Synesis']
    const newChannels = names.map((n) => ({ id: uid(), name: n, desc: '' }))
    if (Array.isArray(factory['pages']) && (factory['pages'] as unknown[]).length > 0) {
      const pages = factory['pages'] as Array<{ id: string; activePage?: string; channels: Channel[] }>
      const activePageId = factory['activePage'] as string | undefined
      const target = pages.find((p) => p.id === activePageId) || pages[0]
      target.channels = newChannels
    } else {
      factory['channels'] = newChannels
    }
    localStorage.setItem(PLANNER_STORAGE_KEY, JSON.stringify(parsed))
  } catch (e) {
    console.error('Factory migration failed:', e)
  }
  localStorage.setItem(FLAG, '1')
}

// Seed team channels on Page 2 of unassigned (one-time, preserves previous behavior).
const TEAM_SEED: Array<{ name: string; emoji: string }> = [
  { name: 'Execution/Strategy/Agency', emoji: '⚔️' },
  { name: 'Narrative Development', emoji: '📖' },
  { name: 'Marketing', emoji: '📣' },
  { name: 'Finances', emoji: '💰' },
  { name: 'Intelligence', emoji: '🕵️' },
  { name: 'Adverts', emoji: '📺' },
  { name: 'Social Media', emoji: '📱' },
  { name: 'Sales', emoji: '💼' },
  { name: 'Product', emoji: '📦' },
  { name: 'Branding (Design) - Sam', emoji: '🎨' },
  { name: 'Tech', emoji: '💻' },
  { name: 'Recruitment', emoji: '👥' },
  { name: 'Operations', emoji: '⚙️' },
  { name: 'Management', emoji: '📊' },
]

export function seedTeamChannelsOnce(state: PlannerState): PlannerState {
  const SEED_KEY = 'tp-seed-team-channels-v1'
  if (localStorage.getItem(SEED_KEY)) return state
  while (state.unassignedPages.length < 2) {
    state.unassignedPages.push({ id: uid(), name: `Page ${state.unassignedPages.length + 1}`, channels: [] })
  }
  const page2 = state.unassignedPages[1]
  const existing = new Set(page2.channels.map((c) => c.name))
  for (const t of TEAM_SEED) {
    if (existing.has(t.name)) continue
    page2.channels.push({ id: uid(), name: t.name, desc: '', emoji: t.emoji })
  }
  localStorage.setItem(SEED_KEY, '1')
  return state
}
