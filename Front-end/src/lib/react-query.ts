import { QueryClient } from "@tanstack/react-query";

// You can customize cache/stale/retry policies here
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60, // 1 minute
    },
  },
});
