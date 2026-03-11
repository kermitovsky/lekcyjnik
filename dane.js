// ==========================================
// --- PRZEDMIOTY ---
// ==========================================

function renderSubjects() {
    const list = document.getElementById('subjects-list');
    list.innerHTML = '';
    if(subjects.length === 0) return list.innerHTML = '<p class="tekst-szary">Brak przedmiotów. Dodaj pierwszy!</p>';
    
    subjects.forEach(sub => {
        let hasLinks = sub.links && sub.links.trim() !== '' ? '<span class="text-sm px-2 rounded bg-slate-100 text-slate-500 shadow-sm border border-slate-200" title="Materiały podpięte">🔗 Linki</span>' : '';
        list.innerHTML += `
            <div class="karta flex justify-between items-center cursor-pointer hover:-translate-y-1 transition" onclick="editSubject('${sub.id}')">
                <div class="flex items-center gap-3">
                    <div class="w-6 h-6 rounded-md border-2 ramka-ciemna" style="background-color: ${esc(sub.color)};"></div>
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
    showToast('Zapisano przedmiot!');
}

async function deleteSubject() {
    const id = document.getElementById('subject-id').value;
    if(await showConfirm('Usuwanie', 'Czy na pewno usunąć ten przedmiot?', true)) {
        subjects = subjects.filter(s => s.id != id); saveSubjectsToCloud(); closeModals(); renderSubjects();
        showToast('Usunięto przedmiot');
    }
}

// ==========================================
// --- UCZNIOWIE I PAKIETY ---
// ==========================================

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
        container.innerHTML += `
            <div class="flex flex-col gap-3 items-start p-3 md:p-4 rounded-xl border-2 bg-white border-slate-200 bundle-row shadow-sm w-full box-border" data-id="${b.id}">
                <div class="flex flex-col w-full gap-2">
                    <input type="text" placeholder="Nazwa pakietu (np. Matma + Fizyka)" value="${esc(b.name || '')}" class="bundle-name w-full text-sm p-2 border-2 rounded-lg font-bold outline-none transition" style="focus:border-color: var(--akcent)">
                    <div class="flex gap-2 w-full">
                        <input type="number" placeholder="Cena (zł)" value="${b.total || ''}" class="bundle-total w-1/2 text-sm p-2 border-2 rounded-lg font-bold outline-none transition tekst-akcent">
                        <input type="number" step="0.5" placeholder="Godz. (np. 2.5)" value="${b.hours || ''}" class="bundle-hours w-1/2 text-sm p-2 border-2 rounded-lg font-bold outline-none transition">
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
                        <select class="bundle-payday-weekly-select w-full text-xs md:text-sm p-2 border-2 rounded-lg font-bold outline-none cursor-pointer bg-white transition max-w-full text-ellipsis overflow-hidden">
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
                            <input type="number" min="1" max="31" placeholder="np. 10" value="${isMonthly ? (esc(b.payDay)||'') : ''}" class="bundle-payday-monthly-input flex-1 text-sm p-2 border-2 rounded-lg font-bold text-center outline-none bg-white transition w-full">
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
        list.innerHTML = '<p class="tekst-szary">Brak aktywnych uczniów.</p>';
    } else {
        activeStudents.forEach(student => {
            let studentSubjectsHtml = '';
            if(student.subjectIds && student.subjectIds.length > 0) {
                student.subjectIds.forEach(subId => {
                    let sub = subjects.find(s => s.id == subId);
                    if(sub) studentSubjectsHtml += `<span class="text-[10px] md:text-xs font-bold px-2 py-1 rounded-md text-white border ramka-ciemna" style="background-color: ${esc(sub.color)};">${esc(sub.name).toUpperCase()}</span> `;
                });
            } else { studentSubjectsHtml = `<span class="text-xs font-medium tekst-szary">Brak przypisanych przedmiotów</span>`; }
            
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
                        <button onclick="editStudent('${student.id}')" class="text-sm font-bold hover:underline flex-1 sm:flex-none tekst-akcent">Edytuj</button>
                        <button onclick="toggleArchiveStudent('${student.id}')" class="text-sm font-bold hover:underline flex-1 sm:flex-none tekst-szary">Zarchiwizuj</button>
                        <button onclick="deleteStudent('${student.id}')" class="text-sm font-bold text-rose-500 hover:underline flex-1 sm:flex-none">Usuń</button>
                    </div>
                </div>`;
        });
    }

    if(archivedStudents.length > 0) {
        archivedSection.classList.remove('hidden');
        archivedStudents.forEach(student => {
            archivedList.innerHTML += `
                <div class="karta flex flex-col sm:flex-row justify-between items-start gap-4 sm:gap-0 bg-jasny">
                    <div class="space-y-1">
                        <h4 class="font-extrabold text-lg md:text-xl tekst-szary">${esc(student.name)}</h4>
                        <span class="text-xs font-bold px-2 py-1 rounded-md text-white border bg-slate-400 border-slate-500">ARCHIWUM</span>
                    </div>
                    <div class="flex flex-wrap sm:flex-col gap-3 sm:gap-2 w-full sm:w-auto text-center sm:text-right">
                        <button onclick="toggleArchiveStudent('${student.id}')" class="text-sm font-bold hover:underline flex-1 sm:flex-none tekst-akcent">Przywróć</button>
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
            student.archived = !student.archived; saveStudentsToCloud(); renderStudents(); 
            if(typeof renderDashboard === 'function') renderDashboard(); 
            showToast('Uczeń zarchiwizowany/przywrócony');
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
    showToast('Zapisano ucznia!');
}

async function deleteStudent(id) {
    if(await showConfirm('Usuwanie Ucznia', 'Na pewno usunąć ucznia i wszystkie jego zaplanowane lekcje? Zamiast tego możesz go po prostu zarchiwizować!', true)) {
        students = students.filter(s => s.id != id);
        lessons = lessons.filter(l => l.studentId != id);
        saveStudentsToCloud(); saveLessonsToCloud(); renderStudents(); 
        if(typeof renderDashboard === 'function') renderDashboard();
        showToast('Usunięto ucznia i jego lekcje');
    }
}

// ==========================================
// --- LOGIKA FORMULARZA LEKCJI ---
// ==========================================

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
    
    if(!bundleSelect) return; 
    
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
    const bundleSelect = document.getElementById('lesson-bundle');
    if(!bundleSelect) return;
    
    const bundleId = bundleSelect.value;
    const priceInput = document.getElementById('lesson-price');
    const priceLabel = document.getElementById('lesson-price-label');
    const paymentDateDiv = document.getElementById('lesson-payment-date-div');
    
    if (bundleId) {
        // Uczeń korzysta z pakietu
        if(priceLabel) priceLabel.innerText = 'Cena poza pakietem (zł)';
        if(paymentDateDiv) paymentDateDiv.classList.remove('hidden');
        if(priceInput) priceInput.readOnly = false; 
        
        const stId = document.getElementById('lesson-student').value;
        const student = students.find(s => s.id == stId);
        const bundle = student ? (student.bundles || []).find(b => b.id == bundleId) : null;

        // KROK 1: Zdejmujemy wszelkie blokady z kalendarzyka, żeby Flatpickr nie wariował
        if(paymentDatePicker && paymentDatePicker.altInput) {
            paymentDatePicker.altInput.removeAttribute('disabled');
            paymentDatePicker.altInput.classList.remove('opacity-50', 'cursor-not-allowed', 'bg-slate-200');
            paymentDatePicker.altInput.classList.add('bg-white', 'cursor-pointer');
        }
        
        // KROK 2: Sprawdzamy, czy w profilu ucznia jest ustawiony "sztywny" dzień płatności (np. Sobota)
        if (bundle && bundle.payDay !== undefined && bundle.payDay !== "") {
            
            // Pobieramy "żywą" datę z głównego kalendarza lekcji
            let lDate;
            if (datePicker && datePicker.selectedDates.length > 0) {
                lDate = new Date(datePicker.selectedDates[0]);
            } else {
                let lDateStr = document.getElementById('lesson-date').value;
                lDate = lDateStr ? new Date(lDateStr + "T12:00:00") : new Date();
            }
            lDate.setHours(12,0,0,0); 
            
            let finalDateStr = '';

            // Obliczamy dokładną datę
            if (bundle.type === 'monthly') {
                let targetDay = parseInt(bundle.payDay);
                if(!isNaN(targetDay)) {
                    let lastDayOfMonth = new Date(lDate.getFullYear(), lDate.getMonth() + 1, 0).getDate();
                    let finalDay = Math.min(targetDay, lastDayOfMonth);
                    let pDate = new Date(lDate.getFullYear(), lDate.getMonth(), finalDay);
                    pDate.setHours(12,0,0,0);
                    finalDateStr = getLocalISODate(pDate);
                }
            } else {
                let weekMonday = getMonday(lDate);
                let offset = parseInt(bundle.payDay);
                if(!isNaN(offset)) {
                    if (offset === 0) { weekMonday.setDate(weekMonday.getDate() + 6); } 
                    else { weekMonday.setDate(weekMonday.getDate() + (offset - 1)); }
                    finalDateStr = getLocalISODate(weekMonday);
                }
            }

            // Ustawiamy wymuszoną datę w kalendarzyku płatności
            if (finalDateStr && paymentDatePicker) {
                paymentDatePicker.setDate(finalDateStr, true); // "true" wymusza odświeżenie UI
                
                // KROK 3: Nakładamy sztywną blokadę na pole (szare tło, brak klikania)
                setTimeout(() => {
                    if(paymentDatePicker.altInput) {
                        paymentDatePicker.altInput.setAttribute('disabled', 'true');
                        paymentDatePicker.altInput.classList.remove('bg-white', 'cursor-pointer');
                        paymentDatePicker.altInput.classList.add('opacity-50', 'cursor-not-allowed', 'bg-slate-200');
                    }
                }, 10);
            }
            
        } 
        
    } else {
        // Brak pakietu - standardowa, pojedyncza lekcja
        if(priceLabel) priceLabel.innerText = 'Cena za tę lekcję (zł)';
        if(paymentDateDiv) paymentDateDiv.classList.add('hidden');
        if(priceInput) priceInput.readOnly = false;
        
        // Zawsze odblokowujemy kalendarzyk
        if(paymentDatePicker && paymentDatePicker.altInput) {
            paymentDatePicker.altInput.removeAttribute('disabled');
            paymentDatePicker.altInput.classList.remove('opacity-50', 'cursor-not-allowed', 'bg-slate-200');
            paymentDatePicker.altInput.classList.add('bg-white', 'cursor-pointer');
        }
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
    if(timeEndPicker) timeEndPicker.setDate(endStr, true);
    handleBundleChange(); 
}

function openLessonModal() {
    document.getElementById('lesson-modal-title').innerText = 'Zaplanuj lekcję';
    document.getElementById('lesson-id').value = '';
    
    let topicEl = document.getElementById('lesson-topic');
    if(topicEl) topicEl.value = ''; 
    
    // Twarde wymuszenie wyczyszczenia i ustawienia "Dzisiaj"
    let defaultDate = getLocalISODate(new Date());
    document.getElementById('lesson-date').value = defaultDate;
    if(datePicker) {
        datePicker.clear();
        datePicker.setDate(defaultDate, true);
    }
    
    if(paymentDatePicker) {
        paymentDatePicker.clear();
    }
    
    document.getElementById('lesson-time-start').value = '15:00';
    if(timeStartPicker) timeStartPicker.setDate('15:00', true);
    autoUzupelnijCzas();

    document.getElementById('lesson-price').value = '';
    
    let paidCb = document.getElementById('lesson-paid');
    if(paidCb) paidCb.checked = false;
    let cancelledCb = document.getElementById('lesson-cancelled');
    if(cancelledCb) cancelledCb.checked = false;
    
    let recBox = document.getElementById('recurring-box');
    if(recBox) recBox.classList.remove('hidden');
    let cancBox = document.getElementById('cancelled-box');
    if(cancBox) cancBox.classList.add('hidden'); 
    document.getElementById('btn-delete-lesson').classList.add('hidden');

    const selectStudent = document.getElementById('lesson-student');
    selectStudent.innerHTML = '<option value="">Wybierz ucznia...</option>';
    students.filter(s => !s.archived).forEach(s => { selectStudent.innerHTML += `<option value="${s.id}">${esc(s.name)}</option>`; });

    document.getElementById('lesson-subject').innerHTML = '<option value="">Wybierz ucznia najpierw...</option>';
    
    let bundleSel = document.getElementById('lesson-bundle');
    if(bundleSel) bundleSel.innerHTML = '<option value="">Standardowa cena (wpisz ręcznie)</option>';
    
    document.getElementById('modal-lesson').classList.remove('hidden');
    handleBundleChange();
}

function editLesson(id) {
    try {
        const lesson = lessons.find(l => l.id == id);
        if(!lesson) return;
        
        document.getElementById('lesson-modal-title').innerText = 'Szczegóły lekcji';
        document.getElementById('lesson-id').value = lesson.id;
        
        let topicEl = document.getElementById('lesson-topic');
        if(topicEl) topicEl.value = lesson.topic || ''; 
        
        // KROK 1: Najpierw twarde ustawienie dat w kalendarzach
        document.getElementById('lesson-date').value = lesson.date;
        if(datePicker) datePicker.setDate(lesson.date, true); 
        
        if(paymentDatePicker) {
            paymentDatePicker.setDate(lesson.paymentDate || lesson.date, true);
        }
        
        document.getElementById('lesson-time-start').value = lesson.startTime;
        document.getElementById('lesson-time-end').value = lesson.endTime;
        if(timeStartPicker) timeStartPicker.setDate(lesson.startTime, true);
        if(timeEndPicker) timeEndPicker.setDate(lesson.endTime, true);

        // KROK 2: Ustawienie Ucznia
        const selectStudent = document.getElementById('lesson-student');
        selectStudent.innerHTML = '';
        students.forEach(s => { 
            if(!s.archived || s.id == lesson.studentId) {
                selectStudent.innerHTML += `<option value="${s.id}" ${s.id == lesson.studentId ? 'selected' : ''}>${esc(s.name)}</option>`; 
            }
        });

        // KROK 3: Ładowanie przedmiotów i pakietów
        updateLessonSubjectDropdown();
        if(lesson.subjectId) document.getElementById('lesson-subject').value = lesson.subjectId;
        
        updateLessonBundleDropdown();
        let bundleSel = document.getElementById('lesson-bundle');
        if(bundleSel && lesson.bundleId) bundleSel.value = lesson.bundleId;

        // KROK 4: Ustawienie reszty okienka
        document.getElementById('lesson-price').value = lesson.price || '';
        
        let paidCb = document.getElementById('lesson-paid');
        if(paidCb) paidCb.checked = lesson.paid || false;
        let cancelledCb = document.getElementById('lesson-cancelled');
        if(cancelledCb) cancelledCb.checked = lesson.cancelled || false;

        let recBox = document.getElementById('recurring-box');
        if(recBox) recBox.classList.add('hidden');
        let cancBox = document.getElementById('cancelled-box');
        if(cancBox) cancBox.classList.remove('hidden'); 
        document.getElementById('btn-delete-lesson').classList.remove('hidden');

        document.getElementById('modal-lesson').classList.remove('hidden');
        
        // KROK 5: Na sam koniec sprawdzamy pakiety i nakładamy szarą blokadę, jeśli trzeba
        handleBundleChange();
        
    } catch(err) {
        console.error("Błąd otwierania edycji lekcji:", err);
    }
}

async function saveLesson() {
    const id = document.getElementById('lesson-id').value;
    const studentId = document.getElementById('lesson-student').value;
    const subjectId = document.getElementById('lesson-subject').value;
    
    let bundleSel = document.getElementById('lesson-bundle');
    const bundleId = bundleSel ? bundleSel.value : '';
    
    let topicEl = document.getElementById('lesson-topic');
    const topic = topicEl ? topicEl.value : ''; 
    
    const date = document.getElementById('lesson-date').value;
    const startTime = document.getElementById('lesson-time-start').value;
    const endTime = document.getElementById('lesson-time-end').value;
    const price = document.getElementById('lesson-price').value;
    
    let paidCb = document.getElementById('lesson-paid');
    const paid = paidCb ? paidCb.checked : false;
    
    let cancelledCb = document.getElementById('lesson-cancelled');
    const cancelled = cancelledCb ? cancelledCb.checked : false;
    
    let recurringCb = document.getElementById('lesson-recurring');
    const isRecurring = recurringCb ? recurringCb.checked : false;
    
    let paymentDateEl = document.getElementById('lesson-payment-date');
    const paymentDate = bundleId && paymentDateEl ? paymentDateEl.value : date;

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
                    return new Date(l.date + "T12:00:00").getDay() === new Date(oldDate + "T12:00:00").getDay();
                }
                return false;
            });
        }

        if (futureLessons.length > 0) {
            let choice = await showSeriesChoice('Aktualizacja cyklu', 'Zmieniłeś szczegóły lekcji. Co chcesz zaktualizować?');
            if (choice === 'future') {
                let dateDiff = Math.round((new Date(date + "T12:00:00") - new Date(oldDate + "T12:00:00")) / (1000 * 60 * 60 * 24));
                futureLessons.forEach(fl => {
                    fl.studentId = studentId; fl.subjectId = subjectId; fl.bundleId = bundleId;
                    fl.startTime = startTime; fl.endTime = endTime; fl.price = price; fl.topic = topic; 
                    fl.bundleValue = bundleValue;
                    
                    if (dateDiff !== 0) {
                        let fd = new Date(fl.date + "T12:00:00");
                        fd.setDate(fd.getDate() + dateDiff);
                        fl.date = getLocalISODate(fd);
                        
                        if(bundleId) {
                            const st = students.find(s => s.id == studentId);
                            const bun = st ? st.bundles.find(b => b.id == bundleId) : null;
                            if(bun && bun.payDay !== undefined && bun.payDay !== "") {
                                let flDateObj = new Date(fl.date + "T12:00:00");
                                if(bun.type === 'monthly') {
                                    let targetDay = parseInt(bun.payDay);
                                    if(!isNaN(targetDay)) {
                                        let lastDayOfMonth = new Date(flDateObj.getFullYear(), flDateObj.getMonth() + 1, 0).getDate();
                                        let finalDay = Math.min(targetDay, lastDayOfMonth);
                                        let pDate = new Date(flDateObj.getFullYear(), flDateObj.getMonth(), finalDay);
                                        pDate.setHours(12,0,0,0);
                                        fl.paymentDate = getLocalISODate(pDate);
                                    }
                                } else {
                                    let wMon = getMonday(fl.date + "T12:00:00");
                                    let offset = parseInt(bun.payDay);
                                    if (offset === 0) { wMon.setDate(wMon.getDate() + 6); } 
                                    else { wMon.setDate(wMon.getDate() + (offset - 1)); }
                                    fl.paymentDate = getLocalISODate(wMon);
                                }
                            } else {
                                let pd = new Date((fl.paymentDate || fl.date) + "T12:00:00");
                                pd.setDate(pd.getDate() + dateDiff);
                                fl.paymentDate = getLocalISODate(pd);
                            }
                        } else { fl.paymentDate = fl.date; }
                    } else {
                        if(bundleId) {
                            const st = students.find(s => s.id == studentId);
                            const bun = st ? st.bundles.find(b => b.id == bundleId) : null;
                            if(bun && bun.payDay !== undefined && bun.payDay !== "") {
                                let flDateObj = new Date(fl.date + "T12:00:00");
                                if(bun.type === 'monthly') {
                                    let targetDay = parseInt(bun.payDay);
                                    if(!isNaN(targetDay)) {
                                        let lastDayOfMonth = new Date(flDateObj.getFullYear(), flDateObj.getMonth() + 1, 0).getDate();
                                        let finalDay = Math.min(targetDay, lastDayOfMonth);
                                        let pDate = new Date(flDateObj.getFullYear(), flDateObj.getMonth(), finalDay);
                                        pDate.setHours(12,0,0,0);
                                        fl.paymentDate = getLocalISODate(pDate);
                                    }
                                } else {
                                    let wMon = getMonday(fl.date + "T12:00:00");
                                    let offset = parseInt(bun.payDay);
                                    if (offset === 0) { wMon.setDate(wMon.getDate() + 6); } 
                                    else { wMon.setDate(wMon.getDate() + (offset - 1)); }
                                    fl.paymentDate = getLocalISODate(wMon);
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
        let baseDate = new Date(date + "T12:00:00");
        let basePayDate = new Date(paymentDate + "T12:00:00");
        let newGroupId = "grp_" + Date.now().toString() + Math.floor(Math.random() * 1000); 

        for(let i=0; i<repetitions; i++) {
            let lessonDate = new Date(baseDate); lessonDate.setDate(baseDate.getDate() + (i * 7));
            let pDate = new Date(basePayDate); pDate.setDate(basePayDate.getDate() + (i * 7));
            
            const stId = document.getElementById('lesson-student').value;
            const student = students.find(s => s.id == stId);
            const bundle = student ? (student.bundles || []).find(b => b.id == bundleId) : null;
            
            let finalPayDateStr = bundleId ? getLocalISODate(pDate) : getLocalISODate(lessonDate);
            
            if (bundle && bundle.type === 'monthly' && bundle.payDay !== undefined && bundle.payDay !== "") {
                let targetDay = parseInt(bundle.payDay);
                if(!isNaN(targetDay)) {
                    let lastDayOfMonth = new Date(lessonDate.getFullYear(), lessonDate.getMonth() + 1, 0).getDate();
                    let finalDay = Math.min(targetDay, lastDayOfMonth);
                    let correctPayDate = new Date(lessonDate.getFullYear(), lessonDate.getMonth(), finalDay);
                    correctPayDate.setHours(12,0,0,0);
                    finalPayDateStr = getLocalISODate(correctPayDate);
                }
            }

            lessons.push({
                id: Date.now().toString() + Math.floor(Math.random() * 1000) + i,
                groupId: isRecurring ? newGroupId : null,
                studentId, subjectId, bundleId, 
                paymentDate: finalPayDateStr,
                topic, date: getLocalISODate(lessonDate),
                startTime, endTime, price, 
                bundleValue: bundleValue,
                cancelled: false,
                paid: (paid && i === 0) ? true : false
            });
        }
    }
    saveLessonsToCloud(); closeModals(); 
    if(typeof renderCalendar === 'function') renderCalendar();
    let pulpitView = document.getElementById('view-pulpit');
    if(pulpitView && !pulpitView.classList.contains('hidden')) {
        if(typeof renderDashboard === 'function') renderDashboard();
    }
    showToast('Zapisano lekcję!');
}

async function deleteLesson() {
    const id = document.getElementById('lesson-id').value;
    let originalLesson = lessons.find(l => l.id == id);
    
    let futureLessons = lessons.filter(l => {
        if (l.id == id || l.date < originalLesson.date) return false;
        if (originalLesson.groupId && l.groupId === originalLesson.groupId) return true;
        if (!originalLesson.groupId && l.studentId == originalLesson.studentId && l.subjectId == originalLesson.subjectId) {
            return new Date(l.date + "T12:00:00").getDay() === new Date(originalLesson.date + "T12:00:00").getDay();
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
    
    saveLessonsToCloud(); closeModals(); 
    if(typeof renderCalendar === 'function') renderCalendar();
    let pulpitView = document.getElementById('view-pulpit');
    if(pulpitView && !pulpitView.classList.contains('hidden')) {
        if(typeof renderDashboard === 'function') renderDashboard();
    }
    showToast('Lekcja usunięta', 'success');
}

function markAsPaid(id, event) {
    event.stopPropagation(); 
    let lesson = lessons.find(l => l.id == id);
    if(lesson) {
        lesson.paid = true; saveLessonsToCloud(); 
        if(typeof renderDashboard === 'function') renderDashboard();
        let kalendarzView = document.getElementById('view-kalendarz');
        if(kalendarzView && !kalendarzView.classList.contains('hidden')) {
            if(typeof renderCalendar === 'function') renderCalendar();
        }
        showToast('Oznaczono jako opłacone!');
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
    saveLessonsToCloud(); 
    if(typeof renderDashboard === 'function') renderDashboard();
    let kalendarzView = document.getElementById('view-kalendarz');
    if(kalendarzView && !kalendarzView.classList.contains('hidden')) {
        if(typeof renderCalendar === 'function') renderCalendar();
    }
    showToast('Pakiet opłacony!');
}
