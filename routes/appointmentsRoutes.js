const express = require('express');
const router = express.Router();
const { createAppointment, createDoctorSlots } = require('../controllers/appointmentsController');

router.post('/createAppointment', createAppointment);
router.post('/createDoctorSlots', createDoctorSlots);

module.exports = router;