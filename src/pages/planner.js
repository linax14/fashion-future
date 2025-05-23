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

function outfitImagesDisplay(outfitContainer, count, type) {
    let images = outfitContainer.querySelectorAll('img');
    let c = images.length;

    if (type == 'care') { images.forEach(img => img.style.width = '25vw') }

    if (count == 1) {
        outfitContainer.style.display = 'grid';
        if (type == 'care') {
            outfitContainer.style.gridTemplateColumns = '4fr'
        } else {
            outfitContainer.style.gridTemplateColumns = '1fr'
        }
    } else {
        outfitContainer.style.display = 'grid'

        if (type == 'care') {
            outfitContainer.style.gridTemplateColumns = 'repeat(4, 1fr)'
        } else {
            outfitContainer.style.gridTemplateColumns = 'repeat(2, 1fr)'
        }

        if (count % 2 != 0) {
            if (type == 'care') {
                images[c - 1].style.gridColumn = 'span 4';
            } else {
                images[c - 1].style.gridColumn = 'span 2';
            }

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
    if (clothingContainer) clothingContainer.innerHTML = ''

    displayInPlanner('clothing')

    let itemsToAdd = []
    let header = new CreateElement('h3')
    renderClothingDisplayHeader(settings, header)

    closeBtnX(clothingContainer, () => displayInPlanner('calendar'))

    let filtersContainer = new CreateElement('div').setAttributes({ class: 'filters-container' }).appendTo(clothingContainer)
    let filtersBtn = new CreateElement('button').setAttributes({ class: 'filter btn' }).setText('Filter').appendTo(filtersContainer)
    new CreateElement('i').setAttributes({ class: 'fa-filter fa-solid' }).appendTo(filtersBtn)

    let clothingList = new CreateElement('div').setAttributes({ class: 'clothing-list' }).appendTo(clothingContainer)
    let clothingItemElements

    let data = await selectUserTable(window.user, 'clothing_items')

    if (localStorage.getItem('fromChallenge') && settings.challenge) {
        let filtered = settings.challenge.filtered
        if (filtered && filtered.length > 0) {
            let challengeContainer = new CreateElement('div').setAttributes({ class: 'clothing-list', id: 'challenge-items' }).appendTo(clothingContainer)
            new CreateElement('h4').setText('Challenge Items').appendTo(challengeContainer)
            let clothingItems = await renderClothingItem({ appendTo: challengeContainer, data: filtered, itemsToAdd: itemsToAdd })
            console.log(clothingItems);

            data = data.filter(item => !filtered.some(filteredItem => filteredItem.id == item.id))
        }
    }

    let clothingListHeader

    if (localStorage.getItem('fromChallenge') && settings && settings.challenge && data.length > 0) {
        clothingListHeader = new CreateElement('h4').setText('Other Items').appendTo(clothingList)
    } else {
        clothingListHeader = new CreateElement('h4').setText('All Clothes').appendTo(clothingList)
    }

    filtersBtn.addEventListener('click', async () => {
        let filtersSection = document.querySelector('.filters');

        if (!filtersSection) {
            await renderFilters(filtersContainer, clothingList, (data) => {
                clothingList.innerHTML = '';
                data.forEach(e => renderClothingItem({ appendTo: clothingList, data: [e], itemsToAdd: itemsToAdd }));

                setDisplay([submitBtn, deleteBtn], 'block');
                setDisplay([clothingList], 'grid');
            });
            filtersSection = document.querySelector('.filters');
        }

        let isExpanded = filtersSection.classList.toggle('expanded');

        setDisplay([clothingList], isExpanded ? 'none' : 'grid');
        setDisplay([filtersSection], isExpanded ? 'block' : 'none');
        setDisplay([btnContainer], isExpanded ? 'none' : 'flex');
    })

    clothingItemElements = await renderClothingItem({ appendTo: clothingList, data: data, itemsToAdd: itemsToAdd, mode: settings.itemRender })

    let btns = document.querySelectorAll('btn-container.bottom .btn').forEach(btn => btn.remove())
    let btnContainer = new CreateElement('div').setAttributes({ class: 'btn-container bottom' }).appendTo(clothingContainer)
    let submitBtn = new CreateElement('button').setText('Save').setAttributes({ class: 'submit btn' }).appendTo(btnContainer)
    let deleteBtn = new CreateElement('button').setText('Delete').setAttributes({ class: 'delete btn' }).appendTo(btnContainer)

    if (localStorage.getItem('fromChallenge') && settings.challenge?.challengeData) {
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
                itemsToAdd = await editMode({ mode: 'outfit', outfitId: settings.outfitId, domEl: clothingItemElements, items: itemsToAdd, btns: { submitBtn, deleteBtn }, date: createOutfitDate });
                break;
            case 'garmentCare':
                itemsToAdd = await editMode({ mode: 'care_event', items: itemsToAdd, domEl: clothingItemElements, btns: { submitBtn, deleteBtn }, outfitId: settings.outfitId, values: settings.formValues, date: createOutfitDate })
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

    let date = new Date(createOutfitDate)
    let month = date.toLocaleString('default', { month: 'long' }).toLowerCase()
    let day = date.getDate()

    let allDates = outfitData.flatMap(entry => entry.wear_dates || []);
    let sortedDates = [...new Set(allDates)].sort((a, b) => new Date(a) - new Date(b));
    sortedDates = sortedDates.map(date => formatDateUnpadded(date))

    let alreadyLogged = sortedDates.includes(createOutfitDate)
    if (!alreadyLogged) {
        sortedDates.push(createOutfitDate)
        sortedDates = [...new Set(sortedDates)].sort((a, b) => new Date(a) - new Date(b))
        await updatePoints(['discipline'], createOutfitDate);
    }

    let prevDate = null;
    let streakCount = 0;

    let data = await calendarDataTarget(createOutfitDate, 'day')
    let calendar = data.calendar
    let target = calendar[month][day]

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

                await updateUserTable(window.user, 'user_calendar', { calendar: calendar });
            }

        } prevDate = dateStr;
    }

    return { target };
}

let editMode = async (settings) => {
    let submitBtn = settings.btns.submitBtn
    let deleteBtn = settings.btns.deleteBtn
    let clothingItemElements = settings.domEl
    let itemsToAdd = settings.items
    let outfitId = settings.outfitId
    let mode = settings.mode
    let values = settings.values
    let dataDate = settings.date

    let secondTable
    let container
    let planner

    switch (mode) {
        case 'outfit':
            secondTable = 'outfit_items'
            container = 'outfits-container'
            planner = 'calendar'
            break;
        case 'care_event':
            secondTable = 'care_items'
            container = 'care-event-container-items'
            planner = 'calendar'
            break
        default:
            break;
    }

    let outfit = await clothingManager.getData(mode, outfitId);
    let inOutfit;
    let itemsToRemove = [];

    clothingItemElements.forEach(element => {
        inOutfit = outfit[0].clothingItems.find(item => item.id == element.id);

        if (inOutfit && element.checkbox) {
            element.checkbox.checked = true;
            itemsToAdd.push(element.id);
        }

        element.checkbox.addEventListener('change', async (event) => {
            let itemId = element.id
            if (element.checkbox.checked) {

                if (mode == 'care_event') {
                    let compatibility = await careCompatibility([itemId], values);
                    if (compatibility.length == 0) {
                        let confirmed = await confirmBox({
                            title: 'Incompatible Item',
                            text: `This item has care instructions that don't fully match this care event. Would you like to keep it anyway or remove it from your selection?`,
                            save: 'Keep', dismiss: 'Remove', modalId: 'incompatible-item'
                        });
                        console.log(confirmed);

                        if (!confirmed) {
                            event.target.checked = false
                            let index = itemsToAdd.indexOf(itemId)
                            if (index != -1) itemsToAdd.splice(index, 1)
                            return
                        } else {
                            displayInPlanner('clothing')
                        }
                    }
                }
                itemsToAdd.push(element.id);
                let index = itemsToRemove.indexOf(itemId)
                if (index != -1) itemsToRemove.splice(index, 1)
                console.log(itemsToAdd);

            } else {
                itemsToRemove.push(element.id);
                let index = itemsToAdd.indexOf(itemId)
                if (index != -1) itemsToAdd.splice(index, 1)
            }
        });
    });

    if (mode == 'care_event') {
        submitBtn.addEventListener('click', async (event) => {

            if (itemsToAdd.length == 0) {
                await deleteEditMode(event, mode, outfitId, container, planner)
            }

            itemsToAdd = [...new Set(itemsToAdd)]
            let compatibility = await careCompatibility(itemsToAdd, values);

            if (compatibility.length == itemsToAdd.length) {
                updatePoints(['mastery', 'knowledge'], dataDate)
            } else if (compatibility.length >= (itemsToAdd.length / 2)) {
                updatePoints(['knowledge'], dataDate)
            }

            await submitEditMode(event, secondTable, outfitId, itemsToAdd, itemsToRemove, planner)
        })

    } else {
        submitBtn.addEventListener('click', async (event) => {
            await submitEditMode(event, secondTable, outfitId, itemsToAdd, itemsToRemove, planner)
        })
    }

    deleteBtn.addEventListener('click', async (event) => {
        await deleteEditMode(event, mode, outfitId, container, planner)
    })

    return itemsToAdd;
}

let itemWearMap = new Map()

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
                    await completeChallenge(['curiosity', 'style'])
                } else {
                    let confirmed = await confirmBox({
                        title: 'Challenge Fail',
                        text: `To participate in the challenge and earn points, make sure to include a challenge item in your outfit. You can still edit your selection!`,
                        save: 'Save', dismiss: 'Edit', modalId: 'challenge-fail'
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
            completeChallenge(['style', 'curiosity'])
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

async function deleteEditMode(event, mode, outfitId, container, planner) {
    event.preventDefault()
    await clothingManager.deleteRecord(mode, outfitId)

    let outfitContainer = document.querySelectorAll(container)
    outfitContainer.forEach(container => {
        if (container.getAttribute('data-id') == outfitId) container.remove()
    })

    displayInPlanner(planner)
}

async function submitEditMode(event, secondTable, outfitId, itemsToAdd, itemsToRemove, planner) {
    event.preventDefault()

    let data = await clothingManager.getItems(secondTable, [outfitId])
    let existingIds = new Set(Object.values(data)[0])
    let newItems = [...new Set(itemsToAdd)].filter(item => !existingIds.has(item))

    if (newItems.length > 0) await outfitItems.addItems(secondTable, outfitId, newItems)
    if (itemsToRemove.length > 0) await outfitItems.removeItems(secondTable, outfitId, itemsToRemove)

    displayInPlanner(planner)
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

