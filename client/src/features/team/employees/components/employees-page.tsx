import { PageHeader } from "@/components/shared/page-header"
import { DataTable } from "@/components/data/data-table"
import { Button } from "@/components/ui/button"
import { Plus, MoreHorizontal } from "lucide-react"
import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { getInitials } from "@/lib/utils"
import { RelativeTime } from "@/components/shared/relative-time"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

type Employee = {
  id: string
  name: string
  email: string
  role: string
  branch: string
  status: "active" | "inactive"
  lastLogin: string
}

const mockEmployees: Employee[] = [
  { id: "1", name: "Alice Johnson", email: "alice@travelcrm.com", role: "Admin", branch: "Head Office", status: "active", lastLogin: new Date().toISOString() },
  { id: "2", name: "Bob Smith", email: "bob@travelcrm.com", role: "Visa Consultant", branch: "Downtown Branch", status: "active", lastLogin: new Date(Date.now() - 3600000).toISOString() },
  { id: "3", name: "Charlie Davis", email: "charlie@travelcrm.com", role: "Travel Agent", branch: "Northside Branch", status: "inactive", lastLogin: new Date(Date.now() - 86400000 * 5).toISOString() },
  { id: "4", name: "Diana Prince", email: "diana@travelcrm.com", role: "Finance Manager", branch: "Head Office", status: "active", lastLogin: new Date(Date.now() - 7200000).toISOString() },
  { id: "5", name: "Edward Elric", email: "edward@travelcrm.com", role: "Visa Consultant", branch: "Downtown Branch", status: "active", lastLogin: new Date(Date.now() - 14400000).toISOString() },
]

export function EmployeesPage() {
  const columns: ColumnDef<Employee>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback>{getInitials(row.original.name)}</AvatarFallback>
          </Avatar>
          <span className="font-medium">{row.original.name}</span>
        </div>
      ),
    },
    { accessorKey: "email", header: "Email" },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => <Badge variant="outline">{row.original.role}</Badge>,
    },
    { accessorKey: "branch", header: "Branch" },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.status === "active" ? "success" : "secondary"}>
          {row.original.status}
        </Badge>
      ),
    },
    {
      accessorKey: "lastLogin",
      header: "Last Login",
      cell: ({ row }) => <RelativeTime date={row.original.lastLogin} className="text-muted-foreground" />,
    },
    {
      id: "actions",
      cell: () => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Edit employee</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">Delete employee</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Employees" description="Manage your agency staff and their access.">
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Add Employee
        </Button>
      </PageHeader>
      <DataTable 
        columns={columns} 
        data={mockEmployees} 
        searchKey="name" 
        searchPlaceholder="Search employees..." 
      />
    </div>
  )
}
