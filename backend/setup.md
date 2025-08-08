# Firebase Backend Setup Guide

## Prerequisites

1. **Node.js** (v16 or higher)
2. **Firebase CLI** installed globally:
   ```bash
   npm install -g firebase-tools
   ```
3. **Firebase project** created in Firebase Console
4. **Service account key** downloaded from Firebase Console

## Setup Steps

### 1. Initialize Firebase Project

```bash
cd backend
firebase login
firebase use [YOUR_PROJECT_ID]
```

### 2. Install Dependencies

```bash
# Install backend dependencies
npm install

# Install Cloud Functions dependencies
cd functions
npm install
cd ..
```

### 3. Configure Service Account

1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate new private key"
3. Download the JSON file
4. Rename it to `serviceAccountKey.json` and place it in the `backend/` directory

### 4. Deploy Firestore Rules and Indexes

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

### 5. Build and Deploy Cloud Functions

```bash
cd functions
npm run build
cd ..
firebase deploy --only functions
```

### 6. Initialize Database with Sample Data

```bash
node init-firebase.js
```

This will populate your Firestore database with:
- 5 sample providers (hairstylist, nail tech, makeup artist, barber, esthetician)
- 3 sample users
- 3 sample bookings

### 7. Deploy Storage Rules (Optional)

```bash
firebase deploy --only storage
```

## Project Structure

```
backend/
├── functions/
│   ├── src/
│   │   └── index.ts          # Cloud Functions
│   ├── package.json
│   └── tsconfig.json
├── firestore.rules           # Firestore security rules
├── firestore.indexes.json    # Firestore indexes
├── storage.rules             # Storage security rules
├── init-firebase.js          # Database initialization script
├── serviceAccountKey.json    # Firebase service account (not in git)
└── firebase.json             # Firebase configuration
```

## API Endpoints

After deployment, your API will be available at:
```
https://us-central1-[YOUR_PROJECT_ID].cloudfunctions.net/api
```

### Available Endpoints

#### User Management
- `POST /users` - Create user profile
- `GET /users/profile` - Get user profile
- `PUT /users/profile` - Update user profile

#### Provider Management
- `GET /providers/category/{category}` - Get providers by category
- `GET /providers/filter` - Get providers with filters
- `GET /providers/{providerId}` - Get provider details

#### Booking Management
- `POST /bookings` - Create booking
- `PATCH /bookings/{bookingId}/status` - Update booking status
- `GET /bookings/user` - Get user bookings
- `GET /bookings/provider` - Get provider bookings
- `GET /bookings/{bookingId}` - Get booking details

#### Favourites
- `POST /users/favourites` - Update favourites

## Testing the API

### Using cURL

```bash
# Get providers by category
curl -X GET "https://us-central1-[YOUR_PROJECT_ID].cloudfunctions.net/api/providers/category/Hair"

# Create a booking (requires auth token)
curl -X POST "https://us-central1-[YOUR_PROJECT_ID].cloudfunctions.net/api/bookings" \
  -H "Authorization: Bearer [FIREBASE_ID_TOKEN]" \
  -H "Content-Type: application/json" \
  -d '{
    "providerId": "provider1",
    "service": {
      "name": "Haircut & Style",
      "price": 75
    },
    "date": "2024-01-20T10:00:00Z",
    "notes": "Test booking"
  }'
```

### Using Postman

1. Import the API collection (if available)
2. Set the base URL to your Firebase Functions URL
3. Add Firebase ID token to Authorization header
4. Test the endpoints

## Environment Variables

The Cloud Functions use the following environment variables (automatically set by Firebase):

- `GOOGLE_CLOUD_PROJECT` - Your Firebase project ID
- `FIREBASE_CONFIG` - Firebase configuration

## Monitoring and Logs

### View Function Logs

```bash
firebase functions:log
```

### Monitor in Firebase Console

1. Go to Firebase Console → Functions
2. View function execution logs
3. Monitor performance and errors

## Security Considerations

1. **Service Account Key**: Keep `serviceAccountKey.json` secure and never commit to git
2. **Firestore Rules**: Review and customize security rules as needed
3. **API Keys**: The API uses Firebase Authentication for security
4. **Rate Limiting**: Consider implementing rate limiting for production

## Troubleshooting

### Common Issues

1. **Function deployment fails**:
   - Check Node.js version (should be 16+)
   - Ensure all dependencies are installed
   - Check Firebase CLI is up to date

2. **Database initialization fails**:
   - Verify service account key is correct
   - Check Firestore rules allow write access
   - Ensure project ID is correct

3. **API returns 401 errors**:
   - Verify Firebase Authentication is enabled
   - Check that ID tokens are valid
   - Ensure user is authenticated

4. **CORS errors**:
   - CORS is enabled for all origins in development
   - For production, configure specific origins

### Getting Help

1. Check Firebase Console for error logs
2. Review Cloud Functions logs
3. Test with Firebase Emulator Suite for local development

## Next Steps

1. **Update Mobile App**: Configure the mobile app to use your Firebase project
2. **Add Real Data**: Replace sample data with real providers and users
3. **Implement Notifications**: Add push notifications for booking updates
4. **Add Payment Integration**: Integrate payment processing
5. **Performance Optimization**: Add caching and optimize queries
6. **Monitoring**: Set up error tracking and analytics

## Production Checklist

- [ ] Deploy to production Firebase project
- [ ] Configure custom domain (optional)
- [ ] Set up monitoring and alerting
- [ ] Implement rate limiting
- [ ] Add comprehensive error handling
- [ ] Set up backup and recovery procedures
- [ ] Configure security headers
- [ ] Test all endpoints thoroughly
- [ ] Document API for team members 