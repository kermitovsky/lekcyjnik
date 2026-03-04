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

let currentUser = null; 
let subjects = [];
let students = [];
let lessons = [];

let settings = {
    theme: 'light',
    accent: '#4f46e5',
    startHour: 7,
    endHour: 22,
    duration: 60
};

let currentDate = new Date();
let datePicker; 
let timeStartPicker;
let timeEndPicker;
let jumpPicker; 
let chartInstances = {}; 

Chart.defaults.font.family = "'Inter', 'sans-serif'";
Chart.defaults.color = '#64748b';

// --- CUSTOMOWE OKIENKA ---
function customAlert(title, message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('modal-alert');
        document.getElementById('alert-title').innerText = title;
        document.getElementById('alert-message').innerText = message;
        const btnOk = document.getElementById('btn-alert-ok');
        
        modal.classList.remove('hidden');
        btnOk.onclick = () => { modal.classList.add('hidden'); resolve(); };
    });
}

function showConfirm(title, message, isDanger = false) {
    return new Promise((resolve) => {
        const modal = document.getElementById('modal-confirm');
        document.getElementById('confirm-title').innerText = title;
        document.getElementById('confirm-message').innerText = message;
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
        document.getElementById('series-title').innerText = title;
        document.getElementById('series-message').innerText = message;
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

// ZAINICJOWANIE KALENDARZY 
document.addEventListener("DOMContentLoaded", () => {
    datePicker = flatpickr("#lesson-date", { locale: "pl", dateFormat: "Y-m-d", altInput: true, altFormat: "d/m/Y", allowInput: true });
    timeStartPicker = flatpickr("#lesson-time-start", { enableTime: true, noCalendar: true, dateFormat: "H:i", time_24hr: true, onChange: autoUzupelnijCzas });
    timeEndPicker = flatpickr("#lesson-time-end", { enableTime: true, noCalendar: true, dateFormat: "H:i", time_24hr: true });
    
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

function openJumpPicker() {
    if(jumpPicker) jumpPicker.open();
}

// --- APLIKOWANIE USTAWIEŃ WIZUALNYCH ---
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

    if(!document.getElementById('view-zarobki').classList.contains('hidden')) renderZarobki();
}

function ustawMotyw(theme) { settings.theme = theme; applyVisualSettings(); saveToCloud(); }
function ustawAkcent(color) { settings.accent = color; applyVisualSettings(); saveToCloud(); }
function zapiszOpcje() {
    settings.startHour = parseInt(document.getElementById('ust-start').value) || 7;
    settings.endHour = parseInt(document.getElementById('ust-end').value) || 22;
    settings.duration = parseInt(document.getElementById('ust-czas').value) || 60;
    saveToCloud(); renderCalendar();
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
}

function markAsPaid(id, event) {
    event.stopPropagation(); 
    let lesson = lessons.find(l => l.id == id);
    if(lesson) {
        lesson.paid = true;
        saveToCloud();
        renderDashboard();
        if(!document.getElementById('view-kalendarz').classList.contains('hidden')) renderCalendar();
    }
}

// --- LOGOWANIE (TYLKO GOOGLE) ---
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        document.getElementById('view-login').classList.add('hidden');
        document.getElementById('app-nav').classList.remove('hidden');
        document.getElementById('main-content').classList.remove('hidden');
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
    try {
        await firebase.auth().signInWithPopup(provider);
    } catch (e) {
        await customAlert("Błąd logowania", e.message);
    }
}
function wyloguj() { firebase.auth().signOut(); }

// --- POBIERANIE I ZAPIS DANYCH ---
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

function saveToCloud() {
    if(!currentUser) return; 
    db.collection("planer_korepetytora").doc(currentUser.uid).set({
        subjects: subjects, students: students, lessons: lessons, settings: settings
    });
}

function eksportujDane() {
    const backupData = { subjects, students, lessons, settings };
    const dataStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([dataStr], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `Planer_Kopia_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
}

async function importujDane(event) {
    const file = event.target.files[0];
    if (!file) return;

    const potwierdzenie = await showConfirm('Wgrywanie bazy danych', 'Uwaga! Ta operacja bezpowrotnie zastąpi Twoje obecne dane w chmurze plikiem z dysku. Chcesz kontynuować?', true);
    
    if (!potwierdzenie) {
        event.target.value = ''; 
        return;
    }

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if(data.subjects && data.students && data.lessons) {
                subjects = data.subjects;
                students = data.students;
                lessons = data.lessons;
                if(data.settings) settings = data.settings;
                
                saveToCloud();
                applyVisualSettings();
                switchTab('pulpit');
                await customAlert('Sukces', 'Baza danych została poprawnie wgrana!');
            } else {
                await customAlert('Błąd pliku', 'Ten plik jest uszkodzony lub nie pochodzi z aplikacji Planer Korepetytora.');
            }
        } catch (error) {
            await customAlert('Błąd odczytu', 'Nie udało się poprawnie odczytać pliku.');
        }
        event.target.value = '';
    };
    reader.readAsText(file);
}

// --- NAWIGACJA ---
function switchTab(tabName) {
    ['pulpit', 'kalendarz', 'uczniowie', 'przedmioty', 'zarobki', 'ustawienia'].forEach(id => {
        document.getElementById(`view-${id}`).classList.add('hidden');
    });
    document.querySelectorAll('.nav-tab').forEach(btn => btn.classList.remove('aktywna'));

    document.getElementById(`view-${tabName}`).classList.remove('hidden');
    if(document.getElementById(`tab-${tabName}`)) document.getElementById(`tab-${tabName}`).classList.add('aktywna');

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

function hexToRgba(hex, alpha) {
    if(!hex) return `rgba(120, 120, 120, ${alpha})`;
    let r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// --- PRZEDMIOTY ---
function renderSubjects() {
    const list = document.getElementById('subjects-list');
    list.innerHTML = '';
    if(subjects.length === 0) return list.innerHTML = '<p style="color: var(--tekst-szary)">Brak przedmiotów. Dodaj pierwszy!</p>';
    
    subjects.forEach(sub => {
        list.innerHTML += `
            <div class="karta flex justify-between items-center cursor-pointer" onclick="editSubject('${sub.id}')">
                <div class="flex items-center gap-3">
                    <div class="w-6 h-6 rounded-md border-2" style="background-color: ${sub.color}; border-color: var(--ciemny)"></div>
                    <h4 class="font-bold text-lg">${sub.name}</h4>
                </div>
            </div>`;
    });
}
function openSubjectModal() {
    document.getElementById('subject-id').value = '';
    document.getElementById('subject-name').value = '';
    document.getElementById('subject-color').value = '#ef4444';
    document.getElementById('btn-delete-subject').classList.add('hidden');
    document.getElementById('modal-subject').classList.remove('hidden');
}
function editSubject(id) {
    const sub = subjects.find(s => s.id == id);
    if(!sub) return;
    document.getElementById('subject-id').value = sub.id;
    document.getElementById('subject-name').value = sub.name;
    document.getElementById('subject-color').value = sub.color;
    document.getElementById('btn-delete-subject').classList.remove('hidden');
    document.getElementById('modal-subject').classList.remove('hidden');
}
async function saveSubject() {
    const id = document.getElementById('subject-id').value;
    const name = document.getElementById('subject-name').value;
    const color = document.getElementById('subject-color').value;
    if(!name) return await customAlert('Błąd', 'Wpisz nazwę przedmiotu!');
    if(id) { let sub = subjects.find(s => s.id == id); sub.name = name; sub.color = color; } 
    else { subjects.push({ id: Date.now().toString(), name, color }); }
    saveToCloud(); closeModals(); renderSubjects();
}
async function deleteSubject() {
    const id = document.getElementById('subject-id').value;
    if(await showConfirm('Usuwanie', 'Czy na pewno usunąć ten przedmiot?', true)) {
        subjects = subjects.filter(s => s.id != id);
        saveToCloud(); closeModals(); renderSubjects();
    }
}

// --- UCZNIOWIE (Z ARCHIWUM) ---
function renderStudents() {
    const list = document.getElementById('students-list');
    const archivedList = document.getElementById('archived-students-list');
    const archivedSection = document.getElementById('archived-students-section');
    
    list.innerHTML = '';
    archivedList.innerHTML = '';
    
    const searchInput = document.getElementById('student-search');
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    
    let activeStudents = students.filter(s => !s.archived && s.name.toLowerCase().includes(searchTerm));
    let archivedStudents = students.filter(s => s.archived && s.name.toLowerCase().includes(searchTerm));

    // Render Aktywnych
    if(activeStudents.length === 0) {
        list.innerHTML = '<p style="color: var(--tekst-szary)">Brak aktywnych uczniów.</p>';
    } else {
        activeStudents.forEach(student => {
            let studentSubjectsHtml = '';
            if(student.subjectIds && student.subjectIds.length > 0) {
                student.subjectIds.forEach(subId => {
                    let sub = subjects.find(s => s.id == subId);
                    if(sub) studentSubjectsHtml += `<span class="text-[10px] md:text-xs font-bold px-2 py-1 rounded-md text-white border" style="background-color: ${sub.color}; border-color: var(--ciemny)">${sub.name.toUpperCase()}</span> `;
                });
            } else {
                studentSubjectsHtml = `<span class="text-xs font-medium" style="color: var(--tekst-szary)">Brak przypisanych przedmiotów</span>`;
            }
            list.innerHTML += `
                <div class="karta flex flex-col sm:flex-row justify-between items-start gap-4 sm:gap-0">
                    <div class="space-y-2">
                        <h4 class="font-extrabold text-lg md:text-xl">${student.name}</h4>
                        <div class="flex flex-wrap gap-1">${studentSubjectsHtml}</div>
                    </div>
                    <div class="flex flex-wrap sm:flex-col gap-3 sm:gap-2 w-full sm:w-auto text-center sm:text-right">
                        <button onclick="editStudent('${student.id}')" class="text-sm font-bold hover:underline flex-1 sm:flex-none" style="color: var(--akcent)">Edytuj</button>
                        <button onclick="toggleArchiveStudent('${student.id}')" class="text-sm font-bold hover:underline flex-1 sm:flex-none" style="color: var(--tekst-szary)">Zarchiwizuj</button>
                        <button onclick="deleteStudent('${student.id}')" class="text-sm font-bold text-rose-500 hover:underline flex-1 sm:flex-none">Usuń</button>
                    </div>
                </div>`;
        });
    }

    // Render Zarchiwizowanych
    if(archivedStudents.length > 0) {
        archivedSection.classList.remove('hidden');
        archivedStudents.forEach(student => {
            archivedList.innerHTML += `
                <div class="karta flex flex-col sm:flex-row justify-between items-start gap-4 sm:gap-0" style="background-color: var(--jasny)">
                    <div class="space-y-1">
                        <h4 class="font-extrabold text-lg md:text-xl" style="color: var(--tekst-szary)">${student.name}</h4>
                        <span class="text-xs font-bold px-2 py-1 rounded-md text-white border bg-slate-400 border-slate-500">ARCHIWUM</span>
                    </div>
                    <div class="flex flex-wrap sm:flex-col gap-3 sm:gap-2 w-full sm:w-auto text-center sm:text-right">
                        <button onclick="toggleArchiveStudent('${student.id}')" class="text-sm font-bold hover:underline flex-1 sm:flex-none" style="color: var(--akcent)">Przywróć</button>
                        <button onclick="deleteStudent('${student.id}')" class="text-sm font-bold text-rose-500 hover:underline flex-1 sm:flex-none">Usuń na zawsze</button>
                    </div>
                </div>`;
        });
    } else {
        archivedSection.classList.add('hidden');
    }
}

async function toggleArchiveStudent(id) {
    let student = students.find(s => s.id == id);
    if(student) {
        let action = student.archived ? "przywrócić ucznia do aktywnych" : "przenieść ucznia do archiwum";
        if(await showConfirm('Archiwum', `Czy na pewno chcesz ${action}? Jego lekcje w historii pozostaną nienaruszone.`)) {
            student.archived = !student.archived;
            saveToCloud();
            renderStudents();
            renderDashboard(); 
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
                <span class="font-bold flex items-center gap-2">
                    <div class="w-3 h-3 rounded-full" style="background-color:${sub.color}"></div> ${sub.name}
                </span>
            </label>`;
    });
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
                <span class="font-bold flex items-center gap-2">
                    <div class="w-3 h-3 rounded-full" style="background-color:${sub.color}"></div> ${sub.name}
                </span>
            </label>`;
    });
    document.getElementById('modal-student').setAttribute('data-editing-id', id);
    document.getElementById('modal-student').classList.remove('hidden');
}
async function saveStudent() {
    const name = document.getElementById('student-name').value;
    const editingId = document.getElementById('modal-student').getAttribute('data-editing-id');
    if(!name) return await customAlert('Błąd', 'Wpisz imię ucznia!');
    let selectedSubjects = [];
    document.querySelectorAll('.student-subject-cb:checked').forEach(cb => selectedSubjects.push(cb.value));
    if(editingId) {
        let student = students.find(s => s.id == editingId);
        student.name = name; student.subjectIds = selectedSubjects;
    } else {
        students.push({ id: Date.now().toString(), name, subjectIds: selectedSubjects, archived: false });
    }
    saveToCloud(); closeModals(); renderStudents();
}
async function deleteStudent(id) {
    if(await showConfirm('Usuwanie Ucznia', 'Na pewno usunąć ucznia i wszystkie jego zaplanowane lekcje? Zamiast tego możesz go po prostu zarchiwizować!', true)) {
        students = students.filter(s => s.id != id);
        lessons = lessons.filter(l => l.studentId != id);
        saveToCloud(); renderStudents(); renderDashboard();
    }
}

// --- PULPIT ---
function renderDashboard() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const todayString = now.toISOString().split('T')[0];
    const nowTime = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');
    const monthNames = ["Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec", "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"];
    const monthsGenitive = ["stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca", "lipca", "sierpnia", "września", "października", "listopada", "grudnia"];
    
    document.getElementById('pulpit-month-title').innerText = `Zarobki - ${monthNames[currentMonth]}`;

    let earnings = 0, lessonsThisMonth = 0, unpaidTotal = 0, unpaidCount = 0;
    let plannedEarnings = 0; 
    
    lessons.forEach(l => {
        let lDate = new Date(l.date);
        let price = Number(l.price || 0);
        
        if(!l.cancelled) {
            if(lDate.getMonth() === currentMonth && lDate.getFullYear() === currentYear) {
                lessonsThisMonth++;
                if(l.paid) earnings += price;
                else plannedEarnings += price; 
            }
            if(!l.paid && (l.date < todayString || (l.date === todayString && l.endTime < nowTime))) {
                unpaidTotal += price;
                unpaidCount++;
            }
        }
    });

    document.getElementById('dashboard-monthly-earnings').innerText = `${earnings} zł`;
    document.getElementById('dashboard-planned-earnings').innerText = `(w planach: +${plannedEarnings} zł)`;
    document.getElementById('dashboard-monthly-lessons').innerText = `${lessonsThisMonth} lekcji`;
    document.getElementById('dashboard-unpaid-sum').innerText = `${unpaidTotal} zł`;
    document.getElementById('dashboard-unpaid-count').innerText = `${unpaidCount} zaległych lekcji`;
    
    // Liczymy tylko aktywnych uczniów
    document.getElementById('dashboard-active-students').innerText = students.filter(s => !s.archived).length;

    let upcomingLessons = lessons.filter(l => !l.cancelled && (l.date > todayString || (l.date === todayString && l.endTime >= nowTime)));
    upcomingLessons.sort((a,b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
    
    const upcomingContainer = document.getElementById('pulpit-upcoming-lessons');
    upcomingContainer.innerHTML = '';
    
    if(upcomingLessons.length === 0) {
        upcomingContainer.innerHTML = '<p class="text-sm md:text-base" style="color: var(--tekst-szary)">Brak zaplanowanych lekcji.</p>';
    } else {
        upcomingLessons.slice(0, 5).forEach(l => {
            let student = students.find(s => s.id == l.studentId) || {name: 'Nieznany uczeń'};
            let subject = subjects.find(s => s.id == l.subjectId);
            let lDate = new Date(l.date);
            let dayNames = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'];
            let dateDisplay = l.date === todayString ? 'Dzisiaj' : `${dayNames[lDate.getDay()]}, ${lDate.getDate()} ${monthsGenitive[lDate.getMonth()]}`;
            let badge = subject ? `<span class="text-[9px] md:text-[10px] font-bold px-1.5 md:px-2 py-1 rounded border" style="background-color: ${hexToRgba(subject.color, 0.2)}; color: ${subject.color}; border-color: ${subject.color}">${subject.name.toUpperCase()}</span>` : '';

            upcomingContainer.innerHTML += `
                <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 md:p-4 rounded-xl border-2 cursor-pointer transition shadow-sm hover:shadow-md gap-2 sm:gap-0" style="background-color: var(--karta-bg); border-color: var(--szary-ramka)" onclick="editLesson('${l.id}')">
                    <div class="flex items-center gap-3 md:gap-4">
                        <div class="w-8 h-8 md:w-10 h-10 rounded-full flex items-center justify-center font-bold border text-sm md:text-base" style="background-color: var(--jasny); border-color: var(--szary-ramka); color: var(--tekst-szary)">🕒</div>
                        <div>
                            <div class="font-extrabold text-sm md:text-base">${student.name}</div>
                            <div class="text-xs md:text-sm font-medium" style="color: var(--tekst-szary)">${dateDisplay}, ${l.startTime}</div>
                        </div>
                    </div>
                    <div>${badge}</div>
                </div>`;
        });
    }

    let unpaidLessons = lessons.filter(l => !l.cancelled && !l.paid && (l.date < todayString || (l.date === todayString && l.endTime < nowTime)));
    unpaidLessons.sort((a,b) => (b.date + b.startTime).localeCompare(a.date + a.startTime)); 
    
    const unpaidContainer = document.getElementById('pulpit-unpaid-lessons');
    unpaidContainer.innerHTML = '';
    if(unpaidLessons.length === 0) {
        unpaidContainer.innerHTML = `<div class="border-2 p-4 md:p-6 rounded-xl text-center" style="background-color: rgba(16, 185, 129, 0.1); border-color: rgba(16, 185, 129, 0.3)"><div class="text-2xl md:text-3xl mb-1 md:mb-2">🎉</div><p class="text-emerald-500 font-bold text-sm md:text-base">Uczniowie nie mają zaległości.</p></div>`;
    } else {
        unpaidLessons.slice(0, 5).forEach(l => {
            let student = students.find(s => s.id == l.studentId) || {name: 'Nieznany uczeń'};
            unpaidContainer.innerHTML += `
                <div class="flex justify-between items-center p-3 rounded-xl cursor-pointer border-2 transition" style="background-color: rgba(244, 63, 94, 0.05); border-color: rgba(244, 63, 94, 0.2)" onclick="editLesson('${l.id}')">
                    <div>
                        <div class="font-bold text-sm md:text-base">${student.name}</div>
                        <div class="text-[10px] md:text-xs font-medium text-rose-500">${l.date} | ${l.startTime}</div>
                    </div>
                    <div class="flex items-center gap-3">
                        <div class="font-extrabold text-rose-500 text-sm md:text-base">${l.price || 0} zł</div>
                        <button onclick="markAsPaid('${l.id}', event)" class="px-2 py-1 rounded-lg border-2 text-[10px] md:text-xs font-bold shadow-sm bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-200 transition whitespace-nowrap">Zapłacone</button>
                    </div>
                </div>`;
        });
    }

    const weekContainer = document.getElementById('pulpit-week-view');
    weekContainer.innerHTML = '';
    const mondayString = getMonday(now).toISOString().split('T')[0];
    let sundayDate = new Date(getMonday(now));
    sundayDate.setDate(sundayDate.getDate() + 6);
    const sundayString = sundayDate.toISOString().split('T')[0];

    let thisWeekLessons = lessons.filter(l => l.date >= mondayString && l.date <= sundayString);
    thisWeekLessons.sort((a,b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));

    if(thisWeekLessons.length === 0) {
        weekContainer.innerHTML = '<p class="text-sm md:text-base" style="color: var(--tekst-szary)">Pusty grafik na ten tydzień.</p>';
    } else {
        const daysNamesPL = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];
        let lastDay = '';
        
        thisWeekLessons.forEach(l => {
            let lDate = new Date(l.date);
            let dayDisplay = l.date === todayString ? `<span style="color: var(--akcent)">Dzisiaj</span>` : daysNamesPL[lDate.getDay()];
            if(l.date !== lastDay) {
                weekContainer.innerHTML += `<div class="text-xs md:text-sm font-extrabold uppercase tracking-wider mt-4 md:mt-6 mb-2 border-b-2 pb-1" style="border-color: var(--szary-ramka)">${dayDisplay} <span class="font-medium text-[10px] md:text-xs normal-case" style="color: var(--tekst-szary)">(${l.date})</span></div>`;
                lastDay = l.date;
            }

            let student = students.find(s => s.id == l.studentId) || {name: 'Nieznany uczeń'};
            let subject = subjects.find(s => s.id == l.subjectId) || {name: 'Brak', color: '#cbd5e1'};
            
            let statusIcon = '';
            if(l.cancelled) {
                statusIcon = '<span class="px-1.5 md:px-2 py-1 rounded border text-[9px] md:text-xs font-bold shadow-sm" style="background-color: var(--jasny); color: var(--tekst-szary); border-color: var(--szary-ramka)">Odwołana ❌</span>';
            } else if (l.paid) {
                statusIcon = '<span class="px-1.5 md:px-2 py-1 rounded border text-[9px] md:text-xs font-bold shadow-sm text-emerald-600 bg-emerald-50 border-emerald-200">Opłacone</span>';
            } else {
                statusIcon = '<span class="px-1.5 md:px-2 py-1 rounded border text-[9px] md:text-xs font-bold shadow-sm text-rose-500 bg-rose-50 border-rose-200">Brak</span>';
            }

            let cardOpacity = l.cancelled ? 'opacity: 0.5; filter: grayscale(100%)' : '';
            let lineThrough = l.cancelled ? 'text-decoration: line-through' : '';

            let topicHtml = l.topic ? `<p class="text-[10px] md:text-xs font-medium truncate mt-0.5" style="color: var(--tekst-szary)">📝 ${l.topic}</p>` : '';

            weekContainer.innerHTML += `
                <div class="flex items-center justify-between p-3 md:p-4 rounded-xl border-2 cursor-pointer transition shadow-[2px_2px_0_var(--ciemny)] hover:-translate-y-0.5 gap-2 md:gap-4" style="background-color: var(--karta-bg); border-color: var(--ciemny); ${cardOpacity}" onclick="editLesson('${l.id}')">
                    <div class="flex items-center gap-3 md:gap-4 truncate">
                        <div class="w-1.5 h-10 md:h-12 rounded-full shrink-0" style="background-color: ${subject.color}"></div>
                        <div class="truncate">
                            <p class="font-extrabold text-sm md:text-base" style="${lineThrough}">${l.startTime} - ${l.endTime}</p>
                            <p class="text-xs md:text-sm font-medium truncate" style="color: var(--tekst-szary)">${student.name} <span class="text-[8px] md:text-[10px] font-bold px-1.5 py-0.5 rounded ml-1 border hidden sm:inline-block" style="background-color: ${hexToRgba(subject.color, 0.2)}; color: ${subject.color}; border-color: ${subject.color}">${subject.name.toUpperCase()}</span></p>
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

// --- KALENDARZ ---
function changeWeek(offset) {
    currentDate = new Date(currentDate.getTime() + offset * 7 * 24 * 60 * 60 * 1000);
    renderCalendar();
}
function goToToday() { currentDate = new Date(); renderCalendar(); }

function renderCalendar() {
    let monday = getMonday(currentDate);
    let sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
    const monthNames = ["Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec", "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"];
    
    document.getElementById('month-year-display').innerText = `${monthNames[sunday.getMonth()]} ${sunday.getFullYear()}`;
    let formatDay = (date) => date.getDate().toString().padStart(2, '0');
    document.getElementById('calendar-week-btn-text').innerText = `${formatDay(monday)} - ${formatDay(sunday)} ${monthNames[sunday.getMonth()].substring(0,3).toUpperCase()}`;

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
        for(let h = settings.startHour; h <= settings.endHour; h++) {
            gridHtml += `<div class="h-24 time-row"></div>`;
        }
        
        let dailyLessons = lessons.filter(l => l.date === dateString);
        dailyLessons.forEach(lesson => {
            let start = lesson.startTime.split(':');
            let end = lesson.endTime.split(':');
            
            if(parseInt(start[0]) < settings.startHour && parseInt(end[0]) <= settings.startHour) return;

            let topPosition = ((parseInt(start[0]) - settings.startHour) * 96) + (parseInt(start[1]) / 60 * 96);
            let height = (((parseInt(end[0]) - parseInt(start[0])) * 96) + ((parseInt(end[1]) - parseInt(start[1])) / 60 * 96));
            
            if(topPosition < 0) { height += topPosition; topPosition = 0; }

            let student = students.find(s => s.id == lesson.studentId) || {name: 'Usunięty'};
            let subject = subjects.find(s => s.id == lesson.subjectId) || {name: '', color: '#cbd5e1'};
            
            let bgColor = hexToRgba(subject.color, 0.15);
            let icon = lesson.cancelled ? '❌' : (lesson.paid ? '✅' : '<span class="text-rose-500 font-extrabold text-xs md:text-sm">!</span>');
            
            let opacityAndStrike = lesson.cancelled ? 'opacity: 0.5; filter: grayscale(100%); text-decoration: line-through;' : '';

            let topicHtml = lesson.topic ? `<div class="truncate text-[8px] md:text-[10px] font-medium mt-0.5" style="color: var(--tekst-glowny)">📝 ${lesson.topic}</div>` : '';

            gridHtml += `
                <div class="absolute w-[94%] left-[3%] rounded-lg md:rounded-xl p-1 md:p-1.5 overflow-hidden shadow-sm hover:shadow-[2px_2px_0_var(--ciemny)] hover:-translate-y-0.5 transition cursor-pointer flex flex-col border-l-2 md:border-l-4 border" 
                     style="top: ${topPosition}px; height: ${height}px; background-color: ${bgColor}; border-left-color: ${subject.color}; border-color: ${subject.color}; ${opacityAndStrike}"
                     onclick="editLesson('${lesson.id}')">
                    <div class="font-bold flex justify-between text-[9px] md:text-xs mb-0.5" style="color: ${subject.color}">
                        <span class="whitespace-nowrap tracking-tighter md:tracking-normal">${lesson.startTime}-${lesson.endTime}</span>
                        <span title="Status" class="hidden md:inline">${icon}</span>
                    </div>
                    <div class="font-extrabold truncate leading-tight text-[11px] md:text-sm">${student.name}</div>
                    <div class="font-bold truncate mt-auto text-[8px] md:text-[9px] uppercase tracking-wider" style="color: var(--tekst-szary)">${subject.name}</div>
                    ${topicHtml}
                </div>`;
        });
        gridHtml += `</div>`;
    }
    document.getElementById('calendar-grid').innerHTML = gridHtml;
    updateCurrentTimeLine();
}

function updateCurrentTimeLine() {
    const line = document.getElementById('current-time-line');
    if(!line) return;
    const now = new Date();
    const monday = getMonday(currentDate);
    const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
    
    if (now >= monday && now <= new Date(sunday.setHours(23,59,59))) {
        line.classList.remove('hidden');
        let hours = now.getHours();
        let minutes = now.getMinutes();
        if(hours >= settings.startHour && hours <= settings.endHour) {
            let top = ((hours - settings.startHour) * 96) + (minutes / 60 * 96);
            line.style.top = `${top}px`;
        } else { line.classList.add('hidden'); }
    } else { line.classList.add('hidden'); }
}
setInterval(updateCurrentTimeLine, 60000);

// --- LEKCJE ---
function updateLessonSubjectDropdown() {
    const stId = document.getElementById('lesson-student').value;
    const student = students.find(s => s.id == stId);
    const subjectSelect = document.getElementById('lesson-subject');
    subjectSelect.innerHTML = '';
    if(!student || !student.subjectIds || student.subjectIds.length === 0) {
        subjects.forEach(sub => subjectSelect.innerHTML += `<option value="${sub.id}">${sub.name}</option>`);
    } else {
        student.subjectIds.forEach(subId => {
            let sub = subjects.find(s => s.id == subId);
            if(sub) subjectSelect.innerHTML += `<option value="${sub.id}">${sub.name}</option>`;
        });
    }
}

function openLessonModal() {
    document.getElementById('lesson-modal-title').innerText = 'Zaplanuj lekcję';
    document.getElementById('lesson-id').value = '';
    document.getElementById('lesson-topic').value = ''; 
    
    if(datePicker) datePicker.setDate(new Date().toISOString().split('T')[0]);
    
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
    
    // Filtr: do nowej lekcji pokazujemy tylko aktywnych uczniów
    students.filter(s => !s.archived).forEach(s => {
        selectStudent.innerHTML += `<option value="${s.id}">${s.name}</option>`;
    });

    document.getElementById('lesson-subject').innerHTML = '<option value="">Wybierz ucznia najpierw...</option>';
    document.getElementById('modal-lesson').classList.remove('hidden');
}

function editLesson(id) {
    const lesson = lessons.find(l => l.id == id);
    if(!lesson) return;
    document.getElementById('lesson-modal-title').innerText = 'Szczegóły lekcji';
    document.getElementById('lesson-id').value = lesson.id;
    document.getElementById('lesson-topic').value = lesson.topic || ''; 
    
    if(datePicker) datePicker.setDate(lesson.date);
    
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
    
    // Przy edycji musimy pokazać zarchiwizowanych, jeśli lekcja należy do któregoś z nich
    students.forEach(s => {
        if(!s.archived || s.id == lesson.studentId) {
            selectStudent.innerHTML += `<option value="${s.id}" ${s.id == lesson.studentId ? 'selected' : ''}>${s.name}</option>`;
        }
    });

    updateLessonSubjectDropdown();
    if(lesson.subjectId) document.getElementById('lesson-subject').value = lesson.subjectId;

    document.getElementById('modal-lesson').classList.remove('hidden');
}

async function saveLesson() {
    const id = document.getElementById('lesson-id').value;
    const studentId = document.getElementById('lesson-student').value;
    const subjectId = document.getElementById('lesson-subject').value;
    const topic = document.getElementById('lesson-topic').value; 
    const date = document.getElementById('lesson-date').value;
    const startTime = document.getElementById('lesson-time-start').value;
    const endTime = document.getElementById('lesson-time-end').value;
    const price = document.getElementById('lesson-price').value;
    const paid = document.getElementById('lesson-paid').checked;
    const cancelled = document.getElementById('lesson-cancelled') ? document.getElementById('lesson-cancelled').checked : false;
    const isRecurring = document.getElementById('lesson-recurring') ? document.getElementById('lesson-recurring').checked : false;

    if(!studentId || !date || !subjectId || !startTime || !endTime) return await customAlert('Błąd', 'Uzupełnij wszystkie wymagane dane (uczeń, przedmiot, data, godziny)!');

    let isConflict = lessons.find(l => {
        if (id && l.id == id) return false; 
        if (l.date !== date) return false;  
        if (l.cancelled) return false;      
        return (startTime < l.endTime && endTime > l.startTime);
    });

    if (isConflict) {
        let conflictStudent = students.find(s => s.id == isConflict.studentId) || {name: 'Ktoś inny'};
        let proceed = await showConfirm('Konflikt godzin!', `Masz już zaplanowaną lekcję w tym czasie:\n${conflictStudent.name} (${isConflict.startTime} - ${isConflict.endTime})\n\nCzy na pewno chcesz zapisać nakładające się zajęcia?`, true);
        if (!proceed) return;
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
            originalLesson.price != price 
        );

        let futureLessons = [];
        if (isStructureChanged) {
            futureLessons = lessons.filter(l => {
                if (l.id == id || l.date < oldDate) return false;
                if (originalLesson.groupId && l.groupId === originalLesson.groupId) return true;
                if (!originalLesson.groupId && l.studentId == originalLesson.studentId && l.subjectId == originalLesson.subjectId && l.startTime == originalLesson.startTime) {
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
                    fl.studentId = studentId;
                    fl.subjectId = subjectId;
                    fl.startTime = startTime;
                    fl.endTime = endTime;
                    fl.price = price;
                    fl.topic = topic; 
                    if (dateDiff !== 0) {
                        let fd = new Date(fl.date);
                        fd.setDate(fd.getDate() + dateDiff);
                        fl.date = fd.toISOString().split('T')[0];
                    }
                });
            } else if (choice === 'single') {
            } else { return; }
        }

        originalLesson.studentId = studentId;
        originalLesson.subjectId = subjectId;
        originalLesson.topic = topic;
        originalLesson.date = date;
        originalLesson.startTime = startTime;
        originalLesson.endTime = endTime;
        originalLesson.price = price;
        originalLesson.paid = paid;
        originalLesson.cancelled = cancelled;

    } else {
        const repetitions = isRecurring ? 156 : 1; 
        let baseDate = new Date(date);
        let newGroupId = "grp_" + Date.now().toString() + Math.floor(Math.random() * 1000); 

        for(let i=0; i<repetitions; i++) {
            let lessonDate = new Date(baseDate);
            lessonDate.setDate(baseDate.getDate() + (i * 7));
            lessons.push({
                id: Date.now().toString() + Math.floor(Math.random() * 1000) + i,
                groupId: isRecurring ? newGroupId : null,
                studentId, subjectId, topic, date: lessonDate.toISOString().split('T')[0],
                startTime, endTime, price, cancelled: false,
                paid: (paid && i === 0) ? true : false
            });
        }
    }
    saveToCloud(); closeModals(); renderCalendar();
    if(!document.getElementById('view-pulpit').classList.contains('hidden')) renderDashboard();
}

async function deleteLesson() {
    const id = document.getElementById('lesson-id').value;
    let originalLesson = lessons.find(l => l.id == id);
    
    let futureLessons = lessons.filter(l => {
        if (l.id == id || l.date < originalLesson.date) return false;
        if (originalLesson.groupId && l.groupId === originalLesson.groupId) return true;
        if (!originalLesson.groupId && l.studentId == originalLesson.studentId && l.subjectId == originalLesson.subjectId && l.startTime == originalLesson.startTime) {
            return new Date(l.date).getDay() === new Date(originalLesson.date).getDay();
        }
        return false;
    });

    if (futureLessons.length > 0) {
        let choice = await showSeriesChoice('Usuwanie cyklu', 'Wybierz zakres usuwania. Zamiast usuwać, możesz zaznaczyć lekcję jako Odwołaną.', true);
        if (choice === 'single') {
            lessons = lessons.filter(l => l.id != id);
        } else if (choice === 'future') {
            let idsToDelete = futureLessons.map(f => f.id);
            idsToDelete.push(id);
            lessons = lessons.filter(l => !idsToDelete.includes(l.id));
        } else {
            return; 
        }
    } else {
        if(!await showConfirm('Usuwanie lekcji', 'Na pewno całkowicie USUNĄĆ tę lekcję? (Możesz też po prostu zaznaczyć ją jako odwołaną)', true)) return;
        lessons = lessons.filter(l => l.id != id);
    }
    
    saveToCloud(); closeModals(); renderCalendar();
    if(!document.getElementById('view-pulpit').classList.contains('hidden')) renderDashboard();
}

// --- ZAROBKI ---
function processEarningsData(lessonsArray) {
    let total = 0;
    let byStudent = {};
    let bySubject = {};

    lessonsArray.forEach(l => {
        if(l.paid && !l.cancelled) {
            let price = Number(l.price || 0);
            total += price;

            let student = students.find(s => s.id == l.studentId);
            let studentName = student ? student.name : 'Nieznany uczeń';
            byStudent[studentName] = (byStudent[studentName] || 0) + price;

            let subject = subjects.find(s => s.id == l.subjectId);
            let subjectName = subject ? subject.name : 'Inne';
            let subjectColor = subject ? subject.color : settings.accent;

            if(!bySubject[subjectName]) bySubject[subjectName] = {val: 0, color: subjectColor};
            bySubject[subjectName].val += price;
        }
    });

    let studentArr = Object.keys(byStudent).map(k => ({name: k, val: byStudent[k]})).sort((a,b) => b.val - a.val);
    let subjectArr = Object.keys(bySubject).map(k => ({name: k, val: bySubject[k].val, color: bySubject[k].color})).sort((a,b) => b.val - a.val);

    return { total, studentArr, subjectArr };
}

function renderChart(canvasId, type, dataArr) {
    if(chartInstances[canvasId]) chartInstances[canvasId].destroy();
    const ctx = document.getElementById(canvasId).getContext('2d');

    if(dataArr.length === 0) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        return;
    }

    const borderColor = getComputedStyle(document.documentElement).getPropertyValue('--ciemny').trim();

    chartInstances[canvasId] = new Chart(ctx, {
        type: type,
        data: {
            labels: dataArr.map(d => d.name),
            datasets: [{
                data: dataArr.map(d => d.val),
                backgroundColor: dataArr.map(d => d.color || settings.accent),
                borderColor: borderColor,
                borderWidth: 2,
                borderRadius: type === 'bar' ? 6 : 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: type === 'doughnut', position: 'bottom' } },
            scales: type === 'bar' ? {
                y: { beginAtZero: true, grid: { color: getComputedStyle(document.documentElement).getPropertyValue('--szary-ramka').trim() } },
                x: { grid: { display: false } }
            } : undefined
        }
    });
}

function renderStudentList(containerId, studentArr, total) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    if(studentArr.length === 0) {
        container.innerHTML = '<p class="text-sm" style="color: var(--tekst-szary)">Brak opłaconych lekcji.</p>';
        return;
    }
    studentArr.forEach(item => {
        let width = total > 0 ? Math.max(5, (item.val / total) * 100) : 0;
        container.innerHTML += `
            <div class="mb-3">
                <div class="flex justify-between text-xs md:text-sm font-bold mb-1">
                    <span>${item.name}</span><span style="color: var(--akcent)">${item.val} zł</span>
                </div>
                <div class="w-full rounded-full h-2 md:h-3 border-2" style="background-color: var(--jasny); border-color: var(--szary-ramka)">
                    <div class="h-full rounded-full" style="width: ${width}%; background-color: var(--akcent)"></div>
                </div>
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

function closeModals() {
    document.getElementById('modal-student').classList.add('hidden');
    document.getElementById('modal-lesson').classList.add('hidden');
    document.getElementById('modal-subject').classList.add('hidden');
}
