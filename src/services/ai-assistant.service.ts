export interface ChatHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

export interface BroadcastItem {
  id: string;
  judul: string;
  konten: string;
  tipe: string;
  createdAt: string;
}

const getToken = () => localStorage.getItem('token');

export const aiAssistantService = {
  async *streamChat(
    message: string,
    history: ChatHistoryItem[],
    signal?: AbortSignal,
  ): AsyncGenerator<string> {
    const token = getToken();
    const res = await fetch('/api/ai-assistant/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ message, history }),
      signal,
    });

    if (!res.ok || !res.body) return;

    const reader  = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer    = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') return;
        try {
          const parsed = JSON.parse(data) as { text: string };
          if (parsed.text) yield parsed.text;
        } catch { /* skip malformed lines */ }
      }
    }
  },

  async getBroadcasts(): Promise<BroadcastItem[]> {
    const token = getToken();
    const res = await fetch('/api/ai-assistant/broadcasts', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return [];
    return res.json() as Promise<BroadcastItem[]>;
  },
};
