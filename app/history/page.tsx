import { HistoryPage } from "@/components/history-page"
import { ProtectedRoute } from "@/components/protected-route"

export default function History() {
  return (
    <ProtectedRoute>
      <HistoryPage />
    </ProtectedRoute>
  )
}
