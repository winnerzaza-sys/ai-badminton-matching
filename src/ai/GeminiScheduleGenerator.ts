import type { Schedule, ScheduleInput } from '../types';
import { buildGenerationPrompt } from './prompts';
import { parseAISchedule } from './schema';
import type { AIScheduleGenerator } from './types';

interface GeminiAPIResponse {
  content?: string;
  error?: string;
}

export class GeminiScheduleGenerator implements AIScheduleGenerator {
  private connectionProgressCallback: (progress: number) => void = () => undefined;
  private readonly request: typeof fetch;

  constructor(request?: typeof fetch) {
    // Browser fetch requires Window/globalThis as its receiver. Calling a stored
    // unbound reference as this.request(...) throws "Illegal invocation".
    this.request = request ?? globalThis.fetch.bind(globalThis);
  }

  setConnectionProgressCallback(callback: (progress: number) => void): void {
    this.connectionProgressCallback = callback;
  }

  async load(): Promise<void> {
    // Gemini runs in a Vercel Function, so there is no browser model to download.
    this.connectionProgressCallback(1);
  }

  async generate(input: ScheduleInput): Promise<Schedule> {
    return this.complete(buildGenerationPrompt(input));
  }

  private async complete(prompt: string): Promise<Schedule> {
    const response = await this.request('/api/generate-schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });

    let result: GeminiAPIResponse;
    try {
      result = await response.json() as GeminiAPIResponse;
    } catch {
      throw new Error('บริการ AI ส่งคำตอบที่ไม่ถูกต้อง');
    }

    if (!response.ok || !result.content) {
      throw new Error(result.error ?? 'ไม่สามารถเชื่อมต่อบริการ AI ได้');
    }

    return parseAISchedule(result.content);
  }
}
