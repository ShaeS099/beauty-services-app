import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as cors from 'cors';
import * as express from 'express';
import { 
  Provider, 
  User, 
  Booking, 
  CreateUserRequest, 
  UpdateUserRequest, 
  CreateBookingRequest, 
  UpdateBookingStatusRequest, 
  FavouritesRequest 
} from './types';

// Initialize Firebase Admin
admin.initializeApp();

const db = admin.firestore();
const auth = admin.auth();

// Express app for HTTP functions
const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Middleware to verify Firebase Auth token
const authenticateUser = async (req: express.Request, res: express.Response, next: express.NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (_error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Create user profile after authentication
export const createUserProfile = functions.auth.user().onCreate(async (user) => {
  try {
    const userProfile: User = {
      id: user.uid,
      name: user.displayName || '',
      email: user.email || '',
      role: 'client', // Default role
      bookings: [],
      favourites: [],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection('users').doc(user.uid).set(userProfile);
    console.log(`User profile created for ${user.uid}`);
  } catch (error) {
    console.error('Error creating user profile:', error);
  }
});

// Create user profile (manual endpoint)
app.post('/users', authenticateUser, async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const { name, email, role = 'client' }: CreateUserRequest = req.body;
    const userId = req.user?.uid;

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    if (!name || !email) {
      res.status(400).json({ error: 'Name and email are required' });
      return;
    }

    const userProfile: User = {
      id: userId,
      name,
      email,
      role,
      bookings: [],
      favourites: [],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection('users').doc(userId).set(userProfile);
    
    res.json(userProfile);
  } catch (error) {
    console.error('Error creating user profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user profile
app.get('/users/profile', authenticateUser, async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const userId = req.user?.uid;
    
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      res.status(404).json({ error: 'User profile not found' });
      return;
    }

    res.json({ id: userDoc.id, ...userDoc.data() });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user profile
app.put('/users/profile', authenticateUser, async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const userId = req.user?.uid;
    const { name, role, favourites }: UpdateUserRequest = req.body;

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const updateData: any = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (name) updateData.name = name;
    if (role) updateData.role = role;
    if (favourites) updateData.favourites = favourites;

    await db.collection('users').doc(userId).update(updateData);
    
    const updatedDoc = await db.collection('users').doc(userId).get();
    res.json({ id: updatedDoc.id, ...updatedDoc.data() });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get providers by category
app.get('/providers/category/:category', async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const { category } = req.params;
    const { latitude, longitude, radius = 10, minPrice, maxPrice } = req.query;

    const query = db.collection('providers').where('categories', 'array-contains', category);

    // Note: Firestore doesn't support complex queries on array fields with price filtering
    // Price filtering will be done in memory after fetching the data

    const snapshot = await query.get();
    let providers = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Provider[];

    // Filter by distance if coordinates provided
    if (latitude && longitude) {
      providers = providers.filter(provider => {
        if (!provider.location) return false;
        
        const distance = calculateDistance(
          Number(latitude),
          Number(longitude),
          provider.location.lat,
          provider.location.lng
        );
        
        return distance <= Number(radius);
      });
    }

    // Filter by price range if provided (using the variables)
    if (minPrice || maxPrice) {
      providers = providers.filter(provider => {
        if (!provider.services || provider.services.length === 0) return false;
        
        // Check if any service falls within the price range
        return provider.services.some(service => {
          const price = service.price;
          const meetsMinPrice = !minPrice || price >= Number(minPrice);
          const meetsMaxPrice = !maxPrice || price <= Number(maxPrice);
          return meetsMinPrice && meetsMaxPrice;
        });
      });
    }

    res.json(providers);
  } catch (error) {
    console.error('Error fetching providers by category:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get providers filtered by price range
app.get('/providers/filter', async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const { minPrice, maxPrice, category, latitude, longitude, radius = 10 } = req.query;

    let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = db.collection('providers');

    // Add category filter if provided
    if (category) {
      query = query.where('categories', 'array-contains', category);
    }

    const snapshot = await query.get();
    let providers = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Provider[];

    // Filter by price range
    if (minPrice || maxPrice) {
      providers = providers.filter(provider => {
        if (!provider.services || provider.services.length === 0) return false;
        
        const minServicePrice = Math.min(...provider.services.map((s) => s.price));
        const maxServicePrice = Math.max(...provider.services.map((s) => s.price));
        
        if (minPrice && minServicePrice < Number(minPrice)) return false;
        if (maxPrice && maxServicePrice > Number(maxPrice)) return false;
        
        return true;
      });
    }

    // Filter by distance if coordinates provided
    if (latitude && longitude) {
      providers = providers.filter(provider => {
        if (!provider.location) return false;
        
        const distance = calculateDistance(
          Number(latitude),
          Number(longitude),
          provider.location.lat,
          provider.location.lng
        );
        
        return distance <= Number(radius);
      });
    }

    res.json(providers);
  } catch (error) {
    console.error('Error filtering providers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get provider details
app.get('/providers/:providerId', async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const { providerId } = req.params;
    const providerDoc = await db.collection('providers').doc(providerId).get();
    
    if (!providerDoc.exists) {
      res.status(404).json({ error: 'Provider not found' });
      return;
    }

    res.json({ id: providerDoc.id, ...providerDoc.data() });
  } catch (error) {
    console.error('Error fetching provider details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a booking
app.post('/bookings', authenticateUser, async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const { providerId, service, date, notes }: CreateBookingRequest = req.body;
    const userId = req.user?.uid;

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    // Validate required fields
    if (!providerId || !service || !date) {
      res.status(400).json({ error: 'Provider ID, service, and date are required' });
      return;
    }

    // Validate service object
    if (!service.name || !service.price) {
      res.status(400).json({ error: 'Service must include name and price' });
      return;
    }

    // Check if provider exists
    const providerDoc = await db.collection('providers').doc(providerId).get();
    if (!providerDoc.exists) {
      res.status(404).json({ error: 'Provider not found' });
      return;
    }

    // Check if time slot is available (simplified check)
    const bookingDate = new Date(date);
    const existingBooking = await db.collection('bookings')
      .where('providerId', '==', providerId)
      .where('date', '==', bookingDate)
      .where('status', 'in', ['pending', 'confirmed'])
      .get();

    if (!existingBooking.empty) {
      res.status(409).json({ error: 'Time slot not available' });
      return;
    }

    // Create booking
    const bookingData = {
      providerId,
      userId,
      service,
      date: bookingDate,
      status: 'pending' as const,
      notes: notes || '',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const bookingRef = await db.collection('bookings').add(bookingData);
    
    // Update user's bookings array
    await db.collection('users').doc(userId).update({
      bookings: admin.firestore.FieldValue.arrayUnion(bookingRef.id)
    });

    res.json({
      id: bookingRef.id,
      providerId,
      userId,
      service,
      date: bookingDate,
      status: 'pending',
      notes: notes || '',
      createdAt: bookingData.createdAt
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update booking status
app.patch('/bookings/:bookingId/status', authenticateUser, async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const { bookingId } = req.params;
    const { status }: UpdateBookingStatusRequest = req.body;
    const userId = req.user?.uid;

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    if (!['pending', 'confirmed', 'completed', 'cancelled'].includes(status)) {
      res.status(400).json({ error: 'Invalid status' });
      return;
    }

    const bookingDoc = await db.collection('bookings').doc(bookingId).get();
    if (!bookingDoc.exists) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }

    const booking = bookingDoc.data() as Booking;
    
    // Check if user is authorized to update this booking
    if (booking?.userId !== userId && booking?.providerId !== userId) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    await db.collection('bookings').doc(bookingId).update({
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating booking status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get bookings for a user
app.get('/bookings/user', authenticateUser, async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const userId = req.user?.uid;
    const { status } = req.query;

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    let query = db.collection('bookings').where('userId', '==', userId);
    
    if (status) {
      query = query.where('status', '==', status);
    }

    const snapshot = await query.orderBy('date', 'desc').get();
    const bookings = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json(bookings);
  } catch (error) {
    console.error('Error fetching user bookings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get bookings for a provider
app.get('/bookings/provider', authenticateUser, async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const providerId = req.user?.uid;
    const { date, status } = req.query;

    if (!providerId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    let query = db.collection('bookings').where('providerId', '==', providerId);
    
    if (date) {
      const bookingDate = new Date(date as string);
      query = query.where('date', '==', bookingDate);
    }
    
    if (status) {
      query = query.where('status', '==', status);
    }

    const snapshot = await query.orderBy('date', 'asc').get();
    const bookings = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json(bookings);
  } catch (error) {
    console.error('Error fetching provider bookings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get booking details
app.get('/bookings/:bookingId', authenticateUser, async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const { bookingId } = req.params;
    const userId = req.user?.uid;

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const bookingDoc = await db.collection('bookings').doc(bookingId).get();
    if (!bookingDoc.exists) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }

    const booking = bookingDoc.data() as Booking;
    
    // Check if user is authorized to view this booking
    if (booking?.userId !== userId && booking?.providerId !== userId) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    const bookingData = booking as any;
    delete bookingData.id; // Remove id if it exists in the data
    res.json({ id: bookingDoc.id, ...bookingData });
  } catch (error) {
    console.error('Error fetching booking details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add/remove provider from favourites
app.post('/users/favourites', authenticateUser, async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const userId = req.user?.uid;
    const { providerId, action }: FavouritesRequest = req.body;

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    if (!providerId || !action) {
      res.status(400).json({ error: 'Provider ID and action are required' });
      return;
    }

    const userRef = db.collection('users').doc(userId);
    
    if (action === 'add') {
      await userRef.update({
        favourites: admin.firestore.FieldValue.arrayUnion(providerId)
      });
    } else if (action === 'remove') {
      await userRef.update({
        favourites: admin.firestore.FieldValue.arrayRemove(providerId)
      });
    } else {
      res.status(400).json({ error: 'Invalid action. Use "add" or "remove"' });
      return;
    }

    const updatedUser = await userRef.get();
    res.json({ id: updatedUser.id, ...updatedUser.data() });
  } catch (error) {
    console.error('Error updating favourites:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to calculate distance between two points
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Export HTTP functions
export const api = functions.https.onRequest(app); 