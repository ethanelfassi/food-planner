import { NextRequest } from 'next/server';
import { handleGetModels, handleOptions } from '@/lib/gemini-proxy';

export async function GET(request: NextRequest) {
  return handleGetModels(request);
}

export async function OPTIONS() {
  return handleOptions();
}
