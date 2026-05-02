# Deployment checklist for GymTrackQR

This project uses Vite for the frontend and Firebase Cloud Functions for server-side signing and validation. Before deploying the frontend to Vercel, complete these steps:

1. Configure Firebase

- Create a Firebase project and enable Firestore and Authentication (Email/Password).
- Create an initial `qrCodes/active` document via the Admin UI or Firestore console, or use the admin UI `Create QR` button.
- (Optional but recommended) Set a signing secret in Functions environment: `firebase functions:config:set gym.signing_secret="your-secret"`.

2. Deploy Firebase Cloud Functions

- Install function deps:

```bash
cd functions
npm install
```

- Deploy functions:

```bash
firebase deploy --only functions
```

- Note the function URLs for `generateSignedQr` and `validateScan` if you don't use Hosting rewrites.

3. Set Vercel environment variables

In your Vercel project settings, set the following environment variables (Production):

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

If you deployed functions and prefer direct URLs, also set:

- `VITE_GENERATE_QR_URL` = full URL to `generateSignedQr`
- `VITE_VALIDATE_SCAN_URL` = full URL to `validateScan`

If you leave these empty and instead host Firebase Hosting + Functions together, add rewrites in `firebase.json` to proxy `/generateSignedQr` and `/validateScan` to the Functions.

4. Build & Deploy to Vercel

- Vercel build command: `npm run build`
- Output directory: `dist`

5. Post-deploy verification

- In Admin → Gym QR Access: generate/rotate QR and save gym location.
- In Member: scan QR within ~60s and verify entry/exit.
- Check Admin Dashboard active sessions and exported CSV.

6. Security recommendations

- Store signing secret server-side only (Functions config or KMS).
- Use the `validateScan` Cloud Function for recording attendance (already wired as preferred path). Do not rely solely on client-side recording in production.

If you want, I can:
- Add `firebase.json` with hosting rewrites for an integrated Firebase hosting deploy flow.
- Add a small Vercel-specific `vercel.json` if you prefer API routes on Vercel (but you'd still need to host the signing logic somewhere secure).

