import { makeCrudHooks } from "@/hooks/use-crud";
import { communicationsApi } from "../services/communications.api";
import type { Communication } from "../types";

const crud = makeCrudHooks<Communication>(communicationsApi, {
  queryKey: "communications",
  entityName: "Communication",
});

export const { useList, useDetail, useCreate, useUpdate, useDelete, useAction, useInvalidate } = crud;
