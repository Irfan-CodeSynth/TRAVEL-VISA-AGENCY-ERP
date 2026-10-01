import { makeCrudHooks } from "@/hooks/use-crud";
import { packagesApi } from "../services/packages.api";
import type { TravelPackage } from "../types";

const crud = makeCrudHooks<TravelPackage>(packagesApi, { queryKey: "packages", entityName: "Package" });

export const { useList, useDetail, useCreate, useUpdate, useDelete } = crud;
