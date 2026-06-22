/**
 * @fileoverview Document management view implementing local encryption, uploads, and local decryption.
 */

import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { setItems, deleteItemSuccess, updateItemSuccess, setLoading } from '../store/vaultSlice';
import { encryptText, encryptFile, decryptFile, decryptText } from '../services/crypto';
import DecryptedText from '../components/DecryptedText';
import api from '../services/api';
import axios from 'axios';

export default function Documents() {
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  
  const { items, folders, isLoading } = useSelector((state) => state.vault);
  const { masterKey } = useSelector((state) => state.auth);

  const activeFolderId = searchParams.get('folderId') || null;

  // Form states
  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // UI state for modals
  const [movingItem, setMovingItem] = useState(null);

  // Reload items list on mount or changes
  const fetchItems = async () => {
    try {
      dispatch(setLoading(true));
      const response = await api.get('/vault/items', {
        params: { type: 'document' }
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
   * Helper to compute SHA-256 checksum hash of a binary buffer.
   */
  const computeChecksum = async (arrayBuffer) => {
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  };

  /**
   * Returns a file extension string from a MIME type. Used as fallback during download.
   */
  const getExtFromMime = (mimeType) => {
    const map = {
      'application/pdf': '.pdf',
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'image/svg+xml': '.svg',
      'image/bmp': '.bmp',
      'image/tiff': '.tiff',
      'text/plain': '.txt',
      'text/csv': '.csv',
      'text/html': '.html',
      'application/json': '.json',
      'application/xml': '.xml',
      'application/zip': '.zip',
      'application/x-zip-compressed': '.zip',
      'application/x-rar-compressed': '.rar',
      'application/x-7z-compressed': '.7z',
      'application/gzip': '.gz',
      'application/msword': '.doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
      'application/vnd.ms-excel': '.xls',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
      'application/vnd.ms-powerpoint': '.ppt',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
      'video/mp4': '.mp4',
      'video/webm': '.webm',
      'video/x-msvideo': '.avi',
      'video/quicktime': '.mov',
      'audio/mpeg': '.mp3',
      'audio/wav': '.wav',
      'audio/ogg': '.ogg',
      'audio/aac': '.aac',
      'application/octet-stream': ''
    };
    return map[mimeType] || '';
  };

  /**
   * Handle document local encryption and multipart upload.
   * Encrypts both the display title and the original filename (with extension) separately.
   */
  const handleUpload = async (e) => {
    e.preventDefault();
    setUploadError('');
    if (!file || !title.trim() || !masterKey) {
      setUploadError('Please specify a title and select a file.');
      return;
    }

    try {
      setIsUploading(true);

      // 1. Read file as ArrayBuffer
      const rawBuffer = await file.arrayBuffer();

      // 2. Compute SHA-256 hash of original file
      const checksum = await computeChecksum(rawBuffer);

      // 3. Encrypt file locally using AES-GCM
      const { encryptedBuffer, nonce: fileNonce } = await encryptFile(rawBuffer, masterKey);

      // 4. Encrypt document display title locally
      const encryptedTitleObj = await encryptText(title.trim(), masterKey);
      const encryptedTitle = JSON.stringify(encryptedTitleObj);

      // 5. Encrypt the original filename (with extension, e.g. 'passport.pdf') separately
      //    This is used during download to restore the correct filename + extension.
      const encryptedFileNameObj = await encryptText(file.name, masterKey);
      const encryptedFileName = JSON.stringify(encryptedFileNameObj);

      // 6. Build FormData
      const formData = new FormData();
      formData.append('encryptedTitle', encryptedTitle);
      formData.append('encryptedFileName', encryptedFileName);
      formData.append('categoryId', '60c72b9a9b1d8a23a41d5a90');
      formData.append('checksum', checksum);
      formData.append('encryptedPayload', JSON.stringify({ fileNonce }));
      if (activeFolderId) {
        formData.append('folderId', activeFolderId);
      }

      // Append encrypted buffer as Blob
      const encryptedBlob = new Blob([encryptedBuffer], { type: 'application/octet-stream' });
      formData.append('file', encryptedBlob, 'encrypted.bin');

      // 7. Post to backend
      const response = await api.post('/vault/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.status === 201) {
        setTitle('');
        setFile(null);
        document.getElementById('fileInput').value = '';
        fetchItems();
      }
    } catch (err) {
      console.error('Upload failed:', err);
      setUploadError(err.response?.data?.error?.message || 'Local encryption or network upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  /**
   * Downloads and decrypts a document using the user's master key.
   * Fetches a presigned R2 URL, downloads encrypted binary, decrypts locally, then triggers a browser download.
   */
  const handleDownloadAndDecrypt = async (item) => {
    try {
      // 1. Fetch presigned download URL from backend
      const responseUrl = await api.get(`/vault/documents/${item.id}/download`);
      const { downloadUrl } = responseUrl.data.data;

      // 2. Download encrypted binary using plain axios (no JWT headers — presigned URL handles auth)
      const fileResponse = await axios.get(downloadUrl, {
        responseType: 'arraybuffer'
      });

      // 3. Parse encryptedPayload — stored as JSON string on the backend
      let fileNonce;
      try {
        const payload =
          typeof item.encryptedPayload === 'string'
            ? JSON.parse(item.encryptedPayload)
            : item.encryptedPayload;
        fileNonce = payload?.fileNonce;
      } catch (_) {
        fileNonce = item.encryptedPayload?.fileNonce;
      }

      if (!fileNonce || !masterKey) {
        throw new Error('Encryption metadata (nonce or master key) is missing.');
      }

      // 4. Decrypt the file buffer locally
      const decryptedBuffer = await decryptFile(fileResponse.data, fileNonce, masterKey);

      // 5. Resolve the download filename (with correct file extension)
      const mimeType = item.fileMetadata?.fileMimeType || 'application/octet-stream';
      let filename = 'decrypted-file';
      try {
        // First try: decrypt the original encrypted filename (has extension, e.g. 'report.pdf')
        const encFileNameRaw = item.fileMetadata?.encryptedFileName;
        if (encFileNameRaw) {
          const parsedFn = typeof encFileNameRaw === 'string'
            ? JSON.parse(encFileNameRaw)
            : encFileNameRaw;
          // Only use it if it looks like an encrypted object (has cipherText)
          if (parsedFn?.cipherText) {
            filename = await decryptText(parsedFn.cipherText, parsedFn.nonce, parsedFn.mac, masterKey);
          }
        }
      } catch (_) {
        // If encryptedFileName decryption fails, fall through to title
      }

      // Second try: decrypt the display title and append MIME-derived extension
      if (!filename || filename === 'decrypted-file') {
        try {
          const parsedTitle = typeof item.encryptedTitle === 'string'
            ? JSON.parse(item.encryptedTitle)
            : item.encryptedTitle;
          const titleText = await decryptText(parsedTitle.cipherText, parsedTitle.nonce, parsedTitle.mac, masterKey);
          const ext = getExtFromMime(mimeType);
          // Append extension only if title doesn't already have one
          filename = titleText.includes('.') ? titleText : titleText + ext;
        } catch (titleErr) {
          console.warn('Could not decrypt title for filename, using MIME fallback.', titleErr);
          filename = 'document' + getExtFromMime(mimeType);
        }
      }

      // Ensure the filename has an extension (safety net for legacy files)
      if (filename && !filename.includes('.')) {
        filename += getExtFromMime(mimeType);
      }

      // 6. Trigger browser download via a temporary blob URL
      const blob = new Blob([decryptedBuffer], { type: mimeType });
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      // Release memory
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (err) {
      console.error('Download/decrypt failed:', err);
      alert('Failed to download or decrypt file: ' + err.message);
    }
  };

  /**
   * Toggles the favorite status of a document.
   */
  const handleToggleFavorite = async (item) => {
    try {
      const response = await api.put(`/vault/items/${item.id}`, {
        isFavorite: !item.isFavorite
      });
      if (response.data?.success) {
        dispatch(updateItemSuccess(response.data.data));
      }
    } catch (err) {
      console.error('Failed to update favorite status:', err);
    }
  };

  /**
   * Deletes a document.
   */
  const handleDelete = async (itemId) => {
    if (!window.confirm('Are you sure you want to permanently delete this document?')) return;
    try {
      const response = await api.delete(`/vault/items/${itemId}`);
      if (response.data?.success) {
        dispatch(deleteItemSuccess(itemId));
      }
    } catch (err) {
      console.error('Failed to delete item:', err);
    }
  };

  /**
   * Moves a document to a folder.
   */
  const handleMoveItem = async (folderId) => {
    if (!movingItem) return;
    try {
      const response = await api.put(`/vault/items/${movingItem.id}`, {
        folderId: folderId === 'root' ? null : folderId
      });
      if (response.data?.success) {
        dispatch(updateItemSuccess(response.data.data));
        setMovingItem(null);
      }
    } catch (err) {
      console.error('Failed to move item:', err);
    }
  };

  // Filter items to display
  const filteredItems = items.filter((item) => {
    if (item.type !== 'document') return false;
    // Match current folder hierarchy
    if (activeFolderId) {
      return item.folderId === activeFolderId;
    } else {
      return item.folderId === null || item.folderId === undefined;
    }
  });

  // Filter subfolders of the active folder
  const subFolders = folders.filter((f) => {
    if (activeFolderId) {
      return f.parentFolderId === activeFolderId;
    } else {
      return f.parentFolderId === null || f.parentFolderId === undefined;
    }
  });

  return (
    <div className="container py-3 text-white">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-0">Documents Store</h2>
          <small className="text-light-muted">
            {activeFolderId ? 'Browsing subdirectory' : 'Root Directory'}
          </small>
        </div>
      </div>

      <div className="row g-4">
        {/* Upload Column */}
        <div className="col-lg-4">
          <div className="card bg-glass border-secondary p-3">
            <h5 className="fw-bold mb-3">Upload Document</h5>
            <form onSubmit={handleUpload}>
              <div className="mb-3">
                <label className="form-label text-light-muted small">Document Title</label>
                <input
                  type="text"
                  className="form-control bg-dark border-secondary text-white"
                  placeholder="e.g. Passport, Tax Return"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label text-light-muted small">Select File</label>
                <input
                  id="fileInput"
                  type="file"
                  className="form-control bg-dark border-secondary text-white"
                  onChange={(e) => setFile(e.target.files[0])}
                  required
                />
              </div>

              {uploadError && <div className="alert alert-danger py-2 small">{uploadError}</div>}

              <button
                type="submit"
                className="btn btn-primary w-100 py-2 fw-bold"
                disabled={isUploading}
              >
                {isUploading ? (
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                ) : null}
                Encrypt & Upload
              </button>
            </form>
          </div>
        </div>

        {/* List Column */}
        <div className="col-lg-8">
          {/* Subfolders Grid */}
          {subFolders.length > 0 && (
            <div className="mb-4">
              <h6 className="text-light-muted text-uppercase fw-bold small mb-3">Subfolders</h6>
              <div className="row g-3">
                {subFolders.map((sf) => (
                  <div key={sf.id} className="col-sm-4">
                    <div className="card bg-glass border-secondary hover-glass">
                      <a href={`/documents?folderId=${sf.id}`} className="card-body d-flex align-items-center gap-2 text-decoration-none text-white py-2.5">
                        <span>📂</span>
                        <span className="text-truncate">
                          <DecryptedText encryptedData={sf.encryptedName} fallback="Folder" />
                        </span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Files List */}
          <div className="card bg-glass border-secondary p-3">
            <h5 className="fw-bold mb-3">Documents</h5>
            {isLoading ? (
              <div className="text-center py-4 text-light-muted">Loading items...</div>
            ) : filteredItems.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-dark table-hover align-middle mb-0">
                  <thead>
                    <tr className="text-light-muted small" style={{ fontSize: '11px', textTransform: 'uppercase' }}>
                      <th>File Name</th>
                      <th>Size</th>
                      <th>Type</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <button
                              onClick={() => handleToggleFavorite(item)}
                              className="btn btn-link p-0 text-decoration-none"
                            >
                              <span className="fs-5">{item.isFavorite ? '⭐' : '☆'}</span>
                            </button>
                            <span className="fw-bold">
                              <DecryptedText encryptedData={item.encryptedTitle} fallback="Decrypted Doc" />
                            </span>
                          </div>
                        </td>
                        <td className="text-light-muted small">
                          {(item.fileMetadata?.fileSize / 1024).toFixed(1)} KB
                        </td>
                        <td className="text-light-muted small">
                          {item.fileMetadata?.fileMimeType || 'Unknown'}
                        </td>
                        <td className="text-end">
                          <div className="btn-group gap-2">
                            <button
                              onClick={() => handleDownloadAndDecrypt(item)}
                              className="btn btn-outline-primary btn-sm rounded-pill px-3"
                              title="Download & Decrypt locally"
                            >
                              📥 Download
                            </button>
                            <button
                              onClick={() => setMovingItem(item)}
                              className="btn btn-outline-light btn-sm rounded-pill px-3"
                              title="Move folder"
                            >
                              📦 Move
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="btn btn-outline-danger btn-sm rounded-pill px-3"
                              title="Delete permanently"
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-5 text-light-muted">
                <div className="fs-1 mb-2">📁</div>
                <div>No documents inside this folder.</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Move Folder Modal Overlay */}
      {movingItem && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content bg-glass border-secondary text-white p-3">
              <div className="modal-header border-0 justify-content-between">
                <h5 className="modal-title fw-bold">Move Item</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setMovingItem(null)}></button>
              </div>
              <div className="modal-body py-3">
                <p className="small text-light-muted">Select destination folder for this document:</p>
                <div className="list-group">
                  <button
                    onClick={() => handleMoveItem('root')}
                    className="list-group-item list-group-item-action bg-dark text-white border-secondary d-flex align-items-center gap-2"
                  >
                    <span>📂</span> / Root Directory
                  </button>
                  {folders.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => handleMoveItem(f.id)}
                      className="list-group-item list-group-item-action bg-dark text-white border-secondary d-flex align-items-center gap-2"
                    >
                      <span>📂</span> <DecryptedText encryptedData={f.encryptedName} fallback="Folder" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
