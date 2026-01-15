// --- VARIABLES ---
let totalMinutes = 720; // 12:00 PM
let leakRate = 0.5;
let isLocked = false;
let isFrozen = false; 
let alarmSetTime = null;
let checkInterval;

// Jamming Mechanics
let isJammed = false;
let jamClicksRemaining = 0;

// Frog Physics
let frogPos = 0; 
const maxDepth = 150;
let isHoldingFrog = false;
let frogStunTimer = 0; 

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
const statusMsg = document.getElementById('status-msg');

const hHand = document.getElementById('h-hand');
const mHand = document.getElementById('m-hand');

// --- AUDIO SYSTEM (FIXED) ---
let audioCtx = null;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function playPumpSound() {
    if (!audioCtx) initAudio();
    
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.type = 'triangle'; // Sharp sound
    osc.frequency.setValueAtTime(150, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
}

function playAlarmSound() {
    if (!audioCtx) initAudio();
    
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.type = 'sawtooth'; // Annoying buzzer type sound
    osc.frequency.value = 500;
    
    // Volume Control
    gainNode.gain.value = 0.5;
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    osc.start();
    
    return { osc, gainNode }; // Return to control later
}

// --- MAIN LOOP ---
setInterval(() => {
    if(isLocked) return;

    // 1. DYNAMIC LEAK
    if(!isFrozen && totalMinutes > 0) {
        let dynamicLeak = leakRate + (totalMinutes / 800); 
        totalMinutes -= dynamicLeak; 
        if(totalMinutes < 0) totalMinutes = 0;
        updateClockUI();
    }
    
    // 2. FROG BUOYANCY
    if(!isHoldingFrog) {
        if(frogStunTimer > 0) {
            frogStunTimer--;
            if(Math.random() > 0.5) frogPos = maxDepth;
            else frogPos = maxDepth - 2;
        } else {
            frogPos -= 2; 
        }
        if(frogPos < 0) frogPos = 0;
        updateFrogUI();
    }
}, 50);

// --- PUMP LOGIC ---
function pumpTime() {
    // Initialize Audio on first interaction
    initAudio();

    if(isLocked) return;
    
    if(isJammed) {
        jamClicksRemaining--;
        pumpHandle.classList.add('pump-shake');
        setTimeout(() => pumpHandle.classList.remove('pump-shake'), 100);
        
        // Jam Sound (Low Grunt)
        if(audioCtx) {
            const o = audioCtx.createOscillator();
            const g = audioCtx.createGain();
            o.frequency.value = 50; o.type='square';
            o.connect(g); g.connect(audioCtx.destination);
            o.start(); o.stop(audioCtx.currentTime + 0.05);
        }

        if(jamClicksRemaining <= 0) {
            isJammed = false;
            pumpHandle.parentElement.classList.remove('pump-jammed');
            pumpInd.innerText = "OK";
            pumpInd.style.color = "#0f0";
            pumpInd.style.background = "#000";
        }
        return;
    }

    if(Math.random() < 0.2) {
        isJammed = true;
        jamClicksRemaining = Math.floor(Math.random() * 3) + 3;
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
    playPumpSound(); // PLAY SOUND HERE
}

// --- FREEZE LOGIC ---
function freezeTime() {
    initAudio(); // Ensure audio is ready
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
            freezeBtn.innerHTML = "❄ FREEZE ❄<br>(5s)";
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

// --- FROG LOGIC ---
volFrog.addEventListener('mousedown', startFrogDrag);
window.addEventListener('mousemove', moveFrogDrag);
window.addEventListener('mouseup', endFrogDrag);

volFrog.addEventListener('touchstart', (e) => { e.preventDefault(); startFrogDrag(e.touches[0]); });
window.addEventListener('touchmove', (e) => { if(isHoldingFrog) moveFrogDrag(e.touches[0]); });
window.addEventListener('touchend', endFrogDrag);

function startFrogDrag(e) {
    if(isLocked) return;
    initAudio(); // Ensure audio ready on frog touch too
    isHoldingFrog = true;
    volFrog.style.transition = "none";
}

function moveFrogDrag(e) {
    if(!isHoldingFrog || isLocked) return;
    let rect = pond.getBoundingClientRect();
    let y = e.clientY - rect.top - 20; 
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

// --- LOCK LOGIC ---
let draggingSlider = false;
sliderKnob.addEventListener('mousedown', () => draggingSlider = true);
sliderKnob.addEventListener('touchstart', (e) => { e.preventDefault(); draggingSlider = true; });

window.addEventListener('mousemove', (e) => handleSlider(e.clientX));
window.addEventListener('touchmove', (e) => handleSlider(e.touches[0].clientX));

window.addEventListener('mouseup', () => { draggingSlider = false; sliderKnob.style.left = '0px'; });
window.addEventListener('touchend', () => { draggingSlider = false; sliderKnob.style.left = '0px'; });

function handleSlider(cx) {
    if(draggingSlider && !isLocked) {
        let rect = document.getElementById('slider-track').getBoundingClientRect();
        let x = cx - rect.left;
        if(x > 240) attemptLock();
        else if(x >= 0) sliderKnob.style.left = x + 'px';
    }
}

function attemptLock() {
    if(!isFrozen) {
        statusMsg.innerText = "ERROR: FREEZE TIME FIRST!";
        statusMsg.style.color = "red";
        resetSlider();
        return;
    }
    
    let vol = 100 - Math.floor((frogPos / maxDepth) * 100);
    if(vol > 20) {
        statusMsg.innerText = "FROG IS TOO LOUD!";
        statusMsg.style.color = "red";
        resetSlider();
        return;
    }

    isLocked = true;
    sliderKnob.style.left = '240px';
    sliderKnob.innerText = "🔒";
    sliderKnob.style.background = "#0f0";
    
    let m = Math.floor(totalMinutes);
    let h24 = Math.floor(m / 60);
    let mins = m % 60;
    alarmSetTime = { h: h24, m: mins };
    
    let h12 = h24 % 12; if(h12===0) h12=12;
    let ap = h24 < 12 ? 'AM' : 'PM';
    
    statusMsg.innerText = `ALARM SET: ${h12}:${mins.toString().padStart(2,'0')} ${ap}`;
    statusMsg.style.color = "#0f0";
    
    document.getElementById('clock-panel').style.opacity = 0.5;
    document.getElementById('volume-panel').style.opacity = 0.5;
    
    checkInterval = setInterval(checkRealTime, 1000);
}

function resetSlider() {
    draggingSlider = false;
    sliderKnob.style.left = '0px';
}

function checkRealTime() {
    let now = new Date();
    if(now.getHours() === alarmSetTime.h && now.getMinutes() === alarmSetTime.m && now.getSeconds() === 0) {
        triggerAlarm();
    }
}

// --- ALARM TRIGGER ---
let isRinging = false;
let alarmOscillator = null;

function triggerAlarm() {
    clearInterval(checkInterval);
    isRinging = true;
    document.getElementById('stabilizer-overlay').style.display = 'flex';
    document.body.classList.add('shaking');
    
    // Play Continuous Alarm Sound
    let soundObj = playAlarmSound();
    alarmOscillator = soundObj.osc;
    
    // Modulate Pitch (Siren Effect)
    setInterval(() => {
        if(alarmOscillator) {
            let now = audioCtx.currentTime;
            alarmOscillator.frequency.cancelScheduledValues(now);
            alarmOscillator.frequency.setValueAtTime(500, now);
            alarmOscillator.frequency.linearRampToValueAtTime(800, now + 0.1);
            alarmOscillator.frequency.linearRampToValueAtTime(500, now + 0.2);
        }
    }, 250);
    
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
        if(alarmOscillator) alarmOscillator.stop();
        alert("GOOD MORNING!");
        location.reload();
    }
}