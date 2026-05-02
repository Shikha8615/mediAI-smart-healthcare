const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const appointmentSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  patientName: String,
  patientEmail: String,
  patientAge: String,
  patientGender: String,
  doctorName: { type: String, required: true },
  doctorSpecialty: String,
  date: { type: String, required: true },
  time: { type: String, required: true },
  reason: { type: String, required: true },
  status: { type: String, enum: ['pending','confirmed','completed','cancelled'], default: 'pending' },
  notes: String,
  videoRoomId: { type: String, default: () => uuidv4() },
}, { timestamps: true });

module.exports = mongoose.model('Appointment', appointmentSchema);
