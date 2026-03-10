// --- KONFIGURACJA FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyBAEop-rCgSrVWKlcf02OTM_vPSxtNFl38",
    authDomain: "lekcyjnik-90745.firebaseapp.com",
    projectId: "lekcyjnik-90745",
    storageBucket: "lekcyjnik-90745.firebasestorage.app",
    messagingSenderId: "2022297919",
    appId: "1:2022297919:web:d00a5f529aa640ead0838a"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// PRAWIDZIWY TRYB OFFLINE (PUNKT 2)
db.enablePersistence().catch(function(err) {
    if (err.code == 'failed-precondition') {
        console.warn('Masz otwartych kilka kart TutoGrid. Tryb offline działa tylko w jednej karcie na raz.');
    } else if (err.code == 'unimplemented') {
        console.warn('Twoja przeglądarka nie w pełni wspiera zapis offline.');
    }
});

// --- ZMIENNE GLOBALNE ---
let currentUser = null; 
let subjects = [];
let students = [];
let lessons = [];

let settings = {
    theme: 'light',
    accent: '#4f46e5',
    startHour: 7,
    endHour: 22,
    duration: 60,
    availability: null 
};

let currentDate = new Date();
let slotDate = new Date(); 
let datePicker; 
let timeStartPicker;
let timeEndPicker;
let jumpPicker; 
let paymentDatePicker; 
let chartInstances = {}; 
let currentStudentBundles = []; 
let currentCalendarView = 'grid'; 

Chart.defaults.font.family = "'Inter', 'sans-serif'";
Chart.defaults.color = '#64748b';

// --- SYSTEM BEZPIECZEŃSTWA XSS (PUNKT 1) ---
function esc(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// --- OPTYMALIZACJA WYSZUKIWARKI (DEBOUNCE) ---
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}
const debouncedRenderStudents = debounce(renderStudents, 150);

// --- CUSTOMOWE OKIENKA ---
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

// --- INICJALIZACJA PLUGinÓW ---
document.addEventListener("DOMContentLoaded", () => {
    datePicker = flatpickr("#lesson-date", { 
        locale: "pl", dateFormat: "Y-m-d", altInput: true, altFormat: "d/m/Y", allowInput: true,
        onChange: handleBundleChange 
    });
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
});

function openJumpPicker() { if(jumpPicker) jumpPicker.open(); }

function closeModals() {
    document.getElementById('modal-student').classList.add('hidden');
    document.getElementById('modal-lesson').classList.add('hidden');
    document.getElementById('modal-subject').classList.add('hidden');
    document.getElementById('modal-find-slot').classList.add('hidden');
}

// --- FUNKCJE POMOCNICZE ---
function hexToRgba(hex, alpha) {
    if(!hex) return `rgba(120, 120, 120, ${alpha})`;
    let r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getMonday(d) {
    d = new Date(d);
    let day = d.getDay(), diff = d.getDate() - day + (day === 0 ? -6 : 1); 
    return new Date(d.setDate(diff));
}

function getWeekString(dateObj) {
    let d = new Date(dateObj);
    d.setHours(0,0,0,0);
    d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
    let week1 = new Date(d.getFullYear(), 0, 4);
    let weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
    return d.getFullYear() + '-W' + weekNum.toString().padStart(2, '0');
}

function switchTab(tabName) {
    ['skeleton', 'pulpit', 'kalendarz', 'uczniowie', 'przedmioty', 'zarobki', 'ustawienia'].forEach(id => {
        let el = document.getElementById(`view-${id}`);
        if(el) el.classList.add('hidden');
    });
    document.querySelectorAll('.nav-tab').forEach(btn => btn.classList.remove('aktywna'));

    let viewEl = document.getElementById(`view-${tabName}`);
    if(viewEl) viewEl.classList.remove('hidden');
    
    let tabEl = document.getElementById(`tab-${tabName}`);
    if(tabEl) tabEl.classList.add('aktywna');

    if(tabName === 'pulpit') renderDashboard();
    if(tabName === 'kalendarz') renderCalendar();
    if(tabName === 'uczniowie') renderStudents();
    if(tabName === 'przedmioty') renderSubjects();
    if(tabName === 'zarobki') {
        const now = new Date();
        document.getElementById('earnings-month-picker').value = `${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2, '0')}`;
        document.getElementById('earnings-week-picker').value = getWeekString(now); 
        renderZarobki();
    }
}

// --- LOGOWANIE I MĄDRY ZAPIS DO CHMURY ---
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        document.getElementById('view-login').classList.add('hidden');
        document.getElementById('app-nav').classList.remove('hidden');
        document.getElementById('main-content').classList.remove('hidden');
        
        switchTab('skeleton'); 
        pobierzDaneZChmury(); 
    } else {
        currentUser = null;
        document.getElementById('view-login').classList.remove('hidden');
        document.getElementById('app-nav').classList.add('hidden');
        document.getElementById('main-content').classList.add('hidden');
    }
});

async function zalogujPrzezGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    try { await firebase.auth().signInWithPopup(provider); } 
    catch (e) { await customAlert("Błąd logowania", e.message); }
}

function wyloguj() { firebase.auth().signOut(); }

function pobierzDaneZChmury() {
    db.collection("planer_korepetytora").doc(currentUser.uid).get().then((doc) => {
        if (doc.exists) {
            let data = doc.data();
            subjects = data.subjects || []; students = data.students || []; lessons = data.lessons || [];
            if(data.settings) settings = data.settings;
        } else {
            subjects = []; students = []; lessons = [];
        }
        applyVisualSettings();
        switchTab('pulpit');
    }).catch((error) => {
        console.error("Błąd połączenia z bazą:", error);
        switchTab('pulpit'); 
    });
}

function saveSubjectsToCloud() {
    if(!currentUser) return; 
    db.collection("planer_korepetytora").doc(currentUser.uid).set({ subjects: subjects }, { merge: true });
}

function saveStudentsToCloud() {
    if(!currentUser) return; 
    db.collection("planer_korepetytora").doc(currentUser.uid).set({ students: students }, { merge: true });
}

function saveLessonsToCloud() {
    if(!currentUser) return; 
    db.collection("planer_korepetytora").doc(currentUser.uid).set({ lessons: lessons }, { merge: true });
}

function saveSettingsToCloud() {
    if(!currentUser) return; 
    db.collection("planer_korepetytora").doc(currentUser.uid).set({ settings: settings }, { merge: true });
}

function eksportujDane() {
    const backupData = { subjects, students, lessons, settings };
    const dataStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([dataStr], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `TutoGrid_Kopia_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
}

async function importujDane(event) {
    const file = event.target.files[0];
    if (!file) return;

    const potwierdzenie = await showConfirm('Wgrywanie bazy danych', 'Uwaga! Ta operacja bezpowrotnie zastąpi Twoje obecne dane w chmurze plikiem z dysku. Chcesz kontynuować?', true);
    if (!potwierdzenie) { event.target.value = ''; return; }

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if(data.subjects && data.students && data.lessons) {
                subjects = data.subjects; students = data.students; lessons = data.lessons;
                if(data.settings) settings = data.settings;
                
                saveSubjectsToCloud(); saveStudentsToCloud(); saveLessonsToCloud(); saveSettingsToCloud();
                
                applyVisualSettings(); switchTab('pulpit');
                await customAlert('Sukces', 'Baza danych została poprawnie wgrana!');
            } else { await customAlert('Błąd pliku', 'Ten plik jest uszkodzony.'); }
        } catch (error) { await customAlert('Błąd', 'Nie udało się poprawnie odczytać pliku.'); }
        event.target.value = '';
    };
    reader.readAsText(file);
}

// --- USTAWIENIA ---
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
            <div class="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border-2 transition gap-2 sm:gap-0" style="border-color: var(--szary-ramka); background-color: var(--jasny); opacity: ${opacity}">
                <label class="flex items-center gap-3 font-bold w-full sm:w-1/3 cursor-pointer text-sm md:text-base">
                    <input type="checkbox" class="w-5 h-5 rounded cursor-pointer" style="accent-color: var(--akcent)" 
                           onchange="toggleDay(${day.id}, this.checked)" ${av.active ? 'checked' : ''}>
                    ${esc(day.name)}
                </label>
                <div class="flex items-center gap-2 w-full sm:w-2/3 sm:justify-end">
                    <input type="text" class="flatpickr-avail p-1.5 border-2 rounded-lg text-sm font-bold w-full sm:w-24 text-center cursor-pointer" style="border-color: var(--szary-ramka); background-color: var(--karta-bg); color: var(--tekst-glowny)" 
                           data-day="${day.id}" data-type="start" value="${av.start}" ${!av.active ? 'disabled' : ''}>
                    <span class="font-bold text-xs hidden sm:block" style="color: var(--tekst-szary)">-</span>
                    <input type="text" class="flatpickr-avail p-1.5 border-2 rounded-lg text-sm font-bold w-full sm:w-24 text-center cursor-pointer" style="border-color: var(--szary-ramka); background-color: var(--karta-bg); color: var(--tekst-glowny)" 
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
}

// --- PRZEDMIOTY ---
function renderSubjects() {
    const list = document.getElementById('subjects-list');
    list.innerHTML = '';
    if(subjects.length === 0) return list.innerHTML = '<p style="color: var(--tekst-szary)">Brak przedmiotów. Dodaj pierwszy!</p>';
    
    subjects.forEach(sub => {
        let hasLinks = sub.links && sub.links.trim() !== '' ? '<span class="text-sm px-2 rounded bg-slate-100 text-slate-500 shadow-sm border border-slate-200" title="Materiały podpięte">🔗 Linki</span>' : '';
        list.innerHTML += `
            <div class="karta flex justify-between items-center cursor-pointer hover:-translate-y-1 transition" onclick="editSubject('${sub.id}')">
                <div class="flex items-center gap-3">
                    <div class="w-6 h-6 rounded-md border-2" style="background-color: ${esc(sub.color)}; border-color: var(--ciemny)"></div>
                    <div class="flex flex-col">
                        <h4 class="font-bold text-lg">${esc(sub.name)}</h4>
                        <div class="mt-1">${hasLinks}</div>
                    </div>
                </div>
            </div>`;
    });
}

function openSubjectModal() {
    document.getElementById('subject-id').value = '';
    document.getElementById('subject-name').value = '';
    document.getElementById('subject-color').value = '#ef4444';
    document.getElementById('subject-links').value = ''; 
    document.getElementById('btn-delete-subject').classList.add('hidden');
    document.getElementById('modal-subject').classList.remove('hidden');
}

function editSubject(id) {
    const sub = subjects.find(s => s.id == id);
    if(!sub) return;
    document.getElementById('subject-id').value = sub.id;
    document.getElementById('subject-name').value = sub.name;
    document.getElementById('subject-color').value = sub.color;
    document.getElementById('subject-links').value = sub.links || ''; 
    document.getElementById('btn-delete-subject').classList.remove('hidden');
    document.getElementById('modal-subject').classList.remove('hidden');
}

async function saveSubject() {
    const id = document.getElementById('subject-id').value;
    const name = document.getElementById('subject-name').value;
    const color = document.getElementById('subject-color').value;
    const links = document.getElementById('subject-links').value; 

    if(!name) return await customAlert('Błąd', 'Wpisz nazwę przedmiotu!');
    if(id) { 
        let sub = subjects.find(s => s.id == id); 
        sub.name = name; sub.color = color; sub.links = links;
    } else { 
        subjects.push({ id: Date.now().toString(), name, color, links }); 
    }
    saveSubjectsToCloud(); closeModals(); renderSubjects();
}

async function deleteSubject() {
    const id = document.getElementById('subject-id').value;
    if(await showConfirm('Usuwanie', 'Czy na pewno usunąć ten przedmiot?', true)) {
        subjects = subjects.filter(s => s.id != id); saveSubjectsToCloud(); closeModals(); renderSubjects();
    }
}

// --- UCZNIOWIE I PAKIETY ---
function toggleBundleType(radioElem) {
    const row = radioElem.closest('.bundle-row');
    const weeklyDiv = row.querySelector('.bundle-payday-weekly');
    const monthlyDiv = row.querySelector('.bundle-payday-monthly');
    if(radioElem.value === 'monthly') {
        weeklyDiv.classList.add('hidden');
        monthlyDiv.classList.remove('hidden');
    } else {
        weeklyDiv.classList.remove('hidden');
        monthlyDiv.classList.add('hidden');
    }
}

function renderStudentBundles() {
    const container = document.getElementById('student-bundles-container');
    container.innerHTML = '';
    currentStudentBundles.forEach((b, index) => {
        let isMonthly = b.type === 'monthly';
        // POPRAWA NA TELEFONY: flex-col, w-full, wyrzucenie wymuszonego flex-row
        container.innerHTML += `
            <div class="flex flex-col gap-3 items-start p-3 md:p-4 rounded-xl border-2 bg-white border-slate-200 bundle-row shadow-sm w-full box-border" data-id="${b.id}">
                <div class="flex flex-col w-full gap-2">
                    <input type="text" placeholder="Nazwa pakietu (np. Matma + Fizyka)" value="${esc(b.name || '')}" class="bundle-name w-full text-sm p-2 border-2 rounded-lg font-bold outline-none focus:border-akcent transition">
                    <div class="flex gap-2 w-full">
                        <input type="number" placeholder="Cena (zł)" value="${b.total || ''}" class="bundle-total w-1/2 text-sm p-2 border-2 rounded-lg font-bold text-akcent outline-none focus:border-akcent transition">
                        <input type="number" step="0.5" placeholder="Godz. (np. 2.5)" value="${b.hours || ''}" class="bundle-hours w-1/2 text-sm p-2 border-2 rounded-lg font-bold outline-none focus:border-akcent transition">
                    </div>
                </div>
                
                <div class="w-full bg-slate-50 p-3 rounded-lg border border-slate-200 box-border">
                    <div class="font-bold text-[10px] md:text-xs text-slate-500 mb-2 uppercase tracking-wider">Częstotliwość rozliczania:</div>
                    
                    <div class="flex flex-wrap gap-4 mb-3">
                        <label class="flex items-center gap-2 cursor-pointer font-bold text-xs md:text-sm">
                            <input type="radio" name="b_type_${index}" value="weekly" class="bundle-type w-4 h-4" style="accent-color: var(--akcent)" onchange="toggleBundleType(this)" ${!isMonthly ? 'checked' : ''}>
                            Co tydzień
                        </label>
                        <label class="flex items-center gap-2 cursor-pointer font-bold text-xs md:text-sm">
                            <input type="radio" name="b_type_${index}" value="monthly" class="bundle-type w-4 h-4" style="accent-color: var(--akcent)" onchange="toggleBundleType(this)" ${isMonthly ? 'checked' : ''}>
                            Co miesiąc
                        </label>
                    </div>
                    
                    <div class="bundle-payday-weekly flex flex-col gap-1 w-full ${isMonthly ? 'hidden' : ''}">
                        <span class="text-[10px] md:text-xs font-bold text-slate-600">Dzień wpłaty:</span>
                        <select class="bundle-payday-weekly-select w-full text-xs md:text-sm p-2 border-2 rounded-lg font-bold outline-none cursor-pointer bg-white focus:border-akcent transition max-w-full text-ellipsis overflow-hidden">
                            <option value="" ${b.payDay==='' ? 'selected' : ''}>Wybieram ręcznie w kalendarzu</option>
                            <option value="1" ${b.payDay==='1' ? 'selected' : ''}>Zawsze w Poniedziałek</option>
                            <option value="2" ${b.payDay==='2' ? 'selected' : ''}>Zawsze we Wtorek</option>
                            <option value="3" ${b.payDay==='3' ? 'selected' : ''}>Zawsze w Środę</option>
                            <option value="4" ${b.payDay==='4' ? 'selected' : ''}>Zawsze w Czwartek</option>
                            <option value="5" ${b.payDay==='5' ? 'selected' : ''}>Zawsze w Piątek</option>
                            <option value="6" ${b.payDay==='6' ? 'selected' : ''}>Zawsze w Sobotę</option>
                            <option value="0" ${b.payDay==='0' ? 'selected' : ''}>Zawsze w Niedzielę</option>
                        </select>
                    </div>

                    <div class="bundle-payday-monthly flex flex-col gap-1 w-full ${!isMonthly ? 'hidden' : ''}">
                        <span class="text-[10px] md:text-xs font-bold text-slate-600">Wpłata zawsze do:</span>
                        <div class="flex items-center gap-2 w-full">
                            <input type="number" min="1" max="31" placeholder="np. 10" value="${isMonthly ? (esc(b.payDay)||'') : ''}" class="bundle-payday-monthly-input flex-1 text-sm p-2 border-2 rounded-lg font-bold text-center outline-none bg-white focus:border-akcent transition w-full">
                            <span class="text-[10px] md:text-xs font-bold text-slate-500 whitespace-nowrap">dnia miesiąca</span>
                        </div>
                    </div>
                </div>

                <button type="button" onclick="this.closest('.bundle-row').remove()" class="text-rose-500 font-extrabold w-full text-center py-2 bg-rose-50 rounded-lg border border-rose-100 hover:bg-rose-100 transition text-[10px] md:text-xs uppercase tracking-wider mt-1">Usuń ten pakiet</button>
            </div>`;
    });
}

function addBundleToStudent() {
    currentStudentBundles.push({ id: 'b_' + Date.now(), name: '', total: '', hours: '', type: 'weekly', payDay: '' });
    renderStudentBundles();
}

function renderStudents() {
    const list = document.getElementById('students-list');
    const archivedList = document.getElementById('archived-students-list');
    const archivedSection = document.getElementById('archived-students-section');
    
    list.innerHTML = ''; archivedList.innerHTML = '';
    const searchInput = document.getElementById('student-search');
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    
    let activeStudents = students.filter(s => !s.archived && s.name.toLowerCase().includes(searchTerm));
    let archivedStudents = students.filter(s => s.archived && s.name.toLowerCase().includes(searchTerm));

    if(activeStudents.length === 0) {
        list.innerHTML = '<p style="color: var(--tekst-szary)">Brak aktywnych uczniów.</p>';
    } else {
        activeStudents.forEach(student => {
            let studentSubjectsHtml = '';
            if(student.subjectIds && student.subjectIds.length > 0) {
                student.subjectIds.forEach(subId => {
                    let sub = subjects.find(s => s.id == subId);
                    if(sub) studentSubjectsHtml += `<span class="text-[10px] md:text-xs font-bold px-2 py-1 rounded-md text-white border" style="background-color: ${esc(sub.color)}; border-color: var(--ciemny)">${esc(sub.name).toUpperCase()}</span> `;
                });
            } else { studentSubjectsHtml = `<span class="text-xs font-medium" style="color: var(--tekst-szary)">Brak przypisanych przedmiotów</span>`; }
            
            let bundlesHtml = '';
            if(student.bundles && student.bundles.length > 0) {
                bundlesHtml = `<div class="mt-2 text-[10px] md:text-xs font-bold text-slate-500">PAKIETY: ${student.bundles.map(b => esc(b.name)).join(', ')}</div>`;
            }

            list.innerHTML += `
                <div class="karta flex flex-col sm:flex-row justify-between items-start gap-4 sm:gap-0">
                    <div class="space-y-2">
                        <h4 class="font-extrabold text-lg md:text-xl">${esc(student.name)}</h4>
                        <div class="flex flex-wrap gap-1">${studentSubjectsHtml}</div>
                        ${bundlesHtml}
                    </div>
                    <div class="flex flex-wrap sm:flex-col gap-3 sm:gap-2 w-full sm:w-auto text-center sm:text-right">
                        <button onclick="editStudent('${student.id}')" class="text-sm font-bold hover:underline flex-1 sm:flex-none" style="color: var(--akcent)">Edytuj</button>
                        <button onclick="toggleArchiveStudent('${student.id}')" class="text-sm font-bold hover:underline flex-1 sm:flex-none" style="color: var(--tekst-szary)">Zarchiwizuj</button>
                        <button onclick="deleteStudent('${student.id}')" class="text-sm font-bold text-rose-500 hover:underline flex-1 sm:flex-none">Usuń</button>
                    </div>
                </div>`;
        });
    }

    if(archivedStudents.length > 0) {
        archivedSection.classList.remove('hidden');
        archivedStudents.forEach(student => {
            archivedList.innerHTML += `
                <div class="karta flex flex-col sm:flex-row justify-between items-start gap-4 sm:gap-0" style="background-color: var(--jasny)">
                    <div class="space-y-1">
                        <h4 class="font-extrabold text-lg md:text-xl" style="color: var(--tekst-szary)">${esc(student.name)}</h4>
                        <span class="text-xs font-bold px-2 py-1 rounded-md text-white border bg-slate-400 border-slate-500">ARCHIWUM</span>
                    </div>
                    <div class="flex flex-wrap sm:flex-col gap-3 sm:gap-2 w-full sm:w-auto text-center sm:text-right">
                        <button onclick="toggleArchiveStudent('${student.id}')" class="text-sm font-bold hover:underline flex-1 sm:flex-none" style="color: var(--akcent)">Przywróć</button>
                        <button onclick="deleteStudent('${student.id}')" class="text-sm font-bold text-rose-500 hover:underline flex-1 sm:flex-none">Usuń na zawsze</button>
                    </div>
                </div>`;
        });
    } else { archivedSection.classList.add('hidden'); }
}

async function toggleArchiveStudent(id) {
    let student = students.find(s => s.id == id);
    if(student) {
        let action = student.archived ? "przywrócić ucznia do aktywnych" : "przenieść ucznia do archiwum";
        if(await showConfirm('Archiwum', `Czy na pewno chcesz ${action}? Jego lekcje w historii pozostaną nienaruszone.`)) {
            student.archived = !student.archived; saveStudentsToCloud(); renderStudents(); renderDashboard(); 
        }
    }
}

function openStudentModal() {
    document.getElementById('student-name').value = '';
    const container = document.getElementById('student-subjects-container');
    container.innerHTML = '';
    if(subjects.length === 0) container.innerHTML = '<p class="text-sm text-rose-500 font-bold">Najpierw dodaj przedmioty w zakładce "Przedmioty"!</p>';
    else subjects.forEach(sub => {
        container.innerHTML += `
            <label class="flex items-center gap-3 p-2 hover:bg-slate-500/10 rounded-lg cursor-pointer transition">
                <input type="checkbox" value="${sub.id}" class="student-subject-cb w-5 h-5 rounded" style="accent-color: var(--akcent)">
                <span class="font-bold flex items-center gap-2"><div class="w-3 h-3 rounded-full" style="background-color:${esc(sub.color)}"></div> ${esc(sub.name)}</span>
            </label>`;
    });
    
    currentStudentBundles = [];
    renderStudentBundles();
    
    document.getElementById('modal-student').setAttribute('data-editing-id', '');
    document.getElementById('modal-student').classList.remove('hidden');
}

function editStudent(id) {
    const student = students.find(s => s.id == id);
    if(!student) return;
    document.getElementById('student-name').value = student.name;
    const container = document.getElementById('student-subjects-container');
    container.innerHTML = '';
    subjects.forEach(sub => {
        let isChecked = (student.subjectIds || []).includes(sub.id) ? 'checked' : '';
        container.innerHTML += `
            <label class="flex items-center gap-3 p-2 hover:bg-slate-500/10 rounded-lg cursor-pointer transition">
                <input type="checkbox" value="${sub.id}" class="student-subject-cb w-5 h-5 rounded" style="accent-color: var(--akcent)" ${isChecked}>
                <span class="font-bold flex items-center gap-2"><div class="w-3 h-3 rounded-full" style="background-color:${esc(sub.color)}"></div> ${esc(sub.name)}</span>
            </label>`;
    });
    
    currentStudentBundles = student.bundles ? JSON.parse(JSON.stringify(student.bundles)) : [];
    renderStudentBundles();

    document.getElementById('modal-student').setAttribute('data-editing-id', id);
    document.getElementById('modal-student').classList.remove('hidden');
}

async function saveStudent() {
    const name = document.getElementById('student-name').value;
    const editingId = document.getElementById('modal-student').getAttribute('data-editing-id');
    if(!name) return await customAlert('Błąd', 'Wpisz imię ucznia!');
    let selectedSubjects = [];
    document.querySelectorAll('.student-subject-cb:checked').forEach(cb => selectedSubjects.push(cb.value));
    
    let finalBundles = [];
    document.querySelectorAll('.bundle-row').forEach(row => {
        let bName = row.querySelector('.bundle-name').value;
        let bTotal = parseFloat(row.querySelector('.bundle-total').value);
        let bHours = parseFloat(row.querySelector('.bundle-hours').value);
        
        let radioElem = row.querySelector('input[type="radio"].bundle-type:checked');
        let bType = radioElem ? radioElem.value : 'weekly';
        let bPayDay = '';
        
        if(bType === 'monthly') {
            bPayDay = row.querySelector('.bundle-payday-monthly-input').value;
        } else {
            bPayDay = row.querySelector('.bundle-payday-weekly-select').value;
        }

        if(bName && bTotal && bHours) {
            finalBundles.push({ id: row.getAttribute('data-id'), name: bName, total: bTotal, hours: bHours, type: bType, payDay: bPayDay });
        }
    });

    if(editingId) {
        let student = students.find(s => s.id == editingId);
        student.name = name; student.subjectIds = selectedSubjects; student.bundles = finalBundles;
    } else {
        students.push({ id: Date.now().toString(), name, subjectIds: selectedSubjects, archived: false, bundles: finalBundles });
    }
    saveStudentsToCloud(); closeModals(); renderStudents();
}

async function deleteStudent(id) {
    if(await showConfirm('Usuwanie Ucznia', 'Na pewno usunąć ucznia i wszystkie jego zaplanowane lekcje? Zamiast tego możesz go po prostu zarchiwizować!', true)) {
        students = students.filter(s => s.id != id);
        lessons = lessons.filter(l => l.studentId != id);
        saveStudentsToCloud(); saveLessonsToCloud(); renderStudents(); renderDashboard();
    }
}

// --- LOGIKA FORMULARZA LEKCJI ---
function updateLessonSubjectDropdown() {
    const stId = document.getElementById('lesson-student').value;
    const student = students.find(s => s.id == stId);
    const subjectSelect = document.getElementById('lesson-subject');
    subjectSelect.innerHTML = '';
    if(!student || !student.subjectIds || student.subjectIds.length === 0) {
        subjects.forEach(sub => subjectSelect.innerHTML += `<option value="${sub.id}">${esc(sub.name)}</option>`);
    } else {
        student.subjectIds.forEach(subId => {
            let sub = subjects.find(s => s.id == subId);
            if(sub) subjectSelect.innerHTML += `<option value="${sub.id}">${esc(sub.name)}</option>`;
        });
    }
}

function updateLessonBundleDropdown() {
    const stId = document.getElementById('lesson-student').value;
    const student = students.find(s => s.id == stId);
    const bundleSelect = document.getElementById('lesson-bundle');
    bundleSelect.innerHTML = '<option value="">Standardowa cena (wpisz ręcznie)</option>';
    
    if(student && student.bundles && student.bundles.length > 0) {
        student.bundles.forEach(b => {
            let bTypeText = b.type === 'monthly' ? 'Miesięczny' : 'Tygodniowy';
            bundleSelect.innerHTML += `<option value="${b.id}">Pakiet [${bTypeText}]: ${esc(b.name)} (${b.total} zł / ${b.hours}h)</option>`;
        });
    }
    handleBundleChange();
}

function handleBundleChange() {
    const bundleId = document.getElementById('lesson-bundle').value;
    const priceInput = document.getElementById('lesson-price');
    const priceLabel = document.getElementById('lesson-price-label');
    const paymentDateDiv = document.getElementById('lesson-payment-date-div');
    
    if (bundleId) {
        if(priceLabel) priceLabel.innerText = 'Cena poza pakietem (zł)';
        paymentDateDiv.classList.remove('hidden');
        priceInput.readOnly = false; // ZGODNIE Z PROŚBĄ ODBLOKOWANE!
        
        const stId = document.getElementById('lesson-student').value;
        const student = students.find(s => s.id == stId);
        const bundle = student.bundles.find(b => b.id == bundleId);
        
        if (bundle && bundle.payDay !== undefined && bundle.payDay !== "") {
            let lDateStr = document.getElementById('lesson-date').value;
            let lDate = lDateStr ? new Date(lDateStr) : new Date();

            if (bundle.type === 'monthly') {
                let targetDay = parseInt(bundle.payDay);
                if(!isNaN(targetDay)) {
                    let lastDayOfMonth = new Date(lDate.getFullYear(), lDate.getMonth() + 1, 0).getDate();
                    let finalDay = Math.min(targetDay, lastDayOfMonth);
                    let pDate = new Date(lDate.getFullYear(), lDate.getMonth(), finalDay);
                    pDate.setHours(12,0,0,0);
                    paymentDatePicker.setDate(pDate.toISOString().split('T')[0]);
                }
            } else {
                let weekMonday = getMonday(lDate);
                let offset = parseInt(bundle.payDay);
                if (offset === 0) { weekMonday.setDate(weekMonday.getDate() + 6); } 
                else { weekMonday.setDate(weekMonday.getDate() + (offset - 1)); }
                paymentDatePicker.setDate(weekMonday.toISOString().split('T')[0]);
            }
        }
    } else {
        if(priceLabel) priceLabel.innerText = 'Cena za tę lekcję (zł)';
        paymentDateDiv.classList.add('hidden');
        priceInput.readOnly = false;
    }
}

function autoUzupelnijCzas() {
    let start = document.getElementById('lesson-time-start').value;
    if(!start) return;
    let [h, m] = start.split(':').map(Number);
    let date = new Date();
    date.setHours(h, m + settings.duration);
    let endH = date.getHours().toString().padStart(2, '0');
    let endM = date.getMinutes().toString().padStart(2, '0');
    let endStr = `${endH}:${endM}`;
    
    document.getElementById('lesson-time-end').value = endStr;
    if(timeEndPicker) timeEndPicker.setDate(endStr);
    handleBundleChange(); 
}

function openLessonModal() {
    document.getElementById('lesson-modal-title').innerText = 'Zaplanuj lekcję';
    document.getElementById('lesson-id').value = '';
    document.getElementById('lesson-topic').value = ''; 
    
    let defaultDate = new Date().toISOString().split('T')[0];
    if(datePicker) datePicker.setDate(defaultDate);
    if(paymentDatePicker) paymentDatePicker.setDate('');
    
    document.getElementById('lesson-time-start').value = '15:00';
    if(timeStartPicker) timeStartPicker.setDate('15:00');
    autoUzupelnijCzas();

    document.getElementById('lesson-price').value = '';
    document.getElementById('lesson-paid').checked = false;
    document.getElementById('lesson-cancelled').checked = false;
    
    document.getElementById('recurring-box').classList.remove('hidden');
    document.getElementById('cancelled-box').classList.add('hidden'); 
    document.getElementById('btn-delete-lesson').classList.add('hidden');

    const selectStudent = document.getElementById('lesson-student');
    selectStudent.innerHTML = '<option value="">Wybierz ucznia...</option>';
    students.filter(s => !s.archived).forEach(s => { selectStudent.innerHTML += `<option value="${s.id}">${esc(s.name)}</option>`; });

    document.getElementById('lesson-subject').innerHTML = '<option value="">Wybierz ucznia najpierw...</option>';
    document.getElementById('lesson-bundle').innerHTML = '<option value="">Standardowa cena (wpisz ręcznie)</option>';
    document.getElementById('modal-lesson').classList.remove('hidden');
    handleBundleChange();
}

function editLesson(id) {
    const lesson = lessons.find(l => l.id == id);
    if(!lesson) return;
    document.getElementById('lesson-modal-title').innerText = 'Szczegóły lekcji';
    document.getElementById('lesson-id').value = lesson.id;
    document.getElementById('lesson-topic').value = lesson.topic || ''; 
    
    if(datePicker) datePicker.setDate(lesson.date);
    if(paymentDatePicker) paymentDatePicker.setDate(lesson.paymentDate || lesson.date);
    
    document.getElementById('lesson-time-start').value = lesson.startTime;
    document.getElementById('lesson-time-end').value = lesson.endTime;
    if(timeStartPicker) timeStartPicker.setDate(lesson.startTime);
    if(timeEndPicker) timeEndPicker.setDate(lesson.endTime);

    document.getElementById('lesson-price').value = lesson.price || '';
    document.getElementById('lesson-paid').checked = lesson.paid || false;
    document.getElementById('lesson-cancelled').checked = lesson.cancelled || false;

    document.getElementById('recurring-box').classList.add('hidden');
    document.getElementById('cancelled-box').classList.remove('hidden'); 
    document.getElementById('btn-delete-lesson').classList.remove('hidden');

    const selectStudent = document.getElementById('lesson-student');
    selectStudent.innerHTML = '';
    students.forEach(s => { if(!s.archived || s.id == lesson.studentId) selectStudent.innerHTML += `<option value="${s.id}" ${s.id == lesson.studentId ? 'selected' : ''}>${esc(s.name)}</option>`; });

    updateLessonSubjectDropdown();
    if(lesson.subjectId) document.getElementById('lesson-subject').value = lesson.subjectId;
    
    updateLessonBundleDropdown();
    if(lesson.bundleId) document.getElementById('lesson-bundle').value = lesson.bundleId;

    document.getElementById('modal-lesson').classList.remove('hidden');
    handleBundleChange();
}

async function saveLesson() {
    const id = document.getElementById('lesson-id').value;
    const studentId = document.getElementById('lesson-student').value;
    const subjectId = document.getElementById('lesson-subject').value;
    const bundleId = document.getElementById('lesson-bundle').value;
    const topic = document.getElementById('lesson-topic').value; 
    const date = document.getElementById('lesson-date').value;
    const startTime = document.getElementById('lesson-time-start').value;
    const endTime = document.getElementById('lesson-time-end').value;
    const price = document.getElementById('lesson-price').value;
    const paid = document.getElementById('lesson-paid').checked;
    const cancelled = document.getElementById('lesson-cancelled') ? document.getElementById('lesson-cancelled').checked : false;
    const isRecurring = document.getElementById('lesson-recurring') ? document.getElementById('lesson-recurring').checked : false;
    
    const paymentDate = bundleId ? document.getElementById('lesson-payment-date').value : date;

    if(!studentId || !date || !subjectId || !startTime || !endTime) return await customAlert('Błąd', 'Uzupełnij wszystkie wymagane dane (uczeń, przedmiot, data, godziny)!');

    let isConflict = lessons.find(l => {
        if (id && l.id == id) return false; 
        if (l.date !== date) return false;  
        if (l.cancelled) return false;      
        return (startTime < l.endTime && endTime > l.startTime);
    });

    if (isConflict) {
        let conflictStudent = students.find(s => s.id == isConflict.studentId) || {name: 'Ktoś inny'};
        let proceed = await showConfirm('Konflikt godzin!', `Masz już zaplanowaną lekcję w tym czasie:\n${esc(conflictStudent.name)} (${isConflict.startTime} - ${isConflict.endTime})\n\nCzy na pewno chcesz zapisać nakładające się zajęcia?`, true);
        if (!proceed) return;
    }

    let bundleValue = null;
    if (bundleId) {
        const student = students.find(s => s.id == studentId);
        const bundle = student ? (student.bundles || []).find(b => b.id == bundleId) : null;
        if (bundle && bundle.hours > 0) {
            let [sh, sm] = startTime.split(':').map(Number);
            let [eh, em] = endTime.split(':').map(Number);
            let durationHours = ((eh * 60 + em) - (sh * 60 + sm)) / 60;
            bundleValue = (durationHours / bundle.hours) * bundle.total;
        }
    }

    if (id) {
        let originalLesson = lessons.find(l => l.id == id);
        let oldDate = originalLesson.date;
        
        let isStructureChanged = (
            originalLesson.studentId !== studentId ||
            originalLesson.subjectId !== subjectId ||
            originalLesson.date !== date ||
            originalLesson.startTime !== startTime ||
            originalLesson.endTime !== endTime ||
            originalLesson.price != price ||
            originalLesson.bundleId !== bundleId ||
            originalLesson.paymentDate !== paymentDate
        );

        let futureLessons = [];
        if (isStructureChanged) {
            futureLessons = lessons.filter(l => {
                if (l.id == id || l.date < oldDate) return false;
                if (originalLesson.groupId && l.groupId === originalLesson.groupId) return true;
                if (!originalLesson.groupId && l.studentId == originalLesson.studentId && l.subjectId == originalLesson.subjectId) {
                    return new Date(l.date).getDay() === new Date(oldDate).getDay();
                }
                return false;
            });
        }

        if (futureLessons.length > 0) {
            let choice = await showSeriesChoice('Aktualizacja cyklu', 'Zmieniłeś szczegóły lekcji. Co chcesz zaktualizować?');
            if (choice === 'future') {
                let dateDiff = Math.round((new Date(date) - new Date(oldDate)) / (1000 * 60 * 60 * 24));
                futureLessons.forEach(fl => {
                    fl.studentId = studentId; fl.subjectId = subjectId; fl.bundleId = bundleId;
                    fl.startTime = startTime; fl.endTime = endTime; fl.price = price; fl.topic = topic; 
                    fl.bundleValue = bundleValue;
                    
                    if (dateDiff !== 0) {
                        let fd = new Date(fl.date);
                        fd.setDate(fd.getDate() + dateDiff);
                        fl.date = fd.toISOString().split('T')[0];
                        
                        if(bundleId) {
                            const st = students.find(s => s.id == studentId);
                            const bun = st ? st.bundles.find(b => b.id == bundleId) : null;
                            if(bun && bun.payDay !== undefined && bun.payDay !== "") {
                                let flDateObj = new Date(fl.date);
                                if(bun.type === 'monthly') {
                                    let targetDay = parseInt(bun.payDay);
                                    if(!isNaN(targetDay)) {
                                        let lastDayOfMonth = new Date(flDateObj.getFullYear(), flDateObj.getMonth() + 1, 0).getDate();
                                        let finalDay = Math.min(targetDay, lastDayOfMonth);
                                        let pDate = new Date(flDateObj.getFullYear(), flDateObj.getMonth(), finalDay);
                                        pDate.setHours(12,0,0,0);
                                        fl.paymentDate = pDate.toISOString().split('T')[0];
                                    }
                                } else {
                                    let wMon = getMonday(fl.date);
                                    let offset = parseInt(bun.payDay);
                                    if (offset === 0) { wMon.setDate(wMon.getDate() + 6); } 
                                    else { wMon.setDate(wMon.getDate() + (offset - 1)); }
                                    fl.paymentDate = wMon.toISOString().split('T')[0];
                                }
                            } else {
                                let pd = new Date(fl.paymentDate || fl.date);
                                pd.setDate(pd.getDate() + dateDiff);
                                fl.paymentDate = pd.toISOString().split('T')[0];
                            }
                        } else { fl.paymentDate = fl.date; }
                    } else {
                        if(bundleId) {
                            const st = students.find(s => s.id == studentId);
                            const bun = st ? st.bundles.find(b => b.id == bundleId) : null;
                            if(bun && bun.payDay !== undefined && bun.payDay !== "") {
                                let flDateObj = new Date(fl.date);
                                if(bun.type === 'monthly') {
                                    let targetDay = parseInt(bun.payDay);
                                    if(!isNaN(targetDay)) {
                                        let lastDayOfMonth = new Date(flDateObj.getFullYear(), flDateObj.getMonth() + 1, 0).getDate();
                                        let finalDay = Math.min(targetDay, lastDayOfMonth);
                                        let pDate = new Date(flDateObj.getFullYear(), flDateObj.getMonth(), finalDay);
                                        pDate.setHours(12,0,0,0);
                                        fl.paymentDate = pDate.toISOString().split('T')[0];
                                    }
                                } else {
                                    let wMon = getMonday(fl.date);
                                    let offset = parseInt(bun.payDay);
                                    if (offset === 0) { wMon.setDate(wMon.getDate() + 6); } 
                                    else { wMon.setDate(wMon.getDate() + (offset - 1)); }
                                    fl.paymentDate = wMon.toISOString().split('T')[0];
                                }
                            }
                        }
                    }
                });
            } else if (choice === 'single') {
            } else { return; }
        }

        originalLesson.studentId = studentId; originalLesson.subjectId = subjectId;
        originalLesson.bundleId = bundleId; originalLesson.paymentDate = paymentDate;
        originalLesson.topic = topic; originalLesson.date = date;
        originalLesson.startTime = startTime; originalLesson.endTime = endTime;
        originalLesson.price = price; originalLesson.paid = paid; originalLesson.cancelled = cancelled;
        originalLesson.bundleValue = bundleValue;

    } else {
        const repetitions = isRecurring ? 156 : 1; 
        let baseDate = new Date(date);
        let basePayDate = new Date(paymentDate);
        let newGroupId = "grp_" + Date.now().toString() + Math.floor(Math.random() * 1000); 

        for(let i=0; i<repetitions; i++) {
            let lessonDate = new Date(baseDate); lessonDate.setDate(baseDate.getDate() + (i * 7));
            let pDate = new Date(basePayDate); pDate.setDate(basePayDate.getDate() + (i * 7));
            
            const stId = document.getElementById('lesson-student').value;
            const student = students.find(s => s.id == stId);
            const bundle = student ? (student.bundles || []).find(b => b.id == bundleId) : null;
            
            let finalPayDateStr = bundleId ? pDate.toISOString().split('T')[0] : lessonDate.toISOString().split('T')[0];
            
            if (bundle && bundle.type === 'monthly' && bundle.payDay !== undefined && bundle.payDay !== "") {
                let targetDay = parseInt(bundle.payDay);
                if(!isNaN(targetDay)) {
                    let lastDayOfMonth = new Date(lessonDate.getFullYear(), lessonDate.getMonth() + 1, 0).getDate();
                    let finalDay = Math.min(targetDay, lastDayOfMonth);
                    let correctPayDate = new Date(lessonDate.getFullYear(), lessonDate.getMonth(), finalDay);
                    correctPayDate.setHours(12,0,0,0);
                    finalPayDateStr = correctPayDate.toISOString().split('T')[0];
                }
            }

            lessons.push({
                id: Date.now().toString() + Math.floor(Math.random() * 1000) + i,
                groupId: isRecurring ? newGroupId : null,
                studentId, subjectId, bundleId, 
                paymentDate: finalPayDateStr,
                topic, date: lessonDate.toISOString().split('T')[0],
                startTime, endTime, price, 
                bundleValue: bundleValue,
                cancelled: false,
                paid: (paid && i === 0) ? true : false
            });
        }
    }
    saveLessonsToCloud(); closeModals(); renderCalendar();
    if(!document.getElementById('view-pulpit').classList.contains('hidden')) renderDashboard();
}

async function deleteLesson() {
    const id = document.getElementById('lesson-id').value;
    let originalLesson = lessons.find(l => l.id == id);
    
    let futureLessons = lessons.filter(l => {
        if (l.id == id || l.date < originalLesson.date) return false;
        if (originalLesson.groupId && l.groupId === originalLesson.groupId) return true;
        if (!originalLesson.groupId && l.studentId == originalLesson.studentId && l.subjectId == originalLesson.subjectId) {
            return new Date(l.date).getDay() === new Date(originalLesson.date).getDay();
        }
        return false;
    });

    if (futureLessons.length > 0) {
        let choice = await showSeriesChoice('Usuwanie cyklu', 'Wybierz zakres usuwania. Zamiast usuwać, możesz zaznaczyć lekcję jako Odwołaną.', true);
        if (choice === 'single') { lessons = lessons.filter(l => l.id != id); } 
        else if (choice === 'future') {
            let idsToDelete = futureLessons.map(f => f.id); idsToDelete.push(id);
            lessons = lessons.filter(l => !idsToDelete.includes(l.id));
        } else { return; }
    } else {
        if(!await showConfirm('Usuwanie lekcji', 'Na pewno całkowicie USUNĄĆ tę lekcję?', true)) return;
        lessons = lessons.filter(l => l.id != id);
    }
    
    saveLessonsToCloud(); closeModals(); renderCalendar();
    if(!document.getElementById('view-pulpit').classList.contains('hidden')) renderDashboard();
}

function markAsPaid(id, event) {
    event.stopPropagation(); 
    let lesson = lessons.find(l => l.id == id);
    if(lesson) {
        lesson.paid = true; saveLessonsToCloud(); renderDashboard();
        if(!document.getElementById('view-kalendarz').classList.contains('hidden')) renderCalendar();
    }
}

function markBundleAsPaid(studentId, bundleId, paymentDate, event) {
    event.stopPropagation();
    lessons.forEach(l => {
        let lPayDate = l.paymentDate || l.date;
        if (l.studentId == studentId && l.bundleId == bundleId && lPayDate === paymentDate) {
            l.paid = true;
        }
    });
    saveLessonsToCloud(); renderDashboard();
    if(!document.getElementById('view-kalendarz').classList.contains('hidden')) renderCalendar();
}

// --- WIDOK PULPITU ---
function renderDashboard() {
    const now = new Date(); const currentMonth = now.getMonth(); const currentYear = now.getFullYear();
    const todayString = now.toISOString().split('T')[0];
    const nowTime = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');
    const monthNames = ["Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec", "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"];
    const monthsGenitive = ["stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca", "lipca", "sierpnia", "września", "października", "listopada", "grudnia"];
    
    document.getElementById('pulpit-month-title').innerText = `Zarobki - ${monthNames[currentMonth]}`;

    let earnings = 0, lessonsThisMonth = 0; let plannedEarnings = 0; 
    
    lessons.forEach(l => {
        let lDate = new Date(l.date); 
        let effectivePrice = Number(l.price || 0);
        if (l.bundleId && l.bundleValue !== null && l.bundleValue !== undefined) {
            effectivePrice = Number(l.bundleValue);
        }

        if(!l.cancelled) {
            if(lDate.getMonth() === currentMonth && lDate.getFullYear() === currentYear) {
                lessonsThisMonth++;
                if(l.paid) earnings += effectivePrice; else plannedEarnings += effectivePrice; 
            }
        }
    });

    document.getElementById('dashboard-monthly-earnings').innerText = `${Math.round(earnings)} zł`;
    document.getElementById('dashboard-planned-earnings').innerText = `(w planach: +${Math.round(plannedEarnings)} zł)`;
    document.getElementById('dashboard-monthly-lessons').innerText = `${lessonsThisMonth} lekcji`;
    document.getElementById('dashboard-active-students').innerText = students.filter(s => !s.archived).length;

    let upcomingLessons = lessons.filter(l => !l.cancelled && (l.date > todayString || (l.date === todayString && l.endTime >= nowTime)));
    upcomingLessons.sort((a,b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
    
    const upcomingContainer = document.getElementById('pulpit-upcoming-lessons'); upcomingContainer.innerHTML = '';
    
    if(upcomingLessons.length === 0) {
        upcomingContainer.innerHTML = '<p class="text-sm md:text-base" style="color: var(--tekst-szary)">Brak zaplanowanych lekcji.</p>';
    } else {
        upcomingLessons.slice(0, 5).forEach(l => {
            let student = students.find(s => s.id == l.studentId) || {name: 'Nieznany uczeń'};
            let subject = subjects.find(s => s.id == l.subjectId);
            let lDate = new Date(l.date); let dayNames = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'];
            let dateDisplay = l.date === todayString ? 'Dzisiaj' : `${dayNames[lDate.getDay()]}, ${lDate.getDate()} ${monthsGenitive[lDate.getMonth()]}`;
            let badge = subject ? `<span class="text-[9px] md:text-[10px] font-bold px-1.5 md:px-2 py-1 rounded border" style="background-color: ${hexToRgba(subject.color, 0.2)}; color: ${esc(subject.color)}; border-color: ${esc(subject.color)}">${esc(subject.name).toUpperCase()}</span>` : '';

            upcomingContainer.innerHTML += `
                <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 md:p-4 rounded-xl border-2 cursor-pointer transition shadow-sm hover:shadow-md gap-2 sm:gap-0" style="background-color: var(--karta-bg); border-color: var(--szary-ramka)" onclick="editLesson('${l.id}')">
                    <div class="flex items-center gap-3 md:gap-4">
                        <div class="w-8 h-8 md:w-10 h-10 rounded-full flex items-center justify-center font-bold border text-sm md:text-base" style="background-color: var(--jasny); border-color: var(--szary-ramka); color: var(--tekst-szary)">🕒</div>
                        <div>
                            <div class="font-extrabold text-sm md:text-base">${esc(student.name)}</div>
                            <div class="text-xs md:text-sm font-medium" style="color: var(--tekst-szary)">${dateDisplay}, ${l.startTime}</div>
                        </div>
                    </div>
                    <div>${badge}</div>
                </div>`;
        });
    }

    let unpaidLessonsRaw = lessons.filter(l => {
        if(l.cancelled || l.paid) return false;
        let payDate = l.paymentDate || l.date;
        return (payDate < todayString || (payDate === todayString && l.endTime < nowTime));
    });
    
    let bundledPayments = {}; let individualPayments = []; let unpaidTotal = 0; let unpaidCount = 0;

    unpaidLessonsRaw.forEach(l => {
        let effectivePrice = Number(l.price || 0);
        if (l.bundleId && l.bundleValue !== null && l.bundleValue !== undefined) {
            effectivePrice = Number(l.bundleValue);
        }
        
        unpaidTotal += effectivePrice; unpaidCount++;
        
        if (l.bundleId) {
            let payDate = l.paymentDate || l.date;
            let key = `${l.studentId}_${l.bundleId}_${payDate}`;
            if(!bundledPayments[key]) bundledPayments[key] = { lessons: [], total: 0, studentId: l.studentId, bundleId: l.bundleId, paymentDate: payDate };
            bundledPayments[key].lessons.push(l);
            bundledPayments[key].total += effectivePrice;
        } else { individualPayments.push(l); }
    });

    document.getElementById('dashboard-unpaid-sum').innerText = `${Math.round(unpaidTotal)} zł`;
    document.getElementById('dashboard-unpaid-count').innerText = `${unpaidCount} zaległych lekcji`;

    const unpaidContainer = document.getElementById('pulpit-unpaid-lessons'); unpaidContainer.innerHTML = '';

    if(unpaidCount === 0) {
        unpaidContainer.innerHTML = `<div class="border-2 p-4 md:p-6 rounded-xl text-center" style="background-color: rgba(16, 185, 129, 0.1); border-color: rgba(16, 185, 129, 0.3)"><div class="text-2xl md:text-3xl mb-1 md:mb-2">🎉</div><p class="text-emerald-500 font-bold text-sm md:text-base">Uczniowie nie mają zaległości.</p></div>`;
    } else {
        Object.values(bundledPayments).forEach(group => {
            let student = students.find(s => s.id == group.studentId) || {name: 'Nieznany uczeń'};
            let bundle = student.bundles ? student.bundles.find(b => b.id == group.bundleId) : null;
            let bundleName = bundle ? bundle.name : 'Usunięty pakiet';
            
            unpaidContainer.innerHTML += `
                <div class="flex justify-between items-center p-3 rounded-xl cursor-pointer border-2 transition mb-2 bg-rose-50 border-rose-300">
                    <div>
                        <div class="font-bold text-sm md:text-base">${esc(student.name)}</div>
                        <div class="text-[10px] md:text-xs font-bold text-rose-500">📦 PAKIET: ${esc(bundleName)}</div>
                        <div class="text-[9px] md:text-[10px] text-rose-400 mt-0.5">Termin wpłaty: ${group.paymentDate}</div>
                    </div>
                    <div class="flex flex-col items-end gap-2">
                        <div class="font-extrabold text-rose-600 text-sm md:text-base">${Math.round(group.total)} zł</div>
                        <button onclick="markBundleAsPaid('${group.studentId}', '${group.bundleId}', '${group.paymentDate}', event)" class="px-3 py-1.5 rounded-lg border-2 text-[10px] md:text-xs font-bold shadow-sm bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-200 transition whitespace-nowrap">Opłać pakiet</button>
                    </div>
                </div>`;
        });

        individualPayments.sort((a,b) => (b.date + b.startTime).localeCompare(a.date + a.startTime)).slice(0, 5).forEach(l => {
            let student = students.find(s => s.id == l.studentId) || {name: 'Nieznany uczeń'};
            unpaidContainer.innerHTML += `
                <div class="flex justify-between items-center p-3 rounded-xl cursor-pointer border-2 transition mb-2" style="background-color: rgba(244, 63, 94, 0.05); border-color: rgba(244, 63, 94, 0.2)" onclick="editLesson('${l.id}')">
                    <div>
                        <div class="font-bold text-sm md:text-base">${esc(student.name)}</div>
                        <div class="text-[10px] md:text-xs font-medium text-rose-500">${l.date} | ${l.startTime}</div>
                    </div>
                    <div class="flex items-center gap-3">
                        <div class="font-extrabold text-rose-500 text-sm md:text-base">${l.price || 0} zł</div>
                        <button onclick="markAsPaid('${l.id}', event)" class="px-2 py-1 rounded-lg border-2 text-[10px] md:text-xs font-bold shadow-sm bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-200 transition whitespace-nowrap">Zapłacone</button>
                    </div>
                </div>`;
        });
    }

    const weekContainer = document.getElementById('pulpit-week-view'); weekContainer.innerHTML = '';
    const mondayString = getMonday(now).toISOString().split('T')[0];
    let sundayDate = new Date(getMonday(now)); sundayDate.setDate(sundayDate.getDate() + 6);
    const sundayString = sundayDate.toISOString().split('T')[0];

    let thisWeekLessons = lessons.filter(l => l.date >= mondayString && l.date <= sundayString);
    thisWeekLessons.sort((a,b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));

    if(thisWeekLessons.length === 0) weekContainer.innerHTML = '<p class="text-sm md:text-base" style="color: var(--tekst-szary)">Pusty grafik na ten tydzień.</p>';
    else {
        const daysNamesPL = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota']; let lastDay = '';
        thisWeekLessons.forEach(l => {
            let lDate = new Date(l.date);
            let dayDisplay = l.date === todayString ? `<span style="color: var(--akcent)">Dzisiaj</span>` : daysNamesPL[lDate.getDay()];
            if(l.date !== lastDay) {
                weekContainer.innerHTML += `<div class="text-xs md:text-sm font-extrabold uppercase tracking-wider mt-4 md:mt-6 mb-2 border-b-2 pb-1" style="border-color: var(--szary-ramka)">${dayDisplay} <span class="font-medium text-[10px] md:text-xs normal-case" style="color: var(--tekst-szary)">(${l.date})</span></div>`;
                lastDay = l.date;
            }

            let student = students.find(s => s.id == l.studentId) || {name: 'Nieznany uczeń'};
            let subject = subjects.find(s => s.id == l.subjectId) || {name: 'Brak', color: '#cbd5e1'};
            let statusIcon = l.cancelled ? '<span class="px-1.5 py-1 rounded border text-[9px] font-bold shadow-sm" style="background-color: var(--jasny); color: var(--tekst-szary); border-color: var(--szary-ramka)">Odwołana ❌</span>' : (l.paid ? '<span class="px-1.5 py-1 rounded border text-[9px] font-bold shadow-sm text-emerald-600 bg-emerald-50 border-emerald-200">Opłacone</span>' : '<span class="px-1.5 py-1 rounded border text-[9px] font-bold shadow-sm text-rose-500 bg-rose-50 border-rose-200">Brak</span>');
            let cardOpacity = l.cancelled ? 'opacity: 0.5; filter: grayscale(100%)' : '';
            let lineThrough = l.cancelled ? 'text-decoration: line-through' : '';
            let topicHtml = l.topic ? `<p class="text-[10px] md:text-xs font-medium truncate mt-0.5" style="color: var(--tekst-szary)">📝 ${esc(l.topic)}</p>` : '';
            let bundleBadge = l.bundleId ? `<span class="text-[8px] md:text-[9px] font-bold px-1.5 py-0.5 rounded ml-1 border bg-blue-50 text-blue-600 border-blue-200">📦 PAKIET</span>` : '';

            weekContainer.innerHTML += `
                <div class="flex items-center justify-between p-3 md:p-4 rounded-xl border-2 cursor-pointer transition shadow-[2px_2px_0_var(--ciemny)] hover:-translate-y-0.5 gap-2 md:gap-4" style="background-color: var(--karta-bg); border-color: var(--ciemny); ${cardOpacity}" onclick="editLesson('${l.id}')">
                    <div class="flex items-center gap-3 md:gap-4 w-full truncate">
                        <div class="w-1.5 h-10 md:h-12 rounded-full shrink-0" style="background-color: ${esc(subject.color)}"></div>
                        <div class="truncate flex-1">
                            <p class="font-extrabold text-sm md:text-base" style="${lineThrough}">${l.startTime} - ${l.endTime}</p>
                            <p class="text-xs md:text-sm font-medium truncate" style="color: var(--tekst-szary)">${esc(student.name)} <span class="text-[8px] md:text-[10px] font-bold px-1.5 py-0.5 rounded ml-1 border hidden sm:inline-block" style="background-color: ${hexToRgba(subject.color, 0.2)}; color: ${esc(subject.color)}; border-color: ${esc(subject.color)}">${esc(subject.name).toUpperCase()}</span>${bundleBadge}</p>
                            ${topicHtml}
                        </div>
                    </div>
                    <div class="flex flex-col items-end gap-1 md:gap-2 shrink-0">
                        <span class="font-extrabold text-sm md:text-base" style="${lineThrough}">${l.price || 0} zł</span>
                        ${statusIcon}
                    </div>
                </div>`;
        });
    }
}

// --- WIDOK KALENDARZA (Z PRZEŁĄCZANIEM NA AGENDĘ) ---
function toggleCalendarView() {
    currentCalendarView = currentCalendarView === 'grid' ? 'agenda' : 'grid';
    const btn = document.getElementById('btn-toggle-view');
    if (currentCalendarView === 'agenda') {
        btn.innerHTML = 'Widok Siatki 📅';
        document.getElementById('calendar-grid-container').classList.add('hidden');
        document.getElementById('calendar-agenda-container').classList.remove('hidden');
    } else {
        btn.innerHTML = 'Widok Listy 📋';
        document.getElementById('calendar-grid-container').classList.remove('hidden');
        document.getElementById('calendar-agenda-container').classList.add('hidden');
    }
    renderCalendar();
}

function changeWeek(offset) {
    currentDate = new Date(currentDate.getTime() + offset * 7 * 24 * 60 * 60 * 1000);
    renderCalendar();
}

function goToToday() { currentDate = new Date(); renderCalendar(); }

function renderCalendar() {
    let monday = getMonday(currentDate); let sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
    const monthNames = ["Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec", "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"];
    
    document.getElementById('month-year-display').innerText = `${monthNames[sunday.getMonth()]} ${sunday.getFullYear()}`;
    let formatDay = (date) => date.getDate().toString().padStart(2, '0');
    document.getElementById('calendar-week-btn-text').innerText = `${formatDay(monday)} - ${formatDay(sunday)} ${monthNames[sunday.getMonth()].substring(0,3).toUpperCase()}`;

    if (currentCalendarView === 'agenda') {
        renderAgendaView(monday, sunday);
        return;
    }

    const daysNames = ['PON', 'WT', 'ŚR', 'CZW', 'PT', 'SOB', 'ND'];
    let headerHtml = '<div class="border-r-2 p-1 md:p-2 w-12 md:w-16 shrink-0" style="background-color: var(--karta-bg); border-color: var(--ciemny)"></div>';
    
    for(let i=0; i<7; i++) {
        let dayDate = new Date(monday); dayDate.setDate(monday.getDate() + i);
        let isToday = dayDate.toDateString() === new Date().toDateString();
        let circleStyle = isToday ? `background-color: var(--akcent); color: #fff; border: 2px solid var(--ciemny); box-shadow: 2px 2px 0 var(--ciemny)` : `color: var(--tekst-glowny)`;
        let textStyle = isToday ? `color: var(--akcent)` : `color: var(--tekst-szary)`;
        
        headerHtml += `
            <div class="text-center py-2 md:py-3 border-r-2 day-col flex-1" style="background-color: var(--karta-bg); border-color: var(--ciemny)">
                <div class="text-[10px] md:text-xs font-extrabold mb-1 md:mb-2 tracking-wider" style="${textStyle}">${daysNames[i]}</div>
                <div class="mx-auto w-8 h-8 md:w-12 md:h-12 flex items-center justify-center rounded-full font-extrabold text-sm md:text-xl" style="${circleStyle}">
                    ${dayDate.getDate()}
                </div>
            </div>`;
    }
    document.getElementById('calendar-header').innerHTML = headerHtml;

    let gridHtml = `<div class="border-r-2 relative w-12 md:w-16 shrink-0 z-10" style="background-color: var(--karta-bg); border-color: var(--ciemny)">`;
    for(let h = settings.startHour; h <= settings.endHour; h++) {
        gridHtml += `<div class="h-24 time-row text-[10px] md:text-xs text-right pr-1 md:pr-2 pt-1 font-bold" style="color: var(--tekst-szary)">${h}:00</div>`;
    }
    gridHtml += `</div>`;

    for(let i=0; i<7; i++) {
        let dayDate = new Date(monday); dayDate.setDate(monday.getDate() + i);
        let dateString = dayDate.toISOString().split('T')[0];
        let isWeekend = (i === 5 || i === 6) ? `background-color: rgba(120, 120, 120, 0.03);` : '';

        gridHtml += `<div class="relative day-col flex-1 border-r-2 last:border-r-0" style="border-color: var(--szary-ramka); ${isWeekend}" data-date="${dateString}">`;
        for(let h = settings.startHour; h <= settings.endHour; h++) { gridHtml += `<div class="h-24 time-row"></div>`; }
        
        let dailyLessons = lessons.filter(l => l.date === dateString);
        dailyLessons.forEach(lesson => {
            let start = lesson.startTime.split(':'); let end = lesson.endTime.split(':');
            if(parseInt(start[0]) < settings.startHour && parseInt(end[0]) <= settings.startHour) return;

            let topPosition = ((parseInt(start[0]) - settings.startHour) * 96) + (parseInt(start[1]) / 60 * 96);
            let height = (((parseInt(end[0]) - parseInt(start[0])) * 96) + ((parseInt(end[1]) - parseInt(start[1])) / 60 * 96));
            if(topPosition < 0) { height += topPosition; topPosition = 0; }

            let student = students.find(s => s.id == lesson.studentId) || {name: 'Usunięty'};
            let subject = subjects.find(s => s.id == lesson.subjectId) || {name: '', color: '#cbd5e1'};
            
            let bgColor = hexToRgba(subject.color, 0.15);
            let icon = lesson.cancelled ? '❌' : (lesson.paid ? '✅' : '<span class="text-rose-500 font-extrabold text-xs md:text-sm">!</span>');
            let opacityAndStrike = lesson.cancelled ? 'opacity: 0.5; filter: grayscale(100%); text-decoration: line-through;' : '';
            let topicHtml = lesson.topic ? `<div class="truncate text-[8px] md:text-[10px] font-medium mt-0.5" style="color: var(--tekst-glowny)">📝 ${esc(lesson.topic)}</div>` : '';

            gridHtml += `
                <div class="absolute w-[94%] left-[3%] rounded-lg md:rounded-xl p-1 md:p-1.5 overflow-hidden shadow-sm hover:shadow-[2px_2px_0_var(--ciemny)] hover:-translate-y-0.5 transition cursor-pointer flex flex-col border-l-2 md:border-l-4 border" 
                     style="top: ${topPosition}px; height: ${height}px; background-color: ${bgColor}; border-left-color: ${esc(subject.color)}; border-color: ${esc(subject.color)}; ${opacityAndStrike}"
                     onclick="editLesson('${lesson.id}')">
                    <div class="font-bold flex justify-between text-[9px] md:text-xs mb-0.5" style="color: ${esc(subject.color)}">
                        <span class="whitespace-nowrap tracking-tighter md:tracking-normal">${lesson.startTime}-${lesson.endTime}</span>
                        <span title="Status" class="hidden md:inline">${icon}</span>
                    </div>
                    <div class="font-extrabold truncate leading-tight text-[11px] md:text-sm">${esc(student.name)}</div>
                    <div class="font-bold truncate mt-auto text-[8px] md:text-[9px] uppercase tracking-wider" style="color: var(--tekst-szary)">${esc(subject.name)}</div>
                    ${topicHtml}
                </div>`;
        });
        gridHtml += `</div>`;
    }
    document.getElementById('calendar-grid').innerHTML = gridHtml;
    updateCurrentTimeLine();
}

function renderAgendaView(monday, sunday) {
    const container = document.getElementById('calendar-agenda-container');
    container.innerHTML = '';
    
    let weekStringStart = monday.toISOString().split('T')[0];
    let weekStringEnd = sunday.toISOString().split('T')[0];

    let weekLessons = lessons.filter(l => l.date >= weekStringStart && l.date <= weekStringEnd);
    weekLessons.sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));

    if (weekLessons.length === 0) {
        container.innerHTML = '<div class="flex flex-col items-center justify-center h-full text-center opacity-50 p-10"><div class="text-6xl mb-4">☕</div><h3 class="text-xl font-extrabold">Brak zajęć w tym tygodniu</h3><p class="font-bold">Czas na odpoczynek!</p></div>';
        return;
    }

    const daysNamesPL = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];
    let lastDate = '';

    weekLessons.forEach(l => {
        if (l.date !== lastDate) {
            let d = new Date(l.date);
            let dayName = daysNamesPL[d.getDay()];
            let todayStr = new Date().toISOString().split('T')[0];
            let isToday = l.date === todayStr;
            let dayHeaderColor = isToday ? 'color: var(--akcent)' : 'color: var(--tekst-glowny)';
            
            container.innerHTML += `
                <div class="text-lg md:text-xl font-black uppercase tracking-wider mb-3 mt-6 border-b-4 pb-1 flex items-baseline gap-2" style="border-color: var(--ciemny); ${dayHeaderColor}">
                    ${isToday ? 'Dzisiaj' : dayName} <span class="font-bold text-xs md:text-sm normal-case opacity-60">(${l.date})</span>
                </div>`;
            lastDate = l.date;
        }

        let student = students.find(s => s.id == l.studentId) || {name: 'Usunięty uczeń'};
        let subject = subjects.find(s => s.id == l.subjectId) || {name: 'Brak', color: '#cbd5e1'};
        let statusIcon = l.cancelled ? 'Odwołana ❌' : (l.paid ? 'Opłacone ✅' : 'Brak wpłaty ⏳');
        let opacityAndStrike = l.cancelled ? 'opacity: 0.5; filter: grayscale(100%);' : '';
        let lineThrough = l.cancelled ? 'text-decoration: line-through;' : '';
        let topicHtml = l.topic ? `<div class="text-xs md:text-sm font-bold opacity-75 mt-1">📝 Temat: ${esc(l.topic)}</div>` : '';
        
        let linksHtml = '';
        if (subject.links && subject.links.trim() !== '') {
            let linksArr = subject.links.split('\n').map(u => u.trim()).filter(u => u !== '');
            if(linksArr.length > 0) {
                linksHtml += '<div class="flex flex-wrap gap-2 mt-3 pt-3 border-t-2" style="border-color: rgba(0,0,0,0.05)">';
                linksArr.forEach((link, idx) => {
                    let url = link.startsWith('http') ? link : 'https://' + link;
                    linksHtml += `<a href="${esc(url)}" target="_blank" onclick="event.stopPropagation()" class="px-3 py-1.5 bg-white border-2 rounded-lg text-[10px] md:text-xs font-bold hover:-translate-y-0.5 transition shadow-[2px_2px_0_var(--ciemny)]" style="border-color: var(--ciemny); color: var(--ciemny)">🔗 Materiał ${idx+1}</a>`;
                });
                linksHtml += '</div>';
            }
        }

        container.innerHTML += `
            <div class="karta cursor-pointer transition hover:-translate-y-1 hover:shadow-[6px_6px_0_var(--ciemny)] border-4 p-4 md:p-5 mb-4 flex flex-col bg-white" 
                 style="border-color: var(--ciemny); border-left-width: 8px; border-left-color: ${esc(subject.color)}; ${opacityAndStrike}" 
                 onclick="editLesson('${l.id}')">
                 
                <div class="flex justify-between items-start gap-4">
                    <div class="flex-1 min-w-0">
                        <div class="font-black text-lg md:text-xl" style="${lineThrough}">${l.startTime} - ${l.endTime}</div>
                        <div class="font-extrabold text-base md:text-lg mt-1 truncate w-full">${esc(student.name)}</div>
                        <div class="inline-block px-2 py-0.5 mt-2 rounded border-2 text-[10px] md:text-xs font-bold uppercase tracking-wider truncate max-w-full" style="background-color: ${hexToRgba(subject.color, 0.15)}; border-color: ${esc(subject.color)}; color: ${esc(subject.color)}">${esc(subject.name)}</div>
                        ${topicHtml}
                    </div>
                    
                    <div class="flex flex-col items-end gap-2 shrink-0">
                        <div class="font-black text-lg md:text-xl" style="${lineThrough}">${l.price || 0} zł</div>
                        <div class="text-[10px] md:text-xs font-bold uppercase tracking-widest opacity-60">${statusIcon}</div>
                    </div>
                </div>
                ${linksHtml}
            </div>
        `;
    });
}

function updateCurrentTimeLine() {
    const line = document.getElementById('current-time-line');
    if(!line) return;
    const now = new Date(); const monday = getMonday(currentDate);
    const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
    
    if (now >= monday && now <= new Date(sunday.setHours(23,59,59))) {
        line.classList.remove('hidden');
        let hours = now.getHours(); let minutes = now.getMinutes();
        if(hours >= settings.startHour && hours <= settings.endHour) {
            let top = ((hours - settings.startHour) * 96) + (minutes / 60 * 96);
            line.style.top = `${top}px`;
        } else { line.classList.add('hidden'); }
    } else { line.classList.add('hidden'); }
}
setInterval(updateCurrentTimeLine, 60000);

// --- SZUKANIE TERMINU ---
function openFindSlotModal() {
    slotDate = new Date(); 
    document.getElementById('modal-find-slot').classList.remove('hidden');
    renderSlotCalendar();
}

function changeSlotWeek(offset) {
    slotDate = new Date(slotDate.getTime() + offset * 7 * 24 * 60 * 60 * 1000);
    renderSlotCalendar();
}

function renderSlotCalendar() {
    let monday = getMonday(slotDate);
    let sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
    const monthNames = ["Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec", "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"];
    
    let formatDay = (date) => date.getDate().toString().padStart(2, '0');
    document.getElementById('slot-week-btn-text').innerText = `${formatDay(monday)} - ${formatDay(sunday)} ${monthNames[sunday.getMonth()].substring(0,3).toUpperCase()}`;

    const daysNames = ['PON', 'WT', 'ŚR', 'CZW', 'PT', 'SOB', 'ND'];
    let headerHtml = '<div class="border-r-2 p-1 md:p-2 w-12 shrink-0" style="background-color: var(--karta-bg); border-color: var(--ciemny)"></div>';
    
    for(let i=0; i<7; i++) {
        let dayDate = new Date(monday); dayDate.setDate(monday.getDate() + i);
        let isToday = dayDate.toDateString() === new Date().toDateString();
        let circleStyle = isToday ? `background-color: var(--akcent); color: #fff; border: 2px solid var(--ciemny);` : `color: var(--tekst-glowny)`;
        let textStyle = isToday ? `color: var(--akcent)` : `color: var(--tekst-szary)`;
        
        headerHtml += `
            <div class="text-center py-1 md:py-2 border-r-2 day-col flex-1" style="background-color: var(--karta-bg); border-color: var(--ciemny)">
                <div class="text-[10px] md:text-xs font-extrabold mb-1 tracking-wider" style="${textStyle}">${daysNames[i]}</div>
                <div class="mx-auto w-6 h-6 md:w-8 md:h-8 flex items-center justify-center rounded-full font-extrabold text-xs md:text-sm" style="${circleStyle}">
                    ${dayDate.getDate()}
                </div>
            </div>`;
    }
    document.getElementById('slot-calendar-header').innerHTML = headerHtml;

    let gridHtml = `<div class="border-r-2 relative w-12 shrink-0 z-10" style="background-color: var(--karta-bg); border-color: var(--ciemny)">`;
    for(let h = settings.startHour; h <= settings.endHour; h++) {
        gridHtml += `<div class="h-24 time-row text-[10px] md:text-xs text-right pr-1 pt-1 font-bold" style="color: var(--tekst-szary)">${h}:00</div>`;
    }
    gridHtml += `</div>`;

    for(let i=0; i<7; i++) {
        let dayDate = new Date(monday); dayDate.setDate(monday.getDate() + i);
        let dateString = dayDate.toISOString().split('T')[0];
        let dayOfWeek = dayDate.getDay();

        let colBg = `background-color: rgba(244, 63, 94, 0.05);`;

        gridHtml += `<div class="relative day-col flex-1 border-r-2 last:border-r-0 cursor-pointer overflow-hidden transition hover:bg-slate-100/50" style="border-color: var(--szary-ramka); ${colBg}" onclick="handleSlotClick(event, '${dateString}')">`;
        
        for(let h = settings.startHour; h <= settings.endHour; h++) {
            gridHtml += `<div class="h-24 time-row border-rose-200 opacity-50" style="border-bottom-style: dashed; border-bottom-width: 1px;"></div>`;
        }
        
        let avail = settings.availability[dayOfWeek];
        if (avail && avail.active) {
            let [sH, sM] = avail.start.split(':').map(Number);
            let [eH, eM] = avail.end.split(':').map(Number);
            
            let startPos = ((sH - settings.startHour) * 96) + (sM / 60 * 96);
            let height = (((eH - sH) * 96) + ((eM - sM) / 60 * 96));
            let maxPos = (settings.endHour - settings.startHour) * 96 + 96;
            
            if(startPos < 0) { height += startPos; startPos = 0; }
            if(startPos + height > maxPos) { height = maxPos - startPos; }

            if (height > 0 && startPos < maxPos) {
                gridHtml += `
                    <div class="absolute w-[94%] left-[3%] rounded-lg border-2 shadow-[2px_2px_0_var(--ciemny)] z-0 flex flex-col items-center justify-start pt-1 md:pt-2 overflow-hidden transition-transform hover:-translate-y-0.5" 
                         style="top: ${startPos}px; height: ${height}px; background-color: #bbf7d0; border-color: var(--ciemny);">
                         <div class="px-1 text-[8px] md:text-[10px] font-extrabold uppercase tracking-widest text-center" style="color: var(--ciemny)">Dostępne</div>
                    </div>`;
            }
        }

        let dailyLessons = lessons.filter(l => l.date === dateString && !l.cancelled);
        dailyLessons.forEach(lesson => {
            let start = lesson.startTime.split(':');
            let end = lesson.endTime.split(':');
            
            if(parseInt(start[0]) < settings.startHour && parseInt(end[0]) <= settings.startHour) return;

            let topPosition = ((parseInt(start[0]) - settings.startHour) * 96) + (parseInt(start[1]) / 60 * 96);
            let height = (((parseInt(end[0]) - parseInt(start[0])) * 96) + ((parseInt(end[1]) - parseInt(start[1])) / 60 * 96));
            
            if(topPosition < 0) { height += topPosition; topPosition = 0; }

            let student = students.find(s => s.id == lesson.studentId) || {name: 'Nieznany'};
            let subject = subjects.find(s => s.id == lesson.subjectId) || {name: ''};

            gridHtml += `
                <div class="absolute w-[94%] left-[3%] rounded-lg border-2 shadow-[2px_2px_0_var(--ciemny)] z-10 flex flex-col items-start justify-start p-1 overflow-hidden opacity-[0.98] cursor-not-allowed" 
                     style="top: ${topPosition}px; height: ${height}px; background-color: #fecaca; border-color: var(--ciemny);"
                     onclick="event.stopPropagation()">
                    <div class="text-[8px] md:text-[9px] font-bold leading-none mb-0.5" style="color: var(--ciemny)">${lesson.startTime}-${lesson.endTime}</div>
                    <div class="text-[9px] md:text-[10px] font-extrabold leading-tight truncate w-full" style="color: var(--ciemny)">${esc(student.name)}</div>
                    <div class="text-[7px] md:text-[8px] font-bold uppercase tracking-wider truncate w-full mt-auto opacity-75" style="color: var(--ciemny)">${esc(subject.name)}</div>
                </div>`;
        });

        gridHtml += `</div>`;
    }
    document.getElementById('slot-calendar-grid').innerHTML = gridHtml;
}

function handleSlotClick(e, dateStr) {
    let col = e.currentTarget;
    let rect = col.getBoundingClientRect();
    let y = e.clientY - rect.top; 
    
    let rawHours = settings.startHour + (y / 96);
    let h = Math.floor(rawHours);
    let m = Math.floor((rawHours - h) * 60);
    
    m = Math.round(m / 15) * 15;
    if(m === 60) { h++; m = 0; }
    
    if(h < settings.startHour) h = settings.startHour;
    if(h >= settings.endHour) { h = settings.endHour - 1; m = 45; }
    
    let startStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    
    document.getElementById('modal-find-slot').classList.add('hidden');
    openLessonModal();
    if(datePicker) datePicker.setDate(dateStr);
    document.getElementById('lesson-time-start').value = startStr;
    if(timeStartPicker) timeStartPicker.setDate(startStr);
    autoUzupelnijCzas(); 
}

// --- WIDOK ZAROBKÓW ---
function processEarningsData(lessonsArray) {
    let total = 0; let byStudent = {}; let bySubject = {};

    lessonsArray.forEach(l => {
        if(l.paid && !l.cancelled) {
            let effectivePrice = Number(l.price || 0);
            if (l.bundleId && l.bundleValue !== null && l.bundleValue !== undefined) {
                effectivePrice = Number(l.bundleValue);
            }
            
            total += effectivePrice;
            
            let student = students.find(s => s.id == l.studentId);
            let studentName = student ? student.name : 'Nieznany uczeń';
            byStudent[studentName] = (byStudent[studentName] || 0) + effectivePrice;
            
            let subject = subjects.find(s => s.id == l.subjectId);
            let subjectName = subject ? subject.name : 'Inne';
            let subjectColor = subject ? subject.color : settings.accent;

            if(!bySubject[subjectName]) bySubject[subjectName] = {val: 0, color: subjectColor};
            bySubject[subjectName].val += effectivePrice;
        }
    });

    let studentArr = Object.keys(byStudent).map(k => ({name: k, val: Math.round(byStudent[k])})).sort((a,b) => b.val - a.val);
    let subjectArr = Object.keys(bySubject).map(k => ({name: k, val: Math.round(bySubject[k].val), color: bySubject[k].color})).sort((a,b) => b.val - a.val);
    return { total: Math.round(total), studentArr, subjectArr };
}

function renderChart(canvasId, type, dataArr) {
    if(chartInstances[canvasId]) chartInstances[canvasId].destroy();
    const ctx = document.getElementById(canvasId).getContext('2d');
    if(dataArr.length === 0) { ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height); return; }

    const borderColor = getComputedStyle(document.documentElement).getPropertyValue('--ciemny').trim();
    chartInstances[canvasId] = new Chart(ctx, {
        type: type,
        data: {
            labels: dataArr.map(d => esc(d.name)),
            datasets: [{
                data: dataArr.map(d => d.val),
                backgroundColor: dataArr.map(d => d.color || settings.accent),
                borderColor: borderColor, borderWidth: 2, borderRadius: type === 'bar' ? 6 : 0
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false, plugins: { legend: { display: type === 'doughnut', position: 'bottom' } },
            scales: type === 'bar' ? { y: { beginAtZero: true, grid: { color: getComputedStyle(document.documentElement).getPropertyValue('--szary-ramka').trim() } }, x: { grid: { display: false } } } : undefined
        }
    });
}

function renderStudentList(containerId, studentArr, total) {
    const container = document.getElementById(containerId); container.innerHTML = '';
    if(studentArr.length === 0) { container.innerHTML = '<p class="text-sm" style="color: var(--tekst-szary)">Brak opłaconych lekcji.</p>'; return; }
    studentArr.forEach(item => {
        let width = total > 0 ? Math.max(5, (item.val / total) * 100) : 0;
        container.innerHTML += `
            <div class="mb-3">
                <div class="flex justify-between text-xs md:text-sm font-bold mb-1"><span>${esc(item.name)}</span><span style="color: var(--akcent)">${item.val} zł</span></div>
                <div class="w-full rounded-full h-2 md:h-3 border-2" style="background-color: var(--jasny); border-color: var(--szary-ramka)"><div class="h-full rounded-full" style="width: ${width}%; background-color: var(--akcent)"></div></div>
            </div>`;
    });
}

function renderZarobki() {
    const monthPicker = document.getElementById('earnings-month-picker').value; 
    const weekPicker = document.getElementById('earnings-week-picker').value;

    const allData = processEarningsData(lessons);
    document.getElementById('total-all-earnings').innerText = `${allData.total} zł`;
    renderChart('chart-all-subject', 'doughnut', allData.subjectArr);
    renderStudentList('list-all-student', allData.studentArr, allData.total);

    if(monthPicker) {
        const monthLessons = lessons.filter(l => l.date.substring(0,7) === monthPicker);
        const monthData = processEarningsData(monthLessons);
        document.getElementById('total-month-earnings').innerText = `${monthData.total} zł`;
        renderChart('chart-month-subject', 'bar', monthData.subjectArr);
    }
    if(weekPicker) {
        const weekLessons = lessons.filter(l => getWeekString(l.date) === weekPicker);
        const weekData = processEarningsData(weekLessons);
        document.getElementById('total-week-earnings').innerText = `${weekData.total} zł`;
        renderChart('chart-week-subject', 'bar', weekData.subjectArr);
    }
}
