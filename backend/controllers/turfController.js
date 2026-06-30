/**
 * Turf Controller
 * CRUD operations for turfs
 */

const Turf = require('../models/Turf');
const TurfSport = require('../models/TurfSport');
const Booking = require('../models/Booking');
const path = require('path');
const fs = require('fs');

// ─── Get all turfs (public) ───────────────────────────────────────────────────
exports.getTurfs = async (req, res, next) => {
  try {
    const { city, sport, search, page = 1, limit = 12, sort = '-createdAt' } = req.query;

    const query = { isActive: true };

    if (city) query['address.city'] = { $regex: city, $options: 'i' };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { 'address.city': { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by sport
    let turfIds;
    if (sport) {
      const sportsWithSport = await TurfSport.find({
        sportName: { $regex: sport, $options: 'i' },
        isActive: true
      }).select('turf');
      turfIds = sportsWithSport.map(s => s.turf);
      query._id = { $in: turfIds };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Turf.countDocuments(query);

    const turfs = await Turf.find(query)
      .populate('owner', 'name email phone')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    // Get sports for each turf
    const turfData = await Promise.all(turfs.map(async (turf) => {
      const sports = await TurfSport.find({ turf: turf._id, isActive: true }).select('sportName pricePerHour');
      return { ...turf.toJSON(), sports };
    }));

    res.json({
      success: true,
      count: turfData.length,
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      data: turfData
    });
  } catch (error) {
    next(error);
  }
};

// ─── Get single turf ──────────────────────────────────────────────────────────
exports.getTurf = async (req, res, next) => {
  try {
    const turf = await Turf.findById(req.params.id)
      .populate('owner', 'name email phone city');

    if (!turf) {
      return res.status(404).json({ success: false, message: 'Turf not found.' });
    }

    const sports = await TurfSport.find({ turf: turf._id, isActive: true });

    res.json({ success: true, data: { ...turf.toJSON(), sports } });
  } catch (error) {
    next(error);
  }
};

// ─── Create turf (owner only) ─────────────────────────────────────────────────
exports.createTurf = async (req, res, next) => {
  try {
    const { name, description, street, city, state, pincode, contactNumber, amenities } = req.body;

    const turfData = {
      owner: req.user.id,
      name,
      description,
      address: { street, city, state, pincode },
      contactNumber,
      amenities: amenities ? (Array.isArray(amenities) ? amenities : [amenities]) : []
    };

    // Handle uploaded images
    if (req.files && req.files.length > 0) {
      turfData.images = req.files.map((file, index) => ({
        url: `/uploads/turfs/${file.filename}`,
        filename: file.filename,
        isPrimary: index === 0
      }));
    }

    const turf = await Turf.create(turfData);

    res.status(201).json({
      success: true,
      message: 'Turf created successfully!',
      data: turf
    });
  } catch (error) {
    next(error);
  }
};

// ─── Update turf ──────────────────────────────────────────────────────────────
exports.updateTurf = async (req, res, next) => {
  try {
    const turf = await Turf.findById(req.params.id);

    if (!turf) return res.status(404).json({ success: false, message: 'Turf not found.' });
    if (turf.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to update this turf.' });
    }

    const { name, description, street, city, state, pincode, contactNumber, amenities, isActive } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (description) updateData.description = description;
    if (contactNumber) updateData.contactNumber = contactNumber;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (amenities) updateData.amenities = Array.isArray(amenities) ? amenities : [amenities];
    if (street || city || state || pincode) {
      updateData.address = {
        street: street || turf.address.street,
        city: city || turf.address.city,
        state: state || turf.address.state,
        pincode: pincode || turf.address.pincode
      };
    }

    // Handle new image uploads
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map((file, index) => ({
        url: `/uploads/turfs/${file.filename}`,
        filename: file.filename,
        isPrimary: turf.images.length === 0 && index === 0
      }));
      updateData.images = [...(turf.images || []), ...newImages];
    }

    const updated = await Turf.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true
    }).populate('owner', 'name email');

    res.json({ success: true, message: 'Turf updated successfully.', data: updated });
  } catch (error) {
    next(error);
  }
};

// ─── Delete turf ──────────────────────────────────────────────────────────────
exports.deleteTurf = async (req, res, next) => {
  try {
    const turf = await Turf.findById(req.params.id);
    if (!turf) return res.status(404).json({ success: false, message: 'Turf not found.' });
    if (turf.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    // Soft delete (deactivate)
    turf.isActive = false;
    await turf.save();

    res.json({ success: true, message: 'Turf deactivated successfully.' });
  } catch (error) {
    next(error);
  }
};

// ─── Get owner's turfs ────────────────────────────────────────────────────────
exports.getMyTurfs = async (req, res, next) => {
  try {
    const turfs = await Turf.find({ owner: req.user.id }).sort('-createdAt');

    const turfData = await Promise.all(turfs.map(async (turf) => {
      const sports = await TurfSport.find({ turf: turf._id, isActive: true });
      return { ...turf.toJSON(), sports };
    }));

    res.json({ success: true, count: turfData.length, data: turfData });
  } catch (error) {
    next(error);
  }
};

// ─── Get available slots ──────────────────────────────────────────────────────
exports.getAvailableSlots = async (req, res, next) => {
  try {
    const { turfSportId, date, duration } = req.query;
    if (!turfSportId || !date) {
      return res.status(400).json({ success: false, message: 'turfSportId and date are required.' });
    }

    const turfSport = await TurfSport.findById(turfSportId);
    if (!turfSport) return res.status(404).json({ success: false, message: 'Sport not found.' });

    const requestedDuration = duration ? parseInt(duration, 10) : turfSport.slotDuration;
    if (!requestedDuration || requestedDuration % turfSport.slotDuration !== 0) {
      return res.status(400).json({
        success: false,
        message: `Duration must be a multiple of ${turfSport.slotDuration} minutes.`
      });
    }

    const allSlots = turfSport.generateSlots(date, requestedDuration);

    const bookingDate = new Date(date);
    bookingDate.setHours(0, 0, 0, 0);

    const bookings = await Booking.find({
      turfSport: turfSportId,
      bookingDate,
      status: 'accepted'
    }).select('startTime endTime');

    const slotsWithAvailability = allSlots.map(slot => {
      const overlapCount = bookings.filter(b =>
        b.startTime < slot.endTime && b.endTime > slot.startTime
      ).length;
      return { ...slot, available: overlapCount < turfSport.totalCourts };
    });

    res.json({
      success: true,
      data: {
        sport: turfSport,
        slots: slotsWithAvailability,
        date
      }
    });
  } catch (error) {
    next(error);
  }
};

// ─── Delete turf image ────────────────────────────────────────────────────────
exports.deleteTurfImage = async (req, res, next) => {
  try {
    const { imageId } = req.params;
    const turf = await Turf.findById(req.params.id);
    if (!turf) return res.status(404).json({ success: false, message: 'Turf not found.' });
    if (turf.owner.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    const imgIndex = turf.images.findIndex(img => img._id.toString() === imageId);
    if (imgIndex === -1) return res.status(404).json({ success: false, message: 'Image not found.' });

    const img = turf.images[imgIndex];
    // Delete file
    const filePath = path.join(__dirname, '../uploads/turfs', img.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    turf.images.splice(imgIndex, 1);
    if (turf.images.length > 0 && !turf.images.some(i => i.isPrimary)) {
      turf.images[0].isPrimary = true;
    }
    await turf.save();

    res.json({ success: true, message: 'Image deleted.', data: turf });
  } catch (error) {
    next(error);
  }
};
