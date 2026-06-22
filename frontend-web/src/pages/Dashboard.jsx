/**
 * @fileoverview Main Dashboard view showing quick statistics, hardware shield flags, and recent additions.
 */

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { setItems, setLoading } from '../store/vaultSlice';
import DecryptedText from '../components/DecryptedText';
import api from '../services/api';

export default function Dashboard() {
  const dispatch = useDispatch();
  const { items, isLoading } = useSelector((state) => state.vault);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        dispatch(setLoading(true));
        const response = await api.get('/vault/items');
        if (response.data?.success) {
          dispatch(setItems(response.data.data));
        }
      } catch (err) {
        console.error('Failed to load items:', err);
      } finally {
        dispatch(setLoading(false));
      }
    };
    fetchItems();
  }, [dispatch]);

  // Aggregate counts
  const totalCount = items.length;
  const docsCount = items.filter((i) => i.type === 'document').length;
  const cardsCount = items.filter((i) => i.type === 'card').length;
  const notesCount = items.filter((i) => i.type === 'note').length;
  const favoritesCount = items.filter((i) => i.isFavorite).length;

  const recentItems = [...items].slice(0, 5);

  return (
    <div className="container py-3">
      {/* Premium Glassmorphic Header Banner */}
      <div className="p-5 mb-4 bg-glass rounded-4 text-white shadow border border-secondary position-relative overflow-hidden">
        <div className="position-absolute top-0 end-0 p-4 fs-1 opacity-25">🛡️</div>
        <h1 className="display-5 fw-bold text-primary">Your Private Digital Safe</h1>
        <p className="col-md-8 fs-6 text-light-muted">
          All documents, card credentials, and notes are encrypted client-side. Your master key is derived locally and never sent to the network.
        </p>
        <div className="d-flex flex-wrap gap-2 mt-4">
          <Link to="/documents" className="btn btn-primary btn-md px-4 rounded-pill fw-bold">Upload File</Link>
          <Link to="/cards" className="btn btn-outline-light btn-md px-4 rounded-pill fw-bold">Add Card</Link>
          <Link to="/notes" className="btn btn-outline-light btn-md px-4 rounded-pill fw-bold">New Note</Link>
        </div>
      </div>

      {/* Grid: Statistics widgets */}
      <div className="row g-4 mb-5">
        <div className="col-md-3">
          <div className="card h-100 bg-glass border-secondary shadow-sm">
            <div className="card-body d-flex align-items-center gap-3">
              <div className="fs-1">📂</div>
              <div>
                <h6 className="card-subtitle text-light-muted mb-1 text-uppercase small" style={{ fontSize: '10px' }}>Documents</h6>
                <h3 className="card-title fw-bold text-white mb-0">{docsCount}</h3>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card h-100 bg-glass border-secondary shadow-sm">
            <div className="card-body d-flex align-items-center gap-3">
              <div className="fs-1">💳</div>
              <div>
                <h6 className="card-subtitle text-light-muted mb-1 text-uppercase small" style={{ fontSize: '10px' }}>Cards</h6>
                <h3 className="card-title fw-bold text-white mb-0">{cardsCount}</h3>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card h-100 bg-glass border-secondary shadow-sm">
            <div className="card-body d-flex align-items-center gap-3">
              <div className="fs-1">📝</div>
              <div>
                <h6 className="card-subtitle text-light-muted mb-1 text-uppercase small" style={{ fontSize: '10px' }}>Notes</h6>
                <h3 className="card-title fw-bold text-white mb-0">{notesCount}</h3>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card h-100 bg-glass border-secondary shadow-sm">
            <div className="card-body d-flex align-items-center gap-3">
              <div className="fs-1 text-warning">⭐</div>
              <div>
                <h6 className="card-subtitle text-light-muted mb-1 text-uppercase small" style={{ fontSize: '10px' }}>Favorites</h6>
                <h3 className="card-title fw-bold text-white mb-0">{favoritesCount}</h3>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row: Recent Additions list */}
      <div className="row g-4">
        <div className="col-lg-8">
          <div className="card bg-glass border-secondary h-100 p-3">
            <div className="card-header bg-transparent border-0 d-flex justify-content-between align-items-center pb-2">
              <h5 className="fw-bold mb-0 text-white">Recent Additions</h5>
              <span className="badge bg-secondary rounded-pill">{totalCount} total items</span>
            </div>
            <div className="card-body">
              {isLoading ? (
                <div className="text-center py-4 text-light-muted">Loading items...</div>
              ) : recentItems.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-dark table-hover table-borderless align-middle mb-0">
                    <thead>
                      <tr className="text-light-muted small" style={{ fontSize: '11px', textTransform: 'uppercase' }}>
                        <th>Title</th>
                        <th>Type</th>
                        <th>Date Created</th>
                        <th className="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentItems.map((item) => (
                        <tr key={item.id}>
                          <td className="fw-bold text-white">
                            <DecryptedText encryptedData={item.encryptedTitle} fallback="Decrypted Item" />
                          </td>
                          <td>
                            <span className={`badge ${item.type === 'document' ? 'bg-info text-dark' : item.type === 'card' ? 'bg-purple' : 'bg-orange'} text-capitalize`}>
                              {item.type}
                            </span>
                          </td>
                          <td className="text-light-muted small">
                            {new Date(item.createdAt).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </td>
                          <td className="text-end">
                            <Link
                              to={item.type === 'document' ? '/documents' : item.type === 'card' ? '/cards' : '/notes'}
                              className="btn btn-outline-primary btn-sm rounded-pill px-3"
                            >
                              Open
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-5 text-light-muted">
                  <div className="fs-1 mb-2">📁</div>
                  <div>Your vault is currently empty.</div>
                  <small>Add documents, card credentials, or notes to get started.</small>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card bg-glass border-secondary h-100 p-3">
            <div className="card-header bg-transparent border-0 pb-2">
              <h5 className="fw-bold mb-0 text-white">Security Checklist</h5>
            </div>
            <div className="card-body d-flex flex-column gap-3 mt-2">
              <div className="d-flex align-items-start gap-3 p-2 bg-dark rounded-3 border border-secondary">
                <span className="fs-3 text-success">✔️</span>
                <div>
                  <h6 className="fw-bold text-white mb-0 small">Hardware Cryptography Active</h6>
                  <p className="text-light-muted small mb-0" style={{ fontSize: '11px' }}>
                    Local key derivation is securely generated in Sandbox CPU cycles.
                  </p>
                </div>
              </div>
              <div className="d-flex align-items-start gap-3 p-2 bg-dark rounded-3 border border-secondary">
                <span className="fs-3 text-success">✔️</span>
                <div>
                  <h6 className="fw-bold text-white mb-0 small">R2 Private Isolation</h6>
                  <p className="text-light-muted small mb-0" style={{ fontSize: '11px' }}>
                    Binary files are stored behind isolated presigned token locks.
                  </p>
                </div>
              </div>
              <div className="d-flex align-items-start gap-3 p-2 bg-dark rounded-3 border border-secondary">
                <span className="fs-3 text-info">ℹ️</span>
                <div>
                  <h6 className="fw-bold text-white mb-0 small">Passphrase Backups</h6>
                  <p className="text-light-muted small mb-0" style={{ fontSize: '11px' }}>
                    We do not hold key resets. Write down your passphrase somewhere safe.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
