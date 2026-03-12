// ==========================================
// --- GLOBALNA FUNKCJA OPŁACANIA CYKLU ---
// ==========================================
window.markCycleAsPaid = function(idsStr, event) {
    event.stopPropagation();
    let ids = idsStr.split(',');
    let changed = false;
    lessons.forEach(l => {
        if(ids.includes(String(l.id))) {
            l.paid = true;
            changed = true;
        }
    });
    if(changed) {
        if(typeof saveLessonsToCloud === 'function') saveLessonsToCloud();
        if(typeof renderDashboard === 'function') renderDashboard();
        let kalendarzView = document.getElementById('view-kalendarz');
        if(kalendarzView && !kalendarzView.classList.contains('hidden')) {
            if(typeof renderCalendar === 'function') renderCalendar();
        }
        if(typeof showToast === 'function') showToast('Pakiet opłacony!');
    }
};

// ==========================================
// --- WIDOK PULPITU ---
// ==========================================

function renderDashboard() {
    const now = new Date(); const currentMonth = now.getMonth(); const currentYear = now.getFullYear();
    const todayString = getLocalISODate(now);
    const nowTime = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');
    const monthNames = ["Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec", "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"];
    const monthsGenitive = ["stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca", "lipca", "sierpnia", "września", "października", "listopada", "grudnia"];
    
    let pulpitMonthTitle = document.getElementById('pulpit-month-title');
    if(pulpitMonthTitle) pulpitMonthTitle.innerText = `Zarobki - ${monthNames[currentMonth]}`;

    let earnings = 0, lessonsThisMonth = 0; let plannedEarnings = 0; 
    let prevMonthEarnings = 0;
    
    let prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    let prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    lessons.forEach(l => {
        let lDate = new Date(l.date + "T12:00:00"); 
        let effectivePrice = Number(l.price || 0);
        if (l.bundleId && l.bundleValue !== null && l.bundleValue !== undefined) {
            effectivePrice = Number(l.bundleValue);
        }

        if(!l.cancelled && l.paid) {
            if(lDate.getMonth() === currentMonth && lDate.getFullYear() === currentYear) {
                earnings += effectivePrice; 
                lessonsThisMonth++;
            } else if (lDate.getMonth() === prevMonth && lDate.getFullYear() === prevYear) {
                prevMonthEarnings += effectivePrice;
            }
        }
        
        if(!l.cancelled && !l.paid) {
            if(lDate.getMonth() === currentMonth && lDate.getFullYear() === currentYear) {
                plannedEarnings += effectivePrice; 
                lessonsThisMonth++;
            }
        }
    });

    animateValue('dashboard-monthly-earnings', 0, Math.round(earnings), 800, ' zł');
    animateValue('dashboard-planned-earnings', 0, Math.round(plannedEarnings), 800, ' zł');

    let dashboardLessons = document.getElementById('dashboard-monthly-lessons');
    if(dashboardLessons) dashboardLessons.innerText = `${lessonsThisMonth} lekcji`;
    
    let dashboardStudents = document.getElementById('dashboard-active-students');
    if(dashboardStudents) dashboardStudents.innerText = students.filter(s => !s.archived).length;

    let momEl = document.getElementById('dashboard-mom-comparison');
    if (momEl) {
        if (prevMonthEarnings === 0) {
            momEl.innerHTML = `<span class="tekst-szary">Pierwszy miesiąc z TutoGrid 🚀</span>`;
        } else {
            let diff = earnings - prevMonthEarnings;
            let percent = Math.round((diff / prevMonthEarnings) * 100);
            if (percent > 0) {
                momEl.innerHTML = `<span class="text-emerald-500">📈 +${percent}% (${Math.round(earnings)} zł vs ${Math.round(prevMonthEarnings)} zł)</span>`;
            } else if (percent < 0) {
                momEl.innerHTML = `<span class="text-rose-500">📉 ${percent}% (${Math.round(earnings)} zł vs ${Math.round(prevMonthEarnings)} zł)</span>`;
            } else {
                momEl.innerHTML = `<span class="tekst-szary">Zarobki na tym samym poziomie (0%)</span>`;
            }
        }
    }

    let upcomingLessons = lessons.filter(l => !l.cancelled && (l.date > todayString || (l.date === todayString && l.endTime >= nowTime)));
    upcomingLessons.sort((a,b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
    
    const upcomingContainer = document.getElementById('pulpit-upcoming-lessons'); 
    if(upcomingContainer) {
        let upcomingHtml = '';
        if(upcomingLessons.length === 0) {
            upcomingHtml = '<p class="text-sm md:text-base tekst-szary">Brak zaplanowanych lekcji.</p>';
        } else {
            upcomingLessons.slice(0, 5).forEach(l => {
                let student = students.find(s => s.id == l.studentId) || {name: 'Nieznany uczeń'};
                let subject = subjects.find(s => s.id == l.subjectId);
                let lDate = new Date(l.date + "T12:00:00"); let dayNames = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'];
                let dateDisplay = l.date === todayString ? 'Dzisiaj' : `${dayNames[lDate.getDay()]}, ${lDate.getDate()} ${monthsGenitive[lDate.getMonth()]}`;
                let badge = subject ? `<span class="text-[9px] md:text-[10px] font-bold px-1.5 md:px-2 py-1 rounded border" style="background-color: ${hexToRgba(subject.color, 0.2)}; color: ${esc(subject.color)}; border-color: ${esc(subject.color)}">${esc(subject.name).toUpperCase()}</span>` : '';

                upcomingHtml += `
                    <div onclick="editLesson('${l.id}')" class="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 md:p-4 rounded-xl border-2 cursor-pointer transition shadow-sm hover:shadow-md gap-2 sm:gap-0 lesson-block" style="background-color: var(--karta-bg); border-color: var(--szary-ramka);" data-id="${l.id}">
                        <div class="flex items-center gap-3 md:gap-4">
                            <div class="w-8 h-8 md:w-10 h-10 rounded-full flex items-center justify-center font-bold border text-sm md:text-base" style="background-color: var(--jasny); border-color: var(--szary-ramka); color: var(--tekst-szary);">🕒</div>
                            <div>
                                <div class="font-extrabold text-sm md:text-base">${esc(student.name)}</div>
                                <div class="text-xs md:text-sm font-medium tekst-szary">${dateDisplay}, ${l.startTime}</div>
                            </div>
                        </div>
                        <div class="flex items-center gap-2">
                            ${badge}
                            <button onclick="event.stopPropagation(); window.copySms('reminder', '${esc(student.name)}', '${l.date}', '${l.startTime}', '${l.price||0}')" title="Kopiuj SMS z przypomnieniem" class="ml-2 hover:scale-110 transition text-lg">💬</button>
                        </div>
                    </div>`;
            });
        }
        upcomingContainer.innerHTML = upcomingHtml;
    }

    let individualPayments = []; 
    let activeBundles = {};
    let overdueTotal = 0; 
    let pendingTotal = 0;
    let overdueCount = 0;

    lessons.forEach(l => {
        if (l.cancelled) return; 
        let isPast = (l.date < todayString || (l.date === todayString && l.endTime < nowTime));
        let student = students.find(s => s.id == l.studentId);
        let bundle = student && student.bundles ? student.bundles.find(b => b.id == l.bundleId) : null;
        
        if (!l.bundleId || !bundle) {
            if (!l.paid && isPast) {
                individualPayments.push(l);
                overdueTotal += Number(l.price || 0);
                overdueCount++;
            }
        } else {
            let cycleKey = '';
            if (bundle.type === 'monthly') { cycleKey = l.date.substring(0, 7); } 
            else { cycleKey = getLocalISODate(getMonday(l.date + "T12:00:00")); }
            
            let key = `${l.studentId}_${l.bundleId}_${cycleKey}`;
            
            if (!activeBundles[key]) {
                activeBundles[key] = {
                    studentId: l.studentId, bundleId: l.bundleId, bundleName: bundle.name, lessonIds: [],
                    paymentDate: l.paymentDate || l.date, totalLessons: 0, completedLessons: 0,
                    isFullyPaid: true, hasPastLessons: false, displayPrice: Number(bundle.total)
                };
            }
            
            activeBundles[key].lessonIds.push(l.id);
            activeBundles[key].totalLessons++; 
            if (isPast) { activeBundles[key].completedLessons++; activeBundles[key].hasPastLessons = true; }
            if (!l.paid) { activeBundles[key].isFullyPaid = false; }
            let lPay = l.paymentDate || l.date;
            if (lPay > activeBundles[key].paymentDate) { activeBundles[key].paymentDate = lPay; }
        }
    });

    let bundlesToShow = Object.values(activeBundles).filter(b => !b.isFullyPaid && b.hasPastLessons);
    bundlesToShow.forEach(b => {
        let isOverdue = todayString > b.paymentDate; 
        if (isOverdue) { overdueTotal += b.displayPrice; overdueCount++; } 
        else { pendingTotal += b.displayPrice; }
    });

    let sumEl = document.getElementById('dashboard-unpaid-sum');
    if (sumEl) {
        sumEl.innerHTML = `<span id="dashboard-animated-overdue">0</span> zł` + 
                          (pendingTotal > 0 ? ` <span class="text-orange-500 text-[0.55em] font-extrabold ml-1 align-middle">(${Math.round(pendingTotal)} zł w trakcie)</span>` : '');
        animateValue('dashboard-animated-overdue', 0, Math.round(overdueTotal), 800, '');
    }

    let dashUnpaidCount = document.getElementById('dashboard-unpaid-count');
    if(dashUnpaidCount) { dashUnpaidCount.innerText = `${overdueCount} zaległości`; }

    const unpaidContainer = document.getElementById('pulpit-unpaid-lessons'); 
    if(unpaidContainer) {
        let totalCards = overdueCount + bundlesToShow.filter(b => todayString <= b.paymentDate).length;
        let unpaidHtml = '';

        if(totalCards === 0) {
            unpaidHtml = `<div class="border-2 p-4 md:p-6 rounded-xl text-center" style="background-color: rgba(16, 185, 129, 0.1); border-color: rgba(16, 185, 129, 0.3)"><div class="text-2xl md:text-3xl mb-1 md:mb-2">🎉</div><p class="text-emerald-500 font-bold text-sm md:text-base">Uczniowie nie mają zaległości.</p></div>`;
        } else {
            bundlesToShow.forEach(group => {
                let student = students.find(s => s.id == group.studentId) || {name: 'Nieznany uczeń'};
                let isOverdue = todayString > group.paymentDate; 
                let bgClass = isOverdue ? 'bg-rose-50 border-rose-300' : 'bg-orange-50 border-orange-300';
                let textClass = isOverdue ? 'text-rose-600' : 'text-orange-600';
                let textSubClass = isOverdue ? 'text-rose-500' : 'text-orange-500';
                let priceClass = isOverdue ? 'text-rose-600' : 'text-orange-600';
                let badgeClass = isOverdue ? 'bg-rose-100 text-rose-700 border-rose-300' : 'bg-orange-100 text-orange-700 border-orange-300';
                
                let icon = isOverdue ? '⚠️ PO TERMINIE' : '⏳ W TRAKCIE (Oczekuje)';
                if (group.completedLessons === group.totalLessons && !isOverdue) icon = '⏳ OCZEKUJE NA WPŁATĘ';
                
                unpaidHtml += `
                    <div class="flex justify-between items-center p-3 md:p-4 rounded-xl border-2 transition mb-2 shadow-sm hover:shadow-md ${bgClass}">
                        <div>
                            <div class="font-bold text-sm md:text-base">${esc(student.name)}</div>
                            <div class="text-[10px] md:text-xs font-bold mt-1 ${textClass} flex items-center gap-2">
                                <span>📦 ${esc(group.bundleName)}</span>
                                <span class="px-1.5 py-0.5 rounded border text-[9px] md:text-[10px] whitespace-nowrap font-extrabold ${badgeClass}">Lekcje: ${group.completedLessons}/${group.totalLessons}</span>
                            </div>
                            <div class="text-[9px] md:text-[10px] ${textSubClass} font-bold mt-1 uppercase tracking-wider">${icon} | Termin wpłaty: ${group.paymentDate}</div>
                        </div>
                        <div class="flex flex-col items-end gap-2 shrink-0">
                            <div class="font-extrabold ${priceClass} text-base md:text-lg">${Math.round(group.displayPrice)} zł</div>
                            <div class="flex items-center gap-2">
                                <button onclick="window.copySms('payment', '${esc(student.name)}', '', '', '${Math.round(group.displayPrice)}')" title="Kopiuj SMS z przypomnieniem" class="text-xl hover:scale-110 transition">💬</button>
                                <button onclick="window.markCycleAsPaid('${group.lessonIds.join(',')}', event)" class="px-3 py-1.5 rounded-lg border-2 text-[10px] md:text-xs font-bold shadow-sm bg-white ${textClass} border-[currentColor] hover:bg-slate-50 transition whitespace-nowrap hover:-translate-y-0.5">Opłać pakiet</button>
                            </div>
                        </div>
                    </div>`;
            });

            individualPayments.sort((a,b) => (a.date + a.startTime).localeCompare(b.date + b.startTime)).slice(0, 5).forEach(l => {
                let student = students.find(s => s.id == l.studentId) || {name: 'Nieznany uczeń'};
                unpaidHtml += `
                    <div onclick="editLesson('${l.id}')" class="flex justify-between items-center p-3 rounded-xl cursor-pointer border-2 transition mb-2 lesson-block bg-rose-50 border-rose-200 hover:border-rose-300 shadow-sm" data-id="${l.id}">
                        <div>
                            <div class="font-bold text-sm md:text-base">${esc(student.name)}</div>
                            <div class="text-[10px] md:text-xs font-medium text-rose-500">${l.date} | ${l.startTime}</div>
                        </div>
                        <div class="flex items-center gap-2 md:gap-3">
                            <div class="font-extrabold text-rose-600 text-sm md:text-base">${l.price || 0} zł</div>
                            <button onclick="event.stopPropagation(); window.copySms('payment', '${esc(student.name)}', '', '', '${l.price||0}')" title="Kopiuj SMS z przypomnieniem" class="text-xl hover:scale-110 transition">💬</button>
                            <button onclick="markAsPaid('${l.id}', event)" class="px-2 py-1.5 rounded-lg border-2 text-[10px] md:text-xs font-bold shadow-sm bg-white text-rose-600 border-rose-300 hover:bg-rose-100 transition whitespace-nowrap hover:-translate-y-0.5">Zapłacone</button>
                        </div>
                    </div>`;
            });
        }
        unpaidContainer.innerHTML = unpaidHtml;
    }

    const weekContainer = document.getElementById('pulpit-week-view'); 
    if(weekContainer) {
        let weekHtml = '';
        const mondayString = getLocalISODate(getMonday(now));
        let sundayDate = new Date(getMonday(now)); sundayDate.setDate(sundayDate.getDate() + 6);
        const sundayString = getLocalISODate(sundayDate);

        let thisWeekLessons = lessons.filter(l => l.date >= mondayString && l.date <= sundayString);
        thisWeekLessons.sort((a,b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));

        if(thisWeekLessons.length === 0) {
            weekHtml = '<p class="text-sm md:text-base tekst-szary">Pusty grafik na ten tydzień.</p>';
        } else {
            const daysNamesPL = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota']; let lastDay = '';
            thisWeekLessons.forEach(l => {
                let lDate = new Date(l.date + "T12:00:00");
                let dayDisplay = l.date === todayString ? `<span class="tekst-akcent">Dzisiaj</span>` : daysNamesPL[lDate.getDay()];
                if(l.date !== lastDay) {
                    weekHtml += `<div class="text-xs md:text-sm font-extrabold uppercase tracking-wider mt-4 md:mt-6 mb-2 border-b-2 pb-1" style="border-color: var(--szary-ramka);">${dayDisplay} <span class="font-medium text-[10px] md:text-xs normal-case opacity-70">(${l.date})</span></div>`;
                    lastDay = l.date;
                }

                let student = students.find(s => s.id == l.studentId) || {name: 'Nieznany uczeń'};
                let subject = subjects.find(s => s.id == l.subjectId) || {name: 'Brak', color: '#cbd5e1'};
                
                let statusIcon = l.cancelled 
                    ? `<span class="px-1.5 py-1 rounded border text-[9px] font-bold shadow-sm" style="background-color: var(--jasny); border-color: var(--szary-ramka); color: var(--tekst-szary);">Odwołana ❌</span>` 
                    : (l.paid ? '<span class="px-1.5 py-1 rounded border text-[9px] font-bold shadow-sm text-emerald-600 bg-emerald-50 border-emerald-200">Opłacone</span>' : '<span class="px-1.5 py-1 rounded border text-[9px] font-bold shadow-sm text-rose-500 bg-rose-50 border-rose-200">Brak</span>');
                
                let cardOpacity = l.cancelled ? 'opacity: 0.5; filter: grayscale(100%);' : '';
                let lineThrough = l.cancelled ? 'text-decoration: line-through;' : '';
                let topicHtml = l.topic ? `<p class="text-[10px] md:text-xs font-medium truncate mt-0.5 tekst-szary">📝 ${esc(l.topic)}</p>` : '';
                let bundleBadge = l.bundleId ? `<span class="text-[8px] md:text-[9px] font-bold px-1.5 py-0.5 rounded ml-1 border bg-blue-50 text-blue-600 border-blue-200">📦 PAKIET</span>` : '';

                weekHtml += `
                    <div onclick="editLesson('${l.id}')" class="flex items-center justify-between p-3 md:p-4 rounded-xl border-2 cursor-pointer transition hover:-translate-y-0.5 gap-2 md:gap-4 lesson-block shadow-sm" style="background-color: var(--karta-bg); border-color: var(--szary-ramka); ${cardOpacity}" data-id="${l.id}">
                        <div class="flex items-center gap-3 md:gap-4 w-full truncate">
                            <div class="w-1.5 h-10 md:h-12 rounded-full shrink-0" style="background-color: ${esc(subject.color)}"></div>
                            <div class="truncate flex-1">
                                <p class="font-extrabold text-sm md:text-base" style="${lineThrough}">${l.startTime} - ${l.endTime}</p>
                                <p class="text-xs md:text-sm font-medium truncate tekst-szary">${esc(student.name)} <span class="text-[8px] md:text-[10px] font-bold px-1.5 py-0.5 rounded ml-1 border hidden sm:inline-block" style="background-color: ${hexToRgba(subject.color, 0.2)}; color: ${esc(subject.color)}; border-color: ${esc(subject.color)}">${esc(subject.name).toUpperCase()}</span>${bundleBadge}</p>
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
        weekContainer.innerHTML = weekHtml;
    }
}


// ==========================================
// --- WIDOK KALENDARZA ---
// ==========================================

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
    
    let monthDisplay = document.getElementById('month-year-display');
    if(monthDisplay) monthDisplay.innerText = `${monthNames[sunday.getMonth()]} ${sunday.getFullYear()}`;
    
    let formatDay = (date) => date.getDate().toString().padStart(2, '0');
    let weekBtnText = document.getElementById('calendar-week-btn-text');
    if(weekBtnText) weekBtnText.innerText = `${formatDay(monday)} - ${formatDay(sunday)} ${monthNames[sunday.getMonth()].substring(0,3).toUpperCase()}`;

    let calHeader = document.getElementById('calendar-header');
    if(!calHeader) return;

    if (currentCalendarView === 'agenda') {
        renderAgendaView(monday, sunday);
        return;
    }

    const daysNames = ['PON', 'WT', 'ŚR', 'CZW', 'PT', 'SOB', 'ND'];
    let daysCount = settings.hideWeekends ? 5 : 7;
    let gridColsClass = settings.hideWeekends ? 'grid-cols-6' : 'grid-cols-8';
    
    // Zmiana klas siatki w zależności od weekendów
    calHeader.className = `grid ${gridColsClass} border-b-2 sticky top-0 z-20`;
    document.getElementById('calendar-grid').className = `grid ${gridColsClass} relative min-h-[900px]`;

    let headerHtml = '<div class="border-r-2 p-1 md:p-2 w-12 md:w-16 shrink-0" style="background-color: var(--karta-bg); border-color: var(--ciemny);"></div>';
    
    for(let i=0; i < daysCount; i++) {
        let dayDate = new Date(monday); dayDate.setDate(monday.getDate() + i);
        let isToday = getLocalISODate(dayDate) === getLocalISODate(new Date());
        let circleStyle = isToday ? `background-color: var(--akcent); color: #fff; border: 2px solid var(--ciemny); box-shadow: 2px 2px 0 var(--ciemny)` : `color: var(--tekst-glowny)`;
        let textStyle = isToday ? `color: var(--akcent)` : `color: var(--tekst-szary)`;
        
        headerHtml += `
            <div class="text-center py-2 md:py-3 border-r-2 day-col flex-1" style="background-color: var(--karta-bg); border-color: var(--ciemny);">
                <div class="text-[10px] md:text-xs font-extrabold mb-1 md:mb-2 tracking-wider" style="${textStyle}">${daysNames[i]}</div>
                <div class="mx-auto w-8 h-8 md:w-12 md:h-12 flex items-center justify-center rounded-full font-extrabold text-sm md:text-xl" style="${circleStyle}">
                    ${dayDate.getDate()}
                </div>
            </div>`;
    }
    calHeader.innerHTML = headerHtml;

    let gridHtml = `<div class="border-r-2 relative w-12 md:w-16 shrink-0 z-10" style="background-color: var(--karta-bg); border-color: var(--ciemny);">`;
    for(let h = settings.startHour; h <= settings.endHour; h++) {
        gridHtml += `<div class="h-24 time-row text-[10px] md:text-xs text-right pr-1 md:pr-2 pt-1 font-bold tekst-szary" id="hour-row-${h}">${h}:00</div>`;
    }
    gridHtml += `</div>`;

    for(let i=0; i < daysCount; i++) {
        let dayDate = new Date(monday); dayDate.setDate(monday.getDate() + i);
        let dateString = getLocalISODate(dayDate);
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
            let topicHtml = lesson.topic ? `<div class="truncate text-[8px] md:text-[10px] font-medium mt-0.5 tekst-glowny">📝 ${esc(lesson.topic)}</div>` : '';

            gridHtml += `
                <div onclick="editLesson('${lesson.id}')" class="absolute w-[94%] left-[3%] rounded-lg md:rounded-xl p-1 md:p-1.5 overflow-hidden shadow-sm hover:shadow-[2px_2px_0_var(--ciemny)] hover:-translate-y-0.5 transition cursor-pointer flex flex-col border-l-2 md:border-l-4 border lesson-block" 
                     style="top: ${topPosition}px; height: ${height}px; background-color: ${bgColor}; border-left-color: ${esc(subject.color)}; border-color: ${esc(subject.color)}; ${opacityAndStrike}"
                     data-id="${lesson.id}">
                    <div class="font-bold flex justify-between text-[9px] md:text-xs mb-0.5" style="color: ${esc(subject.color)}">
                        <span class="whitespace-nowrap tracking-tighter md:tracking-normal">${lesson.startTime}-${lesson.endTime}</span>
                        <span title="Status" class="hidden md:inline">${icon}</span>
                    </div>
                    <div class="font-extrabold truncate leading-tight text-[11px] md:text-sm">${esc(student.name)}</div>
                    <div class="font-bold truncate mt-auto text-[8px] md:text-[9px] uppercase tracking-wider tekst-szary">${esc(subject.name)}</div>
                    ${topicHtml}
                </div>`;
        });
        gridHtml += `</div>`;
    }
    document.getElementById('calendar-grid').innerHTML = gridHtml;
    updateCurrentTimeLine();

    let weekStringStart = getLocalISODate(monday);
    let weekStringEnd = getLocalISODate(sunday);
    let weekLessons = lessons.filter(l => l.date >= weekStringStart && l.date <= weekStringEnd && !l.cancelled);

    let earliestHour = settings.endHour;
    let hasLessons = false;
    
    weekLessons.forEach(l => {
        let h = parseInt(l.startTime.split(':')[0]);
        if(h < earliestHour) {
            earliestHour = h;
            hasLessons = true;
        }
    });

    setTimeout(() => {
        let scrollTargetHour = earliestHour - 1;
        if(scrollTargetHour < settings.startHour) scrollTargetHour = settings.startHour;
        
        let targetPos = hasLessons ? ((scrollTargetHour - settings.startHour) * 96) : 0;

        let calScroll = document.getElementById('calendar-body-scroll');
        let mainContent = document.getElementById('main-content'); 

        if (calScroll && calScroll.scrollHeight > calScroll.clientHeight) {
            calScroll.scrollTo({ top: targetPos, behavior: 'smooth' });
        } else if (mainContent && mainContent.scrollHeight > mainContent.clientHeight) {
            mainContent.scrollTo({ top: targetPos, behavior: 'smooth' });
        } else if (calScroll) {
            calScroll.scrollTop = targetPos; 
        }
    }, 400); 
}

function renderAgendaView(monday, sunday) {
    const container = document.getElementById('calendar-agenda-container');
    let agendaHtml = '';
    
    let weekStringStart = getLocalISODate(monday);
    let weekStringEnd = getLocalISODate(sunday);

    let weekLessons = lessons.filter(l => l.date >= weekStringStart && l.date <= weekStringEnd);
    if(settings.hideWeekends) {
        weekLessons = weekLessons.filter(l => {
            let day = new Date(l.date + "T12:00:00").getDay();
            return day !== 0 && day !== 6;
        });
    }
    
    weekLessons.sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));

    if (weekLessons.length === 0) {
        container.innerHTML = '<div class="flex flex-col items-center justify-center h-full text-center opacity-50 p-10"><div class="text-6xl mb-4">☕</div><h3 class="text-xl font-extrabold">Brak zajęć w tym tygodniu</h3><p class="font-bold">Czas na odpoczynek!</p></div>';
        return;
    }

    const daysNamesPL = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];
    let lastDate = '';

    weekLessons.forEach(l => {
        if (l.date !== lastDate) {
            let d = new Date(l.date + "T12:00:00");
            let dayName = daysNamesPL[d.getDay()];
            let todayStr = getLocalISODate(new Date());
            let isToday = l.date === todayStr;
            let dayHeaderColor = isToday ? 'color: var(--akcent)' : 'color: var(--tekst-glowny)';
            
            agendaHtml += `
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
                    linksHtml += `<a href="${esc(url)}" target="_blank" onclick="event.stopPropagation()" class="px-3 py-1.5 bg-white border-2 rounded-lg text-[10px] md:text-xs font-bold hover:-translate-y-0.5 transition shadow-[2px_2px_0_var(--ciemny)] ramka-ciemna tekst-ciemny">🔗 Materiał ${idx+1}</a>`;
                });
                linksHtml += '</div>';
            }
        }

        agendaHtml += `
            <div onclick="editLesson('${l.id}')" class="karta cursor-pointer transition hover:-translate-y-1 hover:shadow-[6px_6px_0_var(--ciemny)] border-4 p-4 md:p-5 mb-4 flex flex-col lesson-block" 
                 style="background-color: var(--karta-bg); border-color: var(--ciemny); border-left-width: 8px; border-left-color: ${esc(subject.color)}; ${opacityAndStrike}" 
                 data-id="${l.id}">
                 
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
    container.innerHTML = agendaHtml;
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

// ==========================================
// --- SZUKANIE TERMINU ---
// ==========================================

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
    let daysCount = settings.hideWeekends ? 5 : 7;
    let gridColsClass = settings.hideWeekends ? 'grid-cols-6' : 'grid-cols-8';

    let calHeader = document.getElementById('slot-calendar-header');
    calHeader.className = `grid ${gridColsClass} border-b-2 sticky top-0 z-20`;
    document.getElementById('slot-calendar-grid').className = `grid ${gridColsClass} relative min-h-[600px]`;

    let headerHtml = '<div class="border-r-2 p-1 md:p-2 w-12 shrink-0" style="background-color: var(--karta-bg); border-color: var(--ciemny);"></div>';
    
    for(let i=0; i < daysCount; i++) {
        let dayDate = new Date(monday); dayDate.setDate(monday.getDate() + i);
        let isToday = getLocalISODate(dayDate) === getLocalISODate(new Date());
        let circleStyle = isToday ? `background-color: var(--akcent); color: #fff; border: 2px solid var(--ciemny);` : `color: var(--tekst-glowny)`;
        let textStyle = isToday ? `color: var(--akcent)` : `color: var(--tekst-szary)`;
        
        headerHtml += `
            <div class="text-center py-1 md:py-2 border-r-2 day-col flex-1" style="background-color: var(--karta-bg); border-color: var(--ciemny);">
                <div class="text-[10px] md:text-xs font-extrabold mb-1 tracking-wider" style="${textStyle}">${daysNames[i]}</div>
                <div class="mx-auto w-6 h-6 md:w-8 md:h-8 flex items-center justify-center rounded-full font-extrabold text-xs md:text-sm" style="${circleStyle}">
                    ${dayDate.getDate()}
                </div>
            </div>`;
    }
    calHeader.innerHTML = headerHtml;

    let gridHtml = `<div class="border-r-2 relative w-12 shrink-0 z-10" style="background-color: var(--karta-bg); border-color: var(--ciemny);">`;
    for(let h = settings.startHour; h <= settings.endHour; h++) {
        gridHtml += `<div class="h-24 time-row text-[10px] md:text-xs text-right pr-1 pt-1 font-bold tekst-szary" id="slot-hour-row-${h}">${h}:00</div>`;
    }
    gridHtml += `</div>`;

    let earliestAvailableHour = settings.endHour;

    for(let i=0; i < daysCount; i++) {
        let dayDate = new Date(monday); dayDate.setDate(monday.getDate() + i);
        let dateString = getLocalISODate(dayDate);
        let dayOfWeek = dayDate.getDay();

        let colBg = `background-color: rgba(244, 63, 94, 0.05);`;

        gridHtml += `<div class="relative day-col flex-1 border-r-2 last:border-r-0 cursor-pointer overflow-hidden transition hover:opacity-80" style="${colBg} border-color: var(--szary-ramka);" onclick="handleSlotClick(event, '${dateString}')">`;
        
        for(let h = settings.startHour; h <= settings.endHour; h++) {
            gridHtml += `<div class="h-24 time-row border-rose-200 opacity-50" style="border-bottom-style: dashed; border-bottom-width: 1px;"></div>`;
        }
        
        let avail = settings.availability[dayOfWeek];
        if (avail && avail.active) {
            let [sH, sM] = avail.start.split(':').map(Number);
            let [eH, eM] = avail.end.split(':').map(Number);
            
            if(sH < earliestAvailableHour) earliestAvailableHour = sH;

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

    setTimeout(() => {
        let scrollTargetHour = earliestAvailableHour - 1;
        if(scrollTargetHour < settings.startHour) scrollTargetHour = settings.startHour;
        
        let targetPos = earliestAvailableHour < settings.endHour ? ((scrollTargetHour - settings.startHour) * 96) : 0;
        
        let slotScroll = document.querySelector('#slot-calendar-grid').parentElement;
        let modalScroll = document.querySelector('#modal-find-slot .modal-okno');

        if (slotScroll && slotScroll.scrollHeight > slotScroll.clientHeight) {
            slotScroll.scrollTo({ top: targetPos, behavior: 'smooth' });
        } else if (modalScroll) {
            modalScroll.scrollTo({ top: targetPos, behavior: 'smooth' });
        } else if (slotScroll) {
            slotScroll.scrollTop = targetPos;
        }
    }, 400); 
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

// ==========================================
// --- WIDOK ZAROBKÓW ---
// ==========================================

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
    let canvas = document.getElementById(canvasId);
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
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
    const container = document.getElementById(containerId); 
    if(!container) return;
    
    let listHtml = '';
    if(studentArr.length === 0) { 
        listHtml = '<p class="text-sm tekst-szary">Brak opłaconych lekcji.</p>'; 
    } else {
        studentArr.forEach(item => {
            let width = total > 0 ? Math.max(5, (item.val / total) * 100) : 0;
            listHtml += `
                <div class="mb-3">
                    <div class="flex justify-between text-xs md:text-sm font-bold mb-1"><span>${esc(item.name)}</span><span class="tekst-akcent">${item.val} zł</span></div>
                    <div class="w-full rounded-full h-2 md:h-3 border-2" style="background-color: var(--jasny); border-color: var(--szary-ramka);"><div class="h-full rounded-full bg-akcent" style="width: ${width}%; background-color: var(--akcent)"></div></div>
                </div>`;
        });
    }
    container.innerHTML = listHtml;
}

function renderZarobki() {
    let monthPickerEl = document.getElementById('earnings-month-picker');
    let weekPickerEl = document.getElementById('earnings-week-picker');
    
    const monthPicker = monthPickerEl ? monthPickerEl.value : null; 
    const weekPicker = weekPickerEl ? weekPickerEl.value : null;

    const allData = processEarningsData(lessons);
    animateValue('total-all-earnings', 0, allData.total, 800, ' zł');
    renderChart('chart-all-subject', 'doughnut', allData.subjectArr);
    renderStudentList('list-all-student', allData.studentArr, allData.total);

    if(monthPicker) {
        const monthLessons = lessons.filter(l => l.date.substring(0,7) === monthPicker);
        const monthData = processEarningsData(monthLessons);
        animateValue('total-month-earnings', 0, monthData.total, 800, ' zł');
        renderChart('chart-month-subject', 'bar', monthData.subjectArr);
    }
    if(weekPicker) {
        const weekLessons = lessons.filter(l => getWeekString(l.date) === weekPicker);
        const weekData = processEarningsData(weekLessons);
        animateValue('total-week-earnings', 0, weekData.total, 800, ' zł');
        renderChart('chart-week-subject', 'bar', weekData.subjectArr);
    }
}
