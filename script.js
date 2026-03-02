// --- KONFIGURACJA FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyBAEop-rCgSrVWKlcf02OTM_vPSxtNFl38",
  authDomain: "lekcyjnik-90745.firebaseapp.com",
  projectId: "lekcyjnik-90745",
  storageBucket: "lekcyjnik-90745.firebasestorage.app",
  messagingSenderId: "2022297919",
  appId: "1:2022297919:web:d00a5f529aa640ead0838a"
};

// Uruchamiamy Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Puste listy na start - zaraz wypełnią się danymi z chmury
let students = [];
let lessons = [];

let currentDate = new Date();
const startHour = 7;
const endHour = 22;

// --- POBIERANIE DANYCH Z CHMURY NA STARCIE ---
db.collection("moj_lekcyjnik").doc("baza_danych").get().then((doc) => {
    if (doc.exists) {
        students = doc.data().students || [];
        lessons = doc.data().lessons || [];
    }
    // Odpalamy pulpit DOPIERO jak pobierzemy dane
    switchTab('pulpit');
}).catch((error) => {
    console.error("Błąd połączenia z bazą:", error);
    switchTab('pulpit'); // Odpalamy mimo to, żeby strona nie była pusta
});

// --- FUNKCJA ZAPISUJĄCA W CHMURZE ---
function saveToCloud() {
    db.collection("moj_lekcyjnik").doc("baza_danych").set({
        students: students,
        lessons: lessons
    });
}

// --- NAWIGACJA ---
function switchTab(tabName) {
    document.getElementById('view-pulpit').classList.add('hidden');
    document.getElementById('view-kalendarz').classList.add('hidden');
    document.getElementById('view-uczniowie').classList.add('hidden');
    document.getElementById('view-zarobki').classList.add('hidden');
    
    document.querySelectorAll('.nav-tab').forEach(btn => {
        btn.className = "nav-tab text-gray-500 hover:text-gray-900 font-medium px-4 py-2 rounded-full transition whitespace-nowrap";
    });

    document.getElementById(`view-${tabName}`).classList.remove('hidden');
    document.getElementById(`tab-${tabName}`).className = "nav-tab bg-indigo-500 text-white shadow-md font-medium px-6 py-2 rounded-full transition whitespace-nowrap";

    if(tabName === 'kalendarz') renderCalendar();
    if(tabName === 'uczniowie') renderStudents();
    if(tabName === 'pulpit') renderDashboard();
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
    let r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// --- KALENDARZ ---
function changeWeek(offset) {
    currentDate.setDate(currentDate.getDate() + (offset * 7));
    renderCalendar();
}

function goToToday() {
    currentDate = new Date();
    renderCalendar();
}

function renderCalendar() {
    let monday = getMonday(currentDate);
    let sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const monthNames = ["Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec", "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"];
    document.getElementById('month-year-display').innerText = `${monthNames[sunday.getMonth()]} ${sunday.getFullYear()}`;
    
    let formatDay = (date) => date.getDate().toString().padStart(2, '0');
    document.getElementById('calendar-week-btn-text').innerText = `${formatDay(monday)} - ${formatDay(sunday)} ${monthNames[sunday.getMonth()].substring(0,3).toUpperCase()}`;

    const daysNames = ['PON.', 'WT.', 'ŚR.', 'CZW.', 'PT.', 'SOB.', 'NIEDZ.'];
    let headerHtml = '<div class="border-r border-gray-100 p-2 w-16 shrink-0 bg-white"></div>';
    
    for(let i=0; i<7; i++) {
        let dayDate = new Date(monday);
        dayDate.setDate(monday.getDate() + i);
        let isToday = dayDate.toDateString() === new Date().toDateString();
        let circleClass = isToday ? "bg-indigo-500 text-white shadow-md" : "text-gray-800";
        
        headerHtml += `
            <div class="text-center py-2 border-r border-gray-100 day-col flex-1 bg-white">
                <div class="text-xs font-bold ${isToday ? 'text-indigo-500' : 'text-gray-400'} mb-1">${daysNames[i]}</div>
                <div class="mx-auto w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full font-bold text-lg md:text-xl ${circleClass}">
                    ${dayDate.getDate()}
                </div>
            </div>`;
    }
    document.getElementById('calendar-header').innerHTML = headerHtml;

    let gridHtml = `<div class="border-r border-gray-100 relative w-16 shrink-0 bg-white z-10">`;
    for(let h=startHour; h<=endHour; h++) {
        gridHtml += `<div class="h-16 time-row text-xs text-gray-400 text-right pr-2 pt-1 font-medium">${h}:00</div>`;
    }
    gridHtml += `</div>`;

    for(let i=0; i<7; i++) {
        let dayDate = new Date(monday);
        dayDate.setDate(monday.getDate() + i);
        let dateString = dayDate.toISOString().split('T')[0];

        gridHtml += `<div class="relative day-col flex-1" data-date="${dateString}">`;
        for(let h=startHour; h<=endHour; h++) {
            gridHtml += `<div class="h-16 time-row border-r border-gray-50 last:border-r-0"></div>`;
        }
        
        let dailyLessons = lessons.filter(l => l.date === dateString);
        dailyLessons.forEach(lesson => {
            let start = lesson.startTime.split(':');
            let end = lesson.endTime.split(':');
            let topPosition = ((parseInt(start[0]) - startHour) * 64) + (parseInt(start[1]) / 60 * 64);
            let height = (((parseInt(end[0]) - parseInt(start[0])) * 64) + ((parseInt(end[1]) - parseInt(start[1])) / 60 * 64));

            let student = students.find(s => s.id == lesson.studentId) || {name: 'Usunięty uczeń', color: '#9ca3af'};
            let bgColor = hexToRgba(student.color, 0.15);
            
            let icon = lesson.paid ? '✅' : '<span class="text-red-500">❗</span>';

            gridHtml += `
                <div class="absolute w-[94%] left-[3%] rounded p-1.5 text-xs overflow-hidden shadow-sm hover:shadow-md transition cursor-pointer flex flex-col border-l-4" 
                     style="top: ${topPosition}px; height: ${height}px; background-color: ${bgColor}; border-left-color: ${student.color};"
                     onclick="editLesson(${lesson.id})">
                    <div class="font-bold flex justify-between" style="color: ${student.color}">
                        <span>${lesson.startTime}</span>
                        <span title="${lesson.paid ? 'Opłacone' : 'Brak wpłaty'}">${icon}</span>
                    </div>
                    <div class="font-bold text-gray-800 truncate leading-tight mt-0.5">${student.name}</div>
                    ${lesson.subject ? `<div class="text-gray-600 font-medium truncate mt-0.5 text-[10px]">${lesson.subject}</div>` : ''}
                </div>`;
        });
        gridHtml += `</div>`;
    }
    document.getElementById('calendar-grid').innerHTML = gridHtml;
    updateCurrentTimeLine();
}

function updateCurrentTimeLine() {
    const line = document.getElementById('current-time-line');
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

// --- PULPIT ---
function renderDashboard() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('today-date-display').innerText = now.toLocaleDateString('pl-PL', options);

    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const todayString = now.toISOString().split('T')[0];
    const nowTime = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');

    let earnings = 0, paidCount = 0, unpaidCount = 0;
    lessons.forEach(l => {
        let lDate = new Date(l.date);
        if(lDate.getMonth() === currentMonth && lDate.getFullYear() === currentYear) {
            if(l.paid) { earnings += Number(l.price || 0); paidCount++; }
            else { unpaidCount++; }
        }
    });
    document.getElementById('dashboard-monthly-earnings').innerText = `${earnings} zł`;
    document.getElementById('dashboard-paid-count').innerText = `${paidCount} opłaconych`;
    document.getElementById('dashboard-unpaid-count').innerText = `${unpaidCount} nieopłaconych`;

    let upcomingLessons = lessons.filter(l => l.date > todayString || (l.date === todayString && l.startTime >= nowTime));
    upcomingLessons.sort((a,b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
    
    const nextWidget = document.getElementById('next-lesson-widget');
    if(upcomingLessons.length > 0) {
        let next = upcomingLessons[0];
        let student = students.find(s => s.id == next.studentId) || {name: 'Nieznany'};
        let dayText = next.date === todayString ? 'Dzisiaj' : next.date;
        nextWidget.innerHTML = `
            <div class="text-4xl font-extrabold mb-1">${next.startTime}</div>
            <div class="text-xl font-bold">${student.name}</div>
            <div class="text-indigo-200 mt-2 flex justify-between items-center">
                <span>${next.subject || 'Lekcja'}</span>
                <span class="bg-white/20 px-3 py-1 rounded-full text-xs font-bold">${dayText}</span>
            </div>
        `;
    } else {
        nextWidget.innerHTML = `<div class="text-xl font-bold text-indigo-100">Brak zaplanowanych lekcji! Wreszcie wolne! 🎉</div>`;
    }

    const mondayString = getMonday(now).toISOString().split('T')[0];
    let sundayDate = new Date(getMonday(now));
    sundayDate.setDate(sundayDate.getDate() + 6);
    const sundayString = sundayDate.toISOString().split('T')[0];

    const weekList = document.getElementById('this-week-list');
    weekList.innerHTML = '';
    
    let thisWeekLessons = lessons.filter(l => l.date >= mondayString && l.date <= sundayString);
    thisWeekLessons.sort((a,b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));

    if(thisWeekLessons.length === 0) {
        weekList.innerHTML = '<p class="text-gray-500">Pusty grafik na ten tydzień.</p>';
    } else {
        const daysNamesPL = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];
        
        let lastDay = '';
        thisWeekLessons.forEach(l => {
            let lDate = new Date(l.date);
            let dayName = daysNamesPL[lDate.getDay()];
            let dayDisplay = l.date === todayString ? '<span class="text-indigo-500">Dzisiaj</span>' : dayName;

            if(l.date !== lastDay) {
                weekList.innerHTML += `<div class="text-xs font-bold text-gray-400 uppercase tracking-wider mt-4 mb-2">${dayDisplay} (${l.date})</div>`;
                lastDay = l.date;
            }

            let student = students.find(s => s.id == l.studentId) || {name: 'Nieznany', color: '#ccc'};
            let paidIcon = l.paid ? '<span class="bg-green-100 text-green-700 p-1 rounded text-xs font-bold">Opłacone</span>' : '<span class="bg-red-100 text-red-700 p-1 rounded text-xs font-bold">Brak</span>';

            weekList.innerHTML += `
                <div class="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 border border-transparent hover:border-gray-100 transition cursor-pointer" onclick="editLesson(${l.id})">
                    <div class="flex items-center gap-4">
                        <div class="w-1.5 h-10 rounded-full" style="background-color: ${student.color}"></div>
                        <div>
                            <p class="font-bold text-gray-800">${l.startTime} - ${l.endTime}</p>
                            <p class="text-sm font-medium text-gray-500">${student.name} <span class="text-xs text-gray-400">(${l.subject || 'Brak'})</span></p>
                        </div>
                    </div>
                    <div class="flex flex-col items-end gap-1">
                        <span class="font-bold text-gray-800">${l.price || 0} zł</span>
                        ${paidIcon}
                    </div>
                </div>`;
        });
    }
}

// --- ZAROBKI ---
function renderZarobki() {
    const monthPicker = document.getElementById('earnings-month-picker').value;
    if(!monthPicker) return;
    
    const [year, month] = monthPicker.split('-');
    
    let total = 0, unpaid = 0;
    let byStudent = {};
    let bySubject = {};

    lessons.forEach(l => {
        let lDate = new Date(l.date);
        if(lDate.getFullYear() == year && (lDate.getMonth() + 1) == month) {
            let price = Number(l.price || 0);
            if(l.paid) {
                total += price;
                let studentName = (students.find(s => s.id == l.studentId) || {name: 'Nieznany'}).name;
                byStudent[studentName] = (byStudent[studentName] || 0) + price;
                let subject = l.subject || 'Inne / Brak podanego';
                bySubject[subject] = (bySubject[subject] || 0) + price;
            } else {
                unpaid += price;
            }
        }
    });

    document.getElementById('total-earnings-display').innerText = `${total} zł`;
    document.getElementById('unpaid-earnings-display').innerText = `Brakujące wpłaty: ${unpaid} zł`;

    const studentContainer = document.getElementById('earnings-by-student');
    studentContainer.innerHTML = '';
    let studentArray = Object.keys(byStudent).map(k => ({name: k, val: byStudent[k]})).sort((a,b) => b.val - a.val);
    
    if(studentArray.length === 0) studentContainer.innerHTML = '<p class="text-gray-500">Brak opłaconych lekcji w tym miesiącu.</p>';
    studentArray.forEach(item => {
        let width = Math.max(10, (item.val / total) * 100);
        studentContainer.innerHTML += `
            <div class="mb-3">
                <div class="flex justify-between text-sm font-bold text-gray-700 mb-1">
                    <span>${item.name}</span><span>${item.val} zł</span>
                </div>
                <div class="w-full bg-gray-100 rounded-full h-2.5">
                    <div class="bg-indigo-500 h-2.5 rounded-full" style="width: ${width}%"></div>
                </div>
            </div>`;
    });

    const subjectContainer = document.getElementById('earnings-by-subject');
    subjectContainer.innerHTML = '';
    let subjectArray = Object.keys(bySubject).map(k => ({name: k, val: bySubject[k]})).sort((a,b) => b.val - a.val);
    
    if(subjectArray.length === 0) subjectContainer.innerHTML = '<p class="text-gray-500">Brak opłaconych lekcji w tym miesiącu.</p>';
    subjectArray.forEach(item => {
        let width = Math.max(10, (item.val / total) * 100);
        subjectContainer.innerHTML += `
            <div class="mb-3">
                <div class="flex justify-between text-sm font-bold text-gray-700 mb-1">
                    <span>${item.name}</span><span>${item.val} zł</span>
                </div>
                <div class="w-full bg-gray-100 rounded-full h-2.5">
                    <div class="bg-purple-500 h-2.5 rounded-full" style="width: ${width}%"></div>
                </div>
            </div>`;
    });
}

// --- UCZNIOWIE ---
function renderStudents() {
    const list = document.getElementById('students-list');
    list.innerHTML = '';
    
    if(students.length === 0) {
        list.innerHTML = '<p class="text-gray-500 col-span-2">Brak uczniów w bazie.</p>';
        return;
    }

    students.forEach(student => {
        list.innerHTML += `
            <div class="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center border-l-4" style="border-left-color: ${student.color}">
                <div>
                    <h4 class="font-bold text-lg">${student.name}</h4>
                    <p class="text-sm font-medium text-gray-500">Przedmioty: <span class="text-gray-800">${student.subjects}</span></p>
                </div>
                <button onclick="deleteStudent(${student.id})" class="text-gray-400 hover:text-red-500 bg-gray-50 hover:bg-red-50 rounded-lg p-2 transition">
                    Usuń
                </button>
            </div>`;
    });
}

function openStudentModal() {
    document.getElementById('student-name').value = '';
    document.getElementById('student-subjects').value = '';
    document.getElementById('student-color').value = '#6366f1';
    document.getElementById('modal-student').classList.remove('hidden');
}

function saveStudent() {
    const name = document.getElementById('student-name').value;
    const subjects = document.getElementById('student-subjects').value;
    const color = document.getElementById('student-color').value;
    if(!name) return alert('Wpisz imię!');

    students.push({ id: Date.now(), name, subjects, color });
    saveToCloud(); // Zapis do Firebase!
    closeModals();
    renderStudents();
    renderCalendar();
}

function deleteStudent(id) {
    if(confirm('Na pewno usunąć ucznia i jego wszystkie lekcje?')) {
        students = students.filter(s => s.id !== id);
        lessons = lessons.filter(l => l.studentId != id);
        saveToCloud(); // Zapis do Firebase!
        renderStudents();
    }
}

// --- LEKCJE (MODAL I ZAPISYWANIE) ---
function autoFillSubject() {
    const stId = document.getElementById('lesson-student').value;
    const student = students.find(s => s.id == stId);
    if(student && student.subjects) {
        document.getElementById('lesson-subject').value = student.subjects.split(',')[0].trim();
    }
}

function openLessonModal() {
    document.getElementById('lesson-modal-title').innerText = 'Zaplanuj lekcję';
    document.getElementById('lesson-id').value = '';
    document.getElementById('lesson-subject').value = '';
    document.getElementById('lesson-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('lesson-time-start').value = '15:00';
    document.getElementById('lesson-time-end').value = '16:00';
    document.getElementById('lesson-price').value = '';
    document.getElementById('lesson-notes').value = '';
    document.getElementById('lesson-paid').checked = false;
    
    document.getElementById('recurring-box').classList.remove('hidden');
    document.getElementById('btn-delete-lesson').classList.add('hidden');

    const select = document.getElementById('lesson-student');
    select.innerHTML = '<option value="">Wybierz ucznia...</option>';
    students.forEach(s => {
        select.innerHTML += `<option value="${s.id}">${s.name}</option>`;
    });

    document.getElementById('modal-lesson').classList.remove('hidden');
}

function editLesson(id) {
    const lesson = lessons.find(l => l.id === id);
    if(!lesson) return;

    document.getElementById('lesson-modal-title').innerText = 'Szczegóły lekcji';
    document.getElementById('lesson-id').value = lesson.id;
    document.getElementById('lesson-subject').value = lesson.subject || '';
    document.getElementById('lesson-date').value = lesson.date;
    document.getElementById('lesson-time-start').value = lesson.startTime;
    document.getElementById('lesson-time-end').value = lesson.endTime;
    document.getElementById('lesson-price').value = lesson.price || '';
    document.getElementById('lesson-notes').value = lesson.notes || '';
    document.getElementById('lesson-paid').checked = lesson.paid || false;

    document.getElementById('recurring-box').classList.add('hidden');
    document.getElementById('btn-delete-lesson').classList.remove('hidden');

    const select = document.getElementById('lesson-student');
    select.innerHTML = '';
    students.forEach(s => {
        select.innerHTML += `<option value="${s.id}" ${s.id == lesson.studentId ? 'selected' : ''}>${s.name}</option>`;
    });

    document.getElementById('modal-lesson').classList.remove('hidden');
}

function saveLesson() {
    const id = document.getElementById('lesson-id').value;
    const studentId = document.getElementById('lesson-student').value;
    const subject = document.getElementById('lesson-subject').value;
    const date = document.getElementById('lesson-date').value;
    const startTime = document.getElementById('lesson-time-start').value;
    const endTime = document.getElementById('lesson-time-end').value;
    const price = document.getElementById('lesson-price').value;
    const notes = document.getElementById('lesson-notes').value;
    const paid = document.getElementById('lesson-paid').checked;
    const isRecurring = document.getElementById('lesson-recurring') ? document.getElementById('lesson-recurring').checked : false;

    if(!studentId || !date) return alert('Wybierz ucznia i datę!');

    if (id) {
        let lesson = lessons.find(l => l.id == id);
        lesson.studentId = studentId;
        lesson.subject = subject;
        lesson.date = date;
        lesson.startTime = startTime;
        lesson.endTime = endTime;
        lesson.price = price;
        lesson.notes = notes;
        lesson.paid = paid;
    } else {
        const repetitions = isRecurring ? 156 : 1; 
        let baseDate = new Date(date);

        for(let i=0; i<repetitions; i++) {
            let lessonDate = new Date(baseDate);
            lessonDate.setDate(baseDate.getDate() + (i * 7));
            
            lessons.push({
                id: Date.now() + i + Math.floor(Math.random() * 1000),
                studentId,
                subject,
                date: lessonDate.toISOString().split('T')[0],
                startTime,
                endTime,
                price,
                notes: i === 0 ? notes : '', 
                paid: false 
            });
        }
        if(paid && isRecurring) {
           lessons[lessons.length - repetitions].paid = true;
        } else if (paid && !isRecurring) {
           lessons[lessons.length - 1].paid = true;
        }
    }

    saveToCloud(); // Zapis do Firebase!
    closeModals();
    renderCalendar();
    renderDashboard();
    if(!document.getElementById('view-zarobki').classList.contains('hidden')) renderZarobki();
}

function deleteLesson() {
    const id = document.getElementById('lesson-id').value;
    if(confirm('Na pewno usunąć tę lekcję?')) {
        lessons = lessons.filter(l => l.id != id);
        saveToCloud(); // Zapis do Firebase!
        closeModals();
        renderCalendar();
        renderDashboard();
        if(!document.getElementById('view-zarobki').classList.contains('hidden')) renderZarobki();
    }
}

function closeModals() {
    document.getElementById('modal-student').classList.add('hidden');
    document.getElementById('modal-lesson').classList.add('hidden');
}
