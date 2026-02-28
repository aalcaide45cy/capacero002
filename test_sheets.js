const url = "https://script.google.com/macros/s/AKfycbx4_oOWg3bri93p57u2q__jeo33S0ZHT2VSMSHQEGBL_LMTD-g6H5KTw-fyP76h5AI/exec";

async function testUrl() {
    try {
        console.log("Sending test request to Google Sheets...");
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain',
            },
            body: JSON.stringify({
                action: 'log_search',
                searchTerm: '🤖 Test Automático',
                userId: 'user-test01',
                origin: 'Console'
            })
        });

        const text = await response.text();
        console.log("Response status:", response.status);
        console.log("Response text:", text);
    } catch (e) {
        console.error("Error:", e);
    }
}

testUrl();
