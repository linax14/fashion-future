document.addEventListener("userInitialized", async () => {

});

let date = new Date()

let year = date.getFullYear()
let month = date.getMonth()
let months = ['january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december']

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

        this.label = new CreateElement('label')
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
                .setAttributes({ type: 'checkbox', value: option })
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
                .setAttributes({ class: 'toggle btn' })
                .setText('+')
                .appendTo(this.label);
        }

        if (this.isDropdown) {
            dropdown = new CreateElement('div')
                .setAttributes({ class: 'dropdown-options' })
                .appendTo(this.wrapper);
        }

        let optionsContainer = this.isDropdown ? dropdown : this.wrapper;

        config.options.sort().forEach(option => {
            let element = new CreateElement(config.type)
                .setAttributes({ 'data-value': option, class: 'element' })
                .addEventListener('click', (event) => {
                    event.stopPropagation()
                    if (this.allowMultiple) {
                        if (this.selected.includes(option)) {
                            this.selected = this.selected.filter(c => c != option);
                            element.classList.remove('selected');
                        } else {
                            this.selected.push(option);
                            element.classList.add('selected');
                        }
                        this.hiddenInput.value = this.selected.join(',');
                    } else {
                        if (this.selected == option) {
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

                document.querySelectorAll('.dropdown-options.open').forEach(el => {
                    if (!this.wrapper.contains(el)) {
                        el.classList.remove('open');
                    }
                });

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

class Colours extends FormField {
    constructor(name, config, container) {
        super(name, config, container)

        this.hiddenInput = new CreateElement('input')
            .setAttributes({ type: 'hidden', name: name })
            .appendTo(this.wrapper)

        this.selected = []

        Object.entries(config.options).forEach(([option, value]) => {
            let element = new CreateElement('div')
                .setAttributes({ class: 'element', name: option })
                .appendTo(this.wrapper)

            let item = new CreateElement('span')
                .setAttributes({ class: config.class, style: `background-color:${value}` })
                .addEventListener('click', () => {

                    if (this.selected.includes(option)) {
                        this.selected = this.selected.filter(c => c !== option)
                        item.innerHTML = ''
                        item.classList.remove('selected')
                    } else {
                        this.selected.push(option)
                        item.classList.add('selected')
                    }

                    this.hiddenInput.value = this.selected.join(',')
                })
                .appendTo(element)
        })
    }
}

class Images extends FormField {
    constructor(name, config, container) {
        super(name, config, container)

        this.hiddenInput = new CreateElement('input')
            .setAttributes({ type: 'hidden', name: name })
            .appendTo(this.wrapper)

        this.selected = ''

        Object.entries(config.options).forEach(([option, value]) => {
            let element = new CreateElement('span')
                .setAttributes({ class: 'element', 'data-value': option })
                .appendTo(this.wrapper)

            let item = new CreateElement('img')
                .setAttributes({ class: config.class, src: value })
                .addEventListener('click', () => {

                    this.selected = option
                    this.wrapper.querySelectorAll('.element.selected').forEach(el => el.classList.remove('selected'))
                    element.classList.add('selected')
                    this.hiddenInput.value = this.selected

                })
                .appendTo(element)
        })
    }
}

let capitalise = (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1)
}

let setDisplay = (elements, displayType) =>
    elements.forEach(element => element.style.display = displayType)

let closeBtnX = (appendTo, onClick) => new CreateElement('button').setAttributes({ class: 'close' }).setText('×').addEventListener('click', onClick).appendTo(appendTo)

let fontAwesome = new CreateElement('link').setAttributes({
    rel: 'stylesheet', href: "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css",
    integrity: "sha512-Evv84Mr4kqVGRNSgIGL/F/aIDqQb7xQ2vcrdIwxfjThSH8CSR7PBEakCr51Ck+w+/U6swU2Im1vVX0SVk9ABhg==",
    crossorigin: "anonymous", referrerpolicy: "no-referrer"
}).appendTo(document.head)

let mainCss = customCss = document.querySelector('link[href="../styles/main.css"]')
let bootstrap = new CreateElement('link').setAttributes({
    rel: 'stylesheet', href: "https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.3/css/bootstrap.min.css",
    integrity: "sha512-jnSuA4Ss2PkkikSOLtYs8BlYIeeIK1h99ty4YfvRPAlzr377vr3CXDb7sb7eEEBYjDtcYj+AjBH3FLv5uSJuXg==",
    crossorigin: "anonymous", referrerpolicy: "no-referrer"
})

if (mainCss) { document.head.insertBefore(bootstrap, mainCss) }

function renderNavigation() {
    let navigation = new CreateElement('nav').setAttributes({ class: 'bottom-nav' }).appendTo(document.body)
    let ol = new CreateElement('ol').appendTo(navigation)

    let elements = {
        dashboard: { type: 'li', link: { type: 'a', href: 'dashboard.html', text: 'dashboard' }, i: { src: '../assets/icons/dash.png' } },
        planner: { type: 'li', link: { type: 'a', href: 'planner.html', text: 'planner' }, i: { src: '../assets/icons/calendar.png' } },
        wardrobe: { type: 'li', class: 'invert-image', link: { type: 'a', href: 'wardrobe.html', text: 'wardrobe' }, i: { src: 'https://img.icons8.com/pastel-glyph/64/hanger--v1.png' } },
        stats: { type: 'li', link: { type: 'a', href: 'stats.html', text: 'stats' }, i: { src: '../assets/icons/stats.png' } },
    }

    Object.entries(elements).forEach(([key, value]) => {
        let listItem = new CreateElement(value.type).appendTo(ol)

        if (key == 'addBtn') {
            new CreateElement(value.link.type)
                .setText(value.link.text).setAttributes({ style: 'display:none' })
                .appendTo(listItem)
        } else {
            let item = new CreateElement(value.link.type)
                .setAttributes({ href: value.link.href })
                .setText(value.link.text)
                .appendTo(listItem)
            if (value.class) {
                item.classList.add(value.class)
            }
            new CreateElement('img')
                .setAttributes(value.i)
                .appendTo(item)
        }
    })
}

let addNavBtn = () => {

    let existing = document.querySelector('.nav-btn-add')
    if (existing) return existing

    let navList = document.querySelector('nav.bottom-nav ol');
    let navItems = navList.querySelectorAll('li');
    navBtn = document.createElement('li')
    let a = new CreateElement('a').setText('add').appendTo(navBtn)
    new CreateElement('img').setAttributes({ src: '../assets/icons/plus.png' }).appendTo(a)
    navBtn.setAttribute('class', 'nav-btn-add')
    let middle = Math.floor(navItems.length / 2);
    navList.insertBefore(navBtn, navItems[middle]);

    return navBtn
}

function renderSideNav() {
    let sideNav = new CreateElement('nav').setAttributes({ class: 'side-nav', id: 'logged-side-nav' }).appendTo(document.body)
    let header = new CreateElement('div').setAttributes({ class: 'header' }).appendTo(sideNav)

    let time = getTimePeriod()

    let icon = new CreateElement('i').setAttributes({ class: 'fa-solid fa-bars' }).appendTo(header)
    let page = new CreateElement('h2').setText(`${capitalise(window.location.href.split('/').pop().split('.')[0])}`).appendTo(header)
    let ol = new CreateElement('ol').appendTo(sideNav)

    let settings = new CreateElement('li').setText('Settings').appendTo(ol)
    let signOut = new CreateElement('li').setText('Signout').appendTo(ol)

    icon.addEventListener('click', () => {
        let isExpanded = sideNav.classList.toggle('expanded')
        if (isExpanded) {
            icon.setAttribute('class', 'fa-solid fa-xmark nav-toggle-icon')
            setDisplay([page], 'none')

        } else {
            icon.setAttribute('class', 'fa-solid fa-bars nav-toggle-icon')
            setDisplay([page], 'flex')
        }
    })

    settings.addEventListener('click', () => { window.location.href = './settings.html' })

    signOut.addEventListener('click', async () => {
        const { error } = await supabase.auth.signOut()
        console.error(error);
        window.location.href = '/index.html'
    })

    return { icon }
}

let getTimePeriod = () => {
    let hours = new Date().getHours()
    let period

    switch (true) {
        case (hours >= 5 && hours < 12):
            period = 'morning'
            break
        case (hours >= 12 && hours < 20):
            period = 'afternoon'
            break
        default:
            period = 'night'
    }
    return period
}

let formatDateUnpadded = (dateString) => {
    const [year, month, day] = dateString.split('-');
    const unpaddedDay = parseInt(day, 10);
    const unpaddedMonth = parseInt(month, 10);

    return `${year}-${unpaddedMonth}-${unpaddedDay}`;
}

async function welcomeUser(time, header) {
    let welcomeMsg = new CreateElement('h3').setText(`Good ${time} ${window.user.user_metadata.first_name}`).appendTo(header);
    setDisplay([welcomeMsg], 'none');
    return welcomeMsg;
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

            element.addEventListener('click', (event) => {

                event.stopPropagation()

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

    let filtersSection = document.querySelector('.filters');
    let btnContainer = document.querySelector('.btn-container.bottom')

    let btns = new CreateElement('div').setAttributes({ class: 'btn-container' }).appendTo(div)
    new CreateElement('button').setAttributes({ class: 'submit btn' }).setText('Filter')
        .addEventListener('click', () => {
            let filteredItems = clothingItems.filter(e => {
                for (const [key, selectedValues] of Object.entries(selectedSets)) {
                    if (selectedValues.size === 0) continue;
                    let itemValue = e[key];

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
            if (filtersSection) {
                filtersSection.classList.remove('expanded')
                setDisplay([filtersSection], 'none')
            }

            if (btnContainer) {
                setDisplay([btnContainer], 'block')
            }

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
            filtersSection.classList.remove('expanded')

            onFilter(clothingItems);
            div.style.display = 'none';
        })
        .appendTo(btns);
    return div
}

let editItemHandler = (clothingFormContainer, appendTo, element, fromChallenge) => {
    if (clothingFormContainer) {
        renderEditClothingItem(clothingFormContainer, appendTo, element, fromChallenge)
    }
}

async function renderClothingItem(settings) {
    let data = settings.data ? settings.data : await selectUserTable(window.user, 'clothing_items')

    let itemElements = await Promise.all(data.map(async (element) => {
        let renderer = new RenderClothing(element, null, settings.appendTo, settings.itemsToAdd)

        switch (settings.mode) {
            case 'care':
                return renderer.renderCare()

            case 'careChallenge':
                return renderer.renderCareChallenge()

            default:
                return renderer.renderDefault()
        }
    }))
    return itemElements
}

let careMap = {
    'wash': '../assets/careLabel/wash1.png',
    'wash at 30': '../assets/careLabel/wash2.png',
    'wash at 40': '../assets/careLabel/wash3.png',
    'wash at 50': '../assets/careLabel/wash4.png',
    'wash at 60': '../assets/careLabel/wash5.png',
    'hand wash': '../assets/careLabel/wash6.png',
    'do not wash': '../assets/careLabel/wash7.png',
    'bleach': '../assets/careLabel/bleach1.png',
    'cl bleach': '../assets/careLabel/bleach2.png',
    'ncl bleach': '../assets/careLabel/bleach3.png',
    'do not bleach': '../assets/careLabel/bleach4.png',
    'do not bleach': '../assets/careLabel/bleach5.png',
    'tumble dry': '../assets/careLabel/tumble1.png',
    'tumble dry low': '../assets/careLabel/tumble2.png',
    'tumble dry normal': '../assets/careLabel/tumble3.png',
    'do not tumble dry': '../assets/careLabel/tumble4.png',
    'dry': '../assets/careLabel/dry1.png',
    'line dry': '../assets/careLabel/dry2.png',
    'dry flat': '../assets/careLabel/dry3.png',
    'drip dry': '../assets/careLabel/dry4.png',
    'dry in shade': '../assets/careLabel/dry5.png',
    'line dry in the shade': '../assets/careLabel/dry6.png',
    'dry flat in shade': '../assets/careLabel/dry7.png',
    'drip dry in shade': '../assets/careLabel/dry8.png',
    'iron': '../assets/careLabel/iron1.png',
    'iron low': '../assets/careLabel/iron2.png',
    'iron medium': '../assets/careLabel/iron3.png',
    'iron high': '../assets/careLabel/iron4.png',
    'do not iron': '../assets/careLabel/iron5.png',
}

class RenderClothing {
    constructor(element, container, appendTo, itemsToAdd) {
        this.element = element
        this.container = container
        this.appendTo = appendTo
        this.itemsToAdd = itemsToAdd
    }

    async renderDefault() {
        let container = new CreateElement('div')
            .setAttributes({ class: 'item-container', 'data-id': this.element.id })
            .appendTo(this.appendTo)

        let itemClickHandler = this.clickHandler(container);
        await this.addImage(container);
        let p = new CreateElement('p').setText(this.element.brand).appendTo(container)
        this.createCheckbox(container)
        return { container, checkbox: container.querySelector('.wardrobe-checkbox'), itemClickHandler, id: this.element.id }
    }

    async renderCare() {
        let clothingList = document.querySelector('.clothing-list')
        clothingList.style.gridTemplateColumns = 'repeat(2,1fr)'

        let firstEl = clothingList.firstElementChild
        if (firstEl) firstEl.style.gridColumn = 'span 2'

        let container = new CreateElement('div')
            .setAttributes({ class: 'item-container', 'data-id': this.element.id })
            .appendTo(this.appendTo)

        let itemClickHandler = this.clickHandler(container);
        await this.addImage(container);

        let ol = new CreateElement('ol').appendTo(container)
        let hasCareInstructions = false
        for (const [key, value] of Object.entries(this.element.care_instructions)) {
            if (value != "") {
                if (careMap[value.toLowerCase()]) {
                    new CreateElement('img').setAttributes({ src: careMap[value], alt: `${capitalise(value)}`, class: 'care-label' }).appendTo(ol)
                    hasCareInstructions = true
                }
            }
        }

        this.createCheckbox(container)
        if (hasCareInstructions == false) new CreateElement('li').setText(`You haven't added any care information yet`).appendTo(ol)

        return { container, checkbox: container.querySelector('.wardrobe-checkbox'), itemClickHandler, id: this.element.id }
    }

    async renderCareChallenge() {
        let container = new CreateElement('div')
            .setAttributes({ class: 'item-container', 'data-id': this.element.id })
            .appendTo(this.appendTo)

        let itemClickHandler = this.clickHandlerChallenge(container);
        await this.addImage(container);
        let p = new CreateElement('p').setText(this.element.brand).appendTo(container)
        this.createCheckbox(container)
        return { container, checkbox: container.querySelector('.wardrobe-checkbox'), itemClickHandler, id: this.element.id }

    }

    clickHandler(container) {
        let clothingFormContainer = document.querySelector('.clothing-formContainer')

        let itemClickHandler = () => editItemHandler(clothingFormContainer, this.appendTo, this.element, false);
        container.itemClickHandler = itemClickHandler;
        container.addEventListener('click', itemClickHandler);
        return itemClickHandler;
    }

    clickHandlerChallenge(container) {
        let clothingFormContainer = document.querySelector('.clothing-formContainer')

        let itemClickHandler = () => editItemHandler(clothingFormContainer, this.appendTo, this.element, true);
        container.itemClickHandler = itemClickHandler;
        container.addEventListener('click', itemClickHandler);
        return itemClickHandler;
    }


    async addImage(container) {
        if (this.element.image) {
            await getImage(this.element, container, renderImage, 'wardrobe image');
        } else {
            new CreateElement('img')
                .setAttributes({
                    class: 'wardrobe image fallback', src: '../assets/createOutfit.png',
                    alt: `Fallback image representing a variety of clothing items when no specific image is available`
                }).appendTo(container);
        }
    }

    createCheckbox(container) {
        let checkbox = new CreateElement('input')
            .setAttributes({ type: 'checkbox', class: 'wardrobe-checkbox', style: 'display:none; position:absolute' })
            .appendTo(container)

        if (this.itemsToAdd) {
            setDisplay([checkbox], 'block')

            checkbox.addEventListener('change', async (event) => {
                event.preventDefault()

                if (event.target.checked) {
                    this.itemsToAdd.push(this.element.id)
                } else {
                    let indexRemove = this.itemsToAdd.indexOf(this.element.id)
                    if (indexRemove > -1) {
                        this.itemsToAdd.splice(indexRemove, 1)
                    }
                }
                return this.itemsToAdd
            })
        }
    }
}

let renderImage = (signedUrlData, appendTo, className) => {
    new CreateElement('img')
        .setAttributes({ class: className, src: signedUrlData.signedUrl })
        .appendTo(appendTo);
}

let datesDifference = (earliest, latest) => {
    let diff = new Date(latest) - new Date(earliest)
    let daysDiff = diff / (1000 * 60 * 60 * 24)

    return daysDiff
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
            resolve(false)
        })
        let body = new CreateElement('div').setAttributes({ class: 'modal-body' }).appendTo(dialog)
        let text = new CreateElement('p').setAttributes({ class: 'modal-title' })
            .setText(settings.text).appendTo(body)
        let footer = new CreateElement('div').setAttributes({ class: 'modal-footer' }).appendTo(dialog)
        let saveBtn = new CreateElement('button').setText(settings.save).setAttributes({ class: 'btn btn-primary' }).appendTo(footer)
        saveBtn.addEventListener('click', () => {
            modal.remove()
            resolve(true)
        })

        let dismissBtn = new CreateElement('button').setText(settings.dismiss).setAttributes({ class: 'btn btn-secondary', 'data-dismiss': 'modal' }).appendTo(footer)
        dismissBtn.addEventListener('click', () => {
            modal.remove()
            resolve(false)
        })
    })
}

let getRGB = (hex) => {
    hex = hex.replace('#', '')
    let r = parseInt(hex.slice(0, 2), 16);
    let g = parseInt(hex.slice(2, 4), 16);
    let b = parseInt(hex.slice(4, 6), 16);

    return `${r},${g},${b}`;
}

let lockedState = (appendTo, message) => {
    let div = new CreateElement('div').setAttributes({ class: 'locked-state' }).appendTo(appendTo)
    new CreateElement('i').setAttributes({ class: 'fa-solid fa-lock' }).appendTo(div)
    let msg = new CreateElement('p').appendTo(div)
    msg.innerHTML = message

    return div
}

async function getChallengeAction() {
    let challengeAction = localStorage.getItem('challengeAction')
    let clothingData = JSON.parse(localStorage.getItem('filteredData'))

    let actionData = null
    if (challengeAction) {
        actionData = JSON.parse(challengeAction)

        if (actionData.action == 'addOutfit') {
            let challengeData = JSON.parse(localStorage.getItem('challengeData'))
            await renderClothingDisplay(actionData.dateInfo, { mode: 'addOutfit', challenge: { filtered: clothingData, challengeData: challengeData }, itemRender: 'default' })
        } else if (actionData.action == 'addCare') {
            await renderWardrobe({ challenge: { filtered: clothingData } })
        }
    }
}

async function completeChallenge() {

    let challenge = JSON.parse(localStorage.getItem('challengeAction'))
    console.log(challenge);

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