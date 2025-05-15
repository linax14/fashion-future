async function renderQuiz(currentQuiz, challengeDate, container, complete = false, handleQuiz) {

    let main = await quizLayout(container)

    let { data: answersData } = await supabase.from('answers').select()

    let groupedQuestionsAnswers = answersData.reduce((obj, answer) => {
        if (currentQuiz.some(calendarItem => calendarItem.id == answer.question_id)) {
            if (!obj[answer.question_id]) { obj[answer.question_id] = [] }
            obj[answer.question_id].push(answer)
        }
        return obj
    }, {})

    let { progress } = await getUserData(challengeDate, 'questions')

    quizContent(currentQuiz, main, container, groupedQuestionsAnswers, progress, challengeDate)
}

function quizContent(currentQuiz, main, container, groupedQuestionsAnswers, progress, challengeDate) {
    let totalQuestions = currentQuiz.length
    let answeredQuestions = 0
    let score = 0

    let progressBarWrapper = new CreateElement('div').setAttributes({ class: 'progress', role: 'progressbar', aria: 'quiz progress bar', 'aria-valuemin': 0, 'aria-valuemax': 100 }).appendTo(main)
    let progressbar = new CreateElement('div').setAttributes({ class: 'progress-bar', style: 'width:0%' }).appendTo(progressBarWrapper)
    let percentage = 0

    let showAnswers = new CreateElement('button').setText('Reveal Correct Answers').setAttributes({ class: 'submit btn' }).appendTo(container)

    let wrapper = new CreateElement('div').setAttributes({ class: 'wrapper' }).appendTo(main)
    currentQuiz.forEach(question => {
        setDisplay([showAnswers], 'none')

        let qId = question.id
        let questionGroup = new CreateElement('div').setAttributes({ class: 'question-group' }).appendTo(wrapper)
        new CreateElement('h4').setText(question.question).appendTo(questionGroup)
        let answers = groupedQuestionsAnswers[qId] || []

        let isAnswered = false
        answers.forEach(answer => {
            let update = progress.questionsProgress.find(item => item.id == question.id)
            let i

            let answerUI = new CreateElement('p').setText(answer.answer).appendTo(questionGroup)
            if (answer.is_correct) answerUI.classList.add('correct-answer')
            answerUI.addEventListener('click', async function handleAnswer() {

                if (question.answered) return
                question.answered = true

                update = update || { attempts: 0, correctAnswers: 0 }

                if (!isAnswered) {
                    isAnswered = true
                    answeredQuestions++
                }

                if (isNaN(update.attempts)) update.attempts = 0
                if (isNaN(update.correctAnswers)) update.correctAnswers = 0

                if (answer.is_correct == true) {
                    console.log('correct')
                    score++
                    if (update) {
                        update.attempts += 1
                        update.correctAnswers += 1
                    }

                    answerUI.classList.add('correct')
                    new CreateElement('span').appendTo(answerUI)
                    i = new CreateElement('i').setAttributes({ class: 'fa-solid fa-check' }).appendTo(answerUI)


                } else {
                    console.log(`u'll get it next time`)
                    if (update) {
                        update.attempts += 1
                    }
                    answerUI.classList.add('incorrect')
                    new CreateElement('span').appendTo(answerUI)
                    i = new CreateElement('i').setAttributes({ class: 'fa-solid fa-x' }).appendTo(answerUI)

                }

                percentage = (answeredQuestions / totalQuestions * 100)
                progressBarWrapper.setAttribute("aria-valuenow", percentage)
                progressbar.style.width = `${percentage}%`

                await updateUserTable(window.user, 'user_details', { user_id: user.id, questions_progress: progress.questionsProgress })
                if (answeredQuestions === totalQuestions) {
                    let result = (score / totalQuestions) * 100
                    setDisplay([showAnswers], 'flex')
                    showAnswers.addEventListener('click', () => revealAnswer(i))

                    localStorage.setItem(`quiz_${challengeDate}_completed`, true);

                    if (result == 100) {
                        await updatePoints(['curiosity', 'knowledge', 'mastery'], challengeDate)
                    } else {
                        await updatePoints(['curiosity', 'knowledge'], challengeDate)
                    }
                }

                answerUI.style.pointerEvents = 'none'
            })
        })
    })

    function revealAnswer(i) {
        document.querySelectorAll('.correct-answer').forEach(el => {
            i = new CreateElement('i').setAttributes({ class: 'fa-solid fa-check' }).appendTo(el)
            el.setAttribute('class', 'correct')
        })
    }
}

async function quizLayout(container) {
    await displayInDashboard('quiz')

    let quiz = new CreateElement('div').setAttributes({ class: 'quiz' }).appendTo(container)
    let main = new CreateElement('div').setAttributes({ class: 'questions-container' }).appendTo(quiz)
    let h3 = new CreateElement('h3').setText(`Let's get more sustainable`).appendTo(main)

    closeBtnX(h3, () => {
        let header = document.querySelector('#quiz-container .header')
        setDisplay([header], 'grid')
        displayInDashboard('dash')
        container.style.gridColumn = 'span 4'
        Array.from(container.children).forEach((el, index) => {
            if (index != 0) {
                el.remove()
            }
        })

        container.classList.remove('expanded')
    })

    return main
}

async function getQuiz(user, dateInfo, appendTo) {

    let calendarData = await selectUserTable(window.user, 'user_calendar')
    let [year, month, day] = dateInfo.split('-')
    let currentMonth = months[month - 1].toLowerCase()
    let header

    let quiz

    for (const element of calendarData) {
        if (element.year == year) {
            let targetMonth = element.calendar[currentMonth]

            if (targetMonth) {
                let target = targetMonth[day]

                let quizData = await userQuiz()

                let expandQuiz = async () => {
                    localStorage.setItem('targetQuiz', JSON.stringify(target.quiz));
                    localStorage.setItem('dateInfo', `${dateInfo}`);
                    await renderQuiz(target.quiz, dateInfo, quiz, expandQuiz)
                    quiz.classList.toggle('expanded')
                    setDisplay([header], 'none')
                }

                if (target.quiz.length == 0) {
                    target.quiz.push(...quizData)
                    await updateUserTable(window.user, 'user_calendar', { calendar: element.calendar });
                }

                let sessionCompleted = localStorage.getItem(`quiz_${dateInfo}_completed`)
                quiz = new CreateElement('div').setAttributes({ class: 'dashboard-card', id: 'quiz-container' }).appendTo(appendTo)
                header = new CreateElement('div').setAttributes({ class: 'header' }).addEventListener('click', expandQuiz).appendTo(quiz)
                new CreateElement('i').setAttributes({ class: 'fa-solid fa-dice' }).appendTo(header)
                let main = new CreateElement('span').setAttributes({ class: 'main' }).setText('Quiz time').appendTo(header)
                let p = new CreateElement('span').setAttributes({ class: 'details' }).setText(`Are you ready?`).appendTo(header)

                if (quizData.length == 0) {
                    header.removeEventListener('click', expandQuiz)
                    p.remove()
                    main.innerText = 'Quiz unavailable'
                    new CreateElement('br').appendTo(main)
                    new CreateElement('p').setText('Check back tomorrow').appendTo(header)
                }

                if (sessionCompleted) {
                    header.removeEventListener('click', expandQuiz)
                    p.remove()
                    main.innerText = 'Quiz completed'
                    new CreateElement('br').appendTo(main)
                    new CreateElement('p').setText('Check back tomorrow').appendTo(header)
                }
            }
        }
    }

    return calendarData
}

class UserQuiz {
    constructor(questions) {
        this.questions = questions
        this.grouped = this.groupQuestions()
        this.tags = Object.keys(this.grouped)
    }

    groupQuestions() {
        let byTag = {}
        this.questions.forEach(question => {
            if (question.tag) question.tag.forEach(t => {
                if (!byTag[t]) byTag[t] = []
                byTag[t].push(question)
            })
        })
        return byTag
    }

    getRandomTags() {
        let shuffled = [...this.tags].sort(() => Math.random() - 0.5)
        return shuffled.slice(0, 2)
    }

    tagSplit() {
        return Math.floor(Math.random() * 5 + 1)
    }

    getFilteredQuestions(tag) {
        return (this.grouped[tag] || []).filter(q => !q.hasOwnProperty('correctAnswers') || q.correctAnswers < 2);
    }

    getQuestionsTag(tag, count) {
        let shuffled = [...(this.getFilteredQuestions(tag))].sort(() => Math.random() - 0.5);
        return shuffled.length >= count ? shuffled.slice(0, count) : shuffled;
    }

    newQuestions = (selected, tag) => {
        let extra = 6 - selected.length;
        let extraQuestions = [...(this.getFilteredQuestions(tag))]
            .filter(q => !selected.includes(q))
            .sort(() => Math.random() - 0.5)
            .slice(0, extra);

        return extraQuestions;
    }

    generateQuiz() {
        if (this.tags.length < 2) return console.log('not enough tags');

        let tags = this.getRandomTags()

        let countTag1 = this.tagSplit()
        let countTag2 = 6 - countTag1

        let selected = [
            ...this.getQuestionsTag(tags[0], countTag1),
            ...this.getQuestionsTag(tags[1], countTag2)
        ]

        let attempts = 0;
        while (selected.length < 6 && attempts < 2) {
            selected.push(
                ...this.newQuestions(selected, tags[0]),
                ...this.newQuestions(selected, tags[1])
            );
            attempts++;
        }

        return selected.sort(() => Math.random(-0.5))
    }
}

async function userQuiz() {
    let userQuestions = await initializeUserDetails('questions', 'questions_progress');
    let questions = userQuestions[0].questions_progress;
    let quiz = new UserQuiz(questions);
    return quiz.generateQuiz();
}
