/**
 * @fileoverview Glassmorphic sidebar navigation component with live folders display.
 */

import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { setFolders, addFolder } from '../store/vaultSlice';
import DecryptedText from './DecryptedText';
import { encryptText } from '../services/crypto';
import api from '../services/api';

export default function Sidebar() {
  const dispatch = useDispatch();
  const { folders } = useSelector((state) => state.vault);
  const { user, masterKey } = useSelector((state) => state.auth);
  
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Fetch folders list on sidebar mount
  useEffect(() => {
    const fetchFolders = async () => {
      try {
        const response = await api.get('/folders');
        if (response.data?.success) {
          dispatch(setFolders(response.data.data));
        }
      } catch (err) {
        console.error('Failed to load folders:', err);
      }
    };
    fetchFolders();
  }, [dispatch]);

  /**
   * Close the mobile sidebar by removing the body class.
   */
  const closeSidebar = () => {
    document.body.classList.remove('sidebar-open');
  };

  /**
   * Handle local encryption and create folder backend submission.
   */
  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim() || !masterKey) return;

    try {
      const encrypted = await encryptText(newFolderName.trim(), masterKey);
      const encryptedName = JSON.stringify(encrypted);

      const response = await api.post('/folders', {
        encryptedName,
        icon: 'folder_open',
        color: '#ffc107'
      });

      if (response.data?.success) {
        dispatch(addFolder(response.data.data));
        setNewFolderName('');
        setIsCreating(false);
      }
    } catch (err) {
      console.error('Failed to create folder:', err);
    }
  };

  return (
    <>
      {/* Mobile backdrop overlay - shown when sidebar-open class on body */}
      <div
        className="sidebar-backdrop"
        onClick={closeSidebar}
      />
      <div className="bg-glass border-end border-secondary position-fixed start-0 top-0 bottom-0 py-4 px-3" style={{ width: '260px', marginTop: '70px', zIndex: 1000, overflowY: 'auto' }}>
        <div className="d-flex flex-column h-100 justify-content-between">
          <div>
            {/* Main Navigation Links */}
            <div className="nav flex-column nav-pills gap-1 mb-4">
              <NavLink onClick={closeSidebar} to="/" className={({ isActive }) => `nav-link text-white d-flex align-items-center gap-3 px-3 py-2 rounded-3 ${isActive ? 'bg-primary text-dark fw-bold' : 'hover-glass'}`} end>
                <span>📊</span> Dashboard
              </NavLink>
              <NavLink onClick={closeSidebar} to="/documents" className={({ isActive }) => `nav-link text-white d-flex align-items-center gap-3 px-3 py-2 rounded-3 ${isActive ? 'bg-primary text-dark fw-bold' : 'hover-glass'}`}>
                <span>📁</span> Documents
              </NavLink>
              <NavLink onClick={closeSidebar} to="/cards" className={({ isActive }) => `nav-link text-white d-flex align-items-center gap-3 px-3 py-2 rounded-3 ${isActive ? 'bg-primary text-dark fw-bold' : 'hover-glass'}`}>
                <span>💳</span> Cards
              </NavLink>
              <NavLink onClick={closeSidebar} to="/notes" className={({ isActive }) => `nav-link text-white d-flex align-items-center gap-3 px-3 py-2 rounded-3 ${isActive ? 'bg-primary text-dark fw-bold' : 'hover-glass'}`}>
                <span>📝</span> Notes
              </NavLink>
              <NavLink onClick={closeSidebar} to="/favorites" className={({ isActive }) => `nav-link text-white d-flex align-items-center gap-3 px-3 py-2 rounded-3 ${isActive ? 'bg-primary text-dark fw-bold' : 'hover-glass'}`}>
                <span>⭐</span> Favorites
              </NavLink>
              <NavLink onClick={closeSidebar} to="/settings" className={({ isActive }) => `nav-link text-white d-flex align-items-center gap-3 px-3 py-2 rounded-3 ${isActive ? 'bg-primary text-dark fw-bold' : 'hover-glass'}`}>
                <span>⚙️</span> Settings
              </NavLink>
              {user?.role === 'admin' && (
                <NavLink onClick={closeSidebar} to="/admin" className={({ isActive }) => `nav-link text-white d-flex align-items-center gap-3 px-3 py-2 rounded-3 ${isActive ? 'bg-primary text-dark fw-bold' : 'hover-glass'}`}>
                  <span>👑</span> Admin Panel
                </NavLink>
              )}
            </div>

            <hr className="border-secondary my-3" />

            {/* Folders List Title & Create Action */}
            <div className="d-flex align-items-center justify-content-between px-2 mb-2">
              <span className="text-light-muted text-uppercase fw-bold small" style={{ letterSpacing: '0.5px' }}>Folders</span>
              <button onClick={() => setIsCreating(!isCreating)} className="btn btn-link text-primary p-0 text-decoration-none fw-bold fs-5">
                +
              </button>
            </div>

            {/* Inline Folder Creation Form */}
            {isCreating && (
              <form onSubmit={handleCreateFolder} className="mb-3 px-2">
                <input
                  type="text"
                  className="form-control form-control-sm bg-dark border-secondary text-white mb-2"
                  placeholder="Folder name..."
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  autoFocus
                />
                <div className="d-flex gap-2">
                  <button type="submit" className="btn btn-primary btn-sm px-2 flex-grow-1">Save</button>
                  <button type="button" onClick={() => setIsCreating(false)} className="btn btn-outline-secondary btn-sm px-2">Cancel</button>
                </div>
              </form>
            )}

            {/* Dynamic Folders Navigation */}
            <div className="nav flex-column nav-pills gap-1 overflow-auto" style={{ maxHeight: '50vh' }}>
              {folders.map((folder) => (
                <NavLink
                  key={folder.id}
                  to={`/documents?folderId=${folder.id}`}
                  onClick={closeSidebar}
                  className={({ isActive }) => `nav-link text-white d-flex align-items-center gap-2 px-3 rounded-3 text-truncate ${isActive ? 'bg-glass border border-primary text-primary' : 'hover-glass'}`}
                >
                  <span>📂</span>
                  <span className="text-truncate">
                    <DecryptedText encryptedData={folder.encryptedName} fallback="Decrypted Folder" />
                  </span>
                </NavLink>
              ))}
              {folders.length === 0 && !isCreating && (
                <span className="text-muted small px-3">No custom folders.</span>
              )}
            </div>
          </div>

          {/* Footer info lock indicator */}
          <div className="p-2 bg-glass rounded-3 border border-secondary text-center">
            <small className="text-primary d-flex align-items-center justify-content-center gap-2">
              <span>🛡️</span> Zero-Knowledge Active
            </small>
          </div>
        </div>
      </div>
    </>
  );
}
