# GymTrackQR

Gym attendance web app built with React, Vite, Firebase Auth, and Firestore.

## Features

- Role-based login (admin and member)
- Admin member management (add, view, edit, delete)
- Admin QR generation and PNG download
- Member camera QR scanning for check-in/check-out
- Attendance logs for members and admins

## Tech Stack

- React 18
- Vite
- Firebase Auth
- Cloud Firestore
- html5-qrcode
- qrcode

## Local Setup

1. Install dependencies

   npm install

2. Configure environment variables

   Create or update [.env](.env) with:

   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   VITE_FIREBASE_MEASUREMENT_ID=...

3. Add Firebase Admin credentials for seeding

   Place serviceAccountKey.json in the project root, or set FIREBASE_SERVICE_ACCOUNT_PATH in [.env](.env).

4. Seed users and sample data

   npm run seed:firestore

5. Run development server

   npm run dev

## Firebase Checklist

- Enable Authentication -> Email/Password
- Create Firestore database (Native mode)
- Publish rules from [firestore.rules](firestore.rules)
- Add your host domain to Firebase Authentication Authorized Domains

## Build

npm run build