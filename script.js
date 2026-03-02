// Pobieramy zapisane lekcje z pamięci przeglądarki (lub tworzymy pustą listę)
let lessons = JSON.parse(localStorage.getItem('myLessons')) || [];

const form = document.getElementById('lesson-form');
const container = document.getElementById('lessons-container');

// Działanie przycisku "Dodaj do kalendarza"
form.addEventListener('submit', function(e) {
    e.preventDefault(); // Zatrzymuje przeładowanie strony
    
    // Tworzymy nową lekcję z danych z formularza
    const newLesson = {
        id: Date.now(), // Unikalny numer lekcji
        student: document.getElementById('student').value,
        subject: document.getElementById('subject').value,
        day: document.getElementById('day').value,
        time: document.getElementById('time').value,
        price: document.getElementById('price').value,
        paid: false, // Domyślnie uczeń jeszcze nie zapłacił
        notes: ''    // Puste miejsce na notatki
    };

    lessons.push(newLesson);
    saveAndShow();
    form.reset(); // Czyścimy formularz po dodaniu
});

// Zapisywanie do pamięci i odświeżanie widoku
function saveAndShow() {
    localStorage.setItem('myLessons', JSON.stringify(lessons));
    showLessons();
}

// Zmiana statusu płatności (zapłacone / brak wpłaty)
function togglePaid(id) {
    const lesson = lessons.find(l => l.id === id);
    if(lesson) {
        lesson.paid = !lesson.paid; // Zmienia na przeciwne
        saveAndShow();
    }
}

// Zapisywanie notatek na bieżąco, gdy przestaniesz pisać
function updateNotes(id, text) {
    const lesson = lessons.find(l => l.id === id);
    if(lesson) {
        lesson.notes = text;
        localStorage.setItem('myLessons', JSON.stringify(lessons));
    }
}

// Usuwanie lekcji
function deleteLesson(id) {
    lessons = lessons.filter(l => l.id !== id);
    saveAndShow();
}

// Wyświetlanie lekcji na ekranie
function showLessons() {
    container.innerHTML = ''; 
    const days = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek'];
    
    days.forEach(day => {
        // Szukamy lekcji dla konkretnego dnia
        const dayLessons = lessons.filter(l => l.day === day);
        if(dayLessons.length === 0) return; // Jeśli brak lekcji, pomijamy ten dzień

        // Tworzymy ramkę dla całego dnia
        const dayBox = document.createElement('div');
        dayBox.className = 'bg-white rounded-2xl shadow-md overflow-hidden border border-gray-100';
        
        let html = `<div class="bg-blue-500 text-white font-bold p-4 text-lg">${day}</div><div class="p-4 space-y-3">`;
        
        // Układamy lekcje po kolei godzinami i tworzymy ich wygląd
        dayLessons.sort((a,b) => a.time.localeCompare(b.time)).forEach(lesson => {
            const paidColor = lesson.paid ? 'bg-green-100 text-green-800 border-green-300' : 'bg-red-100 text-red-800 border-red-300';
            const paidText = lesson.paid ? 'Opłacone' : '! Brak wpłaty';

            html += `
            <div class="border border-gray-100 p-4 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-sm transition">
                <div>
                    <p class="font-bold text-xl text-gray-800">${lesson.time} - ${lesson.student}</p>
                    <p class="text-gray-500 font-medium">${lesson.subject} | ${lesson.price} zł</p>
                </div>
                
                <div class="flex items-center gap-3 w-full md:w-auto">
                    <textarea onchange="updateNotes(${lesson.id}, this.value)" placeholder="Notatki z lekcji (np. Past Simple)..." class="border border-gray-200 p-2 rounded-lg text-sm w-full md:w-64 h-12 bg-gray-50 focus:outline-none focus:border-blue-400 resize-none">${lesson.notes}</textarea>
                    
                    <button onclick="togglePaid(${lesson.id})" class="px-4 py-2 rounded-lg border text-sm font-bold cursor-pointer transition ${paidColor}">
                        ${paidText}
                    </button>
                    
                    <button onclick="deleteLesson(${lesson.id})" class="text-gray-400 hover:text-red-500 font-bold px-2 transition text-xl">×</button>
                </div>
            </div>
            `;
        });
        
        html += `</div>`;
        dayBox.innerHTML = html;
        container.appendChild(dayBox);
    });
}

// Uruchamiamy pokazywanie lekcji od razu po wejściu na stronę
showLessons();
