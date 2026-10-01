import { Controller, useFormContext } from "react-hook-form"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useCurrencies } from "@/hooks/use-currencies"
import { cn } from "@/lib/utils"

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-xs text-destructive">{message}</p>
}

interface BaseProps {
  name: string
  label?: string
  required?: boolean
  className?: string
  description?: string
}

export function TextField({
  name,
  label,
  required,
  className,
  description,
  type = "text",
  placeholder,
  disabled,
  step,
}: BaseProps & { type?: string; placeholder?: string; disabled?: boolean; step?: string }) {
  const { register, formState: { errors } } = useFormContext()
  const error = (errors as any)[name]?.message as string | undefined
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && <Label htmlFor={name}>{label}{required && <span className="text-destructive"> *</span>}</Label>}
      <Input id={name} type={type} placeholder={placeholder} disabled={disabled} step={step} {...register(name)} />
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      <FieldError message={error} />
    </div>
  )
}

export function TextAreaField({
  name,
  label,
  required,
  className,
  placeholder,
  rows = 3,
}: BaseProps & { placeholder?: string; rows?: number }) {
  const { register, formState: { errors } } = useFormContext()
  const error = (errors as any)[name]?.message as string | undefined
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && <Label htmlFor={name}>{label}{required && <span className="text-destructive"> *</span>}</Label>}
      <Textarea id={name} placeholder={placeholder} rows={rows} {...register(name)} />
      <FieldError message={error} />
    </div>
  )
}

export interface SelectOption {
  value: string
  label: string
}

export function SelectField({
  name,
  label,
  required,
  className,
  options,
  placeholder = "Select...",
}: BaseProps & { options: SelectOption[]; placeholder?: string }) {
  const { control, formState: { errors } } = useFormContext()
  const error = (errors as any)[name]?.message as string | undefined
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && <Label>{label}{required && <span className="text-destructive"> *</span>}</Label>}
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <Select value={field.value ?? ""} onValueChange={field.onChange}>
            <SelectTrigger>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
      <FieldError message={error} />
    </div>
  )
}

/** Amount + 3-letter currency select. `name` = amount field, `currencyName` = currency field. */
export function MoneyField({
  name,
  label,
  required,
  className,
  currencyName = "currencyCode",
}: BaseProps & { currencyName?: string }) {
  const { register, control, formState: { errors } } = useFormContext()
  const { data: currencies } = useCurrencies()
  const amountError = (errors as any)[name]?.message as string | undefined
  const currencyError = (errors as any)[currencyName]?.message as string | undefined
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && <Label>{label}{required && <span className="text-destructive"> *</span>}</Label>}
      <div className="grid grid-cols-[1fr_130px] gap-2">
        <Input id={name} type="number" step="0.01" min="0" {...register(name)} />
        <Controller
          name={currencyName}
          control={control}
          render={({ field }) => (
            <Select value={field.value ?? ""} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue placeholder="USD" />
              </SelectTrigger>
              <SelectContent>
                {(currencies ?? []).map((c) => (
                  <SelectItem key={c.code} value={c.code}>{c.code}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>
      <FieldError message={amountError || currencyError} />
    </div>
  )
}

/** Native date/datetime input kept as a raw string value in the form. */
export function DateField({
  name,
  label,
  required,
  className,
  withTime = false,
  disabled,
}: BaseProps & { withTime?: boolean; disabled?: boolean }) {
  const { watch, setValue, formState: { errors } } = useFormContext()
  const value = watch(name)
  const error = (errors as any)[name]?.message as string | undefined

  const toInputValue = (v: any): string => {
    if (!v) return ""
    const d = new Date(v)
    if (isNaN(d.getTime())) return String(v)
    const pad = (n: number) => String(n).padStart(2, "0")
    const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    return withTime ? `${date}T${pad(d.getHours())}:${pad(d.getMinutes())}` : date
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      {label && <Label htmlFor={name}>{label}{required && <span className="text-destructive"> *</span>}</Label>}
      <Input
        id={name}
        type={withTime ? "datetime-local" : "date"}
        value={toInputValue(value)}
        disabled={disabled}
        onChange={(e) => {
          const raw = e.target.value
          setValue(name, raw ? new Date(raw).toISOString() : raw, { shouldValidate: true })
        }}
      />
      <FieldError message={error} />
    </div>
  )
}

export function SwitchField({
  name,
  label,
  className,
}: BaseProps) {
  const { control } = useFormContext()
  return (
    <div className={cn("flex items-center justify-between gap-4 py-1", className)}>
      <Label>{label}</Label>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <Switch checked={!!field.value} onCheckedChange={field.onChange} />
        )}
      />
    </div>
  )
}

export function CheckboxField({
  name,
  label,
  className,
}: BaseProps) {
  const { control } = useFormContext()
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <Checkbox id={name} checked={!!field.value} onCheckedChange={field.onChange} />
        )}
      />
      {label && <Label htmlFor={name} className="cursor-pointer">{label}</Label>}
    </div>
  )
}
