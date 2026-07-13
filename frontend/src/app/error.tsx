'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="mb-2 text-sm font-medium text-danger">Something went wrong</p>
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">An unexpected error occurred</h1>
      <p className="mb-6 max-w-md text-sm text-muted">
        The page hit an error. You can try again, or head back to your dashboard.
      </p>
      <div className="flex gap-2">
        <Button onClick={reset}>Try again</Button>
        <Button variant="secondary" onClick={() => (window.location.href = '/app')}>
          Go to dashboard
        </Button>
      </div>
    </div>
  );
}
