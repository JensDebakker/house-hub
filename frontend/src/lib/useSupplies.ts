import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Supply, SupplyRequest } from '@/types';

export function suppliesQueryKey(householdId: string) {
  return ['households', householdId, 'supplies'] as const;
}

export function useSuppliesQuery(householdId: string | undefined) {
  return useQuery({
    queryKey: suppliesQueryKey(householdId ?? ''),
    queryFn: async () => {
      const { data } = await api.get<Supply[]>(`/households/${householdId}/supplies`);
      return data;
    },
    enabled: Boolean(householdId),
  });
}

export function useCreateSupplyMutation(householdId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (request: SupplyRequest) => {
      const { data } = await api.post<Supply>(`/households/${householdId}/supplies`, request);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: suppliesQueryKey(householdId ?? '') });
    },
  });
}

export function useUpdateSupplyMutation(householdId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, request }: { id: string; request: SupplyRequest }) => {
      const { data } = await api.put<Supply>(`/households/${householdId}/supplies/${id}`, request);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: suppliesQueryKey(householdId ?? '') });
    },
  });
}

export function useDeleteSupplyMutation(householdId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/households/${householdId}/supplies/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: suppliesQueryKey(householdId ?? '') });
    },
  });
}
