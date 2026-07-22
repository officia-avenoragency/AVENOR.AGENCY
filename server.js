require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');

const app = express();

// 1. Complete CORS Setup for Preflight (OPTIONS)
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// 2. Hardcoded Preflight Bypass Middleware (Isse Preflight kabhi fail nahi hoga)
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    // Agar Browser Preflight OPTIONS bhej raha hai, toh turant 200 OK bhej do
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    next();
});

app.use(express.json());

// Serverless DB Connection with Fast Timeout
let isConnected = false;
async function connectDB() {
    if (isConnected) return;
    try {
        const db = await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 5000
        });
        isConnected = db.connections[0].readyState;
        console.log('✅ MongoDB Connected Successfully');
    } catch (err) {
        console.error('❌ DB Connection Error:', err.message);
        throw new Error(`Database Connection Failed: ${err.message}`);
    }
}

// Database Schema
const leadSchema = new mongoose.Schema({
    source: String,
    name: String,
    email: String,
    phone: String,
    socialLink: String,
    requirements: String,
    date: { type: Date, default: Date.now }
});

const Lead = mongoose.models.Lead || mongoose.model('Lead', leadSchema);

// Routes
app.get('/', (req, res) => {
    res.send('🚀 AVENOR Backend API is Live and Running on Vercel!');
});

app.post('/api/submit-lead', async (req, res) => {
    try {
        await connectDB();
        const { source, name, email, phone, socialLink, requirements } = req.body;

        // 1. Save to MongoDB
        const newLead = new Lead({ source, name, email, phone, socialLink, requirements });
        await newLead.save();

        // 2. Telegram Notification
        const botToken = '8864663247:AAGh7p-XdXSuytxvQKzm8bU5iO0ay_R1ksw';
        const chatId = '8769016149';

        const message = `🚀 *NEW LEAD ALERT* 🚀\n━━━━━━━━━━━━━━━━━━\n📌 *Source:* ${source}\n👤 *Name:* ${name}\n📧 *Email:* ${email}\n📞 *Phone:* ${phone || 'Not Provided'}\n🔗 *Link:* ${socialLink}\n📝 *Details:* ${requirements}`;

        await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            chat_id: chatId,
            text: message,
            parse_mode: 'Markdown'
        });

        return res.status(200).json({ success: true, message: 'Lead saved and notification sent!' });

    } catch (error) {
        console.error('API Error:', error.message);
        return res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = app;
