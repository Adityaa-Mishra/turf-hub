/**
 * Turf Model
 * Represents a sports turf/venue
 */

const mongoose = require('mongoose');

const turfSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Owner is required']
  },
  name: {
    type: String,
    required: [true, 'Turf name is required'],
    trim: true,
    minlength: [3, 'Name must be at least 3 characters'],
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  address: {
    street: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, trim: true },
    pincode: { type: String, trim: true }
  },
  images: [{
    url: String,
    filename: String,
    isPrimary: { type: Boolean, default: false }
  }],
  contactNumber: {
    type: String,
    required: [true, 'Contact number is required'],
    match: [/^[6-9]\d{9}$/, 'Please enter a valid 10-digit phone number']
  },
  amenities: [{
    type: String,
    enum: ['Parking', 'Changing Rooms', 'Drinking Water', 'Floodlights', 'Washrooms', 'Cafeteria', 'First Aid', 'Wi-Fi']
  }],
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] } // [longitude, latitude]
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalReviews: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ─── Indexes ─────────────────────────────────────────────────────────────────
turfSchema.index({ 'address.city': 1 });
turfSchema.index({ owner: 1 });
turfSchema.index({ isActive: 1 });
turfSchema.index({ location: '2dsphere' });

// ─── Virtual: Sports (populated from TurfSport) ───────────────────────────────
turfSchema.virtual('sports', {
  ref: 'TurfSport',
  localField: '_id',
  foreignField: 'turf'
});

// ─── Virtual: Primary image ──────────────────────────────────────────────────
turfSchema.virtual('primaryImage').get(function () {
  if (!this.images || this.images.length === 0) return null;
  const primary = this.images.find(img => img.isPrimary);
  return primary ? primary.url : this.images[0].url;
});

module.exports = mongoose.model('Turf', turfSchema);
