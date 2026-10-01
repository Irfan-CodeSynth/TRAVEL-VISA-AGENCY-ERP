import { makeCrudHooks } from "@/hooks/use-crud";
import { agentsApi } from "../services/agents.api";
import type { Agent } from "../types";

const crud = makeCrudHooks<Agent>(agentsApi, { queryKey: "agents", entityName: "Agent" });

export const { useList, useDetail, useCreate, useUpdate, useDelete } = crud;
