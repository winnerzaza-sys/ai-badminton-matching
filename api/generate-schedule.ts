import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import {
  AI_MODEL,
  MAX_GENERATION_TOKENS,
} from '../src/ai/config.js';
import { SCHEDULE_SYSTEM_PROMPT } from '../src/ai/prompts.js';
import { AI_SCHEDULE_JSON_SCHEMA } from '../src/ai/schema.js';

const MAX_PROMPT_LENGTH = 100_000;

function errorStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null || !('status' in error)) return undefined;
  return typeof error.status === 'number' ? error.status : undefined;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('GEMINI_API_KEY is not configured');
      return Response.json(
        { error: 'บริการ AI ยังไม่ได้รับการตั้งค่า' },
        { status: 500 },
      );
    }

    const body = await request.json() as { prompt?: unknown };
    if (typeof body.prompt !== 'string' || !body.prompt.trim()) {
      return Response.json({ error: 'กรุณาระบุข้อมูลสำหรับจัดตาราง' }, { status: 400 });
    }
    if (body.prompt.length > MAX_PROMPT_LENGTH) {
      return Response.json({ error: 'ข้อมูลสำหรับจัดตารางมีขนาดใหญ่เกินไป' }, { status: 413 });
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL?.trim() || AI_MODEL,
      contents: body.prompt,
      config: {
        systemInstruction: SCHEDULE_SYSTEM_PROMPT,
        responseMimeType: 'application/json',
        responseJsonSchema: JSON.parse(AI_SCHEDULE_JSON_SCHEMA),
        maxOutputTokens: MAX_GENERATION_TOKENS,
        thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
      },
    });

    if (!response.text) {
      return Response.json({ error: 'AI ไม่ได้ส่งตารางกลับมา' }, { status: 502 });
    }

    try {
      JSON.parse(response.text);
    } catch {
      console.error('Gemini returned incomplete schedule JSON', {
        finishReason: response.candidates?.[0]?.finishReason,
      });
      return Response.json({ error: 'AI ส่งตารางมาไม่ครบ กรุณาลองอีกครั้ง' }, { status: 502 });
    }

    return Response.json({ content: response.text });
  } catch (error) {
    if (errorStatus(error) === 429) {
      console.warn('Gemini rate limit reached');
      return Response.json(
        { error: 'ใช้งาน AI ถี่เกินไป ระบบจะจัดตารางด้วยอัลกอริทึมในเครื่องแทน' },
        { status: 429, headers: { 'Retry-After': '60' } },
      );
    }
    console.error('Gemini schedule generation failed', error);
    return Response.json({ error: 'ไม่สามารถสร้างตารางด้วย AI ได้' }, { status: 500 });
  }
}
