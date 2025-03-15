async function addItemsOutfit(outfitId, clothingIds) {
    let user = await getUser()

    if (clothingIds && !Array.isArray(clothingIds)) {
        clothingIds = [clothingIds];
    }

    if (!clothingIds || clothingIds.length == 0) {
        throw new Error("At least one clothing item is required to create an outfit.");
    }

    const { data: outfitItems, error: outfitItemsError } = await supabase
        .from('outfit_items')
        .insert(
            clothingIds.map(clothingId => ({
                'outfit_id': outfitId,
                'clothing_item_id': clothingId,
                'user_id': user.id
            }))
        )
        .eq('user_id', user.id)
        .select()

    if (outfitItemsError) throw outfitItemsError

    return outfitItems
}

async function generateOutfit() {
    let user = await getUser()

    const { data, error } = await supabase
        .from('outfit')
        .insert({ 'user_id': user.id })
        .eq('user_id', user.id)
        .select()

    if (error) throw error

    let outfitId = data[0].id
    return outfitId
}

async function updateOutfit(outfitId, wearDate) {
    let user = await getUser()
    let dates = Array.isArray(wearDate) ? wearDate : [wearDate];
    const { data, error } = await supabase
        .from('outfit')
        .update({
            wear_dates: dates,
        })
        .eq('id', outfitId)
        .select()

    if (error) throw error
    return data
}

async function getClothingItems() {
    let user = await getUser()

    const { data: clothingItems, error } = await supabase
        .from('clothing_items')
        .select()
        .eq('user_id', user.id)

    if (error) throw error

    return clothingItems
}

async function getOutfitItems(outfitIds) {
    const { data: outfitItems, error: outfitItemsError } = await supabase
        .from('outfit_items')
        .select('outfit_id, clothing_item_id')
        .in('outfit_id', outfitIds);

    if (outfitItemsError) throw outfitItemsError;

    let group = {};

    outfitItems.forEach(item => {
        if (!group[item.outfit_id]) {
            group[item.outfit_id] = [];
        }
        group[item.outfit_id].push(item.clothing_item_id);
    });

    return group;
}

let calendarContainer = new CreateElement('div').setAttributes({ id: 'calendar' }).appendTo(document.body)

let date = new Date()
let year = date.getFullYear()
let month = date.getMonth()
let months = ['january', 'february', 'march',
    'april', 'may', 'june',
    'july', 'august', 'september',
    'october', 'november', 'december'
]

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

    let daysContainer = new CreateElement('div').setAttributes({ class: 'days-grid' }).appendTo(main)

    let noDaysMonth = new Date(year, month + 1, 0).getDate()
    let firstDayIndex = new Date(year, month, 1).getDay()
    let lastDayIndex = new Date(year, month, noDaysMonth).getDay()

    let dayWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    let emptyStartSlots = firstDayIndex === 0 ? 6 : firstDayIndex - 1
    let emptyEndSlots = lastDayIndex === 0 ? 0 : 7 - lastDayIndex

    dayWeek.forEach(day => {
        let className = day === 'Sunday' ? 'day-header sunday' : 'day-header'
        new CreateElement('div').setAttributes({ class: className }).setText(day)
            .appendTo(daysContainer)
    })

    for (let i = 0; i < emptyStartSlots; i++) {
        new CreateElement('div').setAttributes({ class: 'empty-slot' }).appendTo(daysContainer)
    }

    const today = new Date()
    let dayDivs = []

    for (let day = 1; day <= noDaysMonth; day++) {
        let currentDate = new Date(year, month, day)
        let formattedDate = formatDate(`${year}-${month + 1}-${day}`)
        let isToday = currentDate.toDateString() === today.toDateString()
        let isSunday = currentDate.getDay() === 0
        let isLastDay = day === noDaysMonth

        let className = 'day'

        if (isLastDay) className += ' last-day'
        if (isSunday) className += ' sunday'
        if (isToday) className += ' today'

        let dayDiv = new CreateElement('div').setAttributes({ class: className, 'data-date': formattedDate })
        .appendTo(daysContainer)
        new CreateElement('p').setText(day).appendTo(dayDiv)

        dayDivs.push({ div: dayDiv, date: formattedDate });
    }

    for (let i = 0; i < emptyEndSlots; i++) {
        new CreateElement('div').setAttributes({ class: i == emptyEndSlots - 1 ? 'empty-slot next-month day sunday' : 'empty-slot next-month' }).appendTo(daysContainer)
    }

    await renderOutfits(dayDivs);
}

async function renderOutfits(dayDivs) {
    let outfits = await getDetailedOutfits();

    for (const element of outfits) {
        if (element.wornDates) {
            let outfitDates = element.wornDates;

            outfitDates.forEach(date => {
                let formattedDate = formatDate(date)

                let dayDiv = dayDivs.find(item => item.date == formattedDate)?.div;

                let outfitContainer = new CreateElement('div').setAttributes({class:'outfit'}).appendTo(dayDiv)

                if (dayDiv) {
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

//add items to an outfit
async function renderClothingDisplay() {
    let clothingItems = await getClothingItems()
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

            let outfitId = await generateOutfit()

            await addItemsOutfit(outfitId, itemsToAdd)
            console.log(itemsToAdd);

            if (date.value) {
                await updateOutfit(outfitId, date.value)
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
    let clothingItems = await getClothingItems()

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
    let clothingItems = await getClothingItems()
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
    const outfits = await getUserOutfits()
    const outfitIds = outfits.map(outfit => outfit.id)

    const outfitItems = await getOutfitItems(outfitIds)

    const clothingItemIds = [].concat(...Object.values(outfitItems))
    const clothingItems = await getClothingItems(clothingItemIds)

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

function formatDate(dateString) {
    const [year, month, day] = dateString.split('-');
    const paddedDay = day.padStart(2, '0');
    const paddedMonth = month.padStart(2, '0');

    return `${paddedDay}-${paddedMonth}-${year}`;
}

renderCalendarDisplay()
// renderClothingDisplay()
getUser()