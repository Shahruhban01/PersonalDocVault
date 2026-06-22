# Personal Vault - Production-Ready Architecture & Design

Welcome to the enterprise-grade system architecture and design documentation for **Personal Vault**. This repository contains the complete software blueprint, security designs, and implementation roadmaps required to build a zero-knowledge, production-ready, secure document storage system.

---

## 📂 Architecture Documentation Index

Please refer to the detailed design documentation organized below:

1. **[Product Requirement Document (PRD)](file:///d:/DocVault/docs/prd.md)**
   * Outlines the user personas, core functional modules (Identity, Health, Vehicle, Cards, Notes), non-functional constraints, and performance benchmarks.
2. **[Software Architecture & Flows](file:///d:/DocVault/docs/architecture.md)**
   * Detailed architectural charts, sequence diagrams (auth, view document, admin portals), Cloudflare R2 bucket layouts, and the resumable chunked upload protocol.
3. **[Database Design & Mongoose Schemas](file:///d:/DocVault/docs/database.md)**
   * Complete Entity-Relationship (ER) model, Mongoose schemas with indexed configurations, and GDPR compliance TTL indexes.
4. **[API Architecture & Endpoints](file:///d:/DocVault/docs/api.md)**
   * API routing guidelines, request-response payloads, chunk-upload protocols, and custom middleware pipelines. See also the **[OpenAPI / Swagger Schema](file:///d:/DocVault/docs/swagger.yaml)**.
5. **[Security & Cryptography Architecture](file:///d:/DocVault/docs/security.md)**
   * Math and code patterns for zero-knowledge key derivation (PBKDF2/Argon2id), client-side envelope file encryption (AES-256-GCM), and multi-factor validation flows.
6. **[Project & Folder Directory Layout](file:///d:/DocVault/docs/project_structure.md)**
   * File-by-file organization structures for the monorepo across `backend` (Express), `frontend-web` (React), and `frontend-mobile` (Flutter MVVM/GetX).
7. **[Development Roadmap](file:///d:/DocVault/docs/roadmap.md)**
   * 10-week Gantt chart schedule mapping out core milestones, phase deliverables, and integration/testing cycles.
8. **[Cloud Storage Architecture (Cloudflare R2)](file:///d:/DocVault/docs/storage_architecture.md)**
   * Details the Cloudflare R2 bucket configurations, upload/download flows, and cross-region replication strategies.
9. **[Flutter Mobile Architecture](file:///d:/DocVault/docs/flutter_architecture.md)**
   * Outlines the MVVM folder structures, GetX state observables, SSL pinning, and local encrypted Hive caching.
10. **[React Web Architecture](file:///d:/DocVault/docs/react_architecture.md)**
   * Explains the Redux Toolkit store slices, axios interceptors, route guards, and Bootstrap 5 responsive layouts.

---

## 🛠️ Tech Stack & Hosting Matrix

| Component | Technology | Role | Deployment |
| :--- | :--- | :--- | :--- |
| **Frontend Mobile** | Flutter (Stable) | User App (MVVM, GetX state management) | Apple App Store / Google Play Store |
| **Frontend Web** | React.js, Bootstrap 5 | Admin & Desktop Portal (JWT Session Context) | Vercel / Netlify |
| **Backend API** | Node.js, Express.js | Core Server (Dockerized, MVC, Multer) | Render / Railway / Fly.io |
| **Database** | MongoDB Atlas | Structured Metadata & Audit Ledger | Managed AWS/GCP Replica Set |
| **Object Storage** | Cloudflare R2 | Encrypted Document Store (S3 SDK) | Global Distributed Cloudflare Edge |

---

## 🛡️ Key Security Guarantees
* **Zero-Knowledge Keys:** The user's Master Passphrase is never sent to, processed by, or saved on the backend server.
* **Client-Side Encryption:** All file uploads are AES-256-GCM encrypted locally in-browser or on-device *before* streaming over HTTPS to Cloudflare R2.
* **Granular Session Security:** Short-lived access JWTs with rotation-enabled refresh tokens in HTTP-only, secure, SameSite cookies.
* **MFA Verification:** Time-based One-Time Passwords (TOTP) required for all sensitive sessions and credential alterations.
