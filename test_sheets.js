const url = "https://script.google.com/macros/s/AKfycbxDWa6hm0oWLcWc7G5hOSo04zl3-eLbZ_nKSH1035Xo_RaEBjtpsU-O6NcJVs8CasHtBg/exec";

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
