import * as store from '../store.js';
import * as ui from '../ui.js';

export function initAddMatchPage() {
    const matchForm = document.getElementById('match-form');
    if (!matchForm) return;

    ui.initAutocomplete('#match-form .hero-input');

    const opponentSelect = document.getElementById('opponent-team-select');
    const addNewOpponentBtn = document.getElementById('add-new-opponent-btn');
    const patchSelect = document.getElementById('match_patch');
    
    const populateOpponentSelect = () => {
        const opponentNames = [...new Set(store.getMatches().map(match => match.opponent_team).filter(Boolean))].sort();
        const lastOpponent = localStorage.getItem('last_opponent');
        opponentSelect.innerHTML = '<option value="" disabled selected>-- Выберите команду --</option>';
        opponentNames.forEach(name => {
            opponentSelect.add(new Option(name, name));
        });
        if (lastOpponent && opponentSelect.querySelector(`option[value="${lastOpponent}"]`)) {
            opponentSelect.value = lastOpponent;
        }
    };

    const populatePatchSelect = () => {
        const patches = store.getPatches().sort().reverse();
        const lastPatch = localStorage.getItem('last_patch');
        patchSelect.innerHTML = '';
        if (patches.length === 0) {
            patchSelect.innerHTML = '<option value="" disabled selected>Добавьте патч</option>';
        } else {
            patches.forEach(p => patchSelect.add(new Option(p, p)));
            if (lastPatch && patchSelect.querySelector(`option[value="${lastPatch}"]`)) {
                patchSelect.value = lastPatch;
            }
        }
    };

    populateOpponentSelect();
    populatePatchSelect();

    addNewOpponentBtn.addEventListener('click', () => {
        const newTeamName = prompt('Введите название новой команды:');
        if (newTeamName && newTeamName.trim() !== '') {
            const trimmedName = newTeamName.trim();
            if ([...opponentSelect.options].every(opt => opt.value !== trimmedName)) {
                opponentSelect.add(new Option(trimmedName, trimmedName, true, true));
            } else {
                opponentSelect.value = trimmedName;
            }
        }
    });

    matchForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const resultInput = document.querySelector('input[name="result"]:checked');
        const sideInput = document.querySelector('input[name="our_team_side"]:checked');

        if (!resultInput || !sideInput || !opponentSelect.value || !patchSelect.value) {
            ui.showToast('Пожалуйста, заполните все обязательные поля!', 'error');
            return;
        }

        const allHeroInputs = Array.from(document.querySelectorAll('#match-form .hero-input'));
        const allHeroesInDraft = allHeroInputs.map(input => input.value).filter(Boolean);
        if (new Set(allHeroesInDraft).size < allHeroesInDraft.length) {
            ui.showToast('Ошибка: Герои не должны повторяться.', 'error');
            return;
        }

        localStorage.setItem('last_opponent', opponentSelect.value);
        localStorage.setItem('last_patch', patchSelect.value);

        const ourSide = sideInput.value;

        const getPickData = (side) => Array.from(document.querySelectorAll(`.${side}-pick`)).map((heroInput, i) => ({
            hero: heroInput.value,
            role: document.querySelectorAll(`.${side}-pick-role`)[i].value || null,
            phase: `P${i + 1}`
        })).filter(p => p.hero);

        const getBanData = (side) => Array.from(document.querySelectorAll(`.${side}-ban`)).map((input, i) => ({
            hero: input.value,
            phase: `B${i + 1}`
        })).filter(item => item.hero);

        const newMatch = {
            id: Date.now(),
            date: new Date().toISOString(),
            opponent_team: opponentSelect.value,
            match_type: document.getElementById('match_type').value,
            patch: patchSelect.value,
            our_team_side: ourSide,
            result: resultInput.value,
            notes: document.getElementById('match-notes').value.trim(),
            bans: {
                our_team: getBanData(ourSide),
                opponent_team: getBanData(ourSide === 'blue' ? 'red' : 'blue')
            },
            picks: {
                our_team: getPickData(ourSide),
                opponent_team: getPickData(ourSide === 'blue' ? 'red' : 'blue')
            }
        };

        const existingMatches = store.getMatches();
        existingMatches.push(newMatch);
        store.setData('mlbb_matches', existingMatches);
        ui.showToast('Матч успешно сохранен!', 'success');

        document.querySelectorAll('.hero-input, #match-notes').forEach(el => {
            el.value = '';
        });
        document.querySelectorAll('.hero-role-select').forEach(el => el.selectedIndex = 0);
        document.querySelectorAll('input[type="radio"]').forEach(radio => radio.checked = false);
    });
}