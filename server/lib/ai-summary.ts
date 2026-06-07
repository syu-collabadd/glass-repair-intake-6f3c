import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function generateLeadSummary(
  suburb: string | null | undefined,
  postcode: string | null | undefined,
  messageHistory: string
): Promise<string | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  try {
    const location = [suburb, postcode].filter(Boolean).join(' ') || 'unknown location';
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 80,
      messages: [
        {
          role: 'user',
          content: `Write one short sentence (max 20 words) summarising a glass repair lead for an operator.
Location: ${location}
Customer messages: ${messageHistory}
Only describe the damage type and location. No preamble.`,
        },
      ],
    });

    const block = response.content[0];
    if (block.type === 'text') {
      return block.text.trim();
    }
    return null;
  } catch {
    return null;
  }
}
