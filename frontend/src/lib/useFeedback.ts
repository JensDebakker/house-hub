import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { DocumentPickerAsset } from 'expo-document-picker';
import { Platform } from 'react-native';
import { api } from '@/lib/api';
import type { FeedbackTicket, FeedbackType } from '@/types';

// Feedback is per-user, not household-scoped like most other resources - the query key is
// keyed on the submitting user's id rather than a household id, so each user's cache entry
// is independent and a login as a different user never serves stale data left behind by
// whoever was signed in before.
export function feedbackQueryKey(userId: string) {
  return ['feedback', userId] as const;
}

export function feedbackDetailQueryKey(userId: string, ticketId: string) {
  return ['feedback', userId, ticketId] as const;
}

export function useFeedbackListQuery(userId: string | undefined) {
  return useQuery({
    queryKey: feedbackQueryKey(userId ?? ''),
    queryFn: async () => {
      const { data } = await api.get<FeedbackTicket[]>('/feedback');
      return data;
    },
    enabled: Boolean(userId),
  });
}

export function useFeedbackQuery(userId: string | undefined, ticketId: string | undefined) {
  return useQuery({
    queryKey: feedbackDetailQueryKey(userId ?? '', ticketId ?? ''),
    queryFn: async () => {
      const { data } = await api.get<FeedbackTicket>(`/feedback/${ticketId}`);
      return data;
    },
    enabled: Boolean(userId) && Boolean(ticketId),
  });
}

/** Max attachments per ticket - enforced by the backend (400 above this), mirrored client-side. */
export const MAX_FEEDBACK_ATTACHMENTS = 5;

// Same per-platform FormData construction as the profile-picture upload in settings.tsx
// (web needs a real Blob; native accepts the {uri,name,type} shape). Shared by the create
// call and the add-attachments call so both send the `files` field identically.
async function appendImageFiles(formData: FormData, files: DocumentPickerAsset[]) {
  if (Platform.OS === 'web') {
    const blobs = await Promise.all(files.map((asset) => fetch(asset.uri).then((r) => r.blob())));
    blobs.forEach((blob, i) => formData.append('files', blob, files[i].name));
  } else {
    for (const asset of files) {
      formData.append('files', { uri: asset.uri, name: asset.name, type: asset.mimeType ?? 'image/jpeg' } as unknown as Blob);
    }
  }
}

export type CreateFeedbackRequest = {
  type: FeedbackType;
  description: string;
  /** Up to 5 image attachments, straight from expo-document-picker. */
  files: DocumentPickerAsset[];
};

export function useCreateFeedbackMutation(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (request: CreateFeedbackRequest) => {
      const formData = new FormData();
      formData.append('type', request.type);
      formData.append('description', request.description);
      await appendImageFiles(formData, request.files);
      const { data } = await api.post<FeedbackTicket>('/feedback', formData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: feedbackQueryKey(userId ?? '') });
    },
  });
}

export type UpdateFeedbackRequest = {
  type?: FeedbackType;
  description?: string;
};

/**
 * Every edit endpoint returns the full updated ticket, so write it straight into both the
 * list and the detail cache entries rather than re-fetching - the list row reflects the
 * change immediately without another round-trip.
 */
function useSyncTicketIntoCache(userId: string | undefined) {
  const queryClient = useQueryClient();
  return (ticket: FeedbackTicket) => {
    const key = userId ?? '';
    queryClient.setQueryData<FeedbackTicket[]>(feedbackQueryKey(key), (prev) =>
      prev?.map((t) => (t.id === ticket.id ? ticket : t)),
    );
    queryClient.setQueryData(feedbackDetailQueryKey(key, ticket.id), ticket);
  };
}

/** PATCH /feedback/{id} - only allowed while the ticket is OPEN (backend answers 409 otherwise). */
export function useUpdateFeedbackMutation(userId: string | undefined) {
  const syncTicket = useSyncTicketIntoCache(userId);
  return useMutation({
    mutationFn: async ({ ticketId, ...body }: UpdateFeedbackRequest & { ticketId: string }) => {
      const { data } = await api.patch<FeedbackTicket>(`/feedback/${ticketId}`, body);
      return data;
    },
    onSuccess: syncTicket,
  });
}

/** POST /feedback/{id}/attachments - multipart `files`; at most 5 attachments per ticket in total. */
export function useAddFeedbackAttachmentsMutation(userId: string | undefined) {
  const syncTicket = useSyncTicketIntoCache(userId);
  return useMutation({
    mutationFn: async ({ ticketId, files }: { ticketId: string; files: DocumentPickerAsset[] }) => {
      const formData = new FormData();
      await appendImageFiles(formData, files);
      const { data } = await api.post<FeedbackTicket>(`/feedback/${ticketId}/attachments`, formData);
      return data;
    },
    onSuccess: syncTicket,
  });
}

/** DELETE /feedback/{id}/attachments/{attachmentId} - returns the updated ticket. */
export function useDeleteFeedbackAttachmentMutation(userId: string | undefined) {
  const syncTicket = useSyncTicketIntoCache(userId);
  return useMutation({
    mutationFn: async ({ ticketId, attachmentId }: { ticketId: string; attachmentId: string }) => {
      const { data } = await api.delete<FeedbackTicket>(`/feedback/${ticketId}/attachments/${attachmentId}`);
      return data;
    },
    onSuccess: syncTicket,
  });
}
