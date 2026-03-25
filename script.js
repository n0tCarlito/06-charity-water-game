// Water Drop Dash - beginner-friendly DOM game logic

// Grab elements from the page once so we can reuse them.
const gameArea = document.getElementById('gameArea');
const player = document.getElementById('player');

const scoreValue = document.getElementById('scoreValue');
const bestScoreValue = document.getElementById('bestScoreValue');
const meterFill = document.getElementById('meterFill');
const meterLabel = document.getElementById('meterLabel');
const modeStatus = document.getElementById('modeStatus');

const startOverlay = document.getElementById('startOverlay');
const gameOverOverlay = document.getElementById('gameOverOverlay');
const finalScoreText = document.getElementById('finalScore');
const bestScoreText = document.getElementById('bestScore');
const newBestMessage = document.getElementById('newBestMessage');

const startButton = document.getElementById('startButton');
const replayButton = document.getElementById('replayButton');
const leftButton = document.getElementById('leftButton');
const rightButton = document.getElementById('rightButton');
const resetBestButton = document.getElementById('resetBestButton');
const frenzyToggleStart = document.getElementById('frenzyToggleStart');
const frenzyToggleGameOver = document.getElementById('frenzyToggleGameOver');
const resetConfirmModal = document.getElementById('resetConfirmModal');
const confirmResetButton = document.getElementById('confirmResetButton');
const cancelResetButton = document.getElementById('cancelResetButton');

// Three lanes: 0 = left, 1 = middle, 2 = right.
const lanePositions = [0, 1, 2];
const lanePercent = [16.66, 50, 83.33];
const bestScoreKey = 'waterDropDashBestScore';
const frenzyModeKey = 'waterDropDashFrenziedMode';
const superMeterMax = 100;
const modeDuration = 7;
const meterDrainPerSecond = 6;
const speedStepSeconds = 5;
const speedIncreasePerStep = 0.25;
const maxProgressiveSpeedMultiplier = 3;
const frenzySpeedMultiplier = 2.5;
const frenzyPointMultiplier = 2;

let playerLane = 1;
let items = [];
let score = 0;
let bestScore = Number(localStorage.getItem(bestScoreKey)) || 0;
let frenzyModeEnabled = localStorage.getItem(frenzyModeKey) === 'true';
let superMeter = 0;
let invincibleMode = false;
let modeTimeLeft = 0;

let gameRunning = false;
let spawnTimer = 0;
let gameLoopId = null;
let lastFrameTime = 0;
let gameTimeSeconds = 0;

bestScoreValue.textContent = bestScore;
movePlayerToLane();
updateSuperMeterUI();
syncFrenzyToggles();

function syncFrenzyToggles() {
	frenzyToggleStart.checked = frenzyModeEnabled;
	frenzyToggleGameOver.checked = frenzyModeEnabled;
}

function setFrenzyMode(enabled) {
	frenzyModeEnabled = enabled;
	localStorage.setItem(frenzyModeKey, String(enabled));
	syncFrenzyToggles();
}

function getHydroModeDuration() {
	return frenzyModeEnabled ? modeDuration / 2 : modeDuration;
}

// Move the player graphic to the current lane.
function movePlayerToLane() {
	const laneX = lanePercent[playerLane];
	player.style.left = `${laneX}%`;
	player.style.transform = 'translateX(-50%)';
}

function startGame() {
	clearItems();
	score = 0;
	superMeter = 0;
	invincibleMode = false;
	modeTimeLeft = 0;
	playerLane = 1;
	gameRunning = true;
	spawnTimer = 0;
	lastFrameTime = performance.now();
	gameTimeSeconds = 0;

	scoreValue.textContent = '0';
	updateSuperMeterUI();
	startOverlay.classList.remove('visible');
	gameOverOverlay.classList.remove('visible');
	newBestMessage.classList.remove('visible');
	player.classList.remove('invincible');
	gameArea.classList.remove('chaos');
	movePlayerToLane();

	// requestAnimationFrame creates a smooth loop based on browser frames.
	gameLoopId = requestAnimationFrame(gameLoop);
}

function endGame() {
	gameRunning = false;
	cancelAnimationFrame(gameLoopId);

	const finalScore = Math.floor(score);
	finalScoreText.textContent = finalScore;
	const beatBestScore = finalScore > bestScore;

	if (beatBestScore) {
		bestScore = finalScore;
		localStorage.setItem(bestScoreKey, String(bestScore));
		newBestMessage.classList.add('visible');
		launchConfettiCelebration();
	} else {
		newBestMessage.classList.remove('visible');
	}

	bestScoreValue.textContent = bestScore;
	bestScoreText.textContent = bestScore;
	gameOverOverlay.classList.add('visible');
}

function resetBestScore() {
	bestScore = 0;
	localStorage.setItem(bestScoreKey, '0');

	bestScoreValue.textContent = '0';
	bestScoreText.textContent = '0';
	newBestMessage.classList.remove('visible');
}

function openResetModal() {
	resetConfirmModal.classList.add('visible');
	resetConfirmModal.setAttribute('aria-hidden', 'false');
}

function closeResetModal() {
	resetConfirmModal.classList.remove('visible');
	resetConfirmModal.setAttribute('aria-hidden', 'true');
}

function launchConfettiCelebration() {
	const confettiColors = ['#ffc907', '#2e9df7', '#4fcb53', '#ff902a', '#f16061'];
	const pieceCount = 70;

	for (let i = 0; i < pieceCount; i += 1) {
		const confetti = document.createElement('div');
		confetti.className = 'confetti-piece';
		confetti.style.left = `${Math.random() * 100}%`;
		confetti.style.backgroundColor = confettiColors[Math.floor(Math.random() * confettiColors.length)];
		confetti.style.animationDuration = `${1.8 + Math.random() * 1.4}s`;
		confetti.style.animationDelay = `${Math.random() * 0.18}s`;
		confetti.style.setProperty('--drift', `${-90 + Math.random() * 180}px`);

		gameArea.appendChild(confetti);

		setTimeout(() => {
			confetti.remove();
		}, 3500);
	}
}

function spawnItem() {
	// 52% clean, 39% polluted, 9% reducer (green) drops.
	const spawnRoll = Math.random();
	let itemType = 'clean';

	if (spawnRoll < 0.52) {
		itemType = 'clean';
	} else if (spawnRoll < 0.91) {
		itemType = 'polluted';
	} else {
		itemType = 'reducer';
	}

	const lane = lanePositions[Math.floor(Math.random() * lanePositions.length)];

	const itemEl = document.createElement('div');
	itemEl.classList.add('item');
	itemEl.classList.add(itemType);

	if (itemType === 'clean') {
		itemEl.textContent = '💧';
	} else if (itemType === 'polluted') {
		itemEl.textContent = '🛢️';
	} else {
		itemEl.textContent = '💧';
	}

	itemEl.style.left = `${lanePercent[lane]}%`;
	itemEl.style.transform = 'translateX(-50%)';
	itemEl.style.top = '-60px';

	gameArea.appendChild(itemEl);

	items.push({
		element: itemEl,
		lane,
		y: -60,
		speed: 180 + Math.random() * 90,
		type: itemType
	});
}

function activateHydromaticMode() {
	invincibleMode = true;
	modeTimeLeft = getHydroModeDuration();
	gameArea.classList.add('chaos');
	player.classList.add('invincible');
	updateSuperMeterUI();
}

function updateSuperMeterUI() {
	if (invincibleMode) {
		const activeModeDuration = getHydroModeDuration();
		const modePercent = (modeTimeLeft / activeModeDuration) * 100;
		meterFill.style.width = `${modePercent}%`;
		meterFill.classList.add('full');
		meterLabel.textContent = 'Hydromatic Mode Active';
		modeStatus.textContent = `${modeTimeLeft.toFixed(1)}s`;
		return;
	}

	const chargePercent = (superMeter / superMeterMax) * 100;
	meterFill.style.width = `${chargePercent}%`;
	meterFill.classList.toggle('full', chargePercent >= 100);
	meterLabel.textContent = 'Hydromatic Meter';
	modeStatus.textContent = `${Math.floor(chargePercent)}%`;
}

function createScorePopup(text, lane, popupType = 'normal') {
	const popup = document.createElement('div');
	popup.className = 'score-popup';

	if (popupType !== 'normal') {
		popup.classList.add(popupType);
	}

	popup.textContent = text;
	popup.style.left = `${lanePercent[lane]}%`;
	popup.style.top = '430px';
	popup.style.transform = 'translateX(-50%)';

	gameArea.appendChild(popup);

	// Remove popup after animation so the DOM stays clean.
	setTimeout(() => {
		popup.remove();
	}, 700);
}

function handleCollision(itemIndex) {
	const item = items[itemIndex];
	const pointMultiplier = frenzyModeEnabled ? frenzyPointMultiplier : 1;

	if (item.type === 'clean') {
		score += 10 * pointMultiplier;
		superMeter += 25;
		createScorePopup(`+${10 * pointMultiplier}`, item.lane);

		if (superMeter >= superMeterMax && !invincibleMode) {
			superMeter = superMeterMax;
			activateHydromaticMode();
		}

		// Add a quick bump animation for feedback.
		player.classList.add('bump');
		setTimeout(() => {
			player.classList.remove('bump');
		}, 150);

		item.element.remove();
		items.splice(itemIndex, 1);
	} else if (item.type === 'reducer') {
		if (invincibleMode) {
			score += 5 * pointMultiplier;
			createScorePopup(`+${5 * pointMultiplier}`, item.lane, 'shield');
		} else {
			score = Math.max(0, score - 50);
			createScorePopup('-50', item.lane, 'penalty');
		}

		item.element.remove();
		items.splice(itemIndex, 1);
	} else {
		if (invincibleMode) {
			score += 5 * pointMultiplier;
			createScorePopup(`+${5 * pointMultiplier}`, item.lane, 'shield');
			item.element.remove();
			items.splice(itemIndex, 1);
		} else {
			endGame();
		}
	}

	updateSuperMeterUI();
}

function gameLoop(currentTime) {
	if (!gameRunning) {
		return;
	}

	const deltaTime = (currentTime - lastFrameTime) / 1000;
	lastFrameTime = currentTime;
	gameTimeSeconds += deltaTime;
	const pointMultiplier = frenzyModeEnabled ? frenzyPointMultiplier : 1;
	const runSpeedMultiplier = frenzyModeEnabled ? frenzySpeedMultiplier : 1;

	// Survival score increases over time.
	score += deltaTime * 6 * pointMultiplier;
	scoreValue.textContent = Math.floor(score);

	// Hydromatic mode lasts 7 seconds and creates a chaotic speed burst.
	if (invincibleMode) {
		modeTimeLeft -= deltaTime;

		if (modeTimeLeft <= 0) {
			invincibleMode = false;
			modeTimeLeft = 0;
			superMeter = 0;
			gameArea.classList.remove('chaos');
			player.classList.remove('invincible');
		}

		updateSuperMeterUI();
	}

	// Outside invincible mode, charge slowly leaks away over time.
	if (!invincibleMode && superMeter > 0) {
		superMeter -= meterDrainPerSecond * deltaTime;

		if (superMeter < 0) {
			superMeter = 0;
		}

		updateSuperMeterUI();
	}

	const spawnInterval = (invincibleMode ? 0.35 : 0.75) / runSpeedMultiplier;

	// Spawn a new falling object at different rates based on mode.
	spawnTimer += deltaTime;
	if (spawnTimer >= spawnInterval) {
		spawnItem();
		spawnTimer = 0;
	}

	// Move every item downward.
	for (let i = items.length - 1; i >= 0; i -= 1) {
		const item = items[i];

		// Every step interval, speed increases by 25%.
		const speedSteps = Math.floor(gameTimeSeconds / speedStepSeconds);
		const progressiveMultiplier = Math.min(
			1 + speedSteps * speedIncreasePerStep,
			maxProgressiveSpeedMultiplier
		);

		const chaosMultiplier = invincibleMode ? 1.9 : 1;
		item.y += item.speed * progressiveMultiplier * chaosMultiplier * runSpeedMultiplier * deltaTime;
		item.element.style.top = `${item.y}px`;

		// Check collision near the player's row.
		const nearPlayer = item.y > 430 && item.y < 500;
		if (nearPlayer && item.lane === playerLane) {
			handleCollision(i);
			continue;
		}

		// Remove items that leave the screen.
		if (item.y > 620) {
			item.element.remove();
			items.splice(i, 1);
		}
	}

	gameLoopId = requestAnimationFrame(gameLoop);
}

function clearItems() {
	items.forEach((item) => item.element.remove());
	items = [];

	// Also remove leftover score popups.
	const oldPopups = gameArea.querySelectorAll('.score-popup');
	oldPopups.forEach((popup) => popup.remove());

	// Remove any confetti from a previous high-score celebration.
	const oldConfetti = gameArea.querySelectorAll('.confetti-piece');
	oldConfetti.forEach((piece) => piece.remove());
}

function moveLeft() {
	if (!gameRunning) {
		return;
	}

	if (playerLane > 0) {
		playerLane -= 1;
		movePlayerToLane();
	}
}

function moveRight() {
	if (!gameRunning) {
		return;
	}

	if (playerLane < 2) {
		playerLane += 1;
		movePlayerToLane();
	}
}

// Desktop keyboard support.
document.addEventListener('keydown', (event) => {
	if (event.key === 'ArrowLeft') {
		moveLeft();
	}

	if (event.key === 'ArrowRight') {
		moveRight();
	}
});

// Touch + click support for mobile controls.
leftButton.addEventListener('click', moveLeft);
rightButton.addEventListener('click', moveRight);

leftButton.addEventListener('touchstart', (event) => {
	event.preventDefault();
	moveLeft();
});

rightButton.addEventListener('touchstart', (event) => {
	event.preventDefault();
	moveRight();
});

startButton.addEventListener('click', startGame);
replayButton.addEventListener('click', startGame);
resetBestButton.addEventListener('click', openResetModal);
frenzyToggleStart.addEventListener('change', (event) => {
	setFrenzyMode(event.target.checked);
});
frenzyToggleGameOver.addEventListener('change', (event) => {
	setFrenzyMode(event.target.checked);
});
confirmResetButton.addEventListener('click', () => {
	resetBestScore();
	closeResetModal();
});
cancelResetButton.addEventListener('click', closeResetModal);

resetConfirmModal.addEventListener('click', (event) => {
	if (event.target === resetConfirmModal) {
		closeResetModal();
	}
});
