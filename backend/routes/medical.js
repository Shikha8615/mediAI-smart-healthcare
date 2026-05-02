const router = require('express').Router();
const { Prediction, Report } = require('../models/Medical');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

router.post('/predict', protect, authorize('patient'), async (req, res) => {
  try {
    const pred = await Prediction.create({ patient: req.user._id, patientEmail: req.user.email, patientName: req.user.name, ...req.body });
    res.status(201).json({ success: true, prediction: pred });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/predictions/my', protect, authorize('patient'), async (req, res) => {
  try {
    const predictions = await Prediction.find({ patient: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, predictions });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/predictions/all', protect, authorize('admin', 'doctor'), async (req, res) => {
  try {
    const predictions = await Prediction.find().sort({ createdAt: -1 });
    res.json({ success: true, predictions });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/predictions/patient/:email', protect, authorize('doctor', 'admin'), async (req, res) => {
  try {
    const predictions = await Prediction.find({ patientEmail: req.params.email }).sort({ createdAt: -1 });
    res.json({ success: true, predictions });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/reports', protect, authorize('doctor'), async (req, res) => {
  try {
    const { patientEmail, patientName, diagnosis, prescription, notes, followUp } = req.body;
    if (!patientEmail || !diagnosis || !prescription) return res.status(400).json({ success: false, message: 'Required fields missing' });
    const patient = await User.findOne({ email: patientEmail });
    const report = await Report.create({
      patient: patient?._id, patientEmail, patientName,
      doctor: req.user._id, doctorName: req.user.name,
      doctorSpecialty: req.user.specialty || 'General Medicine',
      diagnosis, prescription, notes, followUp,
    });
    res.status(201).json({ success: true, report });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/reports/my', protect, authorize('patient'), async (req, res) => {
  try {
    const reports = await Report.find({ patientEmail: req.user.email }).sort({ createdAt: -1 });
    res.json({ success: true, reports });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/reports/doctor', protect, authorize('doctor'), async (req, res) => {
  try {
    const reports = await Report.find({ doctor: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, reports });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/reports/all', protect, authorize('admin'), async (req, res) => {
  try {
    const reports = await Report.find().sort({ createdAt: -1 });
    res.json({ success: true, reports });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
