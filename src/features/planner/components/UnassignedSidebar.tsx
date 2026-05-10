import { useState, type DragEvent } from 'react'
import { usePlannerStore, useActiveUnassignedPage } from '../state/store'
import { useModal } from '../../../lib/Modal'
import { EditableSpan } from '../../../lib/EditableSpan'
import { ChannelCard } from './ChannelCard'

type Props = { collapsed: boolean }

export function UnassignedSidebar({ collapsed }: Props) {
  const { state, dispatch } = usePlannerStore()
  const modal = useModal()
  const activePage = useActiveUnassignedPage()
  const [dragOverPage, setDragOverPage] = useState<string | null>(null)
  const [bodyDragOver, setBodyDragOver] = useState(false)

  const total = state.unassignedPages.reduce((acc, p) => acc + p.channels.length, 0)

  function onBodyDragOver(e: DragEvent<HTMLDivElement>) {
    if (e.dataTransfer.types.includes('application/x-group-id')) return
    e.preventDefault()
    setBodyDragOver(true)
  }
  function onBodyDragLeave(e: DragEvent<HTMLDivElement>) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setBodyDragOver(false)
  }
  function onBodyDrop(e: DragEvent<HTMLDivElement>) {
    if (e.dataTransfer.types.includes('application/x-group-id')) return
    e.preventDefault()
    setBodyDragOver(false)
    const channelId = e.dataTransfer.getData('text/plain')
    if (!channelId) return
    const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('.channel'))
    let insertIndex = items.length
    for (let i = 0; i < items.length; i++) {
      const r = items[i].getBoundingClientRect()
      if (e.clientY < r.top + r.height / 2) { insertIndex = i; break }
    }
    dispatch({ type: 'dropChannel', channelId, targetGroupId: '__unassigned__', insertIndex })
  }

  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="icon">📥</div>
        <div>
          <div className="title">Unassigned</div>
          <div className="sub">{activePage?.channels.length ?? 0} on this page · {total} total</div>
        </div>
      </div>

      <div className="unassigned-tabs">
        {state.unassignedPages.map((p) => {
          const isActive = p.id === state.activeUnassignedPage
          const isDragOver = dragOverPage === p.id
          return (
            <button
              key={p.id}
              className={`unassigned-tab${isActive ? ' active' : ''}${isDragOver ? ' drag-over' : ''}`}
              onClick={(e) => {
                if ((e.target as HTMLElement).closest('.tab-del')) return
                if ((e.target as HTMLElement).closest('[contenteditable="true"]')) return
                dispatch({ type: 'switchUnassignedPage', pageId: p.id })
              }}
              onDragOver={(e) => {
                if (e.dataTransfer.types.includes('application/x-group-id')) return
                e.preventDefault()
                setDragOverPage(p.id)
              }}
              onDragLeave={() => setDragOverPage((cur) => (cur === p.id ? null : cur))}
              onDrop={(e) => {
                if (e.dataTransfer.types.includes('application/x-group-id')) return
                e.preventDefault()
                e.stopPropagation()
                setDragOverPage(null)
                const channelId = e.dataTransfer.getData('text/plain')
                if (!channelId) return
                dispatch({ type: 'moveChannelToPage', channelId, targetPageId: p.id })
              }}
            >
              <EditableSpan
                className="tab-name"
                value={p.name}
                onCommit={(name) => dispatch({ type: 'renameUnassignedPage', pageId: p.id, name })}
              />
              <span className="tab-count">{p.channels.length}</span>
              <button
                className="tab-del"
                type="button"
                title="Delete page"
                onClick={(e) => {
                  e.stopPropagation()
                  if (state.unassignedPages.length <= 1) return
                  if (p.channels.length === 0) {
                    dispatch({ type: 'deleteUnassignedPage', pageId: p.id })
                    return
                  }
                  modal({
                    title: `Delete "${p.name}"?`,
                    text: `${p.channels.length} channel${p.channels.length !== 1 ? 's' : ''} on this page will be deleted too.`,
                    danger: true,
                    confirmLabel: 'Delete',
                    onConfirm: () => dispatch({ type: 'deleteUnassignedPage', pageId: p.id }),
                  })
                }}
              >
                ×
              </button>
            </button>
          )
        })}
        <button
          className="unassigned-add-page"
          title="Add page"
          onClick={() => dispatch({ type: 'addUnassignedPage' })}
        >
          +
        </button>
      </div>

      <div
        className={`sidebar-body${bodyDragOver ? ' drag-over' : ''}`}
        onDragOver={onBodyDragOver}
        onDragLeave={onBodyDragLeave}
        onDrop={onBodyDrop}
      >
        {!activePage || activePage.channels.length === 0 ? (
          <div className="sidebar-empty">
            No channels on this page.<br />Drop one here or click below.
          </div>
        ) : (
          <ul className="channel-list" style={{ padding: 0 }}>
            {activePage.channels.map((c) => <ChannelCard key={c.id} channel={c} />)}
          </ul>
        )}
      </div>

      <div className="sidebar-footer">
        <button className="add-unassigned-btn" onClick={() => dispatch({ type: 'addUnassignedChannel' })}>
          + Add channel
        </button>
      </div>
    </aside>
  )
}
