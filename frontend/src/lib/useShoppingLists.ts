import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ShoppingList, ShoppingListItemRequest, ShoppingListRequest } from '@/types';

export function shoppingListsQueryKey(householdId: string) {
  return ['households', householdId, 'shopping-lists'] as const;
}

export function useShoppingListsQuery(householdId: string | undefined) {
  return useQuery({
    queryKey: shoppingListsQueryKey(householdId ?? ''),
    queryFn: async () => {
      const { data } = await api.get<ShoppingList[]>(`/households/${householdId}/shopping-lists`);
      return data;
    },
    enabled: Boolean(householdId),
  });
}

export function useCreateShoppingListMutation(householdId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (request: ShoppingListRequest) => {
      const { data } = await api.post<ShoppingList>(`/households/${householdId}/shopping-lists`, request);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shoppingListsQueryKey(householdId ?? '') });
    },
  });
}

export function useRenameShoppingListMutation(householdId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ listId, request }: { listId: string; request: ShoppingListRequest }) => {
      const { data } = await api.put<ShoppingList>(`/households/${householdId}/shopping-lists/${listId}`, request);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shoppingListsQueryKey(householdId ?? '') });
    },
  });
}

export function useDeleteShoppingListMutation(householdId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (listId: string) => {
      await api.delete(`/households/${householdId}/shopping-lists/${listId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shoppingListsQueryKey(householdId ?? '') });
    },
  });
}

export function useAddShoppingListItemMutation(householdId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ listId, request }: { listId: string; request: ShoppingListItemRequest }) => {
      const { data } = await api.post<ShoppingList>(`/households/${householdId}/shopping-lists/${listId}/items`, request);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shoppingListsQueryKey(householdId ?? '') });
    },
  });
}

export function useUpdateShoppingListItemMutation(householdId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      listId,
      itemId,
      request,
    }: {
      listId: string;
      itemId: string;
      request: ShoppingListItemRequest;
    }) => {
      const { data } = await api.put<ShoppingList>(
        `/households/${householdId}/shopping-lists/${listId}/items/${itemId}`,
        request,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shoppingListsQueryKey(householdId ?? '') });
    },
  });
}

export function useRemoveShoppingListItemMutation(householdId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ listId, itemId }: { listId: string; itemId: string }) => {
      const { data } = await api.delete<ShoppingList>(`/households/${householdId}/shopping-lists/${listId}/items/${itemId}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shoppingListsQueryKey(householdId ?? '') });
    },
  });
}
