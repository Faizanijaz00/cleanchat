import { useState } from 'react'
import { PlannerStoreProvider, usePlannerStore, useVisibleGroups } from './state/store'
import { ToastProvider } from '../../lib/Toast'
import { ModalProvider } from '../../lib/Modal'
import { Topbar } from './components/Topbar'
import { BoardTabs } from './components/BoardTabs'
import { GroupColumn } from './components/Group'
import { UnassignedSidebar } from './components/UnassignedSidebar'
import './planner.css'

function PlannerInner() {
  const { state, dispatch } = usePlannerStore()
  const visible = useVisibleGroups()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const unassignedTotal = state.unassignedPages.reduce((acc, p) => acc + p.channels.length, 0)

  return (
    <div className="planner">
      <Topbar />
      <div className="main">
        <div className="board-col">
          <BoardTabs
            unassignedCount={unassignedTotal}
            sidebarCollapsed={sidebarCollapsed}
            onToggleSidebar={() => setSidebarCollapsed((v) => !v)}
          />
          <div className="board">
            {visible.map((g) => <GroupColumn key={g.id} group={g} />)}
            <div className="add-group" onClick={() => dispatch({ type: 'addGroup' })}>
              <div className="plus">+</div>
              <div>Add group chat</div>
              <div style={{ fontSize: 12, opacity: .7 }}>Drag channels here once created</div>
            </div>
          </div>
        </div>
        <UnassignedSidebar collapsed={sidebarCollapsed} />
      </div>
    </div>
  )
}

export function PlannerPage() {
  return (
    <ToastProvider>
      <ModalProvider>
        <PlannerStoreProvider>
          <PlannerInner />
        </PlannerStoreProvider>
      </ModalProvider>
    </ToastProvider>
  )
}
