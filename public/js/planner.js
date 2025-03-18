document.addEventListener("userInitialized", async () => {
    renderCalendarDisplay()
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
    outfitsContainer.style.display = 'none';

    let createOutfit = new CreateElement('div').setAttributes({ class: 'create-outfit' }).appendTo(outfitsContainer)
    createOutfit.addEventListener('click', () => {
        calendarContainer.style.display = 'none'
        clothingContainer.style.display = 'block'
        renderClothingDisplay()
    })
    new CreateElement('h2').setText('add an outfit').appendTo(createOutfit)
    new CreateElement('img').setAttributes({ src: '../assets/createOutfit.png' }).appendTo(createOutfit)

    let challengesContainer = new CreateElement('div').setAttributes({ class: 'challenges-container' }).appendTo(calendarContainer);
    challengesContainer.style.display = 'none';

    for (let day = 1; day <= noDaysMonth; day++) {
        let currentDate = new Date(year, month, day);
        let formattedDate = formatDate(`${year}-${month + 1}-${day}`);
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

                outfitsContainer.style.display = 'block'
                challengesContainer.innerHTML = ''
                challengesContainer.style.display = 'block'
                document.querySelectorAll('.outfit').forEach(el => el.parentNode.removeChild(el));

                await renderOutfits(formattedDate, outfitsContainer);
                await getDailyChallenges(window.user, dataDate, challengesContainer)
            })
            .appendTo(dayContainer);

    }

    setTimeout(async () => {
        let todayDiv = document.querySelector('.day-container.today');
        if (todayDiv) {
            todayDiv.parentElement.scrollIntoView({ behavior: 'smooth', inline: 'center' });
            todayDiv.classList.add('selected')

            let div = todayDiv.childNodes[1]

            let hasDate = div.hasAttribute('data-date')
            if (hasDate) {
                let date = div.getAttribute('data-date')

                outfitsContainer.style.display = 'block'
                challengesContainer.innerHTML = ''
                challengesContainer.style.display = 'block'

                await renderOutfits(date, outfitsContainer);
                await getDailyChallenges(window.user, date, challengesContainer)
            }
        }
    }, 300);

}

async function renderOutfits(formattedDate, outfitsContainer) {
    let outfits = await getDetailedOutfits();

    for (const element of outfits) {
        if (element.wornDates) {
            let outfitDates = element.wornDates;

            outfitDates.forEach(date => {

                if (formatDate(date) == formattedDate) {
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

async function renderClothingDisplay() {
    let clothingItems = await selectUserTable(window.user, 'clothing_items')
    let itemsToAdd = []

    let closeBtn = new CreateElement('button')
        .setAttributes({ class: 'close' })
        .setText('×')
        .addEventListener('click', () => {
            calendarContainer.style.display = 'block'
            clothingContainer.style.display = 'none'
        })
        .appendTo(clothingContainer)

    new CreateElement('h2')
        .setText('Add Outfit')
        .appendTo(clothingContainer)

    let filtersContainer = new CreateElement('div')
        .setAttributes({ class: 'filters' })
        .appendTo(clothingContainer)

    new CreateElement('h2').setText('Filters')
        .appendTo(filtersContainer).getElement

    let dateContainer = new CreateElement('div').appendTo(clothingContainer)
    new CreateElement('h2').setText('Schedule Outfit').appendTo(dateContainer)
    let date = new CreateElement('input').setAttributes({ type: 'date' }).addEventListener('change', () => {
        console.log(date.value);
    }).appendTo(dateContainer)

    new CreateElement('span').setText('+')
        .setAttributes({ class: 'filters btn' })
        .addEventListener('click', () => {

            let modal = document.querySelector('.mini.modal')
            if (!modal) {
                renderModal(clothingContainer, clothingList, itemsToAdd)
            } else {
                modal.style.display = 'block'
            }

        }).appendTo(filtersContainer)

    let clothingList = new CreateElement('div')
        .setAttributes({ class: 'clothing-list' })
        .appendTo(clothingContainer)

    clothingItems.forEach(e => {
        renderClothingItem(e, clothingList, itemsToAdd)
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

            if (date.value) {
                await updateOutfit(window.user, outfitId, date.value)
            }

            itemsToAdd = []

            calendarContainer.style.display = 'block'
            clothingContainer.style.display = 'none'

        })
        .appendTo(clothingContainer)
}

async function renderClothingItem(item, container, itemsToAdd) {

    let itemContainer = new CreateElement('div').setAttributes({ class: 'item' }).appendTo(container)

    let checkbox = new CreateElement('input')
        .setAttributes({ type: 'checkbox', id: item.id })
        .addEventListener('change', async (event) => {
            event.preventDefault()

            if (event.target.checked) {
                if (!itemsToAdd.includes(item.id)) {
                    itemsToAdd.push(item.id)
                }
            } else {
                itemsToAdd = itemsToAdd.filter(id => id !== item.id);
            }
        })
        .appendTo(itemContainer)

    if (item.image) {
        const { data: signedUrlData, error: urlError } = await supabase.storage
            .from('fashion-future')
            .createSignedUrl(`${item.user_id}/${item.image}`, 60)

        if (urlError) {
            console.error(urlError)
        }

        if (signedUrlData.signedUrl) {
            let img = new CreateElement('img').setAttributes({ src: signedUrlData.signedUrl }).appendTo(itemContainer)
        }
    }

    new CreateElement('p').setText(item.brand).appendTo(itemContainer)

}

async function renderModal(clothingContainer, clothingList, itemsToAdd) {
    let clothingItems = await selectUserTable(window.user, 'clothing_items')

    let modal = new CreateElement('div').setAttributes({ class: 'mini modal' }).appendTo(clothingContainer)
    let closeModalBtn = new CreateElement('button').setAttributes({ class: 'close btn' }).setText('x')
        .addEventListener('click', () => {
            modal.style.display = 'none'
        })
        .appendTo(modal)
    let body = new CreateElement('div').appendTo(modal)
    let selectedSets = await filters(body)

    let filterBtn = new CreateElement('button').setAttributes({ class: 'submit btn' }).setText('Filter').addEventListener('click', () => {

        let filteredItems = clothingItems.filter(e => {
            for (const [key, selectedValues] of Object.entries(selectedSets)) {
                if (selectedValues.size === 0) continue;
                let itemValue = e[key];

                if (key === "colour" || key === "season") {
                    let valuesArray = key === "colour"
                        ? itemValue.split(",").map(v => v.trim())
                        : JSON.parse(itemValue);
                    if (!valuesArray.some(value => selectedValues.has(value))) {
                        return false;
                    }
                } else {
                    if (!selectedValues.has(itemValue)) {
                        return false;
                    }
                }
            }
            return true;
        });

        console.log('Filtered Items:', filteredItems);
        clothingList.innerHTML = '';
        filteredItems.forEach(e => renderClothingItem(e, clothingList, itemsToAdd));
        modal.style.display = 'none'
    }).appendTo(modal)
}

async function filters(container) {
    let clothingItems = await selectUserTable(window.user, 'clothing_items')
    let filtersContainer = new CreateElement('div').setAttributes({ class: 'filter' }).appendTo(container)

    let colourOptions = {
        'red': '#e53935', 'pink': '#d81b60', 'purple': '#8e24aa', 'Deep Purple': '#5e35b1',
        'indigo': '#3949ab', 'blue': '#1e88e5', 'Light Blue': '#039be5', 'cyan': '#00acc1',
        'teal': '#00897b', 'green': '#43a047', 'Light Green': '#7cb342', 'lime': '#c0ca33',
        'yellow': '#fdd835', 'amber': '#fbb300', 'orange': '#fb8c00', 'Deep Orange': '#f4511e',
        'brown': '#6d4c41', 'Light Grey': '#757575', 'Blue Grey': '#546e7a',
        'Deep Grey': '#212121', 'black': '#000000', 'white': '#ffffff'
    }

    let filters = { brand: 'unique', category: 'unique', colour: 'multiple', occasion: 'unique' }
    let filterSets = {};
    filterSets['season'] = new Set(['spring', 'summer', 'autumn', 'winter'])

    for (const [key, value] of Object.entries(filters)) {
        filterSets[key] = new Set();
    }

    for (const element of clothingItems) {
        for (const [key, value] of Object.entries(filters)) {

            if (element[key]) {
                switch (value) {
                    case 'unique':
                        filterSets[key].add(element[key])
                        break;

                    case 'multiple':
                        element[key].split(',').forEach(e => filterSets[key].add(e));
                        break;
                }
            }
        }
    }

    let selectedSets = {}
    for (const key in filters) {
        selectedSets[key] = new Set();
    }
    selectedSets['season'] = new Set()

    for (const [key, value] of Object.entries(filterSets)) {

        let filter = new CreateElement('div').setAttributes({ class: `modal-group ${key}` }).appendTo(filtersContainer)
        new CreateElement('label').setText(key).appendTo(filter)

        value.forEach(i => {
            let element
            if (key === 'colour' && colourOptions[i]) {
                element = new CreateElement('span')
                    .setAttributes({ style: `background-color:${colourOptions[i]}`, class: 'color btn' })
                    .appendTo(filter);
            } else {
                element = new CreateElement('span')
                    .setAttributes({ value: i, class: 'element' })
                    .setText(i)
                    .appendTo(filter);
            }

            element.addEventListener('click', () => {
                if (selectedSets[key].has(i)) {
                    selectedSets[key].delete(i);
                    element.classList.remove('selected');
                } else {
                    selectedSets[key].add(i);
                    element.classList.add('selected');
                }
            })
        })
    }
    return selectedSets
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

                    if (updateCalendarChallenge) {
                        updateCalendarChallenge.completed = true;
                    }

                    if (updateChallenge) {
                        updateChallenge.complete_count += 1;
                    }

                } else {
                    if (updateCalendarChallenge) {
                        updateCalendarChallenge.completed = false;
                    }

                    if (updateChallenge) {
                        updateChallenge.complete_count = Math.max(0, updateChallenge.complete_count - 1);
                    }
                }

                await updateUserTable(window.user, 'user_details', { user_id: user.id, challenges_progress: updateChallengesProgress, calendar: updateCalendar })

            })
            .appendTo(elements)

        let ul = new CreateElement('ul').setText(value.title).appendTo(elements)
        new CreateElement('li').setText(value.details).appendTo(ul)

        checkbox.checked = challengesToday.some(item => item.id === value.id && item.completed);
    });
}
