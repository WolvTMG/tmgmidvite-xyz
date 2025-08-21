import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;

const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
const refresh_token = process.env.SPOTIFY_REFRESH_TOKEN;

// Debug: Check if environment variables are loaded
console.log('Environment check:');
console.log('PORT:', PORT);
console.log('CLIENT_ID:', client_id ? '✓ Loaded' : '✗ MISSING');
console.log('REFRESH_TOKEN:', refresh_token ? '✓ Loaded' : '✗ MISSING');

// Root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Test endpoint to check Spotify credentials
app.get('/test-spotify', async (req, res) => {
    try {
        console.log('Testing Spotify credentials...');
        
        const tokenResponse = await axios.post(
            'https://accounts.spotify.com/api/token',
            new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: refresh_token
            }),
            {
                headers: {
                    'Authorization': 'Basic ' + Buffer.from(client_id + ':' + client_secret).toString('base64'),
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                timeout: 10000
            }
        );
        
        res.json({ 
            success: true, 
            message: 'Spotify credentials are valid!',
            access_token: tokenResponse.data.access_token 
        });
    } catch (err) {
        console.error('Spotify test failed:', err.response?.data || err.message);
        res.status(500).json({ 
            success: false, 
            error: err.response?.data || err.message 
        });
    }
});

// Endpoint to fetch currently playing track
app.get('/current-track', async (req, res) => {
    try {
        console.log('Refreshing access token...');
        
        // Get access token using refresh token
        const tokenResponse = await axios.post(
            'https://accounts.spotify.com/api/token',
            new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: refresh_token
            }),
            {
                headers: {
                    'Authorization': 'Basic ' + Buffer.from(client_id + ':' + client_secret).toString('base64'),
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                timeout: 10000
            }
        );

        const access_token = tokenResponse.data.access_token;
        console.log('Access token refreshed successfully');

        // Get currently playing track
        console.log('Fetching currently playing track...');
        const trackResponse = await axios.get(
            'https://api.spotify.com/v1/me/player/currently-playing',
            { 
                headers: { 
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            }
        );

        console.log('Track response status:', trackResponse.status);
        
        if (trackResponse.data && trackResponse.data.item) {
            const track = trackResponse.data.item.name;
            const artist = trackResponse.data.item.artists.map(a => a.name).join(', ');
            res.json({ 
                track, 
                artist, 
                is_playing: true,
                success: true 
            });
        } else {
            res.json({ 
                track: "No track playing", 
                artist: "", 
                is_playing: false,
                success: true
            });
        }
    } catch (err) {
        console.error('FULL ERROR DETAILS:');
        console.error('Message:', err.message);
        console.error('Response data:', err.response?.data);
        console.error('Response status:', err.response?.status);
        
        res.status(500).json({ 
            error: "Failed to fetch track",
            details: err.response?.data || err.message,
            success: false
        });
    }
});

// Callback route for Spotify auth (optional)
app.get('/callback', (req, res) => {
    const authCode = req.query.code;
    if (authCode) {
        res.send(`
            <h2>Auth successful!</h2>
            <p>Your authorization code:</p>
            <textarea style="width: 100%; height: 50px;">${authCode}</textarea>
            <p>Copy this code and use it to get your refresh token.</p>
        `);
    } else {
        res.send('No authorization code received');
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        environment: {
            client_id: client_id ? 'present' : 'missing',
            refresh_token: refresh_token ? 'present' : 'missing'
        }
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/health`);
    console.log(`📍 Spotify test: http://localhost:${PORT}/test-spotify`);
    console.log(`📍 Current track: http://localhost:${PORT}/current-track`);
});