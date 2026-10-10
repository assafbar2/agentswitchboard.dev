import { Building2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import type { Agent } from '@/lib/types';

/** "Official" marker for first-party listings from a major vendor. */
export function OfficialBadge({ agent }: { agent: Pick<Agent, 'official' | 'officialVendor'> }) {
  if (!agent.official) return null;
  const vendor = agent.officialVendor?.name;
  return (
    <span title={vendor ? `Official: published by ${vendor}` : 'Official vendor listing'}>
      <Badge variant="blue">
        <Building2 className="w-3 h-3" aria-hidden />
        Official
      </Badge>
    </span>
  );
}
