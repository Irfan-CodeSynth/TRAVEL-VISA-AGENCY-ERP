import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Command } from "@/components/ui/command";
import {
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "cmdk";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";

export interface ComboboxItem {
  value: string;
  label: string;
  hint?: string;
  raw?: unknown;
}

interface AsyncComboboxProps {
  name: string;
  label?: string;
  required?: boolean;
  placeholder?: string;
  emptyMessage?: string;
  value: string | null | undefined;
  selectedLabel?: string | null;
  onChange: (value: string, label: string, item: ComboboxItem) => void;
  fetchItems: (query: string) => Promise<ComboboxItem[]>;
  queryKey: string;
  className?: string;
  disabled?: boolean;
}

export function AsyncCombobox({
  label,
  required,
  placeholder = "Search...",
  emptyMessage = "No results.",
  value,
  selectedLabel,
  onChange,
  fetchItems,
  queryKey,
  className,
  disabled,
}: AsyncComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const { data, isFetching } = useQuery({
    queryKey: [queryKey, "combobox", query],
    queryFn: () => fetchItems(query),
    enabled: open,
    staleTime: 1000 * 30,
  });

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const items = useMemo(() => data ?? [], [data]);

  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <Label>
          {label}
          {required && <span className="text-destructive"> *</span>}
        </Label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn("w-full justify-between font-normal", !value && "text-muted-foreground")}
          >
            <span className="truncate">{value ? selectedLabel || "Selected" : placeholder}</span>
            {isFetching ? (
              <Loader2 className="ml-2 h-4 w-4 shrink-0 animate-spin opacity-50" />
            ) : (
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={placeholder}
              value={query}
              onValueChange={setQuery}
            />
            <CommandList>
              <CommandEmpty>{isFetching ? "Searching..." : emptyMessage}</CommandEmpty>
              <CommandGroup>
                {items.map((item) => (
                  <CommandItem
                    key={item.value}
                    value={item.value}
                    onSelect={() => {
                      onChange(item.value, item.label, item);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn("mr-2 h-4 w-4", value === item.value ? "opacity-100" : "opacity-0")}
                    />
                    <span>{item.label}</span>
                    {item.hint && <span className="ml-auto text-xs text-muted-foreground">{item.hint}</span>}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
