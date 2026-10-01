import { makeCrudHooks } from "@/hooks/use-crud";
import { expensesApi } from "../services/expenses.api";
import type { Expense } from "../types";

const crud = makeCrudHooks<Expense>(expensesApi, { queryKey: "expenses", entityName: "Expense" });

export const { useList, useDetail, useCreate, useUpdate, useDelete, useAction, useInvalidate } = crud;
