import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AI_MODEL, MAX_GENERATION_TOKENS } from './config';

const generateContent = vi.hoisted(() => vi.fn());

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = { generateContent };
  },
  ThinkingLevel: { MINIMAL: 'MINIMAL' },
}));

describe('Gemini Vercel Function', () => {
  beforeEach(() => {
    generateContent.mockReset();
    vi.stubEnv('GEMINI_API_KEY', 'test-key');
    vi.stubEnv('GEMINI_MODEL', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('keeps the API key server-side and requests structured JSON', async () => {
    generateContent.mockResolvedValue({ text: '{"rounds":[]}' });
    const { POST } = await import('../../api/generate-schedule');

    const response = await POST(new Request('http://localhost/api/generate-schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'Create a schedule' }),
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ content: '{"rounds":[]}' });
    expect(generateContent).toHaveBeenCalledWith(expect.objectContaining({
      model: AI_MODEL,
      contents: 'Create a schedule',
      config: expect.objectContaining({
        responseMimeType: 'application/json',
        responseJsonSchema: expect.any(Object),
        maxOutputTokens: MAX_GENERATION_TOKENS,
        thinkingConfig: { thinkingLevel: 'MINIMAL' },
      }),
    }));
  });

  it('rejects a truncated Gemini response before it reaches the browser', async () => {
    generateContent.mockResolvedValue({
      text: '{"rounds":[',
      candidates: [{ finishReason: 'MAX_TOKENS' }],
    });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { POST } = await import('../../api/generate-schedule');

    const response = await POST(new Request('http://localhost/api/generate-schedule', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'Create a schedule' }),
    }));

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: 'AI ส่งตารางมาไม่ครบ กรุณาลองอีกครั้ง',
    });
  });

  it('rejects requests when the server secret is missing', async () => {
    vi.stubEnv('GEMINI_API_KEY', '');
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { POST } = await import('../../api/generate-schedule');

    const response = await POST(new Request('http://localhost/api/generate-schedule', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'Create a schedule' }),
    }));

    expect(response.status).toBe(500);
    expect(generateContent).not.toHaveBeenCalled();
  });

  it('rejects an empty prompt before calling Gemini', async () => {
    const { POST } = await import('../../api/generate-schedule');
    const response = await POST(new Request('http://localhost/api/generate-schedule', {
      method: 'POST',
      body: JSON.stringify({}),
    }));

    expect(response.status).toBe(400);
    expect(generateContent).not.toHaveBeenCalled();
  });

  it('returns a retryable status when Gemini reaches its rate limit', async () => {
    generateContent.mockRejectedValue({ status: 429 });
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { POST } = await import('../../api/generate-schedule');

    const response = await POST(new Request('http://localhost/api/generate-schedule', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'Create a schedule' }),
    }));

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('60');
  });
});
