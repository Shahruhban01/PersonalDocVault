/**
 * @fileoverview Login page containing validation and in-memory WebCrypto key derivation.
 */

import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { authStart, authSuccess, authFailure, setMasterKey } from '../store/authSlice';
import { deriveKey, bufferToBase64 } from '../services/crypto';
import api from '../services/api';

export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isLoading, error } = useSelector((state) => state.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState('');

  /**
   * Handle form submissions, fetch salt, authenticate, and derive local keys.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');

    if (!email.trim() || !password.trim()) {
      setValidationError('Both email and passphrase are required.');
      return;
    }

    try {
      dispatch(authStart());

      // Hash passphrase to 64-character hex string
      const encoder = new TextEncoder();
      const passData = encoder.encode(password.trim());
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', passData);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const passwordHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

      // Send login verification to backend
      const response = await api.post('/auth/login', {
        email: email.trim(),
        password: passwordHex
      });

      if (response.data?.success) {
        const { accessToken, user, encryptionSalt } = response.data.data;

        // Perform local zero-knowledge PBKDF2 Master Key derivation using user's salt
        if (!encryptionSalt) {
          throw new Error('Authentication salt parameter missing from account response.');
        }

        const derivedCryptoKey = await deriveKey(password.trim(), encryptionSalt);

        // Export key to raw bytes and save to sessionStorage for page reload recovery
        const rawKey = await window.crypto.subtle.exportKey('raw', derivedCryptoKey);
        const rawKeyBase64 = bufferToBase64(rawKey);
        
        sessionStorage.setItem('docvault_sess_key', rawKeyBase64);
        sessionStorage.setItem('docvault_user', JSON.stringify(user));
        sessionStorage.setItem('docvault_token', accessToken);

        // Save session credentials
        dispatch(authSuccess({ accessToken, user }));
        dispatch(setMasterKey(derivedCryptoKey));

        // Route to home/dashboard
        navigate('/');
      }
    } catch (err) {
      console.error('Login error:', err);
      const errMsg = err.response?.data?.error?.message || 'Invalid email or passphrase. Access Denied.';
      dispatch(authFailure(errMsg));
    }
  };

  return (
    <div className="container min-vh-100 d-flex align-items-center justify-content-center py-5">
      <div className="card bg-glass text-white border-0 shadow-lg p-4 rounded-4" style={{ width: '100%', maxWidth: '480px' }}>
        <div className="card-body text-center">
          <div className="fs-1 mb-2">🛡️</div>
          <h2 className="fw-bold mb-1">Personal Vault</h2>
          <p className="text-light-muted mb-4 small">Unlock and decrypt your secure documents</p>

          <form onSubmit={handleSubmit}>
            <div className="mb-3 text-start">
              <label className="form-label text-light-muted small">Email Address</label>
              <input
                type="email"
                className="form-control bg-dark border-secondary text-white rounded-pill px-3 py-2"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <div className="mb-4 text-start">
              <label className="form-label text-light-muted small">Passphrase</label>
              <input
                type="password"
                className="form-control bg-dark border-secondary text-white rounded-pill px-3 py-2"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {/* Error Indicators */}
            {(validationError || error) && (
              <div className="alert alert-danger py-2 rounded-pill small mb-4">
                {validationError || error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary w-100 py-2.5 rounded-pill fw-bold"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              ) : null}
              Decrypt & Access
            </button>
          </form>

          <div className="mt-4 pt-2 border-top border-secondary text-center">
            <span className="text-light-muted small">Don't have a vault account? </span>
            <Link to="/register" className="text-primary small fw-bold text-decoration-none">
              Create one now
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
