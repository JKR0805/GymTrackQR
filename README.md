# IRONTRACK Gym Checkin (GymTrackQR)

IRONTRACK Gym Checkin is a robust, responsive web application designed to streamline gym attendance tracking using dynamically generated QR codes. Built on React and Firebase, the application provides separate workflows for gym administrators and gym members, ensuring secure and efficient access management without the need for specialized hardware.

## Table of Contents

- [Core Features](#core-features)
- [Technology Stack](#technology-stack)
- [Prerequisites](#prerequisites)
- [Local Development Setup](#local-development-setup)
- [Environment Configuration](#environment-configuration)
- [Firebase Setup Guide](#firebase-setup-guide)
- [Application Security](#application-security)
- [Deployment](#deployment)

## Core Features

### Administrator Workflows
- **Dashboard Overview:** Real-time analytics displaying total members, active memberships, and today's facility entries.
- **Dynamic QR Generation:** Administrators can generate, rotate, and download secure, time-sensitive QR codes that act as the physical entry point for the gym.
- **Member Management:** Full CRUD (Create, Read, Update, Delete) capabilities for user accounts, including setting membership expiry dates and toggling active/expired statuses.
- **Global Attendance Logs:** Comprehensive, filterable historical logs of all member check-ins and check-outs.

### Member Workflows
- **Mobile-Optimized Scanner:** A highly responsive, mobile-first QR scanning interface that utilizes the user's device camera to read the gym's physical QR code.
- **Automated Check-in/Check-out:** Seamlessly logs entry and exit times based on the user's current status when a valid QR code is scanned.
- **Personal Dashboard:** A summarized view of the user's own attendance history and membership standing.
- **Personal Logs:** A detailed, chronological history of the user's past visits.

## Technology Stack

- **Frontend Framework:** React 18
- **Build Tool:** Vite
- **Backend & Database:** Firebase (Cloud Firestore)
- **Authentication:** Firebase Authentication (Email/Password)
- **QR Code Generation:** qrcode
- **QR Code Scanning:** html5-qrcode
- **Styling:** Custom Vanilla CSS (Responsive, Mobile-First)

## Prerequisites

Before running this project, ensure you have the following installed:
- Node.js (v16.0.0 or higher recommended)
- npm (Node Package Manager)
- A Google Firebase Account

## Local Development Setup

1. **Clone the Repository**
   Navigate to the project directory in your terminal.

2. **Install Dependencies**
   Run the following command to install all necessary packages:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   Create a `.env` file in the root directory based on the provided `.env.example`. Detailed instructions are available in the [Environment Configuration](#environment-configuration) section below.

4. **Add Firebase Admin Credentials**
   For the database seeding script to work, place your Firebase `serviceAccountKey.json` file in the project root, or specify the exact path in your `.env` file using the `FIREBASE_SERVICE_ACCOUNT_PATH` variable.

5. **Seed the Database (Initial Setup)**
   Populate your Firestore database with the required administrative roles and sample users by running:
   ```bash
   npm run seed:firestore
   ```

6. **Start the Development Server**
   Launch the Vite development server:
   ```bash
   npm run dev
   ```
   The application will be accessible at `http://localhost:5173`.

## Environment Configuration

Create a `.env` file in the root directory of your project. This file must contain your Firebase client configuration details.

```env
VITE_FIREBASE_API_KEY="your_api_key_here"
VITE_FIREBASE_AUTH_DOMAIN="your_project_id.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="your_project_id"
VITE_FIREBASE_STORAGE_BUCKET="your_project_id.appspot.com"
VITE_FIREBASE_MESSAGING_SENDER_ID="your_messaging_sender_id"
VITE_FIREBASE_APP_ID="your_app_id"
VITE_FIREBASE_MEASUREMENT_ID="your_measurement_id"

# Optional: Set this if your service account key is located elsewhere
FIREBASE_SERVICE_ACCOUNT_PATH="./serviceAccountKey.json"
```

## Firebase Setup Guide

To ensure the application functions correctly, you must configure your Firebase project with the following settings:

1. **Authentication:**
   - Navigate to Authentication > Sign-in method.
   - Enable the "Email/Password" provider.
   - Under Settings > Authorized Domains, ensure your production domains (and `localhost`) are listed.

2. **Firestore Database:**
   - Create a new Firestore database.
   - Ensure the database is operating in Native mode.
   - Apply the security rules defined in the `firestore.rules` file located in the root of this repository. These rules enforce role-based access control and protect sensitive user data.

## Application Security

The application utilizes a secure, rotating QR payload system. 
- The generated QR codes do not contain static URLs. Instead, they contain a unique, rotatable token payload.
- When a member scans the code, the client verifies the token against the active token stored securely in Firestore.
- Firestore Security Rules strictly prohibit members from reading the raw QR tokens directly, preventing malicious actors from cloning the code remotely. The token validation is handled securely.

## Deployment

To prepare the application for production deployment, run the build command:

```bash
npm run build
```

This will generate an optimized, minified production build in the `dist` directory. You can deploy this directory to any static hosting provider, such as Vercel, Netlify, or Firebase Hosting. Ensure that you have appropriately configured your environment variables in your hosting provider's dashboard prior to deployment.