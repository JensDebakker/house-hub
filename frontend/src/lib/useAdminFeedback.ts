import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { AdminFeedbackTicket, FeedbackStatus } from '@/types';

export function adminFeedbackQueryKey() {
  return ['admin', 'feedback'] as const;
}

export function adminFeedbackDetailQueryKey(ticketId: string) {
  return ['admin', 'feedback', ticketId] as const;
}

export function useAdminFeedbackListQuery(isAdmin: boolean) {
  return useQuery({
    queryKey: adminFeedbackQueryKey(),
    queryFn: async () => {
      const { data } = await api.get<AdminFeedbackTicket[]>('/admin/feedback');
      return data;
    },
    enabled: isAdmin,
  });
}

export function useAdminFeedbackQuery(isAdmin: boolean, ticketId: string | undefined) {
  return useQuery({
    queryKey: adminFeedbackDetailQueryKey(ticketId ?? ''),
    queryFn: async () => {
      const { data } = await api.get<AdminFeedbackTicket>(`/admin/feedback/${ticketId}`);
      return data;
    },
    enabled: isAdmin && Boolean(ticketId),
  });
}

export function useUpdateAdminFeedbackStatusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ ticketId, status }: { ticketId: string; status: FeedbackStatus }) => {
      const { data } = await api.patch<AdminFeedbackTicket>(`/admin/feedback/${ticketId}`, { status });
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: adminFeedbackQueryKey() });
      queryClient.setQueryData(adminFeedbackDetailQueryKey(data.id), data);
    },
  });
}
