/**
 * @fileoverview Glassmorphic navigation header component.
 */

import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { logout } from '../store/authSlice';
import { setSearchQuery, clearVaultData } from '../store/vaultSlice';
import api from '../services/api';

export default function Navbar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { searchQuery } = useSelector((state) => state.vault);

  /**
   * Cleans up local session keys and notifies backend logout.
   */
  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // Proceed with local logout even if server request fails
    } finally {
      sessionStorage.clear();
      dispatch(logout());
      dispatch(clearVaultData());
      navigate('/login');
    }
  };

  return (
    <nav className="navbar navbar-dark bg-glass border-bottom border-secondary fixed-top px-4" style={{ height: '70px', zIndex: 1030 }}>
      <div className="container-fluid d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-center">
          <button
            className="btn btn-link text-white d-lg-none p-0 me-3 fs-3 text-decoration-none"
            onClick={() => document.body.classList.toggle('sidebar-open')}
          >
            ☰
          </button>
          <Link className="navbar-brand d-flex align-items-center gap-2 fw-bold text-primary" to="/" style={{ letterSpacing: '0.5px' }}>
            <span className="fs-4">🛡️</span>
            <span className="d-none d-sm-inline">PERSONAL VAULT</span>
          </Link>
        </div>

        {/* Global Search Bar */}
        <div className="d-flex flex-grow-1 mx-4" style={{ maxWidth: '450px' }}>
          <div className="input-group">
            <span className="input-group-text bg-dark border-secondary text-muted">🔍</span>
            <input
              type="text"
              className="form-control bg-dark border-secondary text-white"
              placeholder="Search documents, notes, cards..."
              value={searchQuery}
              onChange={(e) => dispatch(setSearchQuery(e.target.value))}
            />
          </div>
        </div>

        {/* User Details & Action */}
        <div className="d-flex align-items-center gap-3">
          <div className="text-end d-none d-md-block">
            <div className="fw-bold text-white small">{user?.email}</div>
            <div className="text-muted small" style={{ fontSize: '10px', textTransform: 'uppercase' }}>
              {user?.role || 'user'} Mode
            </div>
          </div>
          <button onClick={handleLogout} className="btn btn-outline-danger btn-sm rounded-pill px-3">
            Lock Vault
          </button>
        </div>
      </div>
    </nav>
  );
}
