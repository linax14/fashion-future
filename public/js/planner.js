
async function renderOutfits(dataDate, outfitsContainer) {
    let data = await getDetailedOutfits();
    data = data.filter(item => item.worn == true)

    for (const element of data) {
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

        await updateWearCount(element);
    }

    return true
}

async function updateWearCount(element) {
    let itemWearMap = new Map();

    if (element.clothingItems) {
        for (let item of element.clothingItems) {
            if (!itemWearMap.has(item.id)) {
                itemWearMap.set(item.id, new Set());
            }

            for (date of element.wornDates) {
                itemWearMap.get(item.id).add(date);
            }
        }
    }

    for (let [itemId, dates] of itemWearMap.entries()) {
        let wearCount = dates.size;

        let { error } = await supabase.from('clothing_items')
            .update({ wear_count: wearCount })
            .eq('id', itemId);

        if (error) {
            console.error(error);
        }
    }
}

async function renderClothingDisplay(createOutfitDate, type, outfitId) {
    console.log(createOutfitDate);

    clothingContainer.innerHTML = ''
    displayInPlanner('clothing')
    let itemsToAdd = []
    let addOutfitBtn
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
        addOutfitBtn = new CreateElement('button').setText('add outfit').setAttributes({ class: 'submit btn' })
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

                addOutfitStreak(createOutfitDate)

                displayInPlanner('calendar')

            }).appendTo(clothingContainer)
    }
}

async function addOutfitStreak(createOutfitDate) {

    let { data, error } = await supabase.from('outfit').select('wear_dates').eq('user_id', window.user.id)
    // console.log(data);

    if (error) { console.error(error); }

    let calendarData = await selectUserTable(window.user, 'user_calendar')

    let allDates = data.flatMap(entry => entry.wear_dates || []);
    let sortedDates = [...new Set(allDates)].sort((a, b) => new Date(a) - new Date(b));

    sortedDates = sortedDates.map(date => formatDateUnpadded(date))
    let prevDate = null;
    let streakCount = 0;
    let target = null

    // if (sortedDates.includes(createOutfitDate)) console.log('here')

    for (let dateStr of sortedDates) {
        let curr = dateStr;

        if (prevDate) {
            let diffInDays = datesDifference(prevDate, curr)
            streakCount = (diffInDays == 1) ? streakCount + 1 : 1;
        } else {
            streakCount = 1;
        }

        if (dateStr == createOutfitDate) {
            const [year, month, day] = createOutfitDate.split('-');
            const currentMonth = months[month - 1].toLowerCase();

            for (const element of calendarData) {

                if (element.year == year) {
                    let targetMonth = element.calendar[currentMonth]

                    if (targetMonth) {
                        target = targetMonth[day]

                        target.streak = streakCount
                        await updateUserTable(window.user, 'user_calendar', { calendar: element.calendar });
                    }

                }
                break
            }
        } prevDate = dateStr;
    }
    return target;
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
            clothingItems: itemsForOutfit,
            worn: outfit.worn
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
