import { Suspense, useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import { LoadingSkeleton } from '@/components/feedback/LoadingSkeleton';
import { createRouter } from './router';

export default function App() {
  const [router] = useState(createRouter);
  return (
    <Suspense fallback={<div className="p-6"><LoadingSkeleton variant="page" /></div>}>
      <RouterProvider router={router} />
    </Suspense>
  );
}
