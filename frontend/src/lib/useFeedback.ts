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
      // Same per-platform FormData construction as the profile-picture upload in
      // settings.tsx (web needs a real Blob; native accepts the {uri,name,type} shape).
      if (Platform.OS === 'web') {
        const blobs = await Promise.all(request.files.map((asset) => fetch(asset.uri).then((r) => r.blob())));
        blobs.forEach((blob, i) => formData.append('files', blob, request.files[i].name));
      } else {
        for (const asset of request.files) {
          formData.append('files', { uri: asset.uri, name: asset.name, type: asset.mimeType ?? 'image/jpeg' } as unknown as Blob);
        }
      }
      const { data } = await api.post<FeedbackTicket>('/feedback', formData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: feedbackQueryKey(userId ?? '') });
    },
  });
}
