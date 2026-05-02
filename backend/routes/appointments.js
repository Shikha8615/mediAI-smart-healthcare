const router = require('express').Router();
const Appointment = require('../models/Appointment');
const { protect, authorize } = require('../middleware/auth');

router.post('/', protect, authorize('patient'), async (req, res) => {
  try {
    const { doctorName, doctorSpecialty, date, time, reason } = req.body;
    if (!doctorName || !date || !time || !reason) return res.status(400).json({ success: false, message: 'All fields required' });
    const appt = await Appointment.create({
      patient: req.user._id, patientName: req.user.name,
      patientEmail: req.user.email, patientAge: req.user.age || 'N/A',
      patientGender: req.user.gender || 'N/A',
      doctorName, doctorSpecialty, date, time, reason,
    });
    res.status(201).json({ success: true, appointment: appt });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/my', protect, authorize('patient'), async (req, res) => {
  try {
    const appointments = await Appointment.find({ patient: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, appointments });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/doctor', protect, authorize('doctor'), async (req, res) => {
  try {
    const appointments = await Appointment.find({ doctorName: req.user.name }).sort({ createdAt: -1 });
    res.json({ success: true, appointments });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.get('/all', protect, authorize('admin'), async (req, res) => {
  try {
    const appointments = await Appointment.find().sort({ createdAt: -1 });
    res.json({ success: true, appointments });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.patch('/:id/status', protect, authorize('doctor', 'admin'), async (req, res) => {
  try {
    const { status, notes } = req.body;
    const appt = await Appointment.findById(req.params.id);
    if (!appt) return res.status(404).json({ success: false, message: 'Not found' });
    appt.status = status;
    if (notes) appt.notes = notes;
    await appt.save();
    res.json({ success: true, appointment: appt });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

router.patch('/:id/cancel', protect, authorize('patient'), async (req, res) => {
  try {
    const appt = await Appointment.findOne({ _id: req.params.id, patient: req.user._id });
    if (!appt) return res.status(404).json({ success: false, message: 'Not found' });
    appt.status = 'cancelled';
    await appt.save();
    res.json({ success: true, message: 'Cancelled' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
