// ————————————————————————————————————————————————————————————————————————————————
// Загальні налаштування
// ————————————————————————————————————————————————————————————————————————————————
// типи відповіді 
const TYPE_NUM = 1 // число
const TYPE_OPT = 2 // набір варіантів
const TYPE_STR = 3 // рядок тексту (потрібен повний збіг)
const TYPE_TXT = 4 // вільний багаторядковий текст (потрібна перевірка відповіді людиною)

// Лічильник часу — ідентифікатор
let timer_id

// Залишкова тривалість тесту
let time_remaining

// Часто вживані DOM-елементи
const BLOCK_START = document.getElementById('start-wrapper')
const BLOCK_MATHTEST = document.getElementById('mathtest-wrapper')
const BLOCK_QUESTIONS = document.getElementById('questions-wrapper')
const BLOCK_RESULT = document.getElementById('result-wrapper')
const BTN_END = document.getElementById('btn-end')
const TIME_TXT = document.getElementById('remainingtime-text')
const TIME_PRO = document.getElementById('remainingtime-progress')
const DIVS_SCORE = document.querySelectorAll('#score-points, #score-fraction')
const TPL_QUESTION = document.getElementById('tpl-question')
const TPL_ANSWERFIELDS = {
	1: document.getElementById('tpl-answerfield-num'),
	2: document.getElementById('tpl-answerfield-opt'),
	3: document.getElementById('tpl-answerfield-str'),
	4: document.getElementById('tpl-answerfield-txt'),
}

// ————————————————————————————————————————————————————————————————————————————————
// Налаштування конкретного тесту
// 
// questions — масив питань
// елемент questions — об’єкт із властивостями: 
//  question — текст питання
//  answertype — тип відвіповіді (число, простий текст, складний текст, набір опцій)
//  correctanswer — правильна відповідь (на робочому сайті до показу результатів має залишатися на боці сервера)
//  points — очки за правильну відповідь
// 
// time — ліміт часу на проходження тесту, секунд 
// 
// requiredscore — частка очок, які потрібно набрати для успіху
// ————————————————————————————————————————————————————————————————————————————————
let テスト = {
	time: 60,
	requiredscore: .95,
	questions: [
		{
			question: '2 + 2 = ?',
			answertype: TYPE_NUM,
			correctanswer: 4,
			points: 1,
		},
		{
			question: '2 - 2 = ?',
			answertype: TYPE_NUM,
			correctanswer: 0,
			points: 1,
		},
		{
			question: '2 * 2 = ?',
			answertype: TYPE_OPT,
			correctanswer: 4,
			answeroptions: [
				3,
				4,
				5
			],
			points: 1,
		},
		{
			question: 'Написати 4 текстом',
			answertype: TYPE_STR,
			correctanswer: 'чотири',	// Тільки малі літери!
			points: 2,
		},
	]
}

// ————————————————————————————————————————————————————————————————————————————————
// "Краса" оформлення HTML vs Cтворення зайвого елемента у JS (я додаю перенос рядка після <template>, який JS читає як текстовий елемент. Цей елемент нам не потрібен)
// ————————————————————————————————————————————————————————————————————————————————
document.querySelectorAll('template').forEach(el => el.innerHTML = el.innerHTML.trim())

// ————————————————————————————————————————————————————————————————————————————————
// Оформлення: Секунди => MM:SS
// ————————————————————————————————————————————————————————————————————————————————
function formatTime(seconds) {
	if (seconds < 0) seconds = 0
	var m = Math.floor(seconds / 60) 
	var s = seconds - m * 60
	return (m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s)
}


// ————————————————————————————————————————————————————————————————————————————————
// Лічильник залишкового часу
// ————————————————————————————————————————————————————————————————————————————————
function updateRemainingTime() {
	time_remaining--
	var perc_remaining = Math.round(100 * time_remaining / テスト.time)
	TIME_TXT.innerText = formatTime(time_remaining)
	TIME_PRO.style.width = perc_remaining + '%'
	if (perc_remaining < 50) {
		TIME_TXT.classList.add('bg-warning')
		TIME_PRO.classList.add('bg-warning')
	} 
	if (perc_remaining < 20) {
		TIME_TXT.classList.remove('bg-warning')
		TIME_TXT.classList.add('bg-danger')
		TIME_PRO.classList.remove('bg-warning')
		TIME_PRO.classList.add('bg-danger')
	}
	if (time_remaining <= 0) endMathTest()
}


// ————————————————————————————————————————————————————————————————————————————————
// Почати тест
// ————————————————————————————————————————————————————————————————————————————————
function startMathTest(){
	// Не запускати, якщо уже запущений
	if (timer_id) {
		alert('Тест уже запущений')
		return false
	}

	// Змінені налаштування
	テスト.time = parseInt(document.getElementById('timeout-mins').value) * 60 + parseInt(document.getElementById('timeout-secs').value)
	テスト.requiredscore = parseInt(document.getElementById('requiredscore').value) / 100
	try {
		テスト.questions = JSON.parse(document.getElementById('input-questions').value)
	} catch (e) {
		alert('Неправильні JSON-дані у полі вводу питань')
		return 
	}

	// Показ питань
	var maxpoints = テスト.questions.reduce((a, b) => a + b.points, 0)
	テスト.questions.forEach((item, i) => {
		var que_wrapper = TPL_QUESTION.content.cloneNode(true)
		que_wrapper.querySelector('[data-n]').innerText = 'Питання ' + (i + 1) + ' з ' + テスト.questions.length
		que_wrapper.querySelector('[data-question]').innerText = item.question
		que_wrapper.querySelector('[data-points]').innerText = 'Очки: ' + item.points + ' з ' + maxpoints
		que_wrapper.querySelector('.card').id = 'question-' + i
		if (item.answertype === TYPE_NUM || item.answertype === TYPE_STR || item.answertype === TYPE_TXT) {
			var inp = TPL_ANSWERFIELDS[item.answertype].content.cloneNode(true)
			inp.querySelector('input').name = 'answer-' + i
			que_wrapper.querySelector('[data-answer]').appendChild(inp)
		} else if (item.answertype === TYPE_OPT) {
			item.answeroptions.forEach((opt, j) => {
				var opt_wrapper = TPL_ANSWERFIELDS[item.answertype].content.cloneNode(true)
				var inp = opt_wrapper.querySelector('input')
				inp.value = opt
				inp.id = 'option-' + i + '-' + j
				inp.name = 'answer-' + i
				var lbl = opt_wrapper.querySelector('label')
				lbl.innerText = opt
				lbl.htmlFor = inp.id
				que_wrapper.querySelector('[data-answer]').appendChild(opt_wrapper)
			})
		}
		BLOCK_QUESTIONS.appendChild(que_wrapper)
	})

	// Latex-формат
	renderMathInElement(BLOCK_QUESTIONS, {
		delimiters: [
			{left: '$$', right: '$$', display: true},
			{left: '$', right: '$', display: true},
			{left: '\\(', right: '\\)', display: false},
			{left: '\\[', right: '\\]', display: true}
		],
		throwOnError : false
	})

	// Тривалість
	time_remaining = テスト.time
	document.getElementById('remainingtime-text').innerText = formatTime(time_remaining)
	timer_id = setInterval(updateRemainingTime, 1000)

	// 
	BLOCK_START.style.display = 'none'
	BLOCK_MATHTEST.style.display = ''
}

// ————————————————————————————————————————————————————————————————————————————————
// Кінець тесту
// ————————————————————————————————————————————————————————————————————————————————
function endMathTest() {
	if (!confirm('Ви дійсно бажаєте закінчити тест?')) return false

	// Скидаємо таймер
	if (timer_id) {
		clearInterval(timer_id)
		timer_id = false
	}

	// Рахуємо очки
	let points = 0 // Набрані користувачем очки
	let maxpoints = 0 // Максимальні можливі очки
	テスト.questions.forEach((item, i) => {
		// Відповідь користувача
		var answer
		var is_correct
		if (item.answertype === TYPE_OPT) {
			var el_checked = document.querySelector('[name="answer-'+i+'"]:checked')
			answer = el_checked ? el_checked.value : null
			is_correct = answer == item.correctanswer
		} else if (item.answertype === TYPE_NUM) {
		 	answer = parseFloat(document.querySelector('[name="answer-'+i+'"]').value.trim())
			is_correct = answer === item.correctanswer
		} else {
		 	answer = document.querySelector('[name="answer-'+i+'"]').value.trim().toLowerCase()
			is_correct = answer === item.correctanswer
		}

		// Додаємо очки і оформлення картки питання
		if (is_correct) {
			points += item.points
			document.getElementById('question-' + i).querySelector('.card-header').classList.add('text-white', 'bg-success')
			document.getElementById('question-' + i).querySelector('[data-answer]').innerHTML = 'Ваша відповідь: <b class="text-success">' + answer + '</b>'
		} else {
			document.getElementById('question-' + i).querySelector('.card-header').classList.add('text-white', 'bg-danger')
			document.getElementById('question-' + i).querySelector('[data-answer]').innerHTML = 'Ваша відповідь: <b class="text-danger">' + answer + '</b>. Правильна відповідь: <b class="">' + item.correctanswer + '</b>'
		}
		maxpoints += item.points
	})

	// Показ результату
	document.getElementById('score-fraction').innerText = Math.round(100 * points / maxpoints) / 100
	document.getElementById('requiredscore-fraction').innerText = テスト.requiredscore
	document.getElementById('score-points').innerText = points
	document.getElementById('requiredscore-points').innerText = Math.round(テスト.requiredscore * maxpoints)
	document.getElementById('maxscore-points').innerText = maxpoints

	// Статус 
	var PASSED = points / maxpoints >= テスト.requiredscore
	DIVS_SCORE.forEach(el => el.classList.add(PASSED ? 'bg-success' : 'bg-danger'))

	BTN_END.closest('div').style.visibility = 'hidden'
	BLOCK_RESULT.style.display = ''
	TIME_PRO.classList.remove('progress-bar-striped', 'progress-bar-animated')

	BLOCK_RESULT.scrollIntoView()
}

// ————————————————————————————————————————————————————————————————————————————————
// Скасування проходження тесту
// ————————————————————————————————————————————————————————————————————————————————
function resetMathTest() {
	if (!confirm('Ви дійсно бажаєте скинути тест?')) return false

	// Скидаємо таймер
	if (timer_id) {
		clearInterval(timer_id)
		timer_id = false
	}

	BLOCK_START.style.display = ''
	BLOCK_MATHTEST.style.display = 'none'
	TIME_TXT.innerText = ''
	TIME_PRO.style.width = '100%'
	TIME_TXT.classList.remove('bg-warning', 'bg-danger')
	TIME_PRO.classList.remove('bg-warning', 'bg-danger')
	BLOCK_QUESTIONS.innerHTML = ''
	BTN_END.closest('div').style.visibility = 'visible'
	BLOCK_RESULT.style.display = 'none'
}

// ————————————————————————————————————————————————————————————————————————————————
// Початкові дії
// ————————————————————————————————————————————————————————————————————————————————
BLOCK_MATHTEST.style.display = 'none'
BLOCK_RESULT.style.display = 'none'
document.getElementById('btn-start').onclick = startMathTest
document.getElementById('btn-end').onclick = endMathTest
document.querySelectorAll('[data-reset]').forEach(el => el.onclick = resetMathTest)

document.getElementById('timeout-mins').value = Math.floor(テスト.time / 60)
document.getElementById('timeout-secs').value = テスト.time - Math.floor(テスト.time / 60) * 60
document.getElementById('requiredscore').value = テスト.requiredscore * 100
document.getElementById('input-questions').value = JSON.stringify(テスト.questions)
