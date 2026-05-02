# IRONTRACK Gym Checkin (GymTrackQR)

IRONTRACK Gym Checkin is a production-ready, highly secure web application designed to manage gym attendance through dynamic, cryptographically signed QR codes. Built with React and Firebase, the application enforces stringent access control through server-side validation, short-lived rotating QR payloads, and geolocation boundaries. 

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Core Features](#core-features)
- [Technology Stack](#technology-stack)
- [Security Model](#security-model)
- [Prerequisites](#prerequisites)
- [Local Development Setup](#local-development-setup)
- [Environment Configuration](#environment-configuration)
- [Firebase & Cloud Functions Setup](#firebase--cloud-functions-setup)
- [Deployment](#deployment)

## Architecture Overview

The system operates on a highly decoupled client-server architecture:
- **Client (React):** Handles UI, camera-based QR scanning (`html5-qrcode`), location services, and basic state management.
- **Backend (Firebase Cloud Functions):** Enforces all critical business logic. It handles the generation of cryptographically signed payloads, time-window validation, and geolocation verification to ensure the client cannot spoof check-ins.
- **Database (Firestore):** Stores member profiles, attendance logs, and active token states. It is protected by strict Security Rules ensuring users can only read/write their own data.

## Core Features

### Administrator Workflows
- **Dynamic QR Management:** Generates rotating QR codes that auto-refresh every 30 seconds. Payloads contain a timestamp and a signature.
- **Master QR Code:** Administrators can generate and download a static, non-expiring "Master QR" intended for physical printing on the gym wall. This remains valid until the administrative token is manually rotated.
- **Geofencing:** Integration with Leaflet maps allows administrators to define a specific GPS coordinate and radius (e.g., 200 meters). Scans occurring outside this radius are rejected.
- **Attendance & Member Management:** Full dashboard for viewing real-time active sessions, historic logs, and member subscription statuses (Active/Expired).

### Member Workflows
- **Mobile Scanner Interface:** A responsive, portrait-optimized camera scanner that requests geolocation permissions upon use.
- **Member Dashboard:** Displays real-time membership validity, days remaining, and a weekly calendar view of attendance.
- **Automated Logging:** The system automatically determines if a scan is an entry or an exit based on the member's current active session.

## Technology Stack

- **Frontend:** React 18, Vite, Vanilla CSS (Mobile-First)
- **Backend Environment:** Firebase Cloud Functions (Node.js)
- **Database & Auth:** Cloud Firestore, Firebase Authentication
- **Mapping & Geolocation:** Leaflet
- **QR Operations:** `qrcode` (generation), `html5-qrcode` (scanning)
- **Cryptography:** Native Node.js `crypto` (SHA-256 hashing)

## Security Model

The application mitigates common QR vulnerabilities (such as screenshot sharing or replay attacks) through the following mechanisms:

1. **Short-Lived Payloads:** The Admin dashboard automatically refreshes the QR code every 30 seconds.
2. **Server-Side Signature Validation:** The QR payload contains `t` (timestamp) and `s` (SHA-256 signature). When scanned, the Cloud Function recalculates the signature using a secure server-side token. If the signature is invalid or the timestamp is older than 60 seconds, the check-in is rejected.
3. **Master QR Sentinel:** The Master QR uses `t=0` as a sentinel value. While it bypasses the 60-second time check, it still requires a valid signature tied to the current active token.
4. **Geolocation Gate:** If geofencing is enabled by the admin, the client must submit their GPS coordinates during the scan. The Cloud Function verifies the Haversine distance before approving the scan.

## Prerequisites

- Node.js (v18.0.0 or higher recommended for Cloud Functions)
- npm
- Firebase CLI (`npm install -g firebase-tools`)
- A Google Firebase Account on the **Blaze (Pay-as-you-go)** plan (required for Cloud Functions).

## Local Development Setup

1. **Clone the Repository**
   Navigate to the project directory in your terminal.

2. **Install Frontend Dependencies**
   ```bash
   npm install
   ```

3. **Install Backend Dependencies**
   ```bash
   cd functions
   npm install
   cd ..
   ```

4. **Environment Variables**
   Create a `.env` file in the root directory based on `.env.example`.

5. **Start the Development Server**
   ```bash
   npm run dev
   ```

## Environment Configuration

Create a `.env` file in the root directory. Ensure it contains your Firebase client configuration and the URLs for your deployed Cloud Functions.

```env
VITE_FIREBASE_API_KEY="your_api_key_here"
VITE_FIREBASE_AUTH_DOMAIN="your_project_id.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="your_project_id"
VITE_FIREBASE_STORAGE_BUCKET="your_project_id.appspot.com"
VITE_FIREBASE_MESSAGING_SENDER_ID="your_messaging_sender_id"
VITE_FIREBASE_APP_ID="your_app_id"

# Cloud Function Endpoints
VITE_GENERATE_QR_URL="https://us-central1-your-project.cloudfunctions.net/generateQrPayload"
VITE_VALIDATE_SCAN_URL="https://us-central1-your-project.cloudfunctions.net/validateScan"

```

## Firebase & Cloud Functions Setup

1. **Firestore Rules & Indexes:**
   Deploy the security rules and required composite indexes:
   ```bash
   firebase deploy --only firestore
   ```
   *Note: If queries fail during testing, check the Firebase Console logs to build the exact composite indexes requested via the provided URL.*

2. **Deploy Cloud Functions:**
   The backend validation logic must be deployed to Firebase.
   ```bash
   firebase deploy --only functions
   ```

3. **Authentication:**
   Enable "Email/Password" provider in the Firebase Authentication console.

## Deployment

To prepare the frontend for production deployment:

```bash
npm run build
```

This generates an optimized build in the `dist` directory. You can deploy this via Vercel, Netlify, or Firebase Hosting. If deploying to Vercel, the included `vercel.json` ensures that client-side routing falls back to `index.html` seamlessly. Ensure all `VITE_` prefixed environment variables are added to your hosting provider's dashboard.