/**
 * @fileoverview WebCrypto service providing zero-knowledge client-side encryption and key derivation.
 */

/**
 * Convert an ArrayBuffer to a Base64 string.
 * @param {ArrayBuffer} buffer - Binary buffer.
 * @returns {string} Base64 representation.
 */
export function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

/**
 * Convert a Base64 string to an ArrayBuffer.
 * @param {string} base64 - Base64 string.
 * @returns {ArrayBuffer} Decoded binary buffer.
 */
export function base64ToBuffer(base64) {
  const binaryString = window.atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Convert a Hex string to a Uint8Array.
 * @param {string} hex - Hexadecimal string.
 * @returns {Uint8Array} Byte array.
 */
export function hexToBytes(hex) {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.substr(i * 2, 2), 16);
  }
  return bytes;
}

/**
 * Derive a 256-bit AES-GCM CryptoKey from a passphrase and a salt.
 * @param {string} passphrase - Plaintext passphrase.
 * @param {string} saltHex - Hex-encoded salt.
 * @returns {Promise<CryptoKey>} Derived AES-GCM key.
 */
export async function deriveKey(passphrase, saltHex) {
  const encoder = new TextEncoder();
  const passphraseBuffer = encoder.encode(passphrase);
  const saltBytes = hexToBytes(saltHex);

  // Import password as base key
  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    passphraseBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  // Derive AES key
  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: 100000,
      hash: 'SHA-256'
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    true, // extractable
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a text string using AES-GCM.
 * @param {string} plaintext - Data to encrypt.
 * @param {CryptoKey} cryptoKey - Derived AES key.
 * @returns {Promise<{ cipherText: string, nonce: string, mac: string }>} Encrypted properties.
 */
export async function encryptText(plaintext, cryptoKey) {
  const encoder = new TextEncoder();
  const encoded = encoder.encode(plaintext);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encoded
  );

  // WebCrypto appends the 16-byte auth tag (MAC) at the end of the ciphertext buffer.
  const totalLength = encryptedBuffer.byteLength;
  const cipherTextBuffer = encryptedBuffer.slice(0, totalLength - 16);
  const macBuffer = encryptedBuffer.slice(totalLength - 16);

  return {
    cipherText: bufferToBase64(cipherTextBuffer),
    nonce: bufferToBase64(iv),
    mac: bufferToBase64(macBuffer)
  };
}

/**
 * Decrypt a text payload using AES-GCM.
 * @param {string} cipherText - Base64 encoded ciphertext.
 * @param {string} nonce - Base64 encoded IV.
 * @param {string} mac - Base64 encoded authentication tag.
 * @param {CryptoKey} cryptoKey - Derived AES key.
 * @returns {Promise<string>} Decrypted cleartext.
 */
export async function decryptText(cipherText, nonce, mac, cryptoKey) {
  const cipherTextBytes = new Uint8Array(base64ToBuffer(cipherText));
  const iv = new Uint8Array(base64ToBuffer(nonce));
  const macBytes = new Uint8Array(base64ToBuffer(mac));

  // Assemble full WebCrypto cipher payload (ciphertext + tag)
  const combinedBuffer = new Uint8Array(cipherTextBytes.length + macBytes.length);
  combinedBuffer.set(cipherTextBytes, 0);
  combinedBuffer.set(macBytes, cipherTextBytes.length);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    combinedBuffer
  );

  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
}

/**
 * Encrypt a file binary buffer.
 * @param {ArrayBuffer} arrayBuffer - Raw file data.
 * @param {CryptoKey} cryptoKey - Derived AES key.
 * @returns {Promise<{ encryptedBuffer: ArrayBuffer, nonce: string }>} Encrypted file stream properties.
 */
export async function encryptFile(arrayBuffer, cryptoKey) {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    arrayBuffer
  );

  return {
    encryptedBuffer,
    nonce: bufferToBase64(iv)
  };
}

/**
 * Decrypt an encrypted file binary buffer.
 * @param {ArrayBuffer} encryptedBuffer - Combined encrypted file buffer (ciphertext + tag).
 * @param {string} nonce - Base64 encoded IV.
 * @param {CryptoKey} cryptoKey - Derived AES key.
 * @returns {Promise<ArrayBuffer>} Decrypted file buffer.
 */
export async function decryptFile(encryptedBuffer, nonce, cryptoKey) {
  const iv = new Uint8Array(base64ToBuffer(nonce));

  return window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encryptedBuffer
  );
}
