# API Architecture & Endpoint Specification - Personal Vault

This document details the complete RESTful API specification for **Personal Vault**. All routes verify inputs using standard middleware, apply strict Rate Limiting policies, log auditable operations, and adhere to a Zero-Knowledge security architecture.

---

## 1. Global Specifications

### 1.1 Base URL
* **Development:** `http://localhost:5000/api`
* **Production:** `https://api.personalvault.io/api`

### 1.2 Global Headers
* `Content-Type: application/json` (Required for all payloads except file uploads)
* `Authorization: Bearer <JWT_ACCESS_TOKEN>` (Required for all authenticated routes)

### 1.3 Rate Limiting Policy
* **Public Endpoints (Login, Register, OTP):** 10 requests per 15 minutes per IP.
* **Standard Vault Endpoints:** 200 requests per 15 minutes per authenticated user.
* **Upload Endpoints:** 50 requests per 15 minutes per authenticated user.

### 1.4 Global Error Codes (Standard Response Statuses)

| HTTP Status | Error Code | Reason |
| :--- | :--- | :--- |
| **400 Bad Request** | `BAD_REQUEST` | Missing parameters, type mismatch, or validation failures. |
| **401 Unauthorized**| `UNAUTHORIZED` | Invalid, expired, or missing JWT tokens. |
| **403 Forbidden** | `FORBIDDEN` | Valid session, but insufficient privileges or user account is suspended. |
| **404 Not Found** | `NOT_FOUND` | Requested resources (document, card, folder) do not exist. |
| **429 Too Many Requests**| `TOO_MANY_REQUESTS` | Rate limits exceeded. |
| **500 Internal Error**| `INTERNAL_SERVER_ERROR` | Uncaught exceptions inside controllers. |

Standard Error Envelope:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error description",
    "details": []
  }
}
```

---

## 2. Authentication Modules (`/api/auth`)

### 2.1 Register User
* **Method & Route:** `POST /api/auth/register`
* **Validation Rules:**
  * `email`: Required, valid email format, must be unique in DB.
  * `password`: Required, minimum 64-character hex string (pre-hashed authKey).
  * `encryptionSalt`: Required, 32-character hex string.
* **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "b47a13d7e5d8a9f0e2b4c6d8...[authKey hex]",
    "encryptionSalt": "b7c2d9a4e8f1c3d5a7b9e0f2c4a6b8d0"
  }
  ```
* **Success Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "User registered successfully, verification email sent.",
    "data": {
      "userId": "60c72b2f9b1d8a23a41d5a71",
      "email": "user@example.com",
      "status": "pending_verification"
    }
  }
  ```

### 2.2 Login User
* **Method & Route:** `POST /api/auth/login`
* **Validation Rules:**
  * `email`: Required, valid email format.
  * `password`: Required, authentication key hex string.
* **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "b47a13d7e5d8a9f0e2b4c6d8...[authKey hex]"
  }
  ```
* **Success Response (200 OK - MFA Disabled):**
  *Note: Refresh token is returned in a Secure, HttpOnly, SameSite=Strict Cookie (`jid`).*
  ```json
  {
    "success": true,
    "data": {
      "accessToken": "eyJhbGciOi...",
      "encryptionSalt": "b7c2d9a4e8f1c3d5a7b9e0f2c4a6b8d0",
      "mfaRequired": false,
      "user": {
        "id": "60c72b2f9b1d8a23a41d5a71",
        "email": "user@example.com",
        "role": "user"
      }
    }
  }
  ```
* **Success Response (200 OK - MFA Enabled):**
  ```json
  {
    "success": true,
    "data": {
      "mfaRequired": true,
      "tempToken": "eyJhbGciOi[temporary token valid for 5m to verify OTP]"
    }
  }
  ```

### 2.3 Refresh Token
* **Method & Route:** `POST /api/auth/refresh`
* **Headers:** Cookie: `jid=<REFRESH_TOKEN>`
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "accessToken": "new_eyJhbGciOi..."
    }
  }
  ```

### 2.4 Logout User
* **Method & Route:** `POST /api/auth/logout`
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Logged out successfully"
  }
  ```

### 2.5 Forgot Password (Request Reset)
* **Method & Route:** `POST /api/auth/forgot-password`
* **Validation Rules:**
  * `email`: Required, valid email format.
* **Request Body:**
  ```json
  {
    "email": "user@example.com"
  }
  ```
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "If the email exists in our system, an OTP has been sent."
  }
  ```

### 2.6 OTP Verification (MFA & Password Reset)
* **Method & Route:** `POST /api/auth/otp/verify`
* **Validation Rules:**
  * `recipient`: Required, valid email format.
  * `code`: Required, 6-digit number string.
  * `actionType`: Required, enum: `["registration", "password_reset", "mfa_login"]`.
* **Request Body:**
  ```json
  {
    "recipient": "user@example.com",
    "code": "123456",
    "actionType": "mfa_login"
  }
  ```
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "OTP verified successfully.",
    "data": {
      "accessToken": "eyJhbGciOi...",
      "verifiedToken": "temp_verify_token_for_password_reset" // Returned only for password_reset flow
    }
  }
  ```

### 2.7 Change Password
* **Method & Route:** `POST /api/auth/change-password`
* **Headers:** `Authorization: Bearer <JWT_ACCESS_TOKEN>` (Or verifiedToken for forgot password resets)
* **Validation Rules:**
  * `newPassword`: Required, authentication key hex string.
  * `newEncryptionSalt`: Required, 32-character hex string.
* **Request Body:**
  ```json
  {
    "newPassword": "c58b24e8f6a7...[new authKey hex]",
    "newEncryptionSalt": "a1b2c3d4e5f6g7h8..."
  }
  ```
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Password changed successfully. All previous sessions revoked."
  }
  ```

### 2.8 Device Management

#### List Active Devices
* **Method & Route:** `GET /api/auth/devices`
* **Headers:** `Authorization: Bearer <JWT_ACCESS_TOKEN>`
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "60c72b2f9b1d8a23a41d5c23",
        "deviceName": "iPhone 15 Pro",
        "os": "iOS",
        "lastActiveAt": "2026-06-22T18:30:00.000Z",
        "isCurrentDevice": true
      }
    ]
  }
  ```

#### Revoke Device Session
* **Method & Route:** `DELETE /api/auth/devices/:id`
* **Headers:** `Authorization: Bearer <JWT_ACCESS_TOKEN>`
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Device access revoked successfully."
  }
  ```

---

## 3. Documents Module (`/api/vault/documents`)

### 3.1 Standard Upload (<= 5MB)
* **Method & Route:** `POST /api/vault/documents/upload`
* **Headers:** `Authorization: Bearer <JWT_ACCESS_TOKEN>`, `Content-Type: multipart/form-data`
* **Validation Rules:**
  * `file`: Required, mime types (PDF, PNG, JPG, JPEG, TXT, DOCX), maximum size 5MB.
  * `encryptedTitle`: Required, client-side encrypted string.
  * `categoryId`: Required, valid MongoDB ObjectId.
  * `folderId`: Optional, valid MongoDB ObjectId.
  * `checksum`: Required, SHA-256 validation string.
  * `encryptedFileKey`: Required, key encrypted with user masterKey.
  * `iv`: Required, initialization vector.
  * `authTag`: Required, authentication tag.
* **Success Response (21 Created):**
  ```json
  {
    "success": true,
    "data": {
      "documentId": "60c72b7a9b1d8a23a41d5a79",
      "encryptedTitle": "U2FsdGVkX1...",
      "activeVersion": 1,
      "fileSize": 2048576,
      "createdAt": "2026-06-22T18:10:00Z"
    }
  }
  ```

### 3.2 Large File Chunked Upload

#### Initialize Upload
* **Method & Route:** `POST /api/vault/documents/chunk/init`
* **Validation Rules:**
  * `totalSize`: Required, number representation of bytes.
  * `totalChunks`: Required, positive integer.
  * `fileMimeType`: Required, standard MIME tag.
* **Request Body:**
  ```json
  {
    "totalSize": 45120000,
    "totalChunks": 9,
    "fileMimeType": "application/pdf"
  }
  ```
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "uploadId": "upload_uuid_987654321",
      "chunkSize": 5242880
    }
  }
  ```

#### Upload Chunk
* **Method & Route:** `POST /api/vault/documents/chunk/upload`
* **Headers:** `Content-Type: multipart/form-data`
* **Form Fields:**
  * `uploadId`: "upload_uuid_987654321" (Required)
  * `chunkIndex`: 0 (Required, index offset)
  * `chunk`: [Binary Chunk Data]
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Chunk 0 uploaded successfully."
  }
  ```

#### Complete Chunk Upload
* **Method & Route:** `POST /api/vault/documents/chunk/complete`
* **Validation Rules:**
  * `uploadId`: Required, uuid.
  * `encryptedTitle`: Required, encrypted string.
  * `categoryId`: Required, objectId.
  * `checksum`: Required, SHA-256 checksum of merged binary.
  * `encryptedFileKey`: Required, key encrypted with user masterKey.
  * `iv`: Required, initialization vector.
  * `authTag`: Required, auth tag.
* **Request Body:**
  ```json
  {
    "uploadId": "upload_uuid_987654321",
    "encryptedTitle": "U2FsdGVkX1...",
    "categoryId": "60c72b9a9b1d8a23a41d5a90",
    "folderId": "60c72b5a9b1d8a23a41d5a75",
    "checksum": "8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88d429cf90b9b6f",
    "encryptedFileKey": "U2FsdGVkX19ma2V5...",
    "iv": "3d9a2c1f8b4e",
    "authTag": "f8a9e7d6"
  }
  ```
* **Success Response (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "documentId": "60c72b7a9b1d8a23a41d5a79",
      "fileSize": 45120000,
      "fileMimeType": "application/pdf"
    }
  }
  ```

### 3.3 Update Document Metadata
* **Method & Route:** `PUT /api/vault/documents/:id`
* **Request Body:**
  ```json
  {
    "encryptedTitle": "U2FsdGVkX19uZXc...",
    "encryptedDescription": "U2FsdGVkX19kZXNj..."
  }
  ```
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Document updated successfully."
  }
  ```

### 3.4 Delete Document (Soft Delete)
* **Method & Route:** `DELETE /api/vault/documents/:id`
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Document moved to Trash."
  }
  ```

### 3.5 Restore Document
* **Method & Route:** `POST /api/vault/documents/:id/restore`
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Document restored successfully."
  }
  ```

### 3.6 Search Documents
* **Method & Route:** `GET /api/vault/documents/search`
* **Query Parameters:** `categoryId`, `folderId`, `createdAtMin`, `createdAtMax`
* **Success Response (200 OK):**
  *Note: Client performs full-text search locally on decrypted local database.*
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "60c72b7a9b1d8a23a41d5a79",
        "encryptedTitle": "U2FsdGVkX1...",
        "categoryId": "60c72b9a9b1d8a23a41d5a90",
        "createdAt": "2026-06-22T18:10:00.000Z"
      }
    ]
  }
  ```

### 3.7 Toggle Favorite Document
* **Method & Route:** `POST /api/vault/documents/:id/favorite`
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "isFavorite": true
    }
  }
  ```

### 3.8 Move Document Folder
* **Method & Route:** `PUT /api/vault/documents/:id/move`
* **Request Body:**
  ```json
  {
    "folderId": "60c72b5a9b1d8a23a41d5a75" // or null for root
  }
  ```
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Document moved successfully."
  }
  ```

### 3.9 Rename Document
* **Method & Route:** `PUT /api/vault/documents/:id/rename`
* **Request Body:**
  ```json
  {
    "encryptedTitle": "U2FsdGVkX19yZW5hbWVk..."
  }
  ```
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Document renamed successfully."
  }
  ```

### 3.10 Share Document
* **Method & Route:** `POST /api/vault/documents/:id/share`
* **Validation Rules:**
  * `recipientEmail`: Required, valid email.
  * `encryptedSharedKey`: Required, file symmetric key encrypted with recipient's public key.
  * `expiresInDays`: Required, integer range (1-30).
* **Request Body:**
  ```json
  {
    "recipientEmail": "friend@example.com",
    "encryptedSharedKey": "U2FsdGVkX19zaGFyZWRL...",
    "expiresInDays": 7
  }
  ```
* **Success Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "Document shared successfully."
  }
  ```

---

## 4. Cards Module (`/api/vault/cards`)

### 4.1 Add Card
* **Method & Route:** `POST /api/vault/cards`
* **Request Body:**
  ```json
  {
    "encryptedTitle": "U2FsdGVkX19jYXJk...",
    "encryptedPayload": {
      "cardholderName_enc": "U2FsdGVkX19...",
      "cardNumber_enc": "U2FsdGVkX19...",
      "expiryDate_enc": "U2FsdGVkX19...",
      "cvv_enc": "U2FsdGVkX19...",
      "cardType": "credit"
    },
    "cardBrand": "mastercard",
    "folderId": null
  }
  ```
* **Success Response (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "id": "60c72c1a9b1d8a23a41d5d05",
      "cardBrand": "mastercard",
      "createdAt": "2026-06-22T18:15:00.000Z"
    }
  }
  ```

### 4.2 Update Card
* **Method & Route:** `PUT /api/vault/cards/:id`
* **Request Body:**
  ```json
  {
    "encryptedTitle": "U2FsdGVkX19uZXdfdGl0bGU...",
    "encryptedPayload": {
      "cardholderName_enc": "U2FsdGVkX19...",
      "cardNumber_enc": "U2FsdGVkX19...",
      "expiryDate_enc": "U2FsdGVkX19...",
      "cvv_enc": "U2FsdGVkX19...",
      "cardType": "credit"
    }
  }
  ```
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Card updated successfully."
  }
  ```

### 4.3 Delete Card
* **Method & Route:** `DELETE /api/vault/cards/:id`
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Card deleted successfully."
  }
  ```

### 4.4 Search Cards (Meta Queries)
* **Method & Route:** `GET /api/vault/cards/search`
* **Query Parameters:** `cardBrand`, `createdAtMin`
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "60c72c1a9b1d8a23a41d5d05",
        "encryptedTitle": "U2FsdGVkX19...",
        "cardBrand": "mastercard"
      }
    ]
  }
  ```

---

## 5. Notes Module (`/api/vault/notes`)

Notes endpoints support zero-knowledge rich text encryption. The text is marked up client-side and saved as encrypted string blocks.

### 5.1 Create Note
* **Method & Route:** `POST /api/vault/notes`
* **Request Body:**
  ```json
  {
    "encryptedTitle": "U2FsdGVkX19ub3Rl...",
    "encryptedBody": "U2FsdGVkX19yaWNoX3RleHRfZW5j...",
    "folderId": "60c72b5a9b1d8a23a41d5a75"
  }
  ```
* **Success Response (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "id": "60c72c2a9b1d8a23a41d5e12",
      "createdAt": "2026-06-22T18:20:00.000Z"
    }
  }
  ```

### 5.2 Get Notes List
* **Method & Route:** `GET /api/vault/notes`
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "60c72c2a9b1d8a23a41d5e12",
        "encryptedTitle": "U2FsdGVkX19ub3Rl...",
        "folderId": "60c72b5a9b1d8a23a41d5a75",
        "createdAt": "2026-06-22T18:20:00.000Z"
      }
    ]
  }
  ```

### 5.3 Get Single Note
* **Method & Route:** `GET /api/vault/notes/:id`
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "id": "60c72c2a9b1d8a23a41d5e12",
      "encryptedTitle": "U2FsdGVkX19ub3Rl...",
      "encryptedBody": "U2FsdGVkX19yaWNoX3RleHRfZW5j...",
      "folderId": "60c72b5a9b1d8a23a41d5a75",
      "createdAt": "2026-06-22T18:20:00.000Z"
    }
  }
  ```

### 5.4 Update Note
* **Method & Route:** `PUT /api/vault/notes/:id`
* **Request Body:**
  ```json
  {
    "encryptedTitle": "U2FsdGVkX191cGRhdGVk...",
    "encryptedBody": "U2FsdGVkX19uZXdfYm9keV9lbmM..."
  }
  ```
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Note updated successfully."
  }
  ```

### 5.5 Delete Note
* **Method & Route:** `DELETE /api/vault/notes/:id`
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Note deleted successfully."
  }
  ```

---

## 6. Folders Module (`/api/vault/folders`)

### 6.1 Create Folder (Supports Nested Folders)
* **Method & Route:** `POST /api/vault/folders`
* **Request Body:**
  ```json
  {
    "encryptedName": "U2FsdGVkX19mb2xkZXI...",
    "parentFolderId": "60c72b5a9b1d8a23a41d5a75", // or null for root level
    "icon": "folder-medical",
    "color": "#e74c3c"
  }
  ```
* **Success Response (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "id": "60c72b5a9b1d8a23a41d5b99",
      "encryptedName": "U2FsdGVkX19mb2xkZXI...",
      "parentFolderId": "60c72b5a9b1d8a23a41d5a75",
      "icon": "folder-medical",
      "createdAt": "2026-06-22T18:25:00.000Z"
    }
  }
  ```

### 6.2 Get Folders List
* **Method & Route:** `GET /api/vault/folders`
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "60c72b5a9b1d8a23a41d5a75",
        "parentFolderId": null,
        "encryptedName": "U2FsdGVkX1...",
        "icon": "folder-medical",
        "color": "#e74c3c"
      }
    ]
  }
  ```

### 6.3 Get Folder Details (Child Folders & Items)
* **Method & Route:** `GET /api/vault/folders/:id`
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "id": "60c72b5a9b1d8a23a41d5a75",
      "encryptedName": "U2FsdGVkX1...",
      "childFolders": [
        {
          "id": "60c72b5a9b1d8a23a41d5b99",
          "encryptedName": "U2FsdGVkX19zdWI..."
        }
      ],
      "vaultItems": [
        {
          "id": "60c72b7a9b1d8a23a41d5a79",
          "type": "document",
          "encryptedTitle": "U2FsdGVkX1..."
        }
      ]
    }
  }
  ```

### 6.4 Update Folder
* **Method & Route:** `PUT /api/vault/folders/:id`
* **Request Body:**
  ```json
  {
    "encryptedName": "U2FsdGVkX19uZXdfbmFtZQ...",
    "icon": "folder-new",
    "color": "#3498db"
  }
  ```
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Folder updated successfully."
  }
  ```

### 6.5 Delete Folder (Cascade or Orphan)
* **Method & Route:** `DELETE /api/vault/folders/:id?mode=orphan`
* **Query Options:** `mode` enum: `["orphan", "cascade"]` (orphan keeps documents but moves them to root; cascade soft-deletes child contents).
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Folder deleted successfully."
  }
  ```

---

## 7. Admin Module (`/api/admin`)

*All requests to `/api/admin` execute roles verification middleware (`checkRole('admin')`) verifying high-clearance JWT assertions.*

### 7.1 User Management (Paginated List)
* **Method & Route:** `GET /api/admin/users`
* **Query Parameters:** `page=1`, `limit=20`, `search=email@domain.com`
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "docs": [
        {
          "id": "60c72b2f9b1d8a23a41d5a71",
          "email": "user@example.com",
          "status": "active",
          "role": "user",
          "createdAt": "2026-06-22T18:00:00.000Z"
        }
      ],
      "totalDocs": 1250,
      "totalPages": 63,
      "page": 1
    }
  }
  ```

### 7.2 Update User Status (Suspend/Activate)
* **Method & Route:** `PUT /api/admin/users/:id/status`
* **Request Body:**
  ```json
  {
    "status": "suspended" // or "active"
  }
  ```
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "User status updated to suspended successfully."
  }
  ```

### 7.3 Fetch System Audit Logs
* **Method & Route:** `GET /api/admin/logs`
* **Query Parameters:** `page=1`, `limit=50`, `action=FILE_DOWNLOAD_REQUEST`
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "logs": [
        {
          "id": "60c72baa9b1d8a23a41d5c99",
          "userId": "60c72b2f9b1d8a23a41d5a71",
          "action": "FILE_DOWNLOAD_REQUEST",
          "ipAddress": "192.168.1.50",
          "status": "success",
          "timestamp": "2026-06-22T18:12:00.000Z"
        }
      ],
      "totalLogs": 450210,
      "page": 1
    }
  }
  ```

### 7.4 Fetch Global System Statistics
* **Method & Route:** `GET /api/admin/statistics`
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "metrics": {
        "usersCount": {
          "total": 1250,
          "active": 920,
          "suspended": 15,
          "pending": 315
        },
        "vaultItemCount": {
          "documents": 15420,
          "cards": 3410,
          "notes": 8902
        }
      }
    }
  }
  ```

### 7.5 Storage Monitoring
* **Method & Route:** `GET /api/admin/storage`
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "r2Storage": {
        "bucketName": "personal-vault-production",
        "totalStorageUsedBytes": 145890204322,
        "objectCount": 15420,
        "averageFileSize": 9461102,
        "estimatedMonthlyEgressSavedBytes": 4509124031
      }
    }
  }
  ```
