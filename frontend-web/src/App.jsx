/**
 * @fileoverview Root React Application module compiling routes, state slices, and page shells.
 */

import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import store from './store';
import { base64ToBuffer } from './services/crypto';
import { authSuccess, setMasterKey } from './store/authSlice';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Documents from './pages/Documents';
import Cards from './pages/Cards';
import Notes from './pages/Notes';
import Favorites from './pages/Favorites';
import Settings from './pages/Settings';
import AdminPanel from './pages/AdminPanel';

// Route Guards
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const initializeSession = async () => {
      const savedKeyBase64 = sessionStorage.getItem('docvault_sess_key');
      const savedUserJson = sessionStorage.getItem('docvault_user');
      const savedToken = sessionStorage.getItem('docvault_token');

      if (savedKeyBase64 && savedUserJson && savedToken) {
        try {
          const rawKeyBytes = base64ToBuffer(savedKeyBase64);
          const derivedCryptoKey = await window.crypto.subtle.importKey(
            'raw',
            rawKeyBytes,
            { name: 'AES-GCM' },
            true,
            ['encrypt', 'decrypt']
          );

          const user = JSON.parse(savedUserJson);
          store.dispatch(authSuccess({ accessToken: savedToken, user }));
          store.dispatch(setMasterKey(derivedCryptoKey));
        } catch (e) {
          console.error('Failed to restore session keys:', e);
          sessionStorage.clear();
        }
      }
      setIsInitializing(false);
    };

    initializeSession();
  }, []);

  return (
    <Provider store={store}>
      {isInitializing ? (
        <div className="min-vh-100 d-flex align-items-center justify-content-center bg-dark text-white">
          <div className="text-center">
            <div className="spinner-border text-primary mb-3" role="status"></div>
            <div>Decrypting session database in local memory...</div>
          </div>
        </div>
      ) : (
        <Router>
          <Routes>
            {/* Public Authentication Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Secure Protected Workspace Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/documents"
              element={
                <ProtectedRoute>
                  <Documents />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cards"
              element={
                <ProtectedRoute>
                  <Cards />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notes"
              element={
                <ProtectedRoute>
                  <Notes />
                </ProtectedRoute>
              }
            />
            <Route
              path="/favorites"
              element={
                <ProtectedRoute>
                  <Favorites />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminPanel />
                </ProtectedRoute>
              }
            />

            {/* Catch-all Routing */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      )}
    </Provider>
  );
}

