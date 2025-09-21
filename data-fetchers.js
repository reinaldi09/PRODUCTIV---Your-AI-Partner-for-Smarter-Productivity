// ======== DATA FETCHERS ========
async function fetchJSON(url, opts={}) {
  const defaultOpts = {
    mode: 'cors',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  };

  const finalOpts = {
    ...defaultOpts,
    ...opts,
    headers: {
      ...defaultOpts.headers,
      ...(opts.headers || {})
    }
  };

  try {
    const res = await fetch(url, finalOpts);

    if (!res.ok) {
      console.error(`HTTP error! Status: ${res.status} ${res.statusText}`);
      return getEmptyData(url);
    }

    const text = await res.text();

    // Handle empty responses
    if (!text.trim()) {
      return getEmptyData(url);
    }

    try {
      const data = JSON.parse(text);
      return data;
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return getEmptyData(url);
    }

  } catch (error) {
    console.error('Fetch error:', error);
    return getEmptyData(url);
  }
}

// Return empty data structures when webhooks fail
function getEmptyData(url) {
  if (url.includes('/tasks')) {
    return { tasks: [] };
  } else if (url.includes('/goals')) {
    return { goals: [] };
  }
  return {};
}