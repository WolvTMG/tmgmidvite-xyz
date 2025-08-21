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
app.use(cors()); // allow cross-origin requests from your frontend
app.use(express.static(path.join(__dirname))); // Serve static files

const PORT = process.env.PORT || 3000;

const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
const refresh_token = process.env.SPOTIFY_REFRESH_TOKEN;

// Root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Endpoint to fetch currently playing track
app.get('/current-track', async (req, res) => {
    try {
        // Get access token using refresh token
        const tokenResponse = await axios.post(
            'https://accounts.spotify.com/api/token',
            null,
            {
                params: { grant_type: 'refresh_token', refresh_token },
                headers: {
                    Authorization: 'Basic ' + Buffer.from(client_id + ':' + client_secret).toString('base64'),
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        const access_token = tokenResponse.data.access_token;

        // Get currently playing track
        const trackResponse = await axios.get(
            'https://api.spotify.com/v1/me/player/currently-playing',
            { headers: { Authorization: `Bearer ${access_token}` } }
        );

        if (trackResponse.data && trackResponse.data.item) {
            const track = trackResponse.data.item.name;
            const artist = trackResponse.data.item.artists.map(a => a.name).join(', ');
            res.json({ track, artist });
        } else {
            res.json({ track: null, artist: null });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));