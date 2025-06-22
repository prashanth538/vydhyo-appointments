function generateSlots(startTime, endTime, interval) {
  const slots = [];
  const toMinutes = t => parseInt(t.split(':')[0]) * 60 + parseInt(t.split(':')[1]);
  const toTimeString = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

  let start = toMinutes(startTime);
  const end = toMinutes(endTime);

  while (start < end) {
    slots.push({ time: toTimeString(start), status: 'available' });
    start += interval;
  }

  return slots;
}
module.exports = generateSlots;