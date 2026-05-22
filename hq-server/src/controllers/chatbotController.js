/**
 * Chatbot Controller — proxies to Rasa or provides fallback responses
 * Configure RASA_SERVER_URL in .env to connect to a running Rasa instance.
 * All conversations are logged to ChatLog for admin review.
 */
const ChatLog = require('../models/ChatLog');
const FAQ     = require('../models/FAQ');

// POST /api/chatbot/message
const sendMessage = async (req, res) => {
  try {
    const { message, senderId } = req.body;
    if (!message) return res.status(400).json({ message: 'Message is required.' });

    const rasaUrl = process.env.RASA_SERVER_URL;
    let reply = '';
    let isFallback = true;

    if (rasaUrl) {
      try {
        const response = await fetch(`${rasaUrl}/webhooks/rest/webhook`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sender: senderId || req.user?._id?.toString() || 'anon', message }),
        });
        const data = await response.json();
        const replies = data.map((r) => ({ text: r.text || '', image: r.image || null }));
        reply = replies.map((r) => r.text).join(' ');
        isFallback = false;

        // Log and return Rasa response
        await ChatLog.create({ patient: req.user?._id || null, senderId: senderId || 'anon', message, reply, isFallback }).catch(() => {});
        return res.json({ replies, fallback: false });
      } catch (rasaErr) {
        console.warn('Rasa unavailable, using fallback:', rasaErr.message);
      }
    }

    // Check FAQ database first
    const faqs = await FAQ.find({ isActive: true });
    const msg = message.toLowerCase();
    const matched = faqs.find((f) => msg.includes(f.question.toLowerCase().split(' ')[0]));
    if (matched) {
      reply = matched.answer;
      isFallback = false;
    } else {
      reply = getRuleBasedReply(msg);
    }

    await ChatLog.create({ patient: req.user?._id || null, senderId: senderId || 'anon', message, reply, isFallback }).catch(() => {});
    return res.json({ replies: [{ text: reply }], fallback: isFallback });
  } catch (err) {
    return res.status(500).json({ message: 'Chatbot error. Please try again.' });
  }
};

function getRuleBasedReply(msg) {
  if (msg.includes('queue') || msg.includes('wait'))
    return 'To join a queue, go to the Clinic Directory and tap "Join Queue". You will receive a queue number and estimated wait time.';
  if (msg.includes('appointment') || msg.includes('book'))
    return 'To book an appointment, go to the Clinic Directory, choose a clinic, then tap "Book Appointment" and select a time slot.';
  if (msg.includes('cancel'))
    return 'To cancel an appointment, go to My Appointments and tap "Cancel" on the appointment you want to remove.';
  if (msg.includes('clinic') || msg.includes('recommend'))
    return 'I can help recommend a clinic based on your location. Tap "Get Recommendation" in the Clinic Directory.';
  if (msg.includes('otp') || msg.includes('verify') || msg.includes('code'))
    return 'Please check your registered phone number for the OTP. It expires in 10 minutes.';
  if (msg.includes('hello') || msg.includes('hi') || msg.includes('help'))
    return 'Hi! I am the HealthQueue+ Assistant. I can help with queue management, appointment booking, and clinic information. What do you need?';
  return 'I am not sure I understood that. Try asking about queues, appointments, clinic recommendations, or type "help".';
}

module.exports = { sendMessage };
