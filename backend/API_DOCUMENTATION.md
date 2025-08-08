# Beauty Booking App API Documentation

## Overview

This API provides backend services for a beauty booking mobile app that connects clients with beauty service providers (hairstylists, nail techs, makeup artists, barbers, etc.).

## Base URL

```
https://us-central1-beauty-booking-app-68f00.cloudfunctions.net/api
```

## Authentication

All endpoints require Firebase Authentication. Include the Firebase ID token in the Authorization header:

```
Authorization: Bearer <firebase_id_token>
```

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

## Endpoints

### User Management

#### Create User Profile
**POST** `/users`

Creates a new user profile after authentication.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "role": "client"
}
```

**Response:**
```json
{
  "id": "user123",
  "name": "John Doe",
  "email": "john@example.com",
  "role": "client",
  "bookings": [],
  "favourites": [],
  "createdAt": "2024-01-15T10:00:00Z"
}
```

#### Get User Profile
**GET** `/users/profile`

Retrieves the current user's profile.

**Response:**
```json
{
  "id": "user123",
  "name": "John Doe",
  "email": "john@example.com",
  "role": "client",
  "bookings": ["booking1", "booking2"],
  "favourites": ["provider1", "provider2"],
  "createdAt": "2024-01-15T10:00:00Z"
}
```

#### Update User Profile
**PUT** `/users/profile`

Updates the current user's profile.

**Request Body:**
```json
{
  "name": "John Smith",
  "role": "provider"
}
```

**Response:**
```json
{
  "id": "user123",
  "name": "John Smith",
  "email": "john@example.com",
  "role": "provider",
  "bookings": ["booking1", "booking2"],
  "favourites": ["provider1", "provider2"],
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-16T15:30:00Z"
}
```

### Provider Management

#### Get Providers by Category
**GET** `/providers/category/{category}`

Retrieves providers filtered by service category.

**Query Parameters:**
- `latitude` (optional): User's latitude for distance filtering
- `longitude` (optional): User's longitude for distance filtering
- `radius` (optional): Search radius in kilometers (default: 10)
- `minPrice` (optional): Minimum service price
- `maxPrice` (optional): Maximum service price

**Example:**
```
GET /providers/category/Hair?latitude=40.7128&longitude=-74.0060&radius=5&minPrice=50&maxPrice=150
```

**Response:**
```json
[
  {
    "id": "provider1",
    "name": "Sarah Johnson",
    "photoUrl": "https://example.com/photo.jpg",
    "location": {
      "city": "New York",
      "lat": 40.7128,
      "lng": -74.0060
    },
    "bio": "Professional hairstylist...",
    "categories": ["Hair", "Styling"],
    "services": [
      {
        "name": "Haircut & Style",
        "price": 75,
        "category": "Hair",
        "durationMins": 60
      }
    ],
    "availability": {
      "monday": {"start": "09:00", "end": "17:00"},
      "tuesday": {"start": "09:00", "end": "17:00"}
    },
    "ratings": 4.8,
    "reviews": [...],
    "createdAt": "2024-01-15T10:00:00Z"
  }
]
```

#### Get Providers with Filters
**GET** `/providers/filter`

Retrieves providers with advanced filtering options.

**Query Parameters:**
- `category` (optional): Service category
- `minPrice` (optional): Minimum service price
- `maxPrice` (optional): Maximum service price
- `latitude` (optional): User's latitude
- `longitude` (optional): User's longitude
- `radius` (optional): Search radius in kilometers

**Example:**
```
GET /providers/filter?category=Hair&minPrice=50&maxPrice=150&latitude=40.7128&longitude=-74.0060&radius=10
```

#### Get Provider Details
**GET** `/providers/{providerId}`

Retrieves detailed information about a specific provider.

**Response:**
```json
{
  "id": "provider1",
  "name": "Sarah Johnson",
  "photoUrl": "https://example.com/photo.jpg",
  "location": {
    "city": "New York",
    "lat": 40.7128,
    "lng": -74.0060
  },
  "bio": "Professional hairstylist with 10+ years of experience...",
  "categories": ["Hair", "Styling"],
  "services": [...],
  "availability": {...},
  "ratings": 4.8,
  "reviews": [...],
  "createdAt": "2024-01-15T10:00:00Z"
}
```

### Booking Management

#### Create Booking
**POST** `/bookings`

Creates a new booking.

**Request Body:**
```json
{
  "providerId": "provider1",
  "service": {
    "name": "Haircut & Style",
    "price": 75
  },
  "date": "2024-01-20T10:00:00Z",
  "notes": "Please bring reference photos"
}
```

**Response:**
```json
{
  "id": "booking1",
  "providerId": "provider1",
  "userId": "user123",
  "service": {
    "name": "Haircut & Style",
    "price": 75
  },
  "date": "2024-01-20T10:00:00Z",
  "status": "pending",
  "notes": "Please bring reference photos",
  "createdAt": "2024-01-15T10:00:00Z"
}
```

#### Update Booking Status
**PATCH** `/bookings/{bookingId}/status`

Updates the status of a booking.

**Request Body:**
```json
{
  "status": "confirmed"
}
```

**Response:**
```json
{
  "success": true
}
```

#### Get User Bookings
**GET** `/bookings/user`

Retrieves bookings for the current user.

**Query Parameters:**
- `status` (optional): Filter by booking status

**Example:**
```
GET /bookings/user?status=pending
```

**Response:**
```json
[
  {
    "id": "booking1",
    "providerId": "provider1",
    "userId": "user123",
    "service": {
      "name": "Haircut & Style",
      "price": 75
    },
    "date": "2024-01-20T10:00:00Z",
    "status": "pending",
    "notes": "Please bring reference photos",
    "createdAt": "2024-01-15T10:00:00Z"
  }
]
```

#### Get Provider Bookings
**GET** `/bookings/provider`

Retrieves bookings for the current provider.

**Query Parameters:**
- `date` (optional): Filter by specific date
- `status` (optional): Filter by booking status

**Example:**
```
GET /bookings/provider?date=2024-01-20&status=confirmed
```

#### Get Booking Details
**GET** `/bookings/{bookingId}`

Retrieves detailed information about a specific booking.

**Response:**
```json
{
  "id": "booking1",
  "providerId": "provider1",
  "userId": "user123",
  "service": {
    "name": "Haircut & Style",
    "price": 75
  },
  "date": "2024-01-20T10:00:00Z",
  "status": "pending",
  "notes": "Please bring reference photos",
  "createdAt": "2024-01-15T10:00:00Z"
}
```

### Favourites Management

#### Update Favourites
**POST** `/users/favourites`

Adds or removes a provider from user's favourites.

**Request Body:**
```json
{
  "providerId": "provider1",
  "action": "add"
}
```

**Response:**
```json
{
  "id": "user123",
  "name": "John Doe",
  "email": "john@example.com",
  "role": "client",
  "bookings": ["booking1"],
  "favourites": ["provider1"],
  "createdAt": "2024-01-15T10:00:00Z"
}
```

## Error Responses

All endpoints return error responses in the following format:

```json
{
  "error": "Error message description"
}
```

### Common HTTP Status Codes

- `200 OK`: Request successful
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource conflict (e.g., time slot not available)
- `500 Internal Server Error`: Server error

## Service Categories

Available service categories:
- Hair
- Nails
- Makeup
- Barber
- Esthetics
- Styling
- Nail Art
- Bridal
- Beard
- Waxing

## Booking Statuses

Available booking statuses:
- `pending`: Booking created, waiting for provider confirmation
- `confirmed`: Provider has confirmed the booking
- `completed`: Service has been completed
- `cancelled`: Booking has been cancelled

## Usage Examples

### React Native Example

```typescript
import apiService from '../services/api';

// Get providers by category
const getHairStylists = async () => {
  const response = await apiService.getProvidersByCategory('Hair', {
    latitude: 40.7128,
    longitude: -74.0060,
    radius: 10,
    minPrice: 50,
    maxPrice: 150
  });
  
  if (response.success) {
    console.log('Providers:', response.data);
  } else {
    console.error('Error:', response.error);
  }
};

// Create a booking
const createBooking = async () => {
  const bookingData = {
    providerId: 'provider1',
    service: {
      name: 'Haircut & Style',
      price: 75
    },
    date: '2024-01-20T10:00:00Z',
    notes: 'Please bring reference photos'
  };
  
  const response = await apiService.createBooking(bookingData);
  
  if (response.success) {
    console.log('Booking created:', response.data);
  } else {
    console.error('Error:', response.error);
  }
};
```

## Rate Limiting

The API implements rate limiting to prevent abuse. Limits are applied per user and endpoint.

## Security

- All endpoints require Firebase Authentication
- Users can only access their own data
- Providers can only modify their own profiles
- Booking access is restricted to involved parties (user and provider)

## Support

For API support and questions, please refer to the project documentation or contact the development team. 