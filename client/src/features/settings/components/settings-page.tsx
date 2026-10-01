import { PageHeader } from "@/components/shared/page-header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DataTable } from "@/components/data/data-table"
import { Switch } from "@/components/ui/switch"
import { ColumnDef } from "@tanstack/react-table"

const mockCurrencies = [
  { code: "USD", name: "US Dollar", symbol: "$", rate: 1.0, isDefault: true, isActive: true },
  { code: "EUR", name: "Euro", symbol: "€", rate: 0.92, isDefault: false, isActive: true },
  { code: "GBP", name: "British Pound", symbol: "£", rate: 0.79, isDefault: false, isActive: true },
  { code: "AED", name: "UAE Dirham", symbol: "د.إ", rate: 3.67, isDefault: false, isActive: true },
  { code: "SAR", name: "Saudi Riyal", symbol: "ر.س", rate: 3.75, isDefault: false, isActive: true },
  { code: "PKR", name: "Pakistani Rupee", symbol: "₨", rate: 278.5, isDefault: false, isActive: true },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$", rate: 1.36, isDefault: false, isActive: false },
  { code: "AUD", name: "Australian Dollar", symbol: "A$", rate: 1.52, isDefault: false, isActive: false },
]

export function SettingsPage() {
  const columns: ColumnDef<typeof mockCurrencies[0]>[] = [
    { accessorKey: "code", header: "Code", cell: ({ row }) => <span className="font-semibold">{row.original.code}</span> },
    { accessorKey: "name", header: "Name" },
    { accessorKey: "symbol", header: "Symbol" },
    { accessorKey: "rate", header: "Exchange Rate" },
    { 
      accessorKey: "isDefault", 
      header: "Default",
      cell: ({ row }) => <Switch checked={row.original.isDefault} disabled={row.original.isDefault} />
    },
    { 
      accessorKey: "isActive", 
      header: "Active",
      cell: ({ row }) => <Switch checked={row.original.isActive} />
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Manage your agency preferences and configurations." />

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="currencies">Currencies</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Configure your basic agency details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input id="companyName" defaultValue="Travel & Visa CRM" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select defaultValue="utc">
                    <SelectTrigger id="timezone">
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="utc">UTC (Coordinated Universal Time)</SelectItem>
                      <SelectItem value="est">EST (Eastern Standard Time)</SelectItem>
                      <SelectItem value="pst">PST (Pacific Standard Time)</SelectItem>
                      <SelectItem value="gst">GST (Gulf Standard Time)</SelectItem>
                      <SelectItem value="pkt">PKT (Pakistan Standard Time)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="defaultCurrency">Default Currency</Label>
                  <Select defaultValue="usd">
                    <SelectTrigger id="defaultCurrency">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="usd">USD ($)</SelectItem>
                      <SelectItem value="eur">EUR (€)</SelectItem>
                      <SelectItem value="aed">AED (د.إ)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-medium mb-4">Document Expiry Thresholds (Days)</h3>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  <div className="space-y-2">
                    <Label>Critical</Label>
                    <Input type="number" defaultValue="7" />
                  </div>
                  <div className="space-y-2">
                    <Label>High</Label>
                    <Input type="number" defaultValue="30" />
                  </div>
                  <div className="space-y-2">
                    <Label>Medium</Label>
                    <Input type="number" defaultValue="60" />
                  </div>
                  <div className="space-y-2">
                    <Label>Low</Label>
                    <Input type="number" defaultValue="90" />
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button>Save Changes</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="currencies">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Currencies</CardTitle>
                <CardDescription>Manage exchange rates and active currencies.</CardDescription>
              </div>
              <Button size="sm">Add Currency</Button>
            </CardHeader>
            <CardContent>
              <DataTable columns={columns} data={mockCurrencies} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
