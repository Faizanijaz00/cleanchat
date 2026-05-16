export type AnalysisChannel = { id: string; name: string }
export type AnalysisGroup = { id: string; name: string; channels: AnalysisChannel[] }

export type Item = {
  id: string
  channelId: string
  text: string
  categoryId: string | null
}

export type Category = {
  id: string
  name: string
  color: string
}

export type AnalysisState = {
  groups: AnalysisGroup[]
  items: Item[]
  categories: Category[]
}

export const ANALYSIS_STORAGE_KEY = 'telegram-analysis-v1'
export const ANALYSIS_SEED_VERSION_KEY = 'telegram-analysis-seed-version'

export const CAT_COLORS = [
  '#ff516a', '#ffa85c', '#665fff', '#54cb68', '#28c9b7',
  '#2a9ef1', '#d669ed', '#ff5757', '#f0a030', '#4fae4e',
] as const

export const CHANNEL_COLORS = [
  '#ff516a', '#ffa85c', '#665fff', '#54cb68', '#28c9b7',
  '#2a9ef1', '#d669ed', '#f0a030',
] as const

export function colorFor(channelId: string): string {
  let h = 0
  for (const ch of channelId) h = (h * 31 + ch.charCodeAt(0)) | 0
  return CHANNEL_COLORS[Math.abs(h) % CHANNEL_COLORS.length]
}

export function symbolFor(channel: AnalysisChannel | null | undefined): string {
  const name = (channel && channel.name) || '?'
  return name.trim().charAt(0).toUpperCase() || '?'
}
