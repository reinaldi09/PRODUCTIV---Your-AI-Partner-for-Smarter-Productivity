// ======== UTILS ========
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const fmt = (d) => new Date(d).toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' });
const todayISO = () => new Date().toISOString().slice(0,10);

// Enhanced flexible date parsing function
function parseDate(dateStr) {
  if (!dateStr || dateStr === 'Hari Ini') {
    return new Date();
  }

  try {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return new Date(dateStr + 'T00:00:00');
    }

    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
      const parts = dateStr.split('/');
      const month = parseInt(parts[0]);
      const day = parseInt(parts[1]);
      const year = parseInt(parts[2]);

      if (month < 1 || month > 12 || day < 1 || day > 31) {
        return new Date('Invalid Date');
      }

      return new Date(`${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}T00:00:00`);
    }

    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
      const parts = dateStr.split('/');
      const first = parseInt(parts[0]);
      const second = parseInt(parts[1]);
      const year = parseInt(parts[2]);

      if (first > 12 && second <= 12) {
        return new Date(`${year}-${second.toString().padStart(2, '0')}-${first.toString().padStart(2, '0')}T00:00:00`);
      }

      if (first <= 12 && second <= 12) {
        return new Date(`${year}-${first.toString().padStart(2, '0')}-${second.toString().padStart(2, '0')}T00:00:00`);
      }
    }

    return new Date(dateStr);
  } catch (error) {
    console.error('Date parsing error:', error);
    return new Date('Invalid Date');
  }
}

function toast(msg, ms=2200) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.remove('opacity-0');
  el.classList.add('opacity-100');
  setTimeout(() => {
    el.classList.remove('opacity-100');
    el.classList.add('opacity-0');
  }, ms);
}

// Load and display user profile data
function loadUserProfile() {
  const savedProfile = localStorage.getItem('userProfile');
  if (savedProfile) {
    try {
      const userProfile = JSON.parse(savedProfile);
      renderProfile(userProfile);
    } catch (e) {
      console.error('Error parsing saved profile:', e);
    }
  }
}