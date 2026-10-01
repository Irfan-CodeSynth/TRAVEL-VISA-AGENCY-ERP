import { makeCrudHooks } from "@/hooks/use-crud";
import { suppliersApi } from "../services/suppliers.api";
import type { Supplier } from "../types";

const crud = makeCrudHooks<Supplier>(suppliersApi, { queryKey: "suppliers", entityName: "Supplier" });

export const { useList, useDetail, useCreate, useUpdate, useDelete } = crud;
