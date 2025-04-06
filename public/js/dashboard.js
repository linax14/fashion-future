document.addEventListener("userInitialized", async () => {
    renderDashboard(window.user)
})

let getTimePeriod = () => {
    let hours = new Date().getHours()
    let period

    switch (true) {
        case (hours >= 5 && hours < 12):
            period = 'morning'
            break
        case (hours >= 12 && hours < 20):
            period = 'afternoon'
            break
        default:
            period = 'night'
    }
    return period
}

async function renderDashboard(user) {
    let main = new CreateElement('div').setAttributes({ class: 'dashboard' }).appendTo(document.body)
    let time = getTimePeriod()

    let header = new CreateElement('div').appendTo(main)
    let welcomeMsg = new CreateElement('h1').setText(`Good ${time} ${user.user_metadata.first_name}`).appendTo(header)

    //from global.js
    let day = date.getDate()
    let today = `${year}-${month + 1}-${day}`
    // console.log(today);

    await renderOutfitStreak(today, main)
    await getDaily(window.user, today, 'quiz', main)
    await getDaily(window.user, today, 'challenge', main)
    await renderNotRecentlyWorn(today)
}

async function renderChallenges(user, randomChallenges, dateInfo, challengesContainer) {

    let challenges = new CreateElement('div')
        .setAttributes({ class: 'challenges' })
        .addEventListener('click', async () => { challenges.classList.toggle('expanded'); })
        .appendTo(challengesContainer)

    new CreateElement('h2').setText('challenges').appendTo(challenges)

    let { progress, challengesToday, calendarData } = await getUserData(dateInfo, 'challenges')
    let updateCalendar = calendarData[0].calendar

    randomChallenges.forEach(value => {

        let elements = new CreateElement('div').setAttributes({ class: 'elements' }).appendTo(challenges)
        let checkbox = new CreateElement('input')
            .setAttributes({ type: 'checkbox', id: value.id, class: 'challenges' })
            .addEventListener('click', (event) => {
                event.stopPropagation()
            })
            .addEventListener('change', async (event) => {
                event.preventDefault()

                let updateChallenge = progress.challengesProgress.find(item => item.id == checkbox.id)
                let updateCalendarChallenge = challengesToday.find(item => item.id == checkbox.id)

                if (updateChallenge && updateChallenge.complete_count == undefined) {
                    updateChallenge.complete_count = 0;
                }

                if (checkbox.checked) {

                    if (updateCalendarChallenge) updateCalendarChallenge.completed = true;
                    if (updateChallenge) updateChallenge.complete_count += 1;

                } else {
                    if (updateCalendarChallenge) updateCalendarChallenge.completed = false;
                    if (updateChallenge) updateChallenge.complete_count = Math.max(0, updateChallenge.complete_count - 1);
                }

                await updateUserTable(window.user, 'user_details', { user_id: user.id, challenges_progress: progress.challengesProgress })
                await updateUserTable(window.user, 'user_calendar', { user_id: user.id, calendar: updateCalendar })

            })
            .appendTo(elements)

        let ul = new CreateElement('ul').setText(value.title).appendTo(elements)
        new CreateElement('li').setText(value.details).appendTo(ul)

        checkbox.checked = challengesToday.some(item => item.id === value.id && item.completed);
    });
}

async function renderQuiz(currentQuiz, challengeDate, container, complete = false, handleQuiz) {

    closeBtnX(container, () => {
        let header = document.querySelector('.quiz-container .header')
        console.log(header);
        setDisplay([header], 'grid')

        console.log(container.children);
        Array.from(container.children).forEach((el, index) => {
            if (index != 0) {
                el.remove()
            }
        })

        container.classList.remove('expanded')

        let challenges = document.querySelector('.challenges')
        setDisplay([challenges], 'grid')
    })

    let { data: answersData } = await supabase.from('answers').select()

    let quiz = new CreateElement('div').setAttributes({ class: 'quiz' }).appendTo(container)
    let main = new CreateElement('div').setAttributes({ class: 'questions-container' }).appendTo(quiz)
    new CreateElement('h2').setText(`Let's get more sustainable`).appendTo(main)

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

async function renderOutfitStreak(createOutfitDate, appendTo) {
    let data = await addOutfitStreak(createOutfitDate)
    // console.log(data);

    let div = new CreateElement('div').setAttributes({ class: 'outfits-streak' }).appendTo(appendTo)

    if (data == null) {
        let h1 = new CreateElement('p').setText(`Log today's to keep up with your streak`).appendTo(div)
    } else {
        let h1 = new CreateElement('h2').setText(`${data.streak} DAY streak`).appendTo(div)
    }

    // new CreateElement('br').appendTo(h1)
    // new CreateElement('span').setText('streak').appendTo(h1)

    return div
}

async function getUnwornItems(dateInfo) {
    let data = await getDetailedOutfits()
    data = data.filter(item => item.worn == true)
    let itemWearMap = new Map()
    let unwornItems = []

    for (let outfit of data) {
        for (let item of outfit.clothingItems) {
            if (!itemWearMap.has(item.id)) {
                itemWearMap.set(item.id, new Set());
            } for (let date of outfit.wornDates) {
                itemWearMap.get(item.id).add(date);
            }
        }
    }

    for (let [itemId, dates] of itemWearMap.entries()) {
        let datesArray = [...dates].map(date => formatDateUnpadded(date));

        let latestDate = datesArray.sort((a, b) => new Date(b) - new Date(a))[0];

        if (datesDifference(latestDate, dateInfo) > 5) {
            for (let outfit of data) {
                for (let item of outfit.clothingItems) {
                    if (item.id == itemId) {
                        unwornItems.push(item)
                        break
                    }
                }
            }
        }
    }
    return unwornItems
}

async function renderNotRecentlyWorn(dateInfo) {
    let data = await getUnwornItems(dateInfo)
    data = data.sort(() => Math.random() - 0.5)
    let container = new CreateElement('div').setAttributes({ class: 'unworn-container' }).appendTo(document.body)
    await displayClothingItems(null, container, data.slice(0, 2))
}


