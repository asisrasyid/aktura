import type { PlaceholderDef } from '../types';

const getToken = () => localStorage.getItem('token');
const BASE = '/api/ai';

function authHeaders(): HeadersInit {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export const aiService = {
  /** SSE stream — yields text chunks one by one */
  async *streamGenerateDraft(
    prompt: string,
    jenisAkta: string,
    signal?: AbortSignal,
  ): AsyncGenerator<string> {
    const res = await fetch(`${BASE}/generate-draft`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ prompt, jenisAkta }),
      signal,
    });
    if (!res.ok) throw new Error(`AI generate-draft gagal: ${res.status}`);

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buf = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') return;
        try {
          const parsed = JSON.parse(data) as { text: string };
          if (parsed.text) yield parsed.text;
        } catch { /* skip malformed */ }
      }
    }
  },

  async suggestPlaceholders(content: string, jenisAkta: string): Promise<PlaceholderDef[]> {
    const res = await fetch(`${BASE}/suggest-placeholders`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ content, jenisAkta }),
    });
    if (!res.ok) throw new Error(`AI suggest-placeholders gagal: ${res.status}`);
    return res.json() as Promise<PlaceholderDef[]>;
  },

  async improveBlock(blockText: string, instruction: string): Promise<string> {
    const res = await fetch(`${BASE}/improve-block`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ blockText, instruction }),
    });
    if (!res.ok) throw new Error(`AI improve-block gagal: ${res.status}`);
    const data = await res.json() as { text: string };
    return data.text;
  },
};
