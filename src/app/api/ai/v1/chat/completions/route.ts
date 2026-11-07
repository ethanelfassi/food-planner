import { NextRequest } from 'next/server';
import { handleChatCompletions, handleOptions } from '@/lib/gemini-proxy';

export async function POST(request: NextRequest) {
  return handleChatCompletions(request);
}

export async function OPTIONS() {
  return handleOptions();
}
