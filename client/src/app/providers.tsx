import type { ReactElement, ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Created once, outside the component, so it is not rebuilt on every render.
const queryClient = new QueryClient();

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps): ReactElement {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
