// ======== STATE ========
let ALL_TASKS = [];
let OVERALL_CHART = null;

let userPekerjaan = null;
let userStatus = null;

// Auto-refresh state
let autoRefreshEnabled = true;
let autoRefreshInterval = 60000; // 1 minute default
let autoRefreshTimer = null;
let lastDataHash = null;
let isRefreshing = false;

// ======== AUTO-REFRESH FUNCTIONS ========
function generateDataHash(tasks) {
  // Create a simple hash of the tasks data to detect changes
  const taskIds = tasks.map(t => t.task_id + t.status + t.due_date).sort().join('');
  let hash = 0;
  for (let i = 0; i < taskIds.length; i++) {
    const char = taskIds.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString();
}

function updateRefreshButton() {
  const btn = $('.btn-toggle-auto-refresh');
  const icon = btn.querySelector('i');
  const text = btn.querySelector('span') || btn.childNodes[2];
  const indicator = $('#autoRefreshIndicator');

  if (autoRefreshEnabled) {
    btn.className = 'btn-toggle-auto-refresh px-4 py-2 bg-green-100 hover:bg-green-200 rounded-lg text-green-700 font-medium transition-colors';
    if (icon) icon.setAttribute('data-feather', 'pause');
    if (text) text.textContent = 'AUTO REFRESH: ON';
    else btn.innerHTML = '<i data-feather="pause" class="w-4 h-4 inline mr-2"></i>AUTO REFRESH: ON';

    // Show indicator when auto-refresh is enabled
    if (indicator) indicator.classList.remove('hidden');
  } else {
    btn.className = 'btn-toggle-auto-refresh px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-medium transition-colors';
    if (icon) icon.setAttribute('data-feather', 'play');
    if (text) text.textContent = 'AUTO REFRESH: OFF';
    else btn.innerHTML = '<i data-feather="play" class="w-4 h-4 inline mr-2"></i>AUTO REFRESH: OFF';

    // Hide indicator when auto-refresh is disabled
    if (indicator) indicator.classList.add('hidden');
  }
  feather.replace();
}

function startAutoRefresh() {
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer);
  }

  if (autoRefreshEnabled) {
    autoRefreshTimer = setInterval(async () => {
      if (!isRefreshing) {
        await autoRefresh();
      }
    }, autoRefreshInterval);
  }
}

function stopAutoRefresh() {
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer);
    autoRefreshTimer = null;
    console.log('Auto-refresh stopped');
  }
}

async function autoRefresh() {
  if (isRefreshing) return;

  try {
    isRefreshing = true;

    // Show refresh indicator
    const indicator = $('#autoRefreshIndicator');
    if (indicator) indicator.classList.remove('hidden');

    // Fetch latest data
    const taskData = await fetchJSON(EP.tasks);

    if (!taskData || !Array.isArray(taskData.tasks)) {
      console.warn('Invalid data format received during auto-refresh');
      return;
    }

    const newTasks = taskData.tasks;
    const newDataHash = generateDataHash(newTasks);

    // Only update if data has changed
    if (lastDataHash !== newDataHash) {
      console.log('Data changed, updating dashboard...');
      ALL_TASKS = newTasks;
      lastDataHash = newDataHash;

      // Update all sections
      renderPriority(ALL_TASKS);
      renderReminder(ALL_TASKS);
      renderCharts(ALL_TASKS);
      renderCompleted(ALL_TASKS);
      renderOverdue(ALL_TASKS);

      // Update goals if data changed
      try {
        const goalsResponse = await fetch(EP.goals, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });

        if (goalsResponse.ok) {
          const goalsData = await goalsResponse.json();

          // Server already returns data in the correct format: { goals: [...] }
          if (goalsData && goalsData.goals && Array.isArray(goalsData.goals)) {
            renderGoals(goalsData.goals);
          }
        }
      } catch (goalsError) {
        console.error('Failed to refresh goals:', goalsError);
      }

      if (goalsData.pekerjaan) {
        userPekerjaan = goalsData.pekerjaan;
      }
      if (goalsData.status) {
        userStatus = goalsData.status;
      }

      try {
        const profileResponse = await fetch(EP.profile, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });
        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          if (profileData && profileData.tasks && Array.isArray(profileData.tasks) && profileData.tasks.length > 0) {
            const profileInfo = profileData.tasks[0];
            if (userPekerjaan) profileInfo.category = userPekerjaan;
            // Don't override mental_problem with status from goals - they serve different purposes
            // Update localStorage
            const userProfileData = {
              job: profileInfo.category || 'Default',
              status: profileInfo.mental_problem || 'None',
              motivational_quote: profileInfo.motivational_quote,
              mental_problem: profileInfo.mental_problem,
              mental_solution: profileInfo.mental_solution
            };
            localStorage.setItem('userProfile', JSON.stringify(userProfileData));
            // Render profile
            renderProfile(profileData, userPekerjaan, userStatus);
          }
        }
      } catch (profileError) {
        console.error('Failed to refresh profile:', profileError);
      }

      // Show subtle update notification
      toast('🔄 Dashboard updated', 1500);
    } else {
      console.log('No data changes detected');
    }

    // Update last refresh time
    updateLastRefreshTime();

  } catch (error) {
    console.error('Auto-refresh error:', error);
    // Don't show error toast for auto-refresh to avoid spam
  } finally {
    isRefreshing = false;
    // Hide refresh indicator
    const indicator = $('#autoRefreshIndicator');
    if (indicator) indicator.classList.add('hidden');
  }
}

function updateLastRefreshTime() {
  const now = new Date();
  const timeString = now.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const timeElement = $('#lastRefreshTime');
  if (timeElement) {
    timeElement.textContent = `Last updated: ${timeString}`;
  }
}

function toggleAutoRefresh() {
  autoRefreshEnabled = !autoRefreshEnabled;

  if (autoRefreshEnabled) {
    startAutoRefresh();
    toast('🔄 Auto-refresh enabled');
  } else {
    stopAutoRefresh();
    toast('⏸️ Auto-refresh disabled');
  }

  updateRefreshButton();
}

function updateRefreshInterval() {
  const select = $('#refreshInterval');
  if (select) {
    autoRefreshInterval = parseInt(select.value);
    console.log(`Refresh interval updated to ${autoRefreshInterval/1000}s`);

    if (autoRefreshEnabled) {
      startAutoRefresh(); // Restart with new interval
      toast(`🔄 Interval set to ${autoRefreshInterval/1000}s`);
    }
  }
}

// ======== FORM HANDLERS ========
function generateTaskId() {
  const timestamp = Date.now().toString(36).substring(-4); // Last 4 chars of timestamp
  const randomStr = Math.random().toString(36).substring(2, 4); // 2 random chars
  return `T${timestamp}${randomStr}`.toUpperCase();
}

// ======== MAIN LOAD FUNCTION ========
async function loadAll() {
  $('#todayStr').textContent = new Date().toLocaleDateString('id-ID', { weekday:'long', day:'2-digit', month:'long' });

  // Load user profile data from localStorage
  loadUserProfile();

  // Show refresh indicator for manual refresh
  const indicator = $('#autoRefreshIndicator');
  if (indicator) indicator.classList.remove('hidden');


  try {
    const taskData = await fetchJSON(EP.tasks);

    // Handle various N8N response formats
    let tasksArray = [];
    if (taskData && Array.isArray(taskData.tasks)) {
      // Format: { tasks: [...] }
      tasksArray = taskData.tasks;
    } else if (Array.isArray(taskData)) {
      // Format: [...]
      tasksArray = taskData;
    } else if (taskData && typeof taskData === 'object') {
      // Handle object format - convert to array
      const tasksValues = Object.values(taskData);
      if (tasksValues.length > 0 && Array.isArray(tasksValues[0])) {
        // Format: { "key": [...] }
        tasksArray = tasksValues[0];
      } else {
        // Format: { "task1": {...}, "task2": {...} }
        tasksArray = Object.entries(taskData).map(([key, value]) => ({
          task_id: key,
          task_name: typeof value === 'string' ? value : (value.task_name || value.title || key),
          status: value.status || 'pending',
          due_date: value.due_date || new Date().toISOString().split('T')[0],
          category: value.category || 'Other',
          reasoning: value.reasoning || value.description || '',
          priority_score: value.priority_score || 50
        }));
      }
    }

    if (!tasksArray || !Array.isArray(tasksArray)) {
      tasksArray = [
        {
          task_id: "T001",
          task_name: "Send 3 proposals to Upwork clients",
          due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          category: "Priority",
          reasoning: "High urgency, direct impact on income",
          status: "pending",
          priority_score: 95
        },
        {
          task_id: "T002",
          task_name: "Complete project documentation",
          due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          category: "Other",
          reasoning: "Important for project handover",
          status: "pending",
          priority_score: 70
        }
      ];
    }

    ALL_TASKS = tasksArray;
    lastDataHash = generateDataHash(ALL_TASKS);

    renderPriority(ALL_TASKS);
    renderReminder(ALL_TASKS);
    renderCharts(ALL_TASKS);
    renderCompleted(ALL_TASKS);
    renderOverdue(ALL_TASKS);

    updateLastRefreshTime();

  } catch (e) {
    console.error('Failed to load tasks:', e);
    toast('Failed to load tasks: ' + e.message);
  }

  try {
    // Fetch goals from server (which handles N8N webhook and transformation)
    const goalsResponse = await fetch(EP.goals, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    if (!goalsResponse.ok) {
      throw new Error(`Goals server error: ${goalsResponse.status}`);
    }

    const goalsData = await goalsResponse.json();

    // Server already returns data in the correct format: { goals: [...] }
    if (!goalsData || !goalsData.goals || !Array.isArray(goalsData.goals)) {
      renderGoals([]);
      return;
    }

    renderGoals(goalsData.goals);
    if (goalsData.pekerjaan) {
      userPekerjaan = goalsData.pekerjaan;
    }
    if (goalsData.status) {
      userStatus = goalsData.status;
    }
  } catch (e) {
    console.error('Failed to load goals:', e);
    toast('Failed to load goals: ' + e.message);
  }

  try {
    // Fetch profile data from server (which handles N8N webhook and transformation)
    const profileResponse = await fetch(EP.profile, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    if (!profileResponse.ok) {
      throw new Error(`Profile server error: ${profileResponse.status}`);
    }

    const profileData = await profileResponse.json();

    // Server returns data in the format: { tasks: [{ category, ... }] }
    if (profileData && profileData.tasks && Array.isArray(profileData.tasks) && profileData.tasks.length > 0) {
      const profileInfo = profileData.tasks[0]; // Take first item
      if (userPekerjaan) profileInfo.category = userPekerjaan;
      // Don't override mental_problem with status from goals - they serve different purposes

      // Update localStorage with server data
      const userProfileData = {
        job: profileInfo.category || 'Default',
        status: profileInfo.mental_problem || 'None',
        motivational_quote: profileInfo.motivational_quote,
        mental_problem: profileInfo.mental_problem,
        mental_solution: profileInfo.mental_solution
      };
      localStorage.setItem('userProfile', JSON.stringify(userProfileData));


      // Render with server data
      renderProfile(profileData, userPekerjaan, userStatus); // Pass the full N8N data format
    } else {
      console.log('🔍 FRONTEND: No profile data from server, using localStorage');
      // Fall back to localStorage data (already loaded by loadUserProfile())
    }
  } catch (e) {
    console.error('Failed to load profile from server:', e);
    // Profile will use localStorage data (already loaded by loadUserProfile())
  } finally {
    // Hide refresh indicator
    if (indicator) indicator.classList.add('hidden');
  }
}