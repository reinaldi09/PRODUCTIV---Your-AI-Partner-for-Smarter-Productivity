# AI Productivity Dashboard - Full-Stack Version

A complete full-stack productivity dashboard with user authentication, modular frontend architecture, and comprehensive task management. Features Supabase authentication, Node.js/Express backend, and N8N workflow integration.

-Video Demo-

https://github.com/user-attachments/assets/cae8d149-b584-428f-aef6-ff885295cf26

## File Structure

```
AI_PRODUCTIVITY_TOOLS_DEPLOYMENT/
├── server.js           # Node.js/Express server with authentication
├── .env               # Environment variables (Supabase credentials)
├── package.json       # Node.js dependencies
├── package-lock.json  # Lock file for dependencies
├── index.html         # Main dashboard HTML file
├── login.html         # Login page
├── signup.html        # Signup page
├── signup_success.html # Signup success page
├── error.html         # Error page
├── private.html       # Protected page (legacy)
├── config.js          # Configuration and API endpoints
├── utils.js           # Utility functions (date parsing, DOM helpers, etc.)
├── data-fetchers.js   # Data fetching functions with fallback handling
├── renderers.js       # All rendering functions for different sections
├── main.js            # Main application logic and state management
├── handlers.js        # Event handlers and form submissions
└── README.md          # This documentation
```

## Back End - N8N

Currently back end of this application is using N8N, here is the workflow.

<img width="936" height="715" alt="Productivity_Back End" src="https://github.com/user-attachments/assets/1493b6be-c592-496f-8572-abfad77946f6" />

## Features

### 🔐 **Authentication System**
- Supabase authentication integration
- Secure login/signup/logout functionality
- Session management with httpOnly cookies
- Protected routes and authentication middleware
- Automatic redirect to login for unauthorized access

### 🏗️ **Full-Stack Architecture**
- Node.js/Express backend server
- Modular frontend with separated concerns
- RESTful API endpoints
- CORS configuration for cross-origin requests
- Static file serving with security controls

### 📋 **Advanced Task Management**
- Unique task ID generation (format: T{timestamp}{random})
- AI-generated task suggestions with automatic IDs
- Manual task creation with ID assignment
- Task completion tracking with timestamps
- Status updates and progress monitoring

### ✅ **Modular Frontend Architecture**
- Separated concerns into logical modules
- Clean HTML without inline JavaScript
- Event-driven architecture
- State management and data flow

### 👤 **User Profile Management**
- Manual job/profession input
- Manual personal status input
- Local storage persistence
- Edit modal with form validation
- Profile data synchronization with N8N

### 🤖 **N8N Workflow Integration**
- Direct webhook integration for all operations
- Flexible data format handling (arrays, objects, nested structures)
- Fallback data when webhooks are unavailable
- Comprehensive error handling and logging
- Real-time data synchronization

### 📊 **Dashboard Sections**
- Main Goals with progress tracking
- Priority Tasks (top 3 with scoring)
- Overdue Tasks with extension options
- Reminder Tasks with due date alerts
- Progress Charts and visualizations
- Recent Completed Tasks history

### ⚡ **Interactive Features**
- Auto-refresh with configurable intervals
- Manual refresh capability
- Task completion with smooth animations
- Goal editing and progress updates
- AI-powered task generation
- Feedback submission system
- Data export and synchronization

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Supabase account and project
- N8N instance (optional, for workflow integration)

### 1. Install Dependencies
```bash
cd AI_PRODUCTIVITY_TOOLS_DEPLOYMENT
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory:
```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
```

### 3. Start the Server
```bash
cd AI_PRODUCTIVITY_TOOLS_DEPLOYMENT
node server.js
```

### 4. Access the Application
- Open your browser and go to: `http://localhost:3000`
- You'll be redirected to the login page
- Create an account or sign in to access the dashboard

## How to Use

### For Users
1. **Sign Up/Login**: Create an account or sign in with existing credentials
2. **Access Dashboard**: After authentication, you'll be redirected to the main dashboard
3. **Manage Tasks**: Add manual tasks or generate AI-powered task suggestions
4. **Track Progress**: Monitor goals, tasks, and productivity metrics
5. **Update Profile**: Edit your job/profession and personal status
6. **Submit Feedback**: Provide feedback to improve the system

### For Developers
1. **Modify Frontend**: Edit the modular JavaScript files (`config.js`, `utils.js`, etc.)
2. **Update Backend**: Modify `server.js` for new API endpoints or authentication logic
3. **Customize UI**: Update `index.html` and inline Tailwind CSS styles
4. **Test Changes**: Restart the server and refresh your browser

## N8N Webhook Configuration

The dashboard integrates with N8N workflows using these webhook endpoints:

- `https://n8n-local.gragih.my.id/webhook/tasks` - Task data retrieval
- `https://n8n-local.gragih.my.id/webhook/goals` - Goals data retrieval
- `https://n8n-local.gragih.my.id/webhook/profile` - Profile data retrieval
- `https://n8n-local.gragih.my.id/webhook/add-task` - Add new tasks (manual & AI-generated)
- `https://n8n-local.gragih.my.id/webhook/feedback` - Send user feedback
- `https://n8n-local.gragih.my.id/webhook/task-done` - Update task completion status
- `https://n8n-local.gragih.my.id/webhook/update-profile` - Update user profile data

### Webhook Payloads

#### Add Task Payload
```json
{
  "task_name": "Complete project proposal",
  "due_date": "2025-09-25",
  "category": "Work",
  "reasoning": "High priority client project",
  "task_id": "T123ABC",
  "source": 1,
  "timestamp": "2025-09-21T05:58:26.690Z"
}
```

#### AI Task Generation Payload
```json
{
  "rawInput": "I need to finish my quarterly report",
  "source": 2,
  "task_id": "T456DEF",
  "timestamp": "2025-09-21T05:58:26.690Z"
}
```

#### Task Completion Payload
```json
{
  "task_id": "T123ABC",
  "status": "completed",
  "due_date": "2025-09-25",
  "completed_date": "2025-09-21",
  "timestamp": "2025-09-21T05:58:26.690Z"
}
```

## Data Formats

### Task ID Generation
Tasks are assigned unique IDs using the format: `T{timestamp}{random}`
- `timestamp`: Last 4 characters of current timestamp in base36
- `random`: 2 random characters in base36
- Example: `T1A2B3C4` (where `1A2B` is timestamp, `3C4` is random)

### Tasks Data
```json
{
  "tasks": [
    {
      "task_id": "T1A2B3C4",
      "task_name": "Send 3 proposals to Upwork clients",
      "due_date": "2025-09-15",
      "category": "Priority",
      "reasoning": "High urgency, direct impact on income",
      "status": "pending",
      "priority_score": 95,
      "completed_date": null
    }
  ]
}
```

### Goals Data
```json
{
  "goals": [
    {
      "id": "goal_001",
      "title": "Menambah pendapatan bulanan sebesar 5 juta dalam 6 bulan",
      "description": "Target peningkatan pendapatan melalui berbagai strategi bisnis",
      "status": "in_progress",
      "progress": 35,
      "target_date": "2026-03-10",
      "category": "Financial"
    }
  ]
}
```

## Authentication System

The application uses Supabase for user authentication with the following features:

- **Secure Sessions**: HttpOnly cookies with proper security flags
- **Route Protection**: Automatic redirects for unauthorized access
- **Session Validation**: Server-side token verification
- **Logout Functionality**: Secure session cleanup

### User Profile

The user profile (job and status) is stored locally in the browser and synchronized with N8N workflows. Profile data can be manually edited through the profile modal and includes:

- Job/Profession information
- Personal status updates
- Local storage persistence
- Server-side synchronization

## Customization

### Adding New Features
1. **Frontend**: Add new functions to the appropriate module (`handlers.js`, `renderers.js`, etc.)
2. **Backend**: Add new routes and logic to `server.js`
3. **Authentication**: Update authentication middleware if needed
4. **UI**: Modify `index.html` and update event handlers

### Modifying API Endpoints
- **Frontend**: Edit `config.js` to change webhook URLs
- **Backend**: Add new routes in `server.js` with proper authentication

### Environment Configuration
Update `.env` file for:
- Supabase credentials
- N8N webhook URLs
- Server configuration

### Styling
The dashboard uses Tailwind CSS. Modify inline styles in HTML files or add custom CSS.

## Browser Compatibility

- Modern browsers with ES6+ support
- Local storage for profile persistence
- Fetch API for data requests
- Chart.js for visualizations

## Development

### Code Organization
- **Frontend**: Modular JavaScript in separate files for maintainability
- **Backend**: Express.js server with authentication and API endpoints
- **Configuration**: Environment variables for sensitive data
- **Styling**: Tailwind CSS with inline styles for rapid development

### Making Changes
1. **Frontend**: Edit module files (`handlers.js`, `renderers.js`, `main.js`, etc.)
2. **Backend**: Modify `server.js` for new routes or authentication logic
3. **Configuration**: Update `config.js` for API endpoints, `.env` for credentials
4. **Testing**: Restart server, refresh browser, check console logs

### Adding New Features
1. Plan the feature and identify required components
2. Update frontend modules and HTML as needed
3. Add backend API endpoints if required
4. Test authentication and authorization
5. Update documentation

## Security Considerations

- **Environment Variables**: Never commit `.env` files to version control
- **Authentication**: Supabase handles secure authentication and session management
- **CORS**: Properly configured for development and production
- **Cookies**: HttpOnly cookies prevent XSS attacks
- **Input Validation**: Server-side validation for all user inputs
- **HTTPS**: Use HTTPS in production environments

## API Reference

### Authentication Endpoints
- `POST /signup` - User registration
- `POST /login` - User authentication
- `GET /logout` - Session termination
- `GET /private` - Protected dashboard access
- `GET /auth-status` - Check authentication status

### Data Endpoints
- `GET /webhook/tasks` - Retrieve tasks
- `GET /webhook/goals` - Retrieve goals
- `GET /webhook/profile` - Retrieve profile
- `POST /webhook/add-task` - Create new task
- `POST /webhook/feedback` - Submit feedback
- `POST /webhook/task-done` - Update task status
- `POST /update-profile` - Update user profile

## Troubleshooting

### Authentication Issues

#### Login Not Working
- Verify Supabase credentials in `.env` file
- Check browser console for authentication errors
- Ensure Supabase project is properly configured
- Try clearing browser cookies and cache

#### Direct Access Bypass
- If users can access dashboard without login, check server middleware order
- Verify that static middleware comes after authentication routes
- Check browser developer tools for redirect behavior

#### Session Not Persisting
- Verify cookie settings in `server.js`
- Check for httpOnly and secure flags
- Ensure CORS credentials are enabled

### Server Issues

#### Port 3000 Already in Use
```bash
# Find process using port 3000
netstat -ano | findstr :3000

# Kill the process (replace XXXX with actual PID)
taskkill /PID XXXX /F
```

#### Server Won't Start
- Check Node.js version (requires v14+)
- Verify all dependencies are installed: `npm install`
- Check `.env` file exists with required variables
- Look for error messages in console

#### Static Files Not Loading
- Verify middleware order in `server.js`
- Check file paths and permissions
- Ensure static middleware is properly configured

### Data & Integration Issues

#### CORS Errors with N8N
- Configure CORS headers in N8N webhook settings
- Verify webhook URLs in `config.js` and `server.js`
- Check network connectivity to N8N instance

#### Data Not Loading
- Check N8N webhook URLs (currently: `https://n8n-local.gragih.my.id`)
- Verify webhook is running and accessible
- Check browser console for network errors
- Fallback data will be used if webhooks fail

#### Task IDs Not Generating
- Check `generateTaskId()` function in `server.js`
- Verify task form includes hidden `task_id` field
- Check browser console for ID generation errors

### Profile Issues

#### Profile Not Saving
- Check browser's local storage permissions
- Verify profile form submission
- Check browser console for localStorage errors
- Ensure N8N webhook for profile updates is accessible

#### Profile Data Not Syncing
- Verify `update-profile` webhook endpoint
- Check server logs for profile update requests
- Ensure proper data format in profile payloads

## License


This project is for personal productivity management and educational purposes.

