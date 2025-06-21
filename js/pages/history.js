import * as store from '../store.js';
import * as ui from '../ui.js';

export function initHistoryPage() {
    const historyContainer = document.getElementById('history-container');
    if (!historyContainer) return;

    ui.initAutocomplete('#edit-match-form .hero-input');

    const opponentFilter = document.getElementById('history-opponent-filter');
    const typeFilter = document.getElementById('history-type-filter');
    const exportBtn = document.getElementById('export-data-btn');
    const importInput = document.getElementById('import-file-input');
    const editModal = document.getElementById('edit-match-modal');
    const editModalCloseBtn = document.getElementById('edit-modal-close-btn');
    const editForm = document.getElementById('edit-match-form');

    const populateHistoryFilters = () => {
        const opponentNames = [...new Set(store.getMatches().map(m => m.opponent_team).filter(Boolean))].sort();
        const currentVal = opponentFilter.value;
        opponentFilter.innerHTML = '<option value="all">Все команды</option>';
        opponentNames.forEach(name => opponentFilter.add(new Option(name, name)));
        if (opponentFilter.querySelector(`option[value="${currentVal}"]`)) {
            opponentFilter.value = currentVal;
        }
    };

    const renderHistory = () => {
        let matches = store.getMatches();
        if (opponentFilter.value !== 'all') matches = matches.filter(m => m.opponent_team === opponentFilter.value);
        if (typeFilter.value !== 'all') matches = matches.filter(m => m.match_type === typeFilter.value);
        matches.sort((a, b) => new Date(b.date) - new Date(a.date));

        historyContainer.innerHTML = '';
        if (matches.length === 0) {
            historyContainer.innerHTML = '<div class="card empty-state"><p>Нет матчей по выбранным фильтрам.</p></div>';
            return;
        }

        const draftToHtml = (draft, isPick) => draft.map(item => {
            const hero = store.getH(item);
            const phase = typeof item === 'object' ? `<span class="text-muted">(${item.phase})</span>` : '';
            const roleTag = isPick && item.role ? `<span class="hero-role-tag role-${item.role.toLowerCase()}">${item.role}</span>` : '';
            return `<li><img src="${ui.getHeroIconUrl(hero)}" class="hero-icon" alt=""> ${hero} ${phase} ${roleTag}</li>`;
        }).join('');

        matches.forEach(match => {
            const card = document.createElement('div');
            card.className = 'card match-card';
            const date = new Date(match.date).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            const ourSide = match.our_team_side;
            const oppSide = ourSide === 'blue' ? 'red' : 'blue';
            const ourColumnHtml = `<div class="draft-column"><h2>Наша команда <span class="team-side-badge team-side-${ourSide}">${ourSide}</span></h2><div class="draft-list"><h3>Баны</h3><ul>${draftToHtml(match.bans.our_team, false)}</ul><h3>Пики</h3><ul>${draftToHtml(match.picks.our_team, true)}</ul></div></div>`;
            const oppColumnHtml = `<div class="draft-column"><h2>Соперник <span class="team-side-badge team-side-${oppSide}">${oppSide}</span></h2><div class="draft-list"><h3>Баны</h3><ul>${draftToHtml(match.bans.opponent_team, false)}</ul><h3>Пики</h3><ul>${draftToHtml(match.picks.opponent_team, true)}</ul></div></div>`;
            const notesHtml = match.notes ? `<div class="match-notes"><h4>Заметки:</h4><p>${match.notes.replace(/\n/g, '<br>')}</p></div>` : '';
            card.innerHTML = `<div class="card-header"><div class="opponent">vs ${match.opponent_team}</div><div class="result ${match.result === 'win' ? 'result-win' : 'result-loss'}">${match.result === 'win' ? 'Победа' : 'Поражение'}</div><button class="btn btn-icon edit-match-btn" data-match-id="${match.id}" title="Редактировать матч">✏️</button></div><div class="card-body">${ourSide === 'blue' ? ourColumnHtml + oppColumnHtml : oppColumnHtml + ourColumnHtml}</div>${notesHtml}<div class="meta" style="margin-top: 16px; border-top: 1px solid var(--border-light); padding-top: 16px;">${match.patch ? `Патч: ${match.patch} • ` : ''} ${match.match_type === 'tournament' ? '🏆 Турнир' : '⚔️ Скрим'} • ${date}</div>`;
            historyContainer.appendChild(card);
        });
    };

    const openEditModal = (matchId) => {
        const matches = store.getMatches();
        const match = matches.find(m => m.id == matchId);
        if (!match) {
            ui.showToast('Матч не найден!', 'error');
            return;
        }

        document.getElementById('edit-match-id').value = match.id;
        const oppSelect = document.getElementById('edit-opponent-team-select');
        oppSelect.innerHTML = '';
        const opponentNames = [...new Set(store.getMatches().map(m => m.opponent_team).filter(Boolean))].sort();
        opponentNames.forEach(name => oppSelect.add(new Option(name, name)));
        oppSelect.value = match.opponent_team;

        const patchSelect = document.getElementById('edit-match_patch');
        patchSelect.innerHTML = '';
        store.getPatches().forEach(p => patchSelect.add(new Option(p, p)));
        patchSelect.value = match.patch || "";

        document.getElementById('edit-match_type').value = match.match_type;
        document.querySelector(`input[name="edit_our_team_side"][value="${match.our_team_side}"]`).checked = true;
        document.querySelector(`input[name="edit_result"][value="${match.result}"]`).checked = true;
        document.getElementById('edit-match-notes').value = match.notes;

        const populateDraftSide = (side, draftData) => {
            const banInputs = document.querySelectorAll(`.edit-${side}-ban`);
            banInputs.forEach(i => i.value = '');
            draftData.bans.forEach((ban, i) => { if (banInputs[i]) banInputs[i].value = store.getH(ban); });

            const pickInputs = document.querySelectorAll(`.edit-${side}-pick`);
            pickInputs.forEach(i => i.value = '');
            const roleSelects = document.querySelectorAll(`.edit-${side}-pick-role`);
            roleSelects.forEach(s => s.value = '');
            draftData.picks.forEach((pick, i) => {
                if (pickInputs[i]) {
                    pickInputs[i].value = store.getH(pick);
                    roleSelects[i].value = pick.role || "";
                }
            });
        };

        populateDraftSide('blue', { bans: [], picks: [] });
        populateDraftSide('red', { bans: [], picks: [] });
        const ourSide = match.our_team_side;
        const oppSide = ourSide === 'blue' ? 'red' : 'blue';
        populateDraftSide(ourSide, { bans: match.bans.our_team, picks: match.picks.our_team });
        populateDraftSide(oppSide, { bans: match.bans.opponent_team, picks: match.picks.opponent_team });

        editModal.style.display = 'flex';
    };

    historyContainer.addEventListener('click', e => {
        if (e.target.closest('.edit-match-btn')) {
            const matchId = e.target.closest('.edit-match-btn').dataset.matchId;
            openEditModal(matchId);
        }
    });

    editModalCloseBtn.addEventListener('click', () => editModal.style.display = 'none');
    editModal.addEventListener('click', e => { if (e.target === editModal) editModal.style.display = 'none' });

    editForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const matchId = document.getElementById('edit-match-id').value;
        let matches = store.getMatches();
        const matchIndex = matches.findIndex(m => m.id == matchId);
        if (matchIndex === -1) {
            ui.showToast('Ошибка: матч не найден', 'error');
            return;
        }

        const sideInput = document.querySelector('input[name="edit_our_team_side"]:checked');
        if (!sideInput) {
            ui.showToast('Выберите сторону вашей команды.', 'error');
            return;
        }
        const ourSide = sideInput.value;

        const getPickData = (side) => Array.from(document.querySelectorAll(`.edit-${side}-pick`)).map((heroInput, i) => ({ hero: heroInput.value, role: document.querySelectorAll(`.edit-${side}-pick-role`)[i].value || null, phase: `P${i + 1}` })).filter(p => p.hero);
        const getBanData = (side) => Array.from(document.querySelectorAll(`.edit-${side}-ban`)).map((input, i) => ({ hero: input.value, phase: `B${i + 1}` })).filter(item => item.hero);

        const editedMatch = {
            ...matches[matchIndex],
            opponent_team: document.getElementById('edit-opponent-team-select').value,
            match_type: document.getElementById('edit-match_type').value,
            patch: document.getElementById('edit-match_patch').value,
            our_team_side: ourSide,
            result: document.querySelector('input[name="edit_result"]:checked').value,
            notes: document.getElementById('edit-match-notes').value.trim(),
            bans: { our_team: getBanData(ourSide), opponent_team: getBanData(ourSide === 'blue' ? 'red' : 'blue') },
            picks: { our_team: getPickData(ourSide), opponent_team: getPickData(ourSide === 'blue' ? 'red' : 'blue') }
        };

        matches[matchIndex] = editedMatch;
        store.setData('mlbb_matches', matches);
        ui.showToast('Матч успешно обновлен!', 'success');
        editModal.style.display = 'none';
        renderHistory();
    });
    
    opponentFilter.addEventListener('change', renderHistory);
    typeFilter.addEventListener('change', renderHistory);

    exportBtn.addEventListener('click', () => {
        const dataToExport = {
            matches: store.getMatches(),
            team_info: store.getTeamInfo(),
            patches: store.getPatches()
        };
        const dataStr = JSON.stringify(dataToExport, null, 2);
        if (dataToExport.matches.length === 0) {
            ui.showToast('Нет данных для экспорта.', 'error');
            return;
        }
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mlbb-stats-backup-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    importInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const imported = JSON.parse(e.target.result);
                ui.showConfirm('Импорт перезапишет ВСЕ текущие данные. Продолжить?', () => {
                    if (Array.isArray(imported)) { // Legacy import
                        store.setData('mlbb_matches', imported);
                        store.setData('mlbb_team_info', { name: 'Моя Команда', roster: [] });
                        const patches = [...new Set(imported.map(m => m.patch).filter(Boolean))];
                        store.setData('mlbb_patches', patches.length > 0 ? patches : ['1.8.86']);
                    } else { // New format import
                        store.setData('mlbb_matches', imported.matches || []);
                        store.setData('mlbb_team_info', imported.team_info || { name: 'Моя Команда', roster: [] });
                        store.setData('mlbb_patches', imported.patches || []);
                    }
                    ui.showToast('Данные успешно импортированы!', 'success');
                    setTimeout(() => location.reload(), 1000);
                });
            } catch (error) {
                ui.showToast('Ошибка импорта: ' + error, 'error');
            } finally {
                importInput.value = '';
            }
        };
        reader.readAsText(file);
    });

    populateHistoryFilters();
    renderHistory();
}