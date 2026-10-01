import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiErrorMessage, Paginated } from "@/lib/api";

export interface CrudApi<T> {
  list: (params: Record<string, any>) => Promise<Paginated<T>>;
  get: (id: string) => Promise<T>;
  create: (data: any) => Promise<T>;
  update?: (id: string, data: any) => Promise<T>;
  remove: (id: string) => Promise<T>;
}

export interface CrudListParams {
  page: number;
  limit: number;
  search?: string;
  [key: string]: any;
}

export function makeCrudHooks<T>(api: CrudApi<T>, opts: { queryKey: string; entityName: string }) {
  const { queryKey, entityName } = opts;

  function useList(params: CrudListParams | Record<string, any>) {
    return useQuery({
      queryKey: [queryKey, "list", params],
      queryFn: () => api.list(params),
      placeholderData: (prev) => prev,
    });
  }

  function useDetail(id: string | null | undefined) {
    return useQuery({
      queryKey: [queryKey, "detail", id],
      queryFn: () => api.get(id as string),
      enabled: !!id,
    });
  }

  function useInvalidate() {
    const qc = useQueryClient();
    return () => qc.invalidateQueries({ queryKey: [queryKey] });
  }

  function useCreate() {
    const invalidate = useInvalidate();
    return useMutation({
      mutationFn: (data: any) => api.create(data),
      onSuccess: () => {
        toast.success(`${entityName} created`);
        invalidate();
      },
      onError: (err) => toast.error(apiErrorMessage(err)),
    });
  }

  function useUpdate() {
    const invalidate = useInvalidate();
    return useMutation({
      mutationFn: ({ id, data }: { id: string; data: any }) => api.update!(id, data),
      onSuccess: () => {
        toast.success(`${entityName} updated`);
        invalidate();
      },
      onError: (err) => toast.error(apiErrorMessage(err)),
    });
  }

  function useDelete() {
    const invalidate = useInvalidate();
    return useMutation({
      mutationFn: (id: string) => api.remove(id),
      onSuccess: () => {
        toast.success(`${entityName} deleted`);
        invalidate();
      },
      onError: (err) => toast.error(apiErrorMessage(err)),
    });
  }

  /** Helper for custom action endpoints (convert/verify/refund/...) with toast + invalidation */
  function useAction<TRes = any>(
    fn: (id: string, body?: any) => Promise<TRes>,
    successMessage: string
  ) {
    const invalidate = useInvalidate();
    return useMutation({
      mutationFn: ({ id, body }: { id: string; body?: any }) => fn(id, body),
      onSuccess: () => {
        toast.success(successMessage);
        invalidate();
      },
      onError: (err) => toast.error(apiErrorMessage(err)),
    });
  }

  return { useList, useDetail, useCreate, useUpdate, useDelete, useAction, useInvalidate };
}
