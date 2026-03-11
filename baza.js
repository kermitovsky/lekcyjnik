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

// --- ZMIENNE GLOBALNE (współdzielone między wszystkimi plikami) ---
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
let datePicker, timeStartPicker, timeEndPicker, jumpPicker, paymentDatePicker; 
let chartInstances = {}; 
let currentStudentBundles = []; 
let currentCalendarView = 'grid'; 
let notifiedLessons = new Set();

// Ustawienia wykresów
Chart.defaults.font.family = "'Inter', 'sans-serif'";
Chart.defaults.color = '#64748b';

// --- LOGOWANIE I CHMURA ---
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
        
        initNotifications();
        checkNotifications();

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

// --- EKSPORT I IMPORT DANYCH ---
function eksportujDane() {
    const backupData = { subjects, students, lessons, settings };
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
                if(data.settings) settings = data.settings;
                
                saveSubjectsToCloud(); saveStudentsToCloud(); saveLessonsToCloud(); saveSettingsToCloud();
                
                applyVisualSettings(); switchTab('pulpit');
                showToast('Wgrano kopię zapasową!');
            } else { await customAlert('Błąd pliku', 'Ten plik jest uszkodzony.'); }
        } catch (error) { await customAlert('Błąd', 'Nie udało się poprawnie odczytać pliku.'); }
        event.target.value = '';
    };
    reader.readAsText(file);
}
