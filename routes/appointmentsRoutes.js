const express = require('express');
const router = express.Router();
const { createAppointment, createDoctorSlots, getAppointmentsWithPayments, getAppointmentTypeCounts,getAllAppointments } = require('../controllers/appointmentsController');

router.post('/createAppointment', createAppointment);
router.post('/createDoctorSlots', createDoctorSlots);
router.get('/getAppointments', getAppointmentsWithPayments);
router.get('/getAllAppointments', getAllAppointments);

router.get('/getAppointmentTypeCounts', getAppointmentTypeCounts);


module.exports = router;