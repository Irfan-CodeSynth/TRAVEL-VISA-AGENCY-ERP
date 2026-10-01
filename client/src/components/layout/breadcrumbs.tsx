import { ChevronRight, Home } from "lucide-react"
import { Link, useLocation } from "react-router-dom"

export function Breadcrumbs() {
  const location = useLocation()
  const paths = location.pathname.split("/").filter(Boolean)

  if (paths.length === 0) return null

  const formatLabel = (path: string) => {
    return path.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  }

  return (
    <nav className="flex" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2">
        <li>
          <div>
            <Link to="/" className="text-muted-foreground hover:text-foreground">
              <Home className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="sr-only">Home</span>
            </Link>
          </div>
        </li>
        {paths.map((path, index) => {
          const isLast = index === paths.length - 1
          const href = `/${paths.slice(0, index + 1).join("/")}`

          return (
            <li key={path}>
              <div className="flex items-center">
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                {isLast ? (
                  <span className="ml-2 text-sm font-medium text-foreground" aria-current="page">
                    {formatLabel(path)}
                  </span>
                ) : (
                  <Link to={href} className="ml-2 text-sm font-medium text-muted-foreground hover:text-foreground">
                    {formatLabel(path)}
                  </Link>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
