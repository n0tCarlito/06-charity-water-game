// Water Drop Dash - beginner-friendly DOM game logic

// Grab elements from the page once so we can reuse them.
const gameArea = document.getElementById('gameArea');
const player = document.getElementById('player');
const boss = document.getElementById('boss');
const bossHealthBar = document.getElementById('bossHealthBar');
const bossHealthFill = document.getElementById('bossHealthFill');
const bossHealthValue = document.getElementById('bossHealthValue');
const bossFireHint = document.getElementById('bossFireHint');

const scoreValue = document.getElementById('scoreValue');
const bestScoreValue = document.getElementById('bestScoreValue');
const meterFill = document.getElementById('meterFill');
const meterLabel = document.getElementById('meterLabel');
const modeStatus = document.getElementById('modeStatus');
const journeyHud = document.querySelector('.journey-hud');
const journeyFill = document.getElementById('journeyFill');
const journeyMarker = document.getElementById('journeyMarker');

const startOverlay = document.getElementById('startOverlay');
const gameOverOverlay = document.getElementById('gameOverOverlay');
const finalScoreText = document.getElementById('finalScore');
const bestScoreText = document.getElementById('bestScore');
const newBestMessage = document.getElementById('newBestMessage');
const gameOverTitle = document.getElementById('gameOverTitle');
const victoryMessage = document.getElementById('victoryMessage');

const startButton = document.getElementById('startButton');
const replayButton = document.getElementById('replayButton');
const leftButton = document.getElementById('leftButton');
const rightButton = document.getElementById('rightButton');
const resetBestButton = document.getElementById('resetBestButton');
const frenzyToggleStart = document.getElementById('frenzyToggleStart');
const frenzyToggleGameOver = document.getElementById('frenzyToggleGameOver');
const tsunamiToggleStart = document.getElementById('tsunamiToggleStart');
const tsunamiToggleGameOver = document.getElementById('tsunamiToggleGameOver');
const resetConfirmModal = document.getElementById('resetConfirmModal');
const confirmResetButton = document.getElementById('confirmResetButton');
const cancelResetButton = document.getElementById('cancelResetButton');

// Three lanes: 0 = left, 1 = middle, 2 = right.
const lanePositions = [0, 1, 2];
const lanePercent = [16.66, 50, 83.33];
const bestScoreKey = 'waterDropDashBestScore';
const frenzyModeKey = 'waterDropDashFrenziedMode';
const tsunamiModeKey = 'waterDropDashTsunamiMode';
const superMeterMax = 100;
const modeDuration = 7;
const meterDrainPerSecond = 6;
const speedStepSeconds = 5;
const speedIncreasePerStep = 0.25;
const maxProgressiveSpeedMultiplier = 3;
const frenzySpeedMultiplier = 2.5;
const frenzyPointMultiplier = 2;
const journeyDurationSeconds = 30;
const hydroJourneyBoost = 1.2;
const maxJourneyProgress = 100;
const bossMoveIntervalSeconds = 2;
const bossMaxHealth = 100;
const bossPhaseOneAttackIntervalSeconds = 0.85;
const bossDamagePerShot = 5;
const shotSpeed = 680;
const shotCooldownSeconds = 0.2;
const bossEntranceStartY = -160;
const bossEntranceEndY = 160;
const bossEntranceDurationMs = 4000;
const bossSpriteWaitMaxMs = 1500;
const bossDamageFlashDurationMs = 180;

let playerLane = 1;
let items = [];
let score = 0;
let bestScore = Number(localStorage.getItem(bestScoreKey)) || 0;
let frenzyModeEnabled = localStorage.getItem(frenzyModeKey) === 'true';
let tsunamiModeEnabled = localStorage.getItem(tsunamiModeKey) === 'true';
let superMeter = 0;
let invincibleMode = false;
let modeTimeLeft = 0;

let gameRunning = false;
let spawnTimer = 0;
let gameLoopId = null;
let lastFrameTime = 0;
let gameTimeSeconds = 0;
let journeyProgressSeconds = 0;
let bossAreaReached = false;
let pointAudioContext = null;
let gameOverAudioContext = null;
let bossLane = 1;
let bossMoveTimer = 0;
let bossMovementActive = false;
let bossHealth = bossMaxHealth;
let bossAttackTimer = 0;
let playerShots = [];
let shotCooldownTimeLeft = 0;
let bossDamageFlashTimeoutId = null;
let bossEntranceAnimationId = null;
let bossSpritesReady = false;
let preloadedBossImages = [];

bestScoreValue.textContent = bestScore;
movePlayerToLane();
updateSuperMeterUI();
setFrenzyMode(frenzyModeEnabled);
setTsunamiMode(tsunamiModeEnabled);
updateDecontaminationLock();
preloadBossSprites();

function preloadBossSprites() {
	// Keep image objects in memory so boss sprites are fetched and decoded before entrance.
	const spritePaths = ['img/enemy.png', 'img/enemyDamaged.png'];
	let loadedSprites = 0;

	preloadedBossImages = spritePaths.map((path) => {
		const image = new Image();

		const markLoaded = () => {
			loadedSprites += 1;
			if (loadedSprites >= spritePaths.length) {
				bossSpritesReady = true;
			}
		};

		image.addEventListener('load', markLoaded, { once: true });
		image.addEventListener('error', markLoaded, { once: true });
		image.src = path;
		return image;
	});
}

function syncFrenzyToggles() {
	frenzyToggleStart.checked = frenzyModeEnabled;
	frenzyToggleGameOver.checked = frenzyModeEnabled;
}

function syncTsunamiToggles() {
	tsunamiToggleStart.checked = tsunamiModeEnabled;
	tsunamiToggleGameOver.checked = tsunamiModeEnabled;
}

function updateDecontaminationLock() {
	const isUnlocked = bestScore >= 1000;
	
	// Update both toggles' disabled state
	tsunamiToggleStart.disabled = !isUnlocked;
	tsunamiToggleGameOver.disabled = !isUnlocked;
	
	// Show/hide appropriate messages
	const lockedStartMsg = document.getElementById('decontaminationLockedStart');
	const unlockedStartMsg = document.getElementById('decontaminationUnlockedStart');
	const lockedGameOverMsg = document.getElementById('decontaminationLockedGameOver');
	const unlockedGameOverMsg = document.getElementById('decontaminationUnlockedGameOver');
	
	if (isUnlocked) {
		lockedStartMsg.style.display = 'none';
		unlockedStartMsg.style.display = 'block';
		lockedGameOverMsg.style.display = 'none';
		unlockedGameOverMsg.style.display = 'block';
	} else {
		lockedStartMsg.style.display = 'block';
		unlockedStartMsg.style.display = 'none';
		lockedGameOverMsg.style.display = 'block';
		unlockedGameOverMsg.style.display = 'none';
	}
}

function setFrenzyMode(enabled) {
	// Decontamination mode blocks Frenzied Mode.
	if (tsunamiModeEnabled && enabled) {
		enabled = false;
	}

	frenzyModeEnabled = enabled;
	localStorage.setItem(frenzyModeKey, String(enabled));
	syncFrenzyToggles();
}

function setTsunamiMode(enabled) {
	// Turning on Decontamination automatically turns Frenzied Mode off.
	if (enabled) {
		setFrenzyMode(false);
	}

	tsunamiModeEnabled = enabled;
	localStorage.setItem(tsunamiModeKey, String(enabled));
	syncTsunamiToggles();
	frenzyToggleStart.disabled = enabled;
	frenzyToggleGameOver.disabled = enabled;
	if (!enabled) {
		journeyProgressSeconds = 0;
		bossAreaReached = false;
	}
	updateJourneyUI();
	applyTsunamiVisuals();
}

function applyTsunamiVisuals() {
	if (tsunamiModeEnabled) {
		gameArea.classList.add('polluted');
	} else {
		gameArea.classList.remove('polluted');
	}

	journeyHud.style.display = tsunamiModeEnabled ? 'flex' : 'none';
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

function moveBossToLane(lane) {
	bossLane = lane;
	boss.style.left = `${lanePercent[lane]}%`;
	boss.style.transform = 'translateX(-50%)';
}

function moveBossToRandomLane() {
	const possibleLanes = lanePositions.filter((lane) => lane !== bossLane);
	const randomLane = possibleLanes[Math.floor(Math.random() * possibleLanes.length)];
	moveBossToLane(randomLane);
}

function updateBossHealthUI() {
	const clampedHealth = Math.max(0, Math.min(bossMaxHealth, bossHealth));
	const healthPercent = (clampedHealth / bossMaxHealth) * 100;
	bossHealthFill.style.width = `${healthPercent}%`;
	bossHealthValue.textContent = `${Math.round(healthPercent)}%`;
}

function spawnBossAttackDrop() {
	const lane = lanePositions[Math.floor(Math.random() * lanePositions.length)];
	const itemEl = document.createElement('div');
	let dropSpeed = 290 + Math.random() * 180;

	// Some gasoline drops are extra fast to make attacks less predictable.
	if (Math.random() < 0.35) {
		dropSpeed += 120;
	}

	itemEl.classList.add('item');
	itemEl.classList.add('polluted');
	itemEl.textContent = '🛢️';
	itemEl.style.left = `${lanePercent[lane]}%`;
	itemEl.style.transform = 'translateX(-50%)';
	itemEl.style.top = '-60px';

	gameArea.appendChild(itemEl);

	items.push({
		element: itemEl,
		lane,
		y: -60,
		speed: dropSpeed,
		type: 'polluted'
	});
}

function firePlayerShot() {
	if (!gameRunning || !bossAreaReached || !bossMovementActive) {
		return;
	}

	if (shotCooldownTimeLeft > 0) {
		return;
	}

	const gameHeight = gameArea.clientHeight;
	const playerBottom = Number.parseFloat(window.getComputedStyle(player).bottom) || 18;
	const playerTop = gameHeight - playerBottom - player.offsetHeight;
	const shotStartY = Math.max(20, playerTop - 24);

	const shotEl = document.createElement('div');
	shotEl.className = 'player-shot';
	shotEl.style.left = `${lanePercent[playerLane]}%`;
	shotEl.style.top = `${shotStartY}px`;
	shotEl.style.transform = 'translateX(-50%)';

	gameArea.appendChild(shotEl);

	playerShots.push({
		element: shotEl,
		y: shotStartY,
		lane: playerLane,
		speed: shotSpeed
	});

	shotCooldownTimeLeft = shotCooldownSeconds;
}

function clearPlayerShots() {
	playerShots.forEach((shot) => shot.element.remove());
	playerShots = [];
}

function startGame() {
	if (bossEntranceAnimationId) {
		cancelAnimationFrame(bossEntranceAnimationId);
		bossEntranceAnimationId = null;
	}

	clearItems();
	score = 0;
	superMeter = 0;
	invincibleMode = false;
	modeTimeLeft = 0;
	journeyProgressSeconds = 0;
	bossAreaReached = false;
	playerLane = 1;
	gameRunning = true;
	spawnTimer = 0;
	lastFrameTime = performance.now();
	gameTimeSeconds = 0;

	scoreValue.textContent = '0';
	updateSuperMeterUI();
	startOverlay.classList.remove('visible');
	gameOverOverlay.classList.remove('visible');
	victoryMessage.classList.remove('visible');
	newBestMessage.classList.remove('visible');
	gameOverTitle.textContent = 'Game Over';
	player.classList.remove('invincible');
	boss.classList.remove('appearing');
	boss.classList.remove('damaged');
	boss.style.top = `${bossEntranceStartY}px`;
	moveBossToLane(1);
	bossMoveTimer = 0;
	bossMovementActive = false;
	bossHealth = bossMaxHealth;
	bossAttackTimer = 0;
	shotCooldownTimeLeft = 0;
	bossHealthBar.classList.remove('visible');
	bossHealthBar.setAttribute('aria-hidden', 'true');
	bossFireHint.classList.remove('visible');
	bossFireHint.setAttribute('aria-hidden', 'true');
	updateBossHealthUI();
	gameArea.classList.remove('chaos');
	applyTsunamiVisuals();
	updateJourneyUI();
	movePlayerToLane();

	// requestAnimationFrame creates a smooth loop based on browser frames.
	gameLoopId = requestAnimationFrame(gameLoop);
}

function endGame(didWin = false) {
	gameRunning = false;
	cancelAnimationFrame(gameLoopId);
	boss.classList.remove('damaged');
	if (bossDamageFlashTimeoutId) {
		clearTimeout(bossDamageFlashTimeoutId);
		bossDamageFlashTimeoutId = null;
	}
	bossMovementActive = false;
	bossAttackTimer = 0;
	bossMoveTimer = 0;
	shotCooldownTimeLeft = 0;
	clearPlayerShots();
	bossFireHint.classList.remove('visible');
	bossFireHint.setAttribute('aria-hidden', 'true');
	gameOverTitle.textContent = didWin ? 'Victory!' : 'Game Over';
	victoryMessage.classList.toggle('visible', didWin);

	const finalScore = Math.floor(score);
	finalScoreText.textContent = finalScore;
	const beatBestScore = finalScore > bestScore;

	if (beatBestScore) {
		bestScore = finalScore;
		localStorage.setItem(bestScoreKey, String(bestScore));
		newBestMessage.classList.add('visible');
	} else {
		newBestMessage.classList.remove('visible');
	}

	if (didWin) {
		launchConfettiCelebration();
	}

	bestScoreValue.textContent = bestScore;
	bestScoreText.textContent = bestScore;
	updateDecontaminationLock();
	gameOverOverlay.classList.add('visible');
}

function updateJourneyUI() {
	const progressPercent = (journeyProgressSeconds / journeyDurationSeconds) * 100;
	const clampedPercent = Math.min(maxJourneyProgress, Math.max(0, progressPercent));

	journeyFill.style.height = `${clampedPercent}%`;
	journeyMarker.style.bottom = `${clampedPercent}%`;
}

function enterBossArea() {
	if (bossEntranceAnimationId) {
		cancelAnimationFrame(bossEntranceAnimationId);
		bossEntranceAnimationId = null;
	}

	bossAreaReached = true;
	journeyProgressSeconds = journeyDurationSeconds;
	// Lock and immediately disable Hydromatic mode when the boss entrance begins.
	invincibleMode = false;
	modeTimeLeft = 0;
	superMeter = 0;
	gameArea.classList.remove('chaos');
	player.classList.remove('invincible');
	clearItems();
	spawnTimer = 0;
	updateJourneyUI();
	updateSuperMeterUI();
	bossMoveTimer = 0;
	bossMovementActive = false;
	boss.classList.remove('damaged');
	moveBossToLane(1);
	bossAttackTimer = 0;
	shotCooldownTimeLeft = 0;
	bossHealthBar.classList.remove('visible');
	bossHealthBar.setAttribute('aria-hidden', 'true');
	bossFireHint.classList.remove('visible');
	bossFireHint.setAttribute('aria-hidden', 'true');

	startBossEntranceWhenReady();
}

function startBossEntranceWhenReady() {
	const waitStartTime = performance.now();

	function waitForBossSprites(currentTime) {
		const waitedLongEnough = currentTime - waitStartTime >= bossSpriteWaitMaxMs;

		if (bossSpritesReady || waitedLongEnough) {
			bossEntranceAnimationId = null;
			startBossEntrance();
			return;
		}

		bossEntranceAnimationId = requestAnimationFrame(waitForBossSprites);
	}

	bossEntranceAnimationId = requestAnimationFrame(waitForBossSprites);
}

function beginBossFightAfterEntrance() {
	bossHealthBar.classList.add('visible');
	bossHealthBar.setAttribute('aria-hidden', 'false');
	bossFireHint.classList.add('visible');
	bossFireHint.setAttribute('aria-hidden', 'false');
	bossMoveTimer = 0;
	bossAttackTimer = 0;
	bossMovementActive = true;
}

function startBossEntrance() {
	boss.classList.add('appearing');
	boss.style.top = `${bossEntranceStartY}px`;

	const entranceStartTime = performance.now();

	function animateBossEntrance(currentTime) {
		const elapsed = currentTime - entranceStartTime;
		const progress = Math.min(1, elapsed / bossEntranceDurationMs);
		const currentTop = bossEntranceStartY + (bossEntranceEndY - bossEntranceStartY) * progress;

		// Move boss from top to battle row with simple linear position updates.
		boss.style.top = `${currentTop}px`;

		if (progress < 1) {
			bossEntranceAnimationId = requestAnimationFrame(animateBossEntrance);
			return;
		}

		boss.style.top = `${bossEntranceEndY}px`;
		bossEntranceAnimationId = null;
		beginBossFightAfterEntrance();
	}

	bossEntranceAnimationId = requestAnimationFrame(animateBossEntrance);
}

function resetBestScore() {
	bestScore = 0;
	localStorage.setItem(bestScoreKey, '0');

	bestScoreValue.textContent = '0';
	bestScoreText.textContent = '0';
	updateDecontaminationLock();
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
	const fallDistance = Math.max(320, gameArea.clientHeight - 130);

	for (let i = 0; i < pieceCount; i += 1) {
		const confetti = document.createElement('div');
		confetti.className = 'confetti-piece';
		confetti.style.left = `${Math.random() * 100}%`;
		confetti.style.backgroundColor = confettiColors[Math.floor(Math.random() * confettiColors.length)];
		confetti.style.animationDuration = `${1.8 + Math.random() * 1.4}s`;
		confetti.style.animationDelay = `${Math.random() * 0.18}s`;
		confetti.style.setProperty('--drift', `${-90 + Math.random() * 180}px`);
		confetti.style.setProperty('--fall-distance', `${fallDistance}px`);

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
	if (bossAreaReached) {
		meterFill.style.width = '0%';
		meterFill.classList.remove('full');
		meterLabel.textContent = 'Hydromatic Locked';
		modeStatus.textContent = 'Boss Fight';
		return;
	}

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
	const gameHeight = gameArea.clientHeight;
	const playerBottom = Number.parseFloat(window.getComputedStyle(player).bottom) || 18;
	const playerTop = gameHeight - playerBottom - player.offsetHeight;
	const popupTop = Math.max(16, playerTop - 22);

	const popup = document.createElement('div');
	popup.className = 'score-popup';

	if (popupType !== 'normal') {
		popup.classList.add(popupType);
	}

	popup.textContent = text;
	popup.style.left = `${lanePercent[lane]}%`;
	popup.style.top = `${popupTop}px`;
	popup.style.transform = 'translateX(-50%)';

	gameArea.appendChild(popup);

	// Remove popup after animation so the DOM stays clean.
	setTimeout(() => {
		popup.remove();
	}, 700);
}

function playPointSound(pitchMultiplier = 1) {
	if (!pointAudioContext) {
		pointAudioContext = new window.AudioContext();
	}

	if (pointAudioContext.state === 'suspended') {
		pointAudioContext.resume();
	}

	const startTime = pointAudioContext.currentTime;
	const volume = pointAudioContext.createGain();
	const firstNote = pointAudioContext.createOscillator();
	const secondNote = pointAudioContext.createOscillator();

	// Two quick notes make a cheerful "point earned" chime.
	firstNote.type = 'triangle';
	secondNote.type = 'sine';
	firstNote.frequency.setValueAtTime(740 * pitchMultiplier, startTime);
	secondNote.frequency.setValueAtTime(988 * pitchMultiplier, startTime + 0.07);

	volume.gain.setValueAtTime(0.0001, startTime);
	volume.gain.exponentialRampToValueAtTime(0.14, startTime + 0.01);
	volume.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.22);

	firstNote.connect(volume);
	secondNote.connect(volume);
	volume.connect(pointAudioContext.destination);

	firstNote.start(startTime);
	firstNote.stop(startTime + 0.12);
	secondNote.start(startTime + 0.07);
	secondNote.stop(startTime + 0.22);
}

function playGameOverSound() {
	if (!gameOverAudioContext) {
		gameOverAudioContext = new window.AudioContext();
	}

	if (gameOverAudioContext.state === 'suspended') {
		gameOverAudioContext.resume();
	}

	const startTime = gameOverAudioContext.currentTime;
	const volume = gameOverAudioContext.createGain();
	const tone = gameOverAudioContext.createOscillator();

	// A short downward tone gives a clear game-over cue.
	tone.type = 'sawtooth';
	tone.frequency.setValueAtTime(360, startTime);
	tone.frequency.exponentialRampToValueAtTime(120, startTime + 0.45);

	volume.gain.setValueAtTime(0.0001, startTime);
	volume.gain.exponentialRampToValueAtTime(0.16, startTime + 0.02);
	volume.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.45);

	tone.connect(volume);
	volume.connect(gameOverAudioContext.destination);

	tone.start(startTime);
	tone.stop(startTime + 0.45);
}

function handleCollision(itemIndex) {
	const item = items[itemIndex];
	const pointMultiplier = frenzyModeEnabled ? frenzyPointMultiplier : 1;

	if (item.type === 'clean') {
		score += 10 * pointMultiplier;
		if (!bossAreaReached) {
			superMeter += 25;
		}
		createScorePopup(`+${10 * pointMultiplier}`, item.lane);
		playPointSound();

		if (superMeter >= superMeterMax && !invincibleMode && !bossAreaReached) {
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
		// Green drop uses the same chime, but with a deeper pitch.
		playPointSound(0.7);

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
			playGameOverSound();
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
	const journeyRateMultiplier = invincibleMode ? hydroJourneyBoost : 1;

	if (shotCooldownTimeLeft > 0) {
		shotCooldownTimeLeft -= deltaTime;
		if (shotCooldownTimeLeft < 0) {
			shotCooldownTimeLeft = 0;
		}
	}

	if (tsunamiModeEnabled && !bossAreaReached) {
		journeyProgressSeconds += deltaTime * journeyRateMultiplier;

		if (journeyProgressSeconds >= journeyDurationSeconds) {
			enterBossArea();
		}
	}

	updateJourneyUI();

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
	if (!bossAreaReached) {
		spawnTimer += deltaTime;
		if (spawnTimer >= spawnInterval) {
			spawnItem();
			spawnTimer = 0;
		}
	}

	if (bossAreaReached && bossMovementActive) {
		bossMoveTimer += deltaTime;
		bossAttackTimer += deltaTime;

		if (bossMoveTimer >= bossMoveIntervalSeconds) {
			moveBossToRandomLane();
			bossMoveTimer = 0;
		}

		if (bossAttackTimer >= bossPhaseOneAttackIntervalSeconds) {
			spawnBossAttackDrop();
			bossAttackTimer = 0;
		}
	}

	// Move every item downward.
	for (let i = items.length - 1; i >= 0; i -= 1) {
		const item = items[i];
		const gameHeight = gameArea.clientHeight;
		const playerBottom = Number.parseFloat(window.getComputedStyle(player).bottom) || 18;
		const playerTop = gameHeight - playerBottom - player.offsetHeight;
		const playerBottomY = gameHeight - playerBottom;
		const itemHeight = item.element.offsetHeight || 54;

		// Every step interval, speed increases by 25%.
		const speedSteps = Math.floor(gameTimeSeconds / speedStepSeconds);
		const progressiveMultiplier = Math.min(
			1 + speedSteps * speedIncreasePerStep,
			maxProgressiveSpeedMultiplier
		);

		const chaosMultiplier = invincibleMode ? 1.9 : 1;
		item.y += item.speed * progressiveMultiplier * chaosMultiplier * runSpeedMultiplier * deltaTime;
		item.element.style.top = `${item.y}px`;

		// Check collision when the item overlaps the player's vertical space.
		const itemBottom = item.y + itemHeight;
		const nearPlayer = itemBottom >= playerTop && item.y <= playerBottomY;
		if (nearPlayer && item.lane === playerLane) {
			handleCollision(i);
			continue;
		}

		// Remove items that leave the visible game area.
		if (item.y > gameHeight + itemHeight) {
			item.element.remove();
			items.splice(i, 1);
		}
	}

	for (let i = playerShots.length - 1; i >= 0; i -= 1) {
		const shot = playerShots[i];

		shot.y -= shot.speed * deltaTime;
		shot.element.style.top = `${shot.y}px`;

		if (shot.y < -40) {
			shot.element.remove();
			playerShots.splice(i, 1);
			continue;
		}

		if (!bossMovementActive) {
			continue;
		}

		const shotRect = shot.element.getBoundingClientRect();
		const bossRect = boss.getBoundingClientRect();
		const hitBoss =
			shotRect.left < bossRect.right &&
			shotRect.right > bossRect.left &&
			shotRect.top < bossRect.bottom &&
			shotRect.bottom > bossRect.top;

		if (hitBoss) {
			shot.element.remove();
			playerShots.splice(i, 1);
			boss.classList.add('damaged');

			if (bossDamageFlashTimeoutId) {
				clearTimeout(bossDamageFlashTimeoutId);
			}

			bossDamageFlashTimeoutId = setTimeout(() => {
				boss.classList.remove('damaged');
				bossDamageFlashTimeoutId = null;
			}, bossDamageFlashDurationMs);
			bossHealth -= bossDamagePerShot;
			updateBossHealthUI();

			if (bossHealth <= 0) {
				bossHealth = 0;
				updateBossHealthUI();
				endGame(true);
				return;
			}
		}
	}

	gameLoopId = requestAnimationFrame(gameLoop);
}

function clearItems() {
	items.forEach((item) => item.element.remove());
	items = [];
	clearPlayerShots();

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

	if (event.code === 'Space') {
		event.preventDefault();
		firePlayerShot();
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
tsunamiToggleStart.addEventListener('change', (event) => {
	setTsunamiMode(event.target.checked);
});
tsunamiToggleGameOver.addEventListener('change', (event) => {
	setTsunamiMode(event.target.checked);
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

