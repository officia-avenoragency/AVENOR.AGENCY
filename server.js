require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();

// 1. CORS Setup
app.use(cors({ origin: '*' }));
app.use(express.json());

// 2. SERVE HTML FILES (Ye line missing thi pehle, isliye 'Cannot GET /' aa raha tha)
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/brand', (req, res) => {
    res.sendFile(path.join(__dirname, 'brand.html'));
});

app.get('/creator', (req, res) => {
    res.sendFile(path.join(__dirname, 'creator.html'));
});

// 3. DATABASE CONNECTION
let isConnected = false;
async function connectDB() {
    if (isConnected) return;
    try {
        const db = await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 5000
        });
        isConnected = db.connections[0].readyState;
        console.log('✅ MongoDB Connected');
    } catch (err) {
        console.error('❌ DB Connection Error:', err.message);
        throw err;
    }
}

// 4. SCHEMA & MODEL
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

// 5. FORM SUBMIT API
app.post('/api/submit-lead', async (req, res) => {
    try {
        await connectDB();
        const { source, name, email, phone, socialLink, requirements } = req.body;

        const newLead = new Lead({ source, name, email, phone, socialLink, requirements });
        await newLead.save();

        const botToken = '8864663247:AAGh7p-XdXSuytxvQKzm8bU5iO0ay_R1ksw';
        const chatId = '8769016149';

        const message = `🚀 *NEW LEAD ALERT* 🚀\n━━━━━━━━━━━━━━━━━━\n📌 *Source:* ${source}\n👤 *Name:* ${name}\n📧 *Email:* ${email}\n📞 *Phone:* ${phone || 'Not Provided'}\n🔗 *Link:* ${socialLink}\n📝 *Details:* ${requirements}`;

        await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            chat_id: chatId,
            text: message,
            parse_mode: 'Markdown'
        });

        return res.status(200).json({ success: true, message: 'Lead saved!' });
    } catch (error) {
        console.error('API Error:', error.message);
        return res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = app;
