const http = require('http');
const fs = require('fs');
const path = require('path');

// ---- minimal .env loader (no "dotenv" package needed) ----
function loadEnv() {
    const envPath = path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) return;
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eq = trimmed.indexOf('=');
        if (eq === -1) continue;
        const key = trimmed.slice(0, eq).trim();
        const value = trimmed.slice(eq + 1).trim();
        if (!(key in process.env)) process.env[key] = value;
    }
}
loadEnv();

const PORT = process.env.PORT || 3000;

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
};

function sendJson(res, status, data) {
    res.writeHead(status, { 'Content-Type': 'application/json', ...CORS_HEADERS });
    res.end(JSON.stringify(data));
}

// The handler the frontend calls to get a fresh batch of words
async function handleFreestyle(req, res, body) {
    let parsed = {};
    try {
        parsed = body ? JSON.parse(body) : {};
    } catch (e) {
        return sendJson(res, 400, { error: 'Invalid JSON body' });
    }

    const mood = (parsed.mood || 'Hype').toString().slice(0, 100);
    const tempo = (parsed.tempo || 'Medium').toString().slice(0, 100);

    if (!process.env.NVIDIA_API_KEY || process.env.NVIDIA_API_KEY === 'YOUR_NVIDIA_API_KEY_HERE') {
        return sendJson(res, 500, { error: 'NVIDIA_API_KEY is not set. Add your key to the .env file and restart the server.' });
    }

    const url = `https://integrate.api.nvidia.com/v1/chat/completions`;
    const prompt = `Generate a comma-separated list of 40 words for a freestyle rap. The mood/theme is '${mood}' and the tempo/vibe is '${tempo}'. Tailor the syllable count, complexity, and style of the words to perfectly match this specific mood and tempo. Output ONLY the words separated by commas, no quotes, no bullet points, no extra text.`;

    // Abort the request if the model takes too long
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    try {
        const aiResponse = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.NVIDIA_API_KEY}`
            },
            body: JSON.stringify({
                model: "deepseek-ai/deepseek-v4-pro",
                messages: [{ role: "user", content: prompt }],
                temperature: 1,
                top_p: 0.95,
                max_tokens: 300,
                // Disables the chain-of-thought reasoning
                chat_template_kwargs: { thinking: false }
            }),
            signal: controller.signal
        });

        if (!aiResponse.ok) {
            const errBody = await aiResponse.text().catch(() => '');
            console.error(`NVIDIA API error ${aiResponse.status}:`, errBody);
            throw new Error(`Nvidia API error! status: ${aiResponse.status}`);
        }

        const data = await aiResponse.json();
        const rawText = data?.choices?.[0]?.message?.content || '';

        // Clean and process the words
        let words = rawText.split(',')
            .map(w => w.trim().replace(/[^a-zA-Z]/g, '').toUpperCase())
            .filter(w => w.length > 0);

        if (words.length === 0) {
            throw new Error('AI response did not contain any usable words');
        }

        sendJson(res, 200, { words: words.sort(() => Math.random() - 0.5) });
    } catch (error) {
        if (error.name === 'AbortError') {
            console.error('Backend Error: NVIDIA request timed out');
            return sendJson(res, 504, { error: 'The AI request timed out. Please try again.' });
        }
        console.error("Backend Error:", error.message);
        sendJson(res, 500, { error: "Failed to fetch words from AI" });
    } finally {
        clearTimeout(timeout);
    }
}

const server = http.createServer((req, res) => {
    // Handle CORS preflight requests from the browser
    if (req.method === 'OPTIONS') {
        res.writeHead(204, CORS_HEADERS);
        return res.end();
    }

    if (req.method === 'GET' && req.url === '/health') {
        return sendJson(res, 200, { status: 'ok' });
    }

    if (req.method === 'POST' && req.url === '/api/freestyle') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => handleFreestyle(req, res, body));
        return;
    }

    sendJson(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
