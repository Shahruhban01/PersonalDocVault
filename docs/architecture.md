# Software Architecture & Flow Design - Personal Vault

## 1. High-Level System Architecture

Personal Vault uses a modern, multi-tier, decoupled architecture designed to support multiple clients (Flutter Mobile and React Web) communicating over a unified RESTful API, backed by a Node.js/Express service, MongoDB Atlas for metadata, and Cloudflare R2 for binary storage.

```mermaid
graph TB
    subgraph Clients
        mobile[Flutter App<br>MVVM + GetX]
        web[React Web Dashboard<br>Bootstrap 5]
    end

    subgraph API Gateway / Express Backend
        lb[Load Balancer / Cloudflare]
        express[Express.js App<br>Dockerized]
        auth_mw[JWT Auth Middleware]
        multer_mw[Multer / Chunk Upload Handler]
        crypt_service[Cryptographic Manager]
    end

    subgraph Storage Layer
        mongo[(MongoDB Atlas<br>Metadata & User DB)]
        r2[Cloudflare R2 Object Storage<br>Encrypted Binary Files]
    end

    mobile -->|HTTPS / REST API| lb
    web -->|HTTPS / REST API| lb
    lb --> express
    express --> auth_mw
    express --> multer_mw
    express --> crypt_service
    
    express -->|Mongoose ODM| mongo
    express -->|S3 Client SDK| r2
```

### 1.1 Client Tier
* **Flutter Mobile App (iOS & Android):** Implements an **MVVM (Model-View-ViewModel)** architecture using **GetX** for reactive state management, routing, and dependency injection. It handles local biometric validation, password derivation using PBKDF2, and client-side encryption/decryption.
* **React Web App:** A responsive administrative dashboard utilizing **Bootstrap 5**. It interacts with the same REST APIs and manages user sessions via secure JWT tokens, handling chunk uploads and file decryption on the desktop.

### 1.2 Backend Tier (Node.js & Express)
* **Application Gateway:** Deployed inside a Docker container on Render, Railway, or Fly.io behind Cloudflare proxying.
* **Controller-Service-Repository Pattern:** Decouples route handlers (controllers), business logic (services), and data access (repositories/Mongoose models).
* **Chunk Upload Middleware:** Custom Express middleware built on top of Multer to assemble, validate, and merge chunked file uploads before storing them in Cloudflare R2.

### 1.3 Storage & CDN Tier
* **MongoDB Atlas:** Managed multi-region replica sets storing structured metadata, user preferences, audited logs, and client-side encrypted credentials (cards, notes).
* **Cloudflare R2 Storage:** S3-compatible, zero-egress fee object storage. Used to store all document files, encrypted using AES-256-GCM.

---

## 2. Storage Strategy & Architecture

Cloudflare R2 is chosen as the central storage repository due to its zero egress fees and high performance.

```mermaid
sequenceDiagram
    autonumber
    actor User as Client (Web/Mobile)
    participant API as Express Server
    participant DB as MongoDB Atlas
    participant R2 as Cloudflare R2

    rect rgb(240, 240, 240)
    note right of User: Standard Secure Upload Flow (< 5MB)
    User->>User: Encrypt file client-side using Symmetric File Key
    User->>API: POST /api/vault/upload (Multipart Form: File + Metadata)
    API->>API: Validate session & JWT
    API->>R2: Stream file to R2 (s3Client.putObject)
    API->>DB: Save Document Record (Metadata + R2 URL)
    DB-->>API: Success
    API-->>User: Upload Completed (201 Created)
    end
```

### 2.1 Bucket Layout & Organization
To ensure strict security boundaries, objects are organized using a user-scoped prefix path pattern:

```text
r2-personal-vault-bucket/
└── users/
    └── {user_uuid}/
        ├── identity_documents/
        │   ├── {document_uuid}_enc.bin
        │   └── {document_uuid}_thumbnail.bin
        ├── medical_records/
        │   └── {record_uuid}_enc.bin
        ├── certificates/
        │   └── {certificate_uuid}_enc.bin
        └── general_files/
            └── {file_uuid}_enc.bin
```

### 2.2 Access Control and Delivery
1. **Private Buckets:** The R2 bucket is entirely private. Direct public access is disabled.
2. **Presigned URLs:** For downloading documents, the server generates short-lived (expiry = 5 minutes) Cloudflare R2 presigned download URLs.
3. **Gateway streaming (Alternative for ultra-security):** The backend streams the file directly from R2 to the client over an active HTTPS connection, avoiding exposure of R2 URLs to the client.

### 2.3 Large File Chunked Upload Strategy
For uploading large files (up to 100MB), the application implements a reliable chunk-based upload mechanism to prevent timeout issues on hosting platforms like Render:

```mermaid
sequenceDiagram
    autonumber
    actor Client
    participant API as Express Server
    participant Cache as Redis/Disk Cache
    participant R2 as Cloudflare R2

    Client->>API: POST /api/vault/upload/chunk/init (fileSize, totalChunks, filename)
    API-->>Client: Return uploadId & expected chunk index sequence
    
    loop For each chunk
        Client->>API: POST /api/vault/upload/chunk (uploadId, chunkIndex, fileBlob)
        API->>Cache: Save chunk to temporary directory/cache
        API-->>Client: Acknowledge chunk received (200 OK)
    end
    
    Client->>API: POST /api/vault/upload/chunk/complete (uploadId, fileMetadata)
    API->>API: Assemble chunks & compute SHA-256 check
    API->>R2: Upload assembled file to Cloudflare R2
    API->>API: Clean up local/cache chunks
    API-->>Client: File successfully processed & stored (201 Created)
```

---

## 3. Core Operational Flows

### 3.1 User Authentication Flow
Details the process of logging in, obtaining tokens, and decrypting the local SQLite/Hive database on mobile.

```mermaid
sequenceDiagram
    autonumber
    actor User as User Mobile/Web Client
    participant Key as Keystore / Keychain
    participant Auth as Express Auth API
    participant DB as MongoDB Atlas

    User->>User: Enter email, password, and pin/master passphrase
    User->>Key: Retrieve Device Signing Key
    User->>Auth: POST /api/auth/login (email, password_hash)
    Auth->>DB: Query user record & verify bcrypt hash
    DB-->>Auth: User Verified
    Auth->>Auth: Generate Access Token (JWT - 15m) & Refresh Token (JWT - 7d)
    Auth-->>User: Return Tokens + Salt
    User->>User: Derive Master Symmetric Key locally: PBKDF2(passphrase, salt)
    User->>User: Decrypt local metadata database
```

### 3.2 Document View & Decryption Flow
How encrypted documents are safely retrieved, decrypted, and displayed without raw files touching server storage in plaintext.

```mermaid
sequenceDiagram
    autonumber
    actor User as User Client (Web/Mobile)
    participant API as Express Backend
    participant R2 as Cloudflare R2

    User->>API: GET /api/vault/documents/{id} (Headers: Authorization: Bearer JWT)
    API->>API: Validate authorization & ownership rules
    API->>R2: Generate Presigned GetObject URL (expiry: 5m)
    API-->>User: Return metadata & Presigned R2 URL
    User->>R2: Fetch encrypted file binary directly
    R2-->>User: Return Encrypted Blob
    User->>User: Decrypt using Master Key (AES-256-GCM)
    User->>User: Render document in viewer (In-memory only)
```

### 3.3 Admin Management Flow
The flow detailing how administrative accounts oversee system status, monitor storage usage, and manage users.

```mermaid
sequenceDiagram
    autonumber
    actor Admin
    participant Portal as React Admin Dashboard
    participant API as Express Admin Endpoints
    participant DB as MongoDB Atlas

    Admin->>Portal: Login (Requires Admin role)
    Portal->>API: GET /api/admin/metrics (Access Token)
    API->>API: Middleware: checkRole('admin')
    API->>DB: Fetch user counts, total files size, audit logs
    DB-->>API: Metrics data
    API-->>Portal: Render dashboard panels & system audit logs
```
