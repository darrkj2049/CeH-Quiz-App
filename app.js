// Quiz Application State Management
import { questionBank } from './questions.js'; 

class QuizApp {
    constructor() {
        this.questions = questionBank; // Load questions from the external file
            

        this.currentState = {
            mode: 'practice',
            questionIndex: 0,
            selectedQuestions: [],
            userAnswers: {},
            bookmarkedQuestions: new Set(),
            incorrectQuestions: new Set(),
            startTime: null,
            timeLimit: null,
            timerInterval: null,
            showFeedback: false
        };

        this.sessionStats = {
            totalQuestions: 0,
            completedQuestions: 0,
            correctAnswers: 0,
            sessionScore: 0
        };

        this.init();
    }

    init() {
        this.bindEvents();
        this.updateHomeStats();
        this.showScreen('home-screen');
    }

    bindEvents() {
        // Home screen events
        document.querySelectorAll('.mode-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const mode = card.dataset.mode;
                this.selectQuizMode(mode);
            });
        });

        document.querySelectorAll('.mode-card .btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const mode = btn.closest('.mode-card').dataset.mode;
                this.startQuiz(mode);
            });
        });

        // Quiz settings
        document.getElementById('question-count').addEventListener('change', () => {
            this.updateHomeStats();
        });

        // Quiz screen events
        document.getElementById('prev-btn').addEventListener('click', () => {
            this.previousQuestion();
        });

        document.getElementById('next-btn').addEventListener('click', () => {
            this.nextQuestion();
        });

        document.getElementById('bookmark-btn').addEventListener('click', () => {
            this.toggleBookmark();
        });

        document.getElementById('quit-quiz').addEventListener('click', () => {
            this.quitQuiz();
        });

        document.getElementById('show-navigator').addEventListener('click', () => {
            this.showQuestionNavigator();
        });

        // Results screen events
        document.getElementById('review-incorrect').addEventListener('click', () => {
            this.startReviewMode();
        });

        document.getElementById('retake-quiz').addEventListener('click', () => {
            this.retakeQuiz();
        });

        document.getElementById('home-btn').addEventListener('click', () => {
            this.goHome();
        });

        // Modal events
        document.getElementById('close-navigator').addEventListener('click', () => {
            this.hideQuestionNavigator();
        });

        document.getElementById('navigator-modal').addEventListener('click', (e) => {
            if (e.target.id === 'navigator-modal') {
                this.hideQuestionNavigator();
            }
        });
    }

    selectQuizMode(mode) {
        document.querySelectorAll('.mode-card').forEach(card => {
            card.classList.remove('selected');
        });
        
        document.querySelector(`[data-mode="${mode}"]`).classList.add('selected');
        this.currentState.mode = mode;

        // Show/hide timer setting for exam mode
        const timerSetting = document.getElementById('timer-setting');
        if (mode === 'exam') {
            timerSetting.style.display = 'flex';
        } else {
            timerSetting.style.display = 'none';
        }

        // Enable/disable review mode based on incorrect questions
        const reviewBtn = document.getElementById('review-btn');
        if (mode === 'review') {
            reviewBtn.disabled = this.currentState.incorrectQuestions.size === 0;
        }
    }

    startQuiz(mode) {
        this.currentState.mode = mode;
        this.currentState.questionIndex = 0;
        this.currentState.userAnswers = {};
        this.currentState.showFeedback = false;
        this.currentState.startTime = Date.now();

        // Prepare questions based on mode
        this.prepareQuestions();

        // Setup timer for exam mode
        if (mode === 'exam') {
            const timeLimit = parseInt(document.getElementById('time-limit').value);
            this.currentState.timeLimit = timeLimit * 60; // Convert to seconds
            this.startTimer();
        }

        this.showScreen('quiz-screen');
        this.displayQuestion();
        this.updateQuizUI();
    }

    prepareQuestions() {
        const questionCount = parseInt(document.getElementById('question-count').value) || this.questions.length;
        let questionsToUse = [...this.questions];

        if (this.currentState.mode === 'review') {
            questionsToUse = this.questions.filter(q => 
                this.currentState.incorrectQuestions.has(q.id)
            );
        } else if (this.currentState.mode === 'random') {
            questionsToUse = this.shuffleArray([...this.questions]);
        }

        this.currentState.selectedQuestions = questionsToUse.slice(0, questionCount > 0 ? questionCount : questionsToUse.length);
    }

    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    displayQuestion() {
        const question = this.currentState.selectedQuestions[this.currentState.questionIndex];
        if (!question) return;

        document.getElementById('question-text').textContent = question.question;
        
        const optionsContainer = document.getElementById('question-options');
        optionsContainer.innerHTML = '';

        Object.entries(question.options).forEach(([key, value]) => {
            const optionElement = document.createElement('div');
            optionElement.className = 'option';
            optionElement.dataset.option = key;
            
            optionElement.innerHTML = `
                <span class="option-label">${key}.</span>
                ${value}
            `;

            optionElement.addEventListener('click', () => {
                this.selectAnswer(key);
            });

            optionsContainer.appendChild(optionElement);
        });

        // Show previous answer if exists
        const userAnswer = this.currentState.userAnswers[question.id];
        if (userAnswer) {
            this.highlightSelectedAnswer(userAnswer);
            if (this.currentState.showFeedback) {
                this.showAnswerFeedback(question, userAnswer);
            }
        }

        this.updateBookmarkButton();
        this.hideFeedback();
    }

    selectAnswer(selectedOption) {
        const question = this.currentState.selectedQuestions[this.currentState.questionIndex];
        
        // Clear previous selections
        document.querySelectorAll('.option').forEach(opt => {
            opt.classList.remove('selected', 'correct', 'incorrect');
        });

        // Highlight selected answer
        this.highlightSelectedAnswer(selectedOption);
        
        // Store answer
        this.currentState.userAnswers[question.id] = selectedOption;
        
        // Show immediate feedback
        this.showAnswerFeedback(question, selectedOption);
        
        this.updateQuizUI();
    }

    highlightSelectedAnswer(selectedOption) {
        const selectedElement = document.querySelector(`[data-option="${selectedOption}"]`);
        if (selectedElement) {
            selectedElement.classList.add('selected');
        }
    }

    showAnswerFeedback(question, userAnswer) {
        const isCorrect = userAnswer === question.correct;
        
        // Highlight correct and incorrect answers
        document.querySelectorAll('.option').forEach(opt => {
            const optionKey = opt.dataset.option;
            if (optionKey === question.correct) {
                opt.classList.add('correct');
            } else if (optionKey === userAnswer && !isCorrect) {
                opt.classList.add('incorrect');
            }
        });

        // Show feedback message
        const feedbackSection = document.getElementById('feedback-section');
        const feedbackMessage = document.getElementById('feedback-message');
        const explanation = document.getElementById('explanation');

        feedbackMessage.textContent = isCorrect ? 
            '✓ Correct! Well done.' : 
            '✗ Incorrect. The correct answer is ' + question.correct + '.';
        
        feedbackMessage.className = `feedback-message ${isCorrect ? 'correct' : 'incorrect'}`;
        
        if (question.explanation) {
            explanation.textContent = question.explanation;
        } else {
            explanation.textContent = '';
        }

        feedbackSection.style.display = 'block';
        this.currentState.showFeedback = true;

        // Track incorrect answers
        if (!isCorrect) {
            this.currentState.incorrectQuestions.add(question.id);
        }
    }

    hideFeedback() {
        document.getElementById('feedback-section').style.display = 'none';
        this.currentState.showFeedback = false;
    }

    nextQuestion() {
        if (this.currentState.questionIndex < this.currentState.selectedQuestions.length - 1) {
            this.currentState.questionIndex++;
            this.displayQuestion();
            this.updateQuizUI();
        } else {
            this.finishQuiz();
        }
    }

    previousQuestion() {
        if (this.currentState.questionIndex > 0) {
            this.currentState.questionIndex--;
            this.displayQuestion();
            this.updateQuizUI();
        }
    }

    toggleBookmark() {
        const question = this.currentState.selectedQuestions[this.currentState.questionIndex];
        const bookmarkBtn = document.getElementById('bookmark-btn');
        const bookmarkIcon = document.getElementById('bookmark-icon');

        if (this.currentState.bookmarkedQuestions.has(question.id)) {
            this.currentState.bookmarkedQuestions.delete(question.id);
            bookmarkBtn.classList.remove('bookmarked');
            bookmarkIcon.textContent = '☆';
        } else {
            this.currentState.bookmarkedQuestions.add(question.id);
            bookmarkBtn.classList.add('bookmarked');
            bookmarkIcon.textContent = '★';
        }
    }

    updateBookmarkButton() {
        const question = this.currentState.selectedQuestions[this.currentState.questionIndex];
        const bookmarkBtn = document.getElementById('bookmark-btn');
        const bookmarkIcon = document.getElementById('bookmark-icon');

        if (this.currentState.bookmarkedQuestions.has(question.id)) {
            bookmarkBtn.classList.add('bookmarked');
            bookmarkIcon.textContent = '★';
        } else {
            bookmarkBtn.classList.remove('bookmarked');
            bookmarkIcon.textContent = '☆';
        }
    }

    updateQuizUI() {
        const currentIndex = this.currentState.questionIndex;
        const totalQuestions = this.currentState.selectedQuestions.length;
        
        // Update question counter
        document.getElementById('question-counter').textContent = 
            `Question ${currentIndex + 1} of ${totalQuestions}`;
        
        // Update progress bar
        const progress = ((currentIndex + 1) / totalQuestions) * 100;
        document.getElementById('progress-fill').style.width = `${progress}%`;
        document.getElementById('progress-text').textContent = `${Math.round(progress)}%`;
        
        // Update navigation buttons
        document.getElementById('prev-btn').disabled = currentIndex === 0;
        document.getElementById('next-btn').textContent = 
            currentIndex === totalQuestions - 1 ? 'Finish' : 'Next';
    }

    startTimer() {
        const timerElement = document.getElementById('timer');
        const timeRemainingElement = document.getElementById('time-remaining');
        
        timerElement.style.display = 'block';
        
        this.currentState.timerInterval = setInterval(() => {
            this.currentState.timeLimit--;
            
            const minutes = Math.floor(this.currentState.timeLimit / 60);
            const seconds = this.currentState.timeLimit % 60;
            
            timeRemainingElement.textContent = 
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            
            if (this.currentState.timeLimit <= 0) {
                this.finishQuiz();
            }
        }, 1000);
    }

    stopTimer() {
        if (this.currentState.timerInterval) {
            clearInterval(this.currentState.timerInterval);
            this.currentState.timerInterval = null;
        }
    }

    showQuestionNavigator() {
        const navigatorGrid = document.getElementById('navigator-grid');
        navigatorGrid.innerHTML = '';

        this.currentState.selectedQuestions.forEach((question, index) => {
            const navQuestion = document.createElement('div');
            navQuestion.className = 'nav-question';
            navQuestion.textContent = index + 1;
            navQuestion.dataset.index = index;

            // Apply status classes
            if (index === this.currentState.questionIndex) {
                navQuestion.classList.add('current');
            } else if (this.currentState.userAnswers[question.id]) {
                navQuestion.classList.add('answered');
            } else {
                navQuestion.classList.add('unanswered');
            }

            if (this.currentState.bookmarkedQuestions.has(question.id)) {
                navQuestion.classList.add('bookmarked');
            }

            navQuestion.addEventListener('click', () => {
                this.goToQuestion(index);
                this.hideQuestionNavigator();
            });

            navigatorGrid.appendChild(navQuestion);
        });

        document.getElementById('navigator-modal').classList.add('active');
    }

    hideQuestionNavigator() {
        document.getElementById('navigator-modal').classList.remove('active');
    }

    goToQuestion(index) {
        this.currentState.questionIndex = index;
        this.displayQuestion();
        this.updateQuizUI();
    }

    quitQuiz() {
        if (confirm('Are you sure you want to quit the quiz? Your progress will be lost.')) {
            this.stopTimer();
            this.goHome();
        }
    }

    finishQuiz() {
        this.stopTimer();
        this.calculateResults();
        this.showScreen('results-screen');
    }

    calculateResults() {
        const totalQuestions = this.currentState.selectedQuestions.length;
        let correctCount = 0;

        this.currentState.selectedQuestions.forEach(question => {
            const userAnswer = this.currentState.userAnswers[question.id];
            if (userAnswer === question.correct) {
                correctCount++;
            }
        });

        const percentage = Math.round((correctCount / totalQuestions) * 100);
        const timeSpent = this.currentState.startTime ? 
            Math.round((Date.now() - this.currentState.startTime) / 60000) : 0;

        // Update results display
        document.getElementById('final-percentage').textContent = `${percentage}%`;
        document.getElementById('correct-count').textContent = correctCount;
        document.getElementById('total-count').textContent = totalQuestions;
        document.getElementById('accuracy-rate').textContent = `${percentage}%`;
        document.getElementById('time-spent').textContent = `${timeSpent} min`;
        document.getElementById('correct-answers').textContent = correctCount;
        document.getElementById('incorrect-answers').textContent = totalQuestions - correctCount;

        // Update score status
        const scoreStatus = document.getElementById('score-status');
        if (percentage >= 90) {
            scoreStatus.textContent = 'Excellent! You\'re ready for the exam!';
            scoreStatus.style.color = 'var(--color-success)';
        } else if (percentage >= 75) {
            scoreStatus.textContent = 'Good job! Keep practicing!';
            scoreStatus.style.color = 'var(--color-primary)';
        } else {
            scoreStatus.textContent = 'Keep studying and try again!';
            scoreStatus.style.color = 'var(--color-warning)';
        }

        // Update session stats
        this.sessionStats.correctAnswers = correctCount;
        this.sessionStats.totalQuestions = totalQuestions;
        this.sessionStats.completedQuestions = Object.keys(this.currentState.userAnswers).length;
        this.sessionStats.sessionScore = percentage;

        this.updateHomeStats();
    }

    startReviewMode() {
        if (this.currentState.incorrectQuestions.size > 0) {
            this.startQuiz('review');
        }
    }

    retakeQuiz() {
        this.startQuiz(this.currentState.mode);
    }

    goHome() {
        this.stopTimer();
        this.showScreen('home-screen');
        this.updateHomeStats();
    }

    updateHomeStats() {
        const questionCount = parseInt(document.getElementById('question-count').value);
        document.getElementById('total-questions').textContent = questionCount;
        document.getElementById('session-score').textContent = `${this.sessionStats.sessionScore}%`;
        document.getElementById('completed-count').textContent = this.sessionStats.completedQuestions;

        // Enable/disable review button
        const reviewBtn = document.getElementById('review-btn');
        reviewBtn.disabled = this.currentState.incorrectQuestions.size === 0;
        if (this.currentState.incorrectQuestions.size > 0) {
            reviewBtn.textContent = `Review ${this.currentState.incorrectQuestions.size} Questions`;
        }
    }

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
    }
}

// Initialize the quiz application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new QuizApp();
});