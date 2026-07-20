require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
// Test Endpoint (Browser me status check karne ke liye)
app.get('/', (req, res) => {
    res.send('🚀 AVENOR Backend API is Running Successfully!');
});

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected Successfully!'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err));

// Database Schema (Table Structure)
const leadSchema = new mongoose.Schema({
    source: String, // 'Brand', 'Creator', or 'WebDev'
    name: String,
    email: String,
    socialLink: String,
    requirements: String,
    date: { type: Date, default: Date.now }
});

const Lead = mongoose.model('Lead', leadSchema);

// API Endpoint: Website se data receive karne ke liye
app.post('/api/submit-lead', async (req, res) => {
    try {
        const { source, name, email, socialLink, requirements } = req.body;

        // 1. Data ko MongoDB me save karo
        const newLead = new Lead({ source, name, email, socialLink, requirements });
        await newLead.save();

        // 2. Telegram Notification ka message banao
        const message = `
🚀 *NEW LEAD ALERT* 🚀
━━━━━━━━━━━━━━━━━━
📌 *Source:* ${source}
👤 *Name:* ${name}
📧 *Email:* ${email}
🔗 *Link:* ${socialLink}
📝 *Details:* ${requirements}
        `;

        // 3. Telegram Bot ke through tumhe message bhejo
        const botToken = process.env.8864663247:AAGh7p-XdXSuytxvQKzm8bU5iO0ay_R1ksw;
        const chatId = process.env.8710563223;
        const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;

        await axios.post(telegramUrl, {
            chat_id: chatId,
            text: message,
            parse_mode: 'Markdown'
        });

        res.status(200).json({ success: true, message: 'Data saved and notification sent!' });

    } catch (error) {
        console.error('Error saving lead:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

// Server Start Karna
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
module.exports = app;
