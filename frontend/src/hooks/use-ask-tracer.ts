'use client';

import { useCallback, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';

export interface Citation {
  identifier: string;
  issueId: string;
  projectId: string;
  title: string;
}

/** One turn in the Ask Tracer conversation. */
export interface AskMessage {
  id: string;
  question: string;
  /** working = thinking; retrying = paused on a provider rate limit (auto-resuming). */
  status: 'working' | 'retrying' | 'completed' | 'failed';
  answer?: string;
  citations?: Citation[];
  error?: string;
}

interface AskJobStatus {
  status: 'working' | 'retrying' | 'completed' | 'failed';
  result?: { answer: string; citations: Citation[] };
  error?: string;
}

/** Whether the assistant is configured on the server (hides the panel if not). */
export function useAiEnabled(orgId: string | undefined) {
  return useQuery({
    queryKey: ['ai-enabled', orgId],
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
    queryFn: () => api.get<{ enabled: boolean }>(`/orgs/${orgId}/ai`),
  });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const POLL_MS = 1200;
const MAX_POLLS = 150; // ~3 min ceiling (covers auto-resume after a rate limit)

/**
 * Drives the ask -> poll -> answer flow. Questions run on a server queue, so we
 * submit, get a job id, and poll until it completes. A `retrying` status means
 * the provider rate-limited us and the queue is auto-resuming — surfaced to the
 * user, but no action is required from them.
 */
export function useAskTracer(orgId: string | undefined) {
  const [messages, setMessages] = useState<AskMessage[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const counter = useRef(0);

  const patch = useCallback((id: string, next: Partial<AskMessage>) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...next } : m)));
  }, []);

  const ask = useCallback(
    async (question: string) => {
      if (!orgId || isBusy) return;
      const id = `m${counter.current++}`;
      setMessages((prev) => [...prev, { id, question, status: 'working' }]);
      setIsBusy(true);
      try {
        const { jobId } = await api.post<{ jobId: string }>(`/orgs/${orgId}/ai/ask`, { question });
        for (let i = 0; i < MAX_POLLS; i++) {
          await sleep(POLL_MS);
          const s = await api.get<AskJobStatus>(`/orgs/${orgId}/ai/ask/${jobId}`);
          if (s.status === 'completed') {
            patch(id, { status: 'completed', answer: s.result?.answer, citations: s.result?.citations });
            return;
          }
          if (s.status === 'failed') {
            patch(id, { status: 'failed', error: s.error ?? 'Something went wrong.' });
            return;
          }
          patch(id, { status: s.status }); // working | retrying
        }
        patch(id, { status: 'failed', error: 'Timed out waiting for an answer.' });
      } catch (err) {
        const message =
          err instanceof ApiError ? err.message : 'Could not reach the assistant.';
        patch(id, { status: 'failed', error: message });
      } finally {
        setIsBusy(false);
      }
    },
    [orgId, isBusy, patch],
  );

  const reset = useCallback(() => setMessages([]), []);

  return { messages, ask, isBusy, reset };
}
