import { createContext, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react'
import { uid } from '../../../lib/uid'
import {
  AVATAR_COLORS,
  fetchPlannerSeed,
  loadPlannerStateRaw,
  runFactoryMigration,
  sampleState,
  savePlannerState,
  seedTeamChannelsOnce,
} from './storage'
import type { Channel, Group, PlannerState, RatingKey } from './types'

type DragSource = { ownerId: string; index: number }

type Action =
  | { type: 'replace'; state: PlannerState }
  | { type: 'addBoardPage' }
  | { type: 'switchBoardPage'; pageId: string }
  | { type: 'deleteBoardPage'; pageId: string }
  | { type: 'renameBoardPage'; pageId: string; name: string }
  | { type: 'addGroup' }
  | { type: 'deleteGroup'; id: string }
  | { type: 'renameGroup'; id: string; name: string }
  | { type: 'setGroupDesc'; id: string; desc: string }
  | { type: 'toggleGroupLock'; id: string }
  | { type: 'reorderGroup'; draggedId: string; targetId: string; before: boolean }
  | { type: 'moveGroupToPage'; groupId: string; pageId: string }
  | { type: 'addChannel'; groupId: string }
  | { type: 'addUnassignedChannel' }
  | { type: 'updateChannel'; id: string; patch: Partial<Channel> }
  | { type: 'deleteChannel'; id: string }
  | { type: 'togglePin'; id: string }
  | { type: 'addUnassignedPage' }
  | { type: 'switchUnassignedPage'; pageId: string }
  | { type: 'deleteUnassignedPage'; pageId: string }
  | { type: 'renameUnassignedPage'; pageId: string; name: string }
  | { type: 'moveChannelToPage'; channelId: string; targetPageId: string }
  | { type: 'dropChannel'; channelId: string; targetGroupId: string; insertIndex: number }

function findChannelLocation(state: PlannerState, channelId: string):
  | { kind: 'group'; group: Group; index: number }
  | { kind: 'unassigned'; pageIndex: number; index: number }
  | null {
  for (const g of state.groups) {
    const i = g.channels.findIndex((c) => c.id === channelId)
    if (i > -1) return { kind: 'group', group: g, index: i }
  }
  for (let p = 0; p < state.unassignedPages.length; p++) {
    const i = state.unassignedPages[p].channels.findIndex((c) => c.id === channelId)
    if (i > -1) return { kind: 'unassigned', pageIndex: p, index: i }
  }
  return null
}

function reducer(state: PlannerState, action: Action): PlannerState {
  switch (action.type) {
    case 'replace':
      return action.state

    // ---- Board pages ----
    case 'addBoardPage': {
      const p = { id: uid(), name: `Page ${state.boardPages.length + 1}` }
      return { ...state, boardPages: [...state.boardPages, p], activeBoardPage: p.id }
    }
    case 'switchBoardPage': {
      if (state.activeBoardPage === action.pageId) return state
      return { ...state, activeBoardPage: action.pageId }
    }
    case 'deleteBoardPage': {
      if (state.boardPages.length <= 1) return state
      const idx = state.boardPages.findIndex((p) => p.id === action.pageId)
      if (idx < 0) return state
      const remainingPages = state.boardPages.filter((p) => p.id !== action.pageId)
      const remainingGroups = state.groups.filter((g) => g.pageId !== action.pageId)
      const newActive = state.activeBoardPage === action.pageId
        ? remainingPages[Math.max(0, idx - 1)].id
        : state.activeBoardPage
      return { ...state, boardPages: remainingPages, groups: remainingGroups, activeBoardPage: newActive }
    }
    case 'renameBoardPage': {
      const idx = state.boardPages.findIndex((p) => p.id === action.pageId)
      if (idx < 0) return state
      const fallback = `Page ${idx + 1}`
      const next = [...state.boardPages]
      next[idx] = { ...next[idx], name: action.name.trim() || fallback }
      return { ...state, boardPages: next }
    }

    // ---- Groups ----
    case 'addGroup': {
      const used = state.groups.map((g) => g.color)
      const free = AVATAR_COLORS.find((c) => !used.includes(c))
        ?? AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]
      const g: Group = {
        id: uid(),
        name: 'New group chat',
        color: free,
        pageId: state.activeBoardPage,
        channels: [],
      }
      return { ...state, groups: [...state.groups, g] }
    }
    case 'deleteGroup':
      return { ...state, groups: state.groups.filter((g) => g.id !== action.id) }
    case 'renameGroup':
      return {
        ...state,
        groups: state.groups.map((g) =>
          g.id === action.id ? { ...g, name: action.name.trim() || 'Untitled' } : g,
        ),
      }
    case 'setGroupDesc':
      return {
        ...state,
        groups: state.groups.map((g) => (g.id === action.id ? { ...g, desc: action.desc } : g)),
      }
    case 'toggleGroupLock':
      return {
        ...state,
        groups: state.groups.map((g) => (g.id === action.id ? { ...g, locked: !g.locked } : g)),
      }
    case 'reorderGroup': {
      const fromIdx = state.groups.findIndex((g) => g.id === action.draggedId)
      if (fromIdx < 0) return state
      const dragged = state.groups[fromIdx]
      const next = state.groups.filter((g) => g.id !== action.draggedId)
      let toIdx = next.findIndex((g) => g.id === action.targetId)
      if (toIdx < 0) toIdx = next.length
      if (!action.before) toIdx += 1
      next.splice(toIdx, 0, dragged)
      return { ...state, groups: next }
    }
    case 'moveGroupToPage': {
      const g = state.groups.find((g) => g.id === action.groupId)
      if (!g || g.pageId === action.pageId) return state
      return {
        ...state,
        groups: state.groups.map((x) => (x.id === action.groupId ? { ...x, pageId: action.pageId } : x)),
        activeBoardPage: action.pageId,
      }
    }

    // ---- Channels ----
    case 'addChannel': {
      const c: Channel = { id: uid(), name: 'New channel', desc: '' }
      return {
        ...state,
        groups: state.groups.map((g) =>
          g.id === action.groupId ? { ...g, channels: [...g.channels, c] } : g,
        ),
      }
    }
    case 'addUnassignedChannel': {
      const c: Channel = { id: uid(), name: 'New channel', desc: '' }
      return {
        ...state,
        unassignedPages: state.unassignedPages.map((p) =>
          p.id === state.activeUnassignedPage ? { ...p, channels: [...p.channels, c] } : p,
        ),
      }
    }
    case 'updateChannel': {
      const apply = (c: Channel) => (c.id === action.id ? { ...c, ...action.patch } : c)
      return {
        ...state,
        groups: state.groups.map((g) => ({ ...g, channels: g.channels.map(apply) })),
        unassignedPages: state.unassignedPages.map((p) => ({ ...p, channels: p.channels.map(apply) })),
      }
    }
    case 'deleteChannel': {
      return {
        ...state,
        groups: state.groups.map((g) => ({ ...g, channels: g.channels.filter((c) => c.id !== action.id) })),
        unassignedPages: state.unassignedPages.map((p) => ({
          ...p,
          channels: p.channels.filter((c) => c.id !== action.id),
        })),
      }
    }
    case 'togglePin': {
      // Pinning is group-only; un-pin if pinned, pin otherwise (unlimited).
      return {
        ...state,
        groups: state.groups.map((g) => ({
          ...g,
          channels: g.channels.map((c) => (c.id === action.id ? { ...c, pinned: !c.pinned } : c)),
        })),
      }
    }

    // ---- Unassigned pages ----
    case 'addUnassignedPage': {
      const p = { id: uid(), name: `Page ${state.unassignedPages.length + 1}`, channels: [] }
      return { ...state, unassignedPages: [...state.unassignedPages, p], activeUnassignedPage: p.id }
    }
    case 'switchUnassignedPage':
      if (state.activeUnassignedPage === action.pageId) return state
      return { ...state, activeUnassignedPage: action.pageId }
    case 'deleteUnassignedPage': {
      if (state.unassignedPages.length <= 1) return state
      const idx = state.unassignedPages.findIndex((p) => p.id === action.pageId)
      if (idx < 0) return state
      const remaining = state.unassignedPages.filter((p) => p.id !== action.pageId)
      const newActive = state.activeUnassignedPage === action.pageId
        ? remaining[Math.max(0, idx - 1)].id
        : state.activeUnassignedPage
      return { ...state, unassignedPages: remaining, activeUnassignedPage: newActive }
    }
    case 'renameUnassignedPage': {
      const idx = state.unassignedPages.findIndex((p) => p.id === action.pageId)
      if (idx < 0) return state
      const fallback = `Page ${idx + 1}`
      const next = [...state.unassignedPages]
      next[idx] = { ...next[idx], name: action.name.trim() || fallback }
      return { ...state, unassignedPages: next }
    }
    case 'moveChannelToPage': {
      const loc = findChannelLocation(state, action.channelId)
      if (!loc) return state
      let channel: Channel
      let groups = state.groups
      let pages = state.unassignedPages
      if (loc.kind === 'group') {
        channel = { ...loc.group.channels[loc.index], pinned: false }
        groups = groups.map((g) =>
          g.id === loc.group.id ? { ...g, channels: g.channels.filter((_, i) => i !== loc.index) } : g,
        )
      } else {
        channel = { ...pages[loc.pageIndex].channels[loc.index] }
        pages = pages.map((p, i) =>
          i === loc.pageIndex ? { ...p, channels: p.channels.filter((_, j) => j !== loc.index) } : p,
        )
      }
      pages = pages.map((p) =>
        p.id === action.targetPageId ? { ...p, channels: [...p.channels, channel] } : p,
      )
      return { ...state, groups, unassignedPages: pages, activeUnassignedPage: action.targetPageId }
    }
    case 'dropChannel': {
      const loc = findChannelLocation(state, action.channelId)
      if (!loc) return state
      const isUnassignedTarget = action.targetGroupId === '__unassigned__'
        || action.targetGroupId.startsWith('__unassigned__')
      const sourceOwnerId = loc.kind === 'group' ? loc.group.id : '__unassigned__:' + state.unassignedPages[loc.pageIndex].id

      // Pull the channel
      const channel = loc.kind === 'group'
        ? { ...loc.group.channels[loc.index] }
        : { ...state.unassignedPages[loc.pageIndex].channels[loc.index] }

      // Remove from source first
      let groups = state.groups
      let pages = state.unassignedPages
      if (loc.kind === 'group') {
        groups = groups.map((g) =>
          g.id === loc.group.id ? { ...g, channels: g.channels.filter((_, i) => i !== loc.index) } : g,
        )
      } else {
        pages = pages.map((p, i) =>
          i === loc.pageIndex ? { ...p, channels: p.channels.filter((_, j) => j !== loc.index) } : p,
        )
      }

      // Resolve target list
      let insertIndex = action.insertIndex

      if (isUnassignedTarget) {
        if (channel.pinned) channel.pinned = false
        const pageIdRaw = action.targetGroupId.startsWith('__unassigned__:')
          ? action.targetGroupId.split(':')[1]
          : state.activeUnassignedPage
        const pageId = pages.find((p) => p.id === pageIdRaw)?.id ?? state.activeUnassignedPage
        const normalizedTarget = '__unassigned__:' + pageId
        if (sourceOwnerId === normalizedTarget && loc.index < insertIndex) insertIndex--
        pages = pages.map((p) => {
          if (p.id !== pageId) return p
          const next = [...p.channels]
          next.splice(insertIndex, 0, channel)
          return { ...p, channels: next }
        })
        return { ...state, groups, unassignedPages: pages }
      }

      // Group target
      const targetGroup = groups.find((g) => g.id === action.targetGroupId)
      if (!targetGroup) return state
      if (targetGroup.locked) return state
      if (loc.kind === 'group' && loc.group.locked) return state
      if (sourceOwnerId === action.targetGroupId && loc.index < insertIndex) insertIndex--
      groups = groups.map((g) => {
        if (g.id !== action.targetGroupId) return g
        const next = [...g.channels]
        next.splice(insertIndex, 0, channel)
        return { ...g, channels: next }
      })
      return { ...state, groups, unassignedPages: pages }
    }
  }
}

type StoreApi = {
  state: PlannerState
  dispatch: (a: Action) => void
}

const StoreCtx = createContext<StoreApi | null>(null)

export function PlannerStoreProvider({ children }: { children: ReactNode }) {
  // One-time migrations before initial load (fired once).
  const migratedRef = useRef(false)
  const wasLocalStorageEmptyRef = useRef(false)
  if (!migratedRef.current) {
    migratedRef.current = true
    runFactoryMigration()
    wasLocalStorageEmptyRef.current = !localStorage.getItem('telegram-planner-v1')
  }

  const [state, dispatch] = useReducer(reducer, undefined as unknown as PlannerState, () => {
    const existing = loadPlannerStateRaw()
    return seedTeamChannelsOnce(existing ?? sampleState())
  })

  // Persist on every change.
  useEffect(() => {
    savePlannerState(state)
  }, [state])

  // If localStorage was empty on first load, try to seed from a bundled JSON
  // (public/data/planner.json). Falls back silently if missing.
  useEffect(() => {
    if (!wasLocalStorageEmptyRef.current) return
    let cancelled = false
    fetchPlannerSeed().then((seeded) => {
      if (cancelled || !seeded) return
      dispatch({ type: 'replace', state: seedTeamChannelsOnce(seeded) })
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const api = useMemo<StoreApi>(() => ({ state, dispatch }), [state])
  return <StoreCtx.Provider value={api}>{children}</StoreCtx.Provider>
}

export function usePlannerStore(): StoreApi {
  const ctx = useContext(StoreCtx)
  if (!ctx) throw new Error('usePlannerStore must be used inside <PlannerStoreProvider>')
  return ctx
}

// Convenience selectors
export function useVisibleGroups(): Group[] {
  const { state } = usePlannerStore()
  return state.groups.filter((g) => g.pageId === state.activeBoardPage)
}

export function useActiveUnassignedPage() {
  const { state } = usePlannerStore()
  return state.unassignedPages.find((p) => p.id === state.activeUnassignedPage) ?? state.unassignedPages[0]
}

export function ratingKeys(): RatingKey[] {
  return ['urgency', 'importance', 'universality']
}

// Drag-source helpers shared by components that consume drops
export type { DragSource }
