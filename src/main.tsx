import '@fontsource-variable/inter';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App';
import { Providers } from './app/providers';
import './styles/globals.css';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <Providers>
      <App />
    </Providers>
  </StrictMode>,
);
