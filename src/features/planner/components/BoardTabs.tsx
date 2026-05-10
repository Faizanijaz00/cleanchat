import { useState } from 'react'
import { usePlannerStore } from '../state/store'
import { EditableSpan } from '../../../lib/EditableSpan'
import { useModal } from '../../../lib/Modal'

type Props = {
  unassignedCount: number
  sidebarCollapsed: boolean
  onToggleSidebar: () => void
}

export function BoardTabs({ unassignedCount, sidebarCollapsed, onToggleSidebar }: Props) {
  const { state, dispatch } = usePlannerStore()
  const modal = useModal()
  const [dragOverPage, setDragOverPage] = useState<string | null>(null)

  return (
    <div className="board-tabs">
      {state.boardPages.map((p) => {
        const isActive = p.id === state.activeBoardPage
        const groupsOnPage = state.groups.filter((g) => g.pageId === p.id).length
        const isDragOver = dragOverPage === p.id
        return (
          <button
            key={p.id}
            className={`board-tab${isActive ? ' active' : ''}${isDragOver ? ' drag-over' : ''}`}
            onClick={(e) => {
              if ((e.target as HTMLElement).closest('.btab-del')) return
              if ((e.target as HTMLElement).closest('[contenteditable="true"]')) return
              dispatch({ type: 'switchBoardPage', pageId: p.id })
            }}
            onDragOver={(e) => {
              if (!e.dataTransfer.types.includes('application/x-group-id')) return
              e.preventDefault()
              setDragOverPage(p.id)
            }}
            onDragLeave={() => setDragOverPage((cur) => (cur === p.id ? null : cur))}
            onDrop={(e) => {
              if (!e.dataTransfer.types.includes('application/x-group-id')) return
              e.preventDefault()
              e.stopPropagation()
              setDragOverPage(null)
              const draggedId = e.dataTransfer.getData('application/x-group-id')
              if (!draggedId) return
              dispatch({ type: 'moveGroupToPage', groupId: draggedId, pageId: p.id })
            }}
          >
            <EditableSpan
              className="btab-name"
              value={p.name}
              onCommit={(name) => dispatch({ type: 'renameBoardPage', pageId: p.id, name })}
            />
            <span className="btab-count">{groupsOnPage}</span>
            <button
              className="btab-del"
              type="button"
              title="Delete page"
              onClick={(e) => {
                e.stopPropagation()
                if (state.boardPages.length <= 1) return
                if (groupsOnPage === 0) {
                  dispatch({ type: 'deleteBoardPage', pageId: p.id })
                  return
                }
                modal({
                  title: `Delete "${p.name}"?`,
                  text: `${groupsOnPage} group${groupsOnPage !== 1 ? 's' : ''} on this page will be deleted too.`,
                  danger: true,
                  confirmLabel: 'Delete',
                  onConfirm: () => dispatch({ type: 'deleteBoardPage', pageId: p.id }),
                })
              }}
            >
              ×
            </button>
          </button>
        )
      })}
      <button
        className="board-add-page"
        title="Add page"
        onClick={() => dispatch({ type: 'addBoardPage' })}
      >
        + Page
      </button>

      <button
        className={`board-unassigned-toggle${sidebarCollapsed ? '' : ' active'}`}
        title="Toggle unassigned panel"
        onClick={onToggleSidebar}
      >
        <span>📥 Unassigned</span>
        <span className="pill-count">{unassignedCount}</span>
      </button>
    </div>
  )
}
