import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Task, TaskRequest } from '@/types';

export function tasksQueryKey(householdId: string) {
  return ['households', householdId, 'tasks'] as const;
}

export function useTasksQuery(householdId: string | undefined) {
  return useQuery({
    queryKey: tasksQueryKey(householdId ?? ''),
    queryFn: async () => {
      const { data } = await api.get<Task[]>(`/households/${householdId}/tasks`);
      return data;
    },
    enabled: Boolean(householdId),
  });
}

export function useCreateTaskMutation(householdId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (request: TaskRequest) => {
      const { data } = await api.post<Task>(`/households/${householdId}/tasks`, request);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tasksQueryKey(householdId ?? '') });
    },
  });
}

export function useUpdateTaskMutation(householdId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, request }: { id: string; request: TaskRequest }) => {
      const { data } = await api.put<Task>(`/households/${householdId}/tasks/${id}`, request);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tasksQueryKey(householdId ?? '') });
    },
  });
}

export function useDeleteTaskMutation(householdId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/households/${householdId}/tasks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tasksQueryKey(householdId ?? '') });
    },
  });
}
