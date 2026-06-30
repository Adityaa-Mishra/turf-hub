/**
 * TurfSport Model
 * Defines sports offered at a turf with pricing and timings
 */

const mongoose = require('mongoose');

const PREDEFINED_SPORTS = [
  'Football', 'Cricket', 'Badminton', 'Volleyball',
  'Basketball', 'Tennis', 'Hockey', 'Kabaddi', 'Table Tennis'
];

const turfSportSchema = new mongoose.Schema({
  turf: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Turf',
    required: [true, 'Turf is required']
  },
  sportName: {
    type: String,
    required: [true, 'Sport name is required'],
    trim: true,
    maxlength: [50, 'Sport name cannot exceed 50 characters']
  },
  isPredefined: {
    type: Boolean,
    default: true
  },
  pricePerHour: {
    type: Number,
    required: [true, 'Price per hour is required'],
    min: [1, 'Price must be at least 1']
  },
  openingTime: {
    type: String,
    required: [true, 'Opening time is required'],
    match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Use HH:MM format']
  },
  closingTime: {
    type: String,
    required: [true, 'Closing time is required'],
    match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Use HH:MM format']
  },
  slotDuration: {
    type: Number,
    required: [true, 'Slot duration is required'],
    enum: [30, 60, 90, 120], // in minutes
    default: 60
  },
  totalCourts: {
    type: Number,
    required: [true, 'Number of courts is required'],
    min: [1, 'Must have at least 1 court'],
    max: [20, 'Cannot exceed 20 courts'],
    default: 1
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// ─── Indexes ─────────────────────────────────────────────────────────────────
turfSportSchema.index({ turf: 1, sportName: 1 }, { unique: true });
turfSportSchema.index({ turf: 1 });

// ─── Virtual: Available slots generator ──────────────────────────────────────
turfSportSchema.methods.generateSlots = function (date, duration = null) {
  const slots = [];
  const slotLength = duration || this.slotDuration;
  const [openH, openM] = this.openingTime.split(':').map(Number);
  const [closeH, closeM] = this.closingTime.split(':').map(Number);

  let currentMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  while (currentMinutes + slotLength <= closeMinutes) {
    const startH = Math.floor(currentMinutes / 60);
    const startM = currentMinutes % 60;
    const endMinutes = currentMinutes + slotLength;
    const endH = Math.floor(endMinutes / 60);
    const endM = endMinutes % 60;

    const startTime = `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}`;
    const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

    slots.push({ startTime, endTime });
    currentMinutes += this.slotDuration;
  }

  return slots;
};

// ─── Statics ─────────────────────────────────────────────────────────────────
turfSportSchema.statics.PREDEFINED_SPORTS = PREDEFINED_SPORTS;

module.exports = mongoose.model('TurfSport', turfSportSchema);
