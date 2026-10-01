import { useQuery } from "@tanstack/react-query";
import { makeCrudHooks } from "@/hooks/use-crud";
import { applicationsApi } from "../services/applications.api";
import type { Application } from "../types";

const crud = makeCrudHooks<Application>(applicationsApi as any, {
  queryKey: "applications",
  entityName: "Application",
});

export const { useList, useDetail, useCreate, useUpdate, useDelete, useInvalidate } = crud;

export function useChangeStatus() {
  return crud.useAction((id, body) => applicationsApi.changeStatus(id, body), "Status updated");
}

export function useTransitions(id: string | null | undefined) {
  return useQuery({
    queryKey: ["applications", "transitions", id],
    queryFn: () => applicationsApi.transitions(id as string),
    enabled: !!id,
  });
}

export function useTimeline(id: string | null | undefined) {
  return useQuery({
    queryKey: ["applications", "timeline", id],
    queryFn: () => applicationsApi.timeline(id as string),
    enabled: !!id,
  });
}

export function useApplicationStats(params?: Record<string, any>) {
  return useQuery({
    queryKey: ["applications", "stats", params ?? {}],
    queryFn: () => applicationsApi.stats(params),
  });
}
