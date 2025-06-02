// filepath: todo-list-app/src/scripts/app.js

document.addEventListener('DOMContentLoaded', () => {
    const taskInput = document.getElementById('taskInput');
    const addTaskBtn = document.getElementById('addTaskBtn');
    const taskList = document.getElementById('taskList');
    const snoozeSound = document.getElementById('snoozeSound');
    const timerBtn = document.getElementById('timerBtn');
    const timerModal = document.getElementById('timerModal');
    const closeModal = document.getElementById('closeModal');
    const saveTimerBtn = document.getElementById('saveTimerBtn');
    const daysInput = document.getElementById('daysInput');
    const hoursInput = document.getElementById('hoursInput');
    const minutesInput = document.getElementById('minutesInput');

    let timerData = { days: 0, hours: 0, minutes: 0 };
    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    let timers = [];

    // Modal logic
    timerBtn.onclick = () => {
        timerModal.style.display = 'flex';
    };
    closeModal.onclick = () => {
        timerModal.style.display = 'none';
    };
    window.onclick = (e) => {
        if (e.target === timerModal) timerModal.style.display = 'none';
    };
    saveTimerBtn.onclick = () => {
        timerData.days = parseInt(daysInput.value) || 0;
        timerData.hours = parseInt(hoursInput.value) || 0;
        timerData.minutes = parseInt(minutesInput.value) || 0;
        timerModal.style.display = 'none';
    };

    function saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }

    function formatTime(ms) {
        if (ms <= 0) return "00s";
        let totalSeconds = Math.floor(ms / 1000);
        const days = Math.floor(totalSeconds / 86400);
        totalSeconds %= 86400;
        const hours = Math.floor(totalSeconds / 3600);
        totalSeconds %= 3600;
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        let str = '';
        if (days > 0) str += `${days}d `;
        if (hours > 0 || days > 0) str += `${hours}h `;
        if (minutes > 0 || hours > 0 || days > 0) str += `${minutes}m `;
        str += `${seconds}s`;
        return str.trim();
    }

    function clearAllTimers() {
        timers.forEach(timer => clearInterval(timer));
        timers = [];
    }

    function renderTasks() {
        clearAllTimers();
        taskList.innerHTML = '';

        // Group tasks by due date (timerEnd date if set, else createdAt)
        const grouped = {};
        tasks.forEach(task => {
            let date;
            if (task.timerEnd) {
                const due = new Date(task.timerEnd);
                date = due.toISOString().slice(0, 10);
            } else {
                date = task.createdAt || new Date().toISOString().slice(0, 10);
            }
            if (!grouped[date]) grouped[date] = [];
            grouped[date].push(task);
        });

        // Sort dates ascending (soonest first)
        const sortedDates = Object.keys(grouped).sort((a, b) => a.localeCompare(b));

        sortedDates.forEach(date => {
            // Date heading
            const dateHeading = document.createElement('li');
            dateHeading.textContent = new Date(date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' });
            dateHeading.style.fontWeight = 'bold';
            dateHeading.style.margin = '1.5em 0 0.5em 0';
            dateHeading.style.color = '#764ba2';
            dateHeading.style.background = '#f3eaff';
            dateHeading.style.borderRadius = '8px';
            dateHeading.style.padding = '0.5em 1em';
            taskList.appendChild(dateHeading);

            grouped[date].forEach(task => {
                const idx = tasks.indexOf(task);
                // --- Your existing task rendering code below ---
                const li = document.createElement('li');
                li.className = 'task-item' + (task.completed ? ' completed' : '');

                // Task text or input for editing
                if (task.editing) {
                    const input = document.createElement('input');
                    input.type = 'text';
                    input.value = task.text;
                    input.className = 'edit-input';
                    input.style.flex = '1';
                    input.onkeydown = (e) => {
                        if (e.key === 'Enter') finishEdit(idx, input.value);
                    };
                    li.appendChild(input);

                    // Timer editing fields
                    const editDays = document.createElement('input');
                    editDays.type = 'number';
                    editDays.min = 0;
                    editDays.value = task.timerEnd ? Math.floor((task.timerEnd - Date.now()) / 86400000) : 0;
                    editDays.style.width = '50px';
                    editDays.placeholder = 'Days';

                    const editHours = document.createElement('input');
                    editHours.type = 'number';
                    editHours.min = 0;
                    editHours.max = 23;
                    editHours.value = task.timerEnd ? Math.floor(((task.timerEnd - Date.now()) % 86400000) / 3600000) : 0;
                    editHours.style.width = '50px';
                    editHours.placeholder = 'Hours';

                    const editMinutes = document.createElement('input');
                    editMinutes.type = 'number';
                    editMinutes.min = 0;
                    editMinutes.max = 59;
                    editMinutes.value = task.timerEnd ? Math.floor(((task.timerEnd - Date.now()) % 3600000) / 60000) : 0;
                    editMinutes.style.width = '60px';
                    editMinutes.placeholder = 'Minutes';

                    const saveBtn = document.createElement('button');
                    saveBtn.textContent = 'Save';
                    saveBtn.onclick = () => {
                        let ms = (parseInt(editDays.value) || 0) * 86400000 +
                                 (parseInt(editHours.value) || 0) * 3600000 +
                                 (parseInt(editMinutes.value) || 0) * 60000;
                        task.text = input.value.trim();
                        task.editing = false;
                        task.timerEnd = ms > 0 ? Date.now() + ms : null;
                        saveTasks();
                        renderTasks();
                    };

                    li.appendChild(editDays);
                    li.appendChild(editHours);
                    li.appendChild(editMinutes);
                    li.appendChild(saveBtn);
                } else {
                    const span = document.createElement('span');
                    span.textContent = task.text;
                    span.style.flex = '1';
                    li.appendChild(span);
                }

                // Timer display
                if (task.timerEnd && !task.completed && !task.editing) {
                    const timerSpan = document.createElement('span');
                    timerSpan.className = 'timer-span';
                    timerSpan.style.marginLeft = '10px';
                    timerSpan.style.fontWeight = 'bold';

                    let soundPlayed = false;
                    let timer = null;
                    function updateTimer() {
                        const remaining = task.timerEnd - Date.now();
                        timerSpan.textContent = formatTime(remaining);
                        if (remaining <= 0) {
                            timerSpan.textContent = "00s";
                            li.style.background = '#ffe0e0';
                            if (!soundPlayed) {
                                snoozeSound.currentTime = 0;
                                snoozeSound.play();
                                soundPlayed = true;
                            }
                            clearInterval(timer);
                        }
                    }
                    timer = setInterval(updateTimer, 1000);
                    timers.push(timer);
                    updateTimer();
                    li.appendChild(timerSpan);
                }

                // Actions
                const actions = document.createElement('div');
                actions.className = 'task-actions';

                // Complete/Uncomplete
                const completeBtn = document.createElement('button');
                completeBtn.className = 'action-btn';
                completeBtn.title = task.completed ? 'Mark as Incomplete' : 'Mark as Complete';
                completeBtn.innerHTML = task.completed ? '⟳' : '✔️';
                completeBtn.onclick = () => toggleComplete(idx);
                actions.appendChild(completeBtn);

                // Edit
                if (!task.completed && !task.editing) {
                    const editBtn = document.createElement('button');
                    editBtn.className = 'action-btn';
                    editBtn.title = 'Edit';
                    editBtn.innerHTML = '✏️';
                    editBtn.onclick = () => startEdit(idx);
                    actions.appendChild(editBtn);
                }

                // Delete
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'action-btn';
                deleteBtn.title = 'Delete';
                deleteBtn.innerHTML = '🗑️';
                deleteBtn.onclick = () => deleteTask(idx);
                actions.appendChild(deleteBtn);

                // Add/Edit Timer Button (if not editing)
                if (!task.editing && !task.completed) {
                    const setTimerBtn = document.createElement('button');
                    setTimerBtn.className = 'action-btn';
                    setTimerBtn.title = task.timerEnd ? 'Edit Timer' : 'Set Timer';
                    setTimerBtn.innerHTML = '⏰';
                    setTimerBtn.onclick = () => startEdit(idx);
                    actions.appendChild(setTimerBtn);
                }

                li.appendChild(actions);
                taskList.appendChild(li);
            });
        });
    }

    function addTask() {
        const text = taskInput.value.trim();
        let timerEnd = null;
        if (timerData.days > 0 || timerData.hours > 0 || timerData.minutes > 0) {
            timerEnd = Date.now() + timerData.days * 86400000 + timerData.hours * 3600000 + timerData.minutes * 60000;
        }
        if (text) {
            const today = new Date();
            const createdAt = today.toISOString().slice(0, 10); // YYYY-MM-DD
            tasks.unshift({ text, completed: false, editing: false, timerEnd, createdAt });
            saveTasks();
            renderTasks();
            taskInput.value = '';
            daysInput.value = '';
            hoursInput.value = '';
            minutesInput.value = '';
            timerData = { days: 0, hours: 0, minutes: 0 };
        }
    }

    function deleteTask(idx) {
        tasks.splice(idx, 1);
        saveTasks();
        renderTasks();
    }

    function toggleComplete(idx) {
        tasks[idx].completed = !tasks[idx].completed;
        tasks[idx].editing = false;
        saveTasks();
        // Pause and reset snooze sound if task is completed
        if (tasks[idx].completed) {
            snoozeSound.pause();
            snoozeSound.currentTime = 0;
        }
        renderTasks();
    }

    function startEdit(idx) {
        tasks.forEach((t, i) => t.editing = i === idx);
        renderTasks();
    }

    function finishEdit(idx, newText) {
        if (newText.trim()) {
            tasks[idx].text = newText.trim();
            tasks[idx].editing = false;
            saveTasks();
            renderTasks();
        } else {
            deleteTask(idx);
        }
    }

    addTaskBtn.addEventListener('click', addTask);
    taskInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') addTask();
    });

    renderTasks();
});