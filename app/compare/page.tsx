import { ComparePage } from "@/components/compare-page"
import { ProtectedRoute } from "@/components/protected-route"

export default function Compare() {
  return (
    <ProtectedRoute>
      <ComparePage />
    </ProtectedRoute>
  )
}
