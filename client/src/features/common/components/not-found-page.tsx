import { EmptyState } from "@/components/shared/empty-state"
import { FileQuestion } from "lucide-react"
import { useNavigate } from "react-router-dom"

export default function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <div className="h-full flex items-center justify-center">
      <EmptyState 
        icon={FileQuestion} 
        title="Page Not Found" 
        description="The page you are looking for does not exist or has been moved."
        actionLabel="Go Home"
        onAction={() => navigate("/")}
      />
    </div>
  )
}
