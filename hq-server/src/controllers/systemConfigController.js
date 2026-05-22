/**
 * System Config Controller — manage platform-wide settings
 * Used by: super_admin only
 */
const SystemConfig = require('../models/SystemConfig');

const DEFAULT_CONFIGS = [
  { key: 'app_name',              value: 'HealthQueue+',   label: 'Application Name',         group: 'General' },
  { key: 'max_queue_per_clinic',  value: 100,              label: 'Max Queue Per Clinic',      group: 'Queue' },
  { key: 'queue_reset_time',      value: '00:00',          label: 'Daily Queue Reset Time',    group: 'Queue' },
  { key: 'appointment_buffer',    value: 15,               label: 'Appointment Buffer (min)',  group: 'Appointments' },
  { key: 'allow_self_register',   value: true,             label: 'Allow Patient Self-Register', group: 'Security' },
  { key: 'otp_expiry_minutes',    value: 10,               label: 'OTP Expiry (minutes)',      group: 'Security' },
  { key: 'rasa_server_url',       value: '',               label: 'Rasa Chatbot Server URL',   group: 'Chatbot' },
  { key: 'maintenance_mode',      value: false,            label: 'Maintenance Mode',          group: 'General' },
];

// GET /api/config — get all config (or seed defaults if none)
const getConfig = async (req, res) => {
  try {
    let configs = await SystemConfig.find({}).sort({ group: 1, key: 1 });
    if (configs.length === 0) {
      // Seed defaults on first load
      await SystemConfig.insertMany(DEFAULT_CONFIGS);
      configs = await SystemConfig.find({}).sort({ group: 1, key: 1 });
    }
    return res.json(configs);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch config.' });
  }
};

// PUT /api/config/:key — update a single config value
const updateConfig = async (req, res) => {
  try {
    const { value } = req.body;
    if (value === undefined) return res.status(400).json({ message: 'value is required.' });

    const config = await SystemConfig.findOneAndUpdate(
      { key: req.params.key },
      { value },
      { new: true, upsert: true }
    );
    return res.json(config);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to update config.' });
  }
};

// PUT /api/config — bulk update
const bulkUpdateConfig = async (req, res) => {
  try {
    const { configs } = req.body; // [{ key, value }]
    if (!Array.isArray(configs)) return res.status(400).json({ message: 'configs array is required.' });

    const ops = configs.map(({ key, value }) => ({
      updateOne: { filter: { key }, update: { $set: { value } }, upsert: true },
    }));
    await SystemConfig.bulkWrite(ops);
    const updated = await SystemConfig.find({}).sort({ group: 1, key: 1 });
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to update configs.' });
  }
};

module.exports = { getConfig, updateConfig, bulkUpdateConfig };
