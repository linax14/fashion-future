document.addEventListener("userInitialized", async () => {
    await renderDashboard(window.user)
    clothingManager = new ClothingManager(window.user)
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

let displayInDashboard = (type) => {
    let outfitsContainer = document.querySelector('.outfits-streak')
    let quizContainer = document.querySelector('.quiz-container')
    let unwornItemContainer = document.querySelector('.unworn-container')
    console.log(outfitsContainer);

    switch (type) {
        case 'quiz':

            setDisplay([outfitsContainer], 'none')
            if (unwornItemContainer) setDisplay([unwornItemContainer], 'none')
            quizContainer.style.gridColumn = 'span 4'
            setDisplay([quizContainer], 'block')

            break;

        default:
            setDisplay([outfitsContainer, unwornItemContainer, quizContainer], 'block')
            quizContainer.style.gridColumn = 'span 2'
            break;
    }
}

async function renderDashboard(user) {
    let mainHeader = new CreateElement('h2').setText(`Today's focus`).appendTo(document.body)

    let main = new CreateElement('div').setAttributes({ class: 'dashboard' }).appendTo(document.body)
    let time = getTimePeriod()

    let header = new CreateElement('div').setAttributes({ class: 'header' }).appendTo(main)
    new CreateElement('div').setAttributes({ class: 'icon' }).appendTo(header)
    let welcomeMsg = new CreateElement('h3').setText(`Good ${time} ${user.user_metadata.first_name}`).appendTo(header)

    //from global.js
    let day = date.getDate()
    // let today = `${year}-${month + 1}-${day}`
    let today = `${year}-${month + 1}-27`
    // console.log(today);

    await renderOutfitStreak(today, main)
    await getDaily(window.user, today, 'quiz', main)
    await renderNotRecentlyWorn(today, main)

    await dailyTips(window.user, today, main)
    await dailyChallenge(window.user, today, main)

}

async function renderQuiz(currentQuiz, challengeDate, container, complete = false, handleQuiz) {

    displayInDashboard('quiz')
    closeBtnX(container, () => {
        let header = document.querySelector('.quiz-container .header')
        console.log(header);
        setDisplay([header], 'grid')
        displayInDashboard()
        console.log(container.children);
        Array.from(container.children).forEach((el, index) => {
            if (index != 0) {
                el.remove()
            }
        })

        container.classList.remove('expanded')
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
                    if (percentage == 100) {
                        await updatePoints('mastery', challengeDate)
                    }
                    progressBarWrapper.setAttribute("aria-valuenow", percentage)
                    progressbar.style.width = `${percentage}%`

                    await updateUserTable(window.user, 'user_details', { user_id: user.id, questions_progress: progress.questionsProgress })

                    if (answeredQuestions === totalQuestions) {
                        let result = (score / totalQuestions) * 100
                        console.log(result);
                        localStorage.setItem(`quiz_${challengeDate}_completed`, true);
                        await updatePoints('curiosity', challengeDate)
                        await updatePoints('knowledge', challengeDate)
                    }

                    answerUI.style.pointerEvents = 'none';
                }).appendTo(questionGroup);
        });
    })

    console.log({ progress });

}

async function renderOutfitStreak(createOutfitDate, appendTo) {
    let data = await addOutfitStreak(createOutfitDate)

    let div = new CreateElement('div').setAttributes({ class: 'outfits-streak' }).appendTo(appendTo)

    if (data == null) {
        new CreateElement('p').setText(`Log today's to keep up with your streak`).appendTo(div)
    } else {
        new CreateElement('h2').setText(`${data.target.streak} DAY streak`).appendTo(div)
    }

    return div
}

async function getUnwornItems(dateInfo) {
    let data = await clothingManager.getData('outfit')
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

async function renderNotRecentlyWorn(dateInfo, container) {
    let data = await getUnwornItems(dateInfo)
    data = data.sort(() => Math.random() - 0.5)
    let unworn = new CreateElement('div').setAttributes({ class: 'unworn-container' }).appendTo(container)
    let cards = new CreateElement('div').setAttributes({ class: 'cards' }).appendTo(unworn)
    let clothes = new CreateElement('div').setAttributes({ class: 'clothes' }).appendTo(unworn)
    let h2 = new CreateElement('h2').setText(`Did you forget about us?`).appendTo(cards)
    new CreateElement('br').appendTo(h2)
    new CreateElement('span').setText(`Let's make a new outfit`).appendTo(h2)

    let render = await renderClothingItem(null, clothes, data.slice(0, 2))

    if (render.length == 0) {
        unworn.style.display = 'none'
    }
}

async function dailyTips(user, dateInfo, appendTo) {

    let calendarData = await selectUserTable(window.user, 'user_calendar')
    let [year, month, day] = dateInfo.split('-')
    let currentMonth = months[month - 1].toLowerCase()

    let { data, error } = await supabase.from('tips').select()
    if (error) { console.error(error) }

    let shownTips = new Set()
    let availableTips = data.filter(tip => !shownTips.has(tip.id))
    let usableTips = availableTips.length > 0 ? availableTips : data

    for (const element of calendarData) {
        if (element.year == year) {

            for (let [months, days] of Object.entries(element.calendar)) {
                for (let [daysNum, dayData] of Object.entries(days)) {
                    if (dayData?.tip?.id) { shownTips.add(dayData?.tip?.id) }
                }

            }
        }
    }

    for (const element of calendarData) {
        if (element.year == year) {
            let targetMonth = element.calendar[currentMonth]

            if (targetMonth) {
                let target = targetMonth[day]
                if (!target.tip) {

                    let getRandom = usableTips[Math.floor(Math.random() * usableTips.length)]
                    target.tip = getRandom
                    await updateUserTable(window.user, 'user_calendar', { calendar: element.calendar });

                }

                let div = new CreateElement('div').setAttributes({ class: 'sustainability-tips container' }).appendTo(appendTo)
                new CreateElement('h3').setText(target.tip.main).appendTo(div)
                new CreateElement('p').setText(target.tip.details).appendTo(div)

            }
        }
    }
}

async function dailyChallenge(user, dateInfo, appendTo) {

    let calendarData = await selectUserTable(window.user, 'user_calendar')
    let [year, month, day] = dateInfo.split('-')
    let currentMonth = months[month - 1].toLowerCase()

    let { data, error } = await supabase.from('challenges').select()
    if (error) { console.error(error) }

    let challenges = new Set()
    let availableChallenges = data.filter(challenge => !challenges.has(challenge.id))
    let usableChallenges = availableChallenges.length > 0 ? availableChallenges : data

    for (const element of calendarData) {
        if (element.year == year) {

            for (let [months, days] of Object.entries(element.calendar)) {
                for (let [daysNum, dayData] of Object.entries(days)) {
                    if (dayData?.challenge?.id) { challenges.add(dayData?.challenge?.id) }

                }

            }
        }
    }

    for (const element of calendarData) {
        if (element.year == year) {
            let targetMonth = element.calendar[currentMonth]

            let target
            if (targetMonth) {
                target = targetMonth[day]
                if (!target.challenge) {

                    let getRandom = usableChallenges[Math.floor(Math.random() * usableChallenges.length)]
                    target.challenge = getRandom
                    await updateUserTable(window.user, 'user_calendar', { calendar: element.calendar });

                }

                renderChallenge(target, dateInfo, appendTo)
                await challengeCompleted(target, element)
            }
        }
    }
}

async function challengeCompleted(target, element) {
    let challengeElement = document.querySelector('.challenge.container')
    let renderChallengeCompleted = () => {
        let heading = challengeElement.querySelector('span')
        if (heading) {
            heading.textContent += '✔'
        }
    }
    if (target.challenge.complete == true) {
        renderChallengeCompleted()
    }

    let completedChallenge = localStorage.getItem('challengeCompleted')
    if (completedChallenge) {
        let { challengeId, dateInfo } = JSON.parse(completedChallenge)

        if (challengeElement.dataset.challengeId == challengeId) {
            renderChallengeCompleted()
            target.challenge.complete = true
            await updateUserTable(window.user, 'user_calendar', { calendar: element.calendar })
        };

        localStorage.removeItem('challengeCompleted')
    }
}

function renderChallenge(target, dateInfo, appendTo) {
    let div = new CreateElement('div').setAttributes({ class: 'challenge container', 'data-challenge-id': target.challenge.id }).appendTo(appendTo)
    let h = new CreateElement('h3').setText(target.challenge.title).appendTo(div)
    let span = new CreateElement('span').appendTo(h)
    new CreateElement('img').setAttributes({ src: 'https://img.icons8.com/ios/50/nui2.png', alt: 'click to complete challenge', class: 'icon' }).appendTo(span)
    let p = new CreateElement('p').setText(target.challenge.details).appendTo(div)

    if (target.challenge.complete) {
        div.removeEventListener('click', async () => completeChallengeEvent(target, dateInfo))
    } else {
        div.addEventListener('click', async () => completeChallengeEvent(target, dateInfo))
    }
}

function completeChallengeEvent(target, dateInfo) {
    if (target.challenge.event_type) {
        let event = target.challenge.target
        let eventType = target.challenge.event_type

        switch (event) {
            case 'outfit':
                switch (eventType) {
                    case 'new_outfit':

                        localStorage.setItem('challengeAction', JSON.stringify({
                            action: 'addOutfit',
                            dateInfo: dateInfo,
                            fromChallenge: true,
                            challengeId: target.challenge.id
                        }))
                        window.location.href = './planner.html'

                        break

                    default:
                        break
                }
                break

            default:
                break
        }
    }
}