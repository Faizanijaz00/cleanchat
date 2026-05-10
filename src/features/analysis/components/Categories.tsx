import { useState, type DragEvent } from 'react'
import { useAnalysisStore } from '../state/store'
import { useModal } from '../../../lib/Modal'
import { EditableSpan } from '../../../lib/EditableSpan'
import { ItemCard } from './ItemCard'
import { colorFor, symbolFor, type Category, type AnalysisChannel } from '../state/types'

function findChannelInState(groups: { id: string; name: string; channels: AnalysisChannel[] }[], channelId: string) {
  for (const g of groups) {
    const c = g.channels.find((x) => x.id === channelId)
    if (c) return { group: g, channel: c }
  }
  return null
}

function flashChannel(channelId: string) {
  window.dispatchEvent(new CustomEvent('analysis:flash-channel', { detail: channelId }))
}

export function Categories() {
  const { state, dispatch } = useAnalysisStore()

  return (
    <aside className="categories-panel">
      <div className="cat-header">
        <h3>Categories</h3>
        <button className="new-cat-btn" onClick={() => dispatch({ type: 'addCategory' })}>+ New</button>
      </div>
      <div className="cat-list">
        {state.categories.length === 0 ? (
          <div className="cat-empty">
            No categories yet.<br />Click <strong>+ New</strong> to add one.<br />Then drag items into it.
          </div>
        ) : (
          state.categories.map((cat, idx) => <CategoryCard key={cat.id} cat={cat} index={idx} />)
        )}
      </div>
    </aside>
  )
}

function CategoryCard({ cat, index }: { cat: Category; index: number }) {
  const { state, dispatch, sortMode, sortActiveId } = useAnalysisStore()
  const modal = useModal()
  const [dragOver, setDragOver] = useState(false)
  const keyNumber = index + 1
  const showKey = sortMode && keyNumber <= 9
  const keyDisabled = !sortActiveId

  const itemsInCat = state.items.filter((it) => it.categoryId === cat.id)
  const bySource = new Map<string, number>()
  for (const it of itemsInCat) bySource.set(it.channelId, (bySource.get(it.channelId) || 0) + 1)

  function onDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragOver(true)
  }
  function onDragLeave(e: DragEvent<HTMLDivElement>) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false)
  }
  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragOver(false)
    const itemId = e.dataTransfer.getData('text/plain')
    if (!itemId) return
    dispatch({ type: 'moveToCategory', itemId, categoryId: cat.id })
  }

  return (
    <div
      className={`category${dragOver ? ' drag-over' : ''}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="category-header">
        {showKey && (
          <button
            className={`cat-key${keyDisabled ? ' disabled' : ''}`}
            title={keyDisabled ? 'No active item to assign' : `Press ${keyNumber} to assign current item`}
            onClick={(e) => {
              e.stopPropagation()
              if (!sortActiveId) return
              dispatch({ type: 'moveToCategory', itemId: sortActiveId, categoryId: cat.id })
            }}
          >
            {keyNumber}
          </button>
        )}
        <span className="cat-color" style={{ background: cat.color }} />
        <EditableSpan
          className="cat-name"
          value={cat.name}
          onCommit={(name) => dispatch({ type: 'renameCategory', id: cat.id, name })}
        />
        <div className="cat-chips">
          {Array.from(bySource.entries()).map(([chId, n]) => {
            const found = findChannelInState(state.groups, chId)
            const sym = found ? symbolFor(found.channel) : '?'
            const tip = found
              ? `${found.group.name} · ${found.channel.name} — ${n} item${n !== 1 ? 's' : ''} · click to find on left`
              : `Deleted channel — ${n} item${n !== 1 ? 's' : ''}`
            return (
              <button
                key={chId}
                className="src-chip"
                style={{ background: colorFor(chId) }}
                title={tip}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation()
                  flashChannel(chId)
                }}
              >
                <span className="src-letter">{sym}</span>
                <span className="src-count">{n}</span>
              </button>
            )
          })}
        </div>
        <span className="cat-count">{itemsInCat.length}</span>
        <button
          className="cat-del"
          type="button"
          title="Delete category"
          onClick={(e) => {
            e.stopPropagation()
            if (itemsInCat.length === 0) {
              dispatch({ type: 'deleteCategory', id: cat.id })
              return
            }
            modal({
              title: `Delete "${cat.name}"?`,
              text: `${itemsInCat.length} item${itemsInCat.length !== 1 ? 's' : ''} in this category will move back to the inbox.`,
              danger: true,
              confirmLabel: 'Delete',
              onConfirm: () => dispatch({ type: 'deleteCategory', id: cat.id }),
            })
          }}
        >
          ×
        </button>
      </div>
      <div className="category-body">
        {itemsInCat.length === 0 ? (
          <div className="empty">Drop items here</div>
        ) : (
          itemsInCat.map((it) => <ItemCard key={it.id} item={it} showSource />)
        )}
      </div>
    </div>
  )
}
