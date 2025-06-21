import { initAddMatchPage } from './pages/addMatch.js';
import { initStatsPage } from './pages/stats.js';
import { initHistoryPage } from './pages/history.js';
import { initMatchupPage } from './pages/matchup.js';
import { initDashboardPage } from './pages/dashboard.js';
import { initPlannerPage } from './pages/planner.js';

// --- ГЛОБАЛЬНЫЙ КОД (ЗАПУСКАЕТСЯ НА ВСЕХ СТРАНИЦАХ) ---

document.addEventListener('DOMContentLoaded', () => {
    // 1. Инициализация темы
    const themeToggleBtn = document.getElementById('theme-toggle');
    const body = document.body;
    const toggleTheme = () => {
        body.classList.toggle('dark-mode');
        localStorage.setItem('theme', body.classList.contains('dark-mode') ? 'dark' : 'light');
    };
    if (localStorage.getItem('theme') === 'dark') {
        body.classList.add('dark-mode');
    }
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', toggleTheme);
    }

    // 2. Инициализация логики для текущей страницы
    initAddMatchPage();
    initStatsPage();
    initHistoryPage();
    initMatchupPage();
    initDashboardPage();
    initPlannerPage();
});