import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { HubDataProvider } from './context/HubDataContext.tsx';
import { SearchProvider } from './context/SearchContext.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HubDataProvider>
      <SearchProvider>
        <App />
      </SearchProvider>
    </HubDataProvider>
  </StrictMode>,
);
