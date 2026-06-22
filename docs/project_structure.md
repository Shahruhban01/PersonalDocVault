# Folder & Project Structure - Personal Vault

To maintain high development speed, modularity, and clean isolation of concerns, the Personal Vault project is structured as a monorepo containing three core sub-projects: `backend`, `frontend-web`, and `frontend-mobile`.

## 1. Directory Tree Overview

```text
personal-vault-monorepo/
├── backend/                  # Node.js + Express + MongoDB Service
├── frontend-web/             # React.js + Bootstrap 5 Web Portal
├── frontend-mobile/          # Flutter + MVVM + GetX Mobile Application
├── docs/                     # Architectural & API Documentation
└── README.md                 # Project Setup & Execution Manifest
```

---

## 2. Backend Service (`backend/`)
Built with a standard MVC/layered architectural pattern.

```text
backend/
├── src/
│   ├── config/               # Database, R2, and ENV configurations
│   │   ├── db.js             # Mongoose connection utility
│   │   └── r2.js             # S3-client Cloudflare R2 configurations
│   ├── controllers/          # Route handlers (Validates parameters, requests services)
│   │   ├── auth.controller.js
│   │   ├── vault.controller.js
│   │   └── admin.controller.js
│   ├── middleware/           # Reusable Express request pipelines
│   │   ├── auth.middleware.js
│   │   ├── upload.middleware.js # Handles Multer & file limits validation
│   │   ├── error.middleware.js  # Global error formatter
│   │   └── rate-limiter.js   # Rate limit rules per route
│   ├── models/               # Mongoose schema models (Data schemas & DB indices)
│   │   ├── user.model.js
│   │   ├── folder.model.js
│   │   ├── vault-item.model.js
│   │   └── audit-log.model.js
│   ├── routes/               # API endpoints declarations
│   │   ├── index.js          # Root route orchestrator
│   │   ├── auth.routes.js
│   │   ├── vault.routes.js
│   │   └── admin.routes.js
│   ├── services/             # Core business & utility logic (Decoupled from HTTP)
│   │   ├── r2.service.js     # Upload, download link generation, delete logic
│   │   └── crypt.service.js  # Password hashing verification & server crypt utilities
│   └── app.js                # App bootstrap & middleware initialization
├── tests/                    # Integration and Unit tests (Jest + Supertest)
│   ├── integration/
│   └── unit/
├── Dockerfile                # Production Container configurations
├── docker-compose.yml        # Development infrastructure (App + local MongoDB/MinIO stack)
├── package.json
└── README.md
```

---

## 3. Frontend Web Client (`frontend-web/`)
Standard React.js directory architecture styled with Bootstrap 5.

```text
frontend-web/
├── public/
├── src/
│   ├── assets/               # Local icons, logos, and images
│   ├── components/           # Reusable atomic UI components (Clean components)
│   │   ├── common/           # Input Fields, Spinners, Modals, Buttons
│   │   ├── layout/           # Sidebar, Navbar, Footer, AdminWrapper
│   │   └── vault/            # DocumentCard, CardViewer, NoteEditor
│   ├── context/              # Global state management providers
│   │   ├── AuthContext.js    # Session, User profile, Login/Logout methods
│   │   └── EncryptionContext.js # Client master key lifecycle & decrypter setup
│   ├── hooks/                # Custom React Hooks
│   │   ├── useFetch.js
│   │   └── useChunkUpload.js # Handles client-side chunk slice, encrypt & POST
│   ├── pages/                # Main view route containers
│   │   ├── Auth/             # Login, Register, MFA Setup
│   │   ├── Dashboard/        # Recent uploads, category cards, universal search
│   │   ├── Folders/          # Folder detail view & creation
│   │   └── Admin/            # Admin Panel metrics, Audit Logs, User suspension
│   ├── services/             # Web API Client modules (Axios base configuration)
│   │   ├── api.js            # Axios Interceptors (auto JWT header attachment & refresh token retry)
│   │   └── crypt.js          # Web-Crypto API based client-side encryption/decryption utilities
│   ├── utils/                # Date formatters, file size calculators
│   ├── App.css               # Global custom CSS styles (Bootstrap 5 overrides)
│   ├── App.js                # Route mappings (React Router Dom)
│   └── index.js
├── package.json
└── README.md
```

---

## 4. Frontend Mobile Client (`frontend-mobile/`)
Flutter project implementing clean MVVM structural isolation powered by GetX.

```text
frontend-mobile/
├── android/
├── ios/
├── lib/
│   ├── app/
│   │   ├── data/             # Local database cache & server networking data layer
│   │   │   ├── models/       # Data transfer objects & models mapping JSON to Dart
│   │   │   ├── providers/    # Http client modules (GetConnect / Dio)
│   │   │   └── repositories/ # Intermediaries managing cache vs network data retrieval
│   │   ├── modules/          # MVVM Feature modules
│   │   │   ├── auth/         # Login, Register, PIN Setup
│   │   │   │   ├── bindings/ # GetX dependency injection setup
│   │   │   │   ├── controllers/ # Presentation state logic (ViewModels)
│   │   │   │   └── views/    # Platform UI rendering (Screens / Forms)
│   │   │   ├── dashboard/
│   │   │   │   ├── bindings/
│   │   │   │   ├── controllers/
│   │   │   │   └── views/
│   │   │   ├── vault_item/   # View, Edit, Upload files
│   │   │   │   ├── bindings/
│   │   │   │   ├── controllers/
│   │   │   │   └── views/
│   │   │   └── settings/
│   │   │       ├── bindings/
│   │   │       ├── controllers/
│   │   │       └── views/
│   │   ├── routes/           # Unified route mappings
│   │   │   ├── app_pages.dart
│   │   │   └── app_routes.dart
│   │   └── core/             # Base abstractions & static assets
│   │       ├── theme/        # Colors, fonts, typography definition
│   │       ├── utils/        # Cryptographic utils (PointyCastle/SteelCrypt), Biometrics, File Picker
│   │       └── values/       # Const strings, api endpoints configurations
│   └── main.dart             # Application bootstrap & GetMaterialApp initialization
├── pubspec.yaml
└── README.md
```
