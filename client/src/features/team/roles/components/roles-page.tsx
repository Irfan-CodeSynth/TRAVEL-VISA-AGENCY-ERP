import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { Plus, Shield } from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const mockRoles = [
  { id: "1", name: "Super Admin", description: "Full access to all system features and settings.", users: 2, permissions: 124, isSystem: true },
  { id: "2", name: "Branch Manager", description: "Can manage branch operations, staff, and view branch reports.", users: 4, permissions: 86, isSystem: true },
  { id: "3", name: "Visa Consultant", description: "Can process applications, manage client docs, and schedule appointments.", users: 15, permissions: 42, isSystem: false },
  { id: "4", name: "Travel Agent", description: "Can book flights, hotels, and tour packages.", users: 12, permissions: 38, isSystem: false },
  { id: "5", name: "Finance Manager", description: "Access to all invoices, payments, expenses, and financial reports.", users: 3, permissions: 55, isSystem: true },
  { id: "6", name: "Accountant", description: "Can create invoices and record payments.", users: 5, permissions: 24, isSystem: false },
  { id: "7", name: "Sales Representative", description: "Can manage leads, quotations, and follow-ups.", users: 8, permissions: 30, isSystem: false },
  { id: "8", name: "Data Entry", description: "Basic access to enter customer info and upload documents.", users: 6, permissions: 12, isSystem: false },
  { id: "9", name: "HR Manager", description: "Can manage employees, payroll, and attendance.", users: 2, permissions: 45, isSystem: true },
  { id: "10", name: "Auditor", description: "Read-only access to all records for compliance and auditing.", users: 1, permissions: 110, isSystem: false },
]

export function RolesPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Roles & Permissions" description="Define roles and control access to different modules.">
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Create Role
        </Button>
      </PageHeader>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {mockRoles.map((role) => (
          <Card key={role.id} className="flex flex-col hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start">
                <CardTitle className="text-xl flex items-center gap-2">
                  {role.isSystem && <Shield className="h-5 w-5 text-primary" />}
                  {role.name}
                </CardTitle>
                {role.isSystem && <Badge variant="secondary">System</Badge>}
              </div>
              <CardDescription className="h-10 line-clamp-2 mt-2">{role.description}</CardDescription>
            </CardHeader>
            <CardContent className="mt-auto">
              <div className="flex items-center gap-4 text-sm text-muted-foreground pt-4 border-t">
                <div className="flex items-center gap-1">
                  <span className="font-medium text-foreground">{role.users}</span> Users
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-medium text-foreground">{role.permissions}</span> Permissions
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
