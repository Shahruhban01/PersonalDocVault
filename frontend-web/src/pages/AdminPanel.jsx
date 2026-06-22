/**
 * @fileoverview Admin dashboard panel rendering user lists, logs, and statistics.
 */

import React, { useState, useEffect } from 'react';
import api from '../services/api';

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [metrics, setMetrics] = useState(null);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch initial data based on active tab
  useEffect(() => {
    setErrorMsg('');
    if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'logs') {
      fetchAuditLogs();
    } else if (activeTab === 'metrics') {
      fetchMetrics();
    }
  }, [activeTab]);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/admin/users');
      if (response.data?.success) {
        setUsers(response.data.data.docs);
      }
    } catch (err) {
      setErrorMsg('Failed to load user directories.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/admin/logs');
      if (response.data?.success) {
        setLogs(response.data.data.logs);
      }
    } catch (err) {
      setErrorMsg('Failed to load audit logs.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMetrics = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/admin/statistics');
      if (response.data?.success) {
        setMetrics(response.data.data.metrics);
      }
    } catch (err) {
      setErrorMsg('Failed to load system metrics.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Action trigger modifying status values of accounts.
   */
  const handleToggleUserStatus = async (user) => {
    const newStatus = user.status === 'suspended' ? 'active' : 'suspended';
    if (!window.confirm(`Are you sure you want to change this user status to ${newStatus}?`)) return;

    try {
      const response = await api.put(`/admin/users/${user.id}/status`, {
        status: newStatus
      });
      if (response.data?.success) {
        // Optimistic state update
        setUsers(users.map((u) => (u.id === user.id ? { ...u, status: newStatus } : u)));
      }
    } catch (err) {
      alert('Failed to update status: ' + (err.response?.data?.error?.message || err.message));
    }
  };

  return (
    <div className="container py-3 text-white">
      <div className="mb-4">
        <h2 className="fw-bold mb-0">Admin Management Portal</h2>
        <small className="text-light-muted">System statistics, user states, and security logs auditing</small>
      </div>

      {/* Tabs Menu */}
      <ul className="nav nav-tabs border-secondary mb-4 gap-2">
        <li className="nav-item">
          <button
            onClick={() => setActiveTab('users')}
            className={`nav-link text-white fw-bold px-4 py-2 border-0 rounded-pill transition ${activeTab === 'users' ? 'bg-primary text-dark' : 'hover-glass'}`}
          >
            👥 User Management
          </button>
        </li>
        <li className="nav-item">
          <button
            onClick={() => setActiveTab('logs')}
            className={`nav-link text-white fw-bold px-4 py-2 border-0 rounded-pill transition ${activeTab === 'logs' ? 'bg-primary text-dark' : 'hover-glass'}`}
          >
            📋 Audit Logs
          </button>
        </li>
        <li className="nav-item">
          <button
            onClick={() => setActiveTab('metrics')}
            className={`nav-link text-white fw-bold px-4 py-2 border-0 rounded-pill transition ${activeTab === 'metrics' ? 'bg-primary text-dark' : 'hover-glass'}`}
          >
            📊 System Metrics
          </button>
        </li>
      </ul>

      {errorMsg && <div className="alert alert-danger py-2 mb-4">{errorMsg}</div>}

      {/* Tab Contents */}
      <div className="card bg-glass border-secondary p-3">
        {isLoading ? (
          <div className="text-center py-5 text-light-muted">Loading data...</div>
        ) : (
          <div>
            {/* Tab: Users */}
            {activeTab === 'users' && (
              <div className="table-responsive">
                <table className="table table-dark table-hover align-middle mb-0">
                  <thead>
                    <tr className="text-light-muted small" style={{ fontSize: '11px', textTransform: 'uppercase' }}>
                      <th>User ID</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Joined Date</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td className="font-monospace text-muted small">{u.id}</td>
                        <td className="fw-bold">{u.email}</td>
                        <td>
                          <span className={`badge ${u.role === 'admin' ? 'bg-danger' : 'bg-secondary'} text-uppercase`}>
                            {u.role}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${u.status === 'active' ? 'bg-success' : 'bg-warning text-dark'} text-uppercase`}>
                            {u.status}
                          </span>
                        </td>
                        <td className="text-light-muted small">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                        <td className="text-end">
                          <button
                            onClick={() => handleToggleUserStatus(u)}
                            className={`btn btn-sm rounded-pill px-3 fw-bold ${u.status === 'suspended' ? 'btn-outline-success' : 'btn-outline-warning'}`}
                          >
                            {u.status === 'suspended' ? '🔑 Activate' : '🚫 Suspend'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tab: Logs */}
            {activeTab === 'logs' && (
              <div className="table-responsive">
                <table className="table table-dark table-hover align-middle mb-0 small">
                  <thead>
                    <tr className="text-light-muted" style={{ fontSize: '11px', textTransform: 'uppercase' }}>
                      <th>Timestamp</th>
                      <th>Action</th>
                      <th>IP Address</th>
                      <th>Details</th>
                      <th>User Agent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((l) => (
                      <tr key={l.id}>
                        <td className="text-light-muted">
                          {new Date(l.timestamp).toLocaleString()}
                        </td>
                        <td className="fw-bold text-primary">{l.action}</td>
                        <td className="font-monospace text-muted">{l.ipAddress}</td>
                        <td className="text-white">{l.details || 'None'}</td>
                        <td className="text-muted text-truncate" style={{ maxWidth: '180px' }} title={l.userAgent}>
                          {l.userAgent}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tab: Metrics */}
            {activeTab === 'metrics' && metrics && (
              <div>
                <h5 className="fw-bold mb-3 text-primary">Global Registry Statistics</h5>
                <div className="row g-4">
                  {/* Account counts */}
                  <div className="col-md-6">
                    <div className="bg-dark p-3 rounded-3 border border-secondary">
                      <h6 className="text-light-muted text-uppercase small mb-3">User Distribution</h6>
                      <div className="d-flex justify-content-between mb-2">
                        <span>Total Registered Users:</span>
                        <strong className="text-white">{metrics.usersCount.total}</strong>
                      </div>
                      <div className="d-flex justify-content-between mb-2 text-success">
                        <span>Active Accounts:</span>
                        <strong>{metrics.usersCount.active}</strong>
                      </div>
                      <div className="d-flex justify-content-between text-warning">
                        <span>Suspended Accounts:</span>
                        <strong>{metrics.usersCount.suspended}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Document stats */}
                  <div className="col-md-6">
                    <div className="bg-dark p-3 rounded-3 border border-secondary">
                      <h6 className="text-light-muted text-uppercase small mb-3">Vault Record Distribution</h6>
                      <div className="d-flex justify-content-between mb-2">
                        <span>Identity Documents:</span>
                        <strong className="text-white">{metrics.vaultItemCount.documents}</strong>
                      </div>
                      <div className="d-flex justify-content-between mb-2">
                        <span>Credit Cards:</span>
                        <strong className="text-white">{metrics.vaultItemCount.cards}</strong>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span>Secure Notes:</span>
                        <strong className="text-white">{metrics.vaultItemCount.notes}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
