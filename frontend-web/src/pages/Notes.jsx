/**
 * @fileoverview Notes CRUD component with client-side encryption and Rich Text styling controls.
 */

import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setItems, deleteItemSuccess, updateItemSuccess, setLoading } from '../store/vaultSlice';
import { encryptText, decryptText } from '../services/crypto';
import DecryptedText from '../components/DecryptedText';
import api from '../services/api';

export default function Notes() {
  const dispatch = useDispatch();
  const { items, isLoading } = useSelector((state) => state.vault);
  const { masterKey } = useSelector((state) => state.auth);

  // Editor states
  const [activeNote, setActiveNote] = useState(null);
  const [editorTitle, setEditorTitle] = useState('');
  const [editorBody, setEditorBody] = useState('');
  const [editorError, setEditorError] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Markdown-like rich text preview toggle
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  const fetchItems = async () => {
    try {
      dispatch(setLoading(true));
      const response = await api.get('/vault/items', {
        params: { type: 'note' }
      });
      if (response.data?.success) {
        dispatch(setItems(response.data.data));
      }
    } catch (err) {
      console.error('Failed to load items:', err);
    } finally {
      dispatch(setLoading(false));
    }
  };

  useEffect(() => {
    fetchItems();
  }, [dispatch]);

  /**
   * Helper to format notes plaintext with basic HTML styling tags.
   */
  const renderRichText = (text) => {
    if (!text) return '';
    // Bold: **text** -> <strong>text</strong>
    // Italic: *text* -> <em>text</em>
    // Code block: `code` -> <code>code</code>
    // Line breaks: \n -> <br />
    let formatted = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-dark text-warning p-1 rounded">$1</code>')
      .replace(/\n/g, '<br />');
    return { __html: formatted };
  };

  /**
   * Encrypt and submit a new note to the backend.
   */
  const handleCreateNewNote = async () => {
    try {
      if (!masterKey) return;
      
      const newTitleObj = await encryptText('Untitled Note', masterKey);
      const newBodyObj = await encryptText('', masterKey);

      const response = await api.post('/vault/notes', {
        encryptedTitle: JSON.stringify(newTitleObj),
        encryptedBody: JSON.stringify(newBodyObj)
      });

      if (response.status === 201) {
        await fetchItems();
        // Automatically open the new note for editing
        const itemsList = await api.get('/vault/items', { params: { type: 'note' } });
        if (itemsList.data?.success && itemsList.data.data.length > 0) {
          handleSelectNote(itemsList.data.data[0]);
        }
      }
    } catch (err) {
      console.error('Failed to create note:', err);
    }
  };

  /**
   * Decrypt and load selected note contents into editor panel.
   */
  const handleSelectNote = async (note) => {
    setActiveNote(note);
    setEditorError('');
    setIsEditing(true);

    try {
      const parsedTitle = JSON.parse(note.encryptedTitle);
      const decTitle = await decryptText(parsedTitle.cipherText, parsedTitle.nonce, parsedTitle.mac, masterKey);
      setEditorTitle(decTitle);

      const bodyPayload = note.encryptedPayload?.encryptedBody;
      if (bodyPayload) {
        const parsedBody = JSON.parse(bodyPayload);
        const decBody = await decryptText(parsedBody.cipherText, parsedBody.nonce, parsedBody.mac, masterKey);
        setEditorBody(decBody);
      } else {
        setEditorBody('');
      }
    } catch (err) {
      console.error('Notes decryption failed:', err);
      setEditorTitle('Decryption Error');
      setEditorBody('');
      setEditorError('Failed to decrypt note content. Verify security parameters.');
    }
  };

  /**
   * Encrypt updated fields and commit note changes to database.
   */
  const handleSaveNote = async () => {
    if (!activeNote || !masterKey) return;

    try {
      setEditorError('');

      // 1. Encrypt Title
      const encTitleObj = await encryptText(editorTitle.trim() || 'Untitled Note', masterKey);
      const encryptedTitle = JSON.stringify(encTitleObj);

      // 2. Encrypt Body
      const encBodyObj = await encryptText(editorBody, masterKey);
      const encryptedBody = JSON.stringify(encBodyObj);

      // 3. Put request
      const response = await api.put(`/vault/items/${activeNote.id}`, {
        encryptedTitle,
        encryptedPayload: {
          encryptedBody
        }
      });

      if (response.data?.success) {
        dispatch(updateItemSuccess(response.data.data));
        // Refresh active details mapping
        setActiveNote(response.data.data);
      }
    } catch (err) {
      console.error('Save failed:', err);
      setEditorError('Failed to encrypt and sync updates.');
    }
  };

  /**
   * Delete note.
   */
  const handleDeleteNote = async (itemId) => {
    if (!window.confirm('Are you sure you want to permanently delete this note?')) return;
    try {
      const response = await api.delete(`/vault/items/${itemId}`);
      if (response.data?.success) {
        dispatch(deleteItemSuccess(itemId));
        if (activeNote?.id === itemId) {
          setActiveNote(null);
          setIsEditing(false);
        }
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  /**
   * Toggle favorite.
   */
  const handleToggleFavorite = async (item) => {
    try {
      const response = await api.put(`/vault/items/${item.id}`, {
        isFavorite: !item.isFavorite
      });
      if (response.data?.success) {
        dispatch(updateItemSuccess(response.data.data));
        if (activeNote?.id === item.id) {
          setActiveNote({ ...activeNote, isFavorite: !item.isFavorite });
        }
      }
    } catch (err) {
      console.error('Favorite status update failed:', err);
    }
  };

  const filteredNotes = items.filter((item) => item.type === 'note');

  return (
    <div className="container py-3 text-white">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-0">Secure Notes</h2>
          <small className="text-light-muted">End-to-end encrypted notepad files</small>
        </div>
        <button onClick={handleCreateNewNote} className="btn btn-primary rounded-pill px-4 fw-bold">
          + New Note
        </button>
      </div>

      <div className="row g-4" style={{ height: 'calc(100vh - 180px)' }}>
        {/* Sidebar notes list */}
        <div className="col-md-4 h-100">
          <div className="card bg-glass border-secondary h-100 p-3" style={{ overflowY: 'auto' }}>
            <h5 className="fw-bold mb-3">Notes List</h5>
            {isLoading ? (
              <div className="text-center py-4 text-light-muted">Loading notes...</div>
            ) : filteredNotes.length > 0 ? (
              <div className="d-flex flex-column gap-2">
                {filteredNotes.map((note) => (
                  <button
                    key={note.id}
                    onClick={() => handleSelectNote(note)}
                    className={`btn text-start p-3 rounded-3 border transition ${activeNote?.id === note.id ? 'bg-primary text-dark border-primary' : 'bg-dark text-white border-secondary hover-glass'}`}
                  >
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span className="fw-bold text-truncate" style={{ maxWidth: '80%' }}>
                        <DecryptedText encryptedData={note.encryptedTitle} fallback="Untitled" />
                      </span>
                      <span>{note.isFavorite ? '⭐' : ''}</span>
                    </div>
                    <small className={activeNote?.id === note.id ? 'text-dark-muted' : 'text-light-muted'}>
                      {new Date(note.createdAt).toLocaleDateString()}
                    </small>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-5 text-light-muted my-auto">
                <div className="fs-1 mb-2">📝</div>
                <div>No notes created.</div>
              </div>
            )}
          </div>
        </div>

        {/* Editor panel */}
        <div className="col-md-8 h-100">
          {isEditing ? (
            <div className="card bg-glass border-secondary h-100 p-4 d-flex flex-column justify-content-between">
              <div>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div className="d-flex align-items-center gap-2 flex-grow-1 me-4">
                    <input
                      type="text"
                      className="form-control form-control-lg bg-transparent border-0 text-white fw-bold px-0 focus-none"
                      style={{ boxShadow: 'none' }}
                      value={editorTitle}
                      onChange={(e) => setEditorTitle(e.target.value)}
                    />
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <button
                      onClick={() => handleToggleFavorite(activeNote)}
                      className="btn btn-outline-light btn-sm rounded-pill px-3"
                    >
                      {activeNote?.isFavorite ? '⭐ Favorited' : '☆ Favorite'}
                    </button>
                    <button
                      onClick={() => setIsPreviewMode(!isPreviewMode)}
                      className="btn btn-outline-info btn-sm rounded-pill px-3"
                    >
                      {isPreviewMode ? '✏️ Edit' : '👁️ Preview'}
                    </button>
                    <button
                      onClick={() => handleDeleteNote(activeNote.id)}
                      className="btn btn-outline-danger btn-sm rounded-pill px-3"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>

                <hr className="border-secondary mt-0" />

                {editorError && <div className="alert alert-danger py-2 small mb-3">{editorError}</div>}

                {/* Editor Content Area */}
                <div className="flex-grow-1" style={{ minHeight: '300px' }}>
                  {isPreviewMode ? (
                    <div
                      className="p-3 bg-dark rounded-3 border border-secondary text-white overflow-auto"
                      style={{ height: '350px' }}
                      dangerouslySetInnerHTML={renderRichText(editorBody)}
                    />
                  ) : (
                    <div>
                      <div className="mb-2 text-light-muted" style={{ fontSize: '11px' }}>
                        Supports basic rich formatting rules: <code>**bold**</code>, <code>*italics*</code>, and <code>`code blocks`</code>.
                      </div>
                      <textarea
                        className="form-control bg-dark border-secondary text-white font-monospace p-3"
                        rows="14"
                        style={{ resize: 'none', height: '350px' }}
                        value={editorBody}
                        onChange={(e) => setEditorBody(e.target.value)}
                        placeholder="Write encrypted thoughts here..."
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top border-secondary">
                <small className="text-light-muted">
                  Last updated: {new Date(activeNote?.updatedAt || activeNote?.createdAt).toLocaleString()}
                </small>
                <button onClick={handleSaveNote} className="btn btn-primary rounded-pill px-4 fw-bold">
                  💾 Save Changes
                </button>
              </div>
            </div>
          ) : (
            <div className="card bg-glass border-secondary h-100 d-flex align-items-center justify-content-center text-light-muted">
              <div className="text-center">
                <div className="fs-1 mb-2">👈</div>
                <h5>Select a Note to Edit</h5>
                <p className="small">Or create a new encrypted note document.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
