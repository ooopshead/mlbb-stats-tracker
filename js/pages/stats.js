import * as store from '../store.js';
import * as ui from '../ui.js';

export function initStatsPage() {
    const statsTable = document.getElementById('stats-table');
    if (!statsTable) return;

    const statsTbody = document.getElementById('stats-tbody');
    const filterBtns = document.querySelectorAll('.controls .btn[data-filter]');
    const sideFilterBtns = document.querySelectorAll('.controls .btn[data-side-filter]');
    const matchTypeFilterBtns = document.querySelectorAll('.controls .btn[data-type-filter]');
    const opponentFilterSelect = document.getElementById('opponent-filter');
    const patchFilterContainer = document.getElementById('patch-filter-container');
    const tableHeaders = document.querySelectorAll('#stats-table th.sortable');
    const modal = document.getElementById('synergy-modal');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const modalHeroName = document.getElementById('modal-hero-name');
    const roleStatsBody = document.getElementById('role-stats-body');
    const synergyTableBody = document.getElementById('synergy-table-body');
    const bestMatchupBody = document.getElementById('best-matchup-body');
    const worstMatchupBody = document.getElementById('worst-matchup-body');
    const draftTableBody = document.getElementById('draft-table-body');

    let currentFilter = 'overall',
        currentSideFilter = 'all',
        currentMatchTypeFilter = 'all';
    let sortKey = 'presence',
        sortDirection = 'desc';
    let currentlyFilteredMatches = [];

    const getFilteredMatches = () => {
        let matches = store.getMatches();
        if (currentMatchTypeFilter !== 'all') {
            matches = matches.filter(m => m.match_type === currentMatchTypeFilter);
        }
        const selectedPatchesValues = Array.from(patchFilterContainer.querySelectorAll('input:checked')).map(cb => cb.value);
        if (selectedPatchesValues.length === 0) return [];
        matches = matches.filter(m => {
            const matchPatch = m.patch || 'no_patch';
            return selectedPatchesValues.includes(matchPatch);
        });
        const selectedOpponent = opponentFilterSelect.value;
        if (selectedOpponent !== 'all') {
            matches = matches.filter(m => m.opponent_team === selectedOpponent);
        }
        return matches;
    };

    const renderTable = (stats) => {
        let statsArray = Object.entries(stats).map(([hero, data]) => {
            const totalGames = data.wins + data.losses;
            const winrate = totalGames > 0 ? ((data.wins / totalGames) * 100) : 0;
            const presence = data.picks + data.bans;
            return { hero, ...data, winrate, presence, totalGames };
        });

        statsArray.sort((a, b) => {
            let vA = a[sortKey], vB = b[sortKey];
            if (sortKey === 'hero') {
                vA = a.hero.toLowerCase();
                vB = b.hero.toLowerCase();
            }
            if (vA < vB) return sortDirection === 'asc' ? -1 : 1;
            if (vA > vB) return sortDirection === 'asc' ? 1 : -1;
            return b.totalGames - a.totalGames;
        });

        statsTbody.innerHTML = '';
        statsArray.forEach(data => {
            const row = document.createElement('tr');
            row.innerHTML = `<td class="hero-cell"><img src="${ui.getHeroIconUrl(data.hero)}" alt="${data.hero}" class="hero-icon"><span class="hero-name-clickable" data-hero="${data.hero}">${data.hero}</span></td><td>${data.presence}</td><td>${data.totalGames}</td><td>${data.wins}-${data.losses}</td><td>${data.winrate.toFixed(1)}%</td><td>${data.picks}</td><td>${data.bans}</td>`;
            statsTbody.appendChild(row);
        });

        tableHeaders.forEach(th => {
            th.classList.remove('sorted-asc', 'sorted-desc');
            if (th.dataset.sortKey === sortKey) {
                th.classList.add(sortDirection === 'asc' ? 'sorted-asc' : 'sorted-desc');
            }
        });
    };
    
    const calculateAndRenderStats = () => {
        if (patchFilterContainer.querySelectorAll('input:checked').length === 0) {
            ui.displayEmptyState(statsTbody, 'Выберите хотя бы один патч для анализа.');
            return;
        }
        ui.displayLoading(statsTbody);
        setTimeout(() => {
            currentlyFilteredMatches = getFilteredMatches();
            if (currentlyFilteredMatches.length === 0) {
                ui.displayEmptyState(statsTbody, 'Нет матчей, соответствующих выбранным фильтрам.');
                tableHeaders.forEach(th => th.classList.remove('sorted-asc', 'sorted-desc'));
                return;
            }
            const stats = {};
            const ensureHeroInStats = (hero) => {
                if (!stats[hero]) {
                    stats[hero] = { picks: 0, bans: 0, wins: 0, losses: 0 };
                }
            };
            currentlyFilteredMatches.forEach(match => {
                const processPicks = (picks, isOurTeam) => {
                    picks.forEach(p => {
                        const hero = store.getH(p);
                        if (!hero) return;
                        ensureHeroInStats(hero);
                        stats[hero].picks++;
                        if (isOurTeam) {
                            match.result === 'win' ? stats[hero].wins++ : stats[hero].losses++;
                        } else if (currentFilter !== 'our_team') {
                            match.result === 'loss' ? stats[hero].wins++ : stats[hero].losses++;
                        }
                    });
                };
                const processBans = (bans) => {
                    bans.forEach(b => {
                        const hero = store.getH(b);
                        if (!hero) return;
                        ensureHeroInStats(hero);
                        stats[hero].bans++;
                    });
                };
                const ourSide = match.our_team_side;
                const oppSide = ourSide === 'blue' ? 'red' : 'blue';
                if (currentFilter === 'our_team' || currentFilter === 'overall') {
                    if (currentSideFilter === 'all' || currentSideFilter === ourSide) {
                        processPicks(match.picks.our_team, true);
                        processBans(match.bans.our_team);
                    }
                }
                if (currentFilter === 'opponent_team' || currentFilter === 'overall') {
                    if (currentSideFilter === 'all' || currentSideFilter === oppSide) {
                        processPicks(match.picks.opponent_team, false);
                        processBans(match.bans.opponent_team);
                    }
                }
            });
            if (Object.keys(stats).length === 0) {
                ui.displayEmptyState(statsTbody, `В отфильтрованных матчах нет пиков или банов по фильтру "${currentFilter}".`);
                return;
            }
            renderTable(stats);
        }, 50);
    };

    const openSynergyModal = (heroName) => {
        modalHeroName.innerHTML = `<img src="${ui.getHeroIconUrl(heroName)}" class="hero-icon" alt=""> ${heroName}`;
        const roleStats = {}, synergy = {}, matchups = {}, draft = { blue: {}, red: {} };
        
        currentlyFilteredMatches.forEach(match => {
            const processRolePicks = (picks, isWin) => {
                picks.forEach(p => {
                    if (store.getH(p) === heroName && p.role) {
                        if (!roleStats[p.role]) roleStats[p.role] = { g: 0, w: 0 };
                        roleStats[p.role].g++;
                        if (isWin) roleStats[p.role].w++;
                    }
                });
            };
            processRolePicks(match.picks.our_team, match.result === 'win');
            processRolePicks(match.picks.opponent_team, match.result === 'loss');

            const ourPicks = match.picks.our_team.map(store.getH);
            const oppPicks = match.picks.opponent_team.map(store.getH);

            if (ourPicks.includes(heroName)) {
                const teamWon = match.result === 'win';
                ourPicks.forEach(t => { if(t !== heroName) { synergy[t] = synergy[t] || {g:0,w:0}; synergy[t].g++; if(teamWon) synergy[t].w++; } });
                oppPicks.forEach(o => { matchups[o] = matchups[o] || {g:0,w:0}; matchups[o].g++; if(teamWon) matchups[o].w++; });
            }
            if (oppPicks.includes(heroName)) {
                const teamWon = match.result === 'loss';
                oppPicks.forEach(t => { if(t !== heroName) { synergy[t] = synergy[t] || {g:0,w:0}; synergy[t].g++; if(teamWon) synergy[t].w++; } });
                ourPicks.forEach(o => { matchups[o] = matchups[o] || {g:0,w:0}; matchups[o].g++; if(teamWon) matchups[o].w++; });
            }

            const allDraft = [...match.picks.our_team, ...match.bans.our_team, ...match.picks.opponent_team, ...match.bans.opponent_team];
            const heroDraftItem = allDraft.find(item => typeof item === 'object' && store.getH(item) === heroName);
            if (heroDraftItem) {
                const heroSide = [...match.picks.our_team, ...match.bans.our_team].includes(heroDraftItem) ? match.our_team_side : (match.our_team_side === 'blue' ? 'red' : 'blue');
                draft[heroSide] = draft[heroSide] || {};
                draft[heroSide][heroDraftItem.phase] = (draft[heroSide][heroDraftItem.phase] || 0) + 1;
            }
        });

        const renderRoleStatsTable = () => {
            roleStatsBody.innerHTML = '';
            const sortedRoles = Object.entries(roleStats).map(([role, data]) => ({ role, ...data, wr: data.g > 0 ? (data.w / data.g * 100) : 0 })).sort((a, b) => b.g - a.g);
            if(sortedRoles.length === 0) { ui.displayEmptyState(roleStatsBody, 'Нет данных', 4); return; }
            sortedRoles.forEach(d => {
                const r = document.createElement('tr');
                const l = d.g - d.w;
                r.innerHTML = `<td><span class="hero-role-tag role-${d.role.toLowerCase()}">${d.role}</span></td><td>${d.g}</td><td>${d.w}-${l}</td><td>${d.wr.toFixed(1)}%</td>`;
                roleStatsBody.appendChild(r);
            });
        };

        const renderModalTable = (data, tbody, sortFn) => {
            const sorted = sortFn(data);
            tbody.innerHTML = '';
            sorted.forEach(d => {const r=document.createElement('tr'); const l = d.g - d.w; r.innerHTML=`<td><div class="hero-cell"><img src="${ui.getHeroIconUrl(d.h)}" class="hero-icon"> ${d.h}</div></td><td>${d.g}</td><td>${d.w}-${l}</td><td>${d.wr.toFixed(1)}%</td>`; tbody.appendChild(r);});
            if(sorted.length === 0) ui.displayEmptyState(tbody, 'Нет данных', 4);
        };

        const baseSort = (data) => Object.entries(data).map(([h, s]) => ({h, ...s, wr: s.g > 0 ? (s.w / s.g * 100) : 0}));
        renderRoleStatsTable();
        renderModalTable(synergy, synergyTableBody, d => baseSort(d).sort((a,b) => b.g - a.g || b.wr - a.wr).slice(0,10));
        renderModalTable(matchups, bestMatchupBody, d => baseSort(d).sort((a,b) => b.wr - a.wr || b.g - a.g).slice(0,5));
        renderModalTable(matchups, worstMatchupBody, d => baseSort(d).sort((a,b) => a.wr - b.wr || b.g - a.g).slice(0,5));

        const draftOrder = ['B1', 'B2', 'B3', 'B4', 'B5', 'P1', 'P2', 'P3', 'P4', 'P5'];
        draftTableBody.innerHTML = '';
        draftOrder.forEach(phase => {
            const blueCount = draft.blue?.[phase] || 0;
            const redCount = draft.red?.[phase] || 0;
            if (blueCount > 0 || redCount > 0) {
                const row = document.createElement('tr');
                row.innerHTML = `<td>${phase}</td><td>${blueCount}</td><td>${redCount}</td>`;
                draftTableBody.appendChild(row);
            }
        });
        if(draftTableBody.innerHTML === '') ui.displayEmptyState(draftTableBody, 'Нет данных', 3);
        
        modal.style.display = 'flex';
    };

    statsTbody.addEventListener('click', e => {
        if (e.target.closest('.hero-name-clickable')) {
            openSynergyModal(e.target.closest('.hero-name-clickable').dataset.hero);
        }
    });

    modalCloseBtn.addEventListener('click', () => modal.style.display = 'none');
    modal.addEventListener('click', e => {
        if (e.target === modal) modal.style.display = 'none';
    });

    const populateOpponentFilter = () => {
        const opponentNames = [...new Set(store.getMatches().map(m => m.opponent_team).filter(Boolean))].sort();
        const currentVal = opponentFilterSelect.value;
        opponentFilterSelect.innerHTML = '<option value="all">Все команды</option>';
        opponentNames.forEach(name => {
            opponentFilterSelect.add(new Option(name, name));
        });
        if (opponentFilterSelect.querySelector(`option[value="${currentVal}"]`)) {
            opponentFilterSelect.value = currentVal;
        }
    };

    const populatePatchFilter = () => {
        const patches = store.getPatches().sort().reverse();
        const dynamicPatchesContainer = patchFilterContainer;
        dynamicPatchesContainer.querySelectorAll('label:not(:first-child)').forEach(el => el.remove());
        patches.forEach(p => {
            const id = `patch-cb-${p.replace(/\./g, '-')}`;
            const label = document.createElement('label');
            label.htmlFor = id;
            label.innerHTML = `<input type="checkbox" id="${id}" value="${p}">${p}`;
            dynamicPatchesContainer.appendChild(label);
        });
        document.getElementById('patch-cb-none').checked = true;
        if (patches.length > 0) {
            const latestPatchId = `patch-cb-${patches[0].replace(/\./g, '-')}`;
            document.getElementById(latestPatchId).checked = true;
        }
        patchFilterContainer.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.addEventListener('change', calculateAndRenderStats));
    };

    const setupFilterButtons = (buttons, stateUpdater) => {
        buttons.forEach(btn => btn.addEventListener('click', () => {
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            stateUpdater(btn.dataset);
            calculateAndRenderStats();
        }));
    };

    setupFilterButtons(filterBtns, (data) => currentFilter = data.filter);
    setupFilterButtons(sideFilterBtns, (data) => currentSideFilter = data.sideFilter);
    setupFilterButtons(matchTypeFilterBtns, (data) => currentMatchTypeFilter = data.typeFilter);
    opponentFilterSelect.addEventListener('change', calculateAndRenderStats);

    tableHeaders.forEach(th => {
        th.addEventListener('click', () => {
            const newSortKey = th.dataset.sortKey;
            if (sortKey === newSortKey) {
                sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                sortKey = newSortKey;
                sortDirection = ['wins', 'presence', 'totalGames', 'winrate', 'picks', 'bans'].includes(newSortKey) ? 'desc' : 'asc';
            }
            calculateAndRenderStats();
        });
    });

    document.getElementById('clear-data-btn').addEventListener('click', () => {
        ui.showConfirm('Вы уверены, что хотите удалить ВСЕ матчи?', () => {
            store.setData('mlbb_matches', []);
            populateOpponentFilter();
            calculateAndRenderStats();
            ui.showToast('Все данные удалены.', 'success');
        });
    });

    populateOpponentFilter();
    populatePatchFilter();
    calculateAndRenderStats();
}