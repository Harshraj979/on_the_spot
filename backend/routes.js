// routes.js — All our main features in one place!
// This file handles Accidents, Claims, and Disputes.

const express = require('express');
const router  = express.Router();
const fs      = require('fs');
const path    = require('path');
const multer  = require('multer');

// Import from our new flat structure
const { Accident, Claim, Dispute } = require('./models');
const { protect, checkRole }       = require('./auth');
const { getAISuggestion }          = require('./ai');

// ==================== 1. FILE UPLOADS SETUP ====================
// This part handles photos and documents sent from the frontend.
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, 'uploads'); // Save in "uploads" folder
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname); // Add timestamp to filename
  },
});
const upload = multer({ storage: storage });

// ==================== 2. ACCIDENTS (Reporting) ====================

// GET ALL ACCIDENTS (Users see their own, Admin sees all)
router.get('/accidents', protect, async function (req, res) {
  const filter = req.user.role === 'user' ? { reportedBy: req.user._id } : {};
  const list = await Accident.find(filter).sort({ createdAt: -1 }).populate('reportedBy', 'name');
  res.json({ success: true, data: list });
});

// CREATE NEW ACCIDENT REPORT
router.post('/accidents', protect, upload.array('evidence', 5), async function (req, res) {
  try {
    const body = req.body;
    // FormData sends data as strings, so we parse if needed
    const loc = typeof body.location === 'string' ? JSON.parse(body.location) : body.location;
    
    const report = await Accident.create({
      reportedBy:   req.user._id,
      accidentType: body.accidentType,
      severity:     body.severity,
      dateTime:     body.dateTime || new Date(),
      location:     loc || {},
      description:  body.description,
      evidence:     req.files ? req.files.map(f => ({ filename: f.filename, originalName: f.originalname })) : [],
    });

    // Real-time update (if socket.io is ready)
    const io = req.app.get('io');
    if (io) io.emit('accident:new', report);

    res.status(201).json({ success: true, data: report });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== 3. CLAIMS (Insurance) ====================

// GET ALL CLAIMS
router.get('/claims', protect, async function (req, res) {
  const filter = req.user.role === 'user' ? { claimedBy: req.user._id } : {};
  const list = await Claim.find(filter).sort({ createdAt: -1 }).populate('claimedBy', 'name');
  res.json({ success: true, data: list });
});

// CREATE NEW CLAIM
router.post('/claims', protect, upload.array('documents', 5), async function (req, res) {
  try {
    const claim = await Claim.create({
      claimedBy:        req.user._id,
      claimType:        req.body.claimType,
      policyNumber:     req.body.policyNumber,
      insuranceCompany: req.body.insuranceCompany,
      estimatedAmount:  req.body.estimatedAmount,
      description:      req.body.description,
    });
    res.status(201).json({ success: true, data: claim });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==================== 4. DISPUTES (Resolution) ====================

// GET ALL DISPUTES
router.get('/disputes', protect, async function (req, res) {
  const filter = req.user.role === 'user' ? { raisedBy: req.user._id } : {};
  const list = await Dispute.find(filter).sort({ createdAt: -1 }).populate('raisedBy', 'name');
  res.json({ success: true, data: list });
});

// CREATE NEW DISPUTE (with AI suggestion)
router.post('/disputes', protect, upload.array('documents', 5), async function (req, res) {
  try {
    const dispute = await Dispute.create({
      raisedBy:    req.user._id,
      disputeType: req.body.disputeType,
      title:       req.body.title,
      description: req.body.description,
    });

    // Get AI suggestion in the background
    const suggestion = await getAISuggestion(dispute.description, dispute.disputeType);
    dispute.aiSuggestion = suggestion;
    await dispute.save();

    res.status(201).json({ success: true, data: dispute });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET SINGLE DISPUTE
router.get('/disputes/:id', protect, async function (req, res) {
  const d = await Dispute.findById(req.params.id).populate('raisedBy', 'name email');
  if (!d) return res.status(404).json({ success: false, message: 'Dispute not found' });
  res.json({ success: true, data: d });
});

module.exports = router;
