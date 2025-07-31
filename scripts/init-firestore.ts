import * as dotenv from 'dotenv';
dotenv.config();

import { adminDb } from '../lib/firebase/config';
import * as bcrypt from 'bcrypt';

async function initializeFirestore() {
  try {
    // Create admin user
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    await adminDb.collection('users').doc('admin').set({
      email: adminEmail,
      password: hashedPassword,
      role: 'admin',
      name: 'Admin',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Create default settings
    const defaultSettings = {
      maintenance_mode: false,
      booking_enabled: true,
      min_booking_hours: 4,
      max_booking_days: 30,
      business_hours: {
        start: '09:00',
        end: '21:00',
      },
      contact: {
        phone: '+91-8247494622',
        email: 'contact@goonrides.com',
        address: 'Hyderabad, Telangana',
      },
      updatedAt: new Date(),
    };

    await adminDb.collection('settings').doc('default').set(defaultSettings);

    // Create sample vehicle categories
    const categories = [
      { name: 'Scooter', description: 'Comfortable scooters for city rides' },
      { name: 'Motorcycle', description: 'Powerful bikes for longer journeys' },
      { name: 'Electric', description: 'Eco-friendly electric vehicles' },
    ];

    for (const category of categories) {
      await adminDb.collection('categories').add({
        ...category,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    console.log('✅ Firestore initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing Firestore:', error);
    process.exit(1);
  }
}

initializeFirestore(); 