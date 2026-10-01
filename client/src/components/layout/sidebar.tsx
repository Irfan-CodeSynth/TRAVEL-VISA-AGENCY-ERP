import { Link, useLocation } from "react-router-dom"
import { navigationData } from "@/config/navigation"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useAuth } from "@/features/auth/hooks/use-auth"

export function Sidebar({ isMobile, isOpen, onClose }: { isMobile?: boolean, isOpen?: boolean, onClose?: () => void }) {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()
  const { permissions } = useAuth()

  const sections = useMemo(
    () =>
      navigationData
        .map((section) => ({
          ...section,
          items: section.items.filter((item) => !item.permission || permissions.includes(item.permission)),
        }))
        .filter((section) => section.items.length > 0),
    [permissions]
  )

  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed")
    if (saved) setCollapsed(JSON.parse(saved))
  }, [])

  const toggleCollapse = () => {
    const newVal = !collapsed
    setCollapsed(newVal)
    localStorage.setItem("sidebar-collapsed", JSON.stringify(newVal))
  }

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center px-4 border-b">
        {!collapsed || isMobile ? (
          <span className="text-xl font-bold text-primary truncate">TravelCRM</span>
        ) : (
          <span className="text-xl font-bold text-primary w-full text-center">TC</span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-6 px-2">
          {sections.map((section) => (
            <div key={section.section}>
              {(!collapsed || isMobile) && (
                <h4 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {section.section}
                </h4>
              )}
              <ul className="space-y-1">
                {section.items.map((item) => {
                  const isActive = location.pathname.startsWith(item.path)
                  const link = (
                    <Link
                      to={item.path}
                      onClick={isMobile ? onClose : undefined}
                      className={cn(
                        "group flex items-center gap-x-3 rounded-md px-2 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary/10 text-primary border-l-2 border-primary"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground border-l-2 border-transparent"
                      )}
                    >
                      <item.icon className={cn("h-5 w-5 shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />
                      {(!collapsed || isMobile) && <span>{item.label}</span>}
                    </Link>
                  )

                  return (
                    <li key={item.path}>
                      {collapsed && !isMobile ? (
                        <TooltipProvider delayDuration={0}>
                          <Tooltip>
                            <TooltipTrigger asChild>{link}</TooltipTrigger>
                            <TooltipContent side="right">{item.label}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : link}
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      {!isMobile && (
        <div className="border-t p-2">
          <button
            onClick={toggleCollapse}
            className="flex w-full items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>
        </div>
      )}
    </div>
  )

  if (isMobile) {
    if (!isOpen) return null
    return (
      <div className="fixed inset-0 z-50 flex">
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
        <motion.div
          initial={{ x: "-100%" }}
          animate={{ x: 0 }}
          exit={{ x: "-100%" }}
          transition={{ type: "spring", bounce: 0, duration: 0.3 }}
          className="relative z-50 w-3/4 max-w-sm bg-card border-r shadow-lg"
        >
          {sidebarContent}
        </motion.div>
      </div>
    )
  }

  return (
    <motion.div
      initial={false}
      animate={{ width: collapsed ? 68 : 240 }}
      transition={{ duration: 0.2 }}
      className="hidden md:flex h-screen flex-col border-r bg-card shrink-0"
    >
      {sidebarContent}
    </motion.div>
  )
}
