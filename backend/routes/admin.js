const router = require('express').Router();
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const { Prediction, Report } = require('../models/Medical');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('admin'));

router.get('/stats', async (req, res) => {
  try {
    const [totalPatients, totalDoctors, totalAppointments, pendingAppointments,
           totalPredictions, totalReports, recentUsers, recentAppointments] = await Promise.all([
      User.countDocuments({ role: 'patient' }),
      User.countDocuments({ role: 'doctor' }),
      Appointment.countDocuments(),
      Appointment.countDocuments({ status: 'pending' }),
      Prediction.countDocuments(),
      Report.countDocuments(),
      User.find({ role: { $ne: 'admin' } }).sort({ createdAt: -1 }).limit(6),
      Appointment.find().sort({ createdAt: -1 }).limit(6),
    ]);
    res.json({ success: true, stats: { totalPatients, totalDoctors, totalAppointments, pendingAppointments, totalPredictions, totalReports, recentUsers, recentAppointments } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/users', async (req, res) => {
  try {
    const { role, search } = req.query;
    let q = { role: { $ne: 'admin' } };
    if (role && role !== 'all') q.role = role;
    if (search) q.$or = [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }];
    const users = await User.find(q).sort({ createdAt: -1 });
    res.json({ success: true, users });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.patch('/users/:id/toggle', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || user.role === 'admin') return res.status(404).json({ success: false, message: 'Not found' });
    user.isActive = !user.isActive;
    await user.save({ validateBeforeSave: false });
    res.json({ success: true, message: `User ${user.isActive ? 'activated' : 'deactivated'}`, user });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || user.role === 'admin') return res.status(404).json({ success: false, message: 'Not found' });
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'User deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/analytics', async (req, res) => {
  try {
    const [diseaseStats, apptByStatus, userGrowth] = await Promise.all([
      Prediction.aggregate([{ $group: { _id: '$disease', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 10 }]),
      Appointment.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      User.aggregate([
        { $match: { createdAt: { $gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) } } },
        { $group: { _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
    ]);
    res.json({ success: true, analytics: { diseaseStats, apptByStatus, userGrowth } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
