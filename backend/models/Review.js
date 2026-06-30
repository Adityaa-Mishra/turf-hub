/**
 * Review Model
 */

const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
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
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking'
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5']
  },
  comment: {
    type: String,
    required: [true, 'Comment is required'],
    trim: true,
    minlength: [10, 'Comment must be at least 10 characters'],
    maxlength: [500, 'Comment cannot exceed 500 characters']
  },
  ownerReply: {
    type: String,
    maxlength: [300, 'Reply cannot exceed 300 characters']
  },
  ownerReplyAt: Date,
  isVerified: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// ─── Unique review per user per turf ─────────────────────────────────────────
reviewSchema.index({ user: 1, turf: 1 }, { unique: true });
reviewSchema.index({ turf: 1 });

// ─── Post-save: Update turf average rating ────────────────────────────────────
reviewSchema.post('save', async function () {
  await this.constructor.updateTurfRating(this.turf);
});

reviewSchema.post('remove', async function () {
  await this.constructor.updateTurfRating(this.turf);
});

reviewSchema.statics.updateTurfRating = async function (turfId) {
  const Turf = require('./Turf');
  const stats = await this.aggregate([
    { $match: { turf: turfId } },
    {
      $group: {
        _id: '$turf',
        avgRating: { $avg: '$rating' },
        count: { $sum: 1 }
      }
    }
  ]);

  if (stats.length > 0) {
    await Turf.findByIdAndUpdate(turfId, {
      averageRating: Math.round(stats[0].avgRating * 10) / 10,
      totalReviews: stats[0].count
    });
  } else {
    await Turf.findByIdAndUpdate(turfId, { averageRating: 0, totalReviews: 0 });
  }
};

module.exports = mongoose.model('Review', reviewSchema);
