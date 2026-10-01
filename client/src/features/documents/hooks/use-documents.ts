import { makeCrudHooks } from "@/hooks/use-crud";
import { documentsApi } from "../services/documents.api";
import type { Document } from "../types";

const crud = makeCrudHooks<Document>(
  { ...documentsApi, create: (data: any) => documentsApi.upload(data) },
  { queryKey: "documents", entityName: "Document" }
);

export const { useList, useDetail, useCreate, useUpdate, useDelete, useAction, useInvalidate } = crud;
