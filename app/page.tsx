import { UploadPage } from "@/components/upload-page"
import { ProtectedRoute } from "@/components/protected-route"

export default function Home() {
  return (
    <ProtectedRoute>
      <UploadPage />
    </ProtectedRoute>
  )
}
