const fs = require('fs');

async function downloadAppJs() {
    const url = 'https://sh00py-aurora-ai-backend.hf.space/app.js';
    try {
        const response = await fetch(url);
        const text = await response.text();
        fs.writeFileSync('app.js', text);
        console.log('app.js downloaded, size:', text.length);
    } catch (e) {
        console.log('Error downloading app.js:', e.message);
    }
}

downloadAppJs();
