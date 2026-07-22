const mongoose = require('mongoose');
const axios = require('axios');

// MongoDB Connection Caching
let isConnected = false;

async function connectDB() {
    if (isConnected) return;
    if (!process.env.MONGO_URI) {
        throw new Error('MONGO_URI Environment Variable missing in Vercel');
    }
    const db = await mongoose.connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 5000
    });
    isConnected = db.connections[0].readyState;
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

export default async function handler(req, res) {
    // 1. Mandatory CORS Headers (For EVERY Response)
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // 2. Browser Preflight (OPTIONS) Direct Handling
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // 3. POST Request Handling
    if (req.method === 'POST') {
        try {
            await connectDB();
            const { source, name, email, phone, socialLink, requirements } = req.body || {};

            // Save to MongoDB
            const newLead = new Lead({ source, name, email, phone, socialLink, requirements });
            await newLead.save();

            // Telegram Notification
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
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
}
