/**
 * @fileoverview Utility component that asynchronously decrypts string parameters on mount.
 */

import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { decryptText } from '../services/crypto';

/**
 * Renders decrypted cleartext using the local master key.
 * @param {object} props - Component properties.
 * @param {string} props.encryptedData - JSON-serialized ciphertext object containing cipherText, nonce, and mac.
 * @param {string} [props.fallback='Encrypted Item'] - Fallback label if decryption fails.
 */
export default function DecryptedText({ encryptedData, fallback = 'Encrypted Item' }) {
  const { masterKey } = useSelector((state) => state.auth);
  const [decrypted, setDecrypted] = useState('');

  useEffect(() => {
    let isMounted = true;
    if (!encryptedData || !masterKey) {
      return;
    }

    const decrypt = async () => {
      try {
        const parsed = JSON.parse(encryptedData);
        const text = await decryptText(parsed.cipherText, parsed.nonce, parsed.mac, masterKey);
        if (isMounted) {
          setDecrypted(text);
        }
      } catch (e) {
        if (isMounted) {
          setDecrypted(fallback);
        }
      }
    };

    decrypt();
    return () => {
      isMounted = false;
    };
  }, [encryptedData, masterKey, fallback]);

  return <span>{decrypted || 'Decrypting...'}</span>;
}
