# Getting Your Firebase Configuration

To complete the setup, you need to get your Firebase configuration from the Firebase Console.

## Step 1: Access Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `beauty-booking-app-68f00`

## Step 2: Get Web App Configuration

1. Click on the **gear icon** (⚙️) next to "Project Overview" to open Project Settings
2. Scroll down to the **"Your apps"** section
3. If you don't see a web app, click the **web icon** (</>) to add one
4. Give it a name like "Beauty Booking Web"
5. Copy the configuration object that looks like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyC...",
  authDomain: "beauty-booking-app-68f00.firebaseapp.com",
  projectId: "beauty-booking-app-68f00",
  storageBucket: "beauty-booking-app-68f00.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef..."
};
```

## Step 3: Update Mobile App Configuration

1. Open `mobile/src/services/firebase.ts`
2. Replace the placeholder configuration with your actual config:

```typescript
const firebaseConfig = {
  apiKey: "YOUR_ACTUAL_API_KEY",
  authDomain: "beauty-booking-app-68f00.firebaseapp.com",
  projectId: "beauty-booking-app-68f00",
  storageBucket: "beauty-booking-app-68f00.appspot.com",
  messagingSenderId: "YOUR_ACTUAL_SENDER_ID",
  appId: "YOUR_ACTUAL_APP_ID"
};
```

## Step 4: Enable Authentication Methods

1. In Firebase Console, go to **Authentication** → **Sign-in method**
2. Enable **Email/Password**
3. Enable **Google** (you'll need to configure OAuth consent screen)

## Step 5: Create Firestore Database

1. Go to **Firestore Database**
2. Click **Create database**
3. Choose **Start in production mode**
4. Select a location close to your users

## Step 6: Enable Storage

1. Go to **Storage**
2. Click **Get started**
3. Choose **Start in production mode**
4. Select the same location as your Firestore database

## Step 7: Enable Cloud Functions

1. Go to **Functions**
2. Click **Get started**
3. Choose a location (same as database)
4. Wait for the setup to complete

## Step 8: Run the Initialization Script

Now you can run the Firebase initialization script:

```bash
cd backend
node init-firebase.js
```

This will:
- Deploy Firestore rules and indexes
- Deploy Storage rules
- Build and deploy Cloud Functions

## Step 9: Test the Setup

1. Install mobile app dependencies:
   ```bash
   cd mobile
   npm install
   ```

2. Run the app:
   ```bash
   npx react-native run-android  # For Android
   npx react-native run-ios      # For iOS
   ```

## Troubleshooting

If you encounter issues:

1. **Firebase CLI not found**: Install with `npm install -g firebase-tools`
2. **Not logged in**: Run `firebase login`
3. **Project not found**: Verify your project ID in Firebase Console
4. **Permission errors**: Make sure you're the owner or have admin access to the project

## Security Note

⚠️ **Important**: Never commit your Firebase configuration with real API keys to version control. Consider using environment variables for production apps. 