# Security & Cryptographic Architecture - Personal Vault

## 1. Zero-Knowledge Cryptographic Blueprint

Personal Vault operates on a **Zero-Knowledge Architecture**. The backend server stores and indexes metadata but has absolute zero visibility into the actual contents of the documents, passwords, cards, or notes. All decryption keys are held exclusively by the user.

```mermaid
graph TD
    subgraph Client Application (Mobile / Web)
        pass[User Passphrase] --> kdf[KDF: PBKDF2 / Argon2id]
        salt[User Salt from Server] --> kdf
        kdf -->|Derivation Key 1| auth_key[Password Hash Key]
        kdf -->|Derivation Key 2| master_key[Master Key]
        
        file[Raw Document] --> enc_file[AES-256-GCM Encrypted Blob]
        file_key[Random File Key] -->|Symmetric Encryption| enc_file
        file_key -->|Encrypted with Master Key| enc_file_key[Encrypted File Key]
    end

    subgraph Backend Server & Storage
        auth_key -->|HTTPS POST /login| api[Express REST API]
        api -->|bcrypt hashing| db[(MongoDB Atlas)]
        enc_file -->|Streaming Upload| r2[Cloudflare R2 Storage]
        enc_file_key -->|Save Item Metadata| db
    end
```

---

## 2. Key Derivation & Management

### 2.1 Registration Sequence
1. The user inputs their `email` and a strong `passphrase`.
2. The client generates a cryptographically secure random 32-byte salt (`encryptionSalt`).
3. The client derives two distinct keys using PBKDF2 (SHA-256):
   * **`authKey`** (used to authenticate the user to the server):
     $$\text{authKey} = \text{PBKDF2}(\text{passphrase}, \text{encryptionSalt}, \text{iterations}=100,000, \text{keylen}=32)$$
   * **`masterKey`** (used locally to encrypt sensitive text and file-specific keys):
     $$\text{masterKey} = \text{PBKDF2}(\text{passphrase}, \text{encryptionSalt} \oplus \text{"master\_key\_salt"}, \text{iterations}=100,000, \text{keylen}=32)$$
4. The client sends `email`, `authKey`, and `encryptionSalt` to the backend. The backend hashes the `authKey` again using `bcrypt` (work factor = 12) before saving it to the database.
5. The `masterKey` is **never** transmitted to the server.

### 2.2 Login Sequence
1. The user enters their `email` and `passphrase`.
2. The client requests the `encryptionSalt` associated with the email from the server.
3. The client computes the `authKey` and `masterKey` locally using the received salt.
4. The client transmits the `authKey` to the server. The server verifies it against the database `bcrypt` hash and, if valid, returns the JWT tokens.

---

## 3. Data Encryption at Rest & In-Transit

### 3.1 Document File Encryption (Envelope Encryption)
To handle large file operations efficiently without decrypting the entire master key block:
1. For every document uploaded, the client generates a unique, one-time random 256-bit symmetric key (`fileKey`).
2. The document binary is encrypted using **AES-256-GCM** (Galois/Counter Mode) with the `fileKey` and a unique 12-byte Initialization Vector (IV).
3. The `fileKey` itself is encrypted with the user's `masterKey` using AES-256-GCM, yielding `encryptedFileKey`.
4. The payload sent to the backend includes:
   * The encrypted file binary (streamed to R2).
   * The `encryptedFileKey`.
   * The IVs and authentication tags for both the file and the encrypted key.
   * Encrypted file name and size metadata.

### 3.2 Card Details & Notes Encryption
Notes, passwords, and card information are stored as JSON structures, encrypted client-side using the `masterKey` with AES-256-GCM, and stored inside MongoDB Atlas.

---

## 4. Authentication Security & MFA

### 4.1 Dual-Token Authentication Structure
* **Access Token:** Short-lived JWT (expiry: 15 minutes) signed using an asymmetric key pair (RS256) or a high-entropy secret (HS256). Contains permissions and role scopes.
* **Refresh Token:** Stored in a secure, `HttpOnly`, `SameSite=Strict`, `Secure` cookie (for web clients) or secure OS Keychain/Keystore (for mobile). Expiry is set to 7 days, with token rotation active to prevent replay attacks.

### 4.2 Multi-Factor Authentication (MFA)
* **Standard:** TOTP (RFC 6238) via Authenticator Apps (Google Authenticator, Authy).
* **Setup:** Backend generates a secret, client displays it as a QR code. The secret is stored encrypted in MongoDB (`mfaSecret` is encrypted using the backend's server-side system key).
* **Verification:** If MFA is enabled for a user, a successful login endpoint returns a temporary token (`mfaRequired: true`), which can only access the `/api/auth/mfa/verify` endpoint.

---

## 5. Security Hardening & Compliance

### 5.1 Defense-in-Depth Policies
* **Transport Security:** Strict Transport Security headers (`HSTS`) force HTTPS. TLS 1.2 and 1.3 are enforced; legacy SSL/TLS versions are dropped.
* **Content Security Policy (CSP):** Rigorous web CSP configured to prevent Cross-Site Scripting (XSS) and inline script executions.
* **NoSQL Injection Mitigation:** Strict type casting using Mongoose schemas. User inputs are sanitized to strip MongoDB operators (`$gt`, `$ne`, etc.) from query filters.
* **CORS Settings:** Strict whitelist policy permitting requests only from authorized client domains.
* **Docker Security:** Containers run as non-root users (`node`). Dependencies are scanned for vulnerabilities (`npm audit`) during CI/CD steps.
* **Automatic Session Lock:** Mobile client detects background/sleep states and immediately wipes `masterKey` from memory and locks the app behind biometric verification.
