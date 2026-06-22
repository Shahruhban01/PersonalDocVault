/**
 * @fileoverview ProtectedRoute component securing authenticated routes and checking master key presence.
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

/**
 * Route guard requiring active session and derived key.
 * @param {object} props - Component properties.
 * @param {React.ReactNode} props.children - Guarded layout.
 */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, masterKey } = useSelector((state) => state.auth);

  if (!isAuthenticated || !masterKey) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="app-container min-vh-100 d-flex flex-column bg-dark text-white">
      <Navbar />
      <div className="d-flex flex-grow-1">
        <Sidebar />
        <main className="flex-grow-1 p-4" style={{ marginLeft: '260px', marginTop: '70px' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
