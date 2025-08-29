import { GearscorePageComponent } from "../../components/gearscore-page"
import { ProtectedRoute } from "../../components/protected-route"

export default function GearscorePage() {
  return (
    <ProtectedRoute>
      <GearscorePageComponent />
    </ProtectedRoute>
  )
}
