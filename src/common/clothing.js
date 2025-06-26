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

    let filters = { brand: 'unique', category: 'unique', colour: 'multiple', occasion: 'multiple', origin: 'multiple', season: 'multiple' }
    let filterSets = {};

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

    for (const [key, value] of Object.entries(filterSets)) {

        let filter = new CreateElement('div').setAttributes({ class: `form-group ${key}` }).appendTo(filtersBody)
        let label = new CreateElement('label').setText(key).appendTo(filter)
        value.forEach(i => {
            let element
            if (key === 'colour' && colourOptions[i]) {

                let div = new CreateElement('div').setAttributes({class:'element'}).appendTo(filter)

                element = new CreateElement('span')
                    .setAttributes({ style: `background-color:${colourOptions[i]}`, class: 'color btn' })
                    .appendTo(div);

                new CreateElement('label').setAttributes({class:'color label'}).setText(capitalise(i)).appendTo(div)                

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
            setDisplay([label, filter], 'none')
            filter.style.height = 0
            filter.style.marginBottom = 0
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

            currentDisplay.innerHTML = '';
            setDisplay([currentDisplay], 'grid')
            if (filtersSection) {
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

class RenderClothing {
    constructor(element, container, appendTo, itemsToAdd) {
        this.element = element
        this.container = container
        this.appendTo = appendTo
        this.itemsToAdd = itemsToAdd
    }

    async renderDefault() {
        let container = new CreateElement('div')
            .setAttributes({ class: 'clothing-item-container', 'data-id': this.element.id })
            .appendTo(this.appendTo)

        let itemClickHandler = this.clickHandler(container);
        await this.addImage(container);
        let p = new CreateElement('p').setText(this.element.brand).appendTo(container)
        this.createCheckbox(container)
        return { container, checkbox: container.querySelector('.wardrobe-checkbox'), itemClickHandler, id: this.element.id }
    }

    async renderCare() {
        let clothingList = document.querySelector('.clothing-list')
        clothingList.setAttribute('id', 'care-view')

        let firstEl = clothingList.firstElementChild

        let container = new CreateElement('div')
            .setAttributes({ class: 'clothing-item-container', 'data-id': this.element.id })
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
        if (hasCareInstructions == false) new CreateElement('li').setText(`No care information`).appendTo(ol)

        return { container, checkbox: container.querySelector('.wardrobe-checkbox'), itemClickHandler, id: this.element.id }
    }

    async renderCareChallenge() {
        let container = new CreateElement('div')
            .setAttributes({ class: 'clothing-item-container', 'data-id': this.element.id })
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
                    class: 'wardrobe image fallback', src: './assets/createOutfit.png',
                    alt: `Fallback image representing a variety of clothing items when no specific image is available`
                }).appendTo(container);
        }
    }

    createCheckbox(container) {
        let checkbox = new CreateElement('input')
            .setAttributes({ type: 'checkbox', class: 'wardrobe-checkbox', style: 'display:none' })
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

let clothesPlaceholder = (appendTo) => {
    let div = new CreateElement('div').setAttributes({ class: 'main-placeholder invert-image' }).appendTo(appendTo)
    new CreateElement('img').setAttributes({ src: 'https://img.icons8.com/pastel-glyph/64/hanger--v1.png' }).appendTo(div)
    let p = new CreateElement('p').setText().appendTo(div)
    p.innerHTML = `Your wardrobe is a blank canvas. <br>Start adding your favourite pieces today!`
    return div
}