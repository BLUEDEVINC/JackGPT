import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { App } from './pages/App';
import { SharedConversationPage } from './pages/SharedConversationPage';
import './styles/tailwind.css';

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const routes = (
  <BrowserRouter>
    <Routes>
      <Route path="/shared/:token" element={<SharedConversationPage />} />
      <Route path="*" element={<App />} />
    </Routes>
  </BrowserRouter>
);

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {googleClientId ? <GoogleOAuthProvider clientId={googleClientId}>{routes}</GoogleOAuthProvider> : routes}
  </React.StrictMode>
);
