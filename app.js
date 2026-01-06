const state = {
    currentSection: 'dashboard-section',
    selectedDate: new Date(),
    currentMonth: new Date(),
    dashboardDate: new Date(),
    events: {},
    healthSettings: {
        weightGoal: 70,
        initialWeight: null,
        protein: 150,
        carbs: 200,
        fat: 65,
        sugar: 50,
        satFat: 20,
        calories: 2000
    },
    healthData: {},
    accounting: { 
        entries: [],
        customCategories: { income: [], expense: [] },
        cash: 0,
        debit: 0,
        debt: 0
    },
    goals: [],
    activeTimers: {},
    notes: [],
    currentNoteIndex: null,
    repeatingEntries: [],
    photos: [],
    goalSwipeStates: {},
    eventSwipeStates: {}, 
    theme: 'ember' // Theme state
};

// Helper function to get today's date in local timezone
function getTodayLocal() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

document.addEventListener('DOMContentLoaded', () => {
    loadFromStorage();
    initializeApp();
    setupEventListeners();
    registerServiceWorker();
    setInterval(updateGoalTimers, 1000);
    setInterval(updateChoreTimers, 1000);
    setInterval(updateDashboard, 5000);
});

function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./service-worker.js')
            .then(registration => console.log('Service Worker registered'))
            .catch(error => console.log('Service Worker registration failed:', error));
    }
}

function initializeApp() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // FIX: Ensure dates start at today
    state.selectedDate = new Date(today);
    state.currentMonth = new Date(today);
    state.dashboardDate = new Date(today);
    
    renderCalendar('days-container');
    renderCalendar('health-days-container');
    renderCalendar('dashboard-days-container');
    renderEvents();
    updateHealthView();
    updateAccountingView();
    renderGoals();
    renderNotes();
    renderDashboard();
    renderUpcoming();
    renderActiveEntries();
    initializeEntryForms();
    renderPhotoGallery();
    
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

function setupEventListeners() {
    // Sidebar
    document.querySelectorAll('.sidebar-item').forEach(item => {
        // Skip theme btn for generic handler
        if(item.id === 'theme-btn') return;
        
        item.addEventListener('click', (e) => {
            const section = e.currentTarget.dataset.sidebarSection;
            switchMainSection(section);
        });
    });
    
    // Theme Button
    document.getElementById('theme-btn').addEventListener('click', () => {
        closeSidebar();
        // Update active class in modal
        document.querySelectorAll('.theme-option').forEach(opt => {
            opt.classList.toggle('active', opt.dataset.themeVal === state.theme);
        });
        openModal(document.getElementById('theme-modal'));
    });

    // Theme Selection
    document.querySelectorAll('.theme-option').forEach(opt => {
        opt.addEventListener('click', (e) => {
            const newTheme = e.currentTarget.dataset.themeVal;
            setTheme(newTheme);
        });
    });
    
    document.querySelectorAll('[id^="hamburger-btn"]').forEach(btn => {
        btn.addEventListener('click', openSidebar);
    });
    
    document.getElementById('close-sidebar-btn').addEventListener('click', closeSidebar);
    
    const overlay = document.getElementById('sidebar-overlay');
    overlay.addEventListener('click', closeSidebar);
    
    // Bottom nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const section = e.currentTarget.dataset.section;
            switchSection(section);
        });
    });
    
    // Modals
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            closeModal(modal);
        });
    });
    
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) {
                const modal = e.target.closest('.modal');
                closeModal(modal);
            }
        });
    });
    
    // Actions
    document.addEventListener('click', (e) => {
        const action = e.target.dataset.action || e.target.closest('[data-action]')?.dataset.action;
        if (!action) return;
        handleAction(action, e);
    });
    
    // Health
    document.getElementById('health-settings-btn').addEventListener('click', () => {
        openModal(document.getElementById('health-settings-modal'));
        populateHealthSettings();
    });
    
    document.getElementById('meal-btn').addEventListener('click', () => {
        openModal(document.getElementById('meal-modal'));
    });
    
    document.getElementById('exercise-btn').addEventListener('click', () => {
        openModal(document.getElementById('exercise-modal'));
    });
    
    document.getElementById('daily-weight-input').addEventListener('change', (e) => {
        const weight = parseFloat(e.target.value);
        if (weight && weight > 0) {
            saveDailyWeight(weight);
        }
    });
    
    // Accounting
    document.getElementById('add-entry-btn').addEventListener('click', () => {
        openModal(document.getElementById('accounting-entry-modal'));
        const dateStr = getTodayLocal();
        document.getElementById('expense-date').value = dateStr;
        document.getElementById('income-date').value = dateStr;
        document.getElementById('transfer-date').value = dateStr;
        document.getElementById('debt-date').value = dateStr;
    });
    
    document.getElementById('prev-month').addEventListener('click', () => {
        state.currentMonth.setMonth(state.currentMonth.getMonth() - 1);
        updateAccountingView();
    });
    
    document.getElementById('next-month').addEventListener('click', () => {
        state.currentMonth.setMonth(state.currentMonth.getMonth() + 1);
        updateAccountingView();
    });
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const type = e.target.dataset.type;
            switchAccountingTab(type);
        });
    });
    
    // Goals
    document.getElementById('add-goal-btn').addEventListener('click', () => {
        const now = new Date();
        document.getElementById('goal-start-date').value = getTodayLocal();
        document.getElementById('goal-start-time').value = now.toTimeString().slice(0, 5);
        openModal(document.getElementById('goal-modal'));
    });

    // Entries
    document.querySelectorAll('.entries-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            const tabType = e.target.dataset.tab;
            switchEntryTab(tabType);
        });
    });

    document.getElementById('chore-timer-inline').addEventListener('change', (e) => {
        document.getElementById('timer-duration-inline-group').style.display = 
            e.target.checked ? 'block' : 'none';
    });
    
    document.getElementById('task-repeat-inline').addEventListener('change', (e) => {
        document.getElementById('task-repeat-days-group').style.display = 
            e.target.checked ? 'block' : 'none';
    });
    
    document.getElementById('chore-repeat-inline').addEventListener('change', (e) => {
        document.getElementById('chore-repeat-days-group').style.display = 
            e.target.checked ? 'block' : 'none';
    });
    
    // Notes
    document.getElementById('add-note-btn').addEventListener('click', () => {
        state.currentNoteIndex = null;
        document.getElementById('note-title').value = '';
        document.getElementById('note-content').value = '';
        openModal(document.getElementById('note-modal'));
    });
    
    document.getElementById('save-note-btn').addEventListener('click', saveNote);
    document.getElementById('back-to-notes').addEventListener('click', () => {
        closeModal(document.getElementById('note-modal'));
    });
    
    // Photos
    document.getElementById('add-photo-btn').addEventListener('click', () => {
        document.getElementById('photo-input').click();
    });
    
    document.getElementById('photo-input').addEventListener('change', handlePhotoUpload);
    
    // Photo viewer
    document.getElementById('photo-viewer-close').addEventListener('click', closePhotoViewer);
    document.getElementById('photo-viewer-delete').addEventListener('click', deleteCurrentPhoto);
    
    const photoViewerContainer = document.getElementById('photo-viewer-container');
    let photoViewerStartY = 0;
    let photoViewerCurrentY = 0;
    
    photoViewerContainer.addEventListener('touchstart', (e) => {
        photoViewerStartY = e.touches[0].clientY;
    });
    
    photoViewerContainer.addEventListener('touchmove', (e) => {
        photoViewerCurrentY = e.touches[0].clientY;
        const diff = photoViewerCurrentY - photoViewerStartY;
        if (diff > 0) {
            e.preventDefault();
            photoViewerContainer.style.transform = `translateY(${diff}px)`;
            photoViewerContainer.style.opacity = 1 - (diff / 300);
        }
    }, { passive: false });
    
    photoViewerContainer.addEventListener('touchend', () => {
        const diff = photoViewerCurrentY - photoViewerStartY;
        if (diff > 100) {
            closePhotoViewer();
        } else {
            photoViewerContainer.style.transform = 'translateY(0)';
            photoViewerContainer.style.opacity = '1';
        }
    });
}

function handleAction(action, event) {
    const actions = {
        'cancel': () => closeModal(event.target.closest('.modal')),
        'save-health': saveHealthSettings,
        'save-meal': saveMeal,
        'save-exercise': saveExercise,
        'save-entry': () => saveAccountingEntry(false),
        'continue-entry': () => saveAccountingEntry(true),
        'save-goal': saveGoal
    };
    if (actions[action]) {
        actions[action]();
    }
}

// SIDEBAR
function openSidebar() {
    document.getElementById('sidebar').classList.add('active');
    document.getElementById('sidebar-overlay').classList.add('active');
}

function closeSidebar() {
    document.getElementById('sidebar').classList.remove('active');
    document.getElementById('sidebar-overlay').classList.remove('active');
}

function setTheme(themeName) {
    state.theme = themeName;
    document.documentElement.setAttribute('data-theme', themeName);
    
    // Update active class in modal
    document.querySelectorAll('.theme-option').forEach(opt => {
        opt.classList.toggle('active', opt.dataset.themeVal === themeName);
    });
    
    saveToStorage();
}

function switchMainSection(sectionId) {
    document.querySelectorAll('.section').forEach(section => {
        section.classList.toggle('active', section.id === sectionId);
    });
    state.currentSection = sectionId;
    closeSidebar();
    
    if (sectionId === 'dashboard-section') renderDashboard();
    else if (sectionId === 'upcoming-section') renderUpcoming();
    else if (sectionId === 'notes-section') renderNotes();
    else if (sectionId === 'motivation-section') renderPhotoGallery();
    else if (sectionId === 'workspace-section') {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector('.nav-item[data-section="calendar-section"]').classList.add('active');
        switchSection('calendar-section');
    }
}

function switchSection(sectionId) {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.section === sectionId);
    });
    document.querySelectorAll('.subsection').forEach(section => {
        section.classList.toggle('active', section.id === sectionId);
    });
    
    if (sectionId === 'calendar-section') {
        renderEvents();
        scrollToActiveDay('days-container');
    }
    else if (sectionId === 'health-section') {
        updateHealthView();
        scrollToActiveDay('health-days-container');
    }
    else if (sectionId === 'accounting-section') updateAccountingView();
    else if (sectionId === 'goals-section') renderGoals();
    else if (sectionId === 'entries-section') renderActiveEntries();
}

function scrollToActiveDay(containerId) {
    setTimeout(() => {
        const container = document.getElementById(containerId);
        const active = container?.querySelector('.day.active');
        if (active) {
            active.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }
    }, 100);
}

// STORAGE
function saveToStorage() {
    localStorage.setItem('personalAppState', JSON.stringify(state));
}

function loadFromStorage() {
    const saved = localStorage.getItem('personalAppState');
    if (saved) {
        const loaded = JSON.parse(saved);
        Object.assign(state, loaded);
        state.selectedDate = new Date(state.selectedDate);
        state.currentMonth = new Date(state.currentMonth);
        state.dashboardDate = new Date(state.dashboardDate);
        if (!state.photos) state.photos = [];
        if (!state.accounting.debt) state.accounting.debt = 0;
        if (!state.goalSwipeStates) state.goalSwipeStates = {};
        if (!state.eventSwipeStates) state.eventSwipeStates = {};
        
        // Load Theme
        if (!state.theme) state.theme = 'ember';
        document.documentElement.setAttribute('data-theme', state.theme);
    } else {
        // Default Theme
        document.documentElement.setAttribute('data-theme', 'ember');
    }
}

// UTILITIES
function getDateKey(date) {
    const d = new Date(date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
}

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function openModal(modal) {
    modal.classList.add('active');
}

function closeModal(modal) {
    modal.classList.remove('active');
}

function clearForm(type) {
    if (type === 'meal') {
        document.getElementById('meal-description').value = '';
        document.getElementById('meal-protein').value = '';
        document.getElementById('meal-carbs').value = '';
        document.getElementById('meal-fat').value = '';
        document.getElementById('meal-sugar').value = '';
        document.getElementById('meal-satfat').value = '';
        document.getElementById('meal-calories').value = '';
    } else if (type === 'exercise') {
        document.getElementById('exercise-description').value = '';
        document.getElementById('exercise-calories').value = '';
    } else if (type === 'income') {
        document.getElementById('income-amount').value = '';
        document.getElementById('income-notes').value = '';
    } else if (type === 'expense') {
        document.getElementById('expense-amount').value = '';
        document.getElementById('expense-notes').value = '';
    } else if (type === 'transfer') {
        document.getElementById('transfer-amount').value = '';
        document.getElementById('transfer-notes').value = '';
    } else if (type === 'debt') {
        document.getElementById('debt-amount').value = '';
        document.getElementById('debt-notes').value = '';
    }
}

// DASHBOARD
function renderDashboard() {
    renderCalendar('dashboard-days-container');
    updateDashboard();
}

function updateDashboard() {
    if (state.currentSection !== 'dashboard-section') return;
    
    const dateKey = getDateKey(state.dashboardDate);
    
    // Calendar
    const calendarContainer = document.getElementById('dashboard-calendar');
    const events = state.events[dateKey] || [];
    if (events.length === 0) {
        calendarContainer.innerHTML = '<div class="empty-state"><p>No events today</p></div>';
    } else {
        const completed = events.filter(e => e.completed).length;
        calendarContainer.innerHTML = `
            <div class="dashboard-stat">
                <span class="dashboard-stat-label">Total Events</span>
                <span class="dashboard-stat-value">${events.length}</span>
            </div>
            <div class="dashboard-stat">
                <span class="dashboard-stat-label">Completed</span>
                <span class="dashboard-stat-value">${completed}</span>
            </div>
            ${events.slice(0, 3).map(e => `
                <div class="dashboard-event-item">
                    ${e.completed ? '✓' : '○'} ${e.title}
                </div>
            `).join('')}
        `;
    }
    
    // Health
    const healthContainer = document.getElementById('dashboard-health');
    const dayData = state.healthData[dateKey] || {
        meals: [],
        exercises: [],
        consumed: { protein: 0, carbs: 0, fat: 0, sugar: 0, satFat: 0, calories: 0 },
        burned: 0,
        weight: null
    };
    
    const caloriesLeft = Math.max(0, state.healthSettings.calories - dayData.consumed.calories);
    const progressPercent = getWeightProgressPercent();
    
    healthContainer.innerHTML = `
        <div class="dashboard-stat">
            <span class="dashboard-stat-label">Calories Consumed</span>
            <span class="dashboard-stat-value">${dayData.consumed.calories}</span>
        </div>
        <div class="dashboard-stat">
            <span class="dashboard-stat-label">Calories Left</span>
            <span class="dashboard-stat-value">${caloriesLeft}</span>
        </div>
        <div class="dashboard-stat">
            <span class="dashboard-stat-label">Calories Burned</span>
            <span class="dashboard-stat-value">${dayData.burned}</span>
        </div>
        <div class="dashboard-stat">
            <span class="dashboard-stat-label">Weight Goal Progress</span>
            <span class="dashboard-stat-value">${progressPercent}%</span>
        </div>
        <div class="dashboard-stat">
            <span class="dashboard-stat-label">Meals Today</span>
            <span class="dashboard-stat-value">${dayData.meals.length}</span>
        </div>
        <div class="dashboard-stat">
            <span class="dashboard-stat-label">Exercises Today</span>
            <span class="dashboard-stat-value">${dayData.exercises.length}</span>
        </div>
    `;
    
    // Money
    const moneyContainer = document.getElementById('dashboard-money');
    const month = state.dashboardDate.getMonth();
    const year = state.dashboardDate.getFullYear();
    let income = 0, expense = 0, todayIncome = 0, todayExpense = 0;
    
    state.accounting.entries.forEach(entry => {
        const entryDate = new Date(entry.date + 'T00:00:00');
        if (entryDate.getMonth() === month && entryDate.getFullYear() === year) {
            if (entry.type === 'income') income += entry.amount;
            else if (entry.type === 'expense') expense += entry.amount;
        }
        if (getDateKey(entryDate) === dateKey) {
            if (entry.type === 'income') todayIncome += entry.amount;
            else if (entry.type === 'expense') todayExpense += entry.amount;
        }
    });
    
    moneyContainer.innerHTML = `
        <div class="dashboard-stat">
            <span class="dashboard-stat-label">Balance</span>
            <span class="dashboard-stat-value">${formatCurrency(income - expense)}</span>
        </div>
        <div class="dashboard-stat">
            <span class="dashboard-stat-label">Cash</span>
            <span class="dashboard-stat-value">${formatCurrency(state.accounting.cash)}</span>
        </div>
        <div class="dashboard-stat">
            <span class="dashboard-stat-label">Debit Card</span>
            <span class="dashboard-stat-value">${formatCurrency(state.accounting.debit)}</span>
        </div>
        <div class="dashboard-stat">
            <span class="dashboard-stat-label">Debt</span>
            <span class="dashboard-stat-value">${formatCurrency(state.accounting.debt)}</span>
        </div>
        <div class="dashboard-stat">
            <span class="dashboard-stat-label">Today's Income</span>
            <span class="dashboard-stat-value">${formatCurrency(todayIncome)}</span>
        </div>
        <div class="dashboard-stat">
            <span class="dashboard-stat-label">Today's Expense</span>
            <span class="dashboard-stat-value">${formatCurrency(todayExpense)}</span>
        </div>
    `;
    
    // Goals
    const goalsContainer = document.getElementById('dashboard-goals');
    if (state.goals.length === 0) {
        goalsContainer.innerHTML = '<div class="empty-state"><p>No active goals</p></div>';
    } else {
        goalsContainer.innerHTML = state.goals.map(goal => {
            const start = new Date(goal.startDate);
            const now = new Date();
            const diff = now - start;
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            return `
                <div class="dashboard-goal-item">
                    <div class="dashboard-goal-name">${goal.name}</div>
                    <div class="dashboard-goal-time">${days}d ${hours}h ${minutes}m ${seconds}s</div>
                </div>
            `;
        }).join('');
    }
}

function getWeightProgressPercent() {
    const currentWeight = getLatestWeight();
    if (currentWeight && state.healthSettings.weightGoal && state.healthSettings.initialWeight) {
        const diff = currentWeight - state.healthSettings.weightGoal;
        let progress = 0;
        if (diff > 0) {
            const initialDiff = state.healthSettings.initialWeight - state.healthSettings.weightGoal;
            progress = Math.min(100, Math.max(0, ((initialDiff - diff) / initialDiff) * 100));
        } else {
            progress = 100;
        }
        return Math.round(progress);
    }
    return 0;
}

// UPCOMING
function renderUpcoming() {
    const container = document.getElementById('upcoming-events');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const weekEvents = {};
    for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const dateKey = getDateKey(date);
        const events = state.events[dateKey] || [];
        if (events.length > 0) {
            weekEvents[dateKey] = { date: new Date(date), events };
        }
    }
    
    if (Object.keys(weekEvents).length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No upcoming events this week</p></div>';
        return;
    }
    
    container.innerHTML = Object.keys(weekEvents).map(dateKey => {
        const { date, events } = weekEvents[dateKey];
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        const dayNum = date.getDate();
        return `
            <div class="day-group">
                <div class="day-header">${dayNum} ${dayName}</div>
                ${events.map(event => `
                    <div class="dashboard-event-item">
                        ${event.completed ? '✓' : '○'} ${event.title} ${event.time ? '(' + event.time + ')' : ''}
                    </div>
                `).join('')}
            </div>
        `;
    }).join('');
}

// NOTES
function renderNotes() {
    const container = document.getElementById('notes-list');
    if (state.notes.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No notes yet. Tap + to create your first note!</p></div>';
        return;
    }
    
    container.innerHTML = state.notes.map((note, index) => `
        <div class="note-item-container">
            <div class="note-delete-bg">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
            </div>
            <div class="note-item" data-note-index="${index}">
                <div class="note-item-title">${note.title || 'Untitled'}</div>
                <div class="note-item-preview">${note.content.substring(0, 100)}</div>
                <div class="note-item-date">${new Date(note.date).toLocaleDateString()}</div>
            </div>
        </div>
    `).join('');
    
    setupNoteSwipe();
}

function setupNoteSwipe() {
    const items = document.querySelectorAll('.note-item');
    items.forEach(item => {
        setupSwipeToDelete(item, (index) => deleteNote(index), 'note-item-container');
    });
}

function openNoteForEditing(index) {
    state.currentNoteIndex = index;
    const note = state.notes[index];
    document.getElementById('note-title').value = note.title;
    document.getElementById('note-content').value = note.content;
    openModal(document.getElementById('note-modal'));
}

function saveNote() {
    const title = document.getElementById('note-title').value;
    const content = document.getElementById('note-content').value;
    
    if (!title && !content) {
        showToast('Note is empty');
        return;
    }
    
    const note = {
        title: title || 'Untitled',
        content: content,
        date: new Date().toISOString()
    };
    
    if (state.currentNoteIndex !== null) {
        state.notes[state.currentNoteIndex] = note;
    } else {
        state.notes.push(note);
    }
    
    saveToStorage();
    renderNotes();
    closeModal(document.getElementById('note-modal'));
    showToast('Note saved');
}

function deleteNote(index) {
    if (confirm('Delete this note?')) {
        state.notes.splice(index, 1);
        saveToStorage();
        renderNotes();
        showToast('Note deleted');
    }
}

// PHOTO GALLERY / MOTIVATION
function renderPhotoGallery() {
    const container = document.getElementById('photo-gallery');
    if (state.photos.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No photos yet. Tap + to add your first motivational photo!</p></div>';
        return;
    }
    
    container.innerHTML = state.photos.map((photo, index) => `
        <div class="photo-gallery-item" data-photo-index="${index}">
            <img src="${photo}" alt="Photo ${index + 1}">
        </div>
    `).join('');
    
    setupPhotoGalleryInteractions();
}

function setupPhotoGalleryInteractions() {
    const items = document.querySelectorAll('.photo-gallery-item');
    items.forEach(item => {
        item.addEventListener('click', () => {
            const index = parseInt(item.dataset.photoIndex);
            openPhotoViewer(index);
        });
    });
}

function handlePhotoUpload(e) {
    const files = Array.from(e.target.files);
    let processed = 0;
    
    files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (event) => {
            state.photos.push(event.target.result);
            processed++;
            if (processed === files.length) {
                saveToStorage();
                renderPhotoGallery();
                showToast(`${files.length} photo(s) added`);
            }
        };
        reader.readAsDataURL(file);
    });
}

let currentPhotoIndex = 0;

function openPhotoViewer(index) {
    currentPhotoIndex = index;
    const modal = document.getElementById('photo-viewer-modal');
    const img = document.getElementById('photo-viewer-img');
    img.src = state.photos[index];
    modal.classList.add('active');
    
    setupPhotoSwipe();
}

function closePhotoViewer() {
    const modal = document.getElementById('photo-viewer-modal');
    const container = document.getElementById('photo-viewer-container');
    modal.classList.remove('active');
    container.style.transform = 'translateY(0)';
    container.style.opacity = '1';
}

function setupPhotoSwipe() {
    const container = document.getElementById('photo-viewer-container');
    let startX = 0;
    
    const handleSwipe = (e) => {
        startX = e.touches[0].clientX;
    };
    
    const handleSwipeEnd = (e) => {
        const endX = e.changedTouches[0].clientX;
        const diff = startX - endX;
        
        if (Math.abs(diff) > 50) {
            if (diff > 0 && currentPhotoIndex < state.photos.length - 1) {
                currentPhotoIndex++;
                document.getElementById('photo-viewer-img').src = state.photos[currentPhotoIndex];
            } else if (diff < 0 && currentPhotoIndex > 0) {
                currentPhotoIndex--;
                document.getElementById('photo-viewer-img').src = state.photos[currentPhotoIndex];
            }
        }
    };
    
    container.removeEventListener('touchstart', handleSwipe);
    container.removeEventListener('touchend', handleSwipeEnd);
    container.addEventListener('touchstart', handleSwipe);
    container.addEventListener('touchend', handleSwipeEnd);
}

function deleteCurrentPhoto() {
    if (confirm('Delete this photo?')) {
        state.photos.splice(currentPhotoIndex, 1);
        saveToStorage();
        closePhotoViewer();
        renderPhotoGallery();
        showToast('Photo deleted');
    }
}
// CALENDAR
function renderCalendar(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let selected;
    if (containerId === 'dashboard-days-container') {
        selected = new Date(state.dashboardDate);
    } else {
        selected = new Date(state.selectedDate);
    }
    selected.setHours(0, 0, 0, 0);
    
    // FIX: Center on selected date
    const centerDate = new Date(selected);
    const startDate = new Date(centerDate);
    startDate.setDate(centerDate.getDate() - 30);
    
    for (let i = 0; i < 60; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        const dayEl = document.createElement('div');
        dayEl.className = 'day';
        const dateOnly = new Date(date);
        dateOnly.setHours(0, 0, 0, 0);
        if (dateOnly.getTime() === today.getTime()) dayEl.classList.add('today');
        if (dateOnly.getTime() === selected.getTime()) dayEl.classList.add('active');
        dayEl.innerHTML = `
            <div class="day-name">${date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
            <div class="day-number">${date.getDate()}</div>
        `;
        dayEl.addEventListener('click', () => {
            if (containerId === 'dashboard-days-container') {
                state.dashboardDate = new Date(date);
                state.dashboardDate.setHours(0, 0, 0, 0);
                renderCalendar('dashboard-days-container');
                updateDashboard();
            } else {
                state.selectedDate = new Date(date);
                state.selectedDate.setHours(0, 0, 0, 0);
                renderCalendar(containerId);
                if (containerId === 'days-container') renderEvents();
                else updateHealthView();
            }
        });
        container.appendChild(dayEl);
    }
    
    scrollToActiveDay(containerId);
}

function renderEvents() {
    const container = document.getElementById('events-container');
    const dateKey = getDateKey(state.selectedDate);
    const events = state.events[dateKey] || [];
    
    if (events.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <p>No events for this day</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = events.map((event, index) => createEventHTML(event, index, dateKey)).join('');
    setupEventInteractions(dateKey);
}

function createEventHTML(event, index, dateKey) {
    const completedClass = event.completed ? 'completed' : '';
    const checkedClass = event.completed ? 'checked' : '';
    const time = event.time ? `<div class="event-time">${event.time}</div>` : '';
    
    if (event.hasTimer) {
        const timerKey = `${dateKey}-${index}`;
        const timerState = state.activeTimers[timerKey] || {
            running: false,
            elapsed: 0,
            total: (event.duration || 15) * 60,
            dateKey,
            index
        };
        const remaining = Math.max(0, timerState.total - timerState.elapsed);
        const minutes = Math.floor(remaining / 60);
        const seconds = remaining % 60;
        const progress = (timerState.elapsed / timerState.total) * 100;
        
        // Check if this event is swiped
        const swipeKey = `${dateKey}-${index}`;
        const isSwiped = state.eventSwipeStates[swipeKey] || false;
        
        return `
            <div class="event-swipe-container">
                <div class="event-delete-bg">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </div>
                <div class="event ${completedClass} ${isSwiped ? 'swiped' : ''}" data-index="${index}" data-timer="true" data-timer-key="${timerKey}" data-swipe-key="${swipeKey}">
                    <div class="event-checkbox ${checkedClass}"></div>
                    <div class="event-content">
                        <div class="event-title">${event.title}</div>
                    </div>
                    <div class="event-timer">
                        <div class="timer-circle" style="--progress: ${progress}">
                            <div class="timer-inner">${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}</div>
                        </div>
                        <button class="timer-btn" data-timer-key="${timerKey}">${timerState.running ? 'Pause' : 'Start'}</button>
                    </div>
                </div>
            </div>
        `;
    } else {
        const swipeKey = `${dateKey}-${index}`;
        const isSwiped = state.eventSwipeStates[swipeKey] || false;
        
        return `
            <div class="event-swipe-container">
                <div class="event-delete-bg">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </div>
                <div class="event ${completedClass} ${isSwiped ? 'swiped' : ''}" data-index="${index}" data-swipe-key="${swipeKey}">
                    <div class="event-checkbox ${checkedClass}"></div>
                    <div class="event-content">
                        <div class="event-title">${event.title}</div>
                        ${time}
                    </div>
                </div>
            </div>
        `;
    }
}

function setupEventInteractions(dateKey) {
    const containers = document.querySelectorAll('.event-swipe-container');
    
    containers.forEach(container => {
        const event = container.querySelector('.event');
        const checkbox = event.querySelector('.event-checkbox');
        const deleteBg = container.querySelector('.event-delete-bg');
        const index = parseInt(event.dataset.index);
        const swipeKey = event.dataset.swipeKey;
        
        // Restore swipe state
        if (state.eventSwipeStates[swipeKey]) {
            event.style.transform = 'translateX(-80px)';
            event.classList.add('swiped');
            container.classList.add('swipe-active'); // ADDED THIS
        }
        
        if (checkbox) {
            checkbox.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleEventComplete(dateKey, index);
            });
        }
        
        const timerBtn = event.querySelector('.timer-btn');
        if (timerBtn) {
            timerBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const timerKey = timerBtn.dataset.timerKey;
                toggleTimer(timerKey);
            });
        }
        
        // Universal swipe handler
        setupSwipeToDelete(event, () => deleteEvent(dateKey, index), 'event-swipe-container', swipeKey);
        
        deleteBg.addEventListener('click', () => deleteEvent(dateKey, index));
    });
}

// UNIVERSAL SWIPE TO DELETE FUNCTION - WITH VISUAL GLITCH FIX
function setupSwipeToDelete(element, deleteCallback, containerClass, swipeStateKey = null) {
    let startX = 0, currentX = 0, isDragging = false;
    
    // Find the container to toggle background visibility
    const container = element.closest('.' + containerClass);
    
    const checkIfSwiped = () => {
        return element.classList.contains('swiped');
    };
    
    // Ensure visibility if already swiped (should be handled by callers, but safe check)
    if (swipeStateKey && state.eventSwipeStates && state.eventSwipeStates[swipeStateKey]) {
        container.classList.add('swipe-active');
    }

    element.addEventListener('touchstart', (e) => {
        if (e.target.closest('.event-delete-bg') || 
            e.target.closest('.log-delete-bg') || 
            e.target.closest('.note-delete-bg') ||
            e.target.closest('.goal-delete-bg') ||
            e.target.closest('.entry-delete-bg') ||
            e.target.closest('.active-entry-delete-bg') ||
            e.target.closest('.timer-btn') ||
            e.target.closest('.event-checkbox')) {
            return;
        }
        startX = e.touches[0].clientX;
        isDragging = true;
        
        // FIX: Make background visible on touch start
        container.classList.add('swipe-active');
    });
    
    element.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        currentX = e.touches[0].clientX;
        const diff = startX - currentX;
        const isSwiped = checkIfSwiped();
        
        // Prevent page scroll while swiping
        if (Math.abs(diff) > 10) {
            e.preventDefault();
        }
        
        if (isSwiped) {
            // Swiping back to close
            if (diff < 0 && diff > -100) {
                element.style.transform = `translateX(${-80 + (-diff)}px)`;
            }
        } else {
            // Swiping left to reveal delete
            if (diff > 0 && diff < 100) {
                element.style.transform = `translateX(-${diff}px)`;
            }
        }
    }, { passive: false });
    
    element.addEventListener('touchend', () => {
        if (!isDragging) return;
        isDragging = false;
        const diff = startX - currentX;
        const isSwiped = checkIfSwiped();
        
        if (isSwiped) {
            // Was swiped, check if closing
            if (diff < -30) {
                element.style.transform = 'translateX(0)';
                element.classList.remove('swiped');
                
                // HIDE BACKGROUND
                container.classList.remove('swipe-active');
                
                if (swipeStateKey) {
                    state.eventSwipeStates[swipeStateKey] = false;
                    saveToStorage();
                }
            } else {
                element.style.transform = 'translateX(-80px)';
                // KEEP BACKGROUND
                container.classList.add('swipe-active');
            }
        } else {
            // Not swiped, check if opening
            if (diff > 30) {
                element.style.transform = 'translateX(-80px)';
                element.classList.add('swiped');
                
                // SHOW BACKGROUND
                container.classList.add('swipe-active');
                
                if (swipeStateKey) {
                    state.eventSwipeStates[swipeStateKey] = true;
                    saveToStorage();
                }
            } else {
                element.style.transform = 'translateX(0)';
                // HIDE BACKGROUND (failed swipe)
                container.classList.remove('swipe-active');
            }
        }
    });
    
    // Click handler for non-swiped items
    element.addEventListener('click', (e) => {
        if (checkIfSwiped() || 
            e.target.closest('.timer-btn') || 
            e.target.closest('.event-checkbox')) {
            return;
        }
        
        // Handle specific click actions based on element type
        if (element.classList.contains('note-item')) {
            const index = parseInt(element.dataset.noteIndex);
            openNoteForEditing(index);
        } else if (element.classList.contains('log-item-content')) {
            const index = parseInt(element.dataset.mealIndex || element.dataset.exerciseIndex);
            const dateKey = getDateKey(state.selectedDate);
            const isMeal = element.dataset.mealIndex !== undefined;
            if (isMeal) {
                const meal = state.healthData[dateKey].meals[index];
                showToast(`Meal ${index + 1}: ${meal.description}\nP:${meal.protein}g C:${meal.carbs}g F:${meal.fat}g`);
            } else {
                const exercise = state.healthData[dateKey].exercises[index];
                showToast(`Exercise ${index + 1}: ${exercise.description}\nCalories: ${exercise.calories}`);
            }
        }
    });
}

function toggleEventComplete(dateKey, index) {
    state.events[dateKey][index].completed = !state.events[dateKey][index].completed;
    saveToStorage();
    renderEvents();
}

function deleteEvent(dateKey, index) {
    if (confirm('Delete this event?')) {
        // Clean up swipe state
        const swipeKey = `${dateKey}-${index}`;
        delete state.eventSwipeStates[swipeKey];
        
        state.events[dateKey].splice(index, 1);
        if (state.events[dateKey].length === 0) delete state.events[dateKey];
        saveToStorage();
        renderEvents();
        showToast('Event deleted');
    }
}

// ============================================
// BULLETPROOF TIMER SYSTEM - WORKS EVERYWHERE
// ============================================

function toggleTimer(timerKey) {
    console.log('toggleTimer called:', timerKey);
    
    // FIXED: Split properly
    const lastHyphenIndex = timerKey.lastIndexOf('-');
    const dateKey = timerKey.substring(0, lastHyphenIndex);
    const indexStr = timerKey.substring(lastHyphenIndex + 1);
    const index = parseInt(indexStr);
    
    const event = state.events[dateKey]?.[index];
    
    if (!event) {
        console.error('Event not found for timer:', timerKey);
        return;
    }
    
    // Initialize or get existing timer
    if (!state.activeTimers[timerKey]) {
        const durationSeconds = (event.duration || 15) * 60;
        
        state.activeTimers[timerKey] = {
            running: false,
            startTime: null,
            endTime: null,
            pausedAt: null,
            remainingSeconds: durationSeconds,
            totalSeconds: durationSeconds,
            dateKey,
            index
        };
    }
    
    const timer = state.activeTimers[timerKey];
    
    if (timer.running) {
        // PAUSE: Store how much time is left
        timer.running = false;
        timer.remainingSeconds = Math.max(0, Math.ceil((timer.endTime - Date.now()) / 1000));
        timer.pausedAt = Date.now();
        timer.endTime = null;
        showToast('Timer paused');
        releaseWakeLock();
    } else {
        // START/RESUME: Set new end time based on remaining seconds
        timer.running = true;
        timer.startTime = Date.now();
        timer.endTime = Date.now() + (timer.remainingSeconds * 1000);
        timer.pausedAt = null;
        showToast(`Timer started: ${Math.ceil(timer.remainingSeconds / 60)} min remaining`);
        requestWakeLock();
    }
    
    saveToStorage();
    updateAllTimerDisplays();
}

function updateChoreTimers() {
    const now = Date.now();
    let needsSave = false;
    let anyRunning = false;
    
    Object.keys(state.activeTimers).forEach(timerKey => {
        const timer = state.activeTimers[timerKey];
        
        if (!timer.running) return;
        
        anyRunning = true;
        
        // Calculate remaining time based on END TIME (bulletproof!)
        const remainingMs = timer.endTime - now;
        const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
        
        if (remainingSeconds === 0 && timer.remainingSeconds > 0) {
            // Timer just finished!
            timer.running = false;
            timer.remainingSeconds = 0;
            
            // Mark event as completed
            if (state.events[timer.dateKey]?.[timer.index]) {
                state.events[timer.dateKey][timer.index].completed = true;
            }
            
            const eventTitle = state.events[timer.dateKey]?.[timer.index]?.title || 'Task';
            sendNotification('Timer Complete!', eventTitle);
            showToast(`✅ Timer completed: ${eventTitle}`);
            
            needsSave = true;
        } else if (remainingSeconds !== timer.remainingSeconds) {
            // Update remaining time
            timer.remainingSeconds = remainingSeconds;
            needsSave = true;
        }
    });
    
    // Release wake lock if no timers running
    if (!anyRunning && wakeLock) {
        releaseWakeLock();
    }
    
    if (needsSave) {
        saveToStorage();
    }
    
    // Update all timer displays
    updateAllTimerDisplays();
}

function updateAllTimerDisplays() {
    const now = Date.now();
    
    Object.keys(state.activeTimers).forEach(timerKey => {
        const timer = state.activeTimers[timerKey];
        
        // Calculate display values based on END TIME
        let displaySeconds;
        if (timer.running && timer.endTime) {
            displaySeconds = Math.max(0, Math.ceil((timer.endTime - now) / 1000));
        } else {
            displaySeconds = timer.remainingSeconds;
        }
        
        const minutes = Math.floor(displaySeconds / 60);
        const seconds = displaySeconds % 60;
        const progress = ((timer.totalSeconds - displaySeconds) / timer.totalSeconds) * 100;
        
        // Update all UI elements with this timer key
        const timerElements = document.querySelectorAll(`[data-timer-key="${timerKey}"]`);
        
        timerElements.forEach(element => {
            if (element.classList.contains('event')) {
                const timerCircle = element.querySelector('.timer-circle');
                const timerInner = element.querySelector('.timer-inner');
                const timerBtn = element.querySelector('.timer-btn');
                
                if (timerCircle) timerCircle.style.setProperty('--progress', progress);
                if (timerInner) timerInner.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
                if (timerBtn) {
                    timerBtn.textContent = timer.running ? 'Pause' : 'Start';
                    // Add visual indicator for completed timers
                    if (displaySeconds === 0) {
                        timerBtn.textContent = 'Done ✓';
                        timerBtn.style.background = 'var(--color-success)';
                    } else {
                        timerBtn.style.background = '';
                    }
                }
            } else if (element.tagName === 'BUTTON') {
                element.textContent = timer.running ? 'Pause' : 'Start';
                if (timer.remainingSeconds === 0) {
                    element.textContent = 'Done ✓';
                    element.style.background = 'var(--color-success)';
                } else {
                    element.style.background = '';
                }
            }
        });
    });
}

// Clean up completed/old timers
function cleanupTimers() {
    Object.keys(state.activeTimers).forEach(timerKey => {
        const timer = state.activeTimers[timerKey];
        
        // Remove timers that finished more than 1 hour ago
        if (!timer.running && timer.remainingSeconds === 0) {
            const timeSinceCompletion = Date.now() - (timer.pausedAt || 0);
            if (timeSinceCompletion > 3600000) { // 1 hour
                delete state.activeTimers[timerKey];
            }
        }
    });
}

// Call cleanup periodically
setInterval(cleanupTimers, 60000); // Every minute

// ============================================
// WAKE LOCK (keeps screen active during timers)
// ============================================

let wakeLock = null;

async function requestWakeLock() {
    try {
        if ('wakeLock' in navigator) {
            wakeLock = await navigator.wakeLock.request('screen');
            console.log('Wake Lock acquired');
            
            wakeLock.addEventListener('release', () => {
                console.log('Wake Lock released');
            });
        }
    } catch (err) {
        console.log(`Wake Lock error: ${err.message}`);
    }
}

function releaseWakeLock() {
    if (wakeLock !== null) {
        wakeLock.release();
        wakeLock = null;
    }
}

// ============================================
// NOTIFICATION
// ============================================

function sendNotification(title, body) {
    console.log('Attempting notification:', title, body);
    
    if ('Notification' in window) {
        if (Notification.permission === 'granted') {
            try {
                new Notification(title, { 
                    body, 
                    icon: 'icon.png',
                    badge: 'icon.png',
                    vibrate: [200, 100, 200, 100, 200],
                    requireInteraction: true,
                    tag: 'timer-complete'
                });
                
                // Play a beep sound
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.frequency.value = 800;
                oscillator.type = 'sine';
                
                gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
                
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.5);
                
                console.log('Notification sent successfully');
            } catch (e) {
                console.error('Notification error:', e);
            }
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    sendNotification(title, body);
                }
            });
        }
    }
}
// HEALTH
function updateHealthView() {
    const dateKey = getDateKey(state.selectedDate);
    const dayData = state.healthData[dateKey] || {
        meals: [],
        exercises: [],
        consumed: { protein: 0, carbs: 0, fat: 0, sugar: 0, satFat: 0, calories: 0 },
        burned: 0,
        weight: null
    };
    
    document.getElementById('protein-left').textContent = Math.max(0, state.healthSettings.protein - dayData.consumed.protein) + 'g';
    document.getElementById('carbs-left').textContent = Math.max(0, state.healthSettings.carbs - dayData.consumed.carbs) + 'g';
    document.getElementById('fat-left').textContent = Math.max(0, state.healthSettings.fat - dayData.consumed.fat) + 'g';
    document.getElementById('sugar-left').textContent = Math.max(0, state.healthSettings.sugar - dayData.consumed.sugar) + 'g';
    document.getElementById('satfat-left').textContent = Math.max(0, state.healthSettings.satFat - dayData.consumed.satFat) + 'g';
    document.getElementById('calories-left').textContent = Math.max(0, state.healthSettings.calories - dayData.consumed.calories);
    document.getElementById('calories-burned').textContent = dayData.burned;
    
    const weightInput = document.getElementById('daily-weight-input');
    weightInput.value = dayData.weight || '';
    
    updateWeightProgress();
    renderMealsList(dayData.meals);
    renderExercisesList(dayData.exercises);
}

function updateWeightProgress() {
    const currentWeight = getLatestWeight();
    if (currentWeight && state.healthSettings.weightGoal && state.healthSettings.initialWeight) {
        const diff = currentWeight - state.healthSettings.weightGoal;
        let progress = 0;
        if (diff > 0) {
            const initialDiff = state.healthSettings.initialWeight - state.healthSettings.weightGoal;
            progress = Math.min(100, Math.max(0, ((initialDiff - diff) / initialDiff) * 100));
        } else {
            progress = 100;
        }
        document.getElementById('weight-progress').style.width = progress + '%';
        document.getElementById('weight-progress-text').textContent = Math.round(progress) + '%';
    } else {
        document.getElementById('weight-progress').style.width = '0%';
        document.getElementById('weight-progress-text').textContent = '0%';
    }
}

function getLatestWeight() {
    const dates = Object.keys(state.healthData).sort().reverse();
    for (let date of dates) {
        if (state.healthData[date].weight) {
            return state.healthData[date].weight;
        }
    }
    return null;
}

function saveDailyWeight(weight) {
    const dateKey = getDateKey(state.selectedDate);
    if (!state.healthData[dateKey]) {
        state.healthData[dateKey] = {
            meals: [], exercises: [],
            consumed: { protein: 0, carbs: 0, fat: 0, sugar: 0, satFat: 0, calories: 0 },
            burned: 0,
            weight: null
        };
    }
    state.healthData[dateKey].weight = weight;
    
    if (!state.healthSettings.initialWeight) {
        state.healthSettings.initialWeight = weight;
    }
    
    saveToStorage();
    updateHealthView();
}

function populateHealthSettings() {
    document.getElementById('initial-weight').value = state.healthSettings.initialWeight || '';
    document.getElementById('weight-goal').value = state.healthSettings.weightGoal;
    document.getElementById('protein-goal').value = state.healthSettings.protein;
    document.getElementById('carbs-goal').value = state.healthSettings.carbs;
    document.getElementById('fat-goal').value = state.healthSettings.fat;
    document.getElementById('sugar-goal').value = state.healthSettings.sugar;
    document.getElementById('satfat-goal').value = state.healthSettings.satFat;
    document.getElementById('calories-goal').value = state.healthSettings.calories;
}

function saveHealthSettings() {
    state.healthSettings.initialWeight = parseFloat(document.getElementById('initial-weight').value) || null;
    state.healthSettings.weightGoal = parseFloat(document.getElementById('weight-goal').value);
    state.healthSettings.protein = parseInt(document.getElementById('protein-goal').value);
    state.healthSettings.carbs = parseInt(document.getElementById('carbs-goal').value);
    state.healthSettings.fat = parseInt(document.getElementById('fat-goal').value);
    state.healthSettings.sugar = parseInt(document.getElementById('sugar-goal').value);
    state.healthSettings.satFat = parseInt(document.getElementById('satfat-goal').value);
    state.healthSettings.calories = parseInt(document.getElementById('calories-goal').value);
    saveToStorage();
    updateHealthView();
    closeModal(document.getElementById('health-settings-modal'));
    showToast('Settings saved');
}

function saveMeal() {
    const dateKey = getDateKey(state.selectedDate);
    if (!state.healthData[dateKey]) {
        state.healthData[dateKey] = {
            meals: [], exercises: [],
            consumed: { protein: 0, carbs: 0, fat: 0, sugar: 0, satFat: 0, calories: 0 },
            burned: 0,
            weight: null
        };
    }
    const meal = {
        description: document.getElementById('meal-description').value,
        protein: parseInt(document.getElementById('meal-protein').value) || 0,
        carbs: parseInt(document.getElementById('meal-carbs').value) || 0,
        fat: parseInt(document.getElementById('meal-fat').value) || 0,
        sugar: parseInt(document.getElementById('meal-sugar').value) || 0,
        satFat: parseInt(document.getElementById('meal-satfat').value) || 0,
        calories: parseInt(document.getElementById('meal-calories').value) || 0
    };
    state.healthData[dateKey].meals.push(meal);
    state.healthData[dateKey].consumed.protein += meal.protein;
    state.healthData[dateKey].consumed.carbs += meal.carbs;
    state.healthData[dateKey].consumed.fat += meal.fat;
    state.healthData[dateKey].consumed.sugar += meal.sugar;
    state.healthData[dateKey].consumed.satFat += meal.satFat;
    state.healthData[dateKey].consumed.calories += meal.calories;
    saveToStorage();
    updateHealthView();
    closeModal(document.getElementById('meal-modal'));
    clearForm('meal');
    showToast('Meal added');
}

function saveExercise() {
    const dateKey = getDateKey(state.selectedDate);
    if (!state.healthData[dateKey]) {
        state.healthData[dateKey] = {
            meals: [], exercises: [],
            consumed: { protein: 0, carbs: 0, fat: 0, sugar: 0, satFat: 0, calories: 0 },
            burned: 0,
            weight: null
        };
    }
    const exercise = {
        description: document.getElementById('exercise-description').value,
        calories: parseInt(document.getElementById('exercise-calories').value) || 0
    };
    state.healthData[dateKey].exercises.push(exercise);
    state.healthData[dateKey].burned += exercise.calories;
    saveToStorage();
    updateHealthView();
    closeModal(document.getElementById('exercise-modal'));
    clearForm('exercise');
    showToast('Exercise added');
}

function renderMealsList(meals) {
    const container = document.getElementById('meal-list');
    if (meals.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No meals logged</p></div>';
        return;
    }
    container.innerHTML = meals.map((m, i) => `
        <div class="log-item">
            <div class="log-item-swipe-container">
                <div class="log-delete-bg">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </div>
                <div class="log-item-content" data-meal-index="${i}">
                    Meal ${i + 1}: ${m.description}
                </div>
            </div>
        </div>
    `).join('');
    setupMealSwipe();
}

function setupMealSwipe() {
    const items = document.querySelectorAll('#meal-list .log-item-content');
    items.forEach(item => {
        const deleteBg = item.closest('.log-item-swipe-container').querySelector('.log-delete-bg');
        setupSwipeToDelete(item, () => deleteMeal(parseInt(item.dataset.mealIndex)), 'log-item-swipe-container');
        deleteBg.addEventListener('click', () => deleteMeal(parseInt(item.dataset.mealIndex)));
    });
}

function deleteMeal(index) {
    const dateKey = getDateKey(state.selectedDate);
    const meal = state.healthData[dateKey].meals[index];
    state.healthData[dateKey].consumed.protein -= meal.protein;
    state.healthData[dateKey].consumed.carbs -= meal.carbs;
    state.healthData[dateKey].consumed.fat -= meal.fat;
    state.healthData[dateKey].consumed.sugar -= meal.sugar;
    state.healthData[dateKey].consumed.satFat -= meal.satFat;
    state.healthData[dateKey].consumed.calories -= meal.calories;
    state.healthData[dateKey].meals.splice(index, 1);
    saveToStorage();
    updateHealthView();
    showToast('Meal deleted');
}

function renderExercisesList(exercises) {
    const container = document.getElementById('exercise-list');
    if (exercises.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No exercises logged</p></div>';
        return;
    }
    container.innerHTML = exercises.map((e, i) => `
        <div class="log-item">
            <div class="log-item-swipe-container">
                <div class="log-delete-bg">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </div>
                <div class="log-item-content" data-exercise-index="${i}">
                    Exercise ${i + 1}: ${e.description}
                </div>
            </div>
        </div>
    `).join('');
    setupExerciseSwipe();
}

function setupExerciseSwipe() {
    const items = document.querySelectorAll('#exercise-list .log-item-content');
    items.forEach(item => {
        const deleteBg = item.closest('.log-item-swipe-container').querySelector('.log-delete-bg');
        setupSwipeToDelete(item, () => deleteExercise(parseInt(item.dataset.exerciseIndex)), 'log-item-swipe-container');
        deleteBg.addEventListener('click', () => deleteExercise(parseInt(item.dataset.exerciseIndex)));
    });
}

function deleteExercise(index) {
    const dateKey = getDateKey(state.selectedDate);
    const exercise = state.healthData[dateKey].exercises[index];
    state.healthData[dateKey].burned -= exercise.calories;
    state.healthData[dateKey].exercises.splice(index, 1);
    saveToStorage();
    updateHealthView();
    showToast('Exercise deleted');
}

// ACCOUNTING
function updateAccountingView() {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    document.getElementById('current-month').textContent = 
        `${months[state.currentMonth.getMonth()]} ${state.currentMonth.getFullYear()}`;
    const month = state.currentMonth.getMonth();
    const year = state.currentMonth.getFullYear();
    let income = 0, expense = 0;
    let cash = 0, debit = 0, debt = 0;
    
    state.accounting.entries.forEach(entry => {
        const entryDate = new Date(entry.date + 'T00:00:00');
        if (entryDate.getMonth() === month && entryDate.getFullYear() === year) {
            if (entry.type === 'income') {
                income += entry.amount;
                if (entry.account === 'Cash') cash += entry.amount;
                else if (entry.account === 'Debit Card') debit += entry.amount;
            }
            else if (entry.type === 'expense') {
                expense += entry.amount;
                if (entry.account === 'Cash') cash -= entry.amount;
                else if (entry.account === 'Debit Card') debit -= entry.amount;
            }
            else if (entry.type === 'transfer') {
                if (entry.from === 'Cash') cash -= entry.amount;
                else if (entry.from === 'Debit Card') debit -= entry.amount;
                if (entry.to === 'Cash') cash += entry.amount;
                else if (entry.to === 'Debit Card') debit += entry.amount;
            }
            else if (entry.type === 'debt') {
                debt += entry.amount;
            }
        }
    });
    
    document.getElementById('income-value').textContent = formatCurrency(income);
    document.getElementById('expense-value').textContent = formatCurrency(expense);
    document.getElementById('balance-value').textContent = formatCurrency(income - expense);
    document.getElementById('cash-value').textContent = formatCurrency(cash);
    document.getElementById('debit-value').textContent = formatCurrency(debit);
    document.getElementById('debt-value').textContent = formatCurrency(debt);
    
    state.accounting.cash = cash;
    state.accounting.debit = debit;
    state.accounting.debt = debt;
    
    renderAccountingEntries();
}

function formatCurrency(amount) {
    return '$' + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function renderAccountingEntries() {
    const container = document.getElementById('accounting-entries');
    const month = state.currentMonth.getMonth();
    const year = state.currentMonth.getFullYear();
    const entries = state.accounting.entries.filter(e => {
        const d = new Date(e.date + 'T00:00:00');
        return d.getMonth() === month && d.getFullYear() === year;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
    
    if (entries.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No entries this month</p></div>';
        return;
    }
    
    const grouped = {};
    entries.forEach((e, globalIndex) => {
        const day = new Date(e.date + 'T00:00:00').getDate();
        if (!grouped[day]) grouped[day] = [];
        grouped[day].push({ ...e, globalIndex: state.accounting.entries.indexOf(e) });
    });
    
    container.innerHTML = Object.keys(grouped).sort((a, b) => b - a).map(day => {
        const date = new Date(year, month, day);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        return `
            <div class="day-group">
                <div class="day-header">${day} ${dayName}</div>
                ${grouped[day].map(e => `
                    <div class="entry-item-container">
                        <div class="entry-delete-bg">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </div>
                        <div class="entry-item" data-entry-index="${e.globalIndex}">
                            <div class="entry-info">
                                <div class="entry-category">${e.category || e.type}</div>
                                <div class="entry-notes">${e.notes || ''} (${e.account || 'N/A'})</div>
                            </div>
                            <div class="entry-amount ${e.type}">${formatCurrency(e.amount)}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }).join('');
    
    setupAccountingSwipe();
}

function setupAccountingSwipe() {
    const items = document.querySelectorAll('.entry-item');
    items.forEach(item => {
        const deleteBg = item.closest('.entry-item-container').querySelector('.entry-delete-bg');
        setupSwipeToDelete(item, () => deleteAccountingEntry(parseInt(item.dataset.entryIndex)), 'entry-item-container');
        deleteBg.addEventListener('click', () => deleteAccountingEntry(parseInt(item.dataset.entryIndex)));
    });
}

function deleteAccountingEntry(index) {
    if (confirm('Delete this entry?')) {
        state.accounting.entries.splice(index, 1);
        saveToStorage();
        updateAccountingView();
        showToast('Entry deleted');
    }
}

function switchAccountingTab(type) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === type);
    });
    document.getElementById('income-form').style.display = type === 'income' ? 'block' : 'none';
    document.getElementById('expense-form').style.display = type === 'expense' ? 'block' : 'none';
    document.getElementById('transfer-form').style.display = type === 'transfer' ? 'block' : 'none';
    document.getElementById('debt-form').style.display = type === 'debt' ? 'block' : 'none';
}

function saveAccountingEntry(continueEntry) {
    const activeTab = document.querySelector('.tab-btn.active');
    const type = activeTab.dataset.type;
    let entry = { type };
    
    if (type === 'income') {
        entry.date = document.getElementById('income-date').value || new Date().toISOString().split('T')[0];
        entry.amount = parseFloat(document.getElementById('income-amount').value) || 0;
        entry.category = document.getElementById('income-category').value;
        entry.account = document.getElementById('income-account').value;
        entry.notes = document.getElementById('income-notes').value;
    } else if (type === 'expense') {
        entry.date = document.getElementById('expense-date').value || new Date().toISOString().split('T')[0];
        entry.amount = parseFloat(document.getElementById('expense-amount').value) || 0;
        entry.category = document.getElementById('expense-category').value;
        entry.account = document.getElementById('expense-account').value;
        entry.notes = document.getElementById('expense-notes').value;
    } else if (type === 'transfer') {
        entry.date = document.getElementById('transfer-date').value || new Date().toISOString().split('T')[0];
        entry.amount = parseFloat(document.getElementById('transfer-amount').value) || 0;
        entry.from = document.getElementById('transfer-from').value;
        entry.to = document.getElementById('transfer-to').value;
        entry.notes = document.getElementById('transfer-notes').value;
    } else if (type === 'debt') {
        entry.date = document.getElementById('debt-date').value || new Date().toISOString().split('T')[0];
        entry.amount = parseFloat(document.getElementById('debt-amount').value) || 0;
        entry.category = document.getElementById('debt-category').value;
        entry.notes = document.getElementById('debt-notes').value;
    }
    
    state.accounting.entries.push(entry);
    saveToStorage();
    updateAccountingView();
    
    if (!continueEntry) {
        closeModal(document.getElementById('accounting-entry-modal'));
        showToast('Entry saved');
    } else {
        clearForm(type);
        showToast('Entry saved. Add another.');
    }
}

// ENTRIES
function initializeEntryForms() {
    const today = getTodayLocal();
    document.getElementById('reminder-date-inline').value = today;
    document.getElementById('task-date-inline').value = today;
    document.getElementById('chore-date-inline').value = today;
}

function switchEntryTab(tabType) {
    document.querySelectorAll('.entries-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabType);
    });
    document.querySelectorAll('.entries-form').forEach(form => {
        form.classList.toggle('active', form.id === `${tabType}-form`);
    });
}

function saveInlineEntry(type) {
    const dateInput = document.getElementById(`${type}-date-inline`);
    const descInput = document.getElementById(`${type}-description-inline`);
    const timeInput = document.getElementById(`${type}-time-inline`);
    
    if (!descInput.value.trim()) {
        showToast('Please enter a description');
        return;
    }
    
    const inputDate = new Date(dateInput.value + 'T00:00:00');
    
    const entry = {
        type: type,
        title: descInput.value,
        date: dateInput.value,
        time: type !== 'chore' ? timeInput?.value : undefined,
        completed: false
    };
    
    if (type === 'chore') {
        const hasTimer = document.getElementById('chore-timer-inline').checked;
        entry.hasTimer = hasTimer;
        entry.duration = hasTimer ? parseInt(document.getElementById('chore-duration-inline').value) || 15 : 0;
    }
    
    const repeatChecked = type !== 'reminder' && document.getElementById(`${type}-repeat-inline`).checked;
    const repeatDays = repeatChecked ? parseInt(document.getElementById(`${type}-repeat-days-inline`).value) || 7 : 0;
    
    if (repeatChecked && repeatDays > 0) {
        const repeatId = 'repeat_' + Date.now();
        entry.repeatId = repeatId;
        
        state.repeatingEntries.push({
            id: repeatId,
            type: type,
            title: entry.title,
            time: entry.time,
            hasTimer: entry.hasTimer,
            duration: entry.duration,
            repeatDays: repeatDays,
            startDate: dateInput.value
        });
        
        for (let i = 0; i <= 52; i++) {
            const futureDate = new Date(inputDate);
            futureDate.setDate(inputDate.getDate() + (i * repeatDays));
            const futureDateKey = getDateKey(futureDate);
            
            if (!state.events[futureDateKey]) {
                state.events[futureDateKey] = [];
            }
            
            state.events[futureDateKey].push({
                ...entry,
                date: futureDateKey
            });
        }
    } else {
        const dateKey = getDateKey(inputDate);
        if (!state.events[dateKey]) {
            state.events[dateKey] = [];
        }
        state.events[dateKey].push(entry);
    }
    
    saveToStorage();
    descInput.value = '';
    if (timeInput) timeInput.value = '';
    if (type === 'chore') {
        document.getElementById('chore-timer-inline').checked = false;
        document.getElementById('timer-duration-inline-group').style.display = 'none';
    }
    if (type !== 'reminder') {
        document.getElementById(`${type}-repeat-inline`).checked = false;
        document.getElementById(`${type}-repeat-days-group`).style.display = 'none';
    }
    
    showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} added`);
    renderActiveEntries();
}

function renderActiveEntries() {
    renderActiveTasks();
    renderActiveChores();
}

function renderActiveTasks() {
    const container = document.getElementById('active-tasks-list');
    const activeTasks = state.repeatingEntries.filter(e => e.type === 'task');
    
    if (activeTasks.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No active repeating tasks</p></div>';
        return;
    }
    
    container.innerHTML = activeTasks.map((task, index) => `
        <div class="active-entry-container">
            <div class="active-entry-delete-bg">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
            </div>
            <div class="active-entry-item" data-repeat-id="${task.id}" data-entry-type="task">
                ${task.title} - Every ${task.repeatDays} day${task.repeatDays > 1 ? 's' : ''}
            </div>
        </div>
    `).join('');
    
    setupActiveEntriesSwipe();
}

function renderActiveChores() {
    const container = document.getElementById('active-chores-list');
    const activeChores = state.repeatingEntries.filter(e => e.type === 'chore');
    
    if (activeChores.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No active repeating chores</p></div>';
        return;
    }
    
    container.innerHTML = activeChores.map((chore, index) => `
        <div class="active-entry-container">
            <div class="active-entry-delete-bg">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
            </div>
            <div class="active-entry-item" data-repeat-id="${chore.id}" data-entry-type="chore">
                ${chore.title} - Every ${chore.repeatDays} day${chore.repeatDays > 1 ? 's' : ''}${chore.hasTimer ? ' (Timer: ' + chore.duration + 'min)' : ''}
            </div>
        </div>
    `).join('');
    
    setupActiveEntriesSwipe();
}

function setupActiveEntriesSwipe() {
    const items = document.querySelectorAll('.active-entry-item');
    items.forEach(item => {
        const deleteBg = item.closest('.active-entry-container').querySelector('.active-entry-delete-bg');
        setupSwipeToDelete(item, () => deleteRepeatingEntry(item.dataset.repeatId), 'active-entry-container');
        deleteBg.addEventListener('click', () => deleteRepeatingEntry(item.dataset.repeatId));
    });
}

function deleteRepeatingEntry(repeatId) {
    if (confirm('Delete this repeating entry? This will remove all instances from the calendar.')) {
        const index = state.repeatingEntries.findIndex(e => e.id === repeatId);
        if (index > -1) {
            state.repeatingEntries.splice(index, 1);
        }
        
        Object.keys(state.events).forEach(dateKey => {
            state.events[dateKey] = state.events[dateKey].filter(event => event.repeatId !== repeatId);
            if (state.events[dateKey].length === 0) {
                delete state.events[dateKey];
            }
        });
        
        saveToStorage();
        renderActiveEntries();
        showToast('Repeating entry deleted');
    }
}

// GOALS
function renderGoals() {
    const container = document.getElementById('goals-list');
    if (state.goals.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No goals yet. Tap + to create your first goal!</p></div>';
        return;
    }
    
    container.innerHTML = state.goals.map((goal, index) => {
        const start = new Date(goal.startDate);
        const now = new Date();
        const diff = now - start;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        const swipedKey = `goal-${index}`;
        const isSwiped = state.goalSwipeStates[swipedKey] || false;
        
        return `
            <div class="goal-item-container">
                <div class="goal-delete-bg">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </div>
                <div class="goal-item ${isSwiped ? 'swiped' : ''}" data-goal-index="${index}" data-swipe-key="${swipedKey}">
                    <div class="goal-name">${goal.name}</div>
                    <div class="goal-description">${goal.description || ''}</div>
                    <div class="goal-stats">
                        <div class="goal-time" data-goal-timer="${index}">${days}d ${hours}h ${minutes}m ${seconds}s</div>
                        <div class="goal-rank">Rank #${index + 1}</div>
                    </div>
                    <div class="goal-progress">
                        <div class="goal-progress-bar" data-goal-progress="${index}" style="width: ${Math.min(100, (diff / (1000 * 60 * 60 * 24 * 365)) * 100)}%"></div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    setupGoalSwipe();
}

function setupGoalSwipe() {
    const items = document.querySelectorAll('.goal-item');
    items.forEach(item => {
        const swipeKey = item.dataset.swipeKey;
        const deleteBg = item.closest('.goal-item-container').querySelector('.goal-delete-bg');
        
        // Restore swipe state
        if (state.goalSwipeStates[swipeKey]) {
            item.style.transform = 'translateX(-80px)';
            item.classList.add('swiped');
            item.closest('.goal-item-container').classList.add('swipe-active'); // ADDED
        }
        
        setupSwipeToDelete(item, () => deleteGoal(parseInt(item.dataset.goalIndex)), 'goal-item-container', swipeKey);
        deleteBg.addEventListener('click', () => deleteGoal(parseInt(item.dataset.goalIndex)));
    });
}

function saveGoal() {
    const name = document.getElementById('goal-name').value;
    const description = document.getElementById('goal-description').value;
    const startDate = document.getElementById('goal-start-date').value;
    const startTime = document.getElementById('goal-start-time').value;
    
    if (!name) {
        showToast('Please enter a goal name');
        return;
    }
    
    const goal = {
        name,
        description,
        startDate: `${startDate}T${startTime}`
    };
    
    state.goals.push(goal);
    saveToStorage();
    renderGoals();
    closeModal(document.getElementById('goal-modal'));
    showToast('Goal added');
}

function deleteGoal(index) {
    if (confirm('Delete this goal?')) {
        state.goals.splice(index, 1);
        
        const swipedKey = `goal-${index}`;
        if (state.goalSwipeStates[swipedKey] !== undefined) {
            delete state.goalSwipeStates[swipedKey];
        }
        
        const newSwipeStates = {};
        Object.keys(state.goalSwipeStates).forEach(key => {
            const keyIndex = parseInt(key.split('-')[1]);
            if (keyIndex > index) {
                newSwipeStates[`goal-${keyIndex - 1}`] = state.goalSwipeStates[key];
            } else if (keyIndex < index) {
                newSwipeStates[key] = state.goalSwipeStates[key];
            }
        });
        state.goalSwipeStates = newSwipeStates;
        
        saveToStorage();
        renderGoals();
        showToast('Goal deleted');
    }
}

function updateGoalTimers() {
    if (state.currentSection === 'dashboard-section') {
        updateDashboard();
    }
    if (state.currentSection === 'workspace-section') {
        const activeSubsection = document.querySelector('.subsection.active');
        if (activeSubsection && activeSubsection.id === 'goals-section') {
            state.goals.forEach((goal, index) => {
                const start = new Date(goal.startDate);
                const now = new Date();
                const diff = now - start;
                const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                
                const timeElement = document.querySelector(`[data-goal-timer="${index}"]`);
                if (timeElement) {
                    timeElement.textContent = `${days}d ${hours}h ${minutes}m ${seconds}s`;
                }
                
                const progressBar = document.querySelector(`[data-goal-progress="${index}"]`);
                if (progressBar) {
                    const progressPercent = Math.min(100, (diff / (1000 * 60 * 60 * 24 * 365)) * 100);
                    progressBar.style.width = `${progressPercent}%`;
                }
            });
        }
    }
}

// ==========================================
// INTEGRACIÓN CON FIREBASE
// ==========================================

window.initDataSync = function(user) {
    if (!user) return;
    
    const userDocRef = window.doc(window.db, "users", user.uid);
    
    window.onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const remoteData = docSnap.data();
            
            // Actualizar estado local
            Object.assign(state, remoteData);
            
            // Re-convertir fechas (string -> Date)
            state.selectedDate = new Date(state.selectedDate);
            state.currentMonth = new Date(state.currentMonth);
            state.dashboardDate = new Date(state.dashboardDate);
            
            // Theme check
            if (!state.theme) state.theme = 'ember';
            document.documentElement.setAttribute('data-theme', state.theme);
            
            // Refrescar toda la interfaz
            if(document.getElementById('days-container')) renderCalendar('days-container');
            if(document.getElementById('health-days-container')) renderCalendar('health-days-container');
            if(document.getElementById('dashboard-days-container')) renderCalendar('dashboard-days-container');
            renderEvents();
            updateHealthView();
            updateAccountingView();
            renderGoals();
            renderNotes();
            renderDashboard();
            renderUpcoming();
            renderPhotoGallery();
            renderActiveEntries();
            
            showToast("Datos sincronizados");
        } else {
            // Usuario nuevo en la nube: subir datos locales
            saveToStorage(); 
        }
    });
};

saveToStorage = function() {
    // Respaldo local
    localStorage.setItem('personalAppState', JSON.stringify(state));

    // Guardar en la nube si hay usuario
    if (window.auth && window.auth.currentUser) {
        const user = window.auth.currentUser;
        const cleanState = JSON.parse(JSON.stringify(state));
        
        window.setDoc(window.doc(window.db, "users", user.uid), cleanState)
            .catch(e => console.error("Error nube:", e));
    }
};