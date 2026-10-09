import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CalendarEvent, CalendarEventRequest } from '@/types';

export function calendarEventsQueryKey(householdId: string) {
  return ['households', householdId, 'calendar-events'] as const;
}

export function useCalendarEventsQuery(householdId: string | undefined) {
  return useQuery({
    queryKey: calendarEventsQueryKey(householdId ?? ''),
    queryFn: async () => {
      const { data } = await api.get<CalendarEvent[]>(`/households/${householdId}/calendar-events`);
      return data;
    },
    enabled: Boolean(householdId),
  });
}

export function useCreateCalendarEventMutation(householdId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (request: CalendarEventRequest) => {
      const { data } = await api.post<CalendarEvent>(`/households/${householdId}/calendar-events`, request);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: calendarEventsQueryKey(householdId ?? '') });
    },
  });
}

export function useUpdateCalendarEventMutation(householdId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, request }: { id: string; request: CalendarEventRequest }) => {
      const { data } = await api.put<CalendarEvent>(`/households/${householdId}/calendar-events/${id}`, request);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: calendarEventsQueryKey(householdId ?? '') });
    },
  });
}

export function useDeleteCalendarEventMutation(householdId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/households/${householdId}/calendar-events/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: calendarEventsQueryKey(householdId ?? '') });
    },
  });
}
