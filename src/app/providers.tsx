import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { ErrorBoundary } from '@/components/feedback/ErrorBoundary';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { retryPolicy } from '@/hooks/useReport';

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false, // a atualização é periódica e controlada (VITE_REFRESH_*)
        retry: retryPolicy,
      },
      mutations: { retry: false },
    },
  });
}

export function Providers({ children, client }: { children: ReactNode; client?: QueryClient }) {
  const [queryClient] = useState(() => client ?? createQueryClient());
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
