/**
 * @fileoverview Register page implementing client-side salt generation and validation.
 */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function Register() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  /**
   * Generates a cryptographically random salt and registers account credentials.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email.trim() || !password.trim()) {
      setError('Email and passphrase are required.');
      return;
    }

    if (password.length < 8) {
      setError('Passphrase must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passphrases do not match.');
      return;
    }

    try {
      setIsLoading(true);

      // Generate a secure random 16-byte (128-bit) salt hex string
      const saltBytes = window.crypto.getRandomValues(new Uint8Array(16));
      const saltHex = Array.from(saltBytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      // Hash passphrase to 64-character hex string
      const encoder = new TextEncoder();
      const passData = encoder.encode(password.trim());
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', passData);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const passwordHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

      const response = await api.post('/auth/register', {
        email: email.trim(),
        password: passwordHex,
        encryptionSalt: saltHex
      });

      if (response.data?.success) {
        setSuccess('Vault created successfully! Redirecting to unlock screen...');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    } catch (err) {
      console.error('Registration error:', err);
      const errMsg = err.response?.data?.error?.message || 'Failed to create account. Email may already be registered.';
      setError(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container min-vh-100 d-flex align-items-center justify-content-center py-5">
      <div className="card bg-glass text-white border-0 shadow-lg p-4 rounded-4" style={{ width: '100%', maxWidth: '480px' }}>
        <div className="card-body text-center">
          <div className="fs-1 mb-2">🔑</div>
          <h2 className="fw-bold mb-1">Create Account</h2>
          <p className="text-light-muted mb-4 small">Set up your client-side encrypted vault container</p>

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
            
            <div className="mb-3 text-start">
              <label className="form-label text-light-muted small">Passphrase</label>
              <input
                type="password"
                className="form-control bg-dark border-secondary text-white rounded-pill px-3 py-2"
                placeholder="Minimum 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="mb-4 text-start">
              <label className="form-label text-light-muted small">Confirm Passphrase</label>
              <input
                type="password"
                className="form-control bg-dark border-secondary text-white rounded-pill px-3 py-2"
                placeholder="Re-enter passphrase"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            {/* Status indicators */}
            {error && <div className="alert alert-danger py-2 rounded-pill small mb-4">{error}</div>}
            {success && <div className="alert alert-success py-2 rounded-pill small mb-4">{success}</div>}

            <button
              type="submit"
              className="btn btn-primary w-100 py-2.5 rounded-pill fw-bold"
              disabled={isLoading || success}
            >
              {isLoading ? (
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              ) : null}
              Initialize Vault
            </button>
          </form>

          <div className="mt-4 pt-2 border-top border-secondary text-center">
            <span className="text-light-muted small">Already have a vault? </span>
            <Link to="/login" className="text-primary small fw-bold text-decoration-none">
              Unlock here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
