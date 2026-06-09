// Alarm Management
class AlarmManager {
    constructor() {
        this.alarms = this.loadAlarms();
        this.currentSnoozedAlarm = null;
        this.init();
    }

    init() {
        this.updateTime();
        this.checkAlarms();
        this.renderAlarms();
        
        setInterval(() => this.updateTime(), 1000);
        setInterval(() => this.checkAlarms(), 1000);
    }

    // Load alarms from localStorage
    loadAlarms() {
        const saved = localStorage.getItem('alarms');
        return saved ? JSON.parse(saved) : [];
    }

    // Save alarms to localStorage
    saveAlarms() {
        localStorage.setItem('alarms', JSON.stringify(this.alarms));
    }

    // Update current time display
    updateTime() {
        const now = new Date();
        const timeString = this.formatTime(now);
        const dateString = this.formatDate(now);

        document.getElementById('currentTime').textContent = timeString;
        document.getElementById('currentDate').textContent = dateString;
    }

    // Format time as HH:MM:SS
    formatTime(date) {
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    // Format date
    formatDate(date) {
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    // Add new alarm
    addAlarm(time, label, sound, repeat) {
        if (!time) {
            this.showNotification('Please select a time', 'error');
            return;
        }

        const alarm = {
            id: Date.now(),
            time: time,
            label: label || 'Alarm',
            sound: sound || 'default',
            repeat: repeat || 'never',
            enabled: true,
            createdAt: new Date().toISOString()
        };

        this.alarms.push(alarm);
        this.saveAlarms();
        this.renderAlarms();
        this.resetForm();
        this.showNotification('Alarm added successfully!', 'success');
    }

    // Delete alarm
    deleteAlarm(id) {
        this.alarms = this.alarms.filter(alarm => alarm.id !== id);
        this.saveAlarms();
        this.renderAlarms();
        this.showNotification('Alarm deleted', 'success');
    }

    // Toggle alarm on/off
    toggleAlarm(id) {
        const alarm = this.alarms.find(a => a.id === id);
        if (alarm) {
            alarm.enabled = !alarm.enabled;
            this.saveAlarms();
            this.renderAlarms();
        }
    }

    // Edit alarm
    editAlarm(id, time, label, sound, repeat) {
        const alarm = this.alarms.find(a => a.id === id);
        if (alarm) {
            alarm.time = time || alarm.time;
            alarm.label = label !== undefined ? label : alarm.label;
            alarm.sound = sound || alarm.sound;
            alarm.repeat = repeat || alarm.repeat;
            this.saveAlarms();
            this.renderAlarms();
            this.showNotification('Alarm updated', 'success');
        }
    }

    // Check if any alarm should trigger
    checkAlarms() {
        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        this.alarms.forEach(alarm => {
            if (alarm.enabled && alarm.time === currentTime) {
                // Check if it should trigger based on repeat
                if (this.shouldAlarmTrigger(alarm)) {
                    this.triggerAlarm(alarm);
                }
            }
        });
    }

    // Check if alarm should trigger based on repeat setting
    shouldAlarmTrigger(alarm) {
        if (alarm.repeat === 'never') return true;

        const dayOfWeek = new Date().getDay(); // 0 = Sunday, 6 = Saturday

        switch (alarm.repeat) {
            case 'daily':
                return true;
            case 'weekdays':
                return dayOfWeek >= 1 && dayOfWeek <= 5;
            case 'weekends':
                return dayOfWeek === 0 || dayOfWeek === 6;
            default:
                return true;
        }
    }

    // Trigger alarm
    triggerAlarm(alarm) {
        // Prevent multiple triggers for the same alarm in the same minute
        if (alarm.lastTriggered === this.getCurrentMinute()) {
            return;
        }

        alarm.lastTriggered = this.getCurrentMinute();

        // Show alarm modal
        const modal = document.getElementById('alarmModal');
        document.getElementById('alarmTitle').textContent = alarm.label;
        document.getElementById('alarmMessage').textContent = `Alarm at ${alarm.time}`;
        modal.classList.add('show');

        // Play alarm sound
        this.playAlarmSound(alarm.sound);

        // Store current alarm for snooze
        this.currentAlarm = alarm;

        // Add ringing animation
        this.addRingAnimation();
    }

    // Get current minute string
    getCurrentMinute() {
        const now = new Date();
        return `${now.getHours()}:${now.getMinutes()}`;
    }

    // Play alarm sound
    playAlarmSound(soundType) {
        // Create a simple beep using Web Audio API
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

        switch (soundType) {
            case 'bell':
                oscillator.frequency.value = 1000;
                oscillator.type = 'sine';
                break;
            case 'digital':
                oscillator.frequency.value = 800;
                oscillator.type = 'square';
                break;
            case 'alarm':
                oscillator.frequency.value = 1200;
                oscillator.type = 'triangle';
                break;
            default:
                oscillator.frequency.value = 600;
                oscillator.type = 'sine';
        }

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);

        // Repeat alarm sound several times
        for (let i = 1; i < 8; i++) {
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            osc.connect(gain);
            gain.connect(audioContext.destination);
            osc.frequency.value = oscillator.frequency.value;
            osc.type = oscillator.type;
            gain.gain.setValueAtTime(0.3, audioContext.currentTime + i * 0.6);
            gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + i * 0.6 + 0.5);
            osc.start(audioContext.currentTime + i * 0.6);
            osc.stop(audioContext.currentTime + i * 0.6 + 0.5);
        }
    }

    // Add ringing animation to alarm modal
    addRingAnimation() {
        const modal = document.getElementById('alarmModal');
        const icon = modal.querySelector('.alarm-icon');
        icon.style.animation = 'none';
        setTimeout(() => {
            icon.style.animation = 'ring 0.5s ease-in-out infinite';
        }, 10);
    }

    // Render alarms in the list
    renderAlarms() {
        const alarmsList = document.getElementById('alarmsList');

        if (this.alarms.length === 0) {
            alarmsList.innerHTML = '<p class="empty-state">No alarms set yet. Create your first alarm!</p>';
            return;
        }

        alarmsList.innerHTML = this.alarms.map(alarm => `
            <div class="alarm-card ${alarm.enabled ? 'active' : ''}">
                <div class="alarm-time">${alarm.time}</div>
                <div class="alarm-label">${alarm.label}</div>
                <div class="alarm-info">🔊 ${this.capitalize(alarm.sound)}</div>
                <div class="alarm-info">🔄 ${this.capitalize(alarm.repeat)}</div>
                <div class="alarm-toggle">
                    <div class="toggle-switch ${alarm.enabled ? 'active' : ''}" onclick="alarmManager.toggleAlarm(${alarm.id})"></div>
                    <span class="toggle-label">${alarm.enabled ? 'ON' : 'OFF'}</span>
                </div>
                <div class="alarm-actions">
                    <button class="btn btn-danger" onclick="alarmManager.deleteAlarm(${alarm.id})">Delete</button>
                </div>
            </div>
        `).join('');
    }

    // Capitalize string
    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    // Reset form
    resetForm() {
        document.getElementById('alarmTime').value = '';
        document.getElementById('alarmLabel').value = '';
        document.getElementById('alarmSound').value = 'default';
        document.getElementById('alarmRepeat').value = 'never';
    }

    // Show notification
    showNotification(message, type) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            background: ${type === 'success' ? 'var(--success-color)' : 'var(--danger-color)'};
            color: white;
            border-radius: 8px;
            box-shadow: var(--shadow);
            z-index: 2000;
            animation: slideUp 0.3s ease;
            font-weight: 600;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideUp 0.3s ease reverse';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Initialize alarm manager
let alarmManager;

document.addEventListener('DOMContentLoaded', () => {
    alarmManager = new AlarmManager();
});

// Add alarm function (called from HTML)
function addAlarm() {
    const time = document.getElementById('alarmTime').value;
    const label = document.getElementById('alarmLabel').value;
    const sound = document.getElementById('alarmSound').value;
    const repeat = document.getElementById('alarmRepeat').value;

    alarmManager.addAlarm(time, label, sound, repeat);
}

// Dismiss alarm
function dismissAlarm() {
    const modal = document.getElementById('alarmModal');
    modal.classList.remove('show');
    
    // Stop all audio
    document.querySelectorAll('audio').forEach(audio => audio.pause());
    
    alarmManager.showNotification('Alarm dismissed', 'success');
}

// Snooze alarm for 5 minutes
function snoozeAlarm() {
    const modal = document.getElementById('alarmModal');
    modal.classList.remove('show');
    
    // Stop all audio
    document.querySelectorAll('audio').forEach(audio => audio.pause());
    
    if (alarmManager.currentAlarm) {
        const now = new Date();
        const snoozeTime = new Date(now.getTime() + 5 * 60000);
        const hours = String(snoozeTime.getHours()).padStart(2, '0');
        const minutes = String(snoozeTime.getMinutes()).padStart(2, '0');
        
        alarmManager.showNotification(`Snoozed until ${hours}:${minutes}`, 'success');
    }
}