document.addEventListener("userInitialized", async () => {
    renderCalendarDisplay()
    // renderClothingDisplay()
});

let calendarContainer = new CreateElement('div').setAttributes({ id: 'calendar' }).appendTo(document.body)

let clothingContainer = new CreateElement('div').setAttributes({ class: 'clothing-container' })
    .appendTo(document.body)

let displayInPlanner = (type) => {
    let outfitContainer = document.querySelector('.outfits-container')
    let challengesContainer = document.querySelector('.challenges-container')
    let quizContainer = document.querySelector('.quiz-container')

    switch (type) {
        case 'calendar':
            setDisplay([calendarContainer], 'block')
            setDisplay([clothingContainer], 'none')
            break;

        case 'clothing':
            setDisplay([clothingContainer], 'block')
            setDisplay([calendarContainer], 'none')
            break;

        default:
            setDisplay([outfitContainer, challengesContainer, quizContainer], 'block');
            break;
    }
}

async function renderCalendarDisplay() {
    calendarContainer.innerHTML = ''
    let main = calendarHeader()

    let weekScrollWrapper = new CreateElement('div').setAttributes({ class: 'week-scroll-wrapper' }).appendTo(main);
    let daysContainer = new CreateElement('div').setAttributes({ class: 'days-container' }).appendTo(weekScrollWrapper);
    let noDaysMonth = new Date(year, month + 1, 0).getDate();

    let { createOutfitDate, challengesContainer, quizContainer, outfitsContainer } = renderContentSections();

    await calendarDays(noDaysMonth, createOutfitDate, daysContainer, challengesContainer, quizContainer, outfitsContainer);
    await scrollToday(createOutfitDate, challengesContainer, quizContainer, outfitsContainer);
}

let calendarHeader = () => {
    let main = new CreateElement('div').appendTo(calendarContainer)
    new CreateElement('h1').setAttributes({ class: 'calendar header' }).setText(`PLANNING ${year}`).appendTo(main)
    let monthHeader = new CreateElement('div').setAttributes({ class: 'month header' }).appendTo(main)

    months.forEach((element, index) => {
        new CreateElement('h2')
            .setAttributes({ class: index === month ? 'item current' : 'item' })
            .addEventListener('click', () => {
                month = index
                renderCalendarDisplay()
            })
            .setText(element.substring(0, 3))
            .appendTo(monthHeader)
    })
    return main
}

async function calendarDays(noDaysMonth, createOutfitDate, daysContainer, challengesContainer, quizContainer, outfitsContainer) {
    for (let day = 1; day <= noDaysMonth; day++) {
        let currentDate = new Date(year, month, day);
        let dataDate = `${year}-${month + 1}-${day}`;
        let dayOfWeek = ['S', 'M', 'T', 'W', 'T', 'F', 'S'][currentDate.getDay()];

        let dayContainerClass = 'day-container';

        let className = 'day';
        if (currentDate.toDateString() == date.toDateString()) dayContainerClass += ' today';
        if (currentDate.getDay() === 0) dayContainerClass += ' sunday';

        let dayContainer = new CreateElement('div').setAttributes({ class: dayContainerClass }).appendTo(daysContainer);
        new CreateElement('div').setAttributes({ class: 'day-header' }).setText(dayOfWeek).appendTo(dayContainer);

        new CreateElement('div')
            .setAttributes({ class: className, 'data-date': dataDate })
            .setText(day)
            .addEventListener('click', async () => {
                await handleDayClick(dayContainer, dataDate, createOutfitDate, challengesContainer, quizContainer, outfitsContainer)
            })
            .appendTo(dayContainer);
    }
}

async function scrollToday(createOutfitDate, challengesContainer, quizContainer, outfitsContainer) {
    setTimeout(() => {
        (async () => {
            let todayDiv = document.querySelector('.day-container.today');
            if (todayDiv) {
                let scrollContainer = document.querySelector('.week-scroll-wrapper');

                let scrollPosition = todayDiv.offsetLeft - (scrollContainer.clientWidth / 2) + (todayDiv.clientWidth / 2);
                scrollContainer.scrollTo({
                    left: scrollPosition,
                    behavior: 'smooth'
                });
                todayDiv.classList.add('selected');
                let div = todayDiv.childNodes[1];

                if (div.hasAttribute('data-date')) {
                    let dataDate = div.getAttribute('data-date');
                    await handleDayClick(todayDiv, dataDate, createOutfitDate, challengesContainer, quizContainer, outfitsContainer);
                }
            }
        })();
    }, 0);
}

let handleDayClick = async (dayContainer, dataDate, createOutfitDate, challengesContainer, quizContainer, outfitsContainer) => {
    document.querySelectorAll('.day-container.selected').forEach(el => el.classList.remove('selected'));
    dayContainer.classList.add('selected');

    createOutfitDate = dataDate;

    challengesContainer.innerHTML = '';
    quizContainer.innerHTML = '';
    document.querySelectorAll('.outfit').forEach(el => el.parentNode.removeChild(el));

    displayInPlanner()

    let createOutfit = document.querySelector('.create-outfit')
    createOutfit.addEventListener('click', () => {
        renderClothingDisplay(createOutfitDate, 'addOutfit');
    });

    let render = await renderOutfits(dataDate, outfitsContainer);
    if (render) getOutfitId();

    await getDaily(window.user, dataDate, 'challenge', challengesContainer)
    await getDaily(window.user, dataDate, 'quiz', quizContainer)
}

let renderContentSections = () => {
    let outfitsContainer = new CreateElement('section').setAttributes({ class: 'outfits-container' }).appendTo(calendarContainer);
    let createOutfitDate = renderCreateOutfit(outfitsContainer)
    let challengesContainer = new CreateElement('section').setAttributes({ class: 'challenges-container' }).appendTo(calendarContainer);
    let quizContainer = new CreateElement('section').setAttributes({ class: 'quiz-container' }).appendTo(calendarContainer);

    return { createOutfitDate, challengesContainer, quizContainer, outfitsContainer };
}

let renderCreateOutfit = (outfitsContainer) => {
    let createOutfitDate = null;
    let createOutfit = new CreateElement('div').setAttributes({ class: 'create-outfit' }).appendTo(outfitsContainer);

    new CreateElement('h2').setText('add an outfit').appendTo(createOutfit);
    new CreateElement('img').setAttributes({ src: '../assets/createOutfit.png' }).appendTo(createOutfit);
    return createOutfitDate;
}

async function renderOutfits(dataDate, outfitsContainer) {
    let outfits = await getDetailedOutfits();

    for (const element of outfits) {
        if (element.wornDates) {
            let outfitDates = element.wornDates;

            outfitDates.forEach(date => {
                if (formatDateUnpadded(date) == dataDate) {
                    let outfitContainer = new CreateElement('div').setAttributes({ class: 'outfit', 'data-id': element.outfitId }).appendTo(outfitsContainer)
                    element.clothingItems.forEach(async (item) => {
                        if (item.image) {
                            await getImage(item, outfitContainer, renderImage);
                        }
                    });
                }
            });
        }
    }
    return true
}

async function renderClothingDisplay(createOutfitDate, type, outfitId) {
    console.log(createOutfitDate);

    clothingContainer.innerHTML = ''
    displayInPlanner('clothing')
    let itemsToAdd = []

    if (type == 'editOutfit') new CreateElement('h2').setText('Edit Outfit').appendTo(clothingContainer)
    if (type == 'addOutfit') new CreateElement('h2').setText('Add Outfit').appendTo(clothingContainer)

    closeBtnX(clothingContainer, () => {
        displayInPlanner('calendar')
    })

    let filtersContainer = new CreateElement('div').setAttributes({ class: 'filters-container' }).appendTo(clothingContainer)
    let clothingList = new CreateElement('div').setAttributes({ class: 'clothing-list' }).appendTo(clothingContainer)

    let clothingItemElements = await displayClothingItems(null, clothingList, null, itemsToAdd)

    new CreateElement('h2').setText('Filters')
        .addEventListener('click', async () => {
            let filtersSection = document.querySelector('.filters');

            if (!filtersSection) {
                await renderFilters(filtersContainer, clothingList, (filteredItems) => {
                    clothingList.innerHTML = '';
                    filteredItems.forEach(e => displayClothingItems(null, clothingList, [e], itemsToAdd));
                    console.log(filteredItems);
                    setDisplay([addOutfitBtn], 'block');
                    setDisplay([clothingList], 'grid');
                });
                filtersSection = document.querySelector('.filters');
            }

            let isExpanded = filtersSection.classList.toggle('expanded');

            setDisplay([addOutfitBtn], isExpanded ? 'none' : 'block');
            setDisplay([clothingList], isExpanded ? 'none' : 'grid');
            setDisplay([filtersSection], isExpanded ? 'block' : 'none');
        })
        .appendTo(filtersContainer);

    if (type == 'editOutfit') {
        itemsToAdd = await editMode(outfitId, clothingItemElements, itemsToAdd);
    }

    if (type == 'addOutfit') {
        new CreateElement('button').setText('add outfit').setAttributes({ class: 'submit btn' })
            .addEventListener('click', async (event) => {
                event.preventDefault()
                console.log(itemsToAdd);

                if (itemsToAdd.length < 0) {
                    alert('Please select at least one item')
                    return
                }

                let outfitId = await generateOutfit(window.user)
                await addItemsOutfit(window.user, outfitId, itemsToAdd)
                if (createOutfitDate) await updateOutfit(window.user, outfitId, createOutfitDate)

                itemsToAdd = []

                displayInPlanner('calendar')

            }).appendTo(clothingContainer)
    }
}

async function editMode(outfitId, clothingItemElements, itemsToAdd) {
    let id = getOutfitId(outfitId);
    let outfit = await getDetailedOutfits(outfitId);
    let inOutfit;
    let itemsToRemove = [];

    clothingItemElements.forEach(element => {
        inOutfit = outfit[0].clothingItems.find(item => item.id == element.id);

        if (inOutfit && element.checkbox) {
            element.checkbox.checked = true;
            itemsToAdd.push(element.id);
        }

        element.checkbox.addEventListener('change', () => {
            if (element.checkbox.checked) {
                itemsToAdd.push(element.id);
                itemsToRemove = itemsToRemove.filter(id => id !== element.id);
            } else {
                itemsToRemove.push(element.id);
                itemsToAdd = itemsToAdd.filter(id => id !== element.id);
            }
        });
    });

    document.querySelectorAll('.edit-outfit.btn').forEach(e => e.remove())

    new CreateElement('button')
        .setText('save')
        .setAttributes({ class: 'edit-outfit btn' })
        .addEventListener('click', async (event) => {
            event.preventDefault();

            let { data, error } = await supabase.from('outfit_items').select('clothing_item_id').eq('outfit_id', id);
            if (error) return console.error("error getting items", error);

            let existingIds = new Set(data.map(item => item.clothing_item_id));
            let newItems = [...new Set(itemsToAdd)].filter(item => !existingIds.has(item));

            if (newItems.length > 0) {
                await supabase.from('outfit_items').insert(newItems.map(item => ({
                    user_id: user.id,
                    outfit_id: id,
                    clothing_item_id: item
                })));

                if (error) console.error("error adding items:", error);
            }

            if (itemsToRemove.length > 0) {
                await supabase.from('outfit_items').delete().eq('outfit_id', id).in('clothing_item_id', itemsToRemove);
                if (error) console.error("error removing items:", error);
            }

            displayInPlanner('calendar')

        })
        .appendTo(clothingContainer);

    new CreateElement('button')
        .setText('delete')
        .setAttributes({ class: 'edit-outfit btn' })
        .addEventListener('click', async (event) => {
            event.preventDefault();

            let outfitContainer = document.querySelectorAll('outfits-container');
            outfitContainer.forEach(container => {
                if (container.getAttribute('data-date') == id) container.remove();
            });

            let { error } = await supabase.from('outfit').delete().eq('id', id);
            if (error) return console.error("Error fetching existing items:", error);

            renderCalendarDisplay();
            displayInPlanner('calendar')

        })
        .appendTo(clothingContainer)

    return itemsToAdd;
}

async function getDetailedOutfits(outfitId = null) {
    const outfits = await selectUserTable(window.user, 'outfit')
    const outfitIds = outfits.map(outfit => outfit.id)

    const outfitItems = await getOutfitItems(outfitIds)

    const clothingItemIds = [].concat(...Object.values(outfitItems))
    const clothingItems = await selectUserTable(window.user, 'clothing_items', clothingItemIds)

    let outfitDetails = outfits.map(outfit => {
        const outfitItemIds = outfitItems[outfit.id] || [];

        const itemsForOutfit = clothingItems.filter(item => outfitItemIds.includes(item.id));

        return {
            outfitId: outfit.id,
            wornDates: outfit.wear_dates,
            clothingItems: itemsForOutfit
        };
    });

    return outfitId === null
        ? outfitDetails
        : outfitDetails.filter(outfit => outfit.outfitId == outfitId);
}

let getOutfitId = (outfitId) => {
    let outfitContainer = document.querySelectorAll('.outfit');
    outfitContainer.forEach(container => {
        container.addEventListener('click', () => {
            outfitId = container.getAttribute('data-id')
            renderClothingDisplay(null, 'editOutfit', outfitId)
        })
    })
    return outfitId
}

//daily challenges and quiz
async function getDaily(user, dateInfo, type, appendTo) {

    let calendarData = await selectUserTable(window.user, 'user_calendar')
    let [year, month, day] = dateInfo.split('-')
    let currentMonth = months[month - 1].toLowerCase()

    for (const element of calendarData) {
        if (element.year == year) {
            let targetMonth = element.calendar[currentMonth]

            if (targetMonth) {
                let target = targetMonth[day]

                if (type == 'challenge') {
                    let challengesData = await userChallenges()

                    if (target.challenges.length == 0) {
                        target.challenges.push(...challengesData)
                        await updateUserTable(window.user, 'user_calendar', { calendar: element.calendar })
                    }
                    await renderChallenges(window.user, target.challenges, dateInfo, appendTo)

                } else if (type == 'quiz') {
                    let quizData = await userQuiz()
                    if (target.quiz.length == 0) {
                        target.quiz.push(...quizData)
                        await updateUserTable(window.user, 'user_calendar', { calendar: element.calendar });
                    }
                    let sessionCompleted = localStorage.getItem(`quiz_${dateInfo}_completed`);
                    let btn = new CreateElement('button').setText('quiz').addEventListener('click', async () => {
                        await renderQuiz(target.quiz, dateInfo, appendTo);
                    }).appendTo(appendTo)
                    if (sessionCompleted) {
                        btn.setAttribute('disabled', true)
                        btn.innerText = 'quiz completed'
                    }
                }
            }

        }
    }

    return calendarData
}

let getUserData = async (dateInfo, progressType) => {

    let [userDetailsData, calendarData] = await Promise.all([
        selectUserTable(window.user, 'user_details'),
        selectUserTable(window.user, 'user_calendar')
    ])

    let progress = {}
    let challengesToday = []

    let updateChallengesProgress = userDetailsData[0].challenges_progress
    let updateQuestionsProgress = userDetailsData[0].questions_progress

    switch (progressType) {
        case 'challenges':
            progress.challengesProgress = updateChallengesProgress

            let [year, month, day] = dateInfo.split('-');
            let currentMonth = months[month - 1].toLowerCase();
            challengesToday = calendarData[0].calendar[currentMonth]?.[day]?.challenges || [];
            break;

        case 'questions':
            progress.questionsProgress = updateQuestionsProgress
            break;

        default:
            break;
    }

    return progressType == 'questions'
        ? { progress }
        : { progress, challengesToday, calendarData }
}

//challenges
async function userChallenges() {
    let challenges = await initializeUserDetails('challenges', 'challenges_progress')
    let challengesProgress = challenges[0].challenges_progress

    return challengesProgress
        .sort(() => Math.random() - 0.5)
        .slice(0, 5);
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

// quiz
let groupQuestions = (questions) => {
    let byTag = {}
    questions.forEach(question => {
        if (question.tag) question.tag.forEach(t => {
            if (!byTag[t]) byTag[t] = []
            byTag[t].push(question)
        })
    })
    return byTag
}

let getRandomTags = (tagKeys) => {
    let shuffled = tagKeys.sort(() => Math.random() - 0.5)
    return [shuffled[0], shuffled[1]]
}

let tagSplit = () => {
    return Math.floor(Math.random() * 5 + 1)
}

let getQuestionsTag = (obj, tag, count) => {
    let shuffledQuestions = [...(obj[tag] || [])].sort(() => Math.random() - 0.5);
    return shuffledQuestions.length >= count ? shuffledQuestions.slice(0, count) : shuffledQuestions;
}

let newQuestions = (obj, selected, tags) => {
    let extra = 6 - selected.length;
    let extraQuestions = [...obj[tags[0]], ...obj[tags[1]]]
        .filter(q => !selected.includes(q))
        .sort(() => Math.random() - 0.5)
        .slice(0, extra);
    return extraQuestions;
}

async function userQuiz() {
    let userQuestions = await initializeUserDetails('questions', 'questions_progress')
    userQuestions = userQuestions[0].questions_progress

    let byTag = groupQuestions(userQuestions)
    let tagKeys = Object.keys(byTag)

    if (tagKeys.length < 2) return console.log('not enough tags');

    let tags = getRandomTags(tagKeys)
    let allQuestions
    tags.forEach(tag => { allQuestions = [byTag[tag]] })

    let filteredQuestions = allQuestions.filter(q => {
        let correctAnswers = q.correct_answers || 0;
        return correctAnswers < 2
    });

    let countTag1 = tagSplit()
    let countTag2 = 6 - countTag1
    let counts = [countTag1, countTag2]

    let questionsSelected = []
    tags.forEach((tag, index) => { questionsSelected = questionsSelected.concat(getQuestionsTag(filteredQuestions, tag, counts[index])) })

    if (questionsSelected.length < 6) questionsSelected.push(...newQuestions(byTag, questionsSelected, [tags[0], tags[1]]))
    questionsSelected.sort(() => Math.random(-0.5))

    return questionsSelected
}

async function renderQuiz(currentQuiz, challengeDate, challengesContainer, complete = false) {
    let main = new CreateElement('div').appendTo(challengesContainer)
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
    let answeredQuestions = 0
    let score = 0

    let sessionCompleted = localStorage.getItem(`quiz_${challengeDate}_completed`);

    if (sessionCompleted) {
        new CreateElement('p')
            .setText('You have already completed this quiz')
            .appendTo(main);
        return;
    }

    currentQuiz.forEach(question => {
        let qId = question.id
        let section = new CreateElement('div').setAttributes({ class: 'question-group' }).appendTo(main);
        new CreateElement('h3').setText(question.question).appendTo(section)
        let answers = groupedQuestionsAnswers[qId] || [];

        let isAnswered = false
        answers.forEach(answer => {
            let update = progress.questionsProgress.find(item => item.id == question.id)
            console.log(update);

            new CreateElement('p').setText(answer.answer).addEventListener('click', async () => {
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
                } else {
                    console.log(`u'll get it next time`);
                    if (update) {
                        update.attempts += 1
                    }
                }

                await updateUserTable(window.user, 'user_details', { user_id: user.id, questions_progress: progress.questionsProgress })

                if (answeredQuestions === totalQuestions) {
                    let result = (score / totalQuestions) * 100
                    console.log(result);
                    localStorage.setItem(`quiz_${challengeDate}_completed`, true);
                }
            }).appendTo(section);
        });
    })

    console.log({ progress });

}