// --- VARIABLES ---
let totalMinutes = 720;
let leakRate = 0.5;
let isLocked = false;
let isFrozen = false; 
let alarmSetTime = null;
let checkInterval;

let isJammed = false;
let jamClicksRemaining = 0;

let frogPos = 0; 
const maxDepth = 150;
let isHoldingFrog = false;
let frogStunTimer = 0; 

// AUDIO
let audioCtx = null;
function initAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
}

// DOM Elements
const dTime = document.getElementById('d-time');
const amPm = document.getElementById('am-pm');
const pumpHandle = document.getElementById('pump-handle');
const pumpInd = document.getElementById('pump-indicator');
const freezeBtn = document.getElementById('freeze-btn');
const volBar = document.getElementById('vol-bar');
const volStatus = document.getElementById('vol-status');
const volFrog = document.getElementById('vol-frog');
const pond = document.getElementById('pond');
const sliderKnob = document.getElementById('slider-knob');
const sliderTrack = document.getElementById('slider-track');
const statusMsg = document.getElementById('status-msg');
const hHand = document.getElementById('h-hand');
const mHand = document.getElementById('m-hand');

// --- MAIN LOOP ---
setInterval(() => {
    if(isLocked) return;

    // Leak
    if(!isFrozen && totalMinutes > 0) {
        let dynamicLeak = leakRate + (totalMinutes / 800); 
        totalMinutes -= dynamicLeak; 
        if(totalMinutes < 0) totalMinutes = 0;
        updateClockUI();
    }
    
    // Frog Float
    if(!isHoldingFrog) {
        if(frogStunTimer > 0) {
            frogStunTimer--;
            frogPos = (Math.random() > 0.5) ? maxDepth : maxDepth - 2;
        } else {
            frogPos -= 2; 
        }
        if(frogPos < 0) frogPos = 0;
        updateFrogUI();
    }
}, 50);

// --- PUMP LOGIC (MOUSE & TOUCH) ---
// We handle both click and touchstart in HTML, but need to prevent double fire
function pumpTime(e) {
    initAudio();
    if(isLocked) return;
    
    if(isJammed) {
        jamClicksRemaining--;
        pumpHandle.classList.add('pump-shake');
        setTimeout(() => pumpHandle.classList.remove('pump-shake'), 100);
        
        if(jamClicksRemaining <= 0) {
            isJammed = false;
            pumpHandle.parentElement.classList.remove('pump-jammed');
            pumpInd.innerText = "OK";
            pumpInd.style.color = "#0f0";
            pumpInd.style.background = "transparent";
        }
        return;
    }

    if(Math.random() < 0.2) {
        isJammed = true;
        jamClicksRemaining = 4;
        pumpHandle.parentElement.classList.add('pump-jammed');
        pumpInd.innerText = "JAMMED!";
        pumpInd.style.color = "#fff";
        pumpInd.style.background = "#f00";
        return;
    }
    
    pumpHandle.classList.add('pump-active');
    setTimeout(() => pumpHandle.classList.remove('pump-active'), 100);
    
    let addedTime = Math.floor(Math.random() * 10) + 5;
    totalMinutes += addedTime;
    
    if(totalMinutes >= 1440) totalMinutes -= 1440;
    updateClockUI();
    
    // Pump Sound
    if(audioCtx) {
        let o = audioCtx.createOscillator();
        let g = audioCtx.createGain();
        o.frequency.value = 100; o.type='triangle';
        o.connect(g); g.connect(audioCtx.destination);
        o.start(); o.stop(audioCtx.currentTime + 0.1);
    }
}

// Attach listeners manually to handle touch prevention
pumpHandle.addEventListener('touchstart', (e) => {
    e.preventDefault(); // Prevents scroll on mobile
    pumpTime();
});
pumpHandle.addEventListener('mousedown', (e) => {
    pumpTime();
});


// --- FREEZE LOGIC ---
function freezeTime() {
    initAudio();
    if(isLocked || isFrozen) return;
    
    isFrozen = true;
    freezeBtn.disabled = true;
    freezeBtn.style.backgroundColor = "#fff";
    freezeBtn.innerText = "FROZEN!";
    
    let countdown = 5;
    let timer = setInterval(() => {
        countdown--;
        freezeBtn.innerText = `FROZEN (${countdown}s)`;
        
        if(countdown <= 0) {
            clearInterval(timer);
            isFrozen = false;
            freezeBtn.disabled = false;
            freezeBtn.style.backgroundColor = "#00ccff";
            freezeBtn.innerText = "❄ FREEZE ❄";
        }
    }, 1000);
}

function updateClockUI() {
    let m = Math.floor(totalMinutes);
    let h24 = Math.floor(m / 60);
    let mins = m % 60;
    
    let hDeg = (h24 % 12 * 30) + (mins * 0.5); 
    let mDeg = mins * 6; 
    
    hHand.style.transform = `rotate(${hDeg}deg)`;
    mHand.style.transform = `rotate(${mDeg}deg)`;
    
    let h12 = h24 % 12; if(h12 === 0) h12 = 12;
    let ap = h24 < 12 ? 'AM' : 'PM';
    dTime.innerText = `${h12}:${mins.toString().padStart(2,'0')}`;
    amPm.innerText = ap;
}

// --- FROG DRAG LOGIC (TOUCH FIXED) ---
volFrog.addEventListener('mousedown', startFrogDrag);
volFrog.addEventListener('touchstart', (e) => { e.preventDefault(); startFrogDrag(e.touches[0]); });

window.addEventListener('mousemove', moveFrogDrag);
window.addEventListener('touchmove', (e) => { if(isHoldingFrog) moveFrogDrag(e.touches[0]); });

window.addEventListener('mouseup', endFrogDrag);
window.addEventListener('touchend', endFrogDrag);

function startFrogDrag(e) {
    if(isLocked) return;
    initAudio();
    isHoldingFrog = true;
    volFrog.style.transition = "none";
}

function moveFrogDrag(e) {
    if(!isHoldingFrog || isLocked) return;
    // Handle both mouse (e.clientY) and touch (e.clientY inside touch object)
    let clientY = e.clientY; 
    
    let rect = pond.getBoundingClientRect();
    let y = clientY - rect.top - 20; 
    
    if(y < 0) y = 0;
    if(y > maxDepth) y = maxDepth; 
    frogPos = y;
    updateFrogUI();
}

function endFrogDrag() {
    isHoldingFrog = false;
    volFrog.style.transition = "top 0.2s linear";
    if(frogPos >= maxDepth - 5) {
        frogStunTimer = 40; 
        volStatus.innerText = "STUCK IN MUD!";
        volStatus.style.color = "#885500";
    }
}

function updateFrogUI() {
    volFrog.style.top = frogPos + 'px';
    let vol = 100 - Math.floor((frogPos / maxDepth) * 100);
    volBar.style.width = vol + "%";
    
    if(vol > 80 && frogStunTimer <= 0) {
        volStatus.innerText = "LOUD!"; volStatus.style.color = "red";
    } else if(vol < 20) {
        if(frogStunTimer > 0) {
            volStatus.innerText = "STUCK (LOCK NOW!)"; 
            volStatus.style.color = "lime";
        } else {
            volStatus.innerText = "SILENT"; 
            volStatus.style.color = "#0f0";
        }
    }
}

// --- LOCK LOGIC (TOUCH FIXED) ---
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
        let limit = rect.width - 50; // width of knob
        
        if(x > limit) attemptLock();
        else if(x >= 0) sliderKnob.style.left = x + 'px';
    }
}

function attemptLock() {
    if(!isFrozen) {
        statusMsg.innerText = "FREEZE TIME FIRST!";
        statusMsg.style.color = "red";
        resetSlider();
        return;
    }
    
    let vol = 100 - Math.floor((frogPos / maxDepth) * 100);
    if(vol > 20) {
        statusMsg.innerText = "FROG IS LOUD!";
        statusMsg.style.color = "red";
        resetSlider();
        return;
    }

    isLocked = true;
    sliderKnob.style.left = (sliderTrack.offsetWidth - 50) + 'px';
    sliderKnob.innerText = "🔒";
    sliderKnob.style.background = "#0f0";
    
    let m = Math.floor(totalMinutes);
    let h24 = Math.floor(m / 60);
    let mins = m % 60;
    alarmSetTime = { h: h24, m: mins };
    
    let h12 = h24 % 12; if(h12===0) h12=12;
    let ap = h24 < 12 ? 'AM' : 'PM';
    
    statusMsg.innerText = `ALARM: ${h12}:${mins.toString().padStart(2,'0')} ${ap}`;
    statusMsg.style.color = "#0f0";
    
    document.getElementById('clock-panel').style.opacity = 0.5;
    document.getElementById('volume-panel').style.opacity = 0.5;
    
    checkInterval = setInterval(checkRealTime, 1000);
}

function resetSlider() {
    if(draggingSlider && !isLocked) {
        draggingSlider = false;
        sliderKnob.style.left = '0px';
    }
}

function checkRealTime() {
    let now = new Date();
    if(now.getHours() === alarmSetTime.h && now.getMinutes() === alarmSetTime.m && now.getSeconds() === 0) {
        triggerAlarm();
    }
}

// --- ALARM TRIGGER ---
let isRinging = false;
let alarmOsc = null;

function triggerAlarm() {
    clearInterval(checkInterval);
    isRinging = true;
    document.getElementById('stabilizer-overlay').style.display = 'flex';
    document.body.classList.add('shaking');
    
    // Alarm Sound
    initAudio();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = 500;
    gain.gain.value = 0.5;
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    alarmOsc = osc;
    
    setInterval(() => {
        if(alarmOsc) alarmOsc.frequency.value = alarmOsc.frequency.value === 500 ? 800 : 500;
    }, 200);
    
    moveSafeZone();
}

// --- STABILIZER ---
const safeZone = document.getElementById('safe-zone');
const fakeCursor = document.getElementById('fake-cursor');
const progressBar = document.getElementById('stop-progress');
let stability = 0;

function moveSafeZone() {
    setInterval(() => {
        let maxW = window.innerWidth - 150;
        let maxH = window.innerHeight - 150;
        let x = Math.random() * maxW;
        let y = Math.random() * maxH;
        safeZone.style.left = x + 'px';
        safeZone.style.top = y + 'px';
    }, 1500);
}

window.addEventListener('mousemove', (e) => { if(isRinging) runStabilizer(e.clientX, e.clientY); });
window.addEventListener('touchmove', (e) => { if(isRinging) runStabilizer(e.touches[0].clientX, e.touches[0].clientY); });

function runStabilizer(clientX, clientY) {
    let invX = window.innerWidth - clientX;
    let invY = window.innerHeight - clientY;
    
    fakeCursor.style.left = invX + 'px';
    fakeCursor.style.top = invY + 'px';
    
    let sz = safeZone.getBoundingClientRect();
    let cx = sz.left + sz.width/2;
    let cy = sz.top + sz.height/2;
    let dist = Math.sqrt((invX - cx)**2 + (invY - cy)**2);
    
    if(dist < 75) {
        stability += 0.5;
        safeZone.style.borderColor = "#00ff00";
    } else {
        stability -= 1.0;
        if(stability < 0) stability = 0;
        safeZone.style.borderColor = "#fff";
    }
    
    progressBar.style.width = Math.min(stability, 100) + "%";
    
    if(stability >= 100) {
        if(alarmOsc) alarmOsc.stop();
        alert("GOOD MORNING!");
        location.reload();
    }
}

