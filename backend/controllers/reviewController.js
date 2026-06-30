/**
 * Review Controller
 */

const Review = require('../models/Review');
const Booking = require('../models/Booking');
const Turf = require('../models/Turf');

// ─── Create review ────────────────────────────────────────────────────────────
exports.createReview = async (req, res, next) => {
  try {
    const { turfId, rating, comment, bookingId } = req.body;

    const turf = await Turf.findById(turfId);
    if (!turf) return res.status(404).json({ success: false, message: 'Turf not found.' });

    // Check if user has an accepted/completed booking at this turf
    const hasBooking = await Booking.findOne({
      user: req.user.id,
      turf: turfId,
      status: { $in: ['accepted', 'completed'] }
    });

    if (!hasBooking) {
      return res.status(400).json({
        success: false,
        message: 'You can only review turfs you have visited.'
      });
    }

    // One review per user per turf
    const existing = await Review.findOne({ user: req.user.id, turf: turfId });
    if (existing) {
      return res.status(400).json({ success: false, message: 'You have already reviewed this turf.' });
    }

    const review = await Review.create({
      user: req.user.id,
      turf: turfId,
      booking: bookingId,
      rating,
      comment
    });

    const populated = await Review.findById(review._id).populate('user', 'name avatar');

    res.status(201).json({ success: true, message: 'Review submitted!', data: populated });
  } catch (error) {
    next(error);
  }
};

// ─── Get reviews for a turf ───────────────────────────────────────────────────
exports.getTurfReviews = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const total = await Review.countDocuments({ turf: req.params.turfId });
    const reviews = await Review.find({ turf: req.params.turfId })
      .populate('user', 'name avatar')
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      success: true,
      count: reviews.length,
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
      data: reviews
    });
  } catch (error) {
    next(error);
  }
};

// ─── Owner reply to review ────────────────────────────────────────────────────
exports.replyToReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id).populate('turf', 'owner');
    if (!review) return res.status(404).json({ success: false, message: 'Review not found.' });
    if (review.turf.owner.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    review.ownerReply = req.body.reply;
    review.ownerReplyAt = new Date();
    await review.save();

    res.json({ success: true, message: 'Reply added.', data: review });
  } catch (error) {
    next(error);
  }
};

// ─── Delete review ────────────────────────────────────────────────────────────
exports.deleteReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ success: false, message: 'Review not found.' });
    if (review.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }
    await review.deleteOne();
    res.json({ success: true, message: 'Review deleted.' });
  } catch (error) {
    next(error);
  }
};
