// ======== FORM HANDLERS ========
$('#taskForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalHTML = submitBtn.innerHTML;

  // Show loading state
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i data-feather="loader" class="w-4 h-4 inline mr-2 animate-spin"></i>ADDING TASK...';
  feather.replace();

  const fd = new FormData(form);
  const payload = Object.fromEntries(fd.entries());

  payload.task_name = payload.task_name.trim();
  payload.due_date = payload.due_date || todayISO();
  // Use existing task_id if set (from AI), otherwise generate new one
  payload.task_id = payload.task_id || generateTaskId();
  payload.source = payload.task_id ? 2 : 1; // 2 for AI-generated, 1 for manual

  try {
    console.log('🎯 FRONTEND: About to call add-task endpoint:', EP.addTask);
    console.log('🎯 FRONTEND: Payload:', payload);

    const response = await fetchJSON(EP.addTask, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    console.log('🎯 FRONTEND: Add-task response received:', response);

    toast('TASK ADDED');
    form.reset();
    // Clear the hidden task_id field
    form.task_id.value = '';
    loadAll();
  } catch (err) {
    console.error('Failed to add task:', err);
    toast('FAILED TO ADD TASK: ' + err.message);
  } finally {
    // Restore original state
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalHTML;
    feather.replace();
  }
});

$('#feedbackForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalHTML = submitBtn.innerHTML;

  // Show loading state
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i data-feather="loader" class="w-4 h-4 inline mr-2 animate-spin"></i>SENDING...';
  feather.replace();

  const fd = new FormData(form);
  const payload = Object.fromEntries(fd.entries());

  try {
    await fetchJSON(EP.feedback, { method:'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(payload) });
    toast('FEEDBACK SENT');
    form.reset();
  } catch (err) {
    console.error(err);
    toast('FAILED TO SEND FEEDBACK');
  } finally {
    // Restore original state
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalHTML;
    feather.replace();
  }
});


// AI Modal Handlers
const aiModal = $('#aiModal');
const closeAiModal = $('#closeAiModal');
const aiForm = $('#aiForm');
const aiSuggestBtn = $('#aiSuggestBtn');

if (aiSuggestBtn && aiModal) {
  aiSuggestBtn.addEventListener('click', () => {
    aiModal.classList.remove('opacity-0', 'pointer-events-none');
    aiModal.classList.add('opacity-100');
  });
}

if (closeAiModal && aiModal) {
  closeAiModal.addEventListener('click', () => {
    aiModal.classList.remove('opacity-100');
    aiModal.classList.add('opacity-0', 'pointer-events-none');
  });
}

if (aiModal) {
  aiModal.addEventListener('click', (e) => {
    if (e.target === aiModal) {
      aiModal.classList.remove('opacity-100');
      aiModal.classList.add('opacity-0', 'pointer-events-none');
    }
  });
}

aiForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const rawInput = formData.get('rawInput').trim();

  if (!rawInput) {
    toast('PLEASE ENTER TASK DESCRIPTION');
    return;
  }

  const submitBtn = aiForm.querySelector('button[type="submit"]');
  const originalText = submitBtn.innerHTML;

  try {
    submitBtn.innerHTML = '<i data-feather="loader" class="w-4 h-4 inline mr-2 animate-spin"></i>GENERATING...';
    submitBtn.disabled = true;
    feather.replace();

    const response = await fetch(EP.aiSuggest, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        rawInput,
        source: 2
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();

    const t = data.task || data;
    const form = $('#taskForm');

    // Use task_id from server response if available, otherwise generate one
    const aiTaskId = t.task_id || generateTaskId();
    form.task_id.value = aiTaskId;

    if (t.task_name) form.task_name.value = t.task_name;
    if (t.category) form.category.value = t.category;
    if (t.due_date) {
      const dateStr = t.due_date.length === 10 ? t.due_date : todayISO();
      form.due_date.value = dateStr;
    }
    if (t.reasoning) form.reasoning.value = t.reasoning;

    aiForm.reset();
    aiModal.classList.remove('opacity-100');
    aiModal.classList.add('opacity-0', 'pointer-events-none');
    toast('✨ AI HAS CREATED DRAFT TASK');

  } catch (e) {
    console.error('AI suggestion error:', e);
    toast('❌ FAILED TO GENERATE TASK: ' + e.message);
  } finally {
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
    feather.replace();
  }
});

// Refresh controls
const refreshBtn = $('#refreshBtn');
const openDocsBtn = $('#openDocs');
const toggleAutoRefreshBtn = $('.btn-toggle-auto-refresh');
const refreshIntervalSelect = $('#refreshInterval');

if (refreshBtn) {
  refreshBtn.addEventListener('click', async () => {
    // Show loading state on button
    const originalHTML = refreshBtn.innerHTML;
    refreshBtn.innerHTML = '<i data-feather="loader" class="w-4 h-4 inline mr-2 animate-spin"></i>REFRESHING...';
    refreshBtn.disabled = true;
    feather.replace();

    try {
      await loadAll();
      toast('🔄 Data refreshed', 1500);
    } catch (error) {
      console.error('Manual refresh error:', error);
    } finally {
      // Reset button state
      refreshBtn.innerHTML = originalHTML;
      refreshBtn.disabled = false;
      feather.replace();
    }
  });
}

if (openDocsBtn) openDocsBtn.addEventListener('click', (e) => { e.preventDefault(); alert('ENDPOINT:\n- GET /tasks\n- GET /profile\n- POST /add-task\n- POST /feedback\n- (OPSI) POST /add-task'); });

// Auto-refresh controls
if (toggleAutoRefreshBtn) {
  toggleAutoRefreshBtn.addEventListener('click', toggleAutoRefresh);
}

if (refreshIntervalSelect) {
  refreshIntervalSelect.addEventListener('change', updateRefreshInterval);
  // Set initial value
  refreshIntervalSelect.value = autoRefreshInterval.toString();
}

// Task completion handler
document.addEventListener('change', async (e) => {
  if (!e.target.matches('.task-checkbox')) return;

  const checkbox = e.target;
  const taskId = checkbox.dataset.taskId;

  console.log('🎯 TASK DONE: Checkbox clicked for task:', taskId);

  // Handle both priority tasks (.task class) and overdue tasks (no .task class)
  const taskElement = checkbox.closest('.task') || checkbox.closest('div.p-4');
  const taskNameElement = taskElement.querySelector('strong');
  const checkboxContainer = checkbox.closest('.checkbox-container');
  const customCheckbox = checkboxContainer.querySelector('.custom-checkbox');
  const checkmarkIcon = customCheckbox.querySelector('.checkmark-icon');

  const originalState = checkbox.checked;

  // Trigger animation immediately
  checkboxContainer.classList.add('clicked');

  try {
    checkbox.disabled = true;

    // Add visual feedback
    if (originalState) {
      customCheckbox.classList.add('checked');
      checkmarkIcon.classList.add('visible');
      taskElement.classList.add('task-completing');
    }

    // Find the task data to get the due_date
    const taskData = ALL_TASKS.find(task => task.task_id === taskId);
    const dueDate = taskData ? taskData.due_date : null;

    const payload = {
      task_id: taskId,
      status: originalState ? 'done' : 'pending',
      due_date: dueDate,
      completed_date: originalState ? new Date().toISOString() : null
    };

    console.log('🎯 TASK DONE: Sending to server:', payload);
    console.log('🎯 TASK DONE: Full URL:', window.location.origin + EP.updateTaskStatus);

    const response = await fetchJSON(EP.updateTaskStatus, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    console.log('🎯 TASK DONE: Server response:', response);

    if (originalState) {
      taskNameElement.classList.add('line-through', 'text-gray-500');
      toast('✓ TASK COMPLETED');
      // Immediately refresh to move completed task to recent completed section
      setTimeout(() => loadAll(), 300); // Small delay for animation
    } else {
      customCheckbox.classList.remove('checked');
      checkmarkIcon.classList.remove('visible');
      taskNameElement.classList.remove('line-through', 'text-gray-500');
      toast('TASK MARKED AS PENDING');
      setTimeout(loadAll, 500);
    }

  } catch (err) {
    console.error('❌ TASK DONE: Failed:', err);
    checkbox.checked = !originalState;

    // Revert animation on error
    customCheckbox.classList.remove('checked');
    checkmarkIcon.classList.remove('visible');
    taskElement.classList.remove('task-completing');

    toast('FAILED TO UPDATE TASK STATUS');
  } finally {
    // Remove click animation after a short delay
    setTimeout(() => {
      checkboxContainer.classList.remove('clicked');
    }, 400);

    checkbox.disabled = false;
  }
});

// Due date extension handler
let currentExtendTaskId = null;

document.addEventListener('click', (e) => {
  // Check if clicked element is the extend button or contains it
  const extendBtn = e.target.closest('.extend-btn');
  if (!extendBtn) return;

  e.preventDefault();
  currentExtendTaskId = extendBtn.dataset.taskId;

  console.log('Extend button clicked for task:', currentExtendTaskId);

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

// Date modal handlers
const dateModal = $('#dateModal');
const closeDateModal = $('#closeDateModal');
const cancelDateBtn = $('#cancelDateBtn');
const dateForm = $('#dateForm');

if (closeDateModal && dateModal) {
  closeDateModal.addEventListener('click', () => {
    dateModal.classList.remove('opacity-100');
    dateModal.classList.add('opacity-0', 'pointer-events-none');
    currentExtendTaskId = null;
  });
}

if (cancelDateBtn && dateModal) {
  cancelDateBtn.addEventListener('click', () => {
    dateModal.classList.remove('opacity-100');
    dateModal.classList.add('opacity-0', 'pointer-events-none');
    currentExtendTaskId = null;
  });
}

if (dateModal) {
  dateModal.addEventListener('click', (e) => {
    if (e.target === dateModal) {
      dateModal.classList.remove('opacity-100');
      dateModal.classList.add('opacity-0', 'pointer-events-none');
      currentExtendTaskId = null;
    }
  });
}

// Goal modal handlers
const goalModal = $('#goalModal');
const closeGoalModal = $('#closeGoalModal');
const cancelGoalBtn = $('#cancelGoalBtn');
const goalForm = $('#goalForm');

// Profile modal handlers
const profileModal = $('#profileModal');
const closeProfileModal = $('#closeProfileModal');
const cancelProfileBtn = $('#cancelProfileBtn');
const profileForm = $('#profileForm');
const editProfileBtn = $('.edit-profile-btn');

function openGoalEditModal(goal) {
  // Populate form with goal data
  $('#goalId').value = goal.id;
  goalForm.goalTitle.value = goal.title || '';
  goalForm.goalDescription.value = goal.description || '';
  goalForm.goalProgress.value = goal.progress || 0;
  goalForm.goalStatus.value = goal.status || 'in_progress';
  goalForm.goalTargetDate.value = goal.target_date || '';

  // Show modal
  if (goalModal) {
    goalModal.classList.remove('opacity-0', 'pointer-events-none');
    goalModal.classList.add('opacity-100');
  }
}

if (closeGoalModal && goalModal) {
  closeGoalModal.addEventListener('click', () => {
    goalModal.classList.remove('opacity-100');
    goalModal.classList.add('opacity-0', 'pointer-events-none');
  });
}

if (cancelGoalBtn && goalModal) {
  cancelGoalBtn.addEventListener('click', () => {
    goalModal.classList.remove('opacity-100');
    goalModal.classList.add('opacity-0', 'pointer-events-none');
  });
}

if (goalModal) {
  goalModal.addEventListener('click', (e) => {
    if (e.target === goalModal) {
      goalModal.classList.remove('opacity-100');
      goalModal.classList.add('opacity-0', 'pointer-events-none');
    }
  });
}

// Profile modal event listeners
if (editProfileBtn && profileModal) {
  editProfileBtn.addEventListener('click', () => {
    // Pre-populate form with current values
    const userCategoryPill = $('#userCategoryPill');
    const userStatusPill = $('#userStatusPill');

    const currentJob = userCategoryPill.textContent.replace('JOB: ', '');
    const currentStatus = userStatusPill.textContent.replace('STATUS: ', '');

    profileForm.userJob.value = currentJob === '-' ? '' : currentJob;
    profileForm.userStatus.value = currentStatus === '-' ? '' : currentStatus;

    // Show modal
    profileModal.classList.remove('opacity-0', 'pointer-events-none');
    profileModal.classList.add('opacity-100');
  });
}

if (closeProfileModal && profileModal) {
  closeProfileModal.addEventListener('click', () => {
    profileModal.classList.remove('opacity-100');
    profileModal.classList.add('opacity-0', 'pointer-events-none');
  });
}

if (cancelProfileBtn && profileModal) {
  cancelProfileBtn.addEventListener('click', () => {
    profileModal.classList.remove('opacity-100');
    profileModal.classList.add('opacity-0', 'pointer-events-none');
  });
}

if (profileModal) {
  profileModal.addEventListener('click', (e) => {
    if (e.target === profileModal) {
      profileModal.classList.remove('opacity-100');
      profileModal.classList.add('opacity-0', 'pointer-events-none');
    }
  });
}

// Date form submission
dateForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!currentExtendTaskId) return;

  const formData = new FormData(e.target);
  const newDueDate = formData.get('newDueDate');

  if (!newDueDate) {
    toast('PLEASE SELECT A DATE');
    return;
  }

  try {
    const submitBtn = dateForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i data-feather="loader" class="w-4 h-4 inline mr-2 animate-spin"></i>SAVING...';
    feather.replace();

    await fetchJSON(EP.updateTaskStatus, {
      method: 'POST',
      body: JSON.stringify({
        task_id: currentExtendTaskId,
        due_date: newDueDate,
        action: 'extend_due_date'
      })
    });

    toast('📅 DUE DATE EXTENDED');
    dateModal.classList.remove('opacity-100');
    dateModal.classList.add('opacity-0', 'pointer-events-none');

    setTimeout(loadAll, 500);
  } catch (err) {
    console.error('Failed to extend due date:', err);
    toast('FAILED TO EXTEND DUE DATE');
  } finally {
    const submitBtn = dateForm.querySelector('button[type="submit"]');
    submitBtn.disabled = false;
    submitBtn.textContent = 'SAVE';
    currentExtendTaskId = null;
    feather.replace();
  }
});

// Goal form submission
goalForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalHTML = submitBtn.innerHTML;

  // Show loading state
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i data-feather="loader" class="w-4 h-4 inline mr-2 animate-spin"></i>UPDATING...';
  feather.replace();

  const formData = new FormData(form);
  const goalData = {
    goalId: formData.get('goalId'),
    title: formData.get('goalTitle'),
    description: formData.get('goalDescription'),
    progress: parseInt(formData.get('goalProgress')) || 0,
    status: formData.get('goalStatus'),
    target_date: formData.get('goalTargetDate') || null,
    timestamp: new Date().toISOString(),
    action: 'update_goal',
    task_id: 1
  };

  try {
    // Send to our server first (which will forward to N8N)
    const response = await fetch('/update-profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(goalData)
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const result = await response.json();

    if (result.success) {
      toast('✅ GOAL UPDATED');
      goalModal.classList.remove('opacity-100');
      goalModal.classList.add('opacity-0', 'pointer-events-none');

      // Refresh goals after a short delay
      setTimeout(() => {
        // Re-fetch goals from N8N to show updated data
        loadAll();
      }, 500);
    } else {
      throw new Error(result.message || 'Failed to update goal');
    }

  } catch (err) {
    console.error('Failed to update goal:', err);
    toast('❌ FAILED TO UPDATE GOAL: ' + err.message);
  } finally {
    // Restore original state
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalHTML;
    feather.replace();
  }
});

// Profile form submission
profileForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalHTML = submitBtn.innerHTML;

  // Show loading state
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i data-feather="loader" class="w-4 h-4 inline mr-2 animate-spin"></i>UPDATING...';
  feather.replace();

  const formData = new FormData(form);
  const profileData = {
    job: formData.get('userJob').trim(),
    status: formData.get('userStatus').trim(),
    timestamp: new Date().toISOString(),
    action: 'update_user_profile',
    task_id: 1
  };

  try {
    // Send to our server first (which will forward to N8N)
    const response = await fetch('/update-profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(profileData)
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const result = await response.json();

    if (result.success) {
      toast('✅ PROFILE UPDATED');
      profileModal.classList.remove('opacity-100');
      profileModal.classList.add('opacity-0', 'pointer-events-none');

      // Update stored values
      userPekerjaan = profileData.job;
      userStatus = profileData.status;

      // Update localStorage
      localStorage.setItem('userProfile', JSON.stringify({
        job: userPekerjaan,
        status: userStatus
      }));

      // Create profile data for rendering
      const profileForRender = {
        tasks: [{
          category: userPekerjaan || 'Default',
          mental_problem: userStatus || 'None',
          motivational_quote: 'Stay productive!',
          mental_solution: 'Keep working'
        }]
      };
      renderProfile(profileForRender, userPekerjaan, userStatus);

      // Clear the form
      form.reset();

      // Refresh data after a short delay to sync with N8N
      setTimeout(() => {
        loadAll();
      }, 500);
    } else {
      throw new Error(result.message || 'Failed to update profile');
    }

  } catch (err) {
    console.error('Failed to update profile:', err);
    toast('❌ FAILED TO UPDATE PROFILE: ' + err.message);
  } finally {
    // Restore original state
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalHTML;
    feather.replace();
  }
});