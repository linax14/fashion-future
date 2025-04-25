document.addEventListener("userInitialized", async () => {
    //console.log("user", window.user)
    clothingManager = new ClothingManager(window.user)
    outfitItems = new ClothingItems(window.user)
})

let clothingManager
let outfit

async function renderOutfits(dataDate, outfitsContainer) {
    let data = (await clothingManager.getData('outfit'))
        .filter(item => {
            if (item.worn == true) {
                return item.wornDates?.some(date => {
                    return formatDateUnpadded(date) == dataDate
                })
            }
            return false
        });

    for (const element of data) {
        let outfitContainer = new CreateElement('div').setAttributes({ class: 'outfit', 'data-id': element.outfitId }).appendTo(outfitsContainer)
        let count = 0
        await Promise.all(
            element.clothingItems.map(async (item) => {
                count++
                await getImage(item, outfitContainer, renderImage)
            }))

        outfitImagesDisplay(outfitContainer, count)
        // await updateWearCount(element);
    }

    return true
}

async function renderPreviousOutfits(container) {
    let data = (await clothingManager.getData('outfit')).sort(() => Math.random() - 0.5).slice(0, 2)
    let prevDiv = new CreateElement('div').setAttributes({ class: 'prev-worn-container' }).appendTo(container)

    new CreateElement('h4').setText('Previously worn').appendTo(prevDiv)
    for (const element of data) {
        let outfitContainer = new CreateElement('div').setAttributes({ class: 'outfit', 'data-id': element.outfitId }).appendTo(prevDiv)
        let count = 0
        await Promise.all(
            element.clothingItems.map(async (item) => {
                count++
                await getImage(item, outfitContainer, renderImage)
            })
        )

        outfitImagesDisplay(outfitContainer, count)
    }
    return true
}

function outfitImagesDisplay(outfitContainer, count) {
    let images = outfitContainer.querySelectorAll('img');
    let c = images.length;

    if (count == 1) {
        outfitContainer.style.display = 'grid'
        outfitContainer.style.gridTemplateColumns = '1fr'
    } else {
        outfitContainer.style.display = 'grid'
        outfitContainer.style.gridTemplateColumns = 'repeat(2, 1fr)'

        if (count % 2 != 0) {
            images[c - 1].style.gridColumn = 'span 2';
        }

    }
}

async function updateWearCount(itemWearMap) {

    for (let [itemId, dates] of itemWearMap.entries()) {
        let wearCount = dates.size;

        let { error } = await supabase.from('clothing_items')
            .update('outfit', { wear_count: wearCount })
            .eq('id', itemId);

        if (error) {
            console.error(error);
        }
    }

    return itemWearMap
}

async function renderClothingDisplay(createOutfitDate, type, outfitId) {
    clothingContainer.innerHTML = ''
    displayInPlanner('clothing')
    closeBtnX(clothingContainer, () => displayInPlanner('calendar'))

    let itemsToAdd = []

    let header = new CreateElement('h3')

    switch (type) {
        case 'addOutfit':
            header.setText('Add outfit').appendTo(clothingContainer)
            break;
        case 'editOutfit':
            header.setText('Edit outfit').appendTo(clothingContainer)
            break;
        case 'garmentCare':
            header.setText('Add items to basket').appendTo(clothingContainer)
            break
        default:
            break;
    }

    let filtersContainer = new CreateElement('div').setAttributes({ class: 'filters-container' }).appendTo(clothingContainer)
    let clothingList = new CreateElement('div').setAttributes({ class: 'clothing-list' }).appendTo(clothingContainer)

    let clothingItemElements = await renderClothingItem(null, clothingList, null, itemsToAdd)

    new CreateElement('h4').setText('Filters')
        .addEventListener('click', async () => {
            let filtersSection = document.querySelector('.filters');

            if (!filtersSection) {
                await renderFilters(filtersContainer, clothingList, (filteredItems) => {
                    clothingList.innerHTML = '';
                    filteredItems.forEach(e => renderClothingItem(null, clothingList, [e], itemsToAdd));
                    console.log(filteredItems);
                    setDisplay([submitBtn, deleteBtn], 'block');
                    setDisplay([clothingList], 'grid');
                });
                filtersSection = document.querySelector('.filters');
            }

            let isExpanded = filtersSection.classList.toggle('expanded');

            setDisplay([clothingList], isExpanded ? 'none' : 'grid');
            setDisplay([filtersSection], isExpanded ? 'block' : 'none');
            setDisplay([btnContainer], isExpanded ? 'none' : 'block');
        })
        .appendTo(filtersContainer);

    let btnContainer = new CreateElement('div').setAttributes({ class: 'btn-container bottom' }).appendTo(clothingContainer)
    let btns = document.querySelectorAll('.btn').forEach(btn => btn.remove());
    let submitBtn = new CreateElement('button').setText('Save').setAttributes({ class: 'submit btn' }).appendTo(btnContainer)
    let deleteBtn = new CreateElement('button').setText('Delete').setAttributes({ class: 'delete btn' }).appendTo(btnContainer)

    switch (type) {
        case 'addOutfit':
            setDisplay([deleteBtn], 'none')
            deleteBtn.disabled = true
            itemsToAdd = await addMode(itemsToAdd, createOutfitDate, submitBtn)
            break;
        case 'editOutfit':
            itemsToAdd = await editMode(outfitId, clothingItemElements, itemsToAdd, submitBtn, deleteBtn);
            break;
        case 'garmentCare':
            itemsToAdd = await careMode(itemsToAdd, createOutfitDate, submitBtn, outfitId)
            break
        default:
            setDisplay([deleteBtn], 'none')
            deleteBtn.disabled = true
            itemsToAdd = await addMode(itemsToAdd, createOutfitDate, submitBtn)
            break;
    }
}

async function addOutfitStreak(createOutfitDate) {

    let { data: outfitData, error } = await supabase.from('outfit').select('wear_dates').eq('user_id', window.user.id)
    if (error) {
        console.error(error);
        return { target: null }
    }

    let allDates = outfitData.flatMap(entry => entry.wear_dates || []);
    let sortedDates = [...new Set(allDates)].sort((a, b) => new Date(a) - new Date(b));
    sortedDates = sortedDates.map(date => formatDateUnpadded(date))

    let prevDate = null;
    let streakCount = 0;

    let data = await calendarDataTarget(createOutfitDate, 'day')
    let target = data.target
    let calendar = target.calendar

    if (sortedDates.includes(createOutfitDate)) {
        // console.log('already logged - skip');
        return { target };
    }

    for (let dateStr of sortedDates) {
        let curr = dateStr;

        if (prevDate) {
            let diffInDays = datesDifference(prevDate, curr)
            streakCount = (diffInDays == 1) ? streakCount + 1 : 1;
        } else {
            streakCount = 1;
        }

        if (dateStr == createOutfitDate) {
            if (target) {
                target.streak = streakCount
            }
            await updateUserTable(window.user, 'user_calendar', { calendar: calendar });
            await updatePoints('discipline', createOutfitDate);

        } prevDate = dateStr;
    }
    return { target };
}

let editMode = async (outfitId, clothingItemElements, itemsToAdd, submitBtn, deleteBtn) => {

    let id = getOutfitId(outfitId);
    let outfit = await clothingManager.getData('outfit', outfitId);
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

    submitBtn.addEventListener('click', async (event) => {
        event.preventDefault();
        let data = await clothingManager.getItems('outfit_items', [id])
        let existingIds = new Set(Object.values(data)[0]);
        let newItems = [...new Set(itemsToAdd)].filter(item => !existingIds.has(item));

        if (newItems.length > 0) await outfitItems.addItems('outfit_items', id, newItems)
        if (itemsToRemove.length > 0) await outfitItems.removeItems(id, itemsToRemove)

        renderCalendarDisplay();
        displayInPlanner('calendar')
    })

    deleteBtn.addEventListener('click', async (event) => {
        event.preventDefault();
        await clothingManager.deleteRecord('outfit', id)

        let outfitContainer = document.querySelectorAll('outfits-container');
        outfitContainer.forEach(container => {
            if (container.getAttribute('data-date') == id) container.remove();
        });

        renderCalendarDisplay();
        displayInPlanner('calendar')
    })

    return itemsToAdd;
}

let itemWearMap = new Map()

let addMode = async (itemsToAdd, createOutfitDate, submitBtn) => {
    submitBtn.addEventListener('click', async (event) => {
        event.preventDefault()
        console.log(itemsToAdd);

        if (itemsToAdd.length <= 0) {
            alert('Please select at least one item')
            return
        }

        let outfitId = await clothingManager.generateId('outfit')
        console.log(outfitId);

        await outfitItems.addItems('outfit_items', outfitId, itemsToAdd)
        if (createOutfitDate) {
            await clothingManager.update('outfit', outfitId, {
                wear_dates: Array.isArray(createOutfitDate) ? createOutfitDate : [createOutfitDate],
                worn: true
            })
            await updatePoints('style', createOutfitDate)
        }

        let data = await clothingManager.getData('outfit')


        for (let outfit of data) {

            if (outfit.worn && outfit.wornDates && outfit.clothingItems) {
                for (let date of outfit.wornDates) {
                    for (let item of outfit.clothingItems) {
                        if (!itemWearMap.has(item.id)) {
                            itemWearMap.set(item.id, new Set());
                        }
                        itemWearMap.get(item.id).add(date);
                    }
                }
            }
        }

        let count = await updateWearCount(itemWearMap);
        console.log(count);

        itemsToAdd = []

        await addOutfitStreak(createOutfitDate);
        displayInPlanner('calendar')
    })
    return itemsToAdd
}

let careMode = async (itemsToAdd, createOutfitDate, submitBtn, outfitId, type) => {
    submitBtn.addEventListener('click', async (event) => {
        event.preventDefault()
        console.log(itemsToAdd);

        if (itemsToAdd.length <= 0) {
            alert('Please select at least one item')
            return
        }

        await outfitItems.addItems('care_items', outfitId, itemsToAdd)
        // if (createOutfitDate) {
        //     await clothingManager.update('outfit',outfitId, createOutfitDate)
        //     await updatePoints('style', createOutfitDate)
        // }


        itemsToAdd = []

        displayInPlanner('calendar')
    })
    return itemsToAdd
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
    let quiz
    let header

    for (const element of calendarData) {
        if (element.year == year) {
            let targetMonth = element.calendar[currentMonth]

            if (targetMonth) {
                let target = targetMonth[day]

                async function handleQuiz() {
                    localStorage.setItem('targetQuiz', JSON.stringify(target.quiz));
                    localStorage.setItem('dateInfo', `${dateInfo}`);
                    await renderQuiz(target.quiz, dateInfo, quiz, handleQuiz)
                    quiz.classList.toggle('expanded')
                    setDisplay([header], 'none')
                    let challenges = document.querySelector('.challenges')
                    setDisplay([challenges], 'none')
                }

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
                    quiz = new CreateElement('div').setAttributes({ class: 'quiz-container' }).appendTo(appendTo)
                    header = new CreateElement('div').setAttributes({ class: 'header' }).addEventListener('click', handleQuiz).appendTo(quiz)
                    let h2 = new CreateElement('h2').setText('quiz').appendTo(header)
                    new CreateElement('i').setAttributes({ class: 'fa-solid fa-question' }).appendTo(header)

                    if (sessionCompleted) {
                        header.removeEventListener('click', handleQuiz)
                        h2.innerText += ' completed'
                        new CreateElement('br').appendTo(h2)
                        new CreateElement('span').setText('check back tomorrow').appendTo(h2)
                    }
                }
            }

        }
    }

    return calendarData
}

//challenges
async function userChallenges() {
    let challenges = await initializeUserDetails('challenges', 'challenges_progress')
    let challengesProgress = challenges[0].challenges_progress

    return challengesProgress
        .sort(() => Math.random() - 0.5)
        .slice(0, 2);
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
        return (this.grouped[tag] || []).filter(q => q.correctAnswers < 2);
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
