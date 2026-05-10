import { useState, type DragEvent } from 'react'
import type { Group } from '../state/types'
import { usePlannerStore } from '../state/store'
import { useModal } from '../../../lib/Modal'
import { EditableSpan } from '../../../lib/EditableSpan'
import { ChannelCard } from './ChannelCard'

function initials(s: string): string {
  const parts = (s || '?').trim().split(/\s+/)
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?'
}

type Props = { group: Group }

export function GroupColumn({ group: g }: Props) {
  const { dispatch } = usePlannerStore()
  const modal = useModal()
  const [dropEdge, setDropEdge] = useState<'before' | 'after' | null>(null)
  const [channelDragOver, setChannelDragOver] = useState(false)

  const pinned = g.channels.filter((c) => c.pinned)
  const unpinned = g.channels.filter((c) => !c.pinned)

  function onHeaderDragStart(e: DragEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement
    if (target.closest('[contenteditable="true"]') || target.closest('button')) {
      e.preventDefault()
      return
    }
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('application/x-group-id', g.id)
    e.dataTransfer.setData('text/x-group-id', g.id)
    ;(e.currentTarget.parentElement as HTMLElement | null)?.classList.add('group-dragging')
  }
  function onHeaderDragEnd(e: DragEvent<HTMLDivElement>) {
    ;(e.currentTarget.parentElement as HTMLElement | null)?.classList.remove('group-dragging')
  }

  function onGroupDragOver(e: DragEvent<HTMLDivElement>) {
    if (!e.dataTransfer.types.includes('application/x-group-id')) return
    e.preventDefault()
    const rect = e.currentTarget.getBoundingClientRect()
    const before = e.clientX < rect.left + rect.width / 2
    setDropEdge(before ? 'before' : 'after')
  }
  function onGroupDragLeave(e: DragEvent<HTMLDivElement>) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropEdge(null)
  }
  function onGroupDrop(e: DragEvent<HTMLDivElement>) {
    if (!e.dataTransfer.types.includes('application/x-group-id')) return
    e.preventDefault()
    const draggedId = e.dataTransfer.getData('application/x-group-id')
    setDropEdge(null)
    if (!draggedId || draggedId === g.id) return
    const rect = e.currentTarget.getBoundingClientRect()
    const before = e.clientX < rect.left + rect.width / 2
    dispatch({ type: 'reorderGroup', draggedId, targetId: g.id, before })
  }

  function onChannelListDragOver(e: DragEvent<HTMLUListElement>) {
    if (e.dataTransfer.types.includes('application/x-group-id')) return
    if (g.locked) return
    e.preventDefault()
    setChannelDragOver(true)
  }
  function onChannelListDragLeave(e: DragEvent<HTMLUListElement>) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setChannelDragOver(false)
  }
  function onChannelListDrop(e: DragEvent<HTMLUListElement>) {
    if (e.dataTransfer.types.includes('application/x-group-id')) return
    if (g.locked) return
    e.preventDefault()
    setChannelDragOver(false)
    const channelId = e.dataTransfer.getData('text/plain')
    if (!channelId) return
    const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('.channel'))
    let insertIndex = items.length
    for (let i = 0; i < items.length; i++) {
      const r = items[i].getBoundingClientRect()
      if (e.clientY < r.top + r.height / 2) { insertIndex = i; break }
    }
    dispatch({ type: 'dropChannel', channelId, targetGroupId: g.id, insertIndex })
  }

  return (
    <div
      className={`group${g.locked ? ' locked' : ''}${dropEdge === 'before' ? ' group-drop-before' : ''}${dropEdge === 'after' ? ' group-drop-after' : ''}${channelDragOver ? ' drag-over' : ''}`}
      data-group-id={g.id}
      onDragOver={onGroupDragOver}
      onDragLeave={onGroupDragLeave}
      onDrop={onGroupDrop}
    >
      <div
        className="group-header"
        draggable
        onDragStart={onHeaderDragStart}
        onDragEnd={onHeaderDragEnd}
        title="Drag header to reorder"
      >
        <div className="group-avatar" style={{ background: g.color }}>{initials(g.name)}</div>
        <div className="group-meta">
          <EditableSpan
            className="group-name"
            value={g.name}
            disabled={g.locked}
            onCommit={(name) => dispatch({ type: 'renameGroup', id: g.id, name })}
          />
          <EditableSpan
            className="group-desc"
            value={g.desc || ''}
            placeholder="Add description..."
            disabled={g.locked}
            onCommit={(desc) => dispatch({ type: 'setGroupDesc', id: g.id, desc })}
          />
          <div className="group-sub">
            {g.channels.length} channel{g.channels.length !== 1 ? 's' : ''}
            {g.locked ? ' · locked' : ''}
          </div>
        </div>
        <div className="group-actions">
          <button
            className="lock-toggle"
            title={g.locked ? 'Unlock group' : 'Lock group'}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              dispatch({ type: 'toggleGroupLock', id: g.id })
            }}
            draggable={false}
          >
            ✓
          </button>
          <button
            className="group-menu"
            title="Delete group"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              modal({
                title: `Delete "${g.name}"?`,
                text: g.channels.length
                  ? `This group has ${g.channels.length} channel${g.channels.length !== 1 ? 's' : ''}. They will be deleted too.`
                  : 'This group is empty.',
                danger: true,
                confirmLabel: 'Delete',
                onConfirm: () => dispatch({ type: 'deleteGroup', id: g.id }),
              })
            }}
            draggable={false}
          >
            ×
          </button>
        </div>
      </div>
      <ul
        className="channel-list"
        onDragOver={onChannelListDragOver}
        onDragLeave={onChannelListDragLeave}
        onDrop={onChannelListDrop}
      >
        {pinned.length > 0 && (
          <>
            <div className="pinned-header">📌 Pinned · {pinned.length}</div>
            {pinned.map((c) => <ChannelCard key={c.id} channel={c} locked={g.locked} />)}
            {unpinned.length > 0 && <div className="pinned-divider" />}
          </>
        )}
        {unpinned.map((c) => <ChannelCard key={c.id} channel={c} locked={g.locked} />)}
        {g.channels.length === 0 && (
          <div className="channel-empty">
            {g.locked ? 'No channels.' : (<>No channels yet.<br />Drop one here or click below.</>)}
          </div>
        )}
      </ul>
      <div className="group-footer">
        <button
          className="add-channel-btn"
          onClick={() => dispatch({ type: 'addChannel', groupId: g.id })}
        >
          + Add channel
        </button>
      </div>
    </div>
  )
}
