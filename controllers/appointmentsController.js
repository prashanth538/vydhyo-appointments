const appointmentModel = require('../models/appointmentsModel');
const sequenceSchema = require('../sequence/sequenceSchema');
const appointmentSchema = require('../schemas/appointmentSchema');
const DoctorSlotModel = require('../models/doctorSlotsModel');
const doctorSlotSchema = require('../schemas/doctorSlotsSchema');
const { SEQUENCE_PREFIX } = require('../utils/constants');
const generateSlots = require('../utils/generateTimeSlots');
const { getUserById, getUserDetailsBatch } = require('../services/userService');
const { createPayment, getAppointmentPayments } = require('../services/paymentService');
const moment = require('moment-timezone');

exports.createAppointment = async (req, res) => {
  try {
    const { error } = appointmentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        status: 'fail',
        message: error.details[0].message,
      });
    }
    const appointmentDateTime = moment.tz(`${req.body.appointmentDate} ${req.body.appointmentTime}`, 'YYYY-MM-DD HH:mm', 'Asia/Kolkata');
    const now = moment.tz('Asia/Kolkata');

    if (appointmentDateTime.isBefore(now)) {
      return res.status(208).json({
        status: 'fail',
        message: 'Appointment date & time must not be in the past.'
      });
    }

    const checkSlotAvaliable = await appointmentModel.find({
      "doctorId": req.body.doctorId,
      "appointmentDate": new Date(req.body.appointmentDate),
      "appointmentTime": req.body.appointmentTime,
      "appointmentStatus": { $in: ["pending", "scheduled"] }
    });

    if (checkSlotAvaliable.length > 0) {
      return res.status(208).json({
        status: 'fail',
        message: 'Slot already booked for this date and time',
      });
    }
    req.body.createdBy = req.headers ? req.headers.userid : null;
    req.body.updatedBy = req.headers ? req.headers.userid : null;

    const appointmentCounter = await sequenceSchema.findByIdAndUpdate({
      _id: SEQUENCE_PREFIX.APPOINTMENTS_SEQUENCE.APPOINTMENTS_MODEL
    }, { $inc: { seq: 1 } }, { new: true, upsert: true });

    req.body.appointmentId = SEQUENCE_PREFIX.APPOINTMENTS_SEQUENCE.SEQUENCE.concat(appointmentCounter.seq);
    const appointment = await appointmentModel.create(req.body);
    let paymentResponse = { status: 'pending' };
    if (req.body.paymentStatus === 'paid') {
      paymentResponse = await createPayment(req.headers.authorization, {
        userId: req.body.userId,
        doctorId: req.body.doctorId,
        appointmentId: req.body.appointmentId,
        actualAmount: req.body.amount,
        discount: req.body.discount || 0,
        discountType: req.body.discountType,
        finalAmount: req.body.finalAmount,
        paymentStatus: 'success'
      });

      if (!paymentResponse || paymentResponse.status !== 'success') {
        return res.status(500).json({
          status: 'fail',
          message: 'Payment failed, please try again later.',
        });
      }
    }
    const updateAppointment = await appointmentModel.findByIdAndUpdate(
      appointment._id,
      { appointmentStatus: 'scheduled' },
      { new: true }
    );
    if (!appointment) {
      return res.status(404).json({
        status: 'fail',
        message: 'appointment not created',
      });
    }

    return res.status(200).json({
      status: 'success',
      message: 'appointment created successfully',
      data: {
        appointmentDetails: updateAppointment,
        paymentDetails: paymentResponse.data
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating appointment', error: error.message });
  }
};

//getAllAppointmentCount
exports.getAllAppointments = async (req, res) => {
  try {
    // Fetch all appointments without any filters
    const appointments = await appointmentModel.find({});

    return res.status(200).json({
      status: 'success',
      message: 'Appointments retrieved successfully',
      data: {
        totalAppointmentsCount: appointments.length,
        totalAppointments: appointments,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: 'fail',
      message: 'Error retrieving appointments',
      error: error.message,
    });
  }
};

exports.createDoctorSlots = async (req, res) => {
  try {
    const { doctorId, date } = req.body;
    const slotDate = new Date(date);
    const existingSlots = await DoctorSlotModel.findOne({ doctorId, date: slotDate });
    if (existingSlots) {
      return res.status(200).json({
        status: 'success',
        message: `Slots already created for this date ${date}`,
        data: existingSlots,
      });
    }
    const userDetails = await getUserById(doctorId, req.headers.authorization);
    console.log('User Details:', userDetails);
    return;
    const slots = generateSlots();
    req.body.slots = slots;
    const { error } = doctorSlotSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        status: 'fail',
        message: error.details[0].message,
      });
    }
    const newSlots = await DoctorSlotModel.create({ doctorId, date: slotDate, slots });
    if (!newSlots) {
      return res.status(404).json({
        status: 'fail',
        message: 'slots not created',
      });
    }

    return res.status(200).json({
      status: 'success',
      message: 'slots created successfully',
      data: newSlots,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Slots already created for this doctor and date' });
    }
    res.status(500).json({ error: err.message });
  }
}

exports.getAppointmentsWithPayments = async (req, res) => {
  try {
    const {
      doctorId,
      appointmentType,
      appointmentDepartment,
      appointmentStatus,
      appointmentDate,
      fromDate,
      toDate
    } = req.query;

    if (!doctorId) return res.status(400).json({ status: 'fail', message: "doctorId is required" });

    const query = { doctorId };
    if (appointmentType) query.appointmentType = appointmentType;
    if (appointmentDepartment) query.appointmentDepartment = appointmentDepartment;
    if (appointmentStatus) query.appointmentStatus = appointmentStatus;

    if (appointmentDate) {
      query.appointmentDate = new Date(appointmentDate);
    }

    if (fromDate || toDate) {
      query.appointmentDate = query.appointmentDate || {};
      if (fromDate) query.appointmentDate.$gte = new Date(fromDate);
      if (toDate) query.appointmentDate.$lte = new Date(toDate);
    }
    const appointments = await appointmentModel.find(query);

    if (!appointments.length) return res.status(404).json({ status: 'fail', message: "No appointments found" });

    const userIdsSet = new Set();
    appointments.forEach(appt => {
      userIdsSet.add(appt.userId);
      userIdsSet.add(appt.doctorId);
    });
    const allUserIds = Array.from(userIdsSet);
    const userBodyParams = { userIds: allUserIds };
    const users = await getUserDetailsBatch(req.headers.authorization, userBodyParams);
    
    const userMap = new Map();
    users.forEach(user => userMap.set(user.userId, user));

    const appointmentIds = appointments.map(appointment => appointment.appointmentId.toString());

    const paymentBodyParams = { "appointmentIds": appointmentIds };

    const { payments } = await getAppointmentPayments(req.headers.authorization, paymentBodyParams);

    const paymentMap = new Map();
    payments.forEach(payment => paymentMap.set(payment.appointmentId, payment));

   const result = appointments.map(appt => {
      const userDetails = userMap.get(appt.userId) || null;
      const doctorDetails = userMap.get(appt.doctorId) || null;
      return {
        ...appt.toObject(),
        patientDetails: userDetails,
        doctorDetails: doctorDetails,
        paymentDetails: paymentMap.get(appt.appointmentId.toString()) || null
      };
    });

    res.json({ status: "success", data: result });
  } catch (err) {
    console.error('Error in getAppointmentsWithPayments:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.getAppointmentTypeCounts = async (req, res) => {
  try {
    const counts = await appointmentModel.aggregate([
      {
        $match: {
          appointmentStatus: { $ne: 'cancelled' },
          appointmentType: { $in: ['In-Person', 'Video', 'home-visit'] }
        }
      },
      {
        $group: {
          _id: '$appointmentType',
          count: { $sum: 1 }
        }
      }
    ]);
    // Format response as { appointmentType: count }
    const result = {
      "In-Person": 0,
      "Video": 0,
      "home-visit": 0
    };
    counts.forEach(item => {
      result[item._id] = item.count;
    });
    res.json({ result });
  } catch (err) {
    res.status(500).json({ status: "fail", message: err.message });
  }
};

async function bookSlot(doctorId, date, time, appointmentId) {
  const result = await DoctorSlotModel.updateOne(
    { doctorId, date, "slots.time": time, "slots.status": "available" },
    {
      $set: {
        "slots.$.status": "booked",
        "slots.$.appointmentId": appointmentId
      }
    }
  );

  if (result.modifiedCount === 0) {
    throw new Error('Slot already booked or does not exist');
  }
}



async function cancelSlot(doctorId, date, time) {
  await DoctorSlotModel.updateOne(
    { doctorId, date, "slots.time": time },
    {
      $set: {
        "slots.$.status": "available",
        "slots.$.appointmentId": null
      }
    }
  );
}



