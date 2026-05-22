/**
 * Queue utility helpers
 */
const QueueEntry = require('../models/QueueEntry');

/**
 * Generate the next queue number for a clinic today.
 * Format: A-001, A-002, ...
 * Each clinic uses the first letter of its name as prefix.
 * @param {string} clinicId
 * @param {string} prefix - e.g. "A"
 * @returns {Promise<string>}
 */
const getNextQueueNumber = async (clinicId, prefix = 'A') => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const count = await QueueEntry.countDocuments({
    clinic: clinicId,
    joinedAt: { $gte: todayStart, $lte: todayEnd },
    status: { $ne: 'cancelled' },
  });

  const number = (count + 1).toString().padStart(3, '0');
  return `${prefix}-${number}`;
};

/**
 * Calculate average waiting time for a clinic today (excluding cancelled entries)
 * @param {string} clinicId
 * @returns {Promise<number>} average wait in minutes
 */
const getAvgWaitTime = async (clinicId) => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const result = await QueueEntry.aggregate([
    {
      $match: {
        clinic: clinicId,
        joinedAt: { $gte: todayStart },
        status: 'done',
        actualWaitMinutes: { $ne: null, $gt: 0 },
      },
    },
    {
      $group: {
        _id: null,
        avgWait: { $avg: '$actualWaitMinutes' },
        avgTurnaround: { $avg: '$turnaroundMinutes' },
      },
    },
  ]);

  if (!result.length) return { avgWait: 0, avgTurnaround: 0 };
  return {
    avgWait: Math.round(result[0].avgWait),
    avgTurnaround: Math.round(result[0].avgTurnaround),
  };
};

/**
 * Get active queue count for a clinic
 * @param {string} clinicId
 * @returns {Promise<number>}
 */
const getActiveQueueCount = async (clinicId) => {
  return QueueEntry.countDocuments({
    clinic: clinicId,
    status: { $in: ['waiting', 'serving'] },
  });
};

/**
 * Estimate wait time for a new patient based on current queue
 * @param {string} clinicId
 * @param {number} avgServiceMinutes - average service duration
 * @returns {Promise<number>} estimated minutes to wait
 */
const estimateWaitTime = async (clinicId, avgServiceMinutes = 15) => {
  const waitingCount = await QueueEntry.countDocuments({
    clinic: clinicId,
    status: 'waiting',
  });
  return waitingCount * avgServiceMinutes;
};

module.exports = {
  getNextQueueNumber,
  getAvgWaitTime,
  getActiveQueueCount,
  estimateWaitTime,
};
