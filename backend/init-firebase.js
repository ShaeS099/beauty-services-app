#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Sample data for providers
const sampleProviders = [
  {
    name: "Sarah Johnson",
    photoUrl: "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=400",
    location: {
      city: "New York",
      lat: 40.7128,
      lng: -74.0060
    },
    bio: "Professional hairstylist with 10+ years of experience specializing in modern cuts and color techniques.",
    categories: ["Hair", "Styling"],
    services: [
      {
        name: "Haircut & Style",
        price: 75,
        category: "Hair",
        durationMins: 60
      },
      {
        name: "Hair Coloring",
        price: 150,
        category: "Hair",
        durationMins: 120
      },
      {
        name: "Blowout",
        price: 45,
        category: "Styling",
        durationMins: 45
      }
    ],
    availability: {
      monday: { start: "09:00", end: "17:00" },
      tuesday: { start: "09:00", end: "17:00" },
      wednesday: { start: "09:00", end: "17:00" },
      thursday: { start: "09:00", end: "17:00" },
      friday: { start: "09:00", end: "17:00" },
      saturday: { start: "10:00", end: "16:00" },
      sunday: { start: "10:00", end: "14:00" }
    },
    ratings: 4.8,
    reviews: [
      {
        userId: "user1",
        rating: 5,
        comment: "Amazing haircut! Sarah is very professional and talented.",
        date: new Date()
      },
      {
        userId: "user2",
        rating: 4,
        comment: "Great service, would definitely recommend!",
        date: new Date()
      }
    ]
  },
  {
    name: "Maria Rodriguez",
    photoUrl: "https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?w=400",
    location: {
      city: "Los Angeles",
      lat: 34.0522,
      lng: -118.2437
    },
    bio: "Certified nail technician specializing in gel nails, acrylics, and nail art designs.",
    categories: ["Nails", "Nail Art"],
    services: [
      {
        name: "Gel Manicure",
        price: 35,
        category: "Nails",
        durationMins: 45
      },
      {
        name: "Acrylic Full Set",
        price: 65,
        category: "Nails",
        durationMins: 90
      },
      {
        name: "Nail Art Design",
        price: 25,
        category: "Nail Art",
        durationMins: 30
      }
    ],
    availability: {
      monday: { start: "10:00", end: "18:00" },
      tuesday: { start: "10:00", end: "18:00" },
      wednesday: { start: "10:00", end: "18:00" },
      thursday: { start: "10:00", end: "18:00" },
      friday: { start: "10:00", end: "18:00" },
      saturday: { start: "11:00", end: "17:00" },
      sunday: { start: "12:00", end: "16:00" }
    },
    ratings: 4.9,
    reviews: [
      {
        userId: "user3",
        rating: 5,
        comment: "Perfect nails every time! Maria is incredibly skilled.",
        date: new Date()
      }
    ]
  },
  {
    name: "Jennifer Lee",
    photoUrl: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400",
    location: {
      city: "Chicago",
      lat: 41.8781,
      lng: -87.6298
    },
    bio: "Professional makeup artist with expertise in bridal, special occasion, and everyday makeup.",
    categories: ["Makeup", "Bridal"],
    services: [
      {
        name: "Everyday Makeup",
        price: 60,
        category: "Makeup",
        durationMins: 45
      },
      {
        name: "Bridal Makeup",
        price: 150,
        category: "Bridal",
        durationMins: 90
      },
      {
        name: "Special Occasion",
        price: 80,
        category: "Makeup",
        durationMins: 60
      }
    ],
    availability: {
      monday: { start: "09:00", end: "17:00" },
      tuesday: { start: "09:00", end: "17:00" },
      wednesday: { start: "09:00", end: "17:00" },
      thursday: { start: "09:00", end: "17:00" },
      friday: { start: "09:00", end: "17:00" },
      saturday: { start: "10:00", end: "18:00" },
      sunday: { start: "10:00", end: "16:00" }
    },
    ratings: 4.7,
    reviews: [
      {
        userId: "user4",
        rating: 5,
        comment: "Jennifer made me look absolutely stunning for my wedding!",
        date: new Date()
      }
    ]
  },
  {
    name: "David Thompson",
    photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400",
    location: {
      city: "Miami",
      lat: 25.7617,
      lng: -80.1918
    },
    bio: "Experienced barber specializing in modern cuts, fades, and beard grooming.",
    categories: ["Barber", "Beard"],
    services: [
      {
        name: "Haircut & Fade",
        price: 30,
        category: "Barber",
        durationMins: 45
      },
      {
        name: "Beard Trim",
        price: 20,
        category: "Beard",
        durationMins: 30
      },
      {
        name: "Haircut & Beard Combo",
        price: 45,
        category: "Barber",
        durationMins: 60
      }
    ],
    availability: {
      monday: { start: "08:00", end: "16:00" },
      tuesday: { start: "08:00", end: "16:00" },
      wednesday: { start: "08:00", end: "16:00" },
      thursday: { start: "08:00", end: "16:00" },
      friday: { start: "08:00", end: "16:00" },
      saturday: { start: "09:00", end: "15:00" },
      sunday: { start: "10:00", end: "14:00" }
    },
    ratings: 4.6,
    reviews: [
      {
        userId: "user5",
        rating: 4,
        comment: "Great haircut and beard trim. David knows his stuff!",
        date: new Date()
      }
    ]
  },
  {
    name: "Lisa Chen",
    photoUrl: "https://images.unsplash.com/photo-1552058544-f2b08422138a?w=400",
    location: {
      city: "San Francisco",
      lat: 37.7749,
      lng: -122.4194
    },
    bio: "Licensed esthetician specializing in facials, waxing, and skincare treatments.",
    categories: ["Esthetics", "Waxing"],
    services: [
      {
        name: "Classic Facial",
        price: 85,
        category: "Esthetics",
        durationMins: 60
      },
      {
        name: "Brazilian Wax",
        price: 55,
        category: "Waxing",
        durationMins: 45
      },
      {
        name: "Eyebrow Wax",
        price: 25,
        category: "Waxing",
        durationMins: 20
      }
    ],
    availability: {
      monday: { start: "10:00", end: "18:00" },
      tuesday: { start: "10:00", end: "18:00" },
      wednesday: { start: "10:00", end: "18:00" },
      thursday: { start: "10:00", end: "18:00" },
      friday: { start: "10:00", end: "18:00" },
      saturday: { start: "11:00", end: "17:00" },
      sunday: { start: "12:00", end: "16:00" }
    },
    ratings: 4.8,
    reviews: [
      {
        userId: "user6",
        rating: 5,
        comment: "Lisa is amazing! My skin has never looked better.",
        date: new Date()
      }
    ]
  }
];

// Sample data for users
const sampleUsers = [
  {
    name: "Emma Wilson",
    email: "emma.wilson@example.com",
    role: "client",
    bookings: [],
    favourites: []
  },
  {
    name: "Michael Brown",
    email: "michael.brown@example.com",
    role: "client",
    bookings: [],
    favourites: []
  },
  {
    name: "Jessica Davis",
    email: "jessica.davis@example.com",
    role: "client",
    bookings: [],
    favourites: []
  }
];

// Sample data for bookings
const sampleBookings = [
  {
    providerId: "provider1",
    userId: "user1",
    service: {
      name: "Haircut & Style",
      price: 75
    },
    date: new Date("2024-01-15T10:00:00Z"),
    status: "confirmed",
    notes: "Please bring reference photos"
  },
  {
    providerId: "provider2",
    userId: "user2",
    service: {
      name: "Gel Manicure",
      price: 35
    },
    date: new Date("2024-01-16T14:00:00Z"),
    status: "pending",
    notes: "Prefer neutral colors"
  },
  {
    providerId: "provider3",
    userId: "user3",
    service: {
      name: "Bridal Makeup",
      price: 150
    },
    date: new Date("2024-01-20T09:00:00Z"),
    status: "confirmed",
    notes: "Wedding day makeup - natural look preferred"
  }
];

async function initializeDatabase() {
  try {
    console.log('Starting database initialization...');

    // Clear existing data
    console.log('Clearing existing data...');
    const collections = ['providers', 'users', 'bookings'];
    for (const collectionName of collections) {
      const snapshot = await db.collection(collectionName).get();
      const batch = db.batch();
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
    }

    // Add providers
    console.log('Adding providers...');
    for (let i = 0; i < sampleProviders.length; i++) {
      const providerId = `provider${i + 1}`;
      await db.collection('providers').doc(providerId).set({
        ...sampleProviders[i],
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    // Add users
    console.log('Adding users...');
    for (let i = 0; i < sampleUsers.length; i++) {
      const userId = `user${i + 1}`;
      await db.collection('users').doc(userId).set({
        ...sampleUsers[i],
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    // Add bookings
    console.log('Adding bookings...');
    for (let i = 0; i < sampleBookings.length; i++) {
      const bookingId = `booking${i + 1}`;
      await db.collection('bookings').doc(bookingId).set({
        ...sampleBookings[i],
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Update user's bookings array
      await db.collection('users').doc(sampleBookings[i].userId).update({
        bookings: admin.firestore.FieldValue.arrayUnion(bookingId)
      });
    }

    console.log('Database initialization completed successfully!');
    console.log(`Added ${sampleProviders.length} providers`);
    console.log(`Added ${sampleUsers.length} users`);
    console.log(`Added ${sampleBookings.length} bookings`);

  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

// Run the initialization
initializeDatabase(); 