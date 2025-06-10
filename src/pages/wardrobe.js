document.addEventListener("userInitialized", async () => {
    wardrobeManager = new WardrobeManager(window.user)
    await renderWardrobe()

    let completed = localStorage.getItem('challengeCompleted')
    if (!completed) {
        await getChallengeAction()
    }
})

let wardrobeSection = new CreateElement('div').setAttributes({ class: 'wardrobe-container' }).appendTo(document.body)
let wardrobeHeader = new CreateElement('div').setAttributes({ class: 'header' }).appendTo(wardrobeSection)
let clothingList = new CreateElement('div').setAttributes({ class: 'clothing-list' }).appendTo(wardrobeSection)
let clothingFormContainer = new CreateElement('div').setAttributes({ class: 'clothing-formContainer' }).appendTo(document.body)

let wardrobeManager
let displayInHome = (type) => {

    switch (type) {
        case 'form':
            setDisplay([clothingFormContainer], 'flex')
            clothingFormContainer.style.visibility = 'visible'
            setDisplay([wardrobeSection, wardrobeHeader], 'none')
            break;

        case 'wardrobe':
            clothingList.innerHTML = ''
            wardrobeHeader.innerHTML = ''
            setDisplay([wardrobeSection], 'grid')
            setDisplay([wardrobeHeader], 'flex')
            setDisplay([clothingFormContainer], 'none')
            clothingFormContainer.style.visibility = 'hidden'
            break;

        default:
            setDisplay([clothingList], 'grid')
            setDisplay([wardrobeHeader], 'flex')
            setDisplay([clothingFormContainer], 'none')
            break;
    }
}

class WardrobeManager {
    constructor(user) {
        this.user = user
    }

    async getAllClothes() {
        return await selectUserTable(window.user, 'clothing_items')
    }

    async addItem({ brand = null, category = null, colour = null, season = null, occasion = null, origin = null, image = null, care_instructions = {} }) {
        try {
            const { data, error } = await supabase.from('clothing_items')
                .insert({ brand, category, colour, season, occasion, origin, user_id: this.user.id, image, care_instructions }).select()
            if (error) throw new Error(error.message)
            return data

        } catch (error) {
            console.error(error)
            throw error
        }
    }

    async deleteItems(itemId, selectedClothesCheckbox = null, allClothes = null) {
        try {
            const { error } = await supabase.from('clothing_items').delete().in('id', itemId)
            if (error) throw error

            if (selectedClothesCheckbox && allClothes) {
                selectedClothesCheckbox.forEach(({ container }) => container.remove())
                allClothes = allClothes.filter(({ id }) => !itemId.includes(id))
            }

            console.log('items deleted')

        } catch (error) {
            console.error('error deleting', error.message)
        }
        return allClothes
    }

    async updateItem(brand, category, colour, season, occasion, origin, image, itemId, care_instructions) {
        try {
            const { data, error } = await supabase
                .from('clothing_items')
                .update({ brand, category, colour, season, occasion, origin, image, care_instructions })
                .eq('id', itemId)

            if (error) {
                console.error(`supabase error: ${error}`)
                throw new Error(error.message)
            }
            return data
        } catch {
            console.error('error updating', error)
        }
    }
}

//upload clothing images to user folder
async function uploadFile(user, filepath, file) {
    try {

        const { data, error } = await supabase.storage.from('fashion-future')
            .upload(`${user.id}/${filepath}`, file, { cacheControl: '3600', upsert: false })

        if (error) {
            console.error(`supabase error ${error}`)
            throw new Error(error.message)
        }

        let path = data?.fullPath

        const { error: signedUrlError } = supabase.storage.from('fashion-future')
            .createSignedUrl(path, 60)

        if (signedUrlError) {
            console.error("Error generating signed URL:", signedUrlError)
            return
        }

        return data

    } catch (error) {
        console.error(error)
    }
}

function handleFormSubmit(form, onSubmitCallback, itemId = null) {
    let isDirty = false

    form.addEventListener("input", () => isDirty = true)

    new CreateElement('button').setAttributes({ class: 'submit btn', type: 'submit' }).setText('submit')
        .appendTo(form)

    form.addEventListener('submit', async (event) => {
        event.preventDefault()

        let formData = new FormData(form)
        let formValues = {}

        formData.forEach((value, key) => {
            if (key != 'image') {
                if (formValues[key]) {
                    formValues[key] = `${formValues[key]},${value}`
                } else {
                    formValues[key] = `${escapeHTML(value)}`
                    console.log(formValues[key]);
                }
            } else {
                formValues[key] = value
            }
        })

        let imageFile = formValues.image
        if (Array.isArray(imageFile)) { imageFile = imageFile[imageFile.length - 1] }
        let imageName = null

        if (imageFile) {
            imageName = imageFile.name
            await uploadFile(window.user, imageName, imageFile)
        }

        console.log(formValues);

        await onSubmitCallback(formValues, imageName)
        isDirty = false
        await renderWardrobe()
    })

    return { form, isDirty: () => isDirty }
}

async function renderClothingForm(mainForm) {
    mainForm.innerHTML = ''

    let btnContainer = new CreateElement('div').setAttributes({ class: 'btn-container' }).appendTo(mainForm)

    let tabContainer = new CreateElement('div').setAttributes({ class: 'tab-container' }).appendTo(mainForm)
    let aboutBtn = new CreateElement('button').setText('about').setAttributes({ class: 'tab-btn' }).appendTo(tabContainer)
    let careBtn = new CreateElement('button').setText('care').setAttributes({ class: 'tab-btn' }).appendTo(tabContainer)

    closeBtnX(btnContainer, () => {
        setDisplay([mainForm], 'none')
        mainForm.style.visibility = 'hidden'
        renderWardrobe()
        setDisplay([clothingList], 'grid')
        setDisplay([wardrobeHeader], 'flex')
        setDisplay([document.querySelector('#challenge-items')], 'none')
    })

    let form = new CreateElement('form')
        .setAttributes({ id: 'about-form', class: 'form-container' }).appendTo(mainForm)

    let formPart1 = new CreateElement('div').setAttributes({ class: 'form-part', id: 'about' }).appendTo(form)

    let aboutFormFields = {
        image: new ImageUpload('image', { type: 'input', inputType: 'file', class: 'image', accept: 'image/png, image/jpeg', capture: 'camera' }, formPart1),
        brand: new TextInput('brand', { placeholder: 'Enter brand name', required: true }, formPart1),
        category: new SelectOption('category', {
            type: 'span', options: ['tops', 't-shirts', 'blouses', 'cardigans',
                'sweaters', 'sweatshirts', 'blazers', 'coats', 'jackets',
                'skirts', 'shorts', 'jeans', 'trousers', 'joggers', 'knitwear', 'dresses'
            ], multiple: false, dropdown: true
        }, formPart1),
        colour: new Colours('colour', {
            type: 'button', options: {
                'red': '#e53935', 'pink': '#d81b60', 'Deep Purple': '#5e35b1',
                'indigo': '#3949ab', 'blue': '#1e88e5', 'Light Blue': '#039be5', 'cyan': '#00acc1',
                'teal': '#00897b', 'green': '#43a047', 'Light Green': '#7cb342', 'lime': '#c0ca33',
                'yellow': '#fdd835', 'amber': '#fbb300', 'orange': '#fb8c00', 'Deep Orange': '#f4511e',
                'brown': '#6d4c41', 'Light Grey': '#757575', 'Blue Grey': '#546e7a',
                'Deep Grey': '#212121', 'black': '#000000', 'white': '#ffffff'
            }, class: 'color btn'
        }, formPart1),
        season: new CheckboxGroup('season', { options: ['winter', 'spring', 'summer', 'autumn'] }, formPart1),
        occasion: new SelectOption('occasion', {
            type: 'span', options: ['chill', 'work', 'date night', 'gym',
                'brunch', 'outdoors', 'holiday', 'formal'
            ], multiple: true, dropdown: true
        }, formPart1),
        origin: new SelectOption('origin', {
            type: 'span',
            options: ['new item', 'hand me down', 'thrifted', 'gifted', 'upcycled', 'vintage', 'custom-made', 'rental',],
            multiple: true, dropdown: true
        }, formPart1)
    }

    let formPart2 = new CreateElement('div').setAttributes({ class: 'form-part', id: 'care' }).appendTo(form)

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
        }, formPart2),
        bleach: new Images('bleach', {
            type: 'button', options: {
                'bleach': './assets/careLabel/bleach1.png',
                'cl bleach': './assets/careLabel/bleach2.png',
                'ncl bleach': './assets/careLabel/bleach3.png',
                'do not bleach': './assets/careLabel/bleach4.png',
                'do not bleach': './assets/careLabel/bleach5.png',
            }, class: 'care-label'
        }, formPart2),
        tumble_dry: new Images('tumble_dry', {
            type: 'button', options: {
                'tumble dry': './assets/careLabel/tumble1.png',
                'tumble dry low': './assets/careLabel/tumble2.png',
                'tumble dry normal': './assets/careLabel/tumble3.png',
                'do not tumble dry': './assets/careLabel/tumble4.png',
            }, class: 'care-label'
        }, formPart2),
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
        }, formPart2),
        iron: new Images('iron', {
            type: 'button', options: {
                'iron': './assets/careLabel/iron1.png',
                'iron low': './assets/careLabel/iron2.png',
                'iron medium': './assets/careLabel/iron3.png',
                'iron high': './assets/careLabel/iron4.png',
                'do not iron': './assets/careLabel/iron5.png',
            }, class: 'care-label'
        }, formPart2),

    }

    handleFormSubmit(form,
        async (formValues, imageName) => {
            await wardrobeManager.addItem({
                brand: formValues.brand,
                category: formValues.category,
                colour: formValues.colour,
                season: formValues.season,
                occasion: formValues.occasion,
                origin: formValues.origin,
                image: imageName,
                care_instructions: {
                    wash: formValues.wash, bleach: formValues.bleach,
                    iron: formValues.iron, natural_dry: formValues.natural_dry,
                    tumble_dry: formValues.tumble_dry
                }
            })
        })

    formPart2.classList.add("hidden")
    aboutBtn.classList.add("selected")

    let toggleBtns = () => {
        [formPart1, formPart2].forEach(el => el.classList.toggle('hidden'))
        careBtn.classList.toggle('selected')
        aboutBtn.classList.toggle('selected')
    }

    [careBtn, aboutBtn].forEach(btn => btn.addEventListener('click', () => { toggleBtns() }))
}

async function renderEditClothingItem(clothingFormContainer, wardrobeContainer, item, fromChallenge = false) {
    displayInHome('form')

    let aboutFormContainer = clothingFormContainer.querySelector('#about-form')
    if (!aboutFormContainer) {
        console.error('Form container not found!')
        return
    }

    let setInputValue = (container, name, value) => {
        let input = container.querySelector(`input[name=${name}]`)
        if (input && value) input.value = value
    }

    setInputValue(aboutFormContainer, "brand", item.brand)

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

    setSingleSelection(aboutFormContainer, "category", item.category)

    setMultiSelection = (container, name, values, isCheckbox = false, isColour = false) => {
        if (!values) return

        let selectedValues = values.split(',').map(v => v.trim())
        let input = container.querySelector(`input[name=${name}]`)
        if (input) input.value = values

        if (isCheckbox) {
            let wrappers = document.querySelectorAll('.checkbox-wrapper')

            wrappers.forEach(wrapper => {
                let checkbox = wrapper.querySelector('input[type="checkbox"]')
                let checkboxValue = checkbox.value

                if (selectedValues.includes(checkboxValue)) {
                    checkbox.checked = true
                } else {
                    checkbox.checked = false
                }
            })
        } else if (isColour) {
            let elements = document.querySelectorAll(`.form-group.${name} .element`)
            elements.forEach(element => {
                let span = element.querySelector('span')
                if (selectedValues.includes(element.getAttribute('name'))) {
                    span.classList.add('selected')
                } else {
                    span.classList.remove('selected')
                }
            })
        } else {
            let elements = container.querySelectorAll(`.form-group.${name} .element`)
            elements.forEach(element => {
                let value = element.value || element.getAttribute('data-value')
                element.classList.toggle('selected', selectedValues.includes(value))
            })
        }
    }

    setMultiSelection(aboutFormContainer, "colour", item.colour, false, isColour = true)
    setMultiSelection(aboutFormContainer, "season", item.season, isCheckbox = true)
    setMultiSelection(aboutFormContainer, "occasion", item.occasion)
    setMultiSelection(aboutFormContainer, "origin", item.origin)

    let originalCare = { ...item.care_instructions }
    setSingleSelection(aboutFormContainer, "wash", item.care_instructions.wash)
    setSingleSelection(aboutFormContainer, "bleach", item.care_instructions.bleach)
    setSingleSelection(aboutFormContainer, "tumble_dry", item.care_instructions.tumble_dry)
    setSingleSelection(aboutFormContainer, "normal_dry", item.care_instructions.natural_dry)
    setSingleSelection(aboutFormContainer, "iron", item.care_instructions.iron)

    let image = aboutFormContainer.querySelector('.image')
    if (item.image) {
        let img = image.querySelector('img')
        const { data: signedUrlData, error: urlError } = await supabase.storage
            .from('fashion-future')
            .createSignedUrl(`${item.user_id}/${item.image}`, 60)

        if (urlError) throw urlError
        if (signedUrlData.signedUrl) {
            img.src = signedUrlData.signedUrl
            img.classList.remove('create-outfit-btn')
            img.classList.add('preview')
        }
    }

    let submitBtn = clothingFormContainer.querySelector('.submit')
    if (fromChallenge == true) {
        submitBtn.addEventListener('click', (e) => {
            e.preventDefault()

            let updatedCare = {
                wash: aboutFormContainer.querySelector(`input[name="wash"]`)?.value,
                bleach: aboutFormContainer.querySelector(`input[name="bleach"]`)?.value,
                tumble_dry: aboutFormContainer.querySelector(`input[name="tumble_dry"]`)?.value,
                natural_dry: aboutFormContainer.querySelector(`input[name="normal_dry"]`)?.value,
                iron: aboutFormContainer.querySelector(`input[name="iron"]`)?.value
            }
            console.log(updatedCare);

            let changes = {}
            for (let key in updatedCare) {
                if (originalCare[key] != updatedCare[key]) {
                    changes[key] = { before: originalCare[key], after: updatedCare[key] }
                }
            }

            console.log(Object.keys(changes).length);

            if (Object.keys(changes).length > 0) {
                updateClothingItem(item.id, aboutFormContainer, clothingFormContainer, true)
            }

        })
    }

    submitBtn.addEventListener('click', (e) => {
        e.preventDefault()
        updateClothingItem(item.id, aboutFormContainer, clothingFormContainer, false)
    })

    let btns = clothingFormContainer.querySelector('.btn-container')
    //do not add it inside the form again!!

    if (!btns.querySelector('.delete.btn')) {
        new CreateElement('button').setAttributes({ class: 'delete btn' }).setText('delete item')
            .addEventListener('click', async () => {
                await wardrobeManager.deleteItems([item.id])
                displayInHome('wardrobe')
                await renderWardrobe()
            }).appendTo(btns)
    }
}

async function updateClothingItem(itemId, formContainer, clothingFormContainer, fromChallenge = false) {
    let formData = new FormData(formContainer)
    let formValues = {}

    formData.forEach((value, key) => {
        if (formValues[key] == 'brand') {
            value = value.toLowerCase().trim().replace(/\s+/g, ' ')
        }
        if (formValues[key]) {
            let currentValues = formValues[key].split(',').map(v => v.trim())
            let newValues = value.split(',').map(v => v.trim())
            let allValues = [...new Set([...currentValues, ...newValues])]
            formValues[key] = allValues.join(',')
        } else {
            formValues[key] = value
        }

    })

    let imageFile = formValues.image
    let imageName

    if (imageFile && Array.isArray(imageFile)) { imageFile = imageFile[imageFile.length - 1] }
    if (imageFile) {
        imageName = imageFile.name
        await uploadFile(window.user, imageName, imageFile)
    }

    try {
        await wardrobeManager.updateItem(
            formValues.brand,
            formValues.category,
            formValues.colour,
            formValues.season,
            formValues.occasion,
            formValues.origin,
            imageName,
            itemId,
            {
                wash: formValues.wash, bleach: formValues.bleach,
                iron: formValues.iron, natural_dry: formValues.natural_dry,
                tumble_dry: formValues.tumble_dry
            }
        )

        if (fromChallenge == true) {
            completeChallenge(['discipline', 'style'])
        } else {
            displayInHome('wardrobe')
            await renderWardrobe()
        }

    } catch (error) {
        console.error('error updating', error)
    }
}

async function renderWardrobe(settings = null) {
    let filterMode = false
    displayInHome('wardrobe')

    let nav = addNavBtn()
    nav.addEventListener('click', () => {
        if (clothingFormContainer.hasChildNodes()) {
            displayInHome('form')
        } else {
            renderClothingForm(clothingFormContainer)
        }
    })

    let data = await selectUserTable(window.user, 'clothing_items')
    data = data.sort((a, b) => a.wear_count - b.wear_count)

    if (data.length == 0) {
        setDisplay([clothingList], 'none')
        wardrobeSection.innerHTML = ''
        await clothesPlaceholder(wardrobeSection)
        return
    }

    let btnContainer = new CreateElement('div').setAttributes({ class: 'btn-container' }).appendTo(wardrobeHeader)

    let clothingListHeader
    let allClothes

    if (settings?.challenge && localStorage.getItem('fromChallenge')) {
        let filtered = settings.challenge.filtered

        if (filtered?.length > 0) {
            let challengeContainer = new CreateElement('div').setAttributes({ class: 'clothing-list', id: 'challenge-items' }).appendTo(wardrobeSection)

            new CreateElement('h4').setText('Challenge Items').appendTo(challengeContainer)
            await renderClothingItem({ appendTo: challengeContainer, data: filtered, mode: 'careChallenge' })
            data = data.filter(item => !filtered.some(filteredItem => filteredItem.id == item.id))
        }
    }

    if (localStorage.getItem('fromChallenge') && settings?.challenge && data.length > 0) {
        clothingListHeader = new CreateElement('h4').setText('Other Items').appendTo(clothingList)
    } else {
        clothingListHeader = new CreateElement('h4').setText('All Clothes').appendTo(clothingList)
    }

    allClothes = await renderClothingItem({ appendTo: clothingList, data: data })
    renderClothingForm(clothingFormContainer)

    let filtersBtn = new CreateElement('button').setAttributes({ class: 'filter btn' }).setText('Filter').appendTo(btnContainer)
    new CreateElement('i').setAttributes({ class: 'fa-filter fa-solid' }).appendTo(filtersBtn)

    let toggleFilterMode = () => {
        filterMode = !filterMode

        let filtersDisplay = document.querySelector('.filters')

        if (!filtersDisplay) {
            renderFilters(wardrobeHeader, clothingList, (filteredItems) => {
                clothingList.innerHTML = ''

                filteredItems
                    .sort((a, b) => b.wear_count - a.wear_count)
                    .forEach(e => renderClothingItem({ clothingFormContainer: clothingFormContainer, appendTo: clothingList, data: [e] }))
            })
            filtersDisplay = document.querySelector('.filters');
        }

        if (filtersDisplay) {

            if (filterMode) {
                filtersDisplay.classList.add('expanded');
                setDisplay([clothingList], 'none')

            } else {
                filtersDisplay.classList.remove('expanded');
                setDisplay([clothingList], 'grid')
                setDisplay([wardrobeHeader], 'flex')
            }

            setDisplay([filtersDisplay], filterMode ? 'block' : 'none')
        }
    }

    filtersBtn.addEventListener('click', toggleFilterMode);
}
