/**
 * Booking Controller
 * Manages booking lifecycle with concurrency protection
 */

const Booking = require('../models/Booking');
const Turf = require('../models/Turf');
const TurfSport = require('../models/TurfSport');
const mongoose = require('mongoose');
const QRCode = require('qrcode');
const { sendEmail } = require('../utils/email');
const { getIO } = require('../utils/socket');

// ─── Create booking (customer) ────────────────────────────────────────────────
exports.createBooking = async (req, res, next) => {
  try {
    const { turfId, turfSportId, bookingDate, startTime, endTime, notes, couponCode } = req.body;

    // Validate turf
    const turf = await Turf.findById(turfId);
    if (!turf || !turf.isActive) {
      return res.status(404).json({ success: false, message: 'Turf not found or inactive.' });
    }

    // Validate sport belongs to turf
    const turfSport = await TurfSport.findOne({ _id: turfSportId, turf: turfId, isActive: true });
    if (!turfSport) {
      return res.status(400).json({ success: false, message: 'Selected sport is not available at this turf.' });
    }

    // Check booking date is in future
    const bDate = new Date(bookingDate);
    bDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (bDate < today) {
      return res.status(400).json({ success: false, message: 'Cannot book for a past date.' });
    }

    // Validate time is within operating hours
    if (startTime < turfSport.openingTime || endTime > turfSport.closingTime) {
      return res.status(400).json({
        success: false,
        message: `Slot must be within operating hours (${turfSport.openingTime} - ${turfSport.closingTime}).`
      });
    }

    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    const durationMinutes = (eh * 60 + em) - (sh * 60 + sm);
    if (durationMinutes <= 0) {
      return res.status(400).json({ success: false, message: 'End time must be after start time.' });
    }
    if (durationMinutes % turfSport.slotDuration !== 0) {
      return res.status(400).json({
        success: false,
        message: `Booking duration must be in ${turfSport.slotDuration}-minute increments.`
      });
    }

    // Check slot availability based on courts and current bookings
    const canBook = await Booking.isSlotAvailable(
      turfSportId,
      bDate,
      startTime,
      endTime,
      turfSport.totalCourts,
      ['accepted', 'pending']
    );

    if (!canBook) {
      return res.status(409).json({
        success: false,
        message: 'Slot unavailable. Please choose another time.'
      });
    }

    const hours = durationMinutes / 60;
    const amount = hours * turfSport.pricePerHour;

    const booking = await Booking.create({
      user: req.user.id,
      turf: turfId,
      turfSport: turfSportId,
      bookingDate: bDate,
      startTime,
      endTime,
      amount,
      notes,
      couponCode
    });

    const qrData = JSON.stringify({
      bookingId: booking._id,
      turf: turf.name,
      sport: turfSport.sportName,
      date: bookingDate,
      time: `${startTime} - ${endTime}`,
      amount
    });
    const qrCode = await QRCode.toDataURL(qrData);
    await Booking.findByIdAndUpdate(booking._id, { qrCode });

    const io = getIO();
    if (io) {
      io.to(`owner_${turf.owner}`).emit('new_booking', {
        message: 'New booking request received!',
        bookingId: booking._id
      });
    }

    sendEmail({
      to: req.user.email,
      subject: 'Booking Request Received - TurfHub',
      template: 'bookingConfirmation',
      data: { name: req.user.name, turf: turf.name, sport: turfSport.sportName, date: bookingDate, startTime, endTime, amount }
    }).catch(console.error);

    const populatedBooking = await Booking.findById(booking._id)
      .populate('turf', 'name address images')
      .populate('turfSport', 'sportName pricePerHour')
      .populate('user', 'name email phone');

    res.status(201).json({
      success: true,
      message: 'Booking request sent! Awaiting owner confirmation.',
      data: populatedBooking
    });
  } catch (error) {
    next(error);
  }
};

// ─── Get bookings ─────────────────────────────────────────────────────────────
exports.getBookings = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const query = {};

    if (req.user.role === 'customer') {
      query.user = req.user.id;
    } else if (req.user.role === 'owner') {
      // Get owner's turfs
      const ownerTurfs = await Turf.find({ owner: req.user.id }).select('_id');
      query.turf = { $in: ownerTurfs.map(t => t._id) };
    }

    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Booking.countDocuments(query);

    const bookings = await Booking.find(query)
      .populate('turf', 'name address images contactNumber')
      .populate('turfSport', 'sportName pricePerHour')
      .populate('user', 'name email phone')
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      success: true,
      count: bookings.length,
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      data: bookings
    });
  } catch (error) {
    next(error);
  }
};

// ─── Get single booking ───────────────────────────────────────────────────────
exports.getBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('turf', 'name address images contactNumber owner')
      .populate('turfSport', 'sportName pricePerHour openingTime closingTime')
      .populate('user', 'name email phone');

    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });

    // Access control
    const isOwner = booking.turf.owner && booking.turf.owner.toString() === req.user.id;
    const isCustomer = booking.user._id.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isCustomer && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    res.json({ success: true, data: booking });
  } catch (error) {
    next(error);
  }
};

// ─── Accept booking (owner) ───────────────────────────────────────────────────
exports.acceptBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('turf')
      .populate('turfSport')
      .populate('user', 'name email');

    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });
    if (booking.turf.owner.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }
    if (booking.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Booking is already ${booking.status}.` });
    }

    // Double-check slot still available before accepting
    const turfSport = await TurfSport.findById(booking.turfSport);
    if (!turfSport) {
      return res.status(404).json({ success: false, message: 'Sport details not found.' });
    }

    const isAvailable = await Booking.isSlotAvailable(
      booking.turfSport._id,
      booking.bookingDate,
      booking.startTime,
      booking.endTime,
      turfSport.totalCourts,
      ['accepted'],
      booking._id
    );

    if (!isAvailable) {
      booking.status = 'declined';
      await booking.save();
      return res.status(409).json({
        success: false,
        message: 'Slot conflict detected. Booking automatically declined.'
      });
    }

    booking.status = 'accepted';
    await booking.save();

    // Notify customer
    const io = getIO();
    if (io) {
      io.to(`user_${booking.user._id}`).emit('booking_accepted', {
        message: 'Your booking has been accepted!',
        bookingId: booking._id
      });
    }

    sendEmail({
      to: booking.user.email,
      subject: '✅ Booking Confirmed - TurfHub',
      template: 'bookingAccepted',
      data: { name: booking.user.name, turf: booking.turf.name, sport: booking.turfSport.sportName }
    }).catch(console.error);

    res.json({ success: true, message: 'Booking accepted!', data: booking });
  } catch (error) {
    next(error);
  }
};

// ─── Decline booking (owner) ──────────────────────────────────────────────────
exports.declineBooking = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const booking = await Booking.findById(req.params.id)
      .populate('turf')
      .populate('turfSport')
      .populate('user', 'name email');

    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });
    if (booking.turf.owner.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }
    if (booking.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Booking is already ${booking.status}.` });
    }

    booking.status = 'declined';
    booking.cancelReason = reason;
    await booking.save();

    const io = getIO();
    if (io) {
      io.to(`user_${booking.user._id}`).emit('booking_declined', {
        message: 'Your booking request was declined.',
        bookingId: booking._id
      });
    }

    res.json({ success: true, message: 'Booking declined.', data: booking });
  } catch (error) {
    next(error);
  }
};

// ─── Cancel booking (customer) ────────────────────────────────────────────────
exports.cancelBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });

    const isCustomer = booking.user.toString() === req.user.id;
    if (!isCustomer && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    if (!['pending', 'accepted'].includes(booking.status)) {
      return res.status(400).json({ success: false, message: 'This booking cannot be cancelled.' });
    }

    booking.status = 'cancelled';
    booking.cancelledBy = 'customer';
    booking.cancelReason = req.body.reason || 'Cancelled by customer';
    await booking.save();

    res.json({ success: true, message: 'Booking cancelled successfully.', data: booking });
  } catch (error) {
    next(error);
  }
};
