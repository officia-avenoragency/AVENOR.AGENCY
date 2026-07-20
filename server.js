require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');

const app = express();

app.use(cors());
app.use(express.json());

// Serverless DB Connection Caching
let isConnected = false;
async function connectDB() {
    if (isConnected) return;
    try {
        const db = await mongoose.connect(process.env.MONGO_URI);
        isConnected = db.connections[0].readyState;
        console.log('✅ MongoDB Connected');
    } catch (err) {
        console.error('❌ DB Connection Error:', err);
    }
}

// Database Schema
const leadSchema = new mongoose.Schema({
    source: String,
    name: String,
    email: String,
    socialLink: String,
    requirements: String,
    date: { type: Date, default: Date.now }
});

const Lead = mongoose.models.Lead || mongoose.model('Lead', leadSchema);

// Home Route (Health Check - Browser ke liye)
app.get('/', (req, res) => {
    res.send('🚀 AVENOR Backend API is Live and Running on Vercel!');
});

// Submit Lead API (Website Form ke liye)
app.post('/api/submit-lead', async (req, res) => {
    try {
        await connectDB();
        const { source, name, email, socialLink, requirements } = req.body;

        // 1. Database me save karo
        const newLead = new Lead({ source, name, email, socialLink, requirements });
        await newLead.save();

        // 2. Telegram par notification bhejo
        const botToken = process.env.WEBSITE_BOT_TOKEN;
        const chatId = process.env.ADMIN_CHAT_ID;

        if (botToken && chatId) {
            const message = `🚀 *NEW LEAD ALERT* 🚀\n━━━━━━━━━━━━━━━━━━\n📌 *Source:* ${source}\n👤 *Name:* ${name}\n📧 *Email:* ${email}\n🔗 *Link:* ${socialLink}\n📝 *Details:* ${requirements}`;

            await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                chat_id: chatId,
                text: message,
                parse_mode: 'Markdown'
            });
        }

        return res.status(200).json({ success: true, message: 'Lead saved successfully!' });

    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
});

// Export for Vercel
module.exports = app;
