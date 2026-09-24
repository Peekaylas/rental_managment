import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import App from './App';
import { AuthProvider } from './context/AuthContext';
import './assets/css/global.css';
import './assets/css/auth.css';
import './assets/css/modules.css';

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              fontFamily: 'var(--font-sans)',
              fontSize: 'var(--font-size-sm)',
            },
            success: { iconTheme: { primary: 'var(--color-success)', secondary: '#fff' } },
            error:   { iconTheme: { primary: 'var(--color-danger)',  secondary: '#fff' } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
