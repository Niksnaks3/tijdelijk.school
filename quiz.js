const questions = [
    {
        question: "Waar staat TUI voor?",
        options: ["Text User Interface", "Terminal User Input", "Technical User Interface", "Textual Unit Interface"],
        correct: 0
    },
    {
        question: "Welke programmeertalen zitten standaard 'gebakken' in de Linux terminal?",
        options: ["Bash en Rust", "Python en Java", "C# en Swift", "HTML en CSS"],
        correct: 0
    },
    {
        question: "Hoeveel bits is één byte?",
        options: ["4", "8", "16", "32"],
        correct: 1
    },
    {
        question: "Waar is macOS op gebaseerd?",
        options: ["Unix", "DOS"],
        correct: 0
    },
    {
        question: "Wat doet een compiler?",
        options: ["Vertaalt programmeertaal naar binaire code voor de CPU", "Maakt de code korter"],
        correct: 0
    },
    {
        question: "Welke kwam eerder uit?",
        options: ["Mac OS (System 1.0)", "Windows 1.0"],
        correct: 0
    },
    {
        question: "Wat is de CPU-kloksnelheid?",
        options: ["De snelheid van de processor", "De snelheid van de klok op je computer"],
        correct: 0
    },
    {
        question: "Heb je per se een GPU nodig in een computer?",
        options: ["Ja", "Nee"],
        correct: 1
    },
    {
        question: "In welke programmeertaal is de Linux-kernel voornamelijk geschreven?",
        options: ["Python", "C", "Java", "Assembly"],
        correct: 1
    },
    {
        question: "Wat betekent het commando sudo in Linux?",
        options: ["Shut Down Operation", "System Update Download", "Super User Do", "Secure User Docs"],
        correct: 2
    }
];

let currentQuestion = 0;
let answers = new Array(questions.length).fill(null);

const playerName = localStorage.getItem('playerName');
const playerIcon = localStorage.getItem('playerIcon');

if (!playerName || !playerIcon) {
    window.location.href = 'index.html';
}

document.getElementById('playerNameDisplay').textContent = playerName;
document.getElementById('playerIcon').src = playerIcon;

function loadQuestion() {
    const container = document.getElementById('questionContainer');
    const question = questions[currentQuestion];
    
    container.innerHTML = `
        <div class="question-container">
            <div class="question-number">Vraag ${currentQuestion + 1} van ${questions.length}</div>
            <div class="question-text">${question.question}</div>
            <div class="options">
                ${question.options.map((option, index) => `
                    <div class="option ${answers[currentQuestion] === index ? 'selected' : ''}" 
                         onclick="selectOption(${index})"
                         data-index="${index}">
                        <span class="option-letter">${String.fromCharCode(65 + index)}</span>
                        <span>${option}</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    updateProgress();
    updateNavigation();
}

function selectOption(index) {
    answers[currentQuestion] = index;
    
    document.querySelectorAll('.option').forEach(option => {
        option.classList.remove('selected');
    });
    
    document.querySelector(`[data-index="${index}"]`).classList.add('selected');
}

function updateProgress() {
    const progress = ((currentQuestion + 1) / questions.length) * 100;
    document.getElementById('progressFill').style.width = progress + '%';
}

function updateNavigation() {
    document.getElementById('prevBtn').disabled = currentQuestion === 0;
    document.getElementById('nextBtn').disabled = currentQuestion === questions.length - 1;
    
    const submitBtn = document.getElementById('submitBtn');
    if (currentQuestion === questions.length - 1) {
        submitBtn.classList.remove('hidden');
    } else {
        submitBtn.classList.add('hidden');
    }
}

function nextQuestion() {
    if (currentQuestion < questions.length - 1) {
        currentQuestion++;
        loadQuestion();
    }
}

function prevQuestion() {
    if (currentQuestion > 0) {
        currentQuestion--;
        loadQuestion();
    }
}

async function submitQuiz() {
    const answeredCount = answers.filter(a => a !== null).length;

    if (answeredCount < questions.length) {
        const unanswered = questions.length - answeredCount;
        if (!confirm(`Je hebt nog ${unanswered} vraag${unanswered > 1 ? 'en' : ''} niet beantwoord. Wil je toch inleveren?`)) {
            return;
        }
    }

    let score = 0;
    for (let i = 0; i < questions.length; i++) {
        if (answers[i] === questions[i].correct) {
            score++;
        }
    }

    const result = {
        name: playerName,
        icon: playerIcon,
        score: score,
        total: questions.length,
        date: new Date().toLocaleString('nl-NL'),
        answers: answers
    };

    try {
        const response = await fetch('/api/results', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(result)
        });
        if (!response.ok) {
            throw new Error('Server fout');
        }
    } catch (err) {
        alert('Kon resultaat niet opslaan: ' + err.message);
        return;
    }

    sessionStorage.setItem('lastResult', JSON.stringify(result));
    window.location.href = 'results.html';
}

loadQuestion();
