import { useEffect } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MoneyField,
  SelectField,
  SwitchField,
  TextAreaField,
  TextField,
} from "@/components/shared/form-fields";
import { cleanPayload } from "@/lib/api";
import { ROOM_TYPE_OPTIONS } from "../../shared/constants";
import type { Hotel } from "../types";

const formSchema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  city: z.string().trim().optional(),
  country: z.string().trim().optional(),
  address: z.string().trim().optional(),
  starRating: z.union([z.coerce.number().int().min(1).max(7), z.literal("")]).optional(),
  roomType: z.string().optional(),
  ratePerNight: z.union([z.coerce.number().min(0), z.literal("")]).optional(),
  currencyCode: z.string().optional(),
  roomsAvailable: z.union([z.coerce.number().int().min(0), z.literal("")]).optional(),
  contactPhone: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  isActive: z.boolean().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface HotelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hotel: Hotel | null;
  onSubmit: (data: any) => void;
  isSubmitting: boolean;
}

export function HotelDialog({ open, onOpenChange, hotel, onSubmit, isSubmitting }: HotelDialogProps) {
  const methods = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", isActive: true },
  });

  useEffect(() => {
    if (!open) return;
    methods.reset(
      hotel
        ? {
            name: hotel.name,
            city: hotel.city ?? "",
            country: hotel.country ?? "",
            address: hotel.address ?? "",
            starRating: hotel.starRating ?? "",
            roomType: hotel.roomType ?? "",
            ratePerNight: hotel.ratePerNight != null ? Number(hotel.ratePerNight) : "",
            currencyCode: hotel.currencyCode ?? "",
            roomsAvailable: hotel.roomsAvailable ?? "",
            contactPhone: hotel.contactPhone ?? "",
            notes: hotel.notes ?? "",
            isActive: hotel.isActive,
          }
        : { name: "", city: "", country: "", address: "", starRating: "", roomType: "", ratePerNight: "", currencyCode: "USD", roomsAvailable: "", contactPhone: "", notes: "", isActive: true }
    );
  }, [open, hotel, methods]);

  const submit = methods.handleSubmit((values) => onSubmit(cleanPayload(values)));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{hotel ? `Edit ${hotel.name}` : "New Hotel"}</DialogTitle>
          <DialogDescription>Hotel inventory, room rates and availability.</DialogDescription>
        </DialogHeader>
        <FormProvider {...methods}>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField name="name" label="Hotel name" required />
              <TextField name="contactPhone" label="Contact phone" placeholder="+971 4 123 4567" />
              <TextField name="city" label="City" />
              <TextField name="country" label="Country" />
              <TextField name="starRating" label="Star rating" type="number" placeholder="1-7" />
              <SelectField name="roomType" label="Room type" options={ROOM_TYPE_OPTIONS} />
              <MoneyField name="ratePerNight" label="Rate per night" />
              <TextField name="roomsAvailable" label="Rooms available" type="number" />
              <SwitchField name="isActive" label="Active" />
              <TextField name="address" label="Address" className="sm:col-span-2" />
              <TextAreaField name="notes" label="Notes" className="sm:col-span-2" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {hotel ? "Save changes" : "Create hotel"}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
