// --- FUNKCJE POMOCNICZE (Narzędzia) ---
// Zabezpieczenie przed złośliwym kodem (XSS)
function esc(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

// Opóźnienie wyszukiwania (żeby nie zacinało przy szybkim pisaniu)
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}
const debouncedRenderStudents = debounce(renderStudents, 150);

// Bezpieczna lokalna data (YYYY-MM-DD)
function getLocalISODate(dateObj) {
    const d = new Date(dateObj);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Przeliczanie kolorów (HEX na RGBA dla tła)
function hexToRgba(hex, alpha) {
    if(!hex) return `rgba(120, 120, 120, ${alpha})`;
    let r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Szukanie poniedziałku dla danego tygodnia
function getMonday(d) {
    let date = new Date(d);
    date.setHours(12, 0, 0, 0);
    let day = date.getDay(), diff = date.getDate() - day + (day === 0 ? -6 : 1); 
    return new Date(date.setDate(diff));
}

// Numer tygodnia w roku
function getWeekString(dateObj) {
    let d = new Date(dateObj);
    d.setHours(12,0,0,0);
    d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
    let week1 = new Date(d.getFullYear(), 0, 4);
    let weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
    return d.getFullYear() + '-W' + weekNum.toString().padStart(2, '0');
}

// Animacja licznika pieniędzy na pulpicie
function animateValue(id, start, end, duration, suffix = "") {
    let obj = document.getElementById(id);
    if (!obj) return;
    if (start === end) { obj.innerText = end + suffix; return; }
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        obj.innerText = Math.floor(easeOutQuart * (end - start) + start) + suffix;
        if (progress < 1) window.requestAnimationFrame(step);
        else obj.innerText = end + suffix;
    };
    window.requestAnimationFrame(step);
}

// --- POWIADOMIENIA I OKIENKA ---
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-emerald-500' : 'bg-rose-500';
    const icon = type === 'success' ? '✅' : '❌';
    
    toast.className = `${bgColor} text-white px-4 py-3 rounded-xl shadow-[4px_4px_0_var(--ciemny)] border-2 border-black font-extrabold text-xs md:text-sm transform transition-all duration-300 translate-y-10 opacity-0 flex items-center gap-3`;
    toast.innerHTML = `<span>${icon}</span> <span>${esc(message)}</span>`;
    
    container.appendChild(toast);
    
    setTimeout(() => { toast.classList.remove('translate-y-10', 'opacity-0'); }, 10);
    setTimeout(() => {
        toast.classList.add('translate-y-10', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function customAlert(title, message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('modal-alert');
        document.getElementById('alert-title').innerText = esc(title);
        document.getElementById('alert-message').innerText = esc(message);
        const btnOk = document.getElementById('btn-alert-ok');
        modal.classList.remove('hidden');
        btnOk.onclick = () => { modal.classList.add('hidden'); resolve(); };
    });
}

function showConfirm(title, message, isDanger = false) {
    return new Promise((resolve) => {
        const modal = document.getElementById('modal-confirm');
        document.getElementById('confirm-title').innerText = esc(title);
        document.getElementById('confirm-message').innerText = esc(message);
        const btnOk = document.getElementById('btn-confirm-ok');
        const btnCancel = document.getElementById('btn-confirm-cancel');
        btnOk.style.backgroundColor = isDanger ? '#ef4444' : 'var(--akcent)';
        modal.classList.remove('hidden');
        const cleanup = () => { modal.classList.add('hidden'); btnOk.onclick = null; btnCancel.onclick = null; };
        btnOk.onclick = () => { cleanup(); resolve(true); };
        btnCancel.onclick = () => { cleanup(); resolve(false); };
    });
}

function showSeriesChoice(title, message, isDanger = false) {
    return new Promise((resolve) => {
        const modal = document.getElementById('modal-series');
        document.getElementById('series-title').innerText = esc(title);
        document.getElementById('series-message').innerText = esc(message);
        const btnSingle = document.getElementById('btn-series-single');
        const btnFuture = document.getElementById('btn-series-future');
        const btnCancel = document.getElementById('btn-series-cancel');
        btnFuture.style.backgroundColor = isDanger ? '#ef4444' : 'var(--akcent)';
        modal.classList.remove('hidden');
        const cleanup = () => { modal.classList.add('hidden'); btnSingle.onclick = null; btnFuture.onclick = null; btnCancel.onclick = null; };
        btnSingle.onclick = () => { cleanup(); resolve('single'); };
        btnFuture.onclick = () => { cleanup(); resolve('future'); };
        btnCancel.onclick = () => { cleanup(); resolve(null); };
    });
}

// Powiadomienia w systemie operacyjnym
function initNotifications() {
    if ('Notification' in window && Notification.permission !== 'granted') {
        Notification.requestPermission();
    }
}

function checkNotifications() {
    if (!currentUser) return;
    const now = new Date();
    const todayString = getLocalISODate(now);
    const currentTime = now.getHours() * 60 + now.getMinutes();

    lessons.forEach(l => {
        if (l.date === todayString && !l.cancelled) {
            let [h, m] = l.startTime.split(':').map(Number);
            let lessonTime = h * 60 + m;
            let diff = lessonTime - currentTime;

            if (diff > 0 && diff <= 15 && !notifiedLessons.has(l.id)) {
                notifiedLessons.add(l.id);
                
                let student = students.find(s => s.id == l.studentId) || {name: 'Uczniem'};
                let subject = subjects.find(s => s.id == l.subjectId) || {name: ''};
                
                let msg = `Za ${diff} min masz lekcję: ${subject.name} z ${student.name}`;
                
                if ("vibrate" in navigator) navigator.vibrate([200, 100, 200, 100, 200]);

                if ('Notification' in window && Notification.permission === 'granted') {
                    new Notification("Nadchodząca lekcja!", { body: msg, icon: "ikona.png" });
                }
            }
        }
    });
}
setInterval(checkNotifications, 60000);

// --- START APLIKACJI I GŁÓWNE ZDARZENIA ---
document.addEventListener("DOMContentLoaded", () => {
    // Inicjalizacja kalendarzyków Flatpickr
    datePicker = flatpickr("#lesson-date", { locale: "pl", dateFormat: "Y-m-d", altInput: true, altFormat: "d/m/Y", allowInput: true, onChange: handleBundleChange });
    paymentDatePicker = flatpickr("#lesson-payment-date", { locale: "pl", dateFormat: "Y-m-d", altInput: true, altFormat: "d/m/Y", allowInput: true });
    timeStartPicker = flatpickr("#lesson-time-start", { enableTime: true, noCalendar: true, dateFormat: "H:i", time_24hr: true, onChange: autoUzupelnijCzas });
    timeEndPicker = flatpickr("#lesson-time-end", { enableTime: true, noCalendar: true, dateFormat: "H:i", time_24hr: true, onChange: handleBundleChange });
    jumpPicker = flatpickr("#jump-date-picker", {
        locale: "pl",
        onChange: function(selectedDates) {
            if(selectedDates.length > 0) {
                currentDate = selectedDates[0];
                renderCalendar();
            }
        }
    });

    // PWA Update
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').then(reg => {
            reg.onupdatefound = () => {
                const installingWorker = reg.installing;
                installingWorker.onstatechange = () => {
                    if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        document.getElementById('pwa-update-toast').classList.remove('hidden');
                    }
                };
            };
        }).catch(err => console.log('SW reg. skipped/failed', err));
    }

    // Klikanie w lekcję na całym dokumencie
    document.addEventListener('click', function(e) {
        let lessonBlock = e.target.closest('.lesson-block');
        if (lessonBlock && !e.target.closest('a') && !e.target.closest('button')) {
            editLesson(lessonBlock.getAttribute('data-id'));
        }
    });
});

function openJumpPicker() { if(jumpPicker) jumpPicker.open(); }

function closeModals() {
    document.getElementById('modal-student').classList.add('hidden');
    document.getElementById('modal-lesson').classList.add('hidden');
    document.getElementById('modal-subject').classList.add('hidden');
    document.getElementById('modal-find-slot').classList.add('hidden');
}

// --- NAWIGACJA ZAKŁADEK ---
function switchTab(tabName) {
    ['skeleton', 'pulpit', 'kalendarz', 'uczniowie', 'przedmioty', 'zarobki', 'ustawienia'].forEach(id => {
        let el = document.getElementById(`view-${id}`);
        if(el) {
            el.classList.add('hidden');
            el.classList.remove('opacity-100', 'translate-y-0');
            el.classList.add('opacity-0', 'translate-y-4');
        }
    });
    document.querySelectorAll('.nav-tab').forEach(btn => btn.classList.remove('aktywna'));

    let viewEl = document.getElementById(`view-${tabName}`);
    if(viewEl) {
        viewEl.classList.remove('hidden');
        void viewEl.offsetWidth; 
        viewEl.classList.remove('opacity-0', 'translate-y-4');
        viewEl.classList.add('opacity-100', 'translate-y-0');
    }
    
    let tabEl = document.getElementById(`tab-${tabName}`);
    if(tabEl) tabEl.classList.add('aktywna');

    if(tabName === 'pulpit') renderDashboard();
    if(tabName === 'kalendarz') renderCalendar();
    if(tabName === 'uczniowie') renderStudents();
    if(tabName === 'przedmioty') renderSubjects();
    if(tabName === 'zarobki') {
        const now = new Date();
        if(!document.getElementById('earnings-month-picker').value) {
            document.getElementById('earnings-month-picker').value = `${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2, '0')}`;
        }
        if(!document.getElementById('earnings-week-picker').value) {
            document.getElementById('earnings-week-picker').value = getWeekString(now); 
        }
        renderZarobki();
    }
}

// --- USTAWIENIA (WYGLĄD I CZAS) ---
function applyVisualSettings() {
    if(settings.theme === 'dark') {
        document.documentElement.classList.add('dark');
        document.getElementById('meta-theme-color').setAttribute('content', '#0f172a');
    } else {
        document.documentElement.classList.remove('dark');
        document.getElementById('meta-theme-color').setAttribute('content', settings.accent);
    }
    document.documentElement.style.setProperty('--akcent', settings.accent);
    document.querySelectorAll('.kolor-kolo').forEach(k => k.classList.remove('aktywny'));
    let activeCircle = Array.from(document.querySelectorAll('.kolor-kolo')).find(el => el.getAttribute('onclick').includes(settings.accent));
    if(activeCircle) activeCircle.classList.add('aktywny');
    
    document.getElementById('ust-start').value = settings.startHour;
    document.getElementById('ust-end').value = settings.endHour;
    document.getElementById('ust-czas').value = settings.duration;

    if(!settings.availability) {
        settings.availability = {
            1: { active: true, start: '15:00', end: '20:00' }, 2: { active: true, start: '15:00', end: '20:00' },
            3: { active: true, start: '15:00', end: '20:00' }, 4: { active: true, start: '15:00', end: '20:00' },
            5: { active: true, start: '15:00', end: '20:00' }, 6: { active: false, start: '10:00', end: '14:00' },
            0: { active: false, start: '10:00', end: '14:00' }
        };
    }
    renderAvailabilitySettings();
    if(!document.getElementById('view-zarobki').classList.contains('hidden')) renderZarobki();
}

function renderAvailabilitySettings() {
    const container = document.getElementById('availability-container');
    if(!container) return;
    container.innerHTML = '';
    const daysMap = [
        {id: 1, name: 'Poniedziałek'}, {id: 2, name: 'Wtorek'}, {id: 3, name: 'Środa'},
        {id: 4, name: 'Czwartek'}, {id: 5, name: 'Piątek'}, {id: 6, name: 'Sobota'}, {id: 0, name: 'Niedziela'}
    ];

    daysMap.forEach(day => {
        let av = settings.availability[day.id];
        let opacity = av.active ? '1' : '0.5';
        container.innerHTML += `
            <div class="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border-2 transition gap-2 sm:gap-0 bg-jasny ramka-szara" style="opacity: ${opacity}">
                <label class="flex items-center gap-3 font-bold w-full sm:w-1/3 cursor-pointer text-sm md:text-base">
                    <input type="checkbox" class="w-5 h-5 rounded cursor-pointer" style="accent-color: var(--akcent)" 
                           onchange="toggleDay(${day.id}, this.checked)" ${av.active ? 'checked' : ''}>
                    ${esc(day.name)}
                </label>
                <div class="flex items-center gap-2 w-full sm:w-2/3 sm:justify-end">
                    <input type="text" class="flatpickr-avail p-1.5 border-2 rounded-lg text-sm font-bold w-full sm:w-24 text-center cursor-pointer ramka-szara bg-karta tekst-glowny" 
                           data-day="${day.id}" data-type="start" value="${av.start}" ${!av.active ? 'disabled' : ''}>
                    <span class="font-bold text-xs hidden sm:block tekst-szary">-</span>
                    <input type="text" class="flatpickr-avail p-1.5 border-2 rounded-lg text-sm font-bold w-full sm:w-24 text-center cursor-pointer ramka-szara bg-karta tekst-glowny" 
                           data-day="${day.id}" data-type="end" value="${av.end}" ${!av.active ? 'disabled' : ''}>
                </div>
            </div>
        `;
    });

    flatpickr(".flatpickr-avail", {
        enableTime: true, noCalendar: true, dateFormat: "H:i", time_24hr: true,
        onChange: function(selectedDates, dateStr, instance) {
            let dayId = instance.element.getAttribute('data-day');
            let type = instance.element.getAttribute('data-type');
            updateDayTime(dayId, type, dateStr);
        }
    });
}

function toggleDay(dayId, isChecked) {
    settings.availability[dayId].active = isChecked;
    saveSettingsToCloud(); renderAvailabilitySettings();
    showToast('Zaktualizowano grafik');
}

function updateDayTime(dayId, type, value) {
    if(value) { settings.availability[dayId][type] = value; saveSettingsToCloud(); }
}

function ustawMotyw(theme) { settings.theme = theme; applyVisualSettings(); saveSettingsToCloud(); }
function ustawAkcent(color) { settings.accent = color; applyVisualSettings(); saveSettingsToCloud(); }

function zapiszOpcje() {
    settings.startHour = parseInt(document.getElementById('ust-start').value) || 7;
    settings.endHour = parseInt(document.getElementById('ust-end').value) || 22;
    settings.duration = parseInt(document.getElementById('ust-czas').value) || 60;
    saveSettingsToCloud(); renderCalendar();
    showToast('Zapisano ustawienia!');
}

// Funkcja obsługująca zakładki na stronie Onboardingu
function switchLandingTab(tabId) {
    document.querySelectorAll('.landing-tab-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.landing-tab-btn').forEach(el => {
        el.classList.remove('bg-[#4f46e5]', 'text-white');
        el.classList.add('bg-white', 'text-black');
    });
    
    document.getElementById('landing-tab-' + tabId).classList.remove('hidden');
    document.getElementById('btn-landing-' + tabId).classList.remove('bg-white', 'text-black');
    document.getElementById('btn-landing-' + tabId).classList.add('bg-[#4f46e5]', 'text-white');
}
