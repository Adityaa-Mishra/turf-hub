/**
 * Dashboard Controller
 * Analytics for owner and customer dashboards
 */

const Booking = require('../models/Booking');
const Turf = require('../models/Turf');
const TurfSport = require('../models/TurfSport');
const Review = require('../models/Review');
const User = require('../models/User');

// ─── Owner Dashboard ──────────────────────────────────────────────────────────
exports.getOwnerDashboard = async (req, res, next) => {
  try {
    const ownerTurfs = await Turf.find({ owner: req.user.id }).select('_id name');
    const turfIds = ownerTurfs.map(t => t._id);

    const [
      totalBookings,
      acceptedBookings,
      declinedBookings,
      pendingBookings,
      cancelledBookings,
      revenueData
    ] = await Promise.all([
      Booking.countDocuments({ turf: { $in: turfIds } }),
      Booking.countDocuments({ turf: { $in: turfIds }, status: 'accepted' }),
      Booking.countDocuments({ turf: { $in: turfIds }, status: 'declined' }),
      Booking.countDocuments({ turf: { $in: turfIds }, status: 'pending' }),
      Booking.countDocuments({ turf: { $in: turfIds }, status: 'cancelled' }),
      Booking.aggregate([
        { $match: { turf: { $in: turfIds }, status: 'accepted' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);

    const totalRevenue = revenueData[0]?.total || 0;

    const turfSports = await TurfSport.find({ turf: { $in: turfIds }, isActive: true })
      .select('turf sportName pricePerHour openingTime closingTime slotDuration totalCourts');

    const activeSportsCount = turfSports.length;
    const averagePricePerHour = activeSportsCount
      ? turfSports.reduce((sum, sport) => sum + sport.pricePerHour, 0) / activeSportsCount
      : 0;

    const sportsByTurf = ownerTurfs.map(turf => ({
      turfId: turf._id,
      turfName: turf.name,
      sports: turfSports.filter(sport => sport.turf.toString() === turf._id.toString())
    }));

    // Monthly revenue (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyRevenue = await Booking.aggregate([
      {
        $match: {
          turf: { $in: turfIds },
          status: 'accepted',
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          revenue: { $sum: '$amount' },
          bookings: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Reviews
    const totalReviews = await Review.countDocuments({ turf: { $in: turfIds } });
    const recentReviews = await Review.find({ turf: { $in: turfIds } })
      .populate('turf', 'name')
      .populate('user', 'name avatar')
      .sort('-createdAt')
      .limit(10);

    // Upcoming bookings
    const upcomingBookings = await Booking.find({
      turf: { $in: turfIds },
      status: 'accepted',
      bookingDate: { $gte: new Date() }
    })
      .populate('turf', 'name')
      .populate('turfSport', 'sportName')
      .populate('user', 'name phone')
      .sort('bookingDate startTime')
      .limit(5);

    // Recent bookings
    const recentActivity = await Booking.find({ turf: { $in: turfIds } })
      .populate('turf', 'name')
      .populate('turfSport', 'sportName')
      .populate('user', 'name')
      .sort('-createdAt')
      .limit(10);

    // Sport-wise bookings
    const sportBreakdown = await Booking.aggregate([
      { $match: { turf: { $in: turfIds }, status: 'accepted' } },
      {
        $lookup: {
          from: 'turfsports',
          localField: 'turfSport',
          foreignField: '_id',
          as: 'sport'
        }
      },
      { $unwind: '$sport' },
      {
        $group: {
          _id: '$sport.sportName',
          bookings: { $sum: 1 },
          revenue: { $sum: '$amount' }
        }
      },
      { $sort: { bookings: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        stats: {
          totalBookings,
          acceptedBookings,
          declinedBookings,
          pendingBookings,
          cancelledBookings,
          totalRevenue,
          totalTurfs: ownerTurfs.length,
          activeSportsCount,
          averagePricePerHour,
          totalReviews
        },
        monthlyRevenue,
        sportBreakdown,
        sportsByTurf,
        upcomingBookings,
        recentActivity,
        recentReviews
      }
    });
  } catch (error) {
    next(error);
  }
};

// ─── Customer Dashboard ───────────────────────────────────────────────────────
exports.getCustomerDashboard = async (req, res, next) => {
  try {
    const [
      totalBookings,
      pendingBookings,
      upcomingBookings,
      cancelledBookings
    ] = await Promise.all([
      Booking.countDocuments({ user: req.user.id }),
      Booking.countDocuments({ user: req.user.id, status: 'pending' }),
      Booking.countDocuments({
        user: req.user.id,
        status: 'accepted',
        bookingDate: { $gte: new Date() }
      }),
      Booking.countDocuments({ user: req.user.id, status: 'cancelled' })
    ]);

    const recentBookings = await Booking.find({ user: req.user.id })
      .populate('turf', 'name address images')
      .populate('turfSport', 'sportName pricePerHour')
      .sort('-createdAt')
      .limit(5);

    const nextBookings = await Booking.find({
      user: req.user.id,
      status: 'accepted',
      bookingDate: { $gte: new Date() }
    })
      .populate('turf', 'name address images contactNumber')
      .populate('turfSport', 'sportName')
      .sort('bookingDate startTime')
      .limit(3);

    res.json({
      success: true,
      data: {
        stats: {
          totalBookings,
          pendingBookings,
          upcomingBookings,
          cancelledBookings
        },
        recentBookings,
        nextBookings
      }
    });
  } catch (error) {
    next(error);
  }
};

// ─── Admin Dashboard ──────────────────────────────────────────────────────────
exports.getAdminDashboard = async (req, res, next) => {
  try {
    const [totalUsers, totalOwners, totalTurfs, totalBookings] = await Promise.all([
      User.countDocuments({ role: 'customer' }),
      User.countDocuments({ role: 'owner' }),
      Turf.countDocuments(),
      Booking.countDocuments()
    ]);

    const revenue = await Booking.aggregate([
      { $match: { status: 'accepted' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        totalOwners,
        totalTurfs,
        totalBookings,
        totalRevenue: revenue[0]?.total || 0
      }
    });
  } catch (error) {
    next(error);
  }
};
