const STORAGE_KEY = "showdown-overall";

const standingsEl = document.getElementById("overallStandings");
const updatedEl = document.getElementById("overallUpdated");

function formatUpdatedAt(value) {
	if (!value) {
		return "";
	}
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return "";
	}
	return `Last updated: ${date.toLocaleString()}`;
}

function renderOverall() {
	const raw = localStorage.getItem(STORAGE_KEY);
	if (!raw) {
		updatedEl.textContent = "No moyenne data yet.";
		standingsEl.innerHTML = "";
		return;
	}

	let data = null;
	try {
		data = JSON.parse(raw);
	} catch (error) {
		updatedEl.textContent = "Unable to read moyenne data.";
		standingsEl.innerHTML = "";
		return;
	}

	const averages = Array.isArray(data.averages) ? data.averages : [];
	const sorted = [...averages].sort((a, b) => {
		const aHas = a.average !== null && a.average !== undefined;
		const bHas = b.average !== null && b.average !== undefined;
		if (aHas && bHas) {
			if (b.average !== a.average) {
				return b.average - a.average;
			}
			return a.name.localeCompare(b.name);
		}
		if (aHas) {
			return -1;
		}
		if (bHas) {
			return 1;
		}
		return a.name.localeCompare(b.name);
	});

	const updatedText = formatUpdatedAt(data.updatedAt);
	updatedEl.textContent = updatedText || "Moyenne data loaded.";

	standingsEl.innerHTML = "";
	if (sorted.length === 0) {
		const empty = document.createElement("div");
		empty.className = "note";
		empty.textContent = "No classement yet. Enter moyenne values in the tournament page.";
		standingsEl.appendChild(empty);
		return;
	}

	let rank = 1;
	sorted.forEach((team) => {
		const item = document.createElement("div");
		item.className = "standings-item";
		const hasAverage = team.average !== null && team.average !== undefined;
		const rankLabel = hasAverage ? `#${rank}` : "—";
		if (hasAverage) {
			rank += 1;
		}
		const avgText = hasAverage
			? `Avg ${team.average} (${team.count})`
			: "No moyenne yet";

		item.innerHTML = `
			<div class="standings-left">
				<span class="standings-rank">${rankLabel}</span>
				<span>${team.name}</span>
			</div>
			<span class="badge">${avgText}</span>
		`;
		standingsEl.appendChild(item);
	});
}

renderOverall();
