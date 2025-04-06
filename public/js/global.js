const supabase = window.supabase.createClient('https://idtiohrkbkotgjsbgcij.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkdGlvaHJrYmtvdGdqc2JnY2lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzcyMTI4MjgsImV4cCI6MjA1Mjc4ODgyOH0.JVeYsapCa4SgTMqs89vfWA0Nke5oAQmHUPmjhDulea4')
window.user = null;

window.onload = async (event) => {
    let theme = 'dark'
    document.documentElement.setAttribute('data-theme', theme)
}

(async function () {
    window.user = await getUser();
    // console.log("user", window.user);

    document.dispatchEvent(new Event("userInitialized"));
    initializeUserCalendar(user)

})();

let date = new Date()
let year = date.getFullYear()
let month = date.getMonth()
let months = ['january', 'february', 'march',
    'april', 'may', 'june',
    'july', 'august', 'september',
    'october', 'november', 'december'
]

async function getUser() {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        console.error("User not logged in.")
        return
    }

    return user
}

async function selectUserTable(user, tableName) {
    const { data, error } = await supabase
        .from(tableName)
        .select()
        .eq('user_id', user.id)

    if (error) throw error

    return data
}

async function updateUserTable(user, tableName, updates) {
    const { data, error } = await supabase
        .from(tableName)
        .update(updates)
        .eq('user_id', user.id);

    if (error) throw error
    return data
}

let capitalise = (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1)
}

function renderNavigation() {
    let navigation = new CreateElement('nav').setAttributes({ class: 'bottom-nav' }).appendTo(document.body)
    let ol = new CreateElement('ol').appendTo(navigation)

    let elements = {
        quizzes: { type: 'li', link: { type: 'a', href: 'quizzes.html', text: 'quizzes' } },
        addOutfit: { type: 'li', link: { type: 'button', text: '+' } },
        dashboard: { type: 'li', link: { type: 'a', href: 'dashboard.html', text: 'dashboard' } },
        planner: { type: 'li', link: { type: 'a', href: 'planner.html', text: 'planner' } },
        wardrobe: { type: 'li', link: { type: 'a', href: 'wardrobe.html', text: 'wardrobe' } }
    }

    Object.entries(elements).forEach(([key, value]) => {
        let listItem = new CreateElement(value.type).appendTo(ol)

        if (key == 'addOutfit') {
            new CreateElement(value.link.type)
                .setText(value.link.text)
                .appendTo(listItem)
        } else {
            new CreateElement(value.link.type)
                .setAttributes({ href: value.link.href })
                .setText(value.link.text)
                .appendTo(listItem)
        }
    })
}

class CreateElement {

    constructor(type) {
        this.element = document.createElement(type)
    }

    setAttributes(attributes = {}) {
        Object.entries(attributes).forEach(([attribute, value]) => this.element.setAttribute(attribute, value))
        return this
    }

    setText(content) {
        this.element.textContent = content
        return this
    }

    addEventListener(event, handler) {
        this.element.addEventListener(event, handler)
        return this
    }

    appendTo(container) {
        if (container) container.appendChild(this.element)
        return this.element
    }
}

class FormField {
    constructor(name, config, container) {
        this.name = name
        this.config = config
        this.container = container

        this.wrapper = new CreateElement('div')
            .setAttributes({ class: `form-group ${name}` })
            .appendTo(this.container)

        let label = new CreateElement('label')
            .setAttributes({ for: name }).setText(capitalise(name))
            .appendTo(this.wrapper)
    }
}

class TextInput extends FormField {
    constructor(name, config, container) {
        super(name, config, container)

        new CreateElement('input')
            .setAttributes({
                type: config.inputType || 'text', name: name,
                placeholder: config.placeholder || '',
                required: config.required || false
            })
            .appendTo(this.wrapper)
    }
}

class CheckboxGroup extends FormField {
    constructor(name, config, container) {
        super(name, config, container)

        let hiddenInput = new CreateElement('input')
            .setAttributes({ type: 'hidden', name: name })
            .appendTo(this.wrapper)

        let selected = ''

        config.options.forEach(option => {
            let checkboxWrapper = new CreateElement('div')
                .setAttributes({ class: 'checkbox-wrapper' })
                .appendTo(this.wrapper)

            let checkbox = new CreateElement('input')
                .setAttributes({ type: 'checkbox', name: name, value: option })
                .addEventListener('change', () => {

                    let selectedArray = selected ? selected.split(',') : [];

                    if (checkbox.checked) {
                        if (!selectedArray.includes(option)) {
                            selectedArray.push(option);
                        }
                    } else {
                        selectedArray = selectedArray.filter(c => c !== option);
                    }

                    selected = selectedArray.join(',');
                    hiddenInput.value = selected;
                })
                .appendTo(checkboxWrapper)

            new CreateElement('label')
                .setAttributes({ for: `${name}-${option}` })
                .setText(capitalise(option))
                .appendTo(checkboxWrapper)
        })
    }
}

class ImageUpload extends FormField {
    constructor(name, config, container) {
        super(name, config, container)
        this.selectedFile = null

        let formContainer = document.querySelector('.clothing-formContainer');

        let addImage = new CreateElement('img')
            .setAttributes({ src: '../assets/createOutfit.png' })
            .addEventListener('click', () => {

                let img = formContainer.querySelector(config.class);

                if (!img) {
                    img = new CreateElement('input')
                        .setAttributes({
                            class: config.class,
                            type: config.inputType,
                            accept: config.accept,
                            capture: config.capture,
                            name: name
                        })
                        .addEventListener('change', (event) => {
                            let file = event.target.files[0]
                            this.selectedFile = file

                            if (file) {
                                let url = URL.createObjectURL(file)
                                console.log(url);

                                addImage.setAttribute('src', url)
                                addImage.classList.remove('create-outfit')
                                addImage.classList.add('preview')
                            }
                        })
                        .appendTo(this.wrapper)
                    img.click()
                }

                img.click()
            })
            .appendTo(this.wrapper)
    }

    getFile() {
        return this.selectedFile
    }
}

class SelectOption extends FormField {
    constructor(name, config, container) {
        super(name, config, container)

        this.hiddenInput = new CreateElement('input')
            .setAttributes({ type: 'hidden', name: name })
            .appendTo(this.wrapper)

        this.isDropdown = config.dropdown ?? false;
        this.allowMultiple = config.multiple ?? true;
        this.selected = this.allowMultiple ? [] : null;

        let dropdown = null;
        let close = null;

        if (this.isDropdown) {
            close = new CreateElement('span')
                .setAttributes({ class: 'close' })
                .setText('+')
                .appendTo(this.wrapper);
        }

        if (this.isDropdown) {
            dropdown = new CreateElement('div')
                .setAttributes({ class: 'dropdown-options' })
                .appendTo(this.wrapper);
        }

        let optionsContainer = this.isDropdown ? dropdown : this.wrapper;

        config.options.sort().forEach(option => {
            let element = new CreateElement(config.type)
                .setAttributes({ value: option, class: 'element' })
                .addEventListener('click', (event) => {
                    event.stopPropagation()
                    if (this.allowMultiple) {
                        if (this.selected.includes(option)) {
                            this.selected = this.selected.filter(c => c !== option);
                            element.classList.remove('selected');
                        } else {
                            this.selected.push(option);
                            element.classList.add('selected');
                        }

                        this.hiddenInput.value = this.selected.join(',');
                    } else {
                        if (this.selected === option) {
                            this.selected = null;
                            element.classList.remove('selected');
                            this.hiddenInput.value = '';
                        } else {
                            optionsContainer.querySelectorAll('.selected').forEach(el => {
                                el.classList.remove('selected');
                            });

                            this.selected = option;
                            element.classList.add('selected');
                            this.hiddenInput.value = option;
                        }
                    }
                })
                .setText(capitalise(option))
                .appendTo(optionsContainer)
        })

        if (this.isDropdown) {
            this.wrapper.addEventListener('click', (event) => {
                event.stopPropagation();
                dropdown.classList.toggle('open');
            });


            document.addEventListener('click', (event) => {
                if (!this.wrapper.contains(event.target)) {
                    dropdown.classList.remove('open');
                }
            });
        }
    }
}

class SelectColours extends FormField {
    constructor(name, config, container) {
        super(name, config, container)

        let hiddenInput = new CreateElement('input')
            .setAttributes({ type: 'hidden', name: name })
            .appendTo(this.wrapper)

        let selected = []

        Object.entries(config.options).forEach(([option, value]) => {
            let element = new CreateElement('div')
                .setAttributes({ class: 'element', name: option })
                .appendTo(this.wrapper)

            let color = new CreateElement('span')
                .setAttributes({ style: `background-color:${value}`, class: config.class })
                .addEventListener('click', () => {

                    if (selected.includes(option)) {
                        selected = selected.filter(c => c !== option)
                        color.innerHTML = ''
                        color.classList.remove('selected')
                    } else {
                        selected.push(option)
                        color.classList.add('selected')
                    }

                    hiddenInput.value = selected.join(',')
                })
                .appendTo(element)


            // new CreateElement('label')
            //     .setAttributes({ for: option }).setText(capitalise(option))
            //     .appendTo(element)
        })
    }
}

class SelectMultiple extends FormField {
    constructor(name, config, container) {
        super(name, config, container)

        let hiddenInput = new CreateElement('input')
            .setAttributes({ type: 'hidden', name: name })
            .appendTo(this.wrapper)

        let selected = []

        Object.entries(config.options).forEach(([option, value]) => {
            let element = new CreateElement('div')
                .setAttributes({ class: 'element', name: option })
                .appendTo(this.wrapper)

            let item = new CreateElement('span')
                .setAttributes({ class: config.class })
                .addEventListener('click', () => {

                    if (selected.includes(option)) {
                        selected = selected.filter(c => c !== option)
                        item.innerHTML = ''
                        item.classList.remove('selected')
                    } else {
                        selected.push(option)
                        item.classList.add('selected')
                    }

                    hiddenInput.value = selected.join(',')
                })
                .appendTo(element)


            // new CreateElement('label')
            //     .setAttributes({ for: option }).setText(capitalise(option))
            //     .appendTo(element)
        })
    }
}

class Colours extends SelectMultiple {
    constructor(name, config, container, item) {
        super(name, config, container, item)

        Object.entries(config.options).forEach(([option, value]) => {
            let item = container.querySelector(`.element[name="${option}"] span`);
            if (item) item.style.backgroundColor = value;
        })
    }
}

function formatDatePadded(dateString) {
    const [year, month, day] = dateString.split('-');
    const paddedDay = day.padStart(2, '0');
    const paddedMonth = month.padStart(2, '0');

    return `${paddedDay}-${paddedMonth}-${year}`;
}

function formatDateUnpadded(dateString) {
    const [year, month, day] = dateString.split('-');
    const unpaddedDay = parseInt(day, 10);
    const unpaddedMonth = parseInt(month, 10);

    return `${year}-${unpaddedMonth}-${unpaddedDay}`;
}

let mergeData = (existingData, newData) => {
    const existingIds = new Set(existingData.map(c => c.id))
    return [...existingData, ...newData.filter(c => !existingIds.has(c.id))]
}

let initializeUserDetails = async (fromTable, initializeColumn) => {

    let { data } = await supabase.from(fromTable).select()
    let userData = await selectUserTable(window.user, 'user_details')
    if (!userData || userData.length <= 0) await supabase.from('user_details').insert({ user_id: user.id })

    let currentData = userData[0]?.[initializeColumn] || []
    let newData = data
    let updatedData = mergeData(currentData, newData)

    await updateUserTable(window.user, 'user_details', { [initializeColumn]: updatedData })
    data = await selectUserTable(window.user, 'user_details')
    return data
}

async function initializeUserCalendar(user) {
    let data = await selectUserTable(window.user, 'user_calendar')

    if (data.length == 0) {
        await supabase.from('user_calendar').insert({ user_id: user.id })
        data = await selectUserTable(window.user, 'user_calendar')
    }

    data = data[0]
    if (!data.year) await updateUserTable(window.user, 'user_calendar', { 'year': year });

    let calendar = {}
    months.forEach((month, index) => {
        let daysInMonth = new Date(year, index + 1, 0).getDate()
        calendar[month] = {};

        for (let day = 1; day <= daysInMonth; day++) {
            calendar[month][day] = { challenges: [], quiz: [], streak: 0 };
        }
    })

    if (!data.calendar) {
        await updateUserTable(window.user, 'user_calendar', { 'calendar': calendar })
        data = await selectUserTable(window.user, 'user_calendar')
    }

    return data
}

async function addItemsOutfit(user, outfitId, clothingIds) {

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

async function generateOutfit(user) {

    const { data, error } = await supabase
        .from('outfit')
        .insert({ 'user_id': user.id })
        .eq('user_id', user.id)
        .select()

    if (error) throw error

    let outfitId = data[0].id
    return outfitId
}

async function updateOutfit(user, outfitId, wearDate) {
    let dates = Array.isArray(wearDate) ? wearDate : [wearDate];

    const { data, error } = await supabase
        .from('outfit')
        .update({
            wear_dates: dates,
            worn: true
        })
        .eq('id', outfitId)
        .select()

    if (error) throw error
    return data
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

async function filters(container) {
    let clothingItems = await selectUserTable(window.user, 'clothing_items')
    let filtersBody = new CreateElement('div').setAttributes({ class: 'filters-body' }).appendTo(container)

    let colourOptions = {
        'red': '#e53935', 'pink': '#d81b60', 'purple': '#8e24aa', 'Deep Purple': '#5e35b1',
        'indigo': '#3949ab', 'blue': '#1e88e5', 'Light Blue': '#039be5', 'cyan': '#00acc1',
        'teal': '#00897b', 'green': '#43a047', 'Light Green': '#7cb342', 'lime': '#c0ca33',
        'yellow': '#fdd835', 'amber': '#fbb300', 'orange': '#fb8c00', 'Deep Orange': '#f4511e',
        'brown': '#6d4c41', 'Light Grey': '#757575', 'Blue Grey': '#546e7a',
        'Deep Grey': '#212121', 'black': '#000000', 'white': '#ffffff'
    }

    let filters = { brand: 'unique', category: 'unique', colour: 'multiple', occasion: 'multiple', origin: 'multiple' }
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

        let filter = new CreateElement('div').setAttributes({ class: `form-group ${key}` }).appendTo(filtersBody)
        let label = new CreateElement('label').setText(key).appendTo(filter)
        filter.addEventListener('click', () => {
            filter.classList.toggle('expanded')
        })

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

        if (filter.childNodes.length <= 1) {
            setDisplay([label], 'none')
        }

    }
    return selectedSets
}

async function renderFilters(appendTo, currentDisplay, onFilter) {
    let clothingItems = await selectUserTable(window.user, 'clothing_items');

    let div = new CreateElement('div').setAttributes({ class: 'filters' }).appendTo(appendTo);

    let body = new CreateElement('div').appendTo(div);
    let selectedSets = await filters(body);
    setDisplay([currentDisplay], 'none')
    let btns = new CreateElement('div').setAttributes({ class: 'btn-container' }).appendTo(div)
    new CreateElement('button').setAttributes({ class: 'submit btn' }).setText('Filter')
        .addEventListener('click', () => {
            let filteredItems = clothingItems.filter(e => {
                for (const [key, selectedValues] of Object.entries(selectedSets)) {
                    if (selectedValues.size === 0) continue;
                    let itemValue = e[key];

                    console.log(e);

                    if (key === "colour" || key === "season" || key == "occasion" || key == "origin") {

                        try {
                            valuesArray = JSON.parse(itemValue)
                            if (!Array.isArray(valuesArray)) {
                                throw new Error("Parsed value is not an array");
                            }
                        } catch (error) {
                            valuesArray = itemValue.split(",").map(v => v.trim());
                        }

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
            currentDisplay.innerHTML = '';
            setDisplay([currentDisplay], 'grid')

            onFilter(filteredItems);

            div.style.display = 'none';
        })
        .appendTo(btns);

    new CreateElement('button').setAttributes({ class: 'reset btn' }).setText('Reset')
        .addEventListener('click', () => {
            for (const key in selectedSets) {
                selectedSets[key].clear()
                console.log(selectedSets);
            }
            let allElements = div.querySelectorAll('.element, .color');
            allElements.forEach(element => {
                element.classList.remove('selected');
            });
            currentDisplay.innerHTML = '';
            setDisplay([currentDisplay], 'grid')
            onFilter(clothingItems);
            div.style.display = 'none';
        })
        .appendTo(btns);
    return div
}

let fontAwesome = new CreateElement('link').setAttributes({
    rel: 'stylesheet', href: "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css",
    integrity: "sha512-Evv84Mr4kqVGRNSgIGL/F/aIDqQb7xQ2vcrdIwxfjThSH8CSR7PBEakCr51Ck+w+/U6swU2Im1vVX0SVk9ABhg==",
    crossorigin: "anonymous", referrerpolicy: "no-referrer"
}).appendTo(document.head)

editItemHandler = (clothingFormContainer = null, appendTo, container, element) => {
    if (clothingFormContainer) {
        renderEditClothingItem(clothingFormContainer, appendTo, element)
    }
    console.log('item', element.id)
}

async function displayClothingItems(clothingFormContainer = null, appendTo, filteredData = null, itemsToAdd = null) {
    let data = filteredData ? filteredData : await selectUserTable(window.user, 'clothing_items')

    let itemElements = await Promise.all(data.map(async (element) => {
        let container = new CreateElement('div')
            .setAttributes({ class: 'wardrobe item-container', 'data-id': element.id })
            .appendTo(appendTo)

        //itemClickHandler is removed when the user is deleting clothing items
        let itemClickHandler = () => editItemHandler(clothingFormContainer, appendTo, container, element)
        container.itemClickHandler = itemClickHandler
        container.addEventListener('click', itemClickHandler)

        if (element.image) {
            await getImage(element, container, renderImage, 'wardrobe image');
        } else {
            new CreateElement('img')
                .setAttributes({
                    class: 'wardrobe image fallback', src: '../assets/createOutfit.png',
                    alt: `Fallback image representing a variety of clothing items when no specific image is available`
                })
                .appendTo(container)
        }

        let p = new CreateElement('p').setText(element.brand).appendTo(container)

        //for delete functionality
        let checkbox = new CreateElement('input')
            .setAttributes({ type: 'checkbox', class: 'wardrobe-checkbox', style: 'display:none' })
            .appendTo(container)

        if (itemsToAdd) {
            setDisplay([checkbox], 'block')

            checkbox.addEventListener('change', async (event) => {
                event.preventDefault()

                if (event.target.checked) {
                    if (!itemsToAdd.includes(element.id)) {
                        itemsToAdd.push(element.id)
                    }
                } else {
                    itemsToAdd = itemsToAdd.filter(id => id !== element.id);
                }
            })
        }
        return { container, checkbox, itemClickHandler, id: element.id }
    }))
    return itemElements
}

let setDisplay = (elements, displayType) =>
    elements.forEach(element => element.style.display = displayType)

let closeBtnX = (appendTo, onClick) => new CreateElement('button').setAttributes({ class: 'close' }).setText('×').addEventListener('click', onClick).appendTo(appendTo)

async function getImage(element, appendTo, callback, className = '') {
    try {
        const { data: signedUrlData, error: urlError } = await supabase.storage
            .from('fashion-future')
            .createSignedUrl(`${element.user_id}/${element.image}`, 60);

        if (urlError) throw urlError;
        if (signedUrlData.signedUrl) {
            if (typeof callback === 'function') {
                callback(signedUrlData, appendTo, className)
            } else { return signedUrlData }
        }
    } catch (urlError) {
        console.error(`Error fetching image URL: ${urlError}`);
        new CreateElement('img')
            .setAttributes({
                class: 'wardrobe image fallback', src: '../assets/createOutfit.png',
                alt: `Fallback image representing a variety of clothing items when no specific image is available`
            })
            .appendTo(appendTo)
    }
}

let renderImage = (signedUrlData, appendTo, className) => {
    new CreateElement('img')
        .setAttributes({ class: className, src: signedUrlData.signedUrl })
        .appendTo(appendTo);
}

let getUserData = async (dateInfo, progressType) => {

    let [userDetailsData, calendarData] = await Promise.all([
        selectUserTable(window.user, 'user_details'),
        selectUserTable(window.user, 'user_calendar')
    ])

    let progress = {}
    let challengesToday = []

    let updateChallengesProgress = userDetailsData[0].challenges_progress
    let updateQuestionsProgress = userDetailsData[0].questions_progress

    Object.values(updateChallengesProgress).forEach(value => {
        value.complete_count ??= 0;
    })

    Object.values(updateQuestionsProgress).forEach(value => {
        value.correctAnswers ??= 0;
        value.attempts ??= 0;
    })
    switch (progressType) {
        case 'challenges':
            progress.challengesProgress = updateChallengesProgress

            let [year, month, day] = dateInfo.split('-');
            let currentMonth = months[month - 1].toLowerCase();
            challengesToday = calendarData[0].calendar[currentMonth]?.[day]?.challenges || [];
            break;

        case 'questions':
            progress.questionsProgress = updateQuestionsProgress
            break;

        default:
            break;
    }

    return progressType == 'questions'
        ? { progress }
        : { progress, challengesToday, calendarData }
}

let datesDifference = (earliest, latest) => {
    let diff = new Date(latest) - new Date(earliest)
    let daysDiff = diff / (1000 * 60 * 60 * 24)

    return daysDiff
}


renderNavigation()