'use client';

import { Activity } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';

// Built out in Stage 7.
export default function ActivityPage() {
  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="mb-6 text-xl font-semibold tracking-tight">Activity</h1>
      <EmptyState icon={<Activity size={20} />} title="Activity feed coming soon" />
    </div>
  );
}
