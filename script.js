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

// Puste listy na start
let subjects = [];
let students = [];
let lessons = [];

let currentDate = new Date();
const startHour = 7;
const endHour = 22;

// --- POBIERANIE DANYCH ---
db.collection("moj_lekcyjnik").doc("baza_danych").get().then((doc) => {
    if (doc.exists) {
        subjects = doc.data().subjects || [];
        students = doc.data().students || [];
        lessons = doc.data().lessons || [];
    }
    switchTab('pulpit');
}).catch((error) => {
    console.error("Błąd połączenia z bazą:", error);
    switchTab('pulpit'); 
});

// --- ZAPIS ---
function saveToCloud() {
    db.collection("moj_lekcyjnik").doc("baza_danych").set({
        subjects: subjects,
        students: students,
        lessons: lessons
    });
}

// --- NAWIGACJA ---
function switchTab(tabName) {
    document.getElementById('view-pulpit').classList.add('hidden');
    document.getElementById('view-kalendarz').classList.add('hidden');
    document.getElementById('view-uczniowie').classList.add('hidden');
    document.getElementById('view-przedmioty').classList.add('hidden');
    document.getElementById('view-zarobki').classList.add('hidden');
    
    document.querySelectorAll('.nav-tab').forEach(btn => {
        btn.className = "nav-tab text-slate-500 hover:text-slate-900 font-medium px-4 py-2 rounded-full transition whitespace-nowrap";
    });

    document.getElementById(`view-${tabName}`).classList.remove('hidden');
    document.getElementById(`tab-${tabName}`).className = "nav-tab bg-indigo-600 text-white shadow-[2px_2px_0_#1e293b] border-2 border-slate-800 font-bold px-6 py-2 rounded-full transition whitespace-nowrap";

    if(tabName === 'pulpit') renderDashboard();
    if(tabName === 'kalendarz') renderCalendar();
    if(tabName === 'uczniowie') renderStudents();
    if(tabName === 'przedmioty') renderSubjects();
    if(tabName === 'zarobki') {
        const now = new Date();
        document.getElementById('earnings-month-picker').value = `${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2, '0')}`;
        renderZarobki();
    }
}

function getMonday(d) {
    d = new Date(d);
    let day = d.getDay(), diff = d.getDate() - day + (day === 0 ? -6 : 1); 
    return new Date(d.setDate(diff));
}

function hexToRgba(hex, alpha) {
    if(!hex) return `rgba(200, 200, 200, ${alpha})`;
    let r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// --- PRZEDMIOTY ---
function renderSubjects() {
    const list = document.getElementById('subjects-list');
    list.innerHTML = '';
    if(subjects.length === 0) {
        list.innerHTML = '<p class="text-slate-500 font-medium">Brak przedmiotów. Dodaj pierwszy!</p>';
        return;
    }
    subjects.forEach(sub => {
        list.innerHTML += `
            <div class="bg-white p-5 rounded-xl shadow-[4px_4px_0_#1e293b] border-2 border-slate-800 flex justify-between items-center cursor-pointer hover:-translate-y-1 transition" onclick="editSubject('${sub.id}')">
                <div class="flex items-center gap-3">
                    <div class="w-6 h-6 rounded-md border border-slate-300" style="background-color: ${sub.color}"></div>
                    <h4 class="font-bold text-lg text-slate-900">${sub.name}</h4>
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
    const sub = subjects.find(s => s.id === id);
    if(!sub) return;
    document.getElementById('subject-id').value = sub.id;
    document.getElementById('subject-name').value = sub.name;
    document.getElementById('subject-color').value = sub.color;
    document.getElementById('btn-delete-subject').classList.remove('hidden');
    document.getElementById('modal-subject').classList.remove('hidden');
}

function saveSubject() {
    const id = document.getElementById('subject-id').value;
    const name = document.getElementById('subject-name').value;
    const color = document.getElementById('subject-color').value;
    if(!name) return alert('Wpisz nazwę przedmiotu!');

    if(id) {
        let sub = subjects.find(s => s.id === id);
        sub.name = name;
        sub.color = color;
    } else {
        subjects.push({ id: Date.now().toString(), name, color });
    }
    saveToCloud();
    closeModals();
    renderSubjects();
}

function deleteSubject() {
    const id = document.getElementById('subject-id').value;
    if(confirm('Usunąć ten przedmiot?')) {
        subjects = subjects.filter(s => s.id !== id);
        saveToCloud();
        closeModals();
        renderSubjects();
    }
}

// --- UCZNIOWIE ---
function renderStudents() {
    const list = document.getElementById('students-list');
    list.innerHTML = '';
    
    if(students.length === 0) {
        list.innerHTML = '<p class="text-slate-500 font-medium">Brak uczniów. Dodaj kogoś!</p>';
        return;
    }

    students.forEach(student => {
        let studentSubjectsHtml = '';
        if(student.subjectIds && student.subjectIds.length > 0) {
            student.subjectIds.forEach(subId => {
                let sub = subjects.find(s => s.id === subId);
                if(sub) {
                    studentSubjectsHtml += `<span class="text-xs font-bold px-2 py-1 rounded-md text-white border border-slate-800" style="background-color: ${sub.color}">${sub.name.toUpperCase()}</span> `;
                }
            });
        } else {
            studentSubjectsHtml = `<span class="text-xs text-slate-400 font-medium">Brak przypisanych przedmiotów</span>`;
        }

        list.innerHTML += `
            <div class="bg-white p-5 rounded-xl shadow-[4px_4px_0_#1e293b] border-2 border-slate-800 flex justify-between items-start">
                <div class="space-y-2">
                    <h4 class="font-extrabold text-xl text-slate-900">${student.name}</h4>
                    <div class="flex flex-wrap gap-1">${studentSubjectsHtml}</div>
                </div>
                <div class="flex flex-col gap-2">
                    <button onclick="editStudent('${student.id}')" class="text-sm font-bold text-indigo-600 hover:underline">Edytuj</button>
                    <button onclick="deleteStudent('${student.id}')" class="text-sm font-bold text-rose-500 hover:underline">Usuń</button>
                </div>
            </div>`;
    });
}

function openStudentModal() {
    document.getElementById('student-name').value = '';
    
    // Generowanie listy checkboxów z przedmiotami
    const container = document.getElementById('student-subjects-container');
    container.innerHTML = '';
    if(subjects.length === 0) {
        container.innerHTML = '<p class="text-sm text-rose-500 font-bold">Najpierw dodaj przedmioty w zakładce "Przedmioty"!</p>';
    } else {
        subjects.forEach(sub => {
            container.innerHTML += `
                <label class="flex items-center gap-3 p-2 hover:bg-white rounded-lg cursor-pointer transition">
                    <input type="checkbox" value="${sub.id}" class="student-subject-cb w-5 h-5 accent-indigo-600 rounded">
                    <span class="font-bold text-slate-800 flex items-center gap-2">
                        <div class="w-3 h-3 rounded-full" style="background-color:${sub.color}"></div>
                        ${sub.name}
                    </span>
                </label>`;
        });
    }
    
    // Zapisujemy, że to nowy uczeń (brak ukrytego ID w HTML, więc zrobimy to zmienną globalną dla prostoty lub podepniemy pod onclick)
    document.getElementById('modal-student').setAttribute('data-editing-id', '');
    document.getElementById('modal-student').classList.remove('hidden');
}

function editStudent(id) {
    const student = students.find(s => s.id === id);
    if(!student) return;
    
    document.getElementById('student-name').value = student.name;
    
    const container = document.getElementById('student-subjects-container');
    container.innerHTML = '';
    subjects.forEach(sub => {
        let isChecked = (student.subjectIds || []).includes(sub.id) ? 'checked' : '';
        container.innerHTML += `
            <label class="flex items-center gap-3 p-2 hover:bg-white rounded-lg cursor-pointer transition">
                <input type="checkbox" value="${sub.id}" class="student-subject-cb w-5 h-5 accent-indigo-600 rounded" ${isChecked}>
                <span class="font-bold text-slate-800 flex items-center gap-2">
                    <div class="w-3 h-3 rounded-full" style="background-color:${sub.color}"></div>
                    ${sub.name}
                </span>
            </label>`;
    });

    document.getElementById('modal-student').setAttribute('data-editing-id', id);
    document.getElementById('modal-student').classList.remove('hidden');
}

function saveStudent() {
    const name = document.getElementById('student-name').value;
    const editingId = document.getElementById('modal-student').getAttribute('data-editing-id');
    if(!name) return alert('Wpisz imię!');

    let selectedSubjects = [];
    document.querySelectorAll('.student-subject-cb:checked').forEach(cb => {
        selectedSubjects.push(cb.value);
    });

    if(editingId) {
        let student = students.find(s => s.id === editingId);
        student.name = name;
        student.subjectIds = selectedSubjects;
    } else {
        students.push({ id: Date.now().toString(), name, subjectIds: selectedSubjects });
    }
    
    saveToCloud();
    closeModals();
    renderStudents();
}

function deleteStudent(id) {
    if(confirm('Na pewno usunąć ucznia i jego wszystkie lekcje?')) {
        students = students.filter(s => s.id !== id);
        lessons = lessons.filter(l => l.studentId !== id);
        saveToCloud();
        renderStudents();
    }
}

// --- PULPIT (NOWY WYGLĄD) ---
function renderDashboard() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const todayString = now.toISOString().split('T')[0];
    const nowTime = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');

    // Miesiace po polsku do tytułu
    const monthsGenitive = ["styczniu", "lutym", "marcu", "kwietniu", "maju", "czerwcu", "lipcu", "sierpniu", "wrześniu", "październiku", "listopadzie", "grudniu"];
    document.getElementById('pulpit-month-title').innerText = `Zarobki w ${monthsGenitive[currentMonth]}`;

    // Obliczenia do kafelków
    let earnings = 0, lessonsThisMonth = 0, unpaidTotal = 0, unpaidCount = 0;
    
    lessons.forEach(l => {
        let lDate = new Date(l.date);
        let price = Number(l.price || 0);
        
        // Zliczanie w obecnym miesiącu
        if(lDate.getMonth() === currentMonth && lDate.getFullYear() === currentYear) {
            lessonsThisMonth++;
            if(l.paid) earnings += price;
        }
        
        // Zliczanie zaległości (wszystkie przeszłe nieopłacone)
        if(!l.paid && (l.date < todayString || (l.date === todayString && l.startTime < nowTime))) {
            unpaidTotal += price;
            unpaidCount++;
        }
    });

    document.getElementById('dashboard-monthly-earnings').innerText = `${earnings} zł`;
    document.getElementById('dashboard-monthly-lessons').innerText = `${lessonsThisMonth} lekcji w tym miesiącu`;
    
    document.getElementById('dashboard-unpaid-sum').innerText = `${unpaidTotal} zł`;
    document.getElementById('dashboard-unpaid-count').innerText = `${unpaidCount} zaległych lekcji łącznie`;
    
    document.getElementById('dashboard-active-students').innerText = students.length;

    // Nadchodzące lekcje (lista na lewo)
    let upcomingLessons = lessons.filter(l => l.date > todayString || (l.date === todayString && l.startTime >= nowTime));
    upcomingLessons.sort((a,b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
    
    const upcomingContainer = document.getElementById('pulpit-upcoming-lessons');
    upcomingContainer.innerHTML = '';
    
    if(upcomingLessons.length === 0) {
        upcomingContainer.innerHTML = '<p class="text-slate-500 font-medium">Brak zaplanowanych lekcji.</p>';
    } else {
        // Pokażmy maksymalnie 5 kolejnych
        upcomingLessons.slice(0, 5).forEach(l => {
            let student = students.find(s => s.id === l.studentId) || {name: 'Nieznany'};
            let subject = subjects.find(s => s.id === l.subjectId);
            
            // Formatowanie daty dla czytelności
            let lDate = new Date(l.date);
            let dayNames = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'];
            let dateDisplay = `${dayNames[lDate.getDay()]}, ${lDate.getDate()} ${monthsGenitive[lDate.getMonth()]}`;
            if(l.date === todayString) dateDisplay = 'Dzisiaj';

            let badge = subject 
                ? `<span class="text-[10px] font-bold px-2 py-1 rounded border border-slate-200" style="background-color: ${hexToRgba(subject.color, 0.1)}; color: ${subject.color}">${subject.name.toUpperCase()}</span>` 
                : '';

            upcomingContainer.innerHTML += `
                <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border-2 border-slate-200 rounded-xl bg-white gap-3 cursor-pointer hover:border-indigo-400 transition" onclick="editLesson('${l.id}')">
                    <div class="flex items-center gap-4">
                        <div class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold border border-slate-200 shadow-sm text-lg">
                            🕒
                        </div>
                        <div>
                            <div class="font-extrabold text-slate-900">${student.name}</div>
                            <div class="text-sm text-slate-500 font-medium">${dateDisplay}, ${l.startTime}</div>
                        </div>
                    </div>
                    <div>${badge}</div>
                </div>`;
        });
    }

    // Zaległości płatnicze (lista na prawo)
    let unpaidLessons = lessons.filter(l => !l.paid && (l.date < todayString || (l.date === todayString && l.startTime < nowTime)));
    unpaidLessons.sort((a,b) => (b.date + b.startTime).localeCompare(a.date + a.startTime)); // od najnowszych zaległych
    
    const unpaidContainer = document.getElementById('pulpit-unpaid-lessons');
    unpaidContainer.innerHTML = '';

    if(unpaidLessons.length === 0) {
        unpaidContainer.innerHTML = `
            <div class="bg-emerald-50 border-2 border-emerald-200 p-6 rounded-xl text-center">
                <div class="text-3xl mb-2">🎉</div>
                <p class="text-emerald-700 font-bold">Świetnie! Wszyscy uczniowie są na bieżąco z płatnościami.</p>
            </div>`;
    } else {
        unpaidLessons.slice(0, 5).forEach(l => {
            let student = students.find(s => s.id === l.studentId) || {name: 'Nieznany'};
            unpaidContainer.innerHTML += `
                <div class="flex justify-between items-center p-3 border-2 border-rose-100 bg-rose-50 rounded-xl cursor-pointer hover:border-rose-300 transition" onclick="editLesson('${l.id}')">
                    <div>
                        <div class="font-bold text-slate-900">${student.name}</div>
                        <div class="text-xs font-medium text-rose-600">${l.date} | ${l.startTime}</div>
                    </div>
                    <div class="font-extrabold text-rose-600">${l.price || 0} zł</div>
                </div>`;
        });
    }
}

// --- KALENDARZ ---
function renderCalendar() {
    let monday = getMonday(currentDate);
    let sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const monthNames = ["Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec", "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"];
    document.getElementById('month-year-display').innerText = `${monthNames[sunday.getMonth()]} ${sunday.getFullYear()}`;
    
    let formatDay = (date) => date.getDate().toString().padStart(2, '0');
    document.getElementById('calendar-week-btn-text').innerText = `${formatDay(monday)} - ${formatDay(sunday)} ${monthNames[sunday.getMonth()].substring(0,3).toUpperCase()}`;

    const daysNames = ['PON.', 'WT.', 'ŚR.', 'CZW.', 'PT.', 'SOB.', 'NIEDZ.'];
    let headerHtml = '<div class="border-r-2 border-slate-800 p-2 w-16 shrink-0 bg-white"></div>';
    
    for(let i=0; i<7; i++) {
        let dayDate = new Date(monday);
        dayDate.setDate(monday.getDate() + i);
        let isToday = dayDate.toDateString() === new Date().toDateString();
        let circleClass = isToday ? "bg-indigo-600 text-white shadow-[2px_2px_0_#1e293b] border-2 border-slate-800" : "text-slate-800";
        let textClass = isToday ? "text-indigo-600" : "text-slate-500";
        
        headerHtml += `
            <div class="text-center py-3 border-r-2 border-slate-800 day-col flex-1 bg-white">
                <div class="text-xs font-extrabold ${textClass} mb-2 tracking-wider">${daysNames[i]}</div>
                <div class="mx-auto w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-full font-extrabold text-lg md:text-xl ${circleClass}">
                    ${dayDate.getDate()}
                </div>
            </div>`;
    }
    document.getElementById('calendar-header').innerHTML = headerHtml;

    let gridHtml = `<div class="border-r-2 border-slate-800 relative w-16 shrink-0 bg-white z-10">`;
    for(let h=startHour; h<=endHour; h++) {
        gridHtml += `<div class="h-16 time-row text-xs text-slate-400 text-right pr-2 pt-1 font-bold">${h}:00</div>`;
    }
    gridHtml += `</div>`;

    for(let i=0; i<7; i++) {
        let dayDate = new Date(monday);
        dayDate.setDate(monday.getDate() + i);
        let dateString = dayDate.toISOString().split('T')[0];

        gridHtml += `<div class="relative day-col flex-1 border-r-2 border-slate-100 last:border-r-0" data-date="${dateString}">`;
        for(let h=startHour; h<=endHour; h++) {
            gridHtml += `<div class="h-16 time-row"></div>`;
        }
        
        let dailyLessons = lessons.filter(l => l.date === dateString);
        dailyLessons.forEach(lesson => {
            let start = lesson.startTime.split(':');
            let end = lesson.endTime.split(':');
            let topPosition = ((parseInt(start[0]) - startHour) * 64) + (parseInt(start[1]) / 60 * 64);
            let height = (((parseInt(end[0]) - parseInt(start[0])) * 64) + ((parseInt(end[1]) - parseInt(start[1])) / 60 * 64));

            let student = students.find(s => s.id === lesson.studentId) || {name: 'Usunięty uczeń'};
            let subject = subjects.find(s => s.id === lesson.subjectId) || {name: 'Brak', color: '#cbd5e1'};
            
            let bgColor = hexToRgba(subject.color, 0.15);
            let icon = lesson.paid ? '✅' : '<span class="text-rose-500">❗</span>';

            gridHtml += `
                <div class="absolute w-[94%] left-[3%] rounded-xl p-2 overflow-hidden shadow-sm hover:shadow-[2px_2px_0_#1e293b] hover:-translate-y-0.5 transition cursor-pointer flex flex-col border-l-4 border-2 border-white" 
                     style="top: ${topPosition}px; height: ${height}px; background-color: ${bgColor}; border-left-color: ${subject.color}; border-color: ${subject.color};"
                     onclick="editLesson('${lesson.id}')">
                    <div class="font-bold flex justify-between text-xs mb-1" style="color: ${subject.color}">
                        <span>${lesson.startTime}</span>
                        <span title="${lesson.paid ? 'Opłacone' : 'Brak wpłaty'}">${icon}</span>
                    </div>
                    <div class="font-extrabold text-slate-900 truncate leading-tight text-sm">${student.name}</div>
                    <div class="text-slate-600 font-bold truncate mt-auto text-[10px] uppercase tracking-wider">${subject.name}</div>
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
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    if (now >= monday && now <= new Date(sunday.setHours(23,59,59))) {
        line.classList.remove('hidden');
        let hours = now.getHours();
        let minutes = now.getMinutes();
        if(hours >= startHour && hours <= endHour) {
            let top = ((hours - startHour) * 64) + (minutes / 60 * 64);
            line.style.top = `${top}px`;
        } else {
            line.classList.add('hidden');
        }
    } else {
        line.classList.add('hidden');
    }
}
setInterval(updateCurrentTimeLine, 60000);

// --- LEKCJE (MODAL) ---
function updateLessonSubjectDropdown() {
    const stId = document.getElementById('lesson-student').value;
    const student = students.find(s => s.id === stId);
    const subjectSelect = document.getElementById('lesson-subject');
    
    subjectSelect.innerHTML = '';
    if(!student || !student.subjectIds || student.subjectIds.length === 0) {
        // Jeśli uczeń nie ma przypisanych przedmiotów, pokaż wszystkie z bazy
        subjects.forEach(sub => {
            subjectSelect.innerHTML += `<option value="${sub.id}">${sub.name}</option>`;
        });
    } else {
        // Pokaż tylko te przypisane do ucznia
        student.subjectIds.forEach(subId => {
            let sub = subjects.find(s => s.id === subId);
            if(sub) subjectSelect.innerHTML += `<option value="${sub.id}">${sub.name}</option>`;
        });
    }
}

function openLessonModal() {
    document.getElementById('lesson-modal-title').innerText = 'Zaplanuj lekcję';
    document.getElementById('lesson-id').value = '';
    document.getElementById('lesson-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('lesson-time-start').value = '15:00';
    document.getElementById('lesson-time-end').value = '16:00';
    document.getElementById('lesson-price').value = '';
    document.getElementById('lesson-paid').checked = false;
    
    document.getElementById('recurring-box').classList.remove('hidden');
    document.getElementById('btn-delete-lesson').classList.add('hidden');

    const selectStudent = document.getElementById('lesson-student');
    selectStudent.innerHTML = '<option value="">Wybierz ucznia...</option>';
    students.forEach(s => {
        selectStudent.innerHTML += `<option value="${s.id}">${s.name}</option>`;
    });

    // Puste przedmioty dopóki nie wybierze ucznia
    document.getElementById('lesson-subject').innerHTML = '<option value="">Wybierz ucznia najpierw...</option>';

    document.getElementById('modal-lesson').classList.remove('hidden');
}

function editLesson(id) {
    const lesson = lessons.find(l => l.id === id);
    if(!lesson) return;

    document.getElementById('lesson-modal-title').innerText = 'Szczegóły lekcji';
    document.getElementById('lesson-id').value = lesson.id;
    document.getElementById('lesson-date').value = lesson.date;
    document.getElementById('lesson-time-start').value = lesson.startTime;
    document.getElementById('lesson-time-end').value = lesson.endTime;
    document.getElementById('lesson-price').value = lesson.price || '';
    document.getElementById('lesson-paid').checked = lesson.paid || false;

    document.getElementById('recurring-box').classList.add('hidden');
    document.getElementById('btn-delete-lesson').classList.remove('hidden');

    const selectStudent = document.getElementById('lesson-student');
    selectStudent.innerHTML = '';
    students.forEach(s => {
        selectStudent.innerHTML += `<option value="${s.id}" ${s.id === lesson.studentId ? 'selected' : ''}>${s.name}</option>`;
    });

    updateLessonSubjectDropdown(); // Aktualizuje listę przedmiotów dla tego ucznia
    // Ustawia zapisany przedmiot (jeśli istnieje)
    if(lesson.subjectId) document.getElementById('lesson-subject').value = lesson.subjectId;

    document.getElementById('modal-lesson').classList.remove('hidden');
}

function saveLesson() {
    const id = document.getElementById('lesson-id').value;
    const studentId = document.getElementById('lesson-student').value;
    const subjectId = document.getElementById('lesson-subject').value;
    const date = document.getElementById('lesson-date').value;
    const startTime = document.getElementById('lesson-time-start').value;
    const endTime = document.getElementById('lesson-time-end').value;
    const price = document.getElementById('lesson-price').value;
    const paid = document.getElementById('lesson-paid').checked;
    const isRecurring = document.getElementById('lesson-recurring') ? document.getElementById('lesson-recurring').checked : false;

    if(!studentId || !date || !subjectId) return alert('Wybierz ucznia, przedmiot i datę!');

    if (id) {
        let lesson = lessons.find(l => l.id === id);
        lesson.studentId = studentId;
        lesson.subjectId = subjectId;
        lesson.date = date;
        lesson.startTime = startTime;
        lesson.endTime = endTime;
        lesson.price = price;
        lesson.paid = paid;
    } else {
        const repetitions = isRecurring ? 156 : 1; 
        let baseDate = new Date(date);

        for(let i=0; i<repetitions; i++) {
            let lessonDate = new Date(baseDate);
            lessonDate.setDate(baseDate.getDate() + (i * 7));
            
            lessons.push({
                id: Date.now().toString() + Math.floor(Math.random() * 1000),
                studentId,
                subjectId,
                date: lessonDate.toISOString().split('T')[0],
                startTime,
                endTime,
                price,
                paid: (paid && i === 0) ? true : false // Tylko pierwsza (obecna) lekcja jest od razu oznaczana jako opłacona z automatu
            });
        }
    }

    saveToCloud();
    closeModals();
    renderCalendar();
    if(!document.getElementById('view-pulpit').classList.contains('hidden')) renderDashboard();
}

function deleteLesson() {
    const id = document.getElementById('lesson-id').value;
    if(confirm('Na pewno usunąć tę lekcję?')) {
        lessons = lessons.filter(l => l.id !== id);
        saveToCloud();
        closeModals();
        renderCalendar();
        if(!document.getElementById('view-pulpit').classList.contains('hidden')) renderDashboard();
    }
}

// --- ZAROBKI ---
function renderZarobki() {
    const monthPicker = document.getElementById('earnings-month-picker').value;
    if(!monthPicker) return;
    
    const [year, month] = monthPicker.split('-');
    
    let total = 0;
    let byStudent = {};
    let bySubject = {};

    lessons.forEach(l => {
        let lDate = new Date(l.date);
        if(lDate.getFullYear() == year && (lDate.getMonth() + 1) == month && l.paid) {
            let price = Number(l.price || 0);
            total += price;
            
            let studentName = (students.find(s => s.id === l.studentId) || {name: 'Nieznany'}).name;
            byStudent[studentName] = (byStudent[studentName] || 0) + price;
            
            let subject = subjects.find(s => s.id === l.subjectId);
            let subjectName = subject ? subject.name : 'Inne';
            let subjectColor = subject ? subject.color : '#8b5cf6';

            if(!bySubject[subjectName]) bySubject[subjectName] = {val: 0, color: subjectColor};
            bySubject[subjectName].val += price;
        }
    });

    const studentContainer = document.getElementById('earnings-by-student');
    studentContainer.innerHTML = '';
    let studentArray = Object.keys(byStudent).map(k => ({name: k, val: byStudent[k]})).sort((a,b) => b.val - a.val);
    
    if(studentArray.length === 0) studentContainer.innerHTML = '<p class="text-slate-500 font-medium">Brak opłaconych lekcji.</p>';
    studentArray.forEach(item => {
        let width = Math.max(10, (item.val / total) * 100);
        studentContainer.innerHTML += `
            <div class="mb-3">
                <div class="flex justify-between text-sm font-bold text-slate-700 mb-1">
                    <span>${item.name}</span><span>${item.val} zł</span>
                </div>
                <div class="w-full bg-slate-100 rounded-full h-3 border border-slate-200">
                    <div class="bg-indigo-600 h-full rounded-full" style="width: ${width}%"></div>
                </div>
            </div>`;
    });

    const subjectContainer = document.getElementById('earnings-by-subject');
    subjectContainer.innerHTML = '';
    let subjectArray = Object.keys(bySubject).map(k => ({name: k, val: bySubject[k].val, color: bySubject[k].color})).sort((a,b) => b.val - a.val);
    
    if(subjectArray.length === 0) subjectContainer.innerHTML = '<p class="text-slate-500 font-medium">Brak opłaconych lekcji.</p>';
    subjectArray.forEach(item => {
        let width = Math.max(10, (item.val / total) * 100);
        subjectContainer.innerHTML += `
            <div class="mb-3">
                <div class="flex justify-between text-sm font-bold text-slate-700 mb-1">
                    <span>${item.name}</span><span>${item.val} zł</span>
                </div>
                <div class="w-full bg-slate-100 rounded-full h-3 border border-slate-200">
                    <div class="h-full rounded-full" style="width: ${width}%; background-color: ${item.color}"></div>
                </div>
            </div>`;
    });
}

function closeModals() {
    document.getElementById('modal-student').classList.add('hidden');
    document.getElementById('modal-lesson').classList.add('hidden');
    document.getElementById('modal-subject').classList.add('hidden');
}
