export interface DocChatItem {
  role: 'user' | 'assistant';
  content: string;
}

export interface DocChatRequest {
  message: string;
  history: DocChatItem[];
  currentDocument: string;
  documentType: string;
  isGenerating: boolean;
}

export interface ModifySelectionRequest {
  selectedText: string;
  instruction: string;
  fullDocument: string;
}

export type SseChunkType = 'chat' | 'document' | 'selection';

export interface SseChunk {
  text: string;
  type: SseChunkType;
}

function getToken(): string {
  return localStorage.getItem('token') ?? '';
}

async function* streamSse(
  url: string,
  body: object,
  signal?: AbortSignal,
): AsyncGenerator<SseChunk> {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok || !res.body) throw new Error('Stream request failed');

  const reader  = res.body.getReader();
  const decoder = new TextDecoder();
  let   buffer  = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const raw = line.slice(6).trim();
      if (raw === '[DONE]') return;
      try {
        const parsed = JSON.parse(raw) as SseChunk;
        if (parsed.text) yield parsed;
      } catch { /* skip malformed */ }
    }
  }
}

export const aiDocGeneratorService = {
  streamChat(req: DocChatRequest, signal?: AbortSignal) {
    return streamSse('/api/ai-doc-generator/chat', req, signal);
  },
  streamModifySelection(req: ModifySelectionRequest, signal?: AbortSignal) {
    return streamSse('/api/ai-doc-generator/modify-selection', req, signal);
  },
};
