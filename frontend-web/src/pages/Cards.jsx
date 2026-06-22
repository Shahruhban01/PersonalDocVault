/**
 * @fileoverview Cards credential management component implementing field-level client-side encryption.
 */

import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setItems, deleteItemSuccess, updateItemSuccess, setLoading } from '../store/vaultSlice';
import { encryptText, decryptText } from '../services/crypto';
import DecryptedText from '../components/DecryptedText';
import api from '../services/api';

export default function Cards() {
  const dispatch = useDispatch();
  const { items, isLoading } = useSelector((state) => state.vault);
  const { masterKey } = useSelector((state) => state.auth);

  // Form states
  const [title, setTitle] = useState('');
  const [cardBrand, setCardBrand] = useState('visa');
  const [cardholderName, setCardholderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [error, setError] = useState('');

  // Selected card to view in decrypted modal
  const [selectedCard, setSelectedCard] = useState(null);
  const [decryptedFields, setDecryptedFields] = useState(null);
  const [isDecrypting, setIsDecrypting] = useState(false);

  const fetchItems = async () => {
    try {
      dispatch(setLoading(true));
      const response = await api.get('/vault/items', {
        params: { type: 'card' }
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
   * Handle credential encryption and submit card details to backend.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!title.trim() || !cardholderName.trim() || !cardNumber.trim() || !expiryDate.trim() || !cvv.trim()) {
      setError('All fields are required.');
      return;
    }

    try {
      if (!masterKey) return;

      // 1. Encrypt Title
      const encryptedTitleObj = await encryptText(title.trim(), masterKey);
      const encryptedTitle = JSON.stringify(encryptedTitleObj);

      // 2. Encrypt sensitive details individually
      const nameEnc = await encryptText(cardholderName.trim(), masterKey);
      const numberEnc = await encryptText(cardNumber.trim(), masterKey);
      const expiryEnc = await encryptText(expiryDate.trim(), masterKey);
      const cvvEnc = await encryptText(cvv.trim(), masterKey);

      const encryptedPayload = {
        cardholderName_enc: JSON.stringify(nameEnc),
        cardNumber_enc: JSON.stringify(numberEnc),
        expiryDate_enc: JSON.stringify(expiryEnc),
        cvv_enc: JSON.stringify(cvvEnc)
      };

      // 3. Post to backend card router
      const response = await api.post('/vault/cards', {
        encryptedTitle,
        cardBrand,
        encryptedPayload
      });

      if (response.status === 201) {
        setTitle('');
        setCardholderName('');
        setCardNumber('');
        setExpiryDate('');
        setCvv('');
        fetchItems(); // Reload
      }
    } catch (err) {
      console.error('Failed to save card:', err);
      setError(err.response?.data?.error?.message || 'Failed to encrypt or save credentials.');
    }
  };

  /**
   * Performs on-demand decryption of card attributes.
   */
  const handleViewCard = async (card) => {
    setSelectedCard(card);
    setDecryptedFields(null);
    setIsDecrypting(true);

    try {
      const payload = card.encryptedPayload;
      const { cardholderName_enc, cardNumber_enc, expiryDate_enc, cvv_enc } = payload;

      const pName = JSON.parse(cardholderName_enc);
      const pNumber = JSON.parse(cardNumber_enc);
      const pExpiry = JSON.parse(expiryDate_enc);
      const pCvv = JSON.parse(cvv_enc);

      const holderName = await decryptText(pName.cipherText, pName.nonce, pName.mac, masterKey);
      const number = await decryptText(pNumber.cipherText, pNumber.nonce, pNumber.mac, masterKey);
      const expiry = await decryptText(pExpiry.cipherText, pExpiry.nonce, pExpiry.mac, masterKey);
      const cv = await decryptText(pCvv.cipherText, pCvv.nonce, pCvv.mac, masterKey);

      setDecryptedFields({ holderName, number, expiry, cv });
    } catch (err) {
      console.error('Decryption failed:', err);
      alert('Key mismatch or corrupt parameters: decryption failed.');
      setSelectedCard(null);
    } finally {
      setIsDecrypting(false);
    }
  };

  /**
   * Delete card item.
   */
  const handleDelete = async (itemId) => {
    if (!window.confirm('Are you sure you want to permanently delete this card?')) return;
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
   * Toggle favorite.
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

  const filteredCards = items.filter((item) => item.type === 'card');

  return (
    <div className="container py-3 text-white">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-0">Card Credentials</h2>
          <small className="text-light-muted">Store credit and identity cards securely</small>
        </div>
      </div>

      <div className="row g-4">
        {/* Form Column */}
        <div className="col-lg-4">
          <div className="card bg-glass border-secondary p-3">
            <h5 className="fw-bold mb-3">Add Secure Card</h5>
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label text-light-muted small">Card Label</label>
                <input
                  type="text"
                  className="form-control bg-dark border-secondary text-white"
                  placeholder="e.g. Primary Travel Card"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label text-light-muted small">Brand</label>
                  <select
                    className="form-select bg-dark border-secondary text-white"
                    value={cardBrand}
                    onChange={(e) => setCardBrand(e.target.value)}
                  >
                    <option value="visa">Visa</option>
                    <option value="mastercard">Mastercard</option>
                    <option value="amex">Amex</option>
                    <option value="rupay">Rupay</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label text-light-muted small">CVV</label>
                  <input
                    type="password"
                    maxLength="4"
                    className="form-control bg-dark border-secondary text-white"
                    placeholder="•••"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label text-light-muted small">Cardholder Name</label>
                <input
                  type="text"
                  className="form-control bg-dark border-secondary text-white"
                  placeholder="Jane Doe"
                  value={cardholderName}
                  onChange={(e) => setCardholderName(e.target.value)}
                  required
                />
              </div>

              <div className="row">
                <div className="col-md-8 mb-3">
                  <label className="form-label text-light-muted small">Card Number</label>
                  <input
                    type="text"
                    maxLength="19"
                    className="form-control bg-dark border-secondary text-white"
                    placeholder="1234 5678 1234 5678"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    required
                  />
                </div>
                <div className="col-md-4 mb-3">
                  <label className="form-label text-light-muted small">Expiry (MM/YY)</label>
                  <input
                    type="text"
                    maxLength="5"
                    className="form-control bg-dark border-secondary text-white"
                    placeholder="12/29"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              {error && <div className="alert alert-danger py-2 small">{error}</div>}

              <button type="submit" className="btn btn-primary w-100 py-2 fw-bold">
                Encrypt & Save Card
              </button>
            </form>
          </div>
        </div>

        {/* Display List Column */}
        <div className="col-lg-8">
          <div className="card bg-glass border-secondary p-3 h-100">
            <h5 className="fw-bold mb-3">Secure Cards</h5>
            {isLoading ? (
              <div className="text-center py-4 text-light-muted">Loading items...</div>
            ) : filteredCards.length > 0 ? (
              <div className="row g-3">
                {filteredCards.map((card) => (
                  <div key={card.id} className="col-md-6">
                    <div className="card bg-dark border-secondary hover-glass h-100 position-relative overflow-hidden">
                      <div className="card-body p-4 d-flex flex-column justify-content-between" style={{ minHeight: '160px' }}>
                        <div>
                          <div className="d-flex justify-content-between align-items-center mb-3">
                            <span className="fs-5 text-uppercase fw-bold text-primary">
                              {card.cardBrand}
                            </span>
                            <button
                              onClick={() => handleToggleFavorite(card)}
                              className="btn btn-link p-0 text-decoration-none"
                            >
                              <span className="fs-5">{card.isFavorite ? '⭐' : '☆'}</span>
                            </button>
                          </div>
                          <h5 className="card-title fw-bold text-white mb-2">
                            <DecryptedText encryptedData={card.encryptedTitle} fallback="Decrypted Card" />
                          </h5>
                        </div>

                        <div className="d-flex justify-content-between align-items-end">
                          <button
                            onClick={() => handleViewCard(card)}
                            className="btn btn-outline-primary btn-sm rounded-pill px-3"
                          >
                            🔓 View Details
                          </button>
                          <button
                            onClick={() => handleDelete(card.id)}
                            className="btn btn-link text-danger p-0 text-decoration-none small"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-5 text-light-muted m-auto">
                <div className="fs-1 mb-2">💳</div>
                <div>No cards registered.</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Decrypt Details Modal Overlay */}
      {selectedCard && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content bg-glass border-secondary text-white p-3">
              <div className="modal-header border-0 justify-content-between">
                <h5 className="modal-title fw-bold d-flex align-items-center gap-2">
                  <span>💳</span>
                  <DecryptedText encryptedData={selectedCard.encryptedTitle} fallback="Card Details" />
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setSelectedCard(null)}></button>
              </div>
              <div className="modal-body py-3">
                {isDecrypting ? (
                  <div className="text-center py-3 text-muted">Decrypting variables in sandbox memory...</div>
                ) : decryptedFields ? (
                  <div className="d-flex flex-column gap-3">
                    <div className="bg-dark p-3 rounded-3 border border-secondary text-center font-monospace fs-4 text-primary">
                      {decryptedFields.number}
                    </div>

                    <div className="row font-monospace">
                      <div className="col-8">
                        <small className="text-light-muted d-block uppercase" style={{ fontSize: '10px' }}>Cardholder</small>
                        <span className="fw-bold">{decryptedFields.holderName}</span>
                      </div>
                      <div className="col-2 text-center">
                        <small className="text-light-muted d-block uppercase" style={{ fontSize: '10px' }}>Expiry</small>
                        <span className="fw-bold">{decryptedFields.expiry}</span>
                      </div>
                      <div className="col-2 text-end">
                        <small className="text-light-muted d-block uppercase" style={{ fontSize: '10px' }}>CVV</small>
                        <span className="fw-bold">{decryptedFields.cv}</span>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
