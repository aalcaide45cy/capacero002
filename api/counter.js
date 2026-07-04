// api/counter.js - Vercel Serverless Function to manage files edited count
export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const useKV = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN;

    try {
        if (req.method === 'POST') {
            // Increment
            let newCount = 0;
            if (useKV) {
                const url = `${process.env.KV_REST_API_URL}/incr/capacero_files_edited`;
                const response = await fetch(url, {
                    headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` }
                });
                const data = await response.json();
                newCount = data.result || 0;
            } else {
                // Fallback to free CounterAPI.dev
                const response = await fetch('https://api.counterapi.dev/v1/capacero/files_edited/up');
                const data = await response.json();
                newCount = data.value || 0;
            }
            return res.status(200).json({ count: newCount });
        } else {
            // GET count
            let currentCount = 0;
            if (useKV) {
                const url = `${process.env.KV_REST_API_URL}/get/capacero_files_edited`;
                const response = await fetch(url, {
                    headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` }
                });
                const data = await response.json();
                currentCount = parseInt(data.result || '0', 10);
            } else {
                // Fallback to free CounterAPI.dev
                const response = await fetch('https://api.counterapi.dev/v1/capacero/files_edited');
                if (response.ok) {
                    const data = await response.json();
                    currentCount = data.value || 0;
                } else if (response.status === 404) {
                    // Initialize counter if not exists on counterapi.dev
                    const initResponse = await fetch('https://api.counterapi.dev/v1/capacero/files_edited/up');
                    const initData = await initResponse.json();
                    currentCount = initData.value || 0;
                }
            }
            return res.status(200).json({ count: currentCount });
        }
    } catch (error) {
        console.error("Error in /api/counter:", error);
        // Fallback dummy count in case of total failure so the UI never breaks
        return res.status(200).json({ count: 125 }); 
    }
}
