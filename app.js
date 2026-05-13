const drawBtn = document.getElementById("drawBtn");
const restartBtn = document.getElementById("restartBtn");
const exportBtn = document.getElementById("exportBtn");
const exportBtnAlt = document.getElementById("exportBtnAlt");

const round1El = document.getElementById("round1");
const round2El = document.getElementById("round2");
const final3El = document.getElementById("final3");
const finalWinnerEl = document.getElementById("finalWinner");
const standingsEl = document.getElementById("standings");

const STORAGE_KEY = "showdown-overall";
const TOURNAMENT_KEY = "showdown-tournament";
const MIN_MOYENNE = 0;
const MAX_MOYENNE = 20;

const teams = Array.from({ length: 12 }, (_, index) => ({
	id: index,
	name: `EQ${index + 1}`
}));

const state = {
	round1: [],
	round2: [],
	final3: [],
	championId: null,
	championAverage: null
};

function shuffle(array) {
	const result = [...array];
	for (let i = result.length - 1; i > 0; i -= 1) {
		const j = Math.floor(Math.random() * (i + 1));
		[result[i], result[j]] = [result[j], result[i]];
	}
	return result;
}

function createMatches(list) {
	const matches = [];
	for (let i = 0; i < list.length; i += 2) {
		matches.push({
			id: `m-${list[i].id}-${list[i + 1].id}`,
			teamA: list[i],
			teamB: list[i + 1],
			winnerId: null,
			winnerAverage: null,
			teamAAverage: null,
			teamBAverage: null
		});
	}
	return matches;
}

function buildMatchesFromTeams(teamsList, previousMatches) {
	const nextMatches = createMatches(teamsList);
	if (!previousMatches || previousMatches.length === 0) {
		return nextMatches;
	}

	return nextMatches.map((match) => {
		const keyA = Math.min(match.teamA.id, match.teamB.id);
		const keyB = Math.max(match.teamA.id, match.teamB.id);
		const existing = previousMatches.find((oldMatch) => {
			const oldA = Math.min(oldMatch.teamA.id, oldMatch.teamB.id);
			const oldB = Math.max(oldMatch.teamA.id, oldMatch.teamB.id);
			return oldA === keyA && oldB === keyB;
		});
		return existing
			? {
					...match,
					winnerId: existing.winnerId,
					winnerAverage: existing.winnerAverage,
					teamAAverage: existing.teamAAverage,
					teamBAverage: existing.teamBAverage
			  }
			: match;
	});
}

function getWinners(matches) {
	return matches.filter((match) => match.winnerId !== null).map((match) => {
		return match.winnerId === match.teamA.id ? match.teamA : match.teamB;
	});
}

function computeProgression() {
	if (state.round1.length === 0) {
		state.round2 = [];
		state.final3 = [];
		state.championId = null;
		state.championAverage = null;
		return;
	}

	const round1Winners = getWinners(state.round1);
	if (round1Winners.length === state.round1.length) {
		state.round2 = buildMatchesFromTeams(round1Winners, state.round2);
	} else {
		state.round2 = [];
		state.final3 = [];
		state.championId = null;
		state.championAverage = null;
		return;
	}

	const round2Winners = getWinners(state.round2);
	if (round2Winners.length === state.round2.length && state.round2.length > 0) {
		state.final3 = round2Winners;
		if (!state.final3.find((team) => team.id === state.championId)) {
			state.championId = null;
			state.championAverage = null;
		}
	} else {
		state.final3 = [];
		state.championId = null;
		state.championAverage = null;
	}
}

function renderMatch(match, index, roundKey) {
	const matchEl = document.createElement("div");
	matchEl.className = "match-card";
	matchEl.innerHTML = `
		<button class="team-btn ${match.winnerId === match.teamA.id ? "winner" : ""}" data-round="${roundKey}" data-match="${index}" data-team="${match.teamA.id}">
			${match.teamA.name} <span>Select winner</span>
		</button>
		<button class="team-btn ${match.winnerId === match.teamB.id ? "winner" : ""}" data-round="${roundKey}" data-match="${index}" data-team="${match.teamB.id}">
			${match.teamB.name} <span>Select winner</span>
		</button>
	`;
	return matchEl;
}

function renderRound(container, matches, roundKey, emptyMessage) {
	container.innerHTML = "";
	if (matches.length === 0) {
		const empty = document.createElement("div");
		empty.className = "note";
		empty.textContent = emptyMessage;
		container.appendChild(empty);
		return;
	}

	matches.forEach((match, index) => {
		container.appendChild(renderMatch(match, index, roundKey));
	});
}

function renderFinal3() {
	final3El.innerHTML = "";
	if (state.final3.length === 0) {
		const empty = document.createElement("div");
		empty.className = "note";
		empty.textContent = "Finish Round of 6 to reveal the final 3 teams.";
		final3El.appendChild(empty);
		return;
	}

	state.final3.forEach((team) => {
		const card = document.createElement("div");
		card.className = "match-card";
		card.innerHTML = `
			<button class="team-btn ${state.championId === team.id ? "winner" : ""}" data-champion="${team.id}">
				${team.name} <span>Select winner</span>
			</button>
		`;
		final3El.appendChild(card);
	});
}

function computeStandings() {
	const results = teams.map((team) => ({
		...team,
		status: "Unassigned"
	}));

	const round1Losers = [];
	const round2Losers = [];

	state.round1.forEach((match) => {
		if (match.winnerId !== null) {
			const loserId = match.winnerId === match.teamA.id ? match.teamB.id : match.teamA.id;
			round1Losers.push(loserId);
		}
	});

	state.round2.forEach((match) => {
		if (match.winnerId !== null) {
			const loserId = match.winnerId === match.teamA.id ? match.teamB.id : match.teamA.id;
			round2Losers.push(loserId);
		}
	});

	results.forEach((team) => {
		if (state.championId === team.id) {
			team.status = "Champion";
		} else if (state.final3.find((finalist) => finalist.id === team.id)) {
			team.status = "Final 3";
		} else if (round2Losers.includes(team.id)) {
			team.status = "Round of 6";
		} else if (round1Losers.includes(team.id)) {
			team.status = "Round of 12";
		}
	});

	return results;
}

function renderStandings() {
	const standings = computeStandings();
	const order = ["Champion", "Final 3", "Round of 6", "Round of 12", "Unassigned"];

	standings.sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));

	standingsEl.innerHTML = "";
	standings.forEach((team) => {
		const item = document.createElement("div");
		item.className = "standings-item";
		item.innerHTML = `
			<span>${team.name}</span>
			<span class="badge">${team.status}</span>
		`;
		standingsEl.appendChild(item);
	});
}

function updateStatus(message) {
	const existing = document.getElementById("statusMsg");
	if (existing) {
		existing.textContent = message;
	}
}

function formatTeamList(list) {
	return list.length ? list.map((team) => team.name).join(",") : "-";
}

function getRoundResults(matches) {
	const winners = [];
	const losers = [];
	matches.forEach((match) => {
		if (match.winnerId === null) {
			return;
		}
		const winner = match.winnerId === match.teamA.id ? match.teamA : match.teamB;
		const loser = match.winnerId === match.teamA.id ? match.teamB : match.teamA;
		winners.push(winner);
		losers.push(loser);
	});

	return { winners, losers };
}

function buildResultsText() {
	const round1Results = getRoundResults(state.round1);
	const round2Results = getRoundResults(state.round2);
	const final3Teams = state.final3;
	const champion = teams.find((team) => team.id === state.championId) || null;

	return [
		"round 1:",
		`won: ${formatTeamList(round1Results.winners)}`,
		`lost: ${formatTeamList(round1Results.losers)}`,
		"",
		"round 2:",
		`won: ${formatTeamList(round2Results.winners)}`,
		`lost: ${formatTeamList(round2Results.losers)}`,
		"",
		"final 3:",
		`contenders: ${formatTeamList(final3Teams)}`,
		`champion: ${champion ? champion.name : "-"}`
	].join("\n");
}

function downloadResults() {
	const text = buildResultsText();
	const blob = new Blob([text], { type: "text/plain" });
	const link = document.createElement("a");
	link.href = URL.createObjectURL(blob);
	link.download = "showdown-results.txt";
	document.body.appendChild(link);
	link.click();
	link.remove();
	URL.revokeObjectURL(link.href);
	updateStatus("Results exported as a text file.");
}

function render() {
	computeProgression();
	renderRound(round1El, state.round1, "round1", "Run tirage au sort to create 6 pairs.");
	renderRound(round2El, state.round2, "round2", "Pick all Round of 12 winners first.");
	renderFinal3();
	renderFinalWinner();
	renderStandings();
	saveTournamentState();
	saveOverallSnapshot();
}

function handleTeamSelection(event) {
	const btn = event.target.closest(".team-btn");
	if (!btn) {
		return;
	}

	const roundKey = btn.dataset.round;
	const matchIndex = Number(btn.dataset.match);
	const teamId = Number(btn.dataset.team);
	const round = state[roundKey];

	if (!round || !round[matchIndex]) {
		return;
	}

	const match = round[matchIndex];
	const teamAAverage = requestMoyenne(match.teamA.name, match.teamAAverage, "(Team A)");
	if (teamAAverage === null) {
		return;
	}
	const teamBAverage = requestMoyenne(match.teamB.name, match.teamBAverage, "(Team B)");
	if (teamBAverage === null) {
		return;
	}

	match.winnerId = teamId;
	match.winnerAverage = teamId === match.teamA.id ? teamAAverage : teamBAverage;
	match.teamAAverage = teamAAverage;
	match.teamBAverage = teamBAverage;
	updateStatus("Winner saved. Continue selecting winners.");
	render();
}

function handleChampionSelection(event) {
	const btn = event.target.closest("button[data-champion]");
	if (!btn) {
		return;
	}

	const teamId = Number(btn.dataset.champion);
	const team = teams.find((entry) => entry.id === teamId);
	const moyenne = requestMoyenne(team ? team.name : "Champion", state.championAverage, "(Champion)");
	if (moyenne === null) {
		return;
	}

	state.championId = teamId;
	state.championAverage = moyenne;
	updateStatus("Champion crowned. You can still adjust earlier matches.");
	render();
}

function renderFinalWinner() {
	finalWinnerEl.innerHTML = "";
	if (state.final3.length === 0) {
		finalWinnerEl.textContent = "Waiting for final 3 contenders.";
		return;
	}

	const champion = teams.find((team) => team.id === state.championId);
	finalWinnerEl.innerHTML = `
		<div class="match-card">
			<div class="team-btn ${champion ? "winner" : ""}">
				${champion ? champion.name : "TBD"} <span>Champion</span>
			</div>
		</div>
	`;
}

function requestMoyenne(teamName, currentValue, labelSuffix) {
	const promptValue = currentValue === null || currentValue === undefined ? "" : `${currentValue}`;
	const suffix = labelSuffix ? ` ${labelSuffix}` : "";
	const label = `Enter la moyenne for ${teamName}${suffix} (${MIN_MOYENNE}-${MAX_MOYENNE}).`;
	while (true) {
		const input = window.prompt(label, promptValue);
		if (input === null) {
			return null;
		}
		const normalized = input.replace(",", ".");
		const value = Number(normalized);
		if (Number.isFinite(value) && value >= MIN_MOYENNE && value <= MAX_MOYENNE) {
			return value;
		}
		window.alert("Please enter a valid moyenne between 0 and 20.");
	}
}

function computeTeamAverages() {
	const entries = teams.map((team) => ({ ...team, values: [] }));
	const addEntry = (teamId, value) => {
		if (Number.isFinite(value)) {
			entries[teamId].values.push(value);
		}
	};

	state.round1.forEach((match) => {
		addEntry(match.teamA.id, match.teamAAverage);
		addEntry(match.teamB.id, match.teamBAverage);
	});

	state.round2.forEach((match) => {
		addEntry(match.teamA.id, match.teamAAverage);
		addEntry(match.teamB.id, match.teamBAverage);
	});

	if (state.championId !== null) {
		addEntry(state.championId, state.championAverage);
	}

	return entries.map((entry) => {
		const sum = entry.values.reduce((total, value) => total + value, 0);
		const average = entry.values.length ? sum / entry.values.length : null;
		return {
			id: entry.id,
			name: entry.name,
			count: entry.values.length,
			average: average === null ? null : Number(average.toFixed(2))
		};
	});
}

function saveOverallSnapshot() {
	const payload = {
		updatedAt: new Date().toISOString(),
		teams: teams.map((team) => ({ id: team.id, name: team.name })),
		averages: computeTeamAverages()
	};
	localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function serializeMatch(match) {
	return {
		teamAId: match.teamA.id,
		teamBId: match.teamB.id,
		winnerId: match.winnerId,
		winnerAverage: match.winnerAverage,
		teamAAverage: match.teamAAverage,
		teamBAverage: match.teamBAverage
	};
}

function deserializeMatch(saved) {
	const teamA = teams.find((team) => team.id === saved.teamAId);
	const teamB = teams.find((team) => team.id === saved.teamBId);
	if (!teamA || !teamB) {
		return null;
	}
	return {
		id: `m-${teamA.id}-${teamB.id}`,
		teamA,
		teamB,
		winnerId: saved.winnerId ?? null,
		winnerAverage: saved.winnerAverage ?? null,
		teamAAverage: saved.teamAAverage ?? null,
		teamBAverage: saved.teamBAverage ?? null
	};
}

function saveTournamentState() {
	const payload = {
		round1: state.round1.map(serializeMatch),
		round2: state.round2.map(serializeMatch),
		final3Ids: state.final3.map((team) => team.id),
		championId: state.championId,
		championAverage: state.championAverage
	};
	localStorage.setItem(TOURNAMENT_KEY, JSON.stringify(payload));
}

function loadTournamentState() {
	const raw = localStorage.getItem(TOURNAMENT_KEY);
	if (!raw) {
		return;
	}
	let payload = null;
	try {
		payload = JSON.parse(raw);
	} catch (error) {
		return;
	}

	if (Array.isArray(payload.round1)) {
		state.round1 = payload.round1
			.map(deserializeMatch)
			.filter((match) => match !== null);
	}
	if (Array.isArray(payload.round2)) {
		state.round2 = payload.round2
			.map(deserializeMatch)
			.filter((match) => match !== null);
	}
	if (Array.isArray(payload.final3Ids)) {
		state.final3 = payload.final3Ids
			.map((id) => teams.find((team) => team.id === id))
			.filter((team) => team);
	}
	state.championId = payload.championId ?? null;
	state.championAverage = payload.championAverage ?? null;
}

drawBtn.addEventListener("click", () => {
	const shuffled = shuffle(teams);
	state.round1 = createMatches(shuffled);
	state.round2 = [];
	state.final3 = [];
	state.championId = null;
	state.championAverage = null;
	updateStatus("Pairs created. Choose winners for Round of 12.");
	render();
});

restartBtn.addEventListener("click", () => {
	state.round1 = [];
	state.round2 = [];
	state.final3 = [];
	state.championId = null;
	state.championAverage = null;
	updateStatus("Reset done. Ready for a fresh draw.");
	render();
});

exportBtn.addEventListener("click", downloadResults);
exportBtnAlt.addEventListener("click", downloadResults);

round1El.addEventListener("click", handleTeamSelection);
round2El.addEventListener("click", handleTeamSelection);
final3El.addEventListener("click", handleChampionSelection);

loadTournamentState();
render();
