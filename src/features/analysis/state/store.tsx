import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react'
import { uid } from '../../../lib/uid'
import {
  ANALYSIS_STORAGE_KEY,
  CAT_COLORS,
  type AnalysisChannel,
  type AnalysisState,
  type Category,
  type Item,
} from './types'

type Action =
  | { type: 'replace'; state: AnalysisState }
  | { type: 'addGroup' }
  | { type: 'deleteGroup'; id: string }
  | { type: 'renameGroup'; id: string; name: string }
  | { type: 'addChannel'; groupId: string }
  | { type: 'deleteChannel'; channelId: string }
  | { type: 'renameChannel'; channelId: string; name: string }
  | { type: 'addItems'; channelId: string; texts: string[] }
  | { type: 'deleteItem'; id: string }
  | { type: 'updateItemText'; id: string; text: string }
  | { type: 'moveToCategory'; itemId: string; categoryId: string | null }
  | { type: 'addCategory' }
  | { type: 'deleteCategory'; id: string }
  | { type: 'renameCategory'; id: string; name: string }

function loadRaw(): AnalysisState | null {
  try {
    const raw = localStorage.getItem(ANALYSIS_STORAGE_KEY)
    if (!raw) return null
    return parseAnalysisShape(JSON.parse(raw))
  } catch {
    return null
  }
}

function parseAnalysisShape(s: unknown): AnalysisState {
  const obj = (s ?? {}) as Record<string, unknown>
  return {
    groups: Array.isArray(obj.groups)
      ? (obj.groups as AnalysisGroupLike[]).map((g) => ({ ...g, channels: Array.isArray(g.channels) ? g.channels : [] }))
      : [],
    items: Array.isArray(obj.items) ? (obj.items as Item[]) : [],
    categories: Array.isArray(obj.categories) ? (obj.categories as Category[]) : [],
  }
}

function load(): AnalysisState {
  return loadRaw() ?? { groups: [], items: [], categories: [] }
}

async function fetchAnalysisSeed(): Promise<AnalysisState | null> {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}data/analysis.json`, { cache: 'no-cache' })
    if (!res.ok) return null
    return parseAnalysisShape(await res.json())
  } catch {
    return null
  }
}

type AnalysisGroupLike = { id: string; name: string; channels?: AnalysisChannel[] }

function save(s: AnalysisState) {
  localStorage.setItem(ANALYSIS_STORAGE_KEY, JSON.stringify(s))
}

function reducer(state: AnalysisState, action: Action): AnalysisState {
  switch (action.type) {
    case 'replace':
      return action.state
    case 'addGroup': {
      const g = { id: uid(), name: `Groupchat ${state.groups.length + 1}`, channels: [] }
      return { ...state, groups: [...state.groups, g] }
    }
    case 'deleteGroup': {
      const g = state.groups.find((x) => x.id === action.id)
      if (!g) return state
      const channelIds = new Set(g.channels.map((c) => c.id))
      return {
        ...state,
        groups: state.groups.filter((x) => x.id !== action.id),
        items: state.items.filter((it) => !channelIds.has(it.channelId)),
      }
    }
    case 'renameGroup': {
      return {
        ...state,
        groups: state.groups.map((g) => (g.id === action.id ? { ...g, name: action.name.trim() || 'Untitled' } : g)),
      }
    }
    case 'addChannel': {
      return {
        ...state,
        groups: state.groups.map((g) =>
          g.id === action.groupId
            ? { ...g, channels: [...g.channels, { id: uid(), name: `Channel ${g.channels.length + 1}` }] }
            : g,
        ),
      }
    }
    case 'deleteChannel': {
      return {
        ...state,
        groups: state.groups.map((g) => ({ ...g, channels: g.channels.filter((c) => c.id !== action.channelId) })),
        items: state.items.filter((it) => it.channelId !== action.channelId),
      }
    }
    case 'renameChannel': {
      return {
        ...state,
        groups: state.groups.map((g) => ({
          ...g,
          channels: g.channels.map((c) => (c.id === action.channelId ? { ...c, name: action.name.trim() || 'Untitled' } : c)),
        })),
      }
    }
    case 'addItems': {
      const newItems: Item[] = action.texts.map((text) => ({
        id: uid(),
        channelId: action.channelId,
        text,
        categoryId: null,
      }))
      return { ...state, items: [...state.items, ...newItems] }
    }
    case 'deleteItem':
      return { ...state, items: state.items.filter((it) => it.id !== action.id) }
    case 'updateItemText': {
      const trimmed = action.text.trim()
      if (!trimmed) return { ...state, items: state.items.filter((it) => it.id !== action.id) }
      return {
        ...state,
        items: state.items.map((it) => (it.id === action.id ? { ...it, text: trimmed } : it)),
      }
    }
    case 'moveToCategory': {
      const target = action.categoryId || null
      return {
        ...state,
        items: state.items.map((it) => (it.id === action.itemId ? { ...it, categoryId: target } : it)),
      }
    }
    case 'addCategory': {
      const used = new Set(state.categories.map((c) => c.color))
      const color = CAT_COLORS.find((c) => !used.has(c)) ?? CAT_COLORS[state.categories.length % CAT_COLORS.length]
      const cat: Category = { id: uid(), name: `Category ${state.categories.length + 1}`, color }
      return { ...state, categories: [...state.categories, cat] }
    }
    case 'deleteCategory': {
      return {
        ...state,
        categories: state.categories.filter((c) => c.id !== action.id),
        items: state.items.map((it) => (it.categoryId === action.id ? { ...it, categoryId: null } : it)),
      }
    }
    case 'renameCategory': {
      return {
        ...state,
        categories: state.categories.map((c) => (c.id === action.id ? { ...c, name: action.name.trim() || 'Untitled' } : c)),
      }
    }
  }
}

type StoreApi = {
  state: AnalysisState
  dispatch: (a: Action) => void
  selectedChannelId: string | null
  setSelectedChannelId: (id: string | null) => void
  // Sort mode (ephemeral, not persisted)
  sortMode: boolean
  enterSort: () => void
  exitSort: () => void
  sortActiveId: string | null
  sortSkipped: Set<string>
  skipCurrent: () => void
  // Pure helpers — read current state inside callbacks
  inboxForChannel: (channelId: string | null) => Item[]
}

const Ctx = createContext<StoreApi | null>(null)

export function AnalysisStoreProvider({ children }: { children: ReactNode }) {
  const wasEmptyRef = useRef(false)
  if (!wasEmptyRef.current) {
    wasEmptyRef.current = !localStorage.getItem(ANALYSIS_STORAGE_KEY)
  }
  const [state, dispatch] = useReducer(reducer, undefined as unknown as AnalysisState, load)
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null)
  const [sortMode, setSortMode] = useState(false)
  const [sortSkipped, setSortSkipped] = useState<Set<string>>(new Set())

  useEffect(() => {
    save(state)
  }, [state])

  // If localStorage was empty on first load, try to seed from public/data/analysis.json.
  useEffect(() => {
    if (!wasEmptyRef.current) return
    let cancelled = false
    fetchAnalysisSeed().then((seeded) => {
      if (cancelled || !seeded) return
      dispatch({ type: 'replace', state: seeded })
    })
    return () => { cancelled = true }
  }, [])

  // If a selected channel disappears, deselect
  useEffect(() => {
    if (!selectedChannelId) return
    const found = state.groups.some((g) => g.channels.some((c) => c.id === selectedChannelId))
    if (!found) setSelectedChannelId(null)
  }, [state, selectedChannelId])

  // Auto-exit sort mode if channel changes or no inbox items left
  useEffect(() => {
    if (!sortMode) return
    if (!selectedChannelId) {
      setSortMode(false)
      setSortSkipped(new Set())
    }
  }, [sortMode, selectedChannelId])

  const inboxForChannel = useCallback(
    (channelId: string | null) =>
      channelId ? state.items.filter((it) => it.channelId === channelId && !it.categoryId) : [],
    [state.items],
  )

  // Compute current active item: first inbox item not in skipped; if all skipped, fall back to first.
  const inboxItems = inboxForChannel(selectedChannelId)
  let sortActiveId: string | null = null
  if (sortMode && inboxItems.length > 0) {
    const next = inboxItems.find((it) => !sortSkipped.has(it.id))
    sortActiveId = (next ?? inboxItems[0]).id
  }

  const enterSort = useCallback(() => {
    setSortSkipped(new Set())
    setSortMode(true)
  }, [])
  const exitSort = useCallback(() => {
    setSortMode(false)
    setSortSkipped(new Set())
  }, [])
  const skipCurrent = useCallback(() => {
    if (!sortActiveId) return
    setSortSkipped((prev) => {
      const next = new Set(prev)
      next.add(sortActiveId!)
      // If we've now skipped everything, clear so we cycle back through
      const remaining = inboxItems.filter((it) => !next.has(it.id))
      if (remaining.length === 0) return new Set()
      return next
    })
  }, [sortActiveId, inboxItems])

  const api = useMemo<StoreApi>(
    () => ({
      state,
      dispatch,
      selectedChannelId,
      setSelectedChannelId,
      sortMode,
      enterSort,
      exitSort,
      sortActiveId,
      sortSkipped,
      skipCurrent,
      inboxForChannel,
    }),
    [state, selectedChannelId, sortMode, sortActiveId, sortSkipped, enterSort, exitSort, skipCurrent, inboxForChannel],
  )
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

export function useAnalysisStore(): StoreApi {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAnalysisStore must be used inside <AnalysisStoreProvider>')
  return ctx
}

export function useFindChannel(channelId: string | null | undefined) {
  const { state } = useAnalysisStore()
  return useCallback(() => {
    if (!channelId) return null
    for (const g of state.groups) {
      const c = g.channels.find((x) => x.id === channelId)
      if (c) return { channel: c, group: g }
    }
    return null
  }, [state, channelId])()
}
