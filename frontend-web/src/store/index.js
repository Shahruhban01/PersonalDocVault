/**
 * @fileoverview Configures the Redux store instance.
 */

import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import vaultReducer from './vaultSlice';
import { injectStore } from '../services/api';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    vault: vaultReducer
  },
  // Disable serializableChecks since we store the Cryptokey object in the state
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false
    })
});

// Inject store dynamically to API client for authorization headers resolver
injectStore(store);

export default store;
