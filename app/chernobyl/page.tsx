import { ProtectedRoute } from "../../components/protected-route"
import { ChernobylMonitorPage } from "../../components/chernobyl-monitor-page"

export default function ChernobylPage() {
  return (
    <ProtectedRoute>
      <ChernobylMonitorPage />
    </ProtectedRoute>
  )
}


