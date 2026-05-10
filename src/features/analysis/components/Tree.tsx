import { useEffect, useRef, useState } from 'react'
import { useAnalysisStore } from '../state/store'
import { useModal } from '../../../lib/Modal'
import { EditableSpan } from '../../../lib/EditableSpan'
import { colorFor, symbolFor } from '../state/types'

export function Tree() {
  const { state, dispatch, selectedChannelId, setSelectedChannelId } = useAnalysisStore()
  const modal = useModal()
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [editGroup, setEditGroup] = useState<string | null>(null)
  const [editChannel, setEditChannel] = useState<string | null>(null)
  const [editKey, setEditKey] = useState(0)

  return (
    <aside className="tree-panel">
      {state.groups.length === 0 ? (
        <div className="tree-empty">
          No groupchats yet.<br /><br />Click <strong>+ Groupchat</strong> below to add one.
        </div>
      ) : (
        state.groups.map((g) => {
          const isCollapsed = !!collapsed[g.id]
          return (
            <div key={g.id} className="tree-group">
              <div
                className={`tree-group-header${isCollapsed ? ' collapsed' : ''}`}
                title="Click to expand · double-click name to rename"
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest('button')) return
                  if ((e.target as HTMLElement).closest('[contenteditable="true"]')) return
                  setCollapsed((prev) => ({ ...prev, [g.id]: !prev[g.id] }))
                }}
                onDoubleClick={(e) => {
                  if ((e.target as HTMLElement).closest('button')) return
                  setEditGroup(g.id)
                  setEditKey((k) => k + 1)
                }}
              >
                <span className="caret">▼</span>
                <EditableSpan
                  className="name"
                  value={g.name}
                  disabled={editGroup !== g.id}
                  startEditingKey={editGroup === g.id ? `${g.id}-${editKey}` : undefined}
                  onCommit={(name) => {
                    dispatch({ type: 'renameGroup', id: g.id, name })
                    setEditGroup(null)
                  }}
                />
                <button
                  className="iconbtn"
                  title="Add channel"
                  onClick={(e) => {
                    e.stopPropagation()
                    dispatch({ type: 'addChannel', groupId: g.id })
                    setCollapsed((p) => ({ ...p, [g.id]: false }))
                  }}
                >
                  +
                </button>
                <button
                  className="iconbtn"
                  title="Delete groupchat"
                  onClick={(e) => {
                    e.stopPropagation()
                    const itemsAffected = state.items.filter((it) => g.channels.some((c) => c.id === it.channelId)).length
                    if (g.channels.length === 0) {
                      dispatch({ type: 'deleteGroup', id: g.id })
                      return
                    }
                    modal({
                      title: `Delete "${g.name}"?`,
                      text: `${g.channels.length} channel${g.channels.length !== 1 ? 's' : ''} and ${itemsAffected} item${itemsAffected !== 1 ? 's' : ''} will be removed.`,
                      danger: true,
                      confirmLabel: 'Delete',
                      onConfirm: () => dispatch({ type: 'deleteGroup', id: g.id }),
                    })
                  }}
                >
                  ×
                </button>
              </div>
              <div className={`tree-channel-list${isCollapsed ? ' collapsed' : ''}`}>
                {g.channels.length === 0 ? (
                  <div style={{ padding: '6px 16px 6px 38px', color: 'var(--tg-text-muted)', fontSize: 12, fontStyle: 'italic' }}>
                    (no channels — click + to add)
                  </div>
                ) : (
                  g.channels.map((c) => {
                    const isActive = c.id === selectedChannelId
                    const count = state.items.filter((it) => it.channelId === c.id).length
                    return (
                      <TreeChannelRow
                        key={c.id}
                        groupName={g.name}
                        channelId={c.id}
                        channelName={c.name}
                        active={isActive}
                        count={count}
                        editing={editChannel === c.id}
                        editKey={editChannel === c.id ? `${c.id}-${editKey}` : undefined}
                        onSelect={() => setSelectedChannelId(c.id)}
                        onStartEdit={() => {
                          setEditChannel(c.id)
                          setEditKey((k) => k + 1)
                        }}
                        onCommitName={(name) => {
                          dispatch({ type: 'renameChannel', channelId: c.id, name })
                          setEditChannel(null)
                        }}
                        onDelete={() => {
                          const itemCount = state.items.filter((it) => it.channelId === c.id).length
                          if (itemCount === 0) {
                            dispatch({ type: 'deleteChannel', channelId: c.id })
                            return
                          }
                          modal({
                            title: `Delete "${c.name}"?`,
                            text: `${itemCount} item${itemCount !== 1 ? 's' : ''} will be removed (including any in categories).`,
                            danger: true,
                            confirmLabel: 'Delete',
                            onConfirm: () => dispatch({ type: 'deleteChannel', channelId: c.id }),
                          })
                        }}
                      />
                    )
                  })
                )}
              </div>
            </div>
          )
        })
      )}
      <div className="tree-footer">
        <button onClick={() => dispatch({ type: 'addGroup' })}>+ Groupchat</button>
      </div>
    </aside>
  )
}

type RowProps = {
  groupName: string
  channelId: string
  channelName: string
  active: boolean
  count: number
  editing: boolean
  editKey?: string
  onSelect: () => void
  onStartEdit: () => void
  onCommitName: (name: string) => void
  onDelete: () => void
}

function TreeChannelRow(props: RowProps) {
  const { channelId, channelName, active, count, editing, editKey, onSelect, onStartEdit, onCommitName, onDelete } = props
  const ref = useRef<HTMLDivElement>(null)
  const [flashing, setFlashing] = useState(false)

  // Flash hook listens for global event
  useEffect(() => {
    function onFlash(e: Event) {
      const detail = (e as CustomEvent<string>).detail
      if (detail !== channelId) return
      setFlashing(false)
      requestAnimationFrame(() => {
        setFlashing(true)
        ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        window.setTimeout(() => setFlashing(false), 1300)
      })
    }
    window.addEventListener('analysis:flash-channel', onFlash)
    return () => window.removeEventListener('analysis:flash-channel', onFlash)
  }, [channelId])

  return (
    <div
      ref={ref}
      className={`tree-channel${active ? ' active' : ''}${flashing ? ' flash' : ''}`}
      data-channel-id={channelId}
      title="Click to select · double-click name to rename"
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button')) return
        if ((e.target as HTMLElement).closest('[contenteditable="true"]')) return
        onSelect()
      }}
      onDoubleClick={(e) => {
        if ((e.target as HTMLElement).closest('button')) return
        onStartEdit()
      }}
    >
      <span className="symbol" style={{ color: colorFor(channelId) }}>
        {symbolFor({ id: channelId, name: channelName })}
      </span>
      <EditableSpan
        className="channel-name"
        value={channelName}
        disabled={!editing}
        startEditingKey={editKey}
        onCommit={onCommitName}
      />
      {count ? <span className="channel-count">{count}</span> : null}
      <button
        className="iconbtn"
        title="Delete channel"
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
      >
        ×
      </button>
    </div>
  )
}
