/**
 * @fileoverview Redux Toolkit slice managing authentication status and key storage.
 */

import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  accessToken: null,
  user: null,
  masterKey: null, // Keep CryptoKey object in memory only
  isAuthenticated: false,
  isLoading: false,
  error: null
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    authStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    authSuccess: (state, action) => {
      state.isLoading = false;
      state.accessToken = action.payload.accessToken;
      state.user = action.payload.user;
      state.isAuthenticated = true;
      state.error = null;
    },
    authFailure: (state, action) => {
      state.isLoading = false;
      state.error = action.payload;
    },
    setMasterKey: (state, action) => {
      state.masterKey = action.payload;
    },
    refreshTokenSuccess: (state, action) => {
      state.accessToken = action.payload;
    },
    logout: (state) => {
      state.accessToken = null;
      state.user = null;
      state.masterKey = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      state.error = null;
    }
  }
});

export const {
  authStart,
  authSuccess,
  authFailure,
  setMasterKey,
  refreshTokenSuccess,
  logout
} = authSlice.actions;

export default authSlice.reducer;
