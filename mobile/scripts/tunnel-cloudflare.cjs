const { spawn } = require('child_process');
const fs = require('fs');

const candidates = [
  process.env.CLOUDFLARED_PATH,
  'C:\\Program Files (x86)\\cloudflared\\cloudflared.exe',
  'C:\\Program Files\\cloudflared\\cloudflared.exe',
  'cloudflared',
].filter(Boolean);

const bin = candidates.find((p) => p === 'cloudflared' || fs.existsSync(p));
if (!bin) {
  console.error(
    'cloudflared not found. Install: winget install Cloudflare.cloudflared\n' +
      'Then open a new terminal, or set CLOUDFLARED_PATH to the full path of cloudflared.exe.',
  );
  process.exit(1);
}

const TRY_CLOUDFLARE_RE = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/i;
let printedShareHint = false;

function onLine(line) {
  process.stdout.write(line + '\n');
  const match = line.match(TRY_CLOUDFLARE_RE);
  if (match && !printedShareHint) {
    printedShareHint = true;
    const httpsUrl = match[0];
    const host = httpsUrl.replace(/^https:\/\//, '');
    console.log('\n' + '='.repeat(60));
    console.log('PUBLIC URL (share with your friend):');
    console.log('  ' + httpsUrl);
    console.log('\nExpo Go link:');
    console.log('  exp://' + host);
    console.log('\nThen in your OTHER terminal (Metro), restart with:');
    console.log('  $env:EXPO_PACKAGER_PROXY_URL="' + httpsUrl + '"');
    console.log('  npm run start:lan');
    console.log('='.repeat(60) + '\n');
  }
}

const child = spawn(bin, ['tunnel', '--url', 'http://127.0.0.1:8081'], {
  shell: bin === 'cloudflared',
});

let buffer = '';
child.stdout.on('data', (chunk) => {
  buffer += chunk.toString();
  const lines = buffer.split(/\r?\n/);
  buffer = lines.pop() ?? '';
  lines.forEach(onLine);
});
child.stderr.on('data', (chunk) => {
  buffer += chunk.toString();
  const lines = buffer.split(/\r?\n/);
  buffer = lines.pop() ?? '';
  lines.forEach(onLine);
});

child.on('exit', (code) => process.exit(code ?? 1));
