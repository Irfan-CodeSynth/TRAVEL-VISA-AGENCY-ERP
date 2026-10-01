import { useNavigate } from "react-router-dom"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Command } from "@/components/ui/command"
import { CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "cmdk"
import { useCommandPalette } from "@/hooks/use-command-palette"
import { navigationData } from "@/config/navigation"
import { Plus } from "lucide-react"

export function CommandPalette() {
  const { isOpen, close } = useCommandPalette()
  const navigate = useNavigate()


  const runCommand = (command: () => void) => {
    close()
    command()
  }

  return (
    <Dialog open={isOpen} onOpenChange={close}>
      <DialogContent className="overflow-hidden p-0 shadow-2xl max-w-2xl border-0">
        <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
          <div className="flex items-center border-b px-3">
            <CommandInput 
              placeholder="Type a command or search..." 
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <CommandList className="max-h-[300px] overflow-y-auto overflow-x-hidden p-2">
            <CommandEmpty className="py-6 text-center text-sm">No results found.</CommandEmpty>
            
            <CommandGroup heading="Navigation" className="mb-4 text-xs font-semibold text-muted-foreground px-2">
              <div className="space-y-1">
                {navigationData.flatMap(group => group.items).map((item) => (
                  <CommandItem
                    key={item.path}
                    value={item.label}
                    onSelect={() => runCommand(() => navigate(item.path))}
                    className="flex cursor-pointer items-center rounded-md px-2 py-2 text-sm aria-selected:bg-accent aria-selected:text-accent-foreground"
                  >
                    <item.icon className="mr-2 h-4 w-4" />
                    <span>{item.label}</span>
                  </CommandItem>
                ))}
              </div>
            </CommandGroup>
            
            <CommandGroup heading="Quick Actions" className="text-xs font-semibold text-muted-foreground px-2">
              <div className="space-y-1">
                {[
                  { label: "New Lead", path: "/crm/leads?new=1" },
                  { label: "New Customer", path: "/crm/customers?new=1" },
                  { label: "New Application", path: "/visa/applications?new=1" },
                  { label: "New Booking", path: "/travel/bookings?new=1" },
                  { label: "New Quotation", path: "/finance/quotations?new=1" },
                  { label: "New Invoice", path: "/finance/invoices?new=1" },
                ].map(action => (
                  <CommandItem
                    key={action.label}
                    onSelect={() => runCommand(() => navigate(action.path))}
                    className="flex cursor-pointer items-center rounded-md px-2 py-2 text-sm aria-selected:bg-accent aria-selected:text-accent-foreground"
                  >
                    <Plus className="mr-2 h-4 w-4 text-primary" />
                    <span>{action.label}</span>
                  </CommandItem>
                ))}
              </div>
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
