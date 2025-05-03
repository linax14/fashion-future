document.addEventListener("userInitialized", async () => {
    navEvents()
    renderCalendarDisplay()
    clothingManager = new ClothingManager(window.user)
});

let navBtn
let navModal = new CreateElement('div').setAttributes({ class: 'nav-modal' }).appendTo(document.body)
setDisplay([navModal], 'none')
let navEvents = () => {
    console.log(navModal);

    let addNavBtns = (className, text, src, alt) => {
        let btn = new CreateElement('button').setAttributes({ class: className }).appendTo(navModal);

        new CreateElement('span').setText(text).appendTo(btn);
        new CreateElement('img').setAttributes({ src: src, alt: alt }).appendTo(btn);
        console.log(btn);

        return btn
    }
    console.log(navModal);

    let createOutfit = addNavBtns('create-outfit-btn btn', 'New outfit', '../assets/createOutfit.png', 'clothing items')
    let addCareBtn = addNavBtns('add-care-btn btn', 'care event', 'https://img.icons8.com/ios/100/laundry-bag.png', 'laundry basket')

    createOutfit.addEventListener('click', async () => {
        let date = createOutfit.dataset.date
        await renderClothingDisplay(date, { mode: 'addOutfit' });;
    })
    addCareBtn.addEventListener('click', async () => {
        let date = addCareBtn.dataset.date
        await renderGarmentCareForm(date);
    })


    return navModal
}

document.body.addEventListener('click', function handleClickOutside(e) {
    let isClickInside = navModal.contains(e.target) || navBtn.contains(e.target);
    if (!isClickInside) {
        setDisplay([navModal], 'none');
    }
});

let header = new CreateElement('h2').setAttributes({ class: 'calendar header' }).appendTo(document.body)

let calendarContainer = new CreateElement('div').setAttributes({ id: 'calendar' }).appendTo(document.body)
let careBtnContainer = new CreateElement('section').setAttributes({ class: 'care-container' }).appendTo(calendarContainer);
let careEventContainer = new CreateElement('div').setAttributes({ class: 'care-event-container' }).appendTo(document.body)

let clothingContainer = new CreateElement('div').setAttributes({ class: 'clothing-container' })
    .appendTo(document.body)

let displayInPlanner = (type) => {
    let outfitContainer = document.querySelector('.outfits-container')
    let calendarInfo = document.querySelector('.calendar-info')
    let careEvent = document.querySelector('.care-event-container')
    let careItems = document.querySelector('.care-event-container-items')

    switch (type) {
        case 'calendar':
            renderCalendarDisplay()
            setDisplay([calendarContainer, outfitContainer], 'flex')
            setDisplay([clothingContainer], 'none')
            setDisplay([outfitContainer, calendarInfo], 'block')
            if (careItems) setDisplay([careItems], 'flex')
            if (careEvent) setDisplay([careEvent], 'none')
            break;

        case 'clothing':
            setDisplay([clothingContainer], 'block')
            setDisplay([calendarContainer, header], 'none')
            if (careEvent) setDisplay([careEvent], 'none')
            if (careItems) setDisplay([careItems], 'none')
            setDisplay([navModal], 'none');
            break;

        case 'garmentCare':
            setDisplay([calendarContainer, clothingContainer, header], 'none')
            setDisplay([careEvent], 'flex')
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

    addNavBtn();

    if (monthStart) {
        setTimeout(() => {
            let firstDayDiv = document.querySelector(`.day-container .day[data-date="${monthStart}"]`);
            if (firstDayDiv) {
                firstDayDiv.click();
            }
        }, 0);
    }

    await calendarDays(noDaysMonth, createOutfitDate, daysContainer, outfitsContainer);
    await scrollToday(createOutfitDate, outfitsContainer);
}

let calendarHeader = async () => {
    let main = new CreateElement('div').setAttributes({ class: 'calendar-info' }).appendTo(calendarContainer)
    header.innerText = `Your planner for ${year}`
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

let renderGarmetCareItems = async (dataDate, appendTo) => {
    let data = (await clothingManager.getData('care_event'))
        .filter(item => {
            return item.wornDates?.some(date => {
                return formatDateUnpadded(date) == dataDate
            })
        });

    if (data.length == 0) return false

    let div = new CreateElement('div').setAttributes({ class: 'care-event-container-items' }).appendTo(appendTo)

    new CreateElement('h4').setText('Garment Care').appendTo(div)
    for (const element of data) {
        let outfitContainer = new CreateElement('div').setAttributes({ class: 'outfit', 'data-id': element.outfitId }).appendTo(div)
        let count = 0
        await Promise.all(
            element.clothingItems.map(async (item) => {
                count++
                await getImage(item, outfitContainer, renderImage)
            })
        )

        outfitImagesDisplay(outfitContainer, count)
    }

    return data
}

async function calendarDays(noDaysMonth, createOutfitDate, daysContainer, outfitsContainer) {
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
                await handleDayClick(dayContainer, dataDate, createOutfitDate, outfitsContainer)
            })
            .appendTo(dayContainer);
    }
}

async function scrollToday(createOutfitDate, outfitsContainer) {
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
                    await handleDayClick(todayDiv, dataDate, createOutfitDate, outfitsContainer);
                    localStorage.setItem('dateInfo', `${dataDate}`);
                }
            }
        })();
    }, 0);
}

let handleDayClick = async (dayContainer, dataDate, createOutfitDate, outfitsContainer) => {
    document.querySelectorAll('.day-container.selected').forEach(el => el.classList.remove('selected'));
    dayContainer.classList.add('selected');

    createOutfitDate = dataDate;

    document.querySelectorAll('.outfit').forEach(el => el.parentNode.removeChild(el));

    displayInPlanner()
    let prevWorn = document.querySelector('.prev-worn-container')
    if (prevWorn) prevWorn.remove()

    let createOutfit = document.querySelector('.create-outfit-btn')
    let addCareBtn = document.querySelector('.add-care-btn')
    createOutfit.dataset.date = dataDate
    addCareBtn.dataset.date = dataDate

    let isVisible
    navBtn.addEventListener('click', () => {
        isVisible = !isVisible
        setDisplay([navModal], isVisible ? 'none' : 'flex');
    })

    let render = await renderOutfits(dataDate, outfitsContainer);
    if (render) getOutfitId();

    await renderGarmetCareItems(dataDate, calendarContainer);

    localStorage.setItem('dateInfo', `${dataDate}`);
}

async function renderGarmentCareForm(createOutfitDate) {
    careEventContainer.innerHTML = ''
    displayInPlanner('garmentCare')

    closeBtnX(careEventContainer, () => displayInPlanner('calendar'))

    new CreateElement('h3').setText('Basket Care Settings').appendTo(careEventContainer)
    new CreateElement('p').setText(`Select the care options and submit to start adding clothes`)
        .appendTo(careEventContainer)

    let form = new CreateElement('form').appendTo(careEventContainer)
    let careFields = {
        wash: new Images('wash', {
            type: 'button', options: {
                'wash': '../assets/careLabel/wash1.png',
                'wash at 30': '../assets/careLabel/wash2.png',
                'wash at 40': '../assets/careLabel/wash3.png',
                'wash at 50': '../assets/careLabel/wash4.png',
                'wash at 60': '../assets/careLabel/wash5.png',
                'hand wash': '../assets/careLabel/wash6.png',
                'do not wash': '../assets/careLabel/wash7.png'
            }, class: 'care-label'
        }, form),
        bleach: new Images('bleach', {
            type: 'button', options: {
                'bleach': '../assets/careLabel/bleach1.png',
                'cl bleach': '../assets/careLabel/bleach2.png',
                'ncl bleach': '../assets/careLabel/bleach3.png',
                'do not bleach': '../assets/careLabel/bleach4.png',
                'do not bleach': '../assets/careLabel/bleach5.png',
            }, class: 'care-label'
        }, form),
        tumble_dry: new Images('tumble drying', {
            type: 'button', options: {
                'tumble dry': '../assets/careLabel/tumble1.png',
                'tumble dry low': '../assets/careLabel/tumble2.png',
                'tumble dry normal': '../assets/careLabel/tumble3.png',
                'do not tumble dry': '../assets/careLabel/tumble4.png',
            }, class: 'care-label'
        }, form),
        natural_dry: new Images('natural drying', {
            type: 'button', options: {
                'dry': '../assets/careLabel/dry1.png',
                'line dry': '../assets/careLabel/dry2.png',
                'dry flat': '../assets/careLabel/dry3.png',
                'drip dry': '../assets/careLabel/dry4.png',
                'dry in shade': '../assets/careLabel/dry5.png',
                'line dry in the shade': '../assets/careLabel/dry6.png',
                'dry flat in shade': '../assets/careLabel/dry7.png',
                'drip dry in shade': '../assets/careLabel/dry8.png',
            }, class: 'care-label'
        }, form),
        iron: new Images('iron', {
            type: 'button', options: {
                'iron': '../assets/careLabel/iron1.png',
                'iron low': '../assets/careLabel/iron2.png',
                'iron medium': '../assets/careLabel/iron3.png',
                'iron high': '../assets/careLabel/iron4.png',
                'do not iron': '../assets/careLabel/iron5.png',
            }, class: 'care-label'
        }, form),

    }

    handleFormSubmit(form,
        async (formValues, id) => {
            await clothingManager.update('care_event', id, {
                date: Array.isArray(createOutfitDate) ? createOutfitDate : [createOutfitDate],
                wash: formValues.wash, bleach: formValues.bleach,
                iron: formValues.iron, normal_dry: formValues.natural_dry,
                tumble_dry: formValues.tumble_dry
            })
        }, null,
        (id, values) => {
            displayInPlanner('clothing')
            renderClothingDisplay(createOutfitDate, { mode: 'garmentCare', outfitId: id, formValues: values });
        })
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
        if (!id) {
            id = await clothingManager.generateId('care_event')
        }

        await onSubmitCallback(formValues, id)
        isDirty = false
        if (onSuccess) {
            onSuccess(id, formValues)
        }
    })

    return { form, isDirty: () => isDirty }
}

