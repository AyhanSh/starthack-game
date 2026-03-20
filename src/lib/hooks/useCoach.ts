import type { CoachContext, CoachTrigger } from '../../engine/coach-prompts';

export interface CoachMessage {
  id: string;
  trigger: CoachTrigger;
  text: string;
  isStreaming: boolean;
  timestamp: number;
}

export interface CoachState {
  currentMessage: CoachMessage | null;
  messageHistory: CoachMessage[];
  isLoading: boolean;
}

interface UseCoachReturn {
  getState: () => Readonly<CoachState>;
  subscribe: (listener: (state: Readonly<CoachState>) => void) => () => void;
  triggerCoach: (context: CoachContext) => void;
  dismiss: () => void;
  destroy: () => void;
}

const COOLDOWN_MS = 8000;

export function useCoach(): UseCoachReturn {
  const listeners = new Set<(state: Readonly<CoachState>) => void>();
  let state: CoachState = {
    currentMessage: null,
    messageHistory: [],
    isLoading: false,
  };
  let abortController: AbortController | null = null;
  let dismissTimer: ReturnType<typeof setTimeout> | null = null;
  let lastTriggerAt = 0;
  let isDestroyed = false;

  const emit = (): void => {
    for (const listener of listeners) listener(state);
  };

  const setState = (partial: Partial<CoachState>): void => {
    state = { ...state, ...partial };
    emit();
  };

  const dismiss = (): void => {
    setState({ currentMessage: null });
    if (dismissTimer) {
      clearTimeout(dismissTimer);
      dismissTimer = null;
    }
  };

  const triggerCoach = (context: CoachContext): void => {
    if (isDestroyed) return;

    const now = Date.now();
    if (context.trigger !== 'game_end' && now - lastTriggerAt < COOLDOWN_MS) return;
    lastTriggerAt = now;

    if (abortController) abortController.abort();
    if (dismissTimer) {
      clearTimeout(dismissTimer);
      dismissTimer = null;
    }

    abortController = new AbortController();

    const messageId = crypto.randomUUID();
    const initial: CoachMessage = {
      id: messageId,
      trigger: context.trigger,
      text: '',
      isStreaming: true,
      timestamp: Date.now(),
    };
    setState({ currentMessage: initial, isLoading: true });

    fetch('/api/coach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(context),
      signal: abortController.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Coach request failed: ${response.status}`);
        if (!response.body) throw new Error('Coach stream missing response body');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const data = JSON.parse(line.slice(6));
              if (!data.text) continue;
              fullText += data.text;
              setState({
                currentMessage:
                  state.currentMessage?.id === messageId
                    ? { ...state.currentMessage, text: fullText }
                    : state.currentMessage,
              });
            } catch {
              // Skip malformed SSE lines.
            }
          }
        }

        const finalMessage: CoachMessage = {
          id: messageId,
          trigger: context.trigger,
          text: fullText,
          isStreaming: false,
          timestamp: Date.now(),
        };

        setState({
          currentMessage: finalMessage,
          messageHistory: [...state.messageHistory, finalMessage],
          isLoading: false,
        });

        const dismissDelay = context.trigger === 'game_end' ? 30000 : 12000;
        dismissTimer = setTimeout(() => {
          if (state.currentMessage?.id === messageId) {
            setState({ currentMessage: null });
          }
        }, dismissDelay);
      })
      .catch((error: unknown) => {
        if ((error as { name?: string }).name === 'AbortError') return;
        console.error('[Coach] request failed:', error);
        setState({ isLoading: false, currentMessage: null });
      });
  };

  const subscribe = (listener: (nextState: Readonly<CoachState>) => void): (() => void) => {
    listeners.add(listener);
    listener(state);
    return () => {
      listeners.delete(listener);
    };
  };

  const destroy = (): void => {
    isDestroyed = true;
    if (abortController) abortController.abort();
    if (dismissTimer) clearTimeout(dismissTimer);
    listeners.clear();
  };

  return {
    getState: () => state,
    subscribe,
    triggerCoach,
    dismiss,
    destroy,
  };
}
