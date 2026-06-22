import 'dart:convert';
import 'package:cryptography/cryptography.dart';

/// Cryptographic service providing client-side key derivations and encryption utilities.
class CryptoService {
  final _aesGcm = AesGcm.with256bits();

  /**
   * Derive a 256-bit symmetric key from a passphrase and salt using PBKDF2.
   * @param passphrase - Raw user entry.
   * @param salt - Hex-derived salt.
   * @returns derived 32-byte key stream list.
   */
  Future<List<int>> deriveKey(String passphrase, String saltHex) async {
    final salt = utf8.encode(saltHex);
    final pbkdf2 = Pbkdf2(
      macAlgorithm: Hmac.sha256(),
      iterations: 100000,
      bits: 256,
    );
    final secretKey = await pbkdf2.deriveKeyFromPassword(
      password: passphrase,
      nonce: salt,
    );
    return secretKey.extractBytes();
  }

  /**
   * Encrypt raw data bytes using AES-256-GCM.
   * @param plaintext - Data bytes list.
   * @param keyBytes - Derived key stream.
   * @returns cipher package properties map containing tag, nonce (IV), and bytes.
   */
  Future<Map<String, String>> encrypt(String plaintext, List<int> keyBytes) async {
    final secretKey = SecretKey(keyBytes);
    final cleartext = utf8.encode(plaintext);
    final secretBox = await _aesGcm.encrypt(cleartext, secretKey: secretKey);

    return {
      'cipherText': base64.encode(secretBox.cipherText),
      'nonce': base64.encode(secretBox.nonce),
      'mac': base64.encode(secretBox.mac.bytes)
    };
  }

  /**
   * Decrypt ciphertext using AES-256-GCM.
   * @param cipherText - Base64 encoded payload.
   * @param nonce - Base64 initialization vector.
   * @param mac - Base64 authentication tag.
   * @param keyBytes - Derived key stream.
   * @returns plain text string.
   */
  Future<String> decrypt(
    String cipherText,
    String nonce,
    String mac,
    List<int> keyBytes
  ) async {
    final secretKey = SecretKey(keyBytes);
    final secretBox = SecretBox(
      base64.decode(cipherText),
      nonce: base64.decode(nonce),
      mac: Mac(base64.decode(mac))
    );

    final decryptedBytes = await _aesGcm.decrypt(secretBox, secretKey: secretKey);
    return utf8.decode(decryptedBytes);
  }
}
