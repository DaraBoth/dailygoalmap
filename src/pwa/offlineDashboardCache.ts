// Utility for offline dashboard data

const DASHBOARD_CACHE_KEY = 'offline_dashboard_goals';

export function saveDashboardGoals(goals) {
  try {
    localStorage.setItem(DASHBOARD_CACHE_KEY, JSON.stringify(goals));
  } catch (e) {
    console.warn('Failed to cache dashboard goals:', e);
  }
}

export function getDashboardGoals() {
  try {
    const raw = localStorage.getItem(DASHBOARD_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}
