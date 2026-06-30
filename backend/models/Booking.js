/**
 * Booking Model
 * Handles slot bookings with status management
 */

const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  turf: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Turf',
    required: [true, 'Turf is required']
  },
  turfSport: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TurfSport',
    required: [true, 'Sport is required']
  },
  bookingDate: {
    type: Date,
    required: [true, 'Booking date is required']
  },
  startTime: {
    type: String,
    required: [true, 'Start time is required'],
    match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Use HH:MM format']
  },
  endTime: {
    type: String,
    required: [true, 'End time is required'],
    match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Use HH:MM format']
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined', 'cancelled', 'completed'],
    default: 'pending'
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  courtNumber: {
    type: Number,
    default: 1
  },
  qrCode: {
    type: String, // Base64 QR code
    default: null
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  couponCode: String,
  discount: { type: Number, default: 0 },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'refunded'],
    default: 'pending'
  },
  cancelledBy: {
    type: String,
    enum: ['customer', 'owner', 'admin'],
    default: null
  },
  cancelReason: String,
  acceptedAt: Date,
  declinedAt: Date,
  cancelledAt: Date,
  completedAt: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ─── Indexes ─────────────────────────────────────────────────────────────────
bookingSchema.index({ turf: 1, turfSport: 1, bookingDate: 1, status: 1 });
bookingSchema.index({ user: 1, status: 1 });
bookingSchema.index({ turf: 1, bookingDate: 1 });
bookingSchema.index({ status: 1 });

// ─── Static: Count overlapping bookings ───────────────────────────────────────
bookingSchema.statics.countOverlappingBookings = async function (
  turfSportId,
  bookingDate,
  startTime,
  endTime,
  statuses = ['accepted'],
  excludeId = null
) {
  const query = {
    turfSport: turfSportId,
    bookingDate: new Date(bookingDate),
    status: { $in: statuses },
    $or: [
      { startTime: { $lt: endTime }, endTime: { $gt: startTime } }
    ]
  };

  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  return await this.countDocuments(query);
};

bookingSchema.statics.isSlotAvailable = async function (
  turfSportId,
  bookingDate,
  startTime,
  endTime,
  totalCourts,
  statuses = ['accepted'],
  excludeId = null
) {
  const overlappingCount = await this.countOverlappingBookings(
    turfSportId,
    bookingDate,
    startTime,
    endTime,
    statuses,
    excludeId
  );
  return overlappingCount < totalCourts;
};

// ─── Pre-save: Set completion status ─────────────────────────────────────────
bookingSchema.pre('save', function (next) {
  if (this.isModified('status')) {
    const now = new Date();
    if (this.status === 'accepted' && !this.acceptedAt) this.acceptedAt = now;
    if (this.status === 'declined' && !this.declinedAt) this.declinedAt = now;
    if (this.status === 'cancelled' && !this.cancelledAt) this.cancelledAt = now;
    if (this.status === 'completed' && !this.completedAt) this.completedAt = now;
  }
  next();
});

module.exports = mongoose.model('Booking', bookingSchema);
