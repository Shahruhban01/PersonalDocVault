/**
 * @fileoverview Favorites screen aggregating all favorited vault items across categories.
 */

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { setItems, updateItemSuccess, setLoading } from '../store/vaultSlice';
import DecryptedText from '../components/DecryptedText';
import api from '../services/api';

export default function Favorites() {
  const dispatch = useDispatch();
  const { items, isLoading } = useSelector((state) => state.vault);

  useEffect(() => {
    const fetchFavorites = async () => {
      try {
        dispatch(setLoading(true));
        const response = await api.get('/vault/items');
        if (response.data?.success) {
          dispatch(setItems(response.data.data));
        }
      } catch (err) {
        console.error('Failed to load favorites:', err);
      } finally {
        dispatch(setLoading(false));
      }
    };
    fetchFavorites();
  }, [dispatch]);

  /**
   * Remove item from favorites.
   */
  const handleRemoveFavorite = async (item) => {
    try {
      const response = await api.put(`/vault/items/${item.id}`, {
        isFavorite: false
      });
      if (response.data?.success) {
        dispatch(updateItemSuccess(response.data.data));
      }
    } catch (err) {
      console.error('Failed to remove favorite:', err);
    }
  };

  const favoriteItems = items.filter((item) => item.isFavorite);

  return (
    <div className="container py-3 text-white">
      <div className="mb-4">
        <h2 className="fw-bold mb-0">Starred Items</h2>
        <small className="text-light-muted">Quick access checklist of favorited vault records</small>
      </div>

      <div className="card bg-glass border-secondary p-3">
        {isLoading ? (
          <div className="text-center py-4 text-light-muted">Loading favorites...</div>
        ) : favoriteItems.length > 0 ? (
          <div className="table-responsive">
            <table className="table table-dark table-hover align-middle mb-0">
              <thead>
                <tr className="text-light-muted small" style={{ fontSize: '11px', textTransform: 'uppercase' }}>
                  <th>Title</th>
                  <th>Category Type</th>
                  <th>Date Saved</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {favoriteItems.map((item) => (
                  <tr key={item.id}>
                    <td className="fw-bold text-white">
                      <div className="d-flex align-items-center gap-2">
                        <span className="text-warning">⭐</span>
                        <DecryptedText encryptedData={item.encryptedTitle} fallback="Decrypted Favorite" />
                      </div>
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
                      <div className="btn-group gap-2">
                        <Link
                          to={item.type === 'document' ? '/documents' : item.type === 'card' ? '/cards' : '/notes'}
                          className="btn btn-outline-primary btn-sm rounded-pill px-3"
                        >
                          Open Category
                        </Link>
                        <button
                          onClick={() => handleRemoveFavorite(item)}
                          className="btn btn-outline-danger btn-sm rounded-pill px-3"
                        >
                          Unstar
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
            <div className="fs-1 mb-2">⭐</div>
            <div>No favorite items selected.</div>
            <small>Click on the star icon on any document, card, or note to pin it here.</small>
          </div>
        )}
      </div>
    </div>
  );
}
