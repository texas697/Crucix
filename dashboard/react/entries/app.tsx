import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppProviders } from '../app/AppProviders';
import { AppRouter } from '../app/AppRouter';
import { safeStorage } from '../app/AppProviders/utils';
import { applyTheme, readStoredTheme, resolveTheme } from '../shared/theme';

const container = typeof document !== 'undefined' ? document.getElementById('root') : null;

if (container) {
  applyTheme(resolveTheme(readStoredTheme(safeStorage())), document.documentElement);
  createRoot(container).render(
    <StrictMode>
      <AppProviders>
        <AppRouter />
      </AppProviders>
    </StrictMode>,
  );
}
