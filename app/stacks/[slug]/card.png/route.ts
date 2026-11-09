import { getEveryAgent } from '@/lib/catalog';
import { renderStackCard } from '@/lib/og';
import { stackCard } from '@/lib/share-cards';
import { getStack, getStacks, stackEntries } from '@/lib/stacks';

export const dynamicParams = false;

export function generateStaticParams() {
  return getStacks().map((s) => ({ slug: s.slug }));
}

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const stack = getStack((await context.params).slug);
  if (!stack) return new Response('Not found', { status: 404 });
  return renderStackCard(stackCard(stack, stackEntries(stack, await getEveryAgent())));
}
