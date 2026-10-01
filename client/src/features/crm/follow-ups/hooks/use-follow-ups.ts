import { useQuery } from "@tanstack/react-query";
import { makeCrudHooks } from "@/hooks/use-crud";
import { followUpsApi } from "../services/follow-ups.api";
import type { FollowUp } from "../types";

const crud = makeCrudHooks<FollowUp>(followUpsApi, { queryKey: "follow-ups", entityName: "Follow-up" });

export const { useList, useDetail, useCreate, useUpdate, useDelete } = crud;

export function useCompleteFollowUp() {
  return crud.useAction((id) => followUpsApi.complete(id), "Follow-up completed");
}

export function useUpcomingFollowUps(days: number) {
  return useQuery({
    queryKey: ["follow-ups", "upcoming", days],
    queryFn: () => followUpsApi.upcoming(days),
  });
}

export function useOverdueFollowUps() {
  return useQuery({
    queryKey: ["follow-ups", "overdue"],
    queryFn: () => followUpsApi.overdue(),
  });
}
