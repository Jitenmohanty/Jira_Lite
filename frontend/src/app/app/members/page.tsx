'use client';

import { Users } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';

// Built out in Stage 7.
export default function MembersPage() {
  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="mb-6 text-xl font-semibold tracking-tight">Members</h1>
      <EmptyState icon={<Users size={20} />} title="Members & settings coming soon" />
    </div>
  );
}
