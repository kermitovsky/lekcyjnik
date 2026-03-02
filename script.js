let students = JSON.parse(localStorage.getItem('lekcyjnik_students')) || [];
let lessons = JSON.parse(localStorage.getItem('lekcyjnik_lessons')) || [];

let currentDate = new Date();
const startHour = 7;
const endHour = 22;

// --- NAWIGACJA ---
function switchTab(tabName) {
    document.getElementById('view-pulpit').classList.add('hidden');
    document.getElementById('view-kalendarz').classList.add('hidden');
    document.getElementById('view-uczniowie').classList.add('hidden');
    
    document.querySelectorAll('.nav-tab').forEach(btn => {
        btn.className = "nav-tab text-gray-500 hover:text-gray-900 font-medium px-4 py-2 rounded-full transition";
    });

    document.getElementById(`view-${tabName}`).classList.remove('hidden');
    document.getElementById(`tab-${tabName}`).className = "nav-tab bg-indigo-500 text-white shadow-md font-medium px-6 py-2 rounded-full transition";

    if(tabName === 'kalendarz') renderCalendar();
    if(tabName === 'uczniowie') renderStudents();
    if(tabName === 'pulpit') renderDashboard();
}

// --- KALENDARZ LOGIKA ---
function getMonday(d) {
    d = new Date(d);
    let day = d.getDay(), diff = d.getDate() - day + (day === 0 ? -6 : 1); 
    return new Date(d.setDate(diff));
}

function changeWeek(offset) {
    currentDate.setDate(currentDate.getDate() + (offset * 7));
    renderCalendar();
}

function goToToday() {
    currentDate = new Date();
    renderCalendar();
}

// Funkcja pomocnicza: jaśniejszy kolor tła dla kafelka
function hexToRgba(hex, alpha) {
    let r = parseInt(hex.slice(1, 3), 16),
        g = parseInt(hex.slice(3, 5), 16),
        b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function renderCalendar() {
    let monday = getMonday(currentDate);
    let sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const monthNames = ["Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec", "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"];
    document.getElementById('month-year-display').innerText = `${monthNames[monday.getMonth()]} ${monday.getFullYear()}`;
    
    let formatDay = (date) => date.getDate().toString().padStart(2, '0');
    document.getElementById('week-range-display').innerText = `${formatDay(monday)} - ${formatDay(sunday)} ${monthNames[sunday.getMonth()].substring(0,3).toUpperCase()}`;

    const daysNames = ['PON.', 'WT.', 'ŚR.', 'CZW.', 'PT.', 'SOB.', 'NIEDZ.'];
    let headerHtml = '<div class="border-r border-gray-100 p-2 w-16 shrink-0"></div>';
    
    for(let i=0; i<7; i++) {
        let dayDate = new Date(monday);
        dayDate.setDate(monday.getDate() + i);
        let isToday = dayDate.toDateString() === new Date().toDateString();
        let circleClass = isToday ? "bg-indigo-500 text-white shadow-md" : "text-gray-800";
        
        headerHtml += `
            <div class="text-center py-2 border-r border-gray-100 day-col flex-1">
                <div class="text-xs font-bold text-gray-500 mb-1">${daysNames[i]}</div>
                <div class="mx-auto w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full font-bold text-lg md:text-xl ${circleClass}">
                    ${dayDate.getDate()}
                </div>
            </div>`;
    }
    document.getElementById('calendar-header').innerHTML = headerHtml;

    let gridHtml = `<div class="border-r border-gray-100 relative w-16 shrink-0 bg-white z-10">`;
    for(let h=startHour; h<=endHour; h++) {
        gridHtml += `<div class="h-16 time-row text-xs text-gray-500 text-right pr-2 pt-1 font-medium">${h}:00</div>`;
    }
    gridHtml += `</div>`;

    for(let i=0; i<7; i++) {
        let dayDate = new Date(monday);
        dayDate.setDate(monday.getDate() + i);
        let dateString = dayDate.toISOString().split('T')[0];

        gridHtml += `<div class="relative day-col flex-1" data-date="${dateString}">`;
        for(let h=startHour; h<=endHour; h++) {
            gridHtml += `<div class="h-16 time-row border-r border-gray-100 last:border-r-0"></div>`;
        }
        
        let dailyLessons = lessons.filter(l => l.date === dateString);
        dailyLessons.forEach(lesson => {
            let start = lesson.startTime.split(':');
            let end = lesson.endTime.split(':');
            let topPosition = ((parseInt(start[0]) - startHour) * 64) + (parseInt(start[1]) / 60 * 64);
            let height = (((parseInt(end[0]) - parseInt(start[0])) * 64) + ((parseInt(end[1]) - parseInt(start[1])) / 60 * 64));

            let student = students.find(s => s.id == lesson.studentId) || {name: 'Nieznany', color: '#6366f1'};
            let bgColor = hexToRgba(student.color, 0.15);
            let borderColor = student.color;
            
            // Ikonka płatności
            let icon = lesson.paid ? '✅' : '❗';

            gridHtml += `
                <div class="absolute w-[94%] left-[3%] rounded p-1 text-xs overflow-hidden shadow-sm hover:shadow-md transition cursor-pointer flex flex-col border-l-4" 
                     style="top: ${topPosition}px; height: ${height}px; background-color: ${bgColor}; border-left-color: ${borderColor};"
                     onclick="editLesson(${lesson.id})">
                    <div class="font-bold flex justify-between" style="color: ${borderColor}">
                        <span>${lesson.startTime}</span>
                        <span title="${lesson.paid ? 'Opłacone' : 'Brak wpłaty'}">${icon}</span>
                    </div>
                    <div class="font-bold text-gray-800 truncate leading-tight mt-1">${student.name}</div>
                    ${lesson.notes ? `<div class="text-gray-500 truncate mt-auto hidden md:block">${lesson.notes}</div>` : ''}
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

// --- PULPIT (DASHBOARD) ---
function renderDashboard() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const todayString = now.toISOString().split('T')[0];

    // Obliczanie zarobków w tym miesiącu (tylko opłacone)
    let totalEarnings = 0;
    lessons.forEach(lesson => {
        let lDate = new Date(lesson.date);
        if(lDate.getMonth() === currentMonth && lDate.getFullYear() === currentYear && lesson.paid) {
            totalEarnings += Number(lesson.price || 0);
        }
    });
    document.getElementById('monthly-earnings').innerText = `${totalEarnings} zł`;

    // Dzisiejsze lekcje
    const todayList = document.getElementById('today-lessons-list');
    todayList.innerHTML = '';
    
    let todaysLessons = lessons.filter(l => l.date === todayString);
    todaysLessons.sort((a,b) => a.startTime.localeCompare(b.startTime));

    if(todaysLessons.length === 0) {
        todayList.innerHTML = '<p class="text-gray-500">Brak zaplanowanych zajęć na dziś.</p>';
    } else {
        todaysLessons.forEach(lesson => {
            let student = students.find(s => s.id == lesson.studentId) || {name: 'Nieznany', color: '#000'};
            let paidText = lesson.paid ? '<span class="text-green-500 text-sm font-bold">Opłacone</span>' : '<span class="text-red-500 text-sm font-bold">Brak wpłaty</span>';
            
            todayList.innerHTML += `
                <div class="flex items-center justify-between border-b last:border-0 pb-3 last:pb-0">
                    <div class="flex items-center gap-3">
                        <div class="w-3 h-3 rounded-full" style="background-color: ${student.color}"></div>
                        <div>
                            <p class="font-bold text-gray-800">${lesson.startTime} - ${lesson.endTime}</p>
                            <p class="text-sm text-gray-500">${student.name}</p>
                        </div>
                    </div>
                    <div class="text-right">
                        ${paidText}
                    </div>
                </div>`;
        });
    }
}

// --- BAZA UCZNIÓW ---
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
                    <p class="text-sm text-gray-500">${student.subjects}</p>
                </div>
                <button onclick="deleteStudent(${student.id})" class="text-red-400 hover:text-red-600 font-bold p-2 text-sm">Usuń</button>
            </div>`;
    });
}

// --- MODALE I ZAPISYWANIE ---
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
    localStorage.setItem('lekcyjnik_students', JSON.stringify(students));
    closeModals();
    renderStudents();
    renderCalendar();
}

function deleteStudent(id) {
    if(confirm('Na pewno usunąć ucznia i jego wszystkie lekcje?')) {
        students = students.filter(s => s.id !== id);
        lessons = lessons.filter(l => l.studentId != id);
        localStorage.setItem('lekcyjnik_students', JSON.stringify(students));
        localStorage.setItem('lekcyjnik_lessons', JSON.stringify(lessons));
        renderStudents();
    }
}

function openLessonModal() {
    document.getElementById('lesson-modal-title').innerText = 'Zaplanuj lekcję';
    document.getElementById('lesson-id').value = '';
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

    document.getElementById('lesson-modal-title').innerText = 'Edytuj lekcję';
    document.getElementById('lesson-id').value = lesson.id;
    document.getElementById('lesson-date').value = lesson.date;
    document.getElementById('lesson-time-start').value = lesson.startTime;
    document.getElementById('lesson-time-end').value = lesson.endTime;
    document.getElementById('lesson-price').value = lesson.price || '';
    document.getElementById('lesson-notes').value = lesson.notes || '';
    document.getElementById('lesson-paid').checked = lesson.paid || false;

    // Przy edycji ukrywamy opcję powtarzania
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
    const date = document.getElementById('lesson-date').value;
    const startTime = document.getElementById('lesson-time-start').value;
    const endTime = document.getElementById('lesson-time-end').value;
    const price = document.getElementById('lesson-price').value;
    const notes = document.getElementById('lesson-notes').value;
    const paid = document.getElementById('lesson-paid').checked;
    const isRecurring = document.getElementById('lesson-recurring').checked;

    if(!studentId || !date) return alert('Wybierz ucznia i datę!');

    if (id) {
        // Edycja istniejącej
        let lesson = lessons.find(l => l.id == id);
        lesson.studentId = studentId;
        lesson.date = date;
        lesson.startTime = startTime;
        lesson.endTime = endTime;
        lesson.price = price;
        lesson.notes = notes;
        lesson.paid = paid;
    } else {
        // Dodawanie nowej
        const repetitions = isRecurring ? 12 : 1; 
        let baseDate = new Date(date);

        for(let i=0; i<repetitions; i++) {
            let lessonDate = new Date(baseDate);
            lessonDate.setDate(baseDate.getDate() + (i * 7));
            
            lessons.push({
                id: Date.now() + i,
                studentId,
                date: lessonDate.toISOString().split('T')[0],
                startTime,
                endTime,
                price,
                notes,
                paid
            });
        }
    }

    localStorage.setItem('lekcyjnik_lessons', JSON.stringify(lessons));
    closeModals();
    renderCalendar();
    renderDashboard();
}

function deleteLesson() {
    const id = document.getElementById('lesson-id').value;
    if(confirm('Na pewno usunąć tę lekcję?')) {
        lessons = lessons.filter(l => l.id != id);
        localStorage.setItem('lekcyjnik_lessons', JSON.stringify(lessons));
        closeModals();
        renderCalendar();
        renderDashboard();
    }
}

function closeModals() {
    document.getElementById('modal-student').classList.add('hidden');
    document.getElementById('modal-lesson').classList.add('hidden');
}

// Start
switchTab('kalendarz');
