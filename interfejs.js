// --- FUNKCJE POMOCNICZE (Narzędzia) ---
function esc(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}
const debouncedRenderStudents = debounce(renderStudents, 150);

function getLocalISODate(dateObj) {
    const d = new Date(dateObj);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function hexToRgba(hex, alpha) {
    if(!hex) return `rgba(120, 120, 120, ${alpha})`;
    let r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getMonday(d) {
    d = new Date(d);
    let day = d.getDay(), diff = d.getDate() - day + (day === 0 ? -6 : 1);
    let monday = new Date(d.setDate(diff));
    monday.setHours(12,0,0,0);
    return monday;
}

function getWeekString(dateString) {
    let monday = getLocalISODate(getMonday(dateString + "T12:00:00"));
    return monday; 
}

function animateValue(id, start, end, duration, suffix = '') {
    const obj = document.getElementById(id);
    if (!obj) return;
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const current = Math.floor(easeOutQuart * (end - start) + start);
        obj.innerHTML = current + suffix;
        if (progress < 1) window.requestAnimationFrame(step);
    };
    window.requestAnimationFrame(step);
}

// System Powiadomień (Toast)
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl transform transition-all duration-300 translate-y-10 opacity-0 font-bold border-2`;
    toast.style.backgroundColor = 'var(--karta-bg)';
    toast.style.borderColor = 'var(--ciemny)';
    toast.style.color = 'var(--tekst-glowny)';
    
    let icon = type === 'success' ? `<div class="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm shadow-sm">✓</div>` : `<div class="w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center text-sm shadow-sm">!</div>`;
    toast.innerHTML = `${icon} <span>${esc(message)}</span>`;
    
    container.appendChild(toast);
    setTimeout(() => { toast.classList.remove('translate-y-10', 'opacity-0'); }, 10);
    setTimeout(() => { toast.classList.add('translate-y-10', 'opacity-0'); setTimeout(() => toast.remove(), 300); }, 3000);
}

// System Okienek (Modali)
function closeModals() { document.querySelectorAll('.modal-tlo').forEach(m => m.classList.add('hidden')); }

function customAlert(title, message) {
    return new Promise((resolve) => {
        document.getElementById('alert-title').innerText = title;
        document.getElementById('alert-message').innerText = message;
        document.getElementById('modal-alert').classList.remove('hidden');
        document.getElementById('btn-alert-ok').onclick = () => { closeModals(); resolve(); };
    });
}

function showConfirm(title, message, isDanger = false) {
    return new Promise((resolve) => {
        document.getElementById('confirm-title').innerText = title;
        document.getElementById('confirm-message').innerText = message;
        let btnOk = document.getElementById('btn-confirm-ok');
        if(isDanger) { btnOk.classList.replace('bg-akcent', 'bg-rose-500'); btnOk.style.backgroundColor = '#ef4444'; } 
        else { btnOk.style.backgroundColor = 'var(--akcent)'; }
        
        document.getElementById('modal-confirm').classList.remove('hidden');
        btnOk.onclick = () => { closeModals(); resolve(true); };
        document.getElementById('btn-confirm-cancel').onclick = () => { closeModals(); resolve(false); };
    });
}

function showSeriesChoice(title, message) {
    return new Promise((resolve) => {
        document.getElementById('series-title').innerText = title;
        document.getElementById('series-message').innerText = message;
        document.getElementById('modal-series').classList.remove('hidden');
        
        document.getElementById('btn-series-single').onclick = () => { closeModals(); resolve('single'); };
        document.getElementById('btn-series-future').onclick = () => { closeModals(); resolve('future'); };
        document.getElementById('btn-series-cancel').onclick = () => { closeModals(); resolve(null); };
    });
}

// --- ZARZĄDZANIE WIDOKAMI I USTAWIENIAMI ---
function switchTab(tabId) {
    document.querySelectorAll('main > div').forEach(el => {
        el.classList.add('hidden');
        el.classList.remove('translate-y-0', 'opacity-100');
        el.classList.add('translate-y-4', 'opacity-0');
    });
    document.querySelectorAll('.nav-tab').forEach(el => el.classList.remove('aktywny'));
    
    let tabBtn = document.getElementById('tab-' + tabId);
    if(tabBtn) tabBtn.classList.add('aktywny');
    
    const targetView = document.getElementById('view-' + tabId);
    if(targetView) {
        targetView.classList.remove('hidden');
        setTimeout(() => { targetView.classList.remove('translate-y-4', 'opacity-0'); targetView.classList.add('translate-y-0', 'opacity-100'); }, 10);
    }
    
    if(tabId === 'pulpit') renderDashboard();
    if(tabId === 'kalendarz') renderCalendar();
    if(tabId === 'zarobki') renderZarobki();
    if(tabId === 'ustawienia') loadSettingsUI();
}

function applyVisualSettings() {
    if(settings.theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    
    document.documentElement.style.setProperty('--akcent', settings.accent || '#4f46e5');
    
    const metaThemeColor = document.getElementById('meta-theme-color');
    if (metaThemeColor) metaThemeColor.setAttribute('content', settings.accent || '#4f46e5');

    // Aktualizacja wzoru tła
    document.body.classList.remove('bg-pattern-grid', 'bg-pattern-dots', 'bg-pattern-clean');
    document.body.classList.add(`bg-pattern-${settings.bgPattern || 'grid'}`);

    document.querySelectorAll('.kolor-kolo').forEach(el => el.classList.remove('aktywny'));
    let activeCircle = document.querySelector(`.kolor-kolo[onclick="ustawAkcent('${settings.accent}')"]`);
    if(activeCircle) activeCircle.classList.add('aktywny');
}

// --- NOWY PANEL USTAWIEŃ (Zakładki) ---
function switchSettingsTab(tabId) {
    // Ukryj wszystkie panele ustawień
    document.querySelectorAll('.set-content').forEach(el => el.classList.add('hidden'));
    
    // Zresetuj wygląd przycisków w menu ustawień
    document.querySelectorAll('.set-tab').forEach(el => {
        el.classList.remove('bg-white', 'dark:bg-slate-700', 'shadow-sm', 'text-black', 'dark:text-white');
        el.classList.add('text-slate-500', 'hover:bg-slate-200', 'dark:hover:bg-slate-600');
    });

    // Pokaż wybrany
    document.getElementById('set-content-' + tabId).classList.remove('hidden');
    let btn = document.getElementById('set-tab-' + tabId);
    btn.classList.remove('text-slate-500', 'hover:bg-slate-200', 'dark:hover:bg-slate-600');
    btn.classList.add('bg-white', 'dark:bg-slate-700', 'shadow-sm', 'text-black', 'dark:text-white');
    
    if (tabId === 'kalendarz') renderAvailabilitySettings();
}

function loadSettingsUI() {
    if(!settings) return;
    document.getElementById('ust-start').value = settings.startHour;
    document.getElementById('ust-end').value = settings.endHour;
    document.getElementById('ust-czas').value = settings.duration;
    
    document.getElementById('ust-bg-pattern').value = settings.bgPattern || 'grid';
    document.getElementById('ust-default-view').value = settings.defaultView || 'grid';
    document.getElementById('ust-buffer').value = settings.timeBuffer || 0;
    document.getElementById('ust-hide-weekends').checked = settings.hideWeekends || false;
    document.getElementById('ust-default-price').value = settings.defaultPrice || '';
    document.getElementById('ust-sms-reminder').value = settings.smsReminder || 'Cześć! Przypominam o naszej lekcji: [DATA] o [CZAS].';
    document.getElementById('ust-sms-payment').value = settings.smsPayment || 'Cześć, przypominam o zbliżającym się terminie zapłaty. Kwota do przelewu: [KWOTA] zł. Dzięki!';
    
    switchSettingsTab('wyglad'); // Domyślna zakładka po otwarciu ustawień
}

function ustawMotyw(theme) { settings.theme = theme; applyVisualSettings(); saveSettingsToCloud(); }
function ustawAkcent(color) { settings.accent = color; applyVisualSettings(); saveSettingsToCloud(); }

function zapiszOpcje() {
    settings.startHour = parseInt(document.getElementById('ust-start').value) || 7;
    settings.endHour = parseInt(document.getElementById('ust-end').value) || 22;
    settings.duration = parseInt(document.getElementById('ust-czas').value) || 60;
    
    settings.bgPattern = document.getElementById('ust-bg-pattern').value;
    settings.defaultView = document.getElementById('ust-default-view').value;
    settings.timeBuffer = parseInt(document.getElementById('ust-buffer').value) || 0;
    settings.hideWeekends = document.getElementById('ust-hide-weekends').checked;
    settings.defaultPrice = document.getElementById('ust-default-price').value;
    settings.smsReminder = document.getElementById('ust-sms-reminder').value;
    settings.smsPayment = document.getElementById('ust-sms-payment').value;

    applyVisualSettings();
    saveSettingsToCloud();
    showToast('Zapisano ustawienia!');
}

async function wipeDatabase() {
    let confirm1 = await showConfirm('Strefa Zagrożenia', 'Czy na pewno chcesz WYZEROWAĆ całą bazę? Usuniesz wszystkich uczniów, przedmioty i kalendarz.', true);
    if (!confirm1) return;
    
    let confirm2 = await showConfirm('Ostatnie ostrzeżenie', 'Ta operacja jest NIEODWRACALNA. Jeśli nie masz pobranej kopii, stracisz dane na zawsze. Kontynuować?', true);
    if (!confirm2) return;

    subjects = []; students = []; lessons = [];
    saveSubjectsToCloud(); saveStudentsToCloud(); saveLessonsToCloud();
    showToast('Baza danych została wyzerowana.', 'success');
    setTimeout(() => window.location.reload(), 1500);
}

// GENERATOR SMS
window.copySms = function(type, studentName, dateStr, timeStr, amount) {
    let template = type === 'reminder' ? settings.smsReminder : settings.smsPayment;
    let finalMsg = template
        .replace(/\[IMIE\]/g, studentName || '')
        .replace(/\[DATA\]/g, dateStr || '')
        .replace(/\[CZAS\]/g, timeStr || '')
        .replace(/\[KWOTA\]/g, amount || '');
        
    navigator.clipboard.writeText(finalMsg).then(() => {
        showToast('Skopiowano treść SMSa!');
    }).catch(err => {
        console.error('Błąd kopiowania: ', err);
        showToast('Nie udało się skopiować', 'error');
    });
};

function initDefaultAvailability() {
    if(!settings.availability) {
        settings.availability = {};
        for(let i=0; i<7; i++) settings.availability[i] = { active: false, start: '15:00', end: '19:00' };
    }
}

function renderAvailabilitySettings() {
    initDefaultAvailability();
    const container = document.getElementById('availability-container');
    if(!container) return;
    container.innerHTML = '';
    const days = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];
    
    for(let i=1; i<=7; i++) {
        let dayId = i % 7; 
        let avail = settings.availability[dayId];
        let isChecked = avail.active ? 'checked' : '';
        let opacity = avail.active ? 'opacity-100' : 'opacity-50 grayscale';
        
        container.innerHTML += `
            <div class="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border-2 transition ${opacity}" style="background-color: var(--karta-bg); border-color: var(--szary-ramka)">
                <label class="flex items-center gap-3 font-bold cursor-pointer mb-2 sm:mb-0 text-sm md:text-base">
                    <input type="checkbox" onchange="toggleDay(${dayId}, this.checked)" class="w-5 h-5 rounded" style="accent-color: var(--akcent)" ${isChecked}>
                    ${days[dayId]}
                </label>
                <div class="flex items-center gap-2">
                    <input type="time" value="${avail.start}" onchange="updateDayTime(${dayId}, 'start', this.value)" class="pole-tekstowe mb-0 py-1.5 text-sm w-auto" ${avail.active ? '' : 'disabled'}>
                    <span class="font-bold" style="color: var(--tekst-szary)">-</span>
                    <input type="time" value="${avail.end}" onchange="updateDayTime(${dayId}, 'end', this.value)" class="pole-tekstowe mb-0 py-1.5 text-sm w-auto" ${avail.active ? '' : 'disabled'}>
                </div>
            </div>
        `;
    }
}

function toggleDay(dayId, isChecked) {
    settings.availability[dayId].active = isChecked;
    saveSettingsToCloud(); renderAvailabilitySettings();
    showToast('Zaktualizowano grafik');
}

function updateDayTime(dayId, type, value) {
    if(value) { settings.availability[dayId][type] = value; saveSettingsToCloud(); }
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
