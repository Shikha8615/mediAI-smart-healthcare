const mongoose = require('mongoose');

const predictionSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  patientEmail: String,
  patientName: String,
  disease: String,
  confidence: Number,
  severity: { type: String, enum: ['mild','moderate','severe','critical'] },
  category: String,
  icd: String,
  explanation: String,
  recommendations: [String],
  urgency: String,
  symptoms: [String],
  alternatives: [{ name: String, score: Number }],
}, { timestamps: true });

const reportSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  patientEmail: { type: String, required: true },
  patientName: String,
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  doctorName: { type: String, required: true },
  doctorSpecialty: String,
  diagnosis: { type: String, required: true },
  prescription: { type: String, required: true },
  notes: String,
  followUp: String,
}, { timestamps: true });

module.exports = {
  Prediction: mongoose.model('Prediction', predictionSchema),
  Report: mongoose.model('Report', reportSchema),
};
