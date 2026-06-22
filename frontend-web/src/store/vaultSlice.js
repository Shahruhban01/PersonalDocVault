/**
 * @fileoverview Redux Toolkit slice managing folders list, vault items, and active folder context.
 */

import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  folders: [],
  items: [],
  activeFolderId: null,
  searchQuery: '',
  isLoading: false,
  error: null
};

const vaultSlice = createSlice({
  name: 'vault',
  initialState,
  reducers: {
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    setFolders: (state, action) => {
      state.folders = action.payload;
    },
    setItems: (state, action) => {
      state.items = action.payload;
    },
    addFolder: (state, action) => {
      state.folders.push(action.payload);
    },
    addVaultItem: (state, action) => {
      state.items.push(action.payload);
    },
    deleteFolderSuccess: (state, action) => {
      state.folders = state.folders.filter(f => f.id !== action.payload);
    },
    deleteItemSuccess: (state, action) => {
      state.items = state.items.filter(item => item.id !== action.payload);
    },
    updateItemSuccess: (state, action) => {
      const index = state.items.findIndex(item => item.id === action.payload.id);
      if (index !== -1) {
        state.items[index] = { ...state.items[index], ...action.payload };
      }
    },
    updateFolderSuccess: (state, action) => {
      const index = state.folders.findIndex(f => f.id === action.payload.id);
      if (index !== -1) {
        state.folders[index] = { ...state.folders[index], ...action.payload };
      }
    },
    setActiveFolderId: (state, action) => {
      state.activeFolderId = action.payload;
    },
    setSearchQuery: (state, action) => {
      state.searchQuery = action.payload;
    },
    clearVaultData: (state) => {
      state.folders = [];
      state.items = [];
      state.activeFolderId = null;
      state.searchQuery = '';
      state.isLoading = false;
      state.error = null;
    }
  }
});

export const {
  setLoading,
  setError,
  setFolders,
  setItems,
  addFolder,
  addVaultItem,
  deleteFolderSuccess,
  deleteItemSuccess,
  updateItemSuccess,
  updateFolderSuccess,
  setActiveFolderId,
  setSearchQuery,
  clearVaultData
} = vaultSlice.actions;

export default vaultSlice.reducer;
