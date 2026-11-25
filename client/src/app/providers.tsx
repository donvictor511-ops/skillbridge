import type { ReactElement, ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "./ThemeProvider";

// Created once, outside the component, so it is not rebuilt on every render.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Keep the current screen's data visible during a connection drop and
      // refresh it when the browser comes back online.
      refetchOnReconnect: true,
    },
  },
});

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps): ReactElement {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>{children}</ThemeProvider>
    </QueryClientProvider>
  );
}
