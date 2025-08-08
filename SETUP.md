# Beauty Booking App Setup Guide

This guide will help you set up the Beauty Booking App with Firebase backend and React Native mobile app.

## Prerequisites

Before starting, make sure you have the following installed:

- **Node.js** (v16 or higher)
- **npm** or **yarn**
- **Firebase CLI**: `npm install -g firebase-tools`
- **React Native CLI**: `npm install -g @react-native-community/cli`
- **Android Studio** (for Android development)
- **Xcode** (for iOS development, macOS only)

## Step 1: Firebase Project Setup

1. **Create a Firebase Project**:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Click "Add project"
   - Enter your project name (e.g., "beauty-booking-app")
   - Follow the setup wizard

2. **Enable Firebase Services**:
   - **Authentication**: Enable Email/Password and Google Sign-in
   - **Firestore Database**: Create database in production mode
   - **Storage**: Create storage bucket
   - **Functions**: Enable Cloud Functions

3. **Get Firebase Configuration**:
   - Go to Project Settings
   - Scroll down to "Your apps"
   - Click the web app icon (</>) to add a web app
   - Copy the configuration object

## Step 2: Backend Setup

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Login to Firebase**:
   ```bash
   firebase login
   ```

4. **Initialize Firebase project**:
   ```bash
   firebase use YOUR_PROJECT_ID
   ```

5. **Update Firebase configuration**:
   - Replace `YOUR_FIREBASE_PROJECT_ID` in `backend/.firebaserc` with your actual project ID

6. **Deploy Firebase configuration**:
   ```bash
   firebase deploy --only firestore:rules,storage:rules
   ```

7. **Setup Cloud Functions**:
   ```bash
   cd functions
   npm install
   npm run build
   cd ..
   firebase deploy --only functions
   ```

## Step 3: Mobile App Setup

1. **Navigate to mobile directory**:
   ```bash
   cd mobile
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Update Firebase configuration**:
   - Open `src/services/firebase.ts`
   - Replace the `firebaseConfig` object with your actual Firebase configuration

4. **Install additional dependencies** (if needed):
   ```bash
   npm install babel-plugin-module-resolver --save-dev
   ```

## Step 4: Platform-Specific Setup

### Android Setup

1. **Install Android Studio** and Android SDK
2. **Set up environment variables**:
   ```bash
   export ANDROID_HOME=$HOME/Library/Android/sdk
   export PATH=$PATH:$ANDROID_HOME/emulator
   export PATH=$PATH:$ANDROID_HOME/tools
   export PATH=$PATH:$ANDROID_HOME/tools/bin
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   ```

3. **Create Android Virtual Device (AVD)** or connect physical device

4. **Run the app**:
   ```bash
   npx react-native run-android
   ```

### iOS Setup (macOS only)

1. **Install Xcode** from App Store
2. **Install CocoaPods**:
   ```bash
   sudo gem install cocoapods
   ```

3. **Install iOS dependencies**:
   ```bash
   cd ios && pod install && cd ..
   ```

4. **Run the app**:
   ```bash
   npx react-native run-ios
   ```

## Step 5: Environment Configuration

### Backend Environment Variables

Create a `.env` file in the `backend` directory:
```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email
```

### Mobile App Configuration

Update the following files with your Firebase configuration:

1. **`mobile/src/services/firebase.ts`**:
   ```typescript
   const firebaseConfig = {
     apiKey: "your-api-key",
     authDomain: "your-project-id.firebaseapp.com",
     projectId: "your-project-id",
     storageBucket: "your-project-id.appspot.com",
     messagingSenderId: "your-sender-id",
     appId: "your-app-id"
   };
   ```

## Step 6: Testing the Setup

1. **Test Backend**:
   ```bash
   cd backend
   firebase emulators:start
   ```

2. **Test Mobile App**:
   - Run the app on your device/emulator
   - Try to sign up/sign in
   - Test basic navigation

## Step 7: Development Workflow

### Backend Development
```bash
cd backend
firebase emulators:start  # Start local development
```

### Mobile Development
```bash
cd mobile
npx react-native start    # Start Metro bundler
npx react-native run-android  # Run on Android
npx react-native run-ios      # Run on iOS
```

## Troubleshooting

### Common Issues

1. **Metro bundler issues**:
   ```bash
   npx react-native start --reset-cache
   ```

2. **Android build issues**:
   ```bash
   cd android && ./gradlew clean && cd ..
   ```

3. **iOS build issues**:
   ```bash
   cd ios && pod deintegrate && pod install && cd ..
   ```

4. **Firebase connection issues**:
   - Verify Firebase configuration
   - Check network connectivity
   - Ensure Firebase services are enabled

### Getting Help

- Check the [React Native documentation](https://reactnative.dev/docs/getting-started)
- Check the [Firebase documentation](https://firebase.google.com/docs)
- Review the project's README.md for additional information

## Next Steps

After successful setup:

1. **Implement remaining screens** in the mobile app
2. **Add more Cloud Functions** for advanced features
3. **Implement push notifications**
4. **Add payment integration**
5. **Set up CI/CD pipeline**
6. **Add testing framework**

## Support

If you encounter any issues during setup, please:

1. Check the troubleshooting section above
2. Review the error logs carefully
3. Ensure all prerequisites are properly installed
4. Verify Firebase configuration is correct

Happy coding! 🎉 