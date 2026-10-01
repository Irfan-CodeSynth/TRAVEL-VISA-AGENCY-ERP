import { RouterProvider } from 'react-router-dom';
import { queryClient } from './services/query-client';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './hooks/use-theme';
import { Toaster } from 'sonner';
import { router } from './router';
import {
  CommandPaletteContext,
  useCommandPaletteState,
} from './hooks/use-command-palette';

function AppProviders({ children }: { children: React.ReactNode }) {
  const commandPaletteState = useCommandPaletteState();

  return (
    <CommandPaletteContext.Provider value={commandPaletteState}>
      {children}
    </CommandPaletteContext.Provider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="app-theme">
        <AppProviders>
          <RouterProvider router={router} />
        </AppProviders>
        <Toaster position="top-right" richColors closeButton />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
