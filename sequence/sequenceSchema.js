const mongoose = require('mongoose');

const sequenceSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

const Counter = mongoose.model('sequence', sequenceSchema);
module.exports = Counter;
