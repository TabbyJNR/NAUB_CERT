# Firebase + Cloud Firestore Configuration Guide

This guide gives you:

1. A **complete checklist** of Firebase and Firestore configuration values you will typically need.
2. A **step-by-step tutorial** showing exactly where to find each setting in the Firebase Console and Google Cloud Console.
3. Copy/paste-ready examples for web and server environments.

---

## 1) Complete configuration checklist

Use this as your master list.

### A. Firebase project-level basics

- **Firebase Project ID** (example: `my-app-prod`)
- **Project Number** (numeric GCP project number)
- **Project Name** (display name)
- **Default GCP resource location** (if configured)

### B. Firebase app config (client SDK)

When you register an app in Firebase (Web, Android, iOS), Firebase generates an app-specific config.

For **Web** apps, you need:

- `apiKey`
- `authDomain`
- `projectId`
- `storageBucket`
- `messagingSenderId`
- `appId`
- `measurementId` (if Analytics enabled)

For **Android** apps, you need:

- `google-services.json` file
- `project_info.project_id`
- `project_info.project_number`
- `client[*].client_info.mobilesdk_app_id`
- `client[*].api_key[*].current_key`

For **iOS** apps, you need:

- `GoogleService-Info.plist` file
- `PROJECT_ID`
- `GCM_SENDER_ID`
- `GOOGLE_APP_ID`
- `API_KEY`
- `BUNDLE_ID`

### C. Firestore database configuration

- **Database location/region** (ex: `us-central1`, `nam5`, etc.)
- **Database mode**: Native mode (recommended for Firebase)
- **Database ID** (default is `(default)`)
- **Deletion protection status** (if enabled)

### D. Firestore security and access control

- **Firestore Security Rules**
- **Rules publish history/version**
- **Test mode vs locked mode status**
- **IAM roles for admins/backend services**, such as:
  - `roles/datastore.owner`
  - `roles/datastore.user`
  - `roles/firebase.admin`
  - least-privilege custom roles where possible

### E. Authentication-related settings (often required with Firestore)

- Enabled sign-in providers (Email/Password, Google, etc.)
- Authorized domains
- Multi-factor auth settings (if used)
- User claims strategy (if using custom claims for rules)

### F. Service account / server-side credentials

- Service account email (for backend service)
- Service account key JSON (avoid if possible; prefer workload identity)
- Environment variable for credentials (if key-based auth is used):
  - `GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json`
- Admin SDK project linkage (`project_id`)

### G. Firestore indexes and query support

- Composite indexes
- Single field index exemptions/overrides
- Vector indexes (if used)
- Index build status (important before production queries)

### H. Firestore data governance + operations

- Backup strategy / export schedule
- PITR / backup retention (if enabled in your setup)
- TTL policies (if used)
- Monitoring and alert policies
- Quotas and budget alerts

### I. Local development config (emulators)

- `FIRESTORE_EMULATOR_HOST` (example: `127.0.0.1:8080`)
- `FIREBASE_AUTH_EMULATOR_HOST` (if auth emulator used)
- `GCLOUD_PROJECT` / `GOOGLE_CLOUD_PROJECT`
- `firebase.json` emulator ports

---

## 2) Step-by-step tutorial: where to find each config

## Step 1: Open your Firebase project

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Select your project.

---

## Step 2: Get your Web app Firebase config

1. In Firebase Console, click **Project settings** (gear icon).
2. Under **Your apps**, choose your Web app (`</>` icon).
3. In **SDK setup and configuration**, choose **Config**.
4. Copy the config object.

You will see something like:

```js
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...firebaseapp.com",
  projectId: "...",
  storageBucket: "...appspot.com",
  messagingSenderId: "...",
  appId: "...",
  measurementId: "G-..."
};
```

> Note: `apiKey` in Firebase client config is not a secret by itself, but you should still apply API restrictions in Google Cloud where appropriate.

---

## Step 3: Download Android/iOS app config files

### Android

1. Firebase Console → **Project settings**.
2. Under **Your apps**, select Android app.
3. Download **google-services.json**.

### iOS

1. Firebase Console → **Project settings**.
2. Under **Your apps**, select iOS app.
3. Download **GoogleService-Info.plist**.

Store these securely in your app source locations and do not expose private keys.

---

## Step 4: Access Firestore core database settings

1. Firebase Console → **Build** → **Firestore Database**.
2. Open the **Data** tab (database view).
3. Open **Usage** / **Rules** / **Indexes** tabs for operational settings.
4. For location and low-level settings, click into linked Google Cloud resources when shown.

If not yet created, click **Create database** and select:

- **Production mode** (recommended for real apps)
- **Region/location** closest to users and compliance needs

---

## Step 5: Review and edit Firestore Security Rules

1. Firestore Database → **Rules** tab.
2. Review existing rules.
3. Click **Publish** after updates.

Example starter (authenticated read/write, customize further):

```rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

Important: Never leave broad `allow read, write: if true;` rules in production.

---

## Step 6: Configure Firestore indexes

1. Firestore Database → **Indexes** tab.
2. Create required **Composite indexes** for multi-field queries.
3. Monitor status until index build completes.

When a query needs an index, Firebase typically provides a direct “Create index” link in the error output.

---

## Step 7: Configure IAM for admins/backends

1. Go to [https://console.cloud.google.com](https://console.cloud.google.com)
2. Ensure the same project is selected.
3. Open **IAM & Admin** → **IAM**.
4. Assign least-privilege roles for users/service accounts that access Firestore.

Common pattern:

- CI/CD deploy account with narrow deploy roles
- Backend runtime service account with data read/write only where needed
- Human admin users with temporary elevated access

---

## Step 8: Get service account credentials (server-side)

Preferred: use Workload Identity / attached service accounts (no key files).

If key file is absolutely required:

1. Cloud Console → **IAM & Admin** → **Service Accounts**.
2. Select service account.
3. **Keys** → **Add key** → **Create new key** → JSON.
4. Store securely (secret manager, not in git).

Set env var (Linux/macOS):

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/secure/path/service-account.json"
```

---

## Step 9: Configure local emulator environment

If developing locally:

```bash
export FIRESTORE_EMULATOR_HOST="127.0.0.1:8080"
export FIREBASE_AUTH_EMULATOR_HOST="127.0.0.1:9099"
export GOOGLE_CLOUD_PROJECT="your-project-id"
```

And in `firebase.json` define emulator ports for consistency across team members.

---

## Step 10: Validate end-to-end access

Checklist:

- App initializes Firebase successfully.
- Auth sign-in works.
- Firestore read test succeeds.
- Firestore write test succeeds.
- Rules block unauthorized requests.
- Required indexes are built.
- Logs/monitoring show no permission errors.

---

## 3) Recommended `.env` templates

### Client (Web)

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...
```

### Server (Admin SDK)

```env
GOOGLE_CLOUD_PROJECT=your-project-id
# Prefer workload identity. If using key file:
GOOGLE_APPLICATION_CREDENTIALS=/secure/path/service-account.json
```

---

## 4) Security best practices (do this early)

- Use **Firestore Security Rules** as primary data boundary.
- Use least-privilege IAM roles.
- Avoid long-lived service account keys.
- Keep secrets in Secret Manager / CI secrets, never in git.
- Add budget + quota alerts to avoid surprise costs.
- Test rules with emulator before production deploys.

---

## 5) Quick troubleshooting map

- **`Missing or insufficient permissions`**
  - Check Firestore rules and authenticated user context.
- **`The query requires an index`**
  - Create suggested index and wait for build.
- **`Could not load default credentials`** (server)
  - Verify `GOOGLE_APPLICATION_CREDENTIALS` or runtime attached service account.
- **Wrong project data appearing**
  - Verify `projectId` in client config and server `GOOGLE_CLOUD_PROJECT`.
- **Works locally but fails in production**
  - Compare runtime service account IAM roles and deployed env vars.

---

## 6) What to collect and store in your team runbook

At minimum, document:

- Firebase project ID + environment mapping (dev/stage/prod)
- App config source of truth location
- Firestore rules ownership + review policy
- Service account ownership + rotation policy
- Index change process
- Incident/debug checklist

This becomes your operational “single source of truth” for Firebase + Firestore access and configuration.
