document.addEventListener("userInitialized", async () => {
    navEvents()
    renderCalendarDisplay()
    clothingManager = new ClothingManager(window.user)
});

let navBtn
let navModal = new CreateElement('div').setAttributes({ class: 'nav-modal' }).appendTo(document.body)
setDisplay([navModal], 'none')

let createIconBtn = (className, text, src, alt, appendTo) => {
    let btn = new CreateElement('button').setAttributes({ class: className }).appendTo(appendTo);

    new CreateElement('span').setText(text).appendTo(btn);
    new CreateElement('img').setAttributes({ src: src, alt: alt }).appendTo(btn);

    return btn
}

let navEvents = () => {
    let createOutfit = createIconBtn('create-outfit-btn btn', 'New outfit', './assets/createOutfit.png', 'clothing items', navModal)
    let addCareBtn = createIconBtn('add-care-btn btn', 'care event', 'https://img.icons8.com/ios-filled/100/laundry-bag.png', 'laundry basket', navModal)

    createOutfit.addEventListener('click', async () => {
        let date = createOutfit.dataset.date
        await renderClothingDisplay(date, { mode: 'addOutfit', itemRender: 'default' });;
    })
    addCareBtn.addEventListener('click', async () => {
        let date = addCareBtn.dataset.date
        await renderGarmentCareForm({ date: date, mode: 'add' });
    })

    return navModal
}

document.body.addEventListener('click', function handleClickOutside(e) {
    let isClickInside = navModal.contains(e.target) || navBtn.contains(e.target);
    if (!isClickInside) {
        setDisplay([navModal], 'none');
    }
});

let calendarContainer = new CreateElement('div').setAttributes({ id: 'calendar' }).appendTo(document.body)
let careBtnContainer = new CreateElement('section').setAttributes({ class: 'care-container' }).appendTo(calendarContainer);
let clothingContainer = new CreateElement('div').setAttributes({ class: 'clothing-container' })
    .appendTo(document.body)

let careContainer = new CreateElement('div').setAttributes({ class: 'care-event-container' }).appendTo(document.body)

let displayInPlanner = (type) => {
    let outfitContainer = document.querySelector('.outfits-container')
    let calendarInfo = document.querySelector('.calendar-info')
    let careItems = document.querySelector('.care-event-container-items')
    let careEventContainer = document.querySelector('.care-event-container')

    switch (type) {
        case 'calendar':
            renderCalendarDisplay()
            setDisplay([calendarContainer], 'grid')
            if (outfitContainer) {
                outfitContainer.innerHTML = ''
                setDisplay([outfitContainer], 'flex')
            }
            setDisplay([clothingContainer], 'none')
            setDisplay([calendarInfo], 'block')
            if (careItems) {
                careItems.innerHTML = ''
                setDisplay([careItems], 'flex')
            }
            if (careEventContainer) setDisplay([careEventContainer], 'none')
            if (careContainer) setDisplay([careContainer], 'none')
            break;

        case 'clothing':
            setDisplay([clothingContainer], 'grid')
            setDisplay([calendarContainer], 'none')
            if (careEventContainer) setDisplay([careEventContainer], 'none')
            if (careItems) setDisplay([careItems], 'none')
            if (careContainer) setDisplay([careContainer], 'none')
            setDisplay([navModal], 'none');
            break;

        case 'garmentCare':
            setDisplay([calendarContainer, clothingContainer, careEventContainer], 'none')
            setDisplay([careContainer], 'block')
            setDisplay([navModal], 'none');
            if (careItems) setDisplay([careItems], 'none')
            break;

        default:
            break;
    }
}

async function renderCalendarDisplay(monthStart) {
    calendarContainer.innerHTML = ''
    let main = await calendarHeader()
    let weekScrollWrapper = new CreateElement('div').setAttributes({ class: 'week-scroll-wrapper' }).appendTo(main);
    let daysContainer = new CreateElement('div').setAttributes({ class: 'days-container' }).appendTo(weekScrollWrapper);
    let noDaysMonth = new Date(year, month + 1, 0).getDate();

    let outfitsContainer = new CreateElement('section').setAttributes({ class: 'outfits-container' }).appendTo(calendarContainer);
    let createOutfitDate = null
    createOutfitDate = monthStart

    let careEventContainer = new CreateElement('section').setAttributes({ class: 'care-event-container' }).appendTo(calendarContainer)

    addNavBtn();

    if (monthStart) {
        setTimeout(() => {
            let firstDayDiv = document.querySelector(`.day-container .day[data-date="${monthStart}"]`);
            if (firstDayDiv) {
                firstDayDiv.click();
            }
        }, 0);
    }

    await calendarDays(noDaysMonth, createOutfitDate, daysContainer, outfitsContainer, careEventContainer);
    await scrollToday(createOutfitDate, outfitsContainer, careEventContainer);
}

let calendarHeader = async () => {
    let main = new CreateElement('div').setAttributes({ class: 'calendar-info' }).appendTo(calendarContainer)
    let monthHeader = new CreateElement('div').setAttributes({ class: 'month header' }).appendTo(main)

    new Promise((resolve) => {
        months.forEach((element, index) => {
            new CreateElement('h3')
                .setAttributes({ class: index === month ? 'item current' : 'item' })
                .addEventListener('click', () => {
                    month = index
                    let monthStart = `${year}-${month + 1}-1`
                    resolve(monthStart)
                    renderCalendarDisplay(monthStart)
                })
                .setText(element.substring(0, 3))
                .appendTo(monthHeader)
        })
    })

    return main
}

let renderGarmentCareItems = async (dataDate, appendTo) => {
    let data = (await clothingManager.getData('care_event'))
        .filter(item => {
            return item.wornDates?.some(date => {
                return formatDateUnpadded(date) == dataDate
            })
        });

    if (data.length == 0) return false

    let div = new CreateElement('div').setAttributes({ class: 'care-event-container-items' }).appendTo(appendTo)

    for (const element of data) {
        let outfitContainer = new CreateElement('div').setAttributes({ class: 'outfit', 'data-id': element.outfitId }).appendTo(div)
        let count = 0

        await Promise.all(
            element.clothingItems.map(async (item) => {
                count++
                await getImage(item, outfitContainer, renderImage)
            })
        )

        outfitImagesDisplay(outfitContainer, count, 'care')

        outfitContainer.addEventListener('click', async () => {
            await renderGarmentCareForm({ date: dataDate, mode: 'edit', id: element.outfitId })
        })
    }

    return data
}

async function calendarDays(noDaysMonth, createOutfitDate, daysContainer, outfitsContainer, careEventContainer) {
    for (let day = 1; day <= noDaysMonth; day++) {
        let date = new Date()
        let currentDate = new Date(year, month, day);
        let dataDate = `${year}-${month + 1}-${day}`;
        let dayOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][currentDate.getDay()];

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
                await handleDayClick(dayContainer, dataDate, createOutfitDate, outfitsContainer, careEventContainer)
            })
            .appendTo(dayContainer);
    }
}

async function scrollToday(createOutfitDate, outfitsContainer, careEventContainer) {
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
                    await handleDayClick(todayDiv, dataDate, createOutfitDate, outfitsContainer, careEventContainer);
                    localStorage.setItem('dateInfo', `${dataDate}`);
                }
            }
        })();
    }, 0);
}

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

        outfitContainer.addEventListener('click', async () => {
            await renderClothingDisplay(null, { mode: 'editOutfit', outfitId: element.outfitId, itemRender: 'default' })
        })
    }

    return data
}

let handleDayClick = async (dayContainer, dataDate, createOutfitDate, outfitsContainer, careEventContainer) => {
    document.querySelectorAll('.day-container.selected').forEach(el => el.classList.remove('selected'));
    dayContainer.classList.add('selected');

    createOutfitDate = dataDate;

    document.querySelectorAll('.outfit').forEach(el => el.parentNode.removeChild(el));

    displayInPlanner()

    let createOutfit = document.querySelector('.create-outfit-btn')
    let addCareBtn = document.querySelector('.add-care-btn')
    createOutfit.dataset.date = dataDate
    addCareBtn.dataset.date = dataDate

    let isVisible
    navBtn.addEventListener('click', () => {
        isVisible = !isVisible
        setDisplay([navModal], isVisible ? 'none' : 'flex');
    })

    outfitsContainer.innerHTML = ''
    new CreateElement('h4').setText('Outfits of the day').setAttributes({ class: 'planner-section-heading' }).appendTo(outfitsContainer)
    let outfits = await renderOutfits(dataDate, outfitsContainer);
    if (outfits.length == 0) placeholder(outfitsContainer, 'outfit', createOutfitDate)

    careEventContainer.innerHTML = ''
    new CreateElement('h4').setText('Garment Care').setAttributes({ class: 'planner-section-heading' }).appendTo(careEventContainer)
    let garmentCare = await renderGarmentCareItems(dataDate, careEventContainer);
    if (!garmentCare) placeholder(careEventContainer, 'care', createOutfitDate)

    localStorage.setItem('dateInfo', `${dataDate}`);
}

async function renderGarmentCareForm(settings) {
    careContainer.innerHTML = ''
    displayInPlanner('garmentCare')

    closeBtnX(careContainer, () => displayInPlanner('calendar'))

    new CreateElement('h3').setText('Basket Care Settings').appendTo(careContainer)
    new CreateElement('p').setText(`Select the care options and submit to start adding clothes`)
        .appendTo(careContainer)

    let form = new CreateElement('form').setAttributes({ id: 'care-form' }).appendTo(careContainer)
    let careFields = {
        wash: new Images('wash', {
            type: 'button', options: {
                'wash': './assets/careLabel/wash1.png',
                'wash at 30': './assets/careLabel/wash2.png',
                'wash at 40': './assets/careLabel/wash3.png',
                'wash at 50': './assets/careLabel/wash4.png',
                'wash at 60': './assets/careLabel/wash5.png',
                'hand wash': './assets/careLabel/wash6.png',
                'do not wash': './assets/careLabel/wash7.png'
            }, class: 'care-label'
        }, form),
        bleach: new Images('bleach', {
            type: 'button', options: {
                'bleach': './assets/careLabel/bleach1.png',
                'cl bleach': './assets/careLabel/bleach2.png',
                'ncl bleach': './assets/careLabel/bleach3.png',
                'do not bleach': './assets/careLabel/bleach4.png',
                'do not bleach': './assets/careLabel/bleach5.png',
            }, class: 'care-label'
        }, form),
        tumble_dry: new Images('tumble_dry', {
            type: 'button', options: {
                'tumble dry': './assets/careLabel/tumble1.png',
                'tumble dry low': './assets/careLabel/tumble2.png',
                'tumble dry normal': './assets/careLabel/tumble3.png',
                'do not tumble dry': './assets/careLabel/tumble4.png',
            }, class: 'care-label'
        }, form),
        natural_dry: new Images('natural_dry', {
            type: 'button', options: {
                'dry': './assets/careLabel/dry1.png',
                'line dry': './assets/careLabel/dry2.png',
                'dry flat': './assets/careLabel/dry3.png',
                'drip dry': './assets/careLabel/dry4.png',
                'dry in shade': './assets/careLabel/dry5.png',
                'line dry in the shade': './assets/careLabel/dry6.png',
                'dry flat in shade': './assets/careLabel/dry7.png',
                'drip dry in shade': './assets/careLabel/dry8.png',
            }, class: 'care-label'
        }, form),
        iron: new Images('iron', {
            type: 'button', options: {
                'iron': './assets/careLabel/iron1.png',
                'iron low': './assets/careLabel/iron2.png',
                'iron medium': './assets/careLabel/iron3.png',
                'iron high': './assets/careLabel/iron4.png',
                'do not iron': './assets/careLabel/iron5.png',
            }, class: 'care-label'
        }, form),

    }

    if (settings.mode == 'add') {
        handleFormSubmit(form,
            async (formValues, id) => {
                await clothingManager.update('care_event', id, {
                    date: Array.isArray(settings.date) ? settings.date : [settings.date],
                    wash: formValues.wash, bleach: formValues.bleach,
                    iron: formValues.iron, natural_dry: formValues.natural_dry,
                    tumble_dry: formValues.tumble_dry
                })
            }, null,
            (id, values) => {
                displayInPlanner('clothing')
                renderClothingDisplay(settings.date, { mode: 'garmentCare', outfitId: id, formValues: values, itemRender: 'care' });
            })
    } else {
        let data = (await clothingManager.getData('care_event', settings.id))
            .filter(item => { return item.outfitId == settings.id })

        let setSingleSelection = (container, name, value) => {
            if (!name) return
            let selectInput = container.querySelector(`input[name="${name}"]`)
            if (selectInput) selectInput.value = value

            let elements = document.querySelectorAll(`.form-group.${name} .element`)
            elements.forEach(el => el.classList.remove('selected'))

            elements.forEach(element => {
                if (element.getAttribute('data-value') == value) {
                    element.classList.add('selected')
                }
            })
        }

        for (const [key, value] of Object.entries(data[0].care_details)) { setSingleSelection(form, key, value) }

        handleFormSubmit(form,
            async (formValues, id) => {
                await clothingManager.update('care_event', id, {
                    date: Array.isArray(settings.date) ? settings.date : [settings.date],
                    wash: formValues.wash, bleach: formValues.bleach,
                    iron: formValues.iron, natural_dry: formValues.natural_dry,
                    tumble_dry: formValues.tumble_dry
                })
            }, settings.id,
            (id, values) => {
                displayInPlanner('clothing')
                renderClothingDisplay(settings.date, { mode: 'garmentCare', outfitId: id, formValues: values, itemRender: 'care' });
            })
    }
}

function handleFormSubmit(form, onSubmitCallback, itemId = null, onSuccess = null) {
    let isDirty = false

    form.addEventListener("input", () => isDirty = true)

    new CreateElement('button').setAttributes({ class: 'submit btn', type: 'submit' }).setText('submit')
        .appendTo(form)

    form.addEventListener('submit', async (event) => {
        event.preventDefault()

        let formData = new FormData(form)
        let formValues = {}

        formData.forEach((value, key) => {
            if (formValues[key]) {
                formValues[key] = `${formValues[key]},${value}`
            } else {
                formValues[key] = value
            }
        })

        let id = itemId
        if (!id) { id = await clothingManager.generateId('care_event') }

        await onSubmitCallback(formValues, id)
        isDirty = false
        if (onSuccess) {
            onSuccess(id, formValues)
        }
    })

    return { form, isDirty: () => isDirty }
}

let placeholder = (appendTo, mode, dataDate) => {
    let div = new CreateElement('div').setAttributes({ class: 'main-placeholder' }).appendTo(appendTo)
    let msg = new CreateElement('p').appendTo(div)
    msg.innerHTML = getDailyCTA(mode)

    let btn

    if (mode == 'outfit') {
        btn = createIconBtn('create-outfit-btn btn', 'Add fit', './assets/createOutfit.png', 'clothing items', div)
        btn.addEventListener('click', async () => {
            await renderClothingDisplay(dataDate, { mode: 'addOutfit', itemRender: 'default' });;
        })
    } else if (mode == 'care') {
        btn = createIconBtn('add-care-btn btn', 'Add care', 'https://img.icons8.com/ios-filled/100/laundry-bag.png', 'laundry basket', div)
        btn.addEventListener('click', async () => {
            await renderGarmentCareForm({ date: dataDate, mode: 'add' });
        })
    }

    return div
}

let ctaMessages = {
    outfit:
        ['Nothing planned yet! Start styling by logging your oufit of the day.',
            'Got a look in mind?', 'No outfit logged yet - fashionably late?',
            `Style it, log it, own it!`,
            `A day without a fit is a missed opprtunity.`,
            `Still deciding what to wear? Your planner is ready when you are!`,
            `Planning makes perfect - drop your look here.`,
            `Get your fit down before you forget it!`,
            `Don't ghost your closet - log that outfit!`,
            `Outfit of the day? Or of the week? Let's plan it out.`,
            `The day is a blank canvas - dress it up!`,
            `Your planner's craving some style - give it a fit to love.`,
            `A well-dressed day starts with one tap.`,
            `No outfit yet -  but the runway (planner) is open.`,
            `Got a great outfit today? Save it for the memories.`,
            `Dressed up for the day? Pop it in your planner`
        ],
    care: ['Laundry day? Keep your clothes fresh by logging a care event!',
        `Your clothes deserve some love. Don't forget to log a wash.`,
        `Time for a rinse? Your wardrobe's waiting for a wash log.`,
        `No washes yet - your clothes are starting to side-eye you!`,
        `Washed and wonderful? Don't forget to log it.`,
        `Air it out, then log it!`,
        `Wrinkles? What wrinkles? Add an iron task to stay smooth.`,
        `Freshen things up - today's care log is calling for you!`,
        `Closet care is self care. Got anything to add?`,
        `Iron, bleach, dry, or wash - nothing logged yet!`,
        `Pressed for time? A quick log goes a long way.`,
        `Ironed anything lately? Let your planner know.`,
        `Handle with care - bleach is powerful stuff. Log responsibly!`,
        `Bleach belongs in the logbook, not just the laundry.`,
        `Nothing bleached yet... pristine or procrastinating`
    ]
}

let getDailyCTA = (mode) => {
    let stored = localStorage.getItem(`placeholderMessage-${mode}`)
    if (stored) return stored

    let messages = ctaMessages[mode]
    let selected = messages[Math.floor(Math.random() * messages.length)]
    localStorage.setItem(`placeholderMessage-${mode}`, selected)

    return selected
}