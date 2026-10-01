import { LayoutDashboard, Users, FileText, CheckSquare, Menu } from "lucide-react"
import { Link, useLocation } from "react-router-dom"
import { cn } from "@/lib/utils"

export function MobileNav({ onOpenMenu }: { onOpenMenu: () => void }) {
  const location = useLocation()

  const items = [
    { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
    { label: "Leads", icon: Users, path: "/crm/leads" },
    { label: "Apps", icon: FileText, path: "/visa/applications" },
    { label: "Tasks", icon: CheckSquare, path: "/crm/follow-ups" },
  ]

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t bg-card pb-safe">
      {items.map((item) => {
        const isActive = location.pathname.startsWith(item.path)
        return (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex flex-col items-center justify-center w-full h-full gap-1 text-xs font-medium transition-colors",
              isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <item.icon className="h-5 w-5" />
            <span>{item.label}</span>
          </Link>
        )
      })}
      <button
        onClick={onOpenMenu}
        className="flex flex-col items-center justify-center w-full h-full gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <Menu className="h-5 w-5" />
        <span>More</span>
      </button>
    </div>
  )
}
