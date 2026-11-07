import { handleGetModels, handleOptions } from '@/lib/gemini-proxy';

export async function GET() {
  return handleGetModels();
}

export async function OPTIONS() {
  return handleOptions();
}
