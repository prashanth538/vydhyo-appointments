const express = require('express');
const router = express.Router();
const { createAppointment, createDoctorSlots, getAllAppointments } = require('../controllers/appointmentsController');

router.post('/createAppointment', createAppointment);
router.post('/createDoctorSlots', createDoctorSlots);
router.get('/getAllAppointments', getAllAppointments);

module.exports = router;