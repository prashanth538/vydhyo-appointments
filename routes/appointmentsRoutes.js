const express = require('express');
const router = express.Router();
const { createAppointment, createDoctorSlots, getAppointmentsWithPayments } = require('../controllers/appointmentsController');

router.post('/createAppointment', createAppointment);
router.post('/createDoctorSlots', createDoctorSlots);
router.get('/getAppointments', getAppointmentsWithPayments);

module.exports = router;