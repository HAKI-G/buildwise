import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './index.css';

// ✅ Suppress extension-related message channel errors
window.addEventListener('error', (event) => {
  if (event.message?.includes('A listener indicated an asynchronous response by returning true')) {
    event.preventDefault();
    return true;
  }
});

// ✅ Suppress unhandled promise rejections from extensions
window.addEventListener('unhandledrejection', (event) => {
  const message = event.reason?.message || String(event.reason || '');
  if (message.includes('message channel closed') || message.includes('A listener indicated an asynchronous response')) {
    event.preventDefault();
    return true;
  }
});

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);