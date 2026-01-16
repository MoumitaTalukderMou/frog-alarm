// --- BASE VARIABLES ---
let totalMinutes = 720;
let leakRate = 0.5;
let isLocked = false;
let isFrozen = false; 
let alarmSetTime = null;
let checkInterval;
let isJammed = false;
let jamClicksRemaining = 0;

// VOLUME WHEEL
let currentVol = 0; 
let isSpinning = false;
const wheel = document.getElementById('vol-wheel');
const volStatus = document.getElementById('vol-status');
const volBar = document.getElementById('vol-bar');
const frogMouth = document.getElementById('frog-mouth');
const wheelPointer = document.getElementById('wheel-pointer');

// ALARM
let isRinging = false;
let audioCtx = null;
let alarmNodes = [];
let sirenInterval = null;
let stability = 0;
let stabCountdown = 15;
let stabInterval = null;

// ADS
let adsRemaining = 5;
let jumpsRemaining = 0;
const adData = [
    { title: "FREE FLIES!!", body: "Fresh yummy flies nearby! 50% Discount for Frogs!" },
    { title: "IPHONE 15!!", body: "You have won a free iPhone! Just pay 10 Taka!" },
    { title: "VIRUS ALERT!", body: "Your phone has 99 viruses! Clean NOW!" },
    { title: "CASH REWARD", body: "10,000 TK waiting for you! Click here!" },
    { title: "BATTERY LOW", body: "Battery at 1%. Download more RAM!" }
];

// DOM
const dTime = document.getElementById('d-time');
const amPm = document.getElementById('am-pm');
const pumpHandle = document.getElementById('pump-handle');
const freezeBtn = document.getElementById('freeze-btn');
const sliderKnob = document.getElementById('slider-knob');
const sliderTrack = document.getElementById('slider-track');
const statusMsg = document.getElementById('status-msg');
const hHand = document.getElementById('h-hand');
const mHand = document.getElementById('m-hand');
const safeZone = document.getElementById('safe-zone');
const fakeCursor = document.getElementById('fake-cursor');
const progressBar = document.getElementById('stop-progress');
const stabTimerDisplay = document.getElementById('stab-timer');

// AUDIO INIT
function initAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
}

// MAIN LOOP
setInterval(() => {
    if(isLocked) return;
    if(!isFrozen && totalMinutes > 0) {
        let dynamicLeak = leakRate + (totalMinutes / 800); 
        totalMinutes -= dynamicLeak; 
        if(totalMinutes < 0) totalMinutes = 0;
        updateClockUI();
    }
}, 50);

// PUMP
function pumpTime(e) {
    initAudio();
    if(isLocked) return;
    const pumpInd = document.getElementById('pump-indicator');
    
    if(isJammed) {
        jamClicksRemaining--;
        pumpHandle.classList.add('pump-shake');
        setTimeout(() => pumpHandle.classList.remove('pump-shake'), 100);
        if(jamClicksRemaining <= 0) {
            isJammed = false;
            pumpHandle.parentElement.classList.remove('pump-jammed');
            pumpInd.innerText = "OK"; pumpInd.style.color = "#0f0"; pumpInd.style.background = "transparent";
        }
        return;
    }
    if(Math.random() < 0.2) {
        isJammed = true;
        jamClicksRemaining = 4;
        pumpHandle.parentElement.classList.add('pump-jammed');
        pumpInd.innerText = "JAMMED!"; pumpInd.style.color = "#fff"; pumpInd.style.background = "#f00";
        return;
    }
    pumpHandle.classList.add('pump-active');
    setTimeout(() => pumpHandle.classList.remove('pump-active'), 100);
    let addedTime = Math.floor(Math.random() * 10) + 5;
    totalMinutes += addedTime;
    if(totalMinutes >= 1440) totalMinutes -= 1440;
    updateClockUI();
    
    if(audioCtx) {
        let o = audioCtx.createOscillator(); let g = audioCtx.createGain();
        o.frequency.value = 100; o.type='triangle'; o.connect(g); g.connect(audioCtx.destination);
        o.start(); o.stop(audioCtx.currentTime + 0.1);
    }
}
pumpHandle.addEventListener('touchstart', (e) => { e.preventDefault(); pumpTime(); });
pumpHandle.addEventListener('mousedown', (e) => { pumpTime(); });

// FREEZE
function freezeTime() {
    initAudio();
    if(isLocked || isFrozen) return;
    isFrozen = true;
    freezeBtn.disabled = true; freezeBtn.style.backgroundColor = "#fff"; freezeBtn.innerText = "FROZEN!";
    let countdown = 5;
    let timer = setInterval(() => {
        countdown--; freezeBtn.innerText = `FROZEN (${countdown}s)`;
        if(countdown <= 0) {
            clearInterval(timer); isFrozen = false;
            freezeBtn.disabled = false; freezeBtn.style.backgroundColor = "#00ccff"; freezeBtn.innerText = "❄ FREEZE ❄";
        }
    }, 1000);
}
function updateClockUI() {
    let m = Math.floor(totalMinutes);
    let h24 = Math.floor(m / 60); let mins = m % 60;
    let hDeg = (h24 % 12 * 30) + (mins * 0.5); let mDeg = mins * 6; 
    hHand.style.transform = `rotate(${hDeg}deg)`; mHand.style.transform = `rotate(${mDeg}deg)`;
    let h12 = h24 % 12; if(h12 === 0) h12 = 12; let ap = h24 < 12 ? 'AM' : 'PM';
    dTime.innerText = `${h12}:${mins.toString().padStart(2,'0')}`; amPm.innerText = ap;
}

// WHEEL
function spinWheel() {
    if(isLocked || isSpinning) return;
    initAudio(); isSpinning = true;
    wheel.classList.add('spinning'); volStatus.innerText = "SPINNING...";
    let deg = Math.floor(720 + Math.random() * 360);
    wheel.style.transform = `rotate(${deg}deg)`;
    
    let clickCnt = 0;
    let clickInterval = setInterval(() => {
        if(clickCnt++ > 15) clearInterval(clickInterval);
        wheelPointer.classList.add('tick-anim');
        setTimeout(()=> wheelPointer.classList.remove('tick-anim'), 100);
        if(audioCtx) {
            let o = audioCtx.createOscillator(); let g = audioCtx.createGain();
            o.type = 'triangle'; o.frequency.value = 800; g.gain.value = 0.1;
            o.connect(g); g.connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + 0.05);
        }
    }, 150);

    setTimeout(() => {
        isSpinning = false; wheel.classList.remove('spinning');
        currentVol = Math.floor(Math.random() * 100);
        volBar.style.width = currentVol + "%";
        if(currentVol < 20) {
            volStatus.innerText = `QUIET (${currentVol}%)`; volStatus.style.color = "#88aa88";
            frogMouth.style.height = "2px"; 
        } else if(currentVol > 80) {
            volStatus.innerText = `EAR BLEED (${currentVol}%)`; volStatus.style.color = "red";
            frogMouth.style.height = "20px"; frogMouth.style.borderRadius = "50%";
        } else {
            volStatus.innerText = `OKAY (${currentVol}%)`; volStatus.style.color = "yellow";
            frogMouth.style.height = "10px"; frogMouth.style.borderRadius = "0 0 10px 10px";
        }
    }, 3000); 
}

// LOCK
let draggingSlider = false;
sliderKnob.addEventListener('mousedown', () => draggingSlider = true);
sliderKnob.addEventListener('touchstart', (e) => { e.preventDefault(); draggingSlider = true; });
window.addEventListener('mousemove', (e) => handleSlider(e.clientX));
window.addEventListener('touchmove', (e) => { if(draggingSlider) handleSlider(e.touches[0].clientX); });
window.addEventListener('mouseup', resetSlider);
window.addEventListener('touchend', resetSlider);

function handleSlider(cx) {
    if(draggingSlider && !isLocked) {
        let rect = sliderTrack.getBoundingClientRect();
        let x = cx - rect.left;
        let limit = rect.width - 50; 
        if(x > limit) attemptLock(); else if(x >= 0) sliderKnob.style.left = x + 'px';
    }
}
function attemptLock() {
    if(!isFrozen) { statusMsg.innerText = "FREEZE TIME FIRST!"; statusMsg.style.color = "red"; resetSlider(); return; }
    if(currentVol > 80) { statusMsg.innerText = "TOO LOUD! SPIN AGAIN!"; statusMsg.style.color = "red"; resetSlider(); return; }
    if(currentVol === 0) { statusMsg.innerText = "SPIN THE WHEEL FIRST!"; statusMsg.style.color = "yellow"; resetSlider(); return; }
    isLocked = true;
    sliderKnob.style.left = (sliderTrack.offsetWidth - 50) + 'px';
    sliderKnob.innerText = "🔒"; sliderKnob.style.background = "#0f0";
    let m = Math.floor(totalMinutes);
    let h24 = Math.floor(m / 60); let mins = m % 60;
    alarmSetTime = { h: h24, m: mins };
    let h12 = h24 % 12; if(h12===0) h12=12; let ap = h24 < 12 ? 'AM' : 'PM';
    statusMsg.innerText = `ALARM: ${h12}:${mins.toString().padStart(2,'0')} ${ap}`;
    statusMsg.style.color = "#0f0";
    document.getElementById('clock-panel').style.opacity = 0.5;
    document.getElementById('volume-panel').style.opacity = 0.5;
    checkInterval = setInterval(checkRealTime, 1000);
}
function resetSlider() { if(draggingSlider && !isLocked) { draggingSlider = false; sliderKnob.style.left = '0px'; } }
function checkRealTime() {
    let now = new Date();
    if(now.getHours() === alarmSetTime.h && now.getMinutes() === alarmSetTime.m && now.getSeconds() === 0) {
        triggerAlarm();
    }
}

// --- ALARM TRIGGER ---
function triggerAlarm() {
    clearInterval(checkInterval);
    isRinging = true;
    
    // START CHAOS MODE
    document.body.classList.add('alarm-active');
    document.body.classList.add('shaking');
    
    document.getElementById('stabilizer-overlay').style.display = 'flex';
    stability = 0; stabCountdown = 15; adsRemaining = 5; 
    progressBar.style.width = "0%";
    stabTimerDisplay.innerText = stabCountdown;
    
    initAudio();
    playChaosSound(); 
    moveSafeZone();
    
    if(stabInterval) clearInterval(stabInterval);
    stabInterval = setInterval(() => {
        stabCountdown--;
        stabTimerDisplay.innerText = stabCountdown;
        if(stabCountdown <= 5) stabTimerDisplay.style.color = "red";
        
        if(stabCountdown <= 0) {
            clearInterval(stabInterval);
            failStabilizer(); 
        }
    }, 1000);
}

// --- CHAOS SOUND ENGINE ---
function playChaosSound() {
    stopAllSounds();
    if(!audioCtx) initAudio();

    const masterGain = audioCtx.createGain();
    masterGain.gain.value = 1.0; 
    masterGain.connect(audioCtx.destination);

    // 1. SIREN
    const osc1 = audioCtx.createOscillator();
    osc1.type = 'sawtooth'; osc1.frequency.value = 700;
    osc1.connect(masterGain); osc1.start();
    alarmNodes.push(osc1);

    // 2. METAL SCRATCH
    const osc2 = audioCtx.createOscillator();
    osc2.type = 'square'; osc2.frequency.value = 2500; 
    osc2.connect(masterGain); osc2.start();
    alarmNodes.push(osc2);

    // 3. LOW RUMBLE
    const osc3 = audioCtx.createOscillator();
    osc3.type = 'triangle'; osc3.frequency.value = 50; 
    osc3.connect(masterGain); osc3.start();
    alarmNodes.push(osc3);

    // 4. RANDOM BEEPING
    const osc4 = audioCtx.createOscillator();
    osc4.type = 'square'; osc4.frequency.value = 1000;
    const gain4 = audioCtx.createGain(); gain4.gain.value = 0.5;
    osc4.connect(gain4); gain4.connect(masterGain);
    osc4.start();
    alarmNodes.push(osc4);

    // 5. STATIC NOISE
    const bufferSize = audioCtx.sampleRate * 2;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer; noise.loop = true;
    const noiseGain = audioCtx.createGain(); noiseGain.gain.value = 0.2;
    noise.connect(noiseGain); noiseGain.connect(masterGain);
    noise.start();
    alarmNodes.push(noise);

    // MODULATION
    let toggle = false;
    sirenInterval = setInterval(() => {
        toggle = !toggle;
        const now = audioCtx.currentTime;
        osc1.frequency.linearRampToValueAtTime(toggle ? 1200 : 600, now + 0.1);
        osc2.frequency.setValueAtTime(2000 + Math.random() * 1000, now);
        if(Math.random() > 0.5) gain4.gain.value = 0.8; else gain4.gain.value = 0;
    }, 150);
}

function stopAllSounds() {
    if(alarmNodes.length > 0) {
        alarmNodes.forEach(node => { try { node.stop(); node.disconnect(); } catch(e){} });
        alarmNodes = [];
    }
    if(sirenInterval) clearInterval(sirenInterval);
}

// --- LEVEL 1: STABILIZER (FASTER SHAKE) ---
function moveSafeZone() {
    setInterval(() => {
        let maxW = window.innerWidth - 150; let maxH = window.innerHeight - 150;
        let x = Math.random() * maxW; let y = Math.random() * maxH;
        safeZone.style.left = x + 'px'; safeZone.style.top = y + 'px';
    }, 800); 
}
window.addEventListener('mousemove', (e) => { if(isRinging && stabCountdown > 0 && stability < 100) runStabilizer(e.clientX, e.clientY); });
window.addEventListener('touchmove', (e) => { if(isRinging && stabCountdown > 0 && stability < 100) runStabilizer(e.touches[0].clientX, e.touches[0].clientY); });

function runStabilizer(clientX, clientY) {
    let invX = window.innerWidth - clientX;
    let invY = window.innerHeight - clientY;
    fakeCursor.style.left = invX + 'px'; fakeCursor.style.top = invY + 'px';
    let sz = safeZone.getBoundingClientRect();
    let cx = sz.left + sz.width/2; let cy = sz.top + sz.height/2;
    let dist = Math.sqrt((invX - cx)**2 + (invY - cy)**2);
    if(dist < 75) { stability += 0.8; safeZone.style.borderColor = "#00ff00"; } 
    else { stability -= 1.0; if(stability < 0) stability = 0; safeZone.style.borderColor = "#fff"; }
    progressBar.style.width = Math.min(stability, 100) + "%";
    if(stability >= 100) { clearInterval(stabInterval); stopAlarmTotally(); }
}

function failStabilizer() {
    document.getElementById('stabilizer-overlay').style.display = 'none';
    startAdsLevel();
}

function startAdsLevel() {
    document.getElementById('ad-overlay').style.display = 'flex';
    setupNextAd();
}

function setupNextAd() {
    const data = adData[5 - adsRemaining];
    if(data) {
        document.getElementById('ad-title').innerText = data.title;
        document.getElementById('ad-body').innerText = data.body;
    }
    document.getElementById('ad-count').innerText = `Ads remaining: ${adsRemaining}`;
    
    const closeBtn = document.querySelector('.close-ad');
    const popup = document.getElementById('current-ad');
    
    if(closeBtn.parentNode !== popup) popup.appendChild(closeBtn);
    
    closeBtn.classList.remove('running-mode'); 
    closeBtn.style.position = 'absolute'; closeBtn.style.top = '-20px'; closeBtn.style.right = '-20px';
    closeBtn.style.left = 'auto'; 
    
    // RED RESET
    closeBtn.style.background = '#ff0000';
    closeBtn.style.border = '5px solid #fff';
    closeBtn.style.color = '#fff';
    closeBtn.innerText = "×";

    jumpsRemaining = Math.floor(Math.random() * 4) + 3; 
    
    const newBtn = closeBtn.cloneNode(true);
    closeBtn.parentNode.replaceChild(newBtn, closeBtn);
    newBtn.addEventListener('mouseover', runButtonRun);
    newBtn.addEventListener('touchstart', (e) => { if(jumpsRemaining > 0) { e.preventDefault(); runButtonRun(); } });
    newBtn.onclick = function() { if(jumpsRemaining <= 0) closeAd(); };
}

function runButtonRun() {
    if(jumpsRemaining > 0) {
        playZipSound();
        const btn = document.querySelector('.close-ad');
        
        if(btn.parentNode !== document.body) document.body.appendChild(btn);
        
        btn.classList.add('running-mode'); 
        btn.style.position = 'fixed'; 
        
        let maxX = window.innerWidth - 60; let maxY = window.innerHeight - 60;
        let newX = Math.floor(Math.random() * maxX); let newY = Math.floor(Math.random() * maxY);
        btn.style.left = newX + 'px'; btn.style.top = newY + 'px'; btn.style.right = 'auto'; 
        jumpsRemaining--;
        
        // RED OK BUTTON
        if(jumpsRemaining === 0) { 
            btn.style.background = '#ff0000'; 
            btn.style.border = '5px solid #fff'; 
            btn.innerText = "OK"; 
        }
    }
}

function playZipSound() {
    if(!audioCtx) return;
    const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
    osc.type = 'square'; osc.frequency.setValueAtTime(800, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    osc.connect(gain); gain.connect(audioCtx.destination); osc.start(); osc.stop(audioCtx.currentTime + 0.1);
}

function closeAd() {
    if(jumpsRemaining > 0) return;
    adsRemaining--;
    if (adsRemaining <= 0) { stopAlarmTotally(); } 
    else { 
        setupNextAd(); 
        const popup = document.getElementById('current-ad');
        popup.style.transform = `scale(0.1)`; 
        setTimeout(() => { popup.style.transform = `scale(1)`; }, 100); 
    }
}

function stopAlarmTotally() {
    stopAllSounds(); 
    document.body.classList.remove('alarm-active'); 
    document.body.classList.remove('shaking');
    alert("GOOD MORNING! Alarm Deactivated.");
    location.reload();
}