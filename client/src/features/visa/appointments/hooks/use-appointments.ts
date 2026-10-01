import { useQuery } from "@tanstack/react-query";
import { makeCrudHooks } from "@/hooks/use-crud";
import { appointmentsApi } from "../services/appointments.api";
import type { Appointment } from "../types";

const crud = makeCrudHooks<Appointment>(appointmentsApi, {
  queryKey: "appointments",
  entityName: "Appointment",
});

export const { useList, useDetail, useCreate, useUpdate, useDelete } = crud;

export function useChangeStatus() {
  return crud.useAction((id, body) => appointmentsApi.changeStatus(id, body), "Appointment status updated");
}

export function useUpcoming(days = 7, enabled = true) {
  return useQuery({
    queryKey: ["appointments", "upcoming", days],
    queryFn: () => appointmentsApi.upcoming(days),
    enabled,
  });
}
