export type RatingKey = 'urgency' | 'importance' | 'universality'

export type Channel = {
  id: string
  name: string
  desc: string
  emoji?: string
  pinned?: boolean
} & Partial<Record<RatingKey, number>>

export type UnassignedPage = {
  id: string
  name: string
  channels: Channel[]
}

export type Group = {
  id: string
  name: string
  desc?: string
  color: string
  channels: Channel[]
  pageId: string
  locked?: boolean
}

export type BoardPage = {
  id: string
  name: string
}

export type PlannerState = {
  groups: Group[]
  unassignedPages: UnassignedPage[]
  activeUnassignedPage: string
  boardPages: BoardPage[]
  activeBoardPage: string
}

export const PLANNER_STORAGE_KEY = 'telegram-planner-v1'
