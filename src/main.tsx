import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';

// Purge automatique unique des anciens caches locaux (PC / Zebra) pour garantir 100 % source de vérité Supabase
const DB_STORAGE_VERSION = '2026-11-26-v2-db-only';
try {
  if (typeof window !== 'undefined' && window.localStorage.getItem('gt25_storage_version') !== DB_STORAGE_VERSION) {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.localStorage.setItem('gt25_storage_version', DB_STORAGE_VERSION);
  }
} catch {
  // Ignore si le stockage navigateur est restreint
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
