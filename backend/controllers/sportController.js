/**
 * TurfSport Controller
 * Manage sports for a turf
 */

const TurfSport = require('../models/TurfSport');
const Turf = require('../models/Turf');

// ─── Add sport to a turf ──────────────────────────────────────────────────────
exports.addSport = async (req, res, next) => {
  try {
    const { turfId, sportName, pricePerHour, openingTime, closingTime, slotDuration, totalCourts } = req.body;

    const turf = await Turf.findById(turfId);
    if (!turf) return res.status(404).json({ success: false, message: 'Turf not found.' });
    if (turf.owner.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    // Check if this sport already exists in turf
    const existing = await TurfSport.findOne({ turf: turfId, sportName });
    if (existing) {
      return res.status(400).json({ success: false, message: `${sportName} is already added to this turf.` });
    }

    const sport = await TurfSport.create({
      turf: turfId,
      sportName,
      pricePerHour,
      openingTime,
      closingTime,
      slotDuration: slotDuration || 60,
      totalCourts: totalCourts || 1,
      isPredefined: TurfSport.PREDEFINED_SPORTS.includes(sportName)
    });

    res.status(201).json({ success: true, message: `${sportName} added successfully!`, data: sport });
  } catch (error) {
    next(error);
  }
};

// ─── Get all sports for a turf ────────────────────────────────────────────────
exports.getTurfSports = async (req, res, next) => {
  try {
    const sports = await TurfSport.find({ turf: req.params.turfId, isActive: true });
    res.json({ success: true, data: sports });
  } catch (error) {
    next(error);
  }
};

// ─── Update sport ─────────────────────────────────────────────────────────────
exports.updateSport = async (req, res, next) => {
  try {
    const sport = await TurfSport.findById(req.params.id).populate('turf');
    if (!sport) return res.status(404).json({ success: false, message: 'Sport not found.' });
    if (sport.turf.owner.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    const { pricePerHour, openingTime, closingTime, slotDuration, totalCourts, isActive } = req.body;

    const updateData = {};
    if (pricePerHour !== undefined) updateData.pricePerHour = pricePerHour;
    if (openingTime) updateData.openingTime = openingTime;
    if (closingTime) updateData.closingTime = closingTime;
    if (slotDuration) updateData.slotDuration = slotDuration;
    if (totalCourts !== undefined) updateData.totalCourts = totalCourts;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updated = await TurfSport.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true
    });

    res.json({ success: true, message: 'Sport updated successfully.', data: updated });
  } catch (error) {
    next(error);
  }
};

// ─── Delete sport ─────────────────────────────────────────────────────────────
exports.deleteSport = async (req, res, next) => {
  try {
    const sport = await TurfSport.findById(req.params.id).populate('turf');
    if (!sport) return res.status(404).json({ success: false, message: 'Sport not found.' });
    if (sport.turf.owner.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    // Soft delete
    sport.isActive = false;
    await sport.save();

    res.json({ success: true, message: 'Sport removed successfully.' });
  } catch (error) {
    next(error);
  }
};

// ─── Get predefined sports list ───────────────────────────────────────────────
exports.getPredefinedSports = (req, res) => {
  res.json({ success: true, data: TurfSport.PREDEFINED_SPORTS });
};
