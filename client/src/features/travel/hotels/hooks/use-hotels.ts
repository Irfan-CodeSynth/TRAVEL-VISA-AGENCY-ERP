import { makeCrudHooks } from "@/hooks/use-crud";
import { hotelsApi } from "../services/hotels.api";
import type { Hotel } from "../types";

const crud = makeCrudHooks<Hotel>(hotelsApi, { queryKey: "hotels", entityName: "Hotel" });

export const { useList, useDetail, useCreate, useUpdate, useDelete } = crud;
