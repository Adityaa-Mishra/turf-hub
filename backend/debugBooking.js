const mongoose = require('mongoose');
const http = require('http');
const User = require('./models/User');
const Turf = require('./models/Turf');
const TurfSport = require('./models/TurfSport');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/turfhub');
  const customer = await User.findOne({ email: 'customer@demo.com' });
  const turf = await Turf.findOne({}).lean();
  const turfSport = await TurfSport.findOne({ turf: turf._id }).lean();
  console.log('TURF_ID', turf._id.toString());
  console.log('TURFSPORT_ID', turfSport._id.toString());
  const loginData = JSON.stringify({ email: 'customer@demo.com', password: 'demo1234' });
  const loginOpts = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(loginData)
    }
  };

  const loginResponse = await new Promise((resolve, reject) => {
    const req = http.request(loginOpts, res => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => (body += chunk));
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.write(loginData);
    req.end();
  });

  console.log('LOGIN_STATUS', loginResponse.status);
  console.log('LOGIN_BODY', loginResponse.body);
  if (loginResponse.status !== 200) {
    process.exit(1);
  }

  const { token } = JSON.parse(loginResponse.body);

  const bookingData = JSON.stringify({
    turfId: turf._id.toString(),
    turfSportId: turfSport._id.toString(),
    bookingDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    startTime: '12:00',
    endTime: '13:00',
    notes: 'Automated test booking'
  });

  const bookingOpts = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/bookings',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(bookingData),
      Authorization: 'Bearer ' + token
    }
  };

  const bookingResponse = await new Promise((resolve, reject) => {
    const req = http.request(bookingOpts, res => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => (body += chunk));
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.write(bookingData);
    req.end();
  });

  console.log('BOOKING_STATUS', bookingResponse.status);
  console.log('BOOKING_BODY', bookingResponse.body);
  await mongoose.disconnect();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});