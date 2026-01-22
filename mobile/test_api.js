const fs = require('fs');
const logStream = fs.createWriteStream('api_test_results_2.txt', { flags: 'w' });

const doFetch = async (url, method = 'GET') => {
    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' }
        });
        const msg = `${url} [${method}]: ${response.status} ${response.statusText}\n`;
        console.log(msg.trim());
        logStream.write(msg);

        if (response.status === 200) {
            const text = await response.text();
            logStream.write('Response: ' + text.substring(0, 1000) + '\n');
        }
    } catch (e) {
        const msg = `${url} [${method}]: Error - ${e.message}\n`;
        console.log(msg.trim());
        logStream.write(msg);
    }
};

async function test() {
    const base = 'https://sh00py-aurora-ai-backend.hf.space';
    const endpoints = [
        '/api/predict',
        '/predict',
        '/run/predict',
        '/call/predict',
        '/config',
        '/info'
    ];

    logStream.write('Testing endpoints...\n');
    for (const ep of endpoints) {
        await doFetch(`${base}${ep}`, 'GET');
        await doFetch(`${base}${ep}`, 'OPTIONS');
    }

    // Also fetch root to file
    try {
        const rootResp = await fetch(base);
        const rootHtml = await rootResp.text();
        fs.writeFileSync('root_page.html', rootHtml);
        console.log('Root page saved to root_page.html');
    } catch (e) {
        console.log('Failed to fetch root: ' + e.message);
    }

    logStream.end();
}

test();
