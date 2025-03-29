document.addEventListener("userInitialized", async () => {
    renderCalendarDisplay()
    // renderClothingDisplay()
});

let calendarContainer = new CreateElement('div').setAttributes({ id: 'calendar' }).appendTo(document.body)

let clothingContainer = new CreateElement('div').setAttributes({ class: 'clothing-container' })
    .appendTo(document.body)

async function renderCalendarDisplay() {
    calendarContainer.innerHTML = ''

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

    let weekScrollWrapper = new CreateElement('div').setAttributes({ class: 'week-scroll-wrapper' }).appendTo(main);

    let daysContainer = new CreateElement('div').setAttributes({ class: 'days-container' }).appendTo(weekScrollWrapper);

    let noDaysMonth = new Date(year, month + 1, 0).getDate();

    let outfitsContainer = new CreateElement('div').setAttributes({ class: 'outfits-container' }).appendTo(calendarContainer);
    setDisplay([outfitsContainer], 'none')

    let createOutfitDate = null
    let createOutfit = new CreateElement('div').setAttributes({ class: 'create-outfit' }).appendTo(outfitsContainer)
    createOutfit.addEventListener('click', () => {
        setDisplay([calendarContainer], 'none')
        renderClothingDisplay(createOutfitDate)
    })
    new CreateElement('h2').setText('add an outfit').appendTo(createOutfit)
    new CreateElement('img').setAttributes({ src: '../assets/createOutfit.png' }).appendTo(createOutfit)

    let challengesContainer = new CreateElement('div').setAttributes({ class: 'challenges-container' }).appendTo(calendarContainer);
    setDisplay([challengesContainer], 'none')

    for (let day = 1; day <= noDaysMonth; day++) {
        let currentDate = new Date(year, month, day);
        let formattedDate = formatDatePadded(`${year}-${month + 1}-${day}`);
        let dataDate = `${year}-${month + 1}-${day}`

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

                let selected = document.querySelector('.day-container.selected');
                if (selected) selected.classList.remove('selected');
                dayContainer.classList.add('selected');

                createOutfitDate = dataDate

                challengesContainer.innerHTML = ''
                setDisplay([outfitsContainer, challengesContainer], 'block')
                document.querySelectorAll('.outfit').forEach(el => el.parentNode.removeChild(el));

                await renderOutfits(dataDate, outfitsContainer);
                await getDailyChallenges(window.user, dataDate, challengesContainer)
            })
            .appendTo(dayContainer);
    }

    setTimeout(async () => {
        let todayDiv = document.querySelector('.day-container.today');
        if (todayDiv) {

            let scrollContainer = document.querySelector('.week-scroll-wrapper')

            let scrollPosition = todayDiv.offsetLeft - (scrollContainer.clientWidth / 2) + (todayDiv.clientWidth / 2);
            scrollContainer.scrollTo({
                left: scrollPosition,
                behavior: 'smooth'
            });
            todayDiv.classList.add('selected')
            let div = todayDiv.childNodes[1]

            let hasDate = div.hasAttribute('data-date')
            if (hasDate) {
                let date = div.getAttribute('data-date')

                challengesContainer.innerHTML = ''
                setDisplay([outfitsContainer, challengesContainer], 'block')

                await renderOutfits(date, outfitsContainer);
                await getDailyChallenges(window.user, date, challengesContainer)
            }
        }
    }, 0);
}

async function renderOutfits(dataDate, outfitsContainer) {
    let outfits = await getDetailedOutfits();

    for (const element of outfits) {
        if (element.wornDates) {
            let outfitDates = element.wornDates;

            outfitDates.forEach(date => {

                if (formatDateUnpadded(date) == dataDate) {                    
                    let outfitContainer = new CreateElement('div').setAttributes({ class: 'outfit' }).appendTo(outfitsContainer)
                    element.clothingItems.forEach(async (item) => {
                        if (item.image) {
                            try {
                                const { data: signedUrlData, error: urlError } = await supabase.storage
                                    .from('fashion-future')
                                    .createSignedUrl(`${item.user_id}/${item.image}`, 60);

                                if (urlError) throw urlError;
                                if (signedUrlData.signedUrl) {
                                    new CreateElement('img')
                                        .setAttributes({ class: '', src: signedUrlData.signedUrl })
                                        .appendTo(outfitContainer);
                                }
                            } catch (urlError) {
                                console.error(`Error fetching image URL: ${urlError}`);
                            }
                        }
                    });
                }
            });
        }
    }
}

async function renderClothingDisplay(createOutfitDate) {
    setDisplay([clothingContainer], 'block')

    let itemsToAdd = []

    let closeBtn = new CreateElement('button')
        .setAttributes({ class: 'close' })
        .setText('×')
        .addEventListener('click', () => {
            setDisplay([calendarContainer], 'block')
            setDisplay([clothingContainer], 'none')
        })
        .appendTo(clothingContainer)

    new CreateElement('h2')
        .setText('Add Outfit')
        .appendTo(clothingContainer)

    let filtersContainer = new CreateElement('div')
        .setAttributes({ class: 'filters' })
        .appendTo(clothingContainer)

    let filtersHeader = new CreateElement('h2').setText('Filters')
        .appendTo(filtersContainer)

    let clothingList = new CreateElement('div')
        .setAttributes({ class: 'clothing-list' })
        .appendTo(clothingContainer)

    let clothingItemElements = await displayClothingItems(null, clothingList, null, itemsToAdd)

    filtersHeader.addEventListener('click', () => {
        let miniModal = document.querySelector('.mini.modal')

        if (!miniModal) {
            renderFiltersModal(wardrobeHeader, wardrobeContainer, (filteredItems) => {
                wardrobeContainer.innerHTML = ''
                filteredItems.forEach(e => displayClothingItems(null, clothingList, [e], itemsToAdd))
                console.log(filteredItems);
            }, true)
            miniModal = document.querySelector('.mini.modal');
        }

        if (miniModal) setDisplay([miniModal], filterMode ? 'block' : 'none')
        editWardrobe.disabled = filterMode
    })

    new CreateElement('button')
        .setText('add outfit')
        .setAttributes({ class: 'submit btn' })
        .addEventListener('click', async (event) => {
            event.preventDefault()

            if (itemsToAdd.length < 0) {
                alert('Please select at least one item')
                return
            }

            let outfitId = await generateOutfit(window.user)

            await addItemsOutfit(window.user, outfitId, itemsToAdd)

            if (createOutfitDate) {
                await updateOutfit(window.user, outfitId, createOutfitDate)
            }

            itemsToAdd = []

            setDisplay([calendarContainer], 'block')
            setDisplay([clothingContainer], 'none')

        })
        .appendTo(clothingContainer)
}

async function getDetailedOutfits() {
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

    return outfitDetails
}

async function getDailyChallenges(user, challengeDate, challengesContainer) {

    let userChallenges = await initializeUserChallenges(window.user)
    let userDetails = await selectUserTable(window.user, 'user_details')
    let [year, month, day] = challengeDate.split('-')

    let challengesProgress = userChallenges[0].challenges_progress

    let randomChallenges = challengesProgress
        .sort(() => Math.random() - 0.5)
        .slice(0, 5)

    let currentMonth = months[month - 1].toLowerCase()

    for (const element of userDetails) {
        if (element.year == year) {
            let targetMonth = element.calendar[currentMonth]

            if (targetMonth) {
                let target = targetMonth[day]

                if (target.challenges.length == 0) {
                    target.challenges.push(...randomChallenges)

                    await updateUserTable(window.user, 'user_details', { calendar: element.calendar })

                } else {
                    await renderChallenges(window.user, target.challenges, challengesContainer, challengeDate)
                }
            }

        }
    }
}

async function renderChallenges(user, randomChallenges, challengesContainer, challengeDate) {

    let challenges = new CreateElement('div')
        .setAttributes({ class: 'challenges' })
        .addEventListener('click', async () => {
            challenges.classList.toggle('expanded');
        })
        .appendTo(challengesContainer)

    new CreateElement('h2')
        .setText('challenges')
        .appendTo(challenges)

    let data = await selectUserTable(window.user, 'user_details')

    let updateChallengesProgress = data[0].challenges_progress
    let updateCalendar = data[0].calendar
    let [year, month, day] = challengeDate.split('-')
    let currentMonth = months[month - 1].toLowerCase()
    let challengesToday = data[0].calendar[currentMonth][day].challenges;

    randomChallenges.forEach(value => {

        let elements = new CreateElement('div').setAttributes({ class: 'elements' }).appendTo(challenges)

        let checkbox = new CreateElement('input')
            .setAttributes({ type: 'checkbox', id: value.id, class: 'challenges' })
            .addEventListener('click', (event) => {
                event.stopPropagation()
            })
            .addEventListener('change', async (event) => {
                event.preventDefault()

                let updateChallenge = updateChallengesProgress.find(item => item.id == checkbox.id)
                let updateCalendarChallenge = challengesToday.find(item => item.id == checkbox.id)

                if (checkbox.checked) {

                    if (updateCalendarChallenge) updateCalendarChallenge.completed = true;
                    if (updateChallenge) updateChallenge.complete_count += 1;

                } else {
                    if (updateCalendarChallenge) updateCalendarChallenge.completed = false;
                    if (updateChallenge) updateChallenge.complete_count = Math.max(0, updateChallenge.complete_count - 1);
                }

                await updateUserTable(window.user, 'user_details', { user_id: user.id, challenges_progress: updateChallengesProgress, calendar: updateCalendar })

            })
            .appendTo(elements)

        let ul = new CreateElement('ul').setText(value.title).appendTo(elements)
        new CreateElement('li').setText(value.details).appendTo(ul)

        checkbox.checked = challengesToday.some(item => item.id === value.id && item.completed);
    });
}
