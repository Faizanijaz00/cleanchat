import { createFileRoute } from '@tanstack/react-router'
import { AnalysisPage } from '../features/analysis/AnalysisPage'

export const Route = createFileRoute('/analysis')({
  component: AnalysisPage,
})
