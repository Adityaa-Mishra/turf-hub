/**
 * TurfHub — Database Seeder
 * Creates demo data for development/testing
 * Run: node seed.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('./models/User');
const Turf = require('./models/Turf');
const TurfSport = require('./models/TurfSport');
const Booking = require('./models/Booking');
const Review = require('./models/Review');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/turfhub';

const SPORTS_DATA = [
  { sportName: 'Football', pricePerHour: 800, openingTime: '06:00', closingTime: '22:00', slotDuration: 60, totalCourts: 2 },
  { sportName: 'Cricket', pricePerHour: 1200, openingTime: '06:00', closingTime: '20:00', slotDuration: 120, totalCourts: 1 },
  { sportName: 'Badminton', pricePerHour: 300, openingTime: '06:00', closingTime: '23:00', slotDuration: 60, totalCourts: 4 },
  { sportName: 'Basketball', pricePerHour: 600, openingTime: '07:00', closingTime: '21:00', slotDuration: 60, totalCourts: 1 },
];

const TURFS_DATA = [
  {
    name: 'Green Arena Sports Hub',
    description: 'Premium multi-sport facility in the heart of the city. State-of-the-art synthetic turf with floodlights for night games. Perfect for corporate tournaments and weekend matches.',
    address: { street: '12 MG Road, Near Central Mall', city: 'Mumbai', state: 'Maharashtra', pincode: '400001' },
    contactNumber: '9876543210',
    amenities: ['Parking', 'Changing Rooms', 'Drinking Water', 'Floodlights', 'Washrooms'],
    sports: ['Football', 'Cricket', 'Badminton']
  },
  {
    name: 'Champions Turf Club',
    description: 'Professional grade turf facility with world-class courts. Ideal for training sessions and competitive matches. Indoor and outdoor options available.',
    address: { street: '45 HSR Layout, Sector 3', city: 'Bangalore', state: 'Karnataka', pincode: '560102' },
    contactNumber: '9845678901',
    amenities: ['Parking', 'Floodlights', 'Cafeteria', 'First Aid', 'Wi-Fi'],
    sports: ['Football', 'Badminton', 'Basketball']
  },
  {
    name: 'SportZone Turfs',
    description: 'Budget-friendly sports complex with excellent facilities. Great for casual players and beginner training. Multiple courts ensure minimal waiting time.',
    address: { street: '78 Anna Nagar, West', city: 'Chennai', state: 'Tamil Nadu', pincode: '600040' },
    contactNumber: '9765432109',
    amenities: ['Parking', 'Drinking Water', 'Washrooms', 'Changing Rooms'],
    sports: ['Cricket', 'Football', 'Badminton']
  }
];

async function seed() {
  try {
    console.log('🌱 Connecting to MongoDB…');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected!');

    // Clear existing data
    console.log('🗑️  Clearing existing seed data…');
    await Promise.all([
      User.deleteMany({ email: { $in: ['customer@demo.com', 'owner@demo.com'] } }),
      Review.deleteMany({}),
      Booking.deleteMany({}),
      TurfSport.deleteMany({}),
      Turf.deleteMany({})
    ]);

    // Create users
    console.log('👤 Creating users…');
    const [customer, owner] = await User.create([
      {
        name: 'Arjun Sharma',
        email: 'customer@demo.com',
        password: 'demo1234',
        phone: '9876543211',
        role: 'customer',
        city: 'Mumbai'
      },
      {
        name: 'Priya Mehta',
        email: 'owner@demo.com',
        password: 'demo1234',
        phone: '9876543212',
        role: 'owner',
        city: 'Mumbai'
      }
    ]);
    console.log(`   ✅ Customer: customer@demo.com / demo1234`);
    console.log(`   ✅ Owner: owner@demo.com / demo1234`);

    // Create turfs with sports
    console.log('🏟️  Creating turfs…');
    for (const turfData of TURFS_DATA) {
      const { sports: sportNames, ...turfFields } = turfData;
      const turf = await Turf.create({ ...turfFields, owner: owner._id });

      // Add sports
      const sportsToAdd = SPORTS_DATA.filter(s => sportNames.includes(s.sportName));
      const turfSports = await TurfSport.insertMany(
        sportsToAdd.map(s => ({ ...s, turf: turf._id }))
      );

      // Create sample bookings
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      lastWeek.setHours(0, 0, 0, 0);

      if (turfSports.length > 0) {
        // Upcoming accepted booking
        await Booking.create({
          user: customer._id,
          turf: turf._id,
          turfSport: turfSports[0]._id,
          bookingDate: tomorrow,
          startTime: '10:00',
          endTime: '11:00',
          status: 'accepted',
          amount: turfSports[0].pricePerHour,
          acceptedAt: new Date()
        });

        // Past completed booking
        await Booking.create({
          user: customer._id,
          turf: turf._id,
          turfSport: turfSports[0]._id,
          bookingDate: lastWeek,
          startTime: '16:00',
          endTime: '17:00',
          status: 'completed',
          amount: turfSports[0].pricePerHour
        });

        // Pending booking
        await Booking.create({
          user: customer._id,
          turf: turf._id,
          turfSport: turfSports[0]._id,
          bookingDate: tomorrow,
          startTime: '14:00',
          endTime: '15:00',
          status: 'pending',
          amount: turfSports[0].pricePerHour
        });
      }

      // Add a review
      const review = await Review.create({
        user: customer._id,
        turf: turf._id,
        rating: Math.floor(Math.random() * 2) + 4, // 4 or 5
        comment: `Excellent facility! The ${sportNames[0]} courts are top-notch. Very well maintained and the staff is helpful. Will definitely book again.`
      });

      console.log(`   ✅ ${turf.name} (${turf.address.city}) — ${turfSports.length} sports`);
    }

    console.log('\n🎉 Seeding complete!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Demo Accounts:');
    console.log('  👤 Customer: customer@demo.com / demo1234');
    console.log('  🏟️  Owner:    owner@demo.com / demo1234');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (err) {
    console.error('❌ Seeding error:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seed();
