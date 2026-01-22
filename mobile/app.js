const dropZone = document.getElementById('dropZone');
const input = document.getElementById('imageInput');
const preview = document.getElementById('preview');
const btn = document.getElementById('analyzeBtn');
const btnText = btn.querySelector('.btn-text');
const btnLoading = btn.querySelector('.btn-loading');
const result = document.getElementById('result');

// Click to upload
dropZone.addEventListener('click', () => input.click());

// File input change
input.addEventListener('change', (e) => handleFile(e.target.files[0]));

// Drag and drop
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        input.files = e.dataTransfer.files;
        handleFile(file);
    }
});

function handleFile(file) {
    if (!file) return;
    preview.src = URL.createObjectURL(file);
    preview.classList.add('visible');
    btn.disabled = false;
    result.classList.remove('visible');
}

btn.addEventListener('click', analyze);

async function analyze() {
    const file = input.files[0];
    if (!file) return;

    btn.disabled = true;
    btnText.hidden = true;
    btnLoading.hidden = false;

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch('/api/emotion/analyze-upload', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        
        result.classList.add('visible');

        if (data.success && data.face_detected) {
            let html = `<div class="dominant-emotion">Detected: ${data.dominant_emotion.toUpperCase()}</div>`;
            
            if (data.emotions) {
                const emotions = Object.entries(data.emotions)
                    .filter(([_, score]) => score > 0)
                    .sort((a, b) => b[1] - a[1]);
                
                for (const [emotion, score] of emotions) {
                    html += `
                        <div class="emotion-bar">
                            <div class="emotion-label">
                                <span>${emotion}</span>
                                <span>${score.toFixed(1)}%</span>
                            </div>
                            <div class="bar-bg">
                                <div class="bar-fill" style="width: ${score}%"></div>
                            </div>
                        </div>
                    `;
                }
            }
            result.innerHTML = html;
        } else if (!data.face_detected) {
            result.innerHTML = '<p class="no-face">😕 No face detected. Try another image.</p>';
        } else {
            result.innerHTML = `<p class="error">❌ Error: ${data.error || 'Unknown error'}</p>`;
        }
    } catch (err) {
        result.classList.add('visible');
        result.innerHTML = `<p class="error">❌ Error: ${err.message}</p>`;
    }

    btn.disabled = false;
    btnText.hidden = false;
    btnLoading.hidden = true;
}