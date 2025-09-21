// ======== RENDERERS ========
function renderPriority(tasks) {
  const box = $('#priorityList');
  const empty = $('#priorityEmpty');
  box.innerHTML = '';

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Only include PENDING tasks that are not overdue OR are due today
  const pendingTasks = tasks.filter(t => {
    const isDone = String(t.status || '').toLowerCase() === 'done';
    if (isDone) return false; // Exclude all completed tasks

    const taskDate = parseDate(t.due_date);
    taskDate.setHours(0, 0, 0, 0);
    const isOverdue = taskDate < today;
    const isDueToday = taskDate.getTime() === today.getTime();

    // Include if not overdue OR if due today
    return !isOverdue || isDueToday;
  });

  // Sort by priority score first, then by due date
  const sortedTasks = [...pendingTasks].sort((a, b) => {
    const scoreA = Number(a.priority_score) || 0;
    const scoreB = Number(b.priority_score) || 0;
    if (scoreB !== scoreA) return scoreB - scoreA;

    const dateA = parseDate(a.due_date || '9999-12-31');
    const dateB = parseDate(b.due_date || '9999-12-31');
    return dateA - dateB;
  });

  // Take top 3 priority tasks
  const priorityTasks = sortedTasks.slice(0, 3);

  if (!priorityTasks.length) {
    empty.classList.remove('hidden');
    return;
  }

  empty.classList.add('hidden');

  for (const t of priorityTasks) {
    const taskDate = parseDate(t.due_date);
    taskDate.setHours(0, 0, 0, 0);
    const isDueToday = taskDate.getTime() === today.getTime();

    const el = document.createElement('div');
    el.className = `p-4 border border-gray-200 rounded-lg ${isDueToday ? 'bg-yellow-50 border-yellow-200' : 'bg-white'}`;
    el.innerHTML = `
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-3 flex-1">
          <label class="checkbox-container flex items-center cursor-pointer">
            <input type="checkbox" class="sr-only task-checkbox" data-task-id="${t.task_id}">
            <div class="custom-checkbox w-5 h-5 border-2 border-gray-300 rounded flex items-center justify-center">
              <i data-feather="check" class="checkmark-icon w-3 h-3 text-white"></i>
            </div>
          </label>
          <span class="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">PRIORITY</span>
          <strong class="flex-1">${t.task_name||'-'}</strong>
          <span class="text-gray-500 text-sm">${t.task_id||''}</span>
        </div>
        <div class="text-gray-600 text-sm">
          <span class="px-2 py-1 bg-gray-100 rounded-full">${(t.due_date && t.due_date!=='Hari Ini') ? fmt(t.due_date) : 'TODAY'}</span>
        </div>
      </div>
      <div class="text-gray-600 text-sm">${t.reasoning||''}</div>
    `;

    // Initialize checkbox state for priority tasks (should be unchecked since we only show pending)
    const checkbox = el.querySelector('.task-checkbox');
    const customCheckbox = el.querySelector('.custom-checkbox');
    const checkmarkIcon = el.querySelector('.checkmark-icon');

    // Priority tasks should always be unchecked (pending state)
    checkbox.checked = false;
    customCheckbox.classList.remove('checked');
    checkmarkIcon.classList.remove('visible');
    box.appendChild(el);
  }

  window.priorityTaskIds = priorityTasks.map(t => t.task_id);
  feather.replace();
}

function renderReminder(tasks) {
  const box = $('#reminderList');
  const empty = $('#reminderEmpty');
  box.innerHTML = '';

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Only include tasks that are NOT in priority, NOT done, and NOT overdue
  const nonPriorityTasks = tasks.filter(t => {
    const isInPriority = window.priorityTaskIds?.includes(t.task_id);
    const isDone = String(t.status || '').toLowerCase() === 'done';
    const taskDate = parseDate(t.due_date);
    taskDate.setHours(0, 0, 0, 0);
    const isOverdue = taskDate < today;

    return !isInPriority && !isDone && !isOverdue;
  });

  const sortedTasks = nonPriorityTasks.sort((a, b) => {
    const dateA = parseDate(a.due_date || '9999-12-31');
    const dateB = parseDate(b.due_date || '9999-12-31');
    return dateA - dateB;
  });

  const reminderTasks = sortedTasks.slice(0, 5);

  if (!reminderTasks.length) {
    empty.classList.remove('hidden');
    return;
  }

  empty.classList.add('hidden');

  for (const t of reminderTasks) {
    const taskDate = parseDate(t.due_date);
    taskDate.setHours(0, 0, 0, 0);
    const isDueToday = taskDate.getTime() === today.getTime();

    const el = document.createElement('div');
    el.className = `p-4 border border-gray-200 rounded-lg ${isDueToday ? 'bg-yellow-50 border-yellow-200' : 'bg-white'}`;
    el.innerHTML = `
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-3">
          <span class="px-2 py-1 ${((t.category||'').toLowerCase()==='priority')?'bg-blue-100 text-blue-800':'bg-gray-100 text-gray-800'} rounded-full text-xs font-medium">${t.category||'-'}</span>
          <strong>${t.task_name||'-'}</strong>
        </div>
        <div class="text-gray-600 text-sm">
          <span class="px-2 py-1 bg-gray-100 rounded-full">${(t.due_date && t.due_date!=='Hari Ini') ? fmt(t.due_date) : 'TODAY'}</span>
        </div>
      </div>
      <div class="text-gray-600 text-sm">${t.reasoning||''}</div>
    `;
    box.appendChild(el);
  }

  // Re-render feather icons for the new check-circle icons
  feather.replace();
}

function renderProfile(userProfile, userPekerjaan = null, userStatus = null) {
  // Handle both N8N server data and localStorage data
  let profileData;

  if (userProfile && userProfile.tasks && Array.isArray(userProfile.tasks) && userProfile.tasks.length > 0) {
    // This is N8N server data format
    profileData = userProfile.tasks[0];
  } else {
    // This is localStorage data format
    profileData = {
      motivational_quote: undefined,
      mental_solution: undefined
    };
  }

  // Display the data in the HTML elements - use goals data for JOB and STATUS
  const displayJob = (typeof userPekerjaan !== 'undefined' && userPekerjaan) ? userPekerjaan : (profileData.category || '-');
  const displayStatus = (typeof userStatus !== 'undefined' && userStatus) ? userStatus : (profileData.mental_problem || '-');

  console.log('Current Profile&TIPS - JOB:', displayJob);
  console.log('Current Profile&TIPS - STATUS:', displayStatus);

  $('#userCategoryPill').textContent = `JOB: ${displayJob}`;
  $('#userStatusPill').textContent = `STATUS: ${displayStatus}`;
  $('#userSlotsPill').textContent = `SLOTS: ${profileData.recommended_priority_slots || '-'}`;
  $('#quoteText').textContent = profileData.motivational_quote ? `"${profileData.motivational_quote}"` : '""';
  $('#mhProblem').textContent = profileData.mental_problem || '-';
  $('#mhSolution').textContent = profileData.mental_solution || '-';

}

function renderCharts(tasks) {
  if (typeof Chart === 'undefined') {
    console.error('Chart.js is not loaded!');
    $('#overallText').textContent = 'CHART.JS NOT LOADED';
    $('#priorityTodayText').textContent = 'CHART.JS NOT LOADED';
    return;
  }

  const done = tasks.filter(t => String(t.status||'').toLowerCase()==='done').length;
  const total = tasks.length;
  const remaining = Math.max(total - done, 0);
  const pct = total ? Math.round((done/total)*100) : 0;
  $('#overallText').textContent = `${pct}% DONE (${done}/${total})`;

  const overallCtx = document.getElementById('overallChart');
  if (!overallCtx) {
    console.error('Overall chart canvas not found!');
    $('#overallText').textContent = 'CANVAS NOT FOUND';
    return;
  }

  const overallData = {
    labels: ['DONE', 'PENDING'],
    datasets: [{ data: [done, remaining], backgroundColor: ['#10B981', '#EF4444'] }]
  };

  try {
    if (OVERALL_CHART) {
      OVERALL_CHART.data = overallData;
      OVERALL_CHART.update();
    } else {
      OVERALL_CHART = new Chart(overallCtx, {
        type: 'doughnut',
        data: overallData,
        options: {
          plugins: { legend: { display: false } },
          cutout: '62%',
          responsive: true,
          maintainAspectRatio: false
        }
      });
    }
  } catch (error) {
    console.error('Error creating overall chart:', error);
    $('#overallText').textContent = 'CHART ERROR';
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

}

function renderCompleted(tasks) {
  const box = $('#completedList');
  const empty = $('#completedEmpty');
  box.innerHTML = '';

  const completedTasks = tasks.filter(t => String(t.status || '').toLowerCase() === 'done');

  // Sort by completion time (most recent first) - assuming tasks completed more recently have higher priority_score or we can use task_id as proxy
  // For now, we'll sort by due date descending (most recent due dates first) and limit to 3
  const sortedTasks = completedTasks.sort((a, b) => {
    const dateA = parseDate(a.due_date || '0000-01-01');
    const dateB = parseDate(b.due_date || '0000-01-01');
    return dateB - dateA; // Most recent due dates first
  });

  const recentCompleted = sortedTasks.slice(0, 3);

  if (!recentCompleted.length) {
    empty.classList.remove('hidden');
    return;
  }

  empty.classList.add('hidden');

  for (const t of recentCompleted) {
    const dueDate = parseDate(t.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isDueToday = dueDate.getTime() === today.getTime();

    // Always show the actual due date, not "TODAY"
    const displayDate = t.due_date ? fmt(t.due_date) : 'No Date';

    const el = document.createElement('div');
    el.className = 'p-4 border border-gray-200 rounded-lg bg-green-50 task-new-completed';
    el.innerHTML = `
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-3 flex-1">
          <div class="flex items-center gap-2">
            <i data-feather="check-circle" class="w-4 h-4 text-green-600"></i>
            <span class="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">COMPLETED</span>
          </div>
          <strong class="line-through text-gray-600 flex-1">${t.task_name||'-'}</strong>
          <span class="text-gray-500 text-sm">${t.task_id||''}</span>
        </div>
        <div class="text-gray-600 text-sm">
          <span class="px-2 py-1 bg-gray-100 rounded-full">${displayDate}</span>
        </div>
      </div>
      <div class="text-gray-600 text-sm">${t.reasoning||''}</div>
    `;
    box.appendChild(el);
  }
}

function renderGoals(goals) {
   const box = $('#goalsList');
   const empty = $('#goalsEmpty');
   box.innerHTML = '';

   if (!goals || !goals.length) {
     empty.classList.remove('hidden');
     return;
   }

   empty.classList.add('hidden');

   for (const goal of goals) {
     const progressPercent = goal.progress || 0;
     const statusColor = goal.status === 'completed' ? 'green' : goal.status === 'in_progress' ? 'blue' : 'gray';
     const statusText = goal.status === 'completed' ? 'COMPLETED' : goal.status === 'in_progress' ? 'IN PROGRESS' : 'NOT STARTED';

     const el = document.createElement('div');
     el.className = 'bg-gray-50 rounded-lg p-4 border';
     el.innerHTML = `
       <div class="flex items-center justify-between mb-3">
         <div class="flex items-center gap-3">
           <i data-feather="target" class="w-4 h-4 text-${statusColor}-500"></i>
           <h4 class="font-semibold text-gray-800">${goal.title || 'Untitled Goal'}</h4>
         </div>
         <div class="flex items-center gap-2">
           <span class="px-2 py-1 bg-${statusColor}-100 text-${statusColor}-800 rounded-full text-xs font-medium">${statusText}</span>
           <button class="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm font-medium transition-colors edit-goal-btn" data-goal-id="${goal.id}">
             <i data-feather="edit-2" class="w-3 h-3"></i>
           </button>
         </div>
       </div>
       <p class="text-gray-600 text-sm mb-3">${goal.description || 'No description'}</p>
       <div class="flex items-center justify-between mb-2">
         <span class="text-sm text-gray-600">Progress</span>
         <span class="text-sm font-medium text-gray-800">${progressPercent}%</span>
       </div>
       <div class="w-full bg-gray-200 rounded-full h-2 mb-2">
         <div class="bg-${statusColor}-500 h-2 rounded-full transition-all duration-300" style="width: ${progressPercent}%"></div>
       </div>
       <div class="text-xs text-gray-500">
         Target: ${goal.target_date ? fmt(goal.target_date) : 'No target date'}
       </div>
     `;
     box.appendChild(el);
   }

   feather.replace();

   // Add event listeners for edit buttons
   document.querySelectorAll('.edit-goal-btn').forEach(btn => {
     btn.addEventListener('click', (e) => {
       const goalId = e.currentTarget.dataset.goalId;
       const goal = goals.find(g => g.id === goalId);
       if (goal) {
         openGoalEditModal(goal);
       }
     });
   });
 }

function renderOverdue(tasks) {
  const box = $('#overdueList');
  const empty = $('#overdueEmpty');
  box.innerHTML = '';

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Only include overdue tasks that are NOT completed
  const overdueTasks = tasks.filter(t => {
    const taskDate = parseDate(t.due_date);
    taskDate.setHours(0, 0, 0, 0);
    const isOverdue = taskDate < today;
    const isDone = String(t.status || '').toLowerCase() === 'done';

    return isOverdue && !isDone; // Only overdue AND not done
  });

  const sortedTasks = overdueTasks.sort((a, b) => {
    const dateA = parseDate(a.due_date || '9999-12-31');
    const dateB = parseDate(b.due_date || '9999-12-31');
    return dateA - dateB;
  });

  if (!sortedTasks.length) {
    empty.classList.remove('hidden');
    return;
  }

  empty.classList.add('hidden');

  for (const t of sortedTasks) {
    const el = document.createElement('div');
    el.className = 'p-4 border border-red-200 rounded-lg bg-red-50';
    el.innerHTML = `
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-3 flex-1">
          <label class="checkbox-container flex items-center cursor-pointer">
            <input type="checkbox" class="sr-only task-checkbox" data-task-id="${t.task_id}" data-section="overdue">
            <div class="custom-checkbox w-5 h-5 border-2 border-gray-300 rounded flex items-center justify-center">
              <i data-feather="check" class="checkmark-icon w-3 h-3 text-white"></i>
            </div>
          </label>
          <span class="px-2 py-1 ${((t.category||'').toLowerCase()==='priority')?'bg-blue-100 text-blue-800':'bg-gray-100 text-gray-800'} rounded-full text-xs font-medium">${t.category||'-'}</span>
          <strong class="flex-1">${t.task_name||'-'}</strong>
          <span class="text-gray-500 text-sm">${t.task_id||''}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-gray-600 text-sm">
            <span class="px-2 py-1 bg-gray-100 rounded-full">${(t.due_date && t.due_date!=='Hari Ini') ? fmt(t.due_date) : 'TODAY'}</span>
          </span>
          <button class="px-2 py-1 bg-yellow-500 hover:bg-yellow-600 text-white rounded text-sm font-medium transition-colors extend-btn" data-task-id="${t.task_id}" title="Extend Due Date">
            <i data-feather="calendar" class="w-4 h-4"></i>
          </button>
        </div>
      </div>
      <div class="text-gray-600 text-sm">${t.reasoning||''}</div>
    `;

    // Add click handler directly to the button for better reliability
    const extendBtn = el.querySelector('.extend-btn');
    if (extendBtn) {
      extendBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Extend button clicked directly for task:', t.task_id);

        currentExtendTaskId = t.task_id;

        const dateForm = $('#dateForm');
        if (dateForm) {
          dateForm.newDueDate.value = todayISO();
        }

        const dateModal = $('#dateModal');
        if (dateModal) {
          dateModal.classList.remove('opacity-0', 'pointer-events-none');
          dateModal.classList.add('opacity-100');
        }
      });
    }

    box.appendChild(el);
  }

  feather.replace();
}