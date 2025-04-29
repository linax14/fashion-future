document.addEventListener("userInitialized", async () => {
    //console.log("user", window.user)
    clothingManager = new ClothingManager(window.user)
    outfitItems = new ClothingItems(window.user)

    let completed = localStorage.getItem('challengeCompleted')
    if (!completed) {
        await getChallengeAction()
    }
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
            .update({ wear_count: wearCount })
            .eq('id', itemId);

        if (error) {
            console.error(error);
        }
    }

    return itemWearMap
}

async function renderClothingDisplay(createOutfitDate, settings) {
    clothingContainer = document.querySelector('.clothing-container')
    if (clothingContainer) {
        clothingContainer.innerHTML = ''
    }

    displayInPlanner('clothing')
    closeBtnX(clothingContainer, () => displayInPlanner('calendar'))

    let itemsToAdd = []
    let header = new CreateElement('h3')
    renderClothingDisplayHeader(settings, header)

    let filtersContainer = new CreateElement('div').setAttributes({ class: 'filters-container' }).appendTo(clothingContainer)
    let filters = new CreateElement('h4').setText('Filters').appendTo(filtersContainer);
    let clothingList = new CreateElement('div').setAttributes({ class: 'clothing-list' }).appendTo(clothingContainer)
    let clothingItemElements

    let data = await selectUserTable(window.user, 'clothing_items')

    if (settings.challenge) {
        let filtered = settings.challenge.filtered
        if (filtered && filtered.length > 0) {
            let challengeContainer = new CreateElement('div').setAttributes({ class: 'clothing-list' }).appendTo(clothingContainer)
            new CreateElement('h4').setText('Challenge Items').appendTo(challengeContainer)
            let clothingItems = await renderClothingItem(null, challengeContainer, filtered, itemsToAdd)
            console.log(clothingItems);

            data = data.filter(item => !filtered.some(filteredItem => filteredItem.id == item.id))
        }
    }

    if (data.length > 0) {
        new CreateElement('h4').setText('Other Items').appendTo(clothingList)
    }
    filters.addEventListener('click', async () => {
        let filtersSection = document.querySelector('.filters');

        if (!filtersSection) {
            await renderFilters(filtersContainer, clothingList, (data) => {
                clothingList.innerHTML = '';
                data.forEach(e => renderClothingItem(null, clothingList, [e], itemsToAdd));

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

    clothingItemElements = await renderClothingItem(null, clothingList, data, itemsToAdd)

    let btnContainer = new CreateElement('div').setAttributes({ class: 'btn-container bottom' }).appendTo(clothingContainer)
    let btns = document.querySelectorAll('.btn').forEach(btn => btn.remove())
    let submitBtn = new CreateElement('button').setText('Save').setAttributes({ class: 'submit btn' }).appendTo(btnContainer)
    let deleteBtn = new CreateElement('button').setText('Delete').setAttributes({ class: 'delete btn' }).appendTo(btnContainer)

    if (settings.challenge?.challengeData) {
        if (settings.mode == 'addOutfit') {
            setDisplay([deleteBtn], 'none')
            deleteBtn.disabled = true
            itemsToAdd = await addMode(itemsToAdd, createOutfitDate, submitBtn, settings.challenge.filtered)
        }
    } else {
        switch (settings.mode) {
            case 'addOutfit':
                setDisplay([deleteBtn], 'none')
                deleteBtn.disabled = true
                itemsToAdd = await addMode(itemsToAdd, createOutfitDate, submitBtn)
                break;
            case 'editOutfit':
                itemsToAdd = await editMode(settings.outfitId, clothingItemElements, itemsToAdd, submitBtn, deleteBtn);
                break;
            case 'garmentCare':
                itemsToAdd = await careMode(itemsToAdd, createOutfitDate, submitBtn, settings.outfitId, settings.formValues)
                break
            default:
                setDisplay([deleteBtn], 'none')
                deleteBtn.disabled = true
                itemsToAdd = await addMode(itemsToAdd, createOutfitDate, submitBtn)
                break;
        }
    }
}

function renderClothingDisplayHeader(settings, header) {
    switch (settings.mode) {
        case 'addOutfit':
            header.setText('New outfit').appendTo(clothingContainer)
            break
        case 'editOutfit':
            header.setText('Edit outfit').appendTo(clothingContainer)
            break
        case 'garmentCare':
            header.setText('Add items to basket').appendTo(clothingContainer)
            break
        default:
            break
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

    let alreadyLogged = sortedDates.includes(createOutfitDate)
    if (!alreadyLogged) sortedDates.push(createOutfitDate)

    sortedDates = [...new Set(sortedDates)].sort((a, b) => new Date(a) - new Date(b))

    let prevDate = null;
    let streakCount = 0;

    let data = await calendarDataTarget(createOutfitDate, 'day')
    let target = data.target
    let calendar = target.calendar

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

            if (!alreadyLogged) {
                await updateUserTable(window.user, 'user_calendar', { calendar: calendar });
                await updatePoints(['discipline'], createOutfitDate);
            }
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

// localStorage.clear()
let addMode = async (itemsToAdd, createOutfitDate, submitBtn, challengeExtras) => {

    submitBtn.addEventListener('click', async (event) => {
        event.preventDefault()

        if (itemsToAdd.length <= 0) {
            alert('Please select at least one item')
            return
        }

        let outfitId = await clothingManager.generateId('outfit')

        await outfitItems.addItems('outfit_items', outfitId, itemsToAdd)
        if (createOutfitDate) {
            await clothingManager.update('outfit', outfitId, {
                wear_dates: Array.isArray(createOutfitDate) ? createOutfitDate : [createOutfitDate],
                worn: true
            })
            await updatePoints(['style'], createOutfitDate)
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

        let challengeFailed = false
        if (challengeExtras) {
            for (let item of challengeExtras) {
                if (itemsToAdd.includes(item.id)) {
                    await updatePoints(['curiosity', 'style'], createOutfitDate)
                    await completeChallenge()
                } else {
                    let confirmed = await confirmBox({
                        title: 'Challenge Fail',
                        text: `You did not select a challenge item, if you save the outfit you will not gain challenge points and you will not be able to redo the challenge today`,
                        save: 'Save', dismiss: 'Go back'
                    })

                    if (confirmed) {
                        await completeChallenge()

                    } else {
                        challengeFailed = true
                        displayInPlanner('clothing')
                    }
                }
            }
        } else {
            updatePoints(['curiosity'], createOutfitDate)
            completeChallenge()
        }

        if (challengeFailed == false) {
            itemsToAdd = []
            displayInPlanner('calendar')

            let count = await updateWearCount(itemWearMap);
            let streak = await addOutfitStreak(createOutfitDate);
            console.log(streak);
        }
    })

    return itemsToAdd
}

//add mastery and knowledge point for 100 compatibility 
//add knowledge point for 50 compatibility 
let careMode = async (itemsToAdd, createOutfitDate, submitBtn, outfitId, values) => {
    let checkboxes = document.querySelectorAll('.wardrobe-checkbox');

    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', async (event) => {
            let itemId = event.target.closest('.item-container').dataset.id;

            if (event.target.checked) {
                let compatibility = await careCompatibility([itemId], values);

                if (compatibility.length == 0) {
                    let confirmed = await confirmBox({
                        title: 'Incompatible Item',
                        text: `This item has care instructions that don't fully match this care event. Would you like to keep it anyway or remove it from your selection?`,
                        save: 'Keep', dismiss: 'Remove'
                    });

                    if (!confirmed) {
                        event.target.checked = false
                        itemsToAdd = itemsToAdd.filter(id => id != itemId);
                    }
                }
            }
        });
    });

    submitBtn.addEventListener('click', async (event) => {

        event.preventDefault()
        console.log(itemsToAdd);

        if (itemsToAdd.length <= 0) {
            alert('Please select at least one item')
            return
        }

        await outfitItems.addItems('care_items', outfitId, itemsToAdd);

        //     await updatePoints(['style'], createOutfitDate)

        itemsToAdd = []

        displayInPlanner('calendar')
    })
    return itemsToAdd
}

let confirmBox = (settings) => {
    return new Promise((resolve) => {
        let modal = new CreateElement('div').setAttributes({ class: 'modal', tabindex: -1, role: 'dialog' })
            .appendTo(document.body)
        setDisplay([modal], 'flex')

        let dialog = new CreateElement('div').setAttributes({ class: 'modal-dialog modal-sm', role: 'document' })
            .appendTo(modal)
        let header = new CreateElement('div').setAttributes({ class: 'modal-header' }).appendTo(dialog)
        new CreateElement('h4').setAttributes({ class: 'modal-title' }).setText(settings.title).appendTo(header)
        closeBtnX(header, () => {
            modal.remove()
            displayInPlanner('clothing')
            resolve(false)
        })
        let body = new CreateElement('div').setAttributes({ class: 'modal-body' }).appendTo(dialog)
        let text = new CreateElement('p').setAttributes({ class: 'modal-title' })
            .setText(settings.text).appendTo(body)
        let footer = new CreateElement('div').setAttributes({ class: 'modal-footer' }).appendTo(dialog)
        let saveBtn = new CreateElement('button').setText(settings.save).setAttributes({ class: 'btn btn-primary' }).appendTo(footer)
        saveBtn.addEventListener('click', () => {
            modal.remove()
            displayInPlanner('clothing')
            resolve(true)
        })

        let dismissBtn = new CreateElement('button').setText(settings.dismiss).setAttributes({ class: 'btn btn-secondary', 'data-dismiss': 'modal' }).appendTo(footer)
        dismissBtn.addEventListener('click', () => {
            modal.remove()
            resolve(false)
        })
    })
}

async function careCompatibility(itemsToAdd, values) {
    let clothingItems = await outfitItems.getData('clothing_items', [itemsToAdd])
    let compatibleItems = []

    let careMap = {
        wash: {
            'hand wash': 1, 'do not wash': 0, 'wash': 6, 'wash at 30': 2,
            'wash at 40': 3, 'wash at 50': 4, 'wash at 60': 5
        },
        bleach: {
            'do not bleach': 0, 'bleach': 3, 'ncl bleach': 1, 'cl bleach': 2,
        },
        tumble_dry: {
            'do not tumble dry': 0, 'tumble dry': 3,
            'tumble dry low': 1, 'tumble dry normal': 2,
        },
        natural_dry: {
            'dry': 1, 'line dry': 1, 'dry flat': 1,
            'drip dry': 1, 'dry in shade': 0, 'line dry in the shade': 0,
            'dry flat in shade': 0, 'drip dry in shade': 0
        },
        iron: {
            'do not iron': 0, 'iron': 4, 'iron low': 1, 'iron medium': 2,
            'iron high': 3,
        }
    }

    clothingItems.forEach(item => {
        console.log(item);

        let itemCare = item.care_instructions

        let isCompatible = Object.keys(itemCare).every(key => {

            if (!values[key]) {
                return true;
            }

            let itemCareValue = careMap[key][itemCare[key]]
            let eventCareValue = careMap[key][values[key]]

            if (itemCareValue == '' || itemCareValue == null) return true
            return itemCareValue >= eventCareValue
        })

        if (isCompatible) {
            compatibleItems.push(item.id)
        }
    })

    return compatibleItems
}

let getOutfitId = (outfitId) => {
    let outfitContainer = document.querySelectorAll('.outfit');
    outfitContainer.forEach(container => {
        container.addEventListener('click', () => {
            outfitId = container.getAttribute('data-id')
            renderClothingDisplay(null, { mode: 'editOutfit', outfitId: outfitId })
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
                }

                if (type == 'quiz') {
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

async function getChallengeAction() {
    let challengeAction = localStorage.getItem('challengeAction')
    let clothingData = JSON.parse(localStorage.getItem('filteredData'))
    let challengeData = JSON.parse(localStorage.getItem('challengeData'))

    let actionData = null
    if (challengeAction) {
        actionData = JSON.parse(challengeAction)

        if (actionData.action == 'addOutfit') {
            await renderClothingDisplay(actionData.dateInfo, { mode: 'addOutfit', challenge: { filtered: clothingData, challengeData: challengeData } })
        }
    }
}

async function completeChallenge() {

    let challenge = JSON.parse(localStorage.getItem('challengeAction'))

    if (challenge && challenge.fromChallenge) {
        let { progress, challengesToday, calendarData } = await getUserData(challenge.dateInfo, 'challenges')
        let updateChallenge = progress.challengesProgress.find(item => item.id == challenge.challengeId)
        if (updateChallenge) updateChallenge.complete_count += 1

        await updateUserTable(window.user, 'user_details', { user_id: user.id, challenges_progress: progress.challengesProgress })

        localStorage.setItem('challengeCompleted', JSON.stringify({
            challengeId: challenge.challengeId,
            dateInfo: challenge.dateInfo
        }))

        localStorage.removeItem('challengeAction')
        window.location.href = './dashboard.html'
    }
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
