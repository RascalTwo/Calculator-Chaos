const screens = {
	loading: {
		screen: document.getElementById('loading-screen'),
		progress: document.getElementById('loading-progress')
	},
	main: {
		screen: document.getElementById('main-screen'),
		levelSelect: document.getElementById('level-select'),
		beginButton: document.getElementById('begin-level-button'),
	},
	game: {
		screen: document.getElementById('game-screen'),
		levelMinutes: document.getElementById('level-minutes'),
		goals: document.getElementById('goals'),
		helpButton: document.getElementById('help-button'),
		levelNumbers: Array.from(document.querySelectorAll('.level-number')),
		calculator: {
			memoryIndicator: document.getElementById('memory-indicator'),
			output: document.getElementById('calculator-output'),
			buttons: Array.from(document.querySelectorAll('#calculator td')).reduce((map, td) => {
				if (td.textContent === '') return map;

				td.addEventListener('click', buttonPressed);
				map[td.textContent] = td;
				return map;
			}, {})
		},
		beginButton: document.getElementById('begin-button'),
		resetButton: document.getElementById('reset-button'),
		againButtons: Array.from(document.querySelectorAll('.again-button')),
		timeRemainings: Array.from(document.querySelectorAll('.time-remaining')),
		helpModal: document.getElementById('help-modal'),
		helpClose: document.getElementById('help-close'),
		runningElements: Array.from(document.querySelectorAll('.game-running')),
		lostElements: Array.from(document.querySelectorAll('.game-lost')),
	},
	won: {
		screen: document.getElementById('won-screen')
	},
	active: null
};
screens.active = screens.loading;

const lastNumberRegex = /\s*-?\d*(\.\d*)?$/;

const game = {
	playing: false,
	started: null,
	remaining: [],
	timer: null
};

const calculator = {
	memory: 0,
	output: '',
	expression: ''
};

function buttonPressed(event){
	if (!game.playing) return;

	let td = event.target;
	while (td.tagName !== 'TD'){
		td = td.parentNode;
	}

	performCalculation(td.textContent);
	screens.game.calculator.output.value = calculator.output

	screens.game.calculator.memoryIndicator.style.display = calculator.memory === 0 ? 'none' : 'inline-block';

	const goalIndex = game.remaining.findIndex(goal => goal == calculator.output);
	if (goalIndex === -1) return;

	game.remaining.splice(goalIndex, 1);

	const goalTd = Array.from(document.querySelectorAll('.goal')).find(goal => goal.textContent == calculator.output);
	
	goalTd.classList.add('strikeout');

	if (game.remaining.length > 0) return;

	stopGame();
}

function performCalculation(rawValue){
	const conversions = {
		'×': '*',
		'÷': '/',
		'−': '-',
		'√': 'SQRT'
	};
	const value = conversions[rawValue] ? conversions[rawValue] : rawValue;
	if (!isNaN(parseInt(value))){
		calculator.output += value;
		calculator.expression += value;
		return;
	}

	if (['+', '-', '*', '/'].includes(value)){
		if (calculator.output.slice(-1) === '.') return;
		calculator.output += value;
		calculator.expression += value;
		return;
	}

	const lastNumber = calculator.output.match(lastNumberRegex);
	switch(value){
		case '.':
			if (!lastNumber[0]) return;
			if (lastNumber[0].includes('.')) return;
			calculator.output += value;
			calculator.expression += value;
			break;
		case 'AC':
			calculator.output = '';
			calculator.expression = '';
			break;
		case 'Min':
			calculator.memory = parseFloat(calculator.output);
			break;
		case 'M+':
			calculator.memory += parseFloat(calculator.output);
			break;
		case 'M-':
			calculator.memory -= parseFloat(calculator.output);
			break;
		case 'MR':
			performCalculation(calculator.memory);
			break;
		case 'SQRT':
			calculator.expression = `Math.sqrt(${calculator.expression})`;
			calculator.output = eval(calculator.expression).toString();
			break;
		case 'X2':
			calculator.expression = `(${calculator.expression}**2)`;
			calculator.output = (parseFloat(calculator.output)**2).toString()
			break;
		case '+/-':
			calculator.output = calculator.output.replace(lastNumberRegex, ' ' + (parseFloat(lastNumber[0]) * -1).toString())
			calculator.expression = `(${calculator.expression} * -1)`;
			break;
		case '=':
			calculator.output = eval(calculator.expression).toString();
			calculator.expression = calculator.output;
			break;
	}
}

const levels = [
	{
		number: 1,
		goals: [6, 12, 7, 15, 8, 20, 10, 50],
		buttons: ['AC', '×', '2', '3', '+', '='],
		seconds: 240
	},
	{
		number: 2,
		goals: [-10, 24, 1, 32, 3, 100, 10, 625],
		buttons: ['Min', 'MR', 'AC', '5', '×', '2', '−', '='],
		seconds: 180
	},
	{
		number: 3,
		goals: [-10, 24, 1, 32, 3, 100, 10, 625],
		buttons: ['8', 'AC', '6', '1', '√', '√', '='],
		seconds: 300
	},
	{
		number: 4,
		goals: [3, 7, 4, 8, 5, 9, 6, 10],
		buttons: ['Min', 'MR', '÷', 'AC', '×', '1', '2', '0', '='],
		seconds: 180
	}
]

let currentLevel;

screens.main.beginButton.addEventListener('click', event => {
	const level = levels[screens.main.levelSelect.value - 1];
	setupLevel(level);
	loadingScreen(2500, screens.game);
});

screens.game.resetButton.addEventListener('click', returnToMainMenu);

screens.game.againButtons.forEach(element => element.addEventListener('click', returnToMainMenu));

screens.game.beginButton.addEventListener('click', () => {
	game.playing = true;
	game.started = Date.now();
	game.remaining = currentLevel.goals;
	game.timer = setInterval(updateTimer, 1000);
});

screens.game.helpButton.addEventListener('click', () => {
	screens.game.helpModal.style.display = 'block';
});

screens.game.helpClose.addEventListener('click', () => {
	screens.game.helpModal.style.display = 'none';
});

function updateTimer(){
	const secondsRemaining = parseInt(((game.started + (currentLevel.seconds * 1000)) - Date.now()) / 1000);
	if (secondsRemaining <= 0){
		return stopGame();
	}

	let seconds = secondsRemaining % 60;
	if (seconds < 10){
		seconds = '0' + seconds;
	}
	screens.game.timeRemainings.forEach(element => element.textContent = `${parseInt(secondsRemaining / 60)}:${seconds}`);
}

function stopGame(){
	game.playing = false;
	clearInterval(game.timer);

	const won = game.remaining.length === 0;
	if (won){
		loadingScreen(2500, screens.won);
	}
	else{
		screens.game.runningElements.forEach(element => element.style.display = 'none');
		screens.game.lostElements.forEach(element => element.style.display = 'block');
	}
}

function returnToMainMenu(){
	screens.main.levelSelect.value = 1;
	loadingScreen(2500, screens.main);
}

function setActiveScreen(screen){
	screens.active.screen.classList.remove('active');
	screen.screen.classList.add('active');
	screens.active = screen;
}

function loadingScreen(ms, nextScreen){
	setActiveScreen(screens.loading);
	return new Promise(resolve => setTimeout(resolve, ms)).then(() => setActiveScreen(nextScreen));
}

function setupLevel(level){
	currentLevel = level;
	
	Object.entries(screens.game.calculator.buttons).forEach(entry => {
		if (entry[0] === 'M') return;
		entry[1].classList[level.buttons.includes(entry[0]) ? 'remove' : 'add']('disabled');
	});
	
	screens.game.levelNumbers.forEach(element => element.textContent = level.number);

	screens.game.levelMinutes.textContent = level.seconds / 60;
	screens.game.goals.innerHTML = '';
	for (let i = 0; i < level.goals.length; i += 2){
		const row = document.createElement('tr');
		for (let j = 0; j < 2; j++){
			const goal = document.createElement('td');
			goal.classList.add('goal');
			goal.textContent = level.goals[i + j];
	
			row.appendChild(goal);
		}
		screens.game.goals.appendChild(row);
	}

	screens.game.runningElements.forEach(element => element.style.display = 'black');
	screens.game.lostElements.forEach(element => element.style.display = 'none');
}

function start(){
	screens.main.levelSelect.appendChild(levels.reduce((fragment, level) => {
		const option = document.createElement('option');
		option.textContent = `Level ${level.number}`;
		option.value = level.number;

		fragment.appendChild(option);
		return fragment;
	}, document.createDocumentFragment()));

	loadingScreen(2500, screens.main).then(() => {
	});
}

start();