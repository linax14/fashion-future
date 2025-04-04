document.addEventListener("userInitialized", async () => {
    // renderQuiz()
    let targetQuiz = JSON.parse(localStorage.getItem('targetQuiz'))
    console.log(targetQuiz);

    let dateInfo = localStorage.getItem('dateInfo')
    console.log(dateInfo);

    renderQuiz(targetQuiz, dateInfo, document.body);
});


async function renderQuiz(currentQuiz, challengeDate, container, complete = false) {

    closeBtnX(container, () => {
        window.location.href = 'planner.html'
    })

    let main = new CreateElement('div').setAttributes({ class: 'questions-container' }).appendTo(container)
    new CreateElement('h1').setText(`Let's get more sustainable`).appendTo(main)
    let { data: answersData } = await supabase.from('answers').select()

    let groupedQuestionsAnswers = answersData.reduce((obj, answer) => {
        if (currentQuiz.some(calendarItem => calendarItem.id == answer.question_id)) {
            if (!obj[answer.question_id]) { obj[answer.question_id] = [] }
            obj[answer.question_id].push(answer)
        }
        return obj
    }, {})

    let { progress } = await getUserData(challengeDate, 'questions')
    console.log(progress);

    let totalQuestions = currentQuiz.length
    console.log(totalQuestions);

    let answeredQuestions = 0
    console.log(answeredQuestions);

    let score = 0

    let progressBarWrapper = new CreateElement('div').setAttributes({ class: 'progress', role: 'progressbar', aria: 'quiz progress bar', 'aria-valuemin': 0, 'aria-valuemax': 100 }).appendTo(main)
    let progressbar = new CreateElement('div').setAttributes({ class: 'progress-bar', style: 'width:0%' }).appendTo(progressBarWrapper)
    let percentage = 0
    console.log(percentage);

    let sessionCompleted = localStorage.getItem(`quiz_${challengeDate}_completed`);

    if (sessionCompleted) {
        new CreateElement('p')
            .setText('You have already completed this quiz')
            .appendTo(container);
        return;
    }

    let wrapper = new CreateElement('div').setAttributes({ class: 'wrapper' }).appendTo(main)
    currentQuiz.forEach(question => {
        let qId = question.id
        let questionGroup = new CreateElement('div').setAttributes({ class: 'question-group' }).appendTo(wrapper);
        new CreateElement('h3').setText(question.question).appendTo(questionGroup)
        new CreateElement('div').setAttributes({ class: 'image-placeholder' }).appendTo(questionGroup)
        let answers = groupedQuestionsAnswers[qId] || [];

        let isAnswered = false
        answers.forEach(answer => {
            let update = progress.questionsProgress.find(item => item.id == question.id)

            let answerUI = new CreateElement('p').setText(answer.answer)
                .addEventListener('click', async function handleAnswer() {

                    if (question.answered) return;
                    question.answered = true;

                    update = update || { attempts: 0, correctAnswers: 0 };

                    if (!isAnswered) {
                        isAnswered = true
                        answeredQuestions++
                    }

                    if (isNaN(update.attempts)) update.attempts = 0;
                    if (isNaN(update.correctAnswers)) update.correctAnswers = 0;

                    if (answer.is_correct == true) {
                        console.log('correct');
                        score++
                        if (update) {
                            update.attempts += 1
                            update.correctAnswers += 1
                        }

                        answerUI.classList.add('correct')
                        new CreateElement('span').appendTo(answerUI)
                        new CreateElement('i').setAttributes({ class: 'fa-solid fa-check' }).appendTo(answerUI)


                    } else {
                        console.log(`u'll get it next time`);
                        if (update) {
                            update.attempts += 1
                        }
                        answerUI.classList.add('incorrect')
                        new CreateElement('span').appendTo(answerUI)
                        new CreateElement('i').setAttributes({ class: 'fa-solid fa-x' }).appendTo(answerUI)

                    }

                    percentage = (answeredQuestions / totalQuestions * 100)
                    progressBarWrapper.setAttribute("aria-valuenow", percentage)
                    progressbar.style.width = `${percentage}%`

                    await updateUserTable(window.user, 'user_details', { user_id: user.id, questions_progress: progress.questionsProgress })

                    if (answeredQuestions === totalQuestions) {
                        let result = (score / totalQuestions) * 100
                        console.log(result);
                        localStorage.setItem(`quiz_${challengeDate}_completed`, true);
                    }

                    answerUI.style.pointerEvents = 'none';
                }).appendTo(questionGroup);
        });
    })

    console.log({ progress });

}