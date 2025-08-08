# Beauty Booking App

A mobile application similar to Uber for beauty and haircare services, connecting users with professional and amateur beauty service providers (hairstylists, nail techs, makeup artists, barbers, estheticians, etc.).

## Features

- **User Authentication**: Email/password and Google sign-in
- **Service Discovery**: Browse providers by location, service type, and price range
- **Booking System**: Schedule appointments with beauty service providers
- **Profile Management**: User and provider profiles with photos and details
- **Real-time Updates**: Live booking status and notifications
- **Favourites**: Save and manage favourite providers
- **Reviews & Ratings**: Rate and review service providers

## Project Structure

```
beauty-booking-app/
├── backend/                 # Firebase backend configuration
│   ├── functions/          # Cloud Functions (TypeScript)
│   │   ├── src/
│   │   │   └── index.ts    # API endpoints
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── firestore.rules     # Firestore security rules
│   ├── firestore.indexes.json # Firestore indexes
│   ├── storage.rules       # Storage security rules
│   ├── init-firebase.js    # Database initialization script
│   ├── API_DOCUMENTATION.md # Complete API documentation
│   ├── setup.md            # Setup guide
│   └── firebase.json       # Firebase configuration
├── mobile/                 # React Native mobile app
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── screens/        # App screens
│   │   ├── navigation/     # Navigation configuration
│   │   ├── services/       # API and Firebase services
│   │   │   ├── firebase.ts # Firebase configuration
│   │   │   └── api.ts      # API service layer
│   │   ├── hooks/          # Custom React hooks
│   │   ├── utils/          # Utility functions
│   │   └── types/          # TypeScript type definitions
│   ├── assets/             # Images, fonts, etc.
│   └── android/            # Android-specific files
└── docs/                   # Documentation
```

## Tech Stack

### Backend
- **Firebase Authentication**: User authentication
- **Firestore**: Database for users, providers, and bookings
- **Firebase Storage**: Profile images and media
- **Cloud Functions**: Serverless backend logic with Express.js
- **TypeScript**: Type safety for backend code

### Mobile App
- **React Native**: Cross-platform mobile development
- **TypeScript**: Type safety
- **React Navigation**: Navigation between screens
- **Firebase SDK**: Backend integration
- **React Native Elements**: UI components

## Data Models

### User
```typescript
{
  id: string;
  name: string;
  email: string;
  role: 'client' | 'provider';
  bookings: string[];
  favourites: string[];
  createdAt: Date;
  updatedAt?: Date;
}
```

### Provider
```typescript
{
  id: string;
  name: string;
  photoUrl: string;
  location: {
    city: string;
    lat: number;
    lng: number;
  };
  bio: string;
  categories: string[];
  services: Service[];
  availability: Availability;
  ratings: number;
  reviews: Review[];
  createdAt: Date;
}
```

### Service
```typescript
{
  name: string;
  price: number;
  category: string;
  durationMins: number;
}
```

### Booking
```typescript
{
  id: string;
  providerId: string;
  userId: string;
  service: {
    name: string;
    price: number;
  };
  date: Date;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
  createdAt: Date;
  updatedAt?: Date;
}
```

## API Endpoints

### User Management
- `POST /users` - Create user profile
- `GET /users/profile` - Get user profile
- `PUT /users/profile` - Update user profile

### Provider Management
- `GET /providers/category/{category}` - Get providers by category
- `GET /providers/filter` - Get providers with filters
- `GET /providers/{providerId}` - Get provider details

### Booking Management
- `POST /bookings` - Create booking
- `PATCH /bookings/{bookingId}/status` - Update booking status
- `GET /bookings/user` - Get user bookings
- `GET /bookings/provider` - Get provider bookings
- `GET /bookings/{bookingId}` - Get booking details

### Favourites
- `POST /users/favourites` - Update favourites

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- React Native CLI
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)
- Firebase CLI

### Backend Setup

1. **Install Firebase CLI**:
   ```bash
   npm install -g firebase-tools
   ```

2. **Setup Backend**:
   ```bash
   cd backend
   npm install
   firebase login
   firebase use [YOUR_PROJECT_ID]
   ```

3. **Deploy Backend**:
   ```bash
   # Deploy Firestore rules and indexes
   firebase deploy --only firestore:rules,firestore:indexes
   
   # Deploy Cloud Functions
   cd functions
   npm install
   npm run build
   cd ..
   firebase deploy --only functions
   
   # Initialize database with sample data
   node init-firebase.js
   ```

4. **Configure Service Account**:
   - Download service account key from Firebase Console
   - Rename to `serviceAccountKey.json` and place in `backend/` directory

### Mobile App Setup

1. **Setup Mobile App**:
   ```bash
   cd mobile
   npm install
   ```

2. **Configure Firebase**:
   - Add your Firebase project ID to the configuration files
   - Update Firebase configuration in `mobile/src/services/firebase.ts`
   - Update API base URL in `mobile/src/services/api.ts`

3. **Run the App**:
   ```bash
   npx react-native run-android  # For Android
   npx react-native run-ios      # For iOS
   ```

## Service Categories

The app supports the following beauty service categories:
- Hair (haircuts, coloring, styling)
- Nails (manicures, pedicures, nail art)
- Makeup (everyday, special occasion, bridal)
- Barber (men's haircuts, beard grooming)
- Esthetics (facials, skincare)
- Styling (blowouts, updos)
- Nail Art (designs, extensions)
- Bridal (wedding services)
- Beard (trimming, shaping)
- Waxing (eyebrows, body)

## Development

### Backend Development
```bash
cd backend
firebase emulators:start
```

### Mobile Development
```bash
cd mobile
npx react-native run-android  # For Android
npx react-native run-ios      # For iOS
```

## Deployment

### Backend Deployment
```bash
cd backend
firebase deploy
```

### Mobile App Deployment
- Follow React Native deployment guides for Android and iOS
- Configure app signing and certificates
- Submit to respective app stores

## API Documentation

Complete API documentation is available in `backend/API_DOCUMENTATION.md`, including:
- All endpoints with request/response examples
- Authentication requirements
- Error handling
- Usage examples

## Security

- Firebase Authentication for user management
- Firestore security rules for data access control
- CORS configuration for API access
- Rate limiting considerations for production

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License. 