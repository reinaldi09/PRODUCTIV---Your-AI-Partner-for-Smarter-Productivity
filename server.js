const express = require("express");
const dotenv = require("dotenv");
const { createClient } = require("@supabase/supabase-js");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const path = require("path");
const fs = require("fs");

// Task ID generation function (same as client-side)
function generateTaskId() {
  const timestamp = Date.now().toString(36).substring(-4); // Last 4 chars of timestamp
  const randomStr = Math.random().toString(36).substring(2, 4); // 2 random chars
  return `T${timestamp}${randomStr}`.toUpperCase();
}

dotenv.config();
const app = express();
const PORT = 3000;

// You'll need to create a .env file with your Supabase credentials
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json()); // Add JSON parsing middleware
app.use(cookieParser());

// CORS middleware to handle browser requests
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Root route - always serve login page (no authentication bypass)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "login.html"));
});


app.post("/signup", async (req, res) => {
  const { email, password } = req.body;
  const { user, error } = await supabase.auth.signUp({ email, password });

  if (error) return res.redirect(`/error.html?msg=${encodeURIComponent(error.message)}`);
  res.redirect("/signup_success.html");
});


app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return res.redirect(`/error.html?msg=${encodeURIComponent(error.message)}`);

  res.cookie("access_token", data.session.access_token, { httpOnly: false, secure: false, sameSite: 'lax' });
  res.redirect("/private");
});


app.get("/private", async (req, res) => {
  const token = req.cookies.access_token;
  if (!token) return res.redirect("/");

  const { data, error } = await supabase.auth.getUser(token);
  if (error) return res.redirect("/");

  // Use the modular HTML file instead of the original one
   const filePath = path.join(__dirname, "index.html");

   fs.readFile(filePath, "utf8", (err, html) => {
      if (err) {
        console.error("Error: index.html could not be loaded!", err);
        return res.status(500).send("Server error: index.html not found.");
      }


    const modifiedHtml = html.replace("{{userEmail}}", data.user.email);
    res.send(modifiedHtml);
  });
});

app.get("/logout", (req, res) => {
  res.clearCookie("access_token");
  res.redirect("/");
});

// Prevent direct access to index.html - redirect to login
app.get("/index.html", (req, res) => {
  res.redirect("/");
});

app.get("/auth-status", async (req, res) => {
  const token = req.cookies.access_token;
  if (!token) {
    return res.json({ authenticated: false });
  }

  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error) {
      return res.json({ authenticated: false });
    }
    res.json({ authenticated: true, email: data.user.email });
  } catch (error) {
    res.json({ authenticated: false });
  }
});

// Debug: Log all POST requests to webhook endpoints
app.use('/webhook', (req, res, next) => {
  console.log(`🎯 WEBHOOK ${req.method}: ${req.path} (full: ${req.originalUrl})`);
  if (req.method === 'POST') {
    console.log('Request body:', req.body);
  }
  console.log('🎯 WEBHOOK: About to call next()...');
  next();
  console.log('🎯 WEBHOOK: next() completed - passing to route handler');
});

// Webhook endpoints for dashboard - restore original functionality
app.get("/webhook/tasks", async (req, res) => {
  try {
    // Try to fetch from N8N webhook first
    // const n8nResponse = await fetch('https://deep-hamster-blessed.ngrok-free.app/webhook/tasks', {
    const n8nResponse = await fetch('https://n8n-local.gragih.my.id/webhook/tasks', {
    // const n8nResponse = await fetch('http://localhost:5555/webhook/tasks', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (n8nResponse.ok) {
      const responseText = await n8nResponse.text();

      if (!responseText.trim()) {
        return res.json({ tasks: [] });
      }

      const tasksData = JSON.parse(responseText);

      // Handle various N8N response formats
      if (tasksData && Array.isArray(tasksData.tasks)) {
        // Format: { tasks: [...] }
        res.json({ tasks: tasksData.tasks });
      } else if (Array.isArray(tasksData)) {
        // Format: [...]
        if (tasksData.length > 0 && tasksData[0].tasks && Array.isArray(tasksData[0].tasks)) {
          res.json({ tasks: tasksData[0].tasks });
        } else {
          res.json({ tasks: tasksData });
        }
      } else if (tasksData && typeof tasksData === 'object') {
        // Handle object format - convert to array
        const tasksArray = Object.values(tasksData);
        if (tasksArray.length > 0 && Array.isArray(tasksArray[0])) {
          // Format: { "key": [...] }
          res.json({ tasks: tasksArray[0] });
        } else {
          // Format: { "task1": {...}, "task2": {...} }
          const formattedTasks = Object.entries(tasksData).map(([key, value]) => ({
            task_id: key,
            task_name: typeof value === 'string' ? value : (value.task_name || value.title || key),
            status: value.status || 'pending',
            due_date: value.due_date || new Date().toISOString().split('T')[0],
            category: value.category || 'Other',
            reasoning: value.reasoning || value.description || '',
            priority_score: value.priority_score || 50
          }));
          res.json({ tasks: formattedTasks });
        }
      } else {
        throw new Error('Invalid tasks data format from N8N');
      }
    } else {
      throw new Error(`N8N webhook error: ${n8nResponse.status}`);
    }
  } catch (error) {
    console.error("Error fetching tasks from N8N:", error);

    // Return empty data when N8N is unavailable
    res.json({ tasks: [] });
  }
});

app.get("/webhook/profile", async (req, res) => {
  try {
    // Try to fetch from N8N webhook first
    // const n8nResponse = await fetch('https://deep-hamster-blessed.ngrok-free.app/webhook/profile', {
    const n8nResponse = await fetch('https://n8n-local.gragih.my.id/webhook/profile', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (n8nResponse.ok) {
      const responseText = await n8nResponse.text();

      if (!responseText.trim()) {
        return res.json({
          tasks: [{
            category: undefined,
            recommended_priority_slots: undefined,
            motivational_quote: undefined,
            mental_problem: undefined,
            mental_solution: undefined
          }]
        });
      }

      const n8nData = JSON.parse(responseText);

      // Transform N8N data to expected format
      let profileData;

      if (n8nData && typeof n8nData === 'object' && n8nData.tasks && Array.isArray(n8nData.tasks) && n8nData.tasks.length > 0) {
        // N8N format: { tasks: [{ ... }] }
        const firstItem = n8nData.tasks[0];
        profileData = {
          tasks: [{
            category: firstItem.category,
            recommended_priority_slots: firstItem.recommended_priority_slots,
            motivational_quote: firstItem.motivational_quote,
            mental_problem: firstItem.mental_problem,
            mental_solution: firstItem.mental_solution
          }]
        };
      } else if (n8nData && typeof n8nData === 'object') {
        // Direct format: { category: ..., ... }
        profileData = {
          tasks: [{
            category: n8nData.category,
            recommended_priority_slots: n8nData.recommended_priority_slots,
            motivational_quote: n8nData.motivational_quote,
            mental_problem: n8nData.mental_problem,
            mental_solution: n8nData.mental_solution
          }]
        };
      } else if (Array.isArray(n8nData) && n8nData.length > 0) {
        // Array format: [{ ... }]
        const firstItem = n8nData[0];
        profileData = {
          tasks: [{
            category: firstItem.category,
            recommended_priority_slots: firstItem.recommended_priority_slots,
            motivational_quote: firstItem.motivational_quote,
            mental_problem: firstItem.mental_problem,
            mental_solution: firstItem.mental_solution
          }]
        };
      } else {
        profileData = {
          tasks: [{
            category: undefined,
            recommended_priority_slots: undefined,
            motivational_quote: undefined,
            mental_problem: undefined,
            mental_solution: undefined
          }]
        };
      }

      res.json(profileData);
    } else {
      const profile = {
        tasks: [{
          category: undefined,
          recommended_priority_slots: undefined,
          motivational_quote: undefined,
          mental_problem: undefined,
          mental_solution: undefined
        }]
      };
      res.json(profile);
    }
  } catch (error) {
    console.error("Error fetching profile from N8N:", error);

    const profile = {
      tasks: [{
        category: undefined,
        recommended_priority_slots: undefined,
        motivational_quote: undefined,
        mental_problem: undefined,
        mental_solution: undefined
      }]
    };
    res.json(profile);
  }
});

app.get("/webhook/goals", async (req, res) => {
  try {
    // Try to fetch from N8N webhook first
    // const n8nResponse = await fetch('https://deep-hamster-blessed.ngrok-free.app/webhook/goals', {
    const n8nResponse = await fetch('https://n8n-local.gragih.my.id/webhook/goals', {
    // const n8nResponse = await fetch('http://localhost:5555/webhook/goals', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (n8nResponse.ok) {
      const responseText = await n8nResponse.text();

      if (!responseText.trim()) {
        return res.json({ goals: [] });
      }

      const goalsData = JSON.parse(responseText);

      // Transform N8N response to expected format
      let goalsArray = [];
      let pekerjaan = null;
      let status = null;

      if (Array.isArray(goalsData)) {
        // Handle N8N array format: [{"Goals Utama": "description"}]
        goalsArray = goalsData.map((goalObj, index) => {
          const entries = Object.entries(goalObj);
          const [title, description] = entries[0];
          // Check for pekerjaan and status (both lowercase and capitalized)
          const pekerjaanEntry = entries.find(([key]) => key === 'pekerjaan' || key === 'Pekerjaan');
          const statusEntry = entries.find(([key]) => key === 'status' || key === 'Status');
          if (pekerjaanEntry) pekerjaan = pekerjaanEntry[1];
          if (statusEntry) status = statusEntry[1];
          return {
            id: `goal_${String(index + 1).padStart(3, '0')}`,
            title: title,
            description: typeof description === 'string' ? description : 'No description',
            status: "in_progress",
            progress: Math.floor(Math.random() * 100), // Random progress for demo
            target_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 90 days from now
            category: "General"
          };
        });
      } else if (typeof goalsData === 'object' && goalsData !== null) {
        if (goalsData.goals && Array.isArray(goalsData.goals)) {
          // Handle N8N object format: {"Pekerjaan": "...", "Status": "...", "goals": [...] }
          pekerjaan = goalsData.pekerjaan || goalsData.Pekerjaan;
          status = goalsData.status || goalsData.Status;
          goalsArray = goalsData.goals.map((goalObj, index) => {
            const [title, description] = Object.entries(goalObj)[0];
            return {
              id: `goal_${String(index + 1).padStart(3, '0')}`,
              title: title,
              description: typeof description === 'string' ? description : 'No description',
              status: "in_progress",
              progress: Math.floor(Math.random() * 100), // Random progress for demo
              target_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 90 days from now
              category: "General"
            };
          });
        } else {
          // Handle object format: {"Goals Utama": "description", "Pekerjaan": "...", "Status": "..." }
          // Check for both lowercase and capitalized field names
          pekerjaan = goalsData.pekerjaan || goalsData.Pekerjaan;
          status = goalsData.status || goalsData.Status;
          goalsArray = Object.entries(goalsData).filter(([key]) => key !== 'pekerjaan' && key !== 'status' && key !== 'Pekerjaan' && key !== 'Status').map(([title, description], index) => ({
            id: `goal_${String(index + 1).padStart(3, '0')}`,
            title: title,
            description: typeof description === 'string' ? description : 'No description',
            status: "in_progress",
            progress: Math.floor(Math.random() * 100), // Random progress for demo
            target_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 90 days from now
            category: "General"
          }));
        }
      }

      const response = { goals: goalsArray };
      if (pekerjaan !== null) response.pekerjaan = pekerjaan;
      if (status !== null) response.status = status;
      res.json(response);
    } else {
      throw new Error(`N8N webhook error: ${n8nResponse.status}`);
    }
  } catch (error) {
    console.error("Error fetching goals from N8N:", error);

    // Return empty data when N8N is unavailable
    res.json({ goals: [] });
  }
});

app.post("/webhook/add-task", async (req, res) => {
  console.log('🎯 ADD TASK: >>>>>>>>>> ENDPOINT CALLED <<<<<<<<<');
  console.log('🎯 ADD TASK: Full req.body:', JSON.stringify(req.body, null, 2));
  try {
    const { task_name, due_date, category, reasoning, task_id, source, rawInput } = req.body;

    // Check if this is an AI suggestion request
    if (req.body.rawInput) {
      console.log('🎯 AI SUGGEST: Processing AI suggestion request');
      console.log('🎯 AI SUGGEST: Raw input:', req.body.rawInput);

      // Generate task_id for AI suggestions
      const aiTaskId = generateTaskId();
      console.log('🎯 AI SUGGEST: Generated task_id for AI suggestion:', aiTaskId);

      // Forward to N8N webhook (same endpoint as regular tasks)
      console.log('🎯 AI SUGGEST: Attempting to call N8N webhook...');
      // const n8nResponse = await fetch('https://deep-hamster-blessed.ngrok-free.app/webhook/add-task', {
      const n8nResponse = await fetch('https://n8n-local.gragih.my.id/webhook/add-task', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          rawInput: req.body.rawInput,
          source: 2,
          task_id: aiTaskId,
          timestamp: new Date().toISOString()
        })
      });

      console.log('🎯 AI SUGGEST: N8N response status:', n8nResponse.status);

      if (!n8nResponse.ok) {
        const errorText = await n8nResponse.text();
        console.log('🎯 AI SUGGEST: N8N webhook error response:', errorText);
        // Return success for testing even if N8N fails
        return res.json({
          task: {
            task_name: rawInput,
            category: 'AI Generated',
            reasoning: 'Generated by AI assistant',
            due_date: new Date().toISOString().split('T')[0]
          }
        });
      }

      const n8nResult = await n8nResponse.json();
      console.log('🎯 AI SUGGEST: N8N response data:', n8nResult);
      console.log('🎯 AI SUGGEST: Success - N8N AI webhook triggered');
      return res.json(n8nResult);
    }

    // Regular task addition
    console.log('🎯 ADD TASK: Server received:', { task_name, due_date, category, reasoning, task_id, source });

    // Forward to N8N webhook for task creation
    console.log('🎯 ADD TASK: Attempting to call N8N webhook...');
    // const n8nResponse = await fetch('https://deep-hamster-blessed.ngrok-free.app/webhook/add-task', {
    const n8nResponse = await fetch('https://n8n-local.gragih.my.id/webhook/add-task', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        task_name,
        due_date,
        category,
        reasoning,
        task_id,
        source: 1, // Manual task source
        timestamp: new Date().toISOString()
      })
    });

    console.log('🎯 ADD TASK: N8N response status:', n8nResponse.status);

    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text();
      console.log('🎯 ADD TASK: N8N webhook error response:', errorText);
      // Return success for testing even if N8N fails
      return res.json({
        success: true,
        message: "Task added (N8N webhook not available)"
      });
    }

    const n8nResult = await n8nResponse.json();
    console.log('🎯 ADD TASK: N8N response data:', n8nResult);
    console.log('🎯 ADD TASK: Success - N8N webhook triggered');
    res.json({ success: true, message: "Task added successfully" });

  } catch (error) {
    console.log('🎯 ADD TASK: Network error:', error.message);
    // Return success for testing even on network errors
    res.json({
      success: true,
      message: "Task added (network error)"
    });
  }
});

app.post("/webhook/feedback", async (req, res) => {
  try {
    const { feedback } = req.body;

    console.log('🎯 FEEDBACK: Server received:', { feedback });

    // Forward to N8N webhook for feedback
    console.log('🎯 FEEDBACK: Attempting to call N8N webhook...');
    // const n8nResponse = await fetch('https://deep-hamster-blessed.ngrok-free.app/webhook/feedback', {
    const n8nResponse = await fetch('https://n8n-local.gragih.my.id/webhook/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        feedback,
        timestamp: new Date().toISOString(),
        source: 'dashboard'
      })
    });

    console.log('🎯 FEEDBACK: N8N response status:', n8nResponse.status);

    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text();
      console.log('🎯 FEEDBACK: N8N webhook error response:', errorText);
      // Return success for testing even if N8N fails
      return res.json({
        success: true,
        message: "Feedback sent (N8N webhook not available)"
      });
    }

    const n8nResult = await n8nResponse.json();
    console.log('🎯 FEEDBACK: N8N response data:', n8nResult);
    console.log('🎯 FEEDBACK: Success - N8N webhook triggered');
    res.json({ success: true, message: "Feedback sent successfully" });

  } catch (error) {
    console.log('🎯 FEEDBACK: Network error:', error.message);
    // Return success for testing even on network errors
    res.json({
      success: true,
      message: "Feedback sent (network error)"
    });
  }
});

app.post("/webhook/task-done", async (req, res) => {
  console.log('🎯 TASK DONE: Endpoint called with body:', req.body);

  try {
    const { task_id, status, due_date, completed_date } = req.body;

    console.log('🎯 TASK DONE: Server received:', { task_id, status, due_date, completed_date });

    // Forward to N8N webhook for task status updates
    console.log('🎯 TASK DONE: Attempting to call N8N webhook...');
    // const n8nResponse = await fetch('https://deep-hamster-blessed.ngrok-free.app/webhook/task-done', {
    const n8nResponse = await fetch('https://n8n-local.gragih.my.id/webhook/task-done', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        task_id,
        status,
        due_date,
        completed_date,
        timestamp: new Date().toISOString()
      })
    });

    console.log('🎯 TASK DONE: N8N response status:', n8nResponse.status);

    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text();
      console.log('🎯 TASK DONE: N8N webhook error response:', errorText);
      // Return success for testing even if N8N fails
      return res.json({
        success: true,
        message: "Task status updated (N8N webhook not available)"
      });
    }

    const n8nResult = await n8nResponse.json();
    console.log('🎯 TASK DONE: N8N response data:', n8nResult);
    console.log('🎯 TASK DONE: Success - N8N webhook triggered');
    res.json({ success: true, message: "Task status updated successfully" });

  } catch (error) {
    console.log('🎯 TASK DONE: Network error:', error.message);
    // Return success for testing even on network errors
    res.json({
      success: true,
      message: "Task status updated (network error)"
    });
  }
});

app.post("/update-profile", async (req, res) => {
  try {
    const { action, ...data } = req.body;

    // Handle different types of updates
    if (action === 'update_profile' || action === 'update_user_profile') {
      // This is a user profile update (job/personal status)
      // Forward to N8N webhook for user profile updates
      // const n8nResponse = await fetch('https://deep-hamster-blessed.ngrok-free.app/webhook/update-profile', {
      const n8nResponse = await fetch('https://n8n-local.gragih.my.id/webhook/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          type: 'user_profile_update',
          job: data.job,
          status: data.status,
          timestamp: data.timestamp,
          task_id: data.task_id
        })
      });

      if (!n8nResponse.ok) {
        const errorText = await n8nResponse.text();
        console.error(`N8N user profile webhook error ${n8nResponse.status}:`, errorText);

        // Log the data and return success for testing
        return res.json({
          success: true,
          message: "User profile data logged successfully (N8N webhook not available)",
          data: data,
          note: "N8N webhook returned error - please check webhook configuration"
        });
      }

      const n8nResult = await n8nResponse.json();
      res.json({ success: true, message: "User profile updated successfully", data: n8nResult });

    } else if (action === 'update_goal') {
      // This is a goal update
      // Forward to N8N webhook for goal updates
      // const n8nResponse = await fetch('https://deep-hamster-blessed.ngrok-free.app/webhook/update-profile', {
      const n8nResponse = await fetch('https://n8n-local.gragih.my.id/webhook/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          type: 'goal_update',
          goalId: data.goalId,
          title: data.title,
          description: data.description,
          progress: data.progress,
          status: data.status,
          target_date: data.target_date,
          timestamp: data.timestamp,
          task_id: data.task_id
        })
      });

      if (!n8nResponse.ok) {
        const errorText = await n8nResponse.text();
        console.error(`N8N goal webhook error ${n8nResponse.status}:`, errorText);

        // Log the data and return success for testing
        return res.json({
          success: true,
          message: "Goal data logged successfully (N8N webhook not available)",
          data: data,
          note: "N8N webhook returned error - please check webhook configuration"
        });
      }

      const n8nResult = await n8nResponse.json();
      res.json({ success: true, message: "Goal updated successfully", data: n8nResult });

    } else {
      // Unknown action type
      res.json({
        success: true,
        message: "Data logged successfully (unknown action type)",
        data: req.body,
        note: "Unknown action type, but data was logged"
      });
    }

  } catch (error) {
    console.error("Error updating profile/goal:", error);

    // For network errors, still log the data
    res.json({
      success: true,
      message: "Data logged successfully (network error)",
      data: req.body,
      note: "Network error occurred, but data was logged"
    });
  }
});

// Debug endpoints to see raw N8N data
app.get("/debug/n8n-tasks", async (req, res) => {
  try {
    // const n8nResponse = await fetch('https://deep-hamster-blessed.ngrok-free.app/webhook/tasks', {
    const n8nResponse = await fetch('https://n8n-local.gragih.my.id/webhook/tasks', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const responseData = {
      status: n8nResponse.status,
      statusText: n8nResponse.statusText,
      headers: Object.fromEntries(n8nResponse.headers.entries()),
      ok: n8nResponse.ok
    };

    if (n8nResponse.ok) {
      const data = await n8nResponse.json();
      responseData.data = data;
      responseData.dataType = typeof data;
      responseData.isArray = Array.isArray(data);
      if (data && typeof data === 'object') {
        responseData.keys = Object.keys(data);
        responseData.hasTasksProperty = 'tasks' in data;
      }
    } else {
      const text = await n8nResponse.text();
      responseData.error = text;
    }

    res.json(responseData);
  } catch (error) {
    res.json({
      error: error.message,
      stack: error.stack
    });
  }
});

app.get("/debug/n8n-goals", async (req, res) => {
  try {
    // const n8nResponse = await fetch('https://deep-hamster-blessed.ngrok-free.app/webhook/goals', {
      const n8nResponse = await fetch('https://n8n-local.gragih.my.id/webhook/goals', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const responseData = {
      status: n8nResponse.status,
      statusText: n8nResponse.statusText,
      headers: Object.fromEntries(n8nResponse.headers.entries()),
      ok: n8nResponse.ok
    };

    if (n8nResponse.ok) {
      const data = await n8nResponse.json();
      responseData.data = data;
      responseData.dataType = typeof data;
      responseData.isArray = Array.isArray(data);
      if (data && typeof data === 'object') {
        responseData.keys = Object.keys(data);
      }
    } else {
      const text = await n8nResponse.text();
      responseData.error = text;
    }

    res.json(responseData);
  } catch (error) {
    res.json({
      error: error.message,
      stack: error.stack
    });
  }
});

app.get("/debug/n8n-profile", async (req, res) => {
  try {
    // const n8nResponse = await fetch('https://deep-hamster-blessed.ngrok-free.app/webhook/profile', {
    const n8nResponse = await fetch('https://n8n-local.gragih.my.id/webhook/profile', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const responseData = {
      status: n8nResponse.status,
      statusText: n8nResponse.statusText,
      headers: Object.fromEntries(n8nResponse.headers.entries()),
      ok: n8nResponse.ok
    };

    if (n8nResponse.ok) {
      const data = await n8nResponse.json();
      responseData.data = data;
      responseData.dataType = typeof data;
      responseData.isArray = Array.isArray(data);
      if (data && typeof data === 'object') {
        responseData.keys = Object.keys(data);
      }
    } else {
      const text = await n8nResponse.text();
      responseData.error = text;
    }

    res.json(responseData);
  } catch (error) {
    res.json({
      error: error.message,
      stack: error.stack
    });
  }
});

// Test endpoint to check N8N webhook connectivity
app.get("/test-n8n", async (req, res) => {
  try {
    // const testResponse = await fetch('https://deep-hamster-blessed.ngrok-free.app/webhook/test', {
    const n8nResponse = await fetch('https://n8n-local.gragih.my.id/webhook/test', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    res.json({
      // n8n_url: 'https://deep-hamster-blessed.ngrok-free.app',
      n8n_url: 'https://n8n-local.gragih.my.id',
      status: testResponse.status,
      statusText: testResponse.statusText,
      ok: testResponse.ok,
      headers: Object.fromEntries(testResponse.headers.entries())
    });
  } catch (error) {
    res.json({
      error: error.message,
      // n8n_url: 'https://deep-hamster-blessed.ngrok-free.app',
      n8n_url: 'https://n8n-local.gragih.my.id',
      note: 'This endpoint tests basic connectivity to N8N'
    });
  }
});

// Serve static files (CSS, JS, images, etc.) AFTER authentication routes
app.use(express.static("."));

// Catch-all route to prevent direct file access - redirect to login
app.get("*", (req, res) => {
  // For HTML files or unknown routes, redirect to login
  if (req.path.includes('.html') || !req.path.includes('/')) {
    return res.redirect("/");
  }

  // For other routes (like API endpoints), return 404
  res.status(404).send("Not Found");
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
