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
    bgPattern: 'grid', 
    defaultView: 'grid', 
    startHour: 7,
    endHour: 22,
    duration: 60,
    timeBuffer: 0, 
    hideWeekends: false, 
    defaultPrice: '', 
    smsEnabled: false, // Domyślnie WYŁĄCZONE
    smsReminder: 'Cześć! Przypominam o naszej lekcji: [DATA] o [CZAS].',
    smsPayment: 'Cześć, przypominam o zbliżającym się terminie zapłaty. Kwota do przelewu: [KWOTA] zł. Dzięki!',
    availability: null 
};

let currentDate = new Date();
let slotDate = new Date();
let currentCalendarView = 'grid';
let currentStudentBundles = [];
let datePicker, timeStartPicker, timeEndPicker, paymentDatePicker;
let chartInstances = {};
let dbUnsubscribe = null;

// --- LOGOWANIE ---
const provider = new firebase.auth.GoogleAuthProvider();

function zalogujPrzezGoogle() {
    firebase.auth().signInWithPopup(provider).catch(error => {
        alert("Błąd logowania: " + error.message);
    });
}

function wyloguj() {
    firebase.auth().signOut();
}

firebase.auth().onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        document.getElementById('view-login').classList.add('hidden');
        document.getElementById('app-nav').classList.remove('hidden');
        document.getElementById('main-content').classList.remove('hidden');
        document.getElementById('view-skeleton').classList.remove('hidden');
        loadDataFromCloud();
    } else {
        currentUser = null;
        document.getElementById('view-login').classList.remove('hidden');
        document.getElementById('app-nav').classList.add('hidden');
        document.getElementById('main-content').classList.add('hidden');
        document.querySelectorAll('main > div').forEach(el => el.classList.add('hidden'));
        if(dbUnsubscribe) { dbUnsubscribe(); dbUnsubscribe = null; }
    }
});

// --- OPERACJE NA BAZIE (Zapis / Odczyt) ---
function loadDataFromCloud() {
    if (!currentUser) return;
    
    const docRef = db.collection('planer_korepetytora').doc(currentUser.uid);
    
    if(dbUnsubscribe) dbUnsubscribe();
    
    dbUnsubscribe = docRef.onSnapshot((doc) => {
        if (doc.exists) {
            const data = doc.data();
            subjects = data.subjects || [];
            students = data.students || [];
            lessons = data.lessons || [];
            if(data.settings) settings = { ...settings, ...data.settings }; 
            
            currentCalendarView = settings.defaultView || 'grid';
            
            applyVisualSettings();
            renderSubjects(); renderStudents(); 
            let kalendarzView = document.getElementById('view-kalendarz');
            if(kalendarzView && !kalendarzView.classList.contains('hidden')) renderCalendar();
            let pulpitView = document.getElementById('view-pulpit');
            if(pulpitView && !pulpitView.classList.contains('hidden')) renderDashboard();
            let zarobkiView = document.getElementById('view-zarobki');
            if(zarobkiView && !zarobkiView.classList.contains('hidden')) renderZarobki();
            
            document.getElementById('view-skeleton').classList.add('hidden');
            let anyVisible = false;
            document.getElementById('nav-tabs').querySelectorAll('.nav-tab').forEach(t => {
                if(t.classList.contains('aktywny')) anyVisible = true;
            });
            if(!anyVisible) switchTab('pulpit');
            
        } else {
            docRef.set({ subjects: [], students: [], lessons: [], settings: settings });
            applyVisualSettings();
            document.getElementById('view-skeleton').classList.add('hidden');
            switchTab('pulpit');
        }
    }, (error) => {
        console.error("Błąd pobierania danych: ", error);
        showToast('Brak połączenia z chmurą', 'error');
    });
}

function saveSubjectsToCloud() { if(currentUser) db.collection('planer_korepetytora').doc(currentUser.uid).update({ subjects: subjects }); }
function saveStudentsToCloud() { if(currentUser) db.collection('planer_korepetytora').doc(currentUser.uid).update({ students: students }); }
function saveLessonsToCloud() { if(currentUser) db.collection('planer_korepetytora').doc(currentUser.uid).update({ lessons: lessons }); }
function saveSettingsToCloud() { if(currentUser) db.collection('planer_korepetytora').doc(currentUser.uid).update({ settings: settings }); }

function eksportujDane() {
    const backupData = { subjects, students, lessons, settings, exportDate: new Date().toISOString() };
    const dataStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([dataStr], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `TutoGrid_Kopia_${getLocalISODate(new Date())}.json`;
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
                if(data.settings) settings = { ...settings, ...data.settings };
                
                saveSubjectsToCloud(); saveStudentsToCloud(); saveLessonsToCloud(); saveSettingsToCloud();
                
                applyVisualSettings(); switchTab('pulpit');
                showToast('Wgrano kopię zapasową!');
            } else { await customAlert('Błąd pliku', 'Ten plik jest uszkodzony.'); }
        } catch (error) { await customAlert('Błąd', 'Nie udało się wgrać pliku.'); }
        event.target.value = '';
    };
    reader.readAsText(file);
}
