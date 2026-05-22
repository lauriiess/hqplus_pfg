/**
 * Chatbot Controller — proxies to Rasa or provides fallback responses
 * Configure RASA_SERVER_URL in .env to connect to a running Rasa instance.
 */
const https = require('http');

// POST /api/chatbot/message
// Body: { message, senderId? }
const sendMessage = async (req, res) => {
  try {
    const { message, senderId } = req.body;
    if (!message) return res.status(400).json({ message: 'Message is required.' });

    const rasaUrl = process.env.RASA_SERVER_URL;

    if (rasaUrl) {
      // Forward to Rasa
      try {
        const response = await fetch(`${rasaUrl}/webhooks/rest/webhook`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sender: senderId || req.user._id.toString(),
            message,
          }),
        });
        const data = await response.json();
        const replies = data.map((r) => ({ text: r.text || '', image: r.image || null }));
        return res.json({ replies });
      } catch (rasaErr) {
        console.warn('Rasa unavailable, using fallback:', rasaErr.message);
      }
    }

    // Fallback: simple rule-based responses
    const reply = getFallbackReply(message.toLowerCase());
    return res.json({ replies: [{ text: reply }], fallback: true });
  } catch (err) {
    return res.status(500).json({ message: 'Chatbot error. Please try again.' });
  }
};

function getFallbackReply(msg) {
  if (msg.includes('queue') || msg.includes('wait')) {
    return 'To join a queue, go to the Clinic Directory and tap "Join Queue" on your chosen clinic. You will receive a queue number and estimated wait time.';
  }
  if (msg.includes('appointment') || msg.includes('book')) {
    return 'To book an appointment, go to the Clinic Directory, choose a clinic, then tap "Book Appointment". Select your preferred date and time slot.';
  }
  if (msg.includes('cancel')) {
    return 'To cancel an appointment, go to My Appointments and tap "Cancel" on the appointment you want to cancel.';
  }
  if (msg.includes('clinic') || msg.includes('recommend')) {
    return 'I can recommend a clinic based on your location and the service you need. Tap "Get Recommendation" in the Clinic Directory.';
  }
  if (msg.includes('otp') || msg.includes('verify') || msg.includes('code')) {
    return 'Please check your registered phone number for the OTP verification code. It expires in 10 minutes.';
  }
  if (msg.includes('hello') || msg.includes('hi') || msg.includes('help')) {
    return 'Hi! I\'m the HealthQueue+ Assistant. I can help you with queue management, appointment booking, and clinic information. What do you need help with?';
  }
  return 'I\'m not sure I understood that. Please try asking about queue, appointments, clinic recommendations, or type "help" for assistance.';
}

module.exports = { sendMessage };
