document.addEventListener("userInitialized", async () => {
    renderCalendarDisplay()
});

let calendarContainer = new CreateElement('div').setAttributes({ id: 'calendar' }).appendTo(document.body)

let clothingContainer = new CreateElement('div').setAttributes({ class: 'clothing-container' })
    .appendTo(document.body)

let displayInPlanner = (type) => {
    let outfitContainer = document.querySelector('.outfits-container')
    let calendarInfo = document.querySelector('.calendar-info')

    switch (type) {
        case 'calendar':
            setDisplay([calendarContainer, outfitContainer], 'flex')
            setDisplay([clothingContainer], 'none')
            setDisplay([outfitContainer, calendarInfo], 'block')
            break;

        case 'clothing':
            setDisplay([clothingContainer], 'block')
            setDisplay([calendarContainer], 'none')
            break;

        default:
            setDisplay([calendarContainer, outfitContainer], 'flex')
            break;
    }
}

async function renderCalendarDisplay() {
    calendarContainer.innerHTML = ''
    let main = calendarHeader()

    let weekScrollWrapper = new CreateElement('div').setAttributes({ class: 'week-scroll-wrapper' }).appendTo(main);
    let daysContainer = new CreateElement('div').setAttributes({ class: 'days-container' }).appendTo(weekScrollWrapper);
    let noDaysMonth = new Date(year, month + 1, 0).getDate();

    let { createOutfitDate, outfitsContainer } = renderContentSections();

    await calendarDays(noDaysMonth, createOutfitDate, daysContainer, outfitsContainer);
    await scrollToday(createOutfitDate, outfitsContainer);
}

let calendarHeader = () => {
    let main = new CreateElement('div').setAttributes({ class: 'calendar-info' }).appendTo(calendarContainer)
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

    let createOutfit = document.querySelector('.create-outfit')
    createOutfit.addEventListener('click', () => {
        renderClothingDisplay(createOutfitDate, 'addOutfit');
    });

    let render = await renderOutfits(dataDate, outfitsContainer);
    if (render) getOutfitId();

    await renderPreviousOutfits(calendarContainer)

    localStorage.setItem('dateInfo', `${dataDate}`);
}

let renderContentSections = () => {
    let outfitsContainer = new CreateElement('section').setAttributes({ class: 'outfits-container' }).appendTo(calendarContainer);
    new CreateElement('h2').setText('today').appendTo(outfitsContainer)
    let createOutfitDate = renderCreateOutfit(outfitsContainer)

    return { createOutfitDate, outfitsContainer };
}

let renderCreateOutfit = (outfitsContainer) => {
    let createOutfitDate = null;
    let createOutfit = new CreateElement('div').setAttributes({ class: 'create-outfit' }).appendTo(outfitsContainer);

    new CreateElement('h2').setText('add an outfit').appendTo(createOutfit);
    new CreateElement('img').setAttributes({ src: '../assets/createOutfit.png' }).appendTo(createOutfit);

    return createOutfitDate;
}
