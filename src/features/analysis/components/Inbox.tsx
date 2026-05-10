import { useEffect, useRef, useState, type DragEvent } from 'react'
import { useAnalysisStore, useFindChannel } from '../state/store'
import { useToast } from '../../../lib/Toast'
import { ItemCard } from './ItemCard'

export function Inbox() {
  const {
    state,
    dispatch,
    selectedChannelId,
    sortMode,
    enterSort,
    exitSort,
    sortActiveId,
    sortSkipped,
    skipCurrent,
  } = useAnalysisStore()
  const toast = useToast()
  const channelInfo = useFindChannel(selectedChannelId)

  const [paste, setPaste] = useState('')
  const [splitMode, setSplitMode] = useState<'blank' | 'line'>('blank')
  const [dragOver, setDragOver] = useState(false)

  const items = selectedChannelId
    ? state.items.filter((it) => it.channelId === selectedChannelId && !it.categoryId)
    : []

  const activeItemRef = useRef<HTMLDivElement>(null)

  // Scroll the active item into view when it changes
  useEffect(() => {
    if (!sortMode || !sortActiveId) return
    activeItemRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [sortActiveId, sortMode])

  // Keyboard handler — only active in sort mode
  useEffect(() => {
    if (!sortMode) return
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      // Don't hijack typing in inputs / textareas / contenteditables
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) return

      if (e.key === 'Escape') {
        e.preventDefault()
        exitSort()
        return
      }
      if (!sortActiveId) return

      if (e.key === ' ') {
        e.preventDefault()
        skipCurrent()
        return
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        dispatch({ type: 'deleteItem', id: sortActiveId })
        return
      }
      if (/^[1-9]$/.test(e.key)) {
        e.preventDefault()
        const n = parseInt(e.key, 10)
        const cat = state.categories[n - 1]
        if (!cat) {
          toast(`No category #${n}`)
          return
        }
        dispatch({ type: 'moveToCategory', itemId: sortActiveId, categoryId: cat.id })
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [sortMode, sortActiveId, state.categories, dispatch, exitSort, skipCurrent, toast])

  function addItems() {
    if (!selectedChannelId) return
    const trimmed = paste.replace(/\r\n/g, '\n').trim()
    if (!trimmed) return
    let chunks: string[]
    if (splitMode === 'line') {
      chunks = trimmed.split(/\n+/).map((s) => s.trim()).filter(Boolean)
    } else {
      chunks = trimmed.split(/\n\s*\n+/).map((s) => s.trim()).filter(Boolean)
      if (chunks.length === 1 && trimmed.includes('\n')) {
        chunks = trimmed.split(/\n+/).map((s) => s.trim()).filter(Boolean)
      }
    }
    dispatch({ type: 'addItems', channelId: selectedChannelId, texts: chunks })
    setPaste('')
    toast(`Added ${chunks.length} item${chunks.length !== 1 ? 's' : ''}`)
  }

  function onDragOver(e: DragEvent<HTMLDivElement>) {
    if (!selectedChannelId) return
    e.preventDefault()
    setDragOver(true)
  }
  function onDragLeave(e: DragEvent<HTMLDivElement>) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false)
  }
  function onDrop(e: DragEvent<HTMLDivElement>) {
    if (!selectedChannelId) return
    e.preventDefault()
    setDragOver(false)
    const itemId = e.dataTransfer.getData('text/plain')
    if (!itemId) return
    dispatch({ type: 'moveToCategory', itemId, categoryId: null })
  }

  return (
    <section className="items-panel">
      <div className="items-header">
        <div className="crumbs">
          {!selectedChannelId ? (
            <div className="empty">Select a channel from the left to start.</div>
          ) : !channelInfo ? (
            <div className="empty">This channel no longer exists.</div>
          ) : (
            <>
              <div className="group-name">{channelInfo.group.name}</div>
              <div className="channel-name">{channelInfo.channel.name}</div>
            </>
          )}
        </div>
        {selectedChannelId && (
          sortMode ? (
            <button className="sort-btn exit" onClick={exitSort} title="Exit sort mode (Esc)">
              ✕ Exit sort
            </button>
          ) : (
            <button
              className="sort-btn"
              onClick={enterSort}
              disabled={items.length === 0}
              title={items.length === 0 ? 'Nothing to sort' : 'Start sorting'}
            >
              ⚡ Sort {items.length > 0 ? `(${items.length})` : ''}
            </button>
          )
        )}
      </div>

      {sortMode && (
        <div className="sort-banner">
          <span className="label">⚡ Sort mode</span>
          <div className="keys">
            <span className="key-hint">
              <span className="kbd cat">1–9</span> categorize
            </span>
            <span className="key-hint">
              <span className="kbd skip">Space</span> skip
            </span>
            <span className="key-hint">
              <span className="kbd danger">Del</span> delete
            </span>
            <span className="key-hint">
              <span className="kbd">Esc</span> exit
            </span>
          </div>
        </div>
      )}

      <div className="paste-zone">
        <textarea
          placeholder="Paste text here. Each line (or paragraph) becomes its own item."
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
          disabled={!selectedChannelId}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
              e.preventDefault()
              addItems()
            }
          }}
        />
        <div className="paste-controls">
          <span>Split:</span>
          <select value={splitMode} onChange={(e) => setSplitMode(e.target.value as 'blank' | 'line')}>
            <option value="blank">By paragraph (blank line)</option>
            <option value="line">By line</option>
          </select>
          <button
            className="add-btn"
            disabled={!selectedChannelId || paste.trim() === ''}
            onClick={addItems}
          >
            Add items
          </button>
        </div>
      </div>

      <div
        className={`inbox-section${dragOver ? ' drag-over' : ''}`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {selectedChannelId && (
          <>
            <div className="inbox-header">Inbox · uncategorized</div>
            {items.length === 0 ? (
              <div className="empty-hint">
                No uncategorized items.<br />Paste text above to add some, or drag items here from a category.
              </div>
            ) : (
              items.map((it) => {
                const isActive = sortMode && it.id === sortActiveId
                const isSkipped = sortMode && sortSkipped.has(it.id) && !isActive
                return (
                  <div
                    key={it.id}
                    ref={isActive ? activeItemRef : undefined}
                    className={`${isActive ? 'item-wrap-active' : ''}`}
                  >
                    <ItemCard item={it} highlight={isActive} dim={isSkipped} />
                  </div>
                )
              })
            )}
          </>
        )}
      </div>
    </section>
  )
}
