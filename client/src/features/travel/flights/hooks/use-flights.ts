import { makeCrudHooks } from "@/hooks/use-crud";
import { flightsApi } from "../services/flights.api";
import type { Flight } from "../types";

const crud = makeCrudHooks<Flight>(flightsApi, { queryKey: "flights", entityName: "Flight" });

export const { useList, useDetail, useCreate, useUpdate, useDelete } = crud;
