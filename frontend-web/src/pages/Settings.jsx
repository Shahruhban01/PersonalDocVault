/**
 * @fileoverview Settings panel for configuring security profile preferences and metadata.
 */

import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { clearVaultData } from '../store/vaultSlice';

export default function Settings() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  
  const [successMsg, setSuccessMsg] = useState('');

  /**
   * Clears state boxes.
   */
  const handleClearCache = () => {
    dispatch(clearVaultData());
    setSuccessMsg('Local cached vault records have been purged from memory.');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  return (
    <div className="container py-3 text-white">
      <div className="mb-4">
        <h2 className="fw-bold mb-0">System Settings</h2>
        <small className="text-light-muted">Manage your encryption profile and vault parameters</small>
      </div>

      <div className="row g-4">
        {/* Profile Card */}
        <div className="col-md-6">
          <div className="card bg-glass border-secondary p-3 h-100">
            <h5 className="fw-bold mb-3">User Profile</h5>
            <div className="mb-3">
              <label className="form-label text-light-muted small d-block">Email Address</label>
              <span className="fw-bold fs-5">{user?.email}</span>
            </div>
            <div className="mb-3">
              <label className="form-label text-light-muted small d-block">Authorized Role</label>
              <span className="badge bg-primary text-dark fw-bold text-uppercase">{user?.role || 'user'}</span>
            </div>
            <div className="mb-3">
              <label className="form-label text-light-muted small d-block">Account Status</label>
              <span className="text-success fw-bold">Active</span>
            </div>
          </div>
        </div>

        {/* Cryptographic metadata card */}
        <div className="col-md-6">
          <div className="card bg-glass border-secondary p-3 h-100">
            <h5 className="fw-bold mb-3">Cryptographic Engine Status</h5>
            <table className="table table-dark table-borderless align-middle mb-0 small">
              <tbody>
                <tr>
                  <td className="text-light-muted">Encryption Standard</td>
                  <td className="text-end fw-bold text-primary">AES-GCM (256-bit)</td>
                </tr>
                <tr>
                  <td className="text-light-muted">Key Derivation Algorithm</td>
                  <td className="text-end fw-bold text-primary">PBKDF2-HMAC-SHA256</td>
                </tr>
                <tr>
                  <td className="text-light-muted">Iteration Count</td>
                  <td className="text-end fw-bold text-primary">100,000 Iterations</td>
                </tr>
                <tr>
                  <td className="text-light-muted">Key Storage Mode</td>
                  <td className="text-end fw-bold text-success">Ephemeral (In-Memory Only)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Cache controls */}
        <div className="col-md-6">
          <div className="card bg-glass border-secondary p-3">
            <h5 className="fw-bold mb-3">Local Cache Management</h5>
            <p className="small text-light-muted">
              Purges local cache boxes. This forces a clean synchronisation with the secure database next time you visit your categories.
            </p>
            {successMsg && <div className="alert alert-success py-2 small">{successMsg}</div>}
            <button onClick={handleClearCache} className="btn btn-outline-warning rounded-pill px-4 fw-bold">
              Purge Cache Boxes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
