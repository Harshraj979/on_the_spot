// models.js — All our data structures in one place!
// This file defines what Users, Accidents, Claims, and Disputes look like in the database.

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

// ==================== 1. USER MODEL ====================
const userSchema = new mongoose.Schema({
  name:      { type: String, required: true, trim: true },
  email:     { type: String, required: true, unique: true, lowercase: true },
  password:  { type: String, required: true, minlength: 6, select: false },
  role:      { type: String, enum: ['user', 'agent', 'admin'], default: 'user' },
  phone:     { type: String, default: '' },
  isActive:  { type: Boolean, default: true },
}, { timestamps: true });

// Before saving a user, encrypt the password
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Check if password matches
userSchema.methods.comparePassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

// ==================== 2. ACCIDENT MODEL ====================
const accidentSchema = new mongoose.Schema({
  reportedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  caseNumber:   { type: String, unique: true },
  accidentType: { type: String, required: true },
  severity:     { type: String, required: true },
  dateTime:     { type: Date, required: true },
  location: {
    address:   { type: String, default: '' },
    city:      { type: String, default: '' },
    state:     { type: String, default: '' },
  },
  description:  { type: String, required: true },
  vehicles:     [{ type: String, make: String, model: String, licensePlate: String }],
  evidence:     [{ filename: String, originalName: String }],
  status:       { type: String, default: 'pending' },
}, { timestamps: true });

// Auto-generate case number
accidentSchema.pre('save', function (next) {
  if (!this.caseNumber) {
    this.caseNumber = 'OTS-' + Math.random().toString(36).substr(2, 6).toUpperCase();
  }
  next();
});

// ==================== 3. CLAIM MODEL ====================
const claimSchema = new mongoose.Schema({
  claimedBy:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  claimNumber:      { type: String, unique: true },
  claimType:        { type: String, required: true },
  policyNumber:     { type: String, required: true },
  insuranceCompany: { type: String, required: true },
  estimatedAmount:  { type: Number, required: true },
  approvedAmount:   { type: Number, default: 0 },
  description:      { type: String, required: true },
  status:           { type: String, default: 'submitted' },
}, { timestamps: true });

// Auto-generate claim number
claimSchema.pre('save', function (next) {
  if (!this.claimNumber) {
    this.claimNumber = 'CLM-' + Math.random().toString(36).substr(2, 6).toUpperCase();
  }
  next();
});

// ==================== 4. DISPUTE MODEL ====================
const disputeSchema = new mongoose.Schema({
  raisedBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  disputeNumber: { type: String, unique: true },
  disputeType:   { type: String, required: true },
  title:         { type: String, required: true },
  description:   { type: String, required: true },
  aiSuggestion:  { type: String, default: '' },
  status:        { type: String, default: 'open' },
}, { timestamps: true });

// Auto-generate dispute number
disputeSchema.pre('save', function (next) {
  if (!this.disputeNumber) {
    this.disputeNumber = 'DSP-' + Math.random().toString(36).substr(2, 6).toUpperCase();
  }
  next();
});

// Export all models
module.exports = {
  User:     mongoose.model('User', userSchema),
  Accident: mongoose.model('Accident', accidentSchema),
  Claim:    mongoose.model('Claim', claimSchema),
  Dispute:  mongoose.model('Dispute', disputeSchema),
};
