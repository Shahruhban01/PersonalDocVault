# Product Requirement Document (PRD) - Personal Vault

## 1. Document Control
* **Project Name:** Personal Vault
* **Document Version:** 1.0.0
* **Date:** 2026-06-22
* **Author:** Principal Software Architect
* **Status:** Draft (Pending Review)

---

## 2. Executive Summary
Personal Vault is a secure, enterprise-grade, personal document management system designed to eliminate the frustration of searching for critical files across multiple platforms. It provides users with a single, highly secure, and encrypted location to store, organize, search, and access identity proofs, financial cards, health records, notes, credentials, images, and documents. The platform operates across a mobile interface (Flutter) for quick on-the-go access and a web application (React) for administrative and desktop use, backed by a highly secure Node.js backend using MongoDB and Cloudflare R2 storage.

### 2.1 Problem Statement
Important documents are scattered across physical folders, local storage, email attachments, chat histories, cloud drives, and gallery screenshots. When needed urgently (e.g., at an airport, hospital, or bank), retrieving them is slow and stressful.

### 2.2 Product Vision
To build a zero-trust, ultra-fast, offline-first-ready secure vault that allows users to locate and decrypt any key document within **3 seconds** of opening the app.

---

## 3. User Personas & Use Cases

### 3.1 Personas
* **The Frequent Traveler:** Needs instant access to passports, visas, tickets, and travel insurance offline.
* **The Family Administrator:** Manages health insurance, identity documents (Aadhaar, PAN, Passport), and educational certificates for all family members.
* **The Daily Commuter:** Requires quick access to digital vehicle documents (RC, Insurance, Driving License) to display during verification.
* **The Security Enthusiast:** Wants a safe place for confidential notes, passwords, and bank card metadata without risking plain-text exposure on conventional cloud drives.

### 3.2 Key Use Cases
1. **Onboarding & Verification:** Users register, set up MFA, and configure their master encryption key.
2. **Instant Search:** User opens the app, authenticates via biometrics, types "Aadhaar", and sees the document preview within seconds.
3. **Structured Document Organization:** Document types are pre-categorized (e.g., Identity, Health, Vehicle, Finance) with custom metadata fields.
4. **Secure Card Storage:** Saving credit/debit card metadata with client-side encryption.
5. **Secure Notes & Passwords:** Storing notes in an encrypted block.
6. **Large File Uploads:** Uploading PDF scans or high-res images of medical records or insurance policies.

---

## 4. Functional Requirements

### 4.1 Authentication & User Management
* **Multi-Platform Auth:** Single sign-on (SSO) with Email/Password and JWT.
* **Biometric Auth (Mobile):** FaceID/Fingerprint integration linked to device key store.
* **Master Passphrase:** Users generate a local master key used for client-side encryption. The server *never* receives or stores this key.
* **Multi-Factor Authentication (MFA):** Authenticator app (TOTP) or SMS-based OTP.
* **Session Management:** Short-lived JWT access tokens (15 mins) with secure refresh tokens stored in HTTP-only, secure, SameSite cookies (Web) and Secure Storage (Mobile).

### 4.2 Secure Vault Content Management
The system supports several custom entry types:

| Entry Type | Core Metadata Fields | Storage Location | Encryption Level |
| :--- | :--- | :--- | :--- |
| **Identity Documents** | Name, Document ID, Expiry Date, Country | Metadata: MongoDB, File: R2 | Metadata: DB, File: Encrypted |
| **Financial Cards** | Cardholder Name, Masked Number, Expiry, CVV | MongoDB | Field-Level Encrypted (Client-side) |
| **Medical Records** | Patient Name, Provider, Record Date, Tags | Metadata: MongoDB, File: R2 | File: Encrypted |
| **Vehicle RC/Insurance** | Registration No, Owner, Expiry Date, Provider | Metadata: MongoDB, File: R2 | File: Encrypted |
| **Notes & Passwords** | Title, Rich Text Body, Tags | MongoDB | Field-Level Encrypted (Client-side) |
| **General Files (PDF/Img)**| Original Name, File Type, File Size | Cloudflare R2 | Encrypted at Rest |

### 4.3 Search & Retrieval
* **Universal Search:** Search by name, tags, category, or metadata (e.g., vehicle plate number).
* **OCR Indexing (Future Scope):** Automatic text extraction from uploaded images/PDFs (Aadhaar, PAN cards) to enable full-text search.
* **Recent & Favorites:** Quick-access sections on the dashboard.

### 4.4 Uploads & Storage
* **Standard File Uploads:** Multer-mediated uploads up to 5MB.
* **Chunk Upload Support:** Resumable chunked upload for files up to 100MB (e.g., detailed medical history scans or high-res PDFs).
* **Automatic Compression:** Mobile client compresses images before upload.

---

## 5. Non-Functional Requirements (NFRs)

### 5.1 Security & Compliance (Critical)
* **Zero-Knowledge Architecture:** The application server has no access to decrypted cards, secure notes, or master passphrases. Encryption keys are derived client-side.
* **Data in Transit:** TLS 1.3 mandatory for all API communications.
* **Data at Rest:** AES-256 encryption. Cloudflare R2 bucket-level encryption enabled. Client-side encrypted payloads stored in MongoDB.
* **OWASP Top 10 Compliance:** Strict protections against SQL/NoSQL Injection, XSS, CSRF, and broken access controls.

### 5.2 Performance & Scalability
* **Latency:** Search query execution and metadata fetching under 100ms.
* **File Retrieval:** Document decryption and download initiated within 500ms.
* **Availability:** 99.9% uptime target via high-availability deployment on Render/Railway and distributed R2 CDN.

### 5.3 Reliability & Resilience
* **Offline Access (Mobile):** Local database cache (Hive or SQLite) storing encrypted metadata and previously viewed files, synchronized securely upon reconnection.
* **Automatic Retry:** Chunk upload middleware supports automatic resume for interrupted network states.

---

## 6. Success Metrics
* **Search Success Rate:** > 95% of documents found within 2 search queries.
* **User Retention:** Daily Active Users (DAU) to Monthly Active Users (MAU) ratio > 35%.
* **App Launch to Document Decryption Time:** < 3 seconds average.
* **Upload Success Rate:** > 99.5% for files > 20MB using chunked uploads.
