document.addEventListener("userInitialized", async () => {
    //console.log("user", window.user)
    clothingManager = new WardrobeManager(window.user)

    renderHeader()
    // renderWardrobe()
    // renderStats()
})

new CreateElement('h1').setText('HOME').setAttributes({ class: 'header' }).appendTo(document.body)
let userInfo = new CreateElement('div').setAttributes({ class: 'header-user' }).appendTo(document.body)
let wardrobeContainer = new CreateElement('div').setAttributes({ class: 'wardrobe-container' }).appendTo(document.body)
let wardrobeHeader = new CreateElement('div').setAttributes({ class: 'header' }).appendTo(wardrobeContainer)
let clothingList = new CreateElement('div').setAttributes({ class: 'clothing-list' }).appendTo(wardrobeContainer)
let statsSection = new CreateElement('section').setAttributes({ class: 'stats-section' }).appendTo(document.body)
let clothingFormContainer = new CreateElement('div').setAttributes({ class: 'clothing-formContainer' }).appendTo(document.body)

let clothingManager
let displayInHome = (type) => {

    switch (type) {
        case 'form':
            setDisplay([clothingFormContainer], 'block')
            clothingFormContainer.style.visibility = 'visible'
            setDisplay([wardrobeContainer, wardrobeHeader, userInfo], 'none')
            break;

        case 'wardrobe':
            clothingList.innerHTML = ''
            wardrobeHeader.innerHTML = ''
            setDisplay([wardrobeContainer, userInfo, wardrobeHeader], 'grid')
            setDisplay([clothingFormContainer], 'none')
            setDisplay([statsSection], 'none')
            clothingFormContainer.style.visibility = 'hidden'
            statsSection.style.visibility = 'hidden'
            break;

        case 'stats':
            statsSection.innerHTML = ''
            setDisplay([wardrobeContainer, clothingFormContainer], 'none')
            setDisplay([statsSection], 'flex')
            setDisplay([userInfo, wardrobeHeader], 'grid')
            statsSection.style.visibility = 'visible'

        default:
            setDisplay([clothingList, userInfo, wardrobeHeader], 'grid')
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

    async addItem({ brand = null, category = null, colour = null, season = null, occasion = null, origin = null, image = null }) {
        try {
            const { data, error } = await supabase.from('clothing_items')
                .insert({ brand, category, colour, season, occasion, origin, user_id: this.user.id, image, }).select()
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

    async updateItem(brand, category, colour, season, occasion, origin, image, itemId) {
        try {
            const { data, error } = await supabase
                .from('clothing_items')
                .update({ brand, category, colour, season, occasion, origin, image })
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
            if (formValues[key]) {
                formValues[key] = `${formValues[key]},${value}`
            } else {
                formValues[key] = value
            }
        })

        let imageFile = formValues.image
        console.log(imageFile)

        if (Array.isArray(imageFile)) {
            imageFile = imageFile[imageFile.length - 1]
        }

        let imageName = null

        if (imageFile) {
            imageName = imageFile.name
            await uploadFile(window.user, imageName, imageFile)
        }

        await onSubmitCallback(formValues, imageName)
        isDirty = false
        displayInHome('wardrobe')
    })

    return { form, isDirty: () => isDirty }
}

async function renderClothingForm(clothingFormContainer) {
    clothingFormContainer.innerHTML = ''
    closeBtnX(clothingFormContainer, () => {
        setDisplay([clothingFormContainer], 'none')
        clothingFormContainer.style.visibility = 'hidden'
        renderWardrobe()
        setDisplay([clothingList, wardrobeHeader, userInfo], 'grid')
    })

    let btnContainer = new CreateElement('div').setAttributes({ class: 'btn-container' }).appendTo(clothingFormContainer)
    let aboutBtn = new CreateElement('button').setText('about').setAttributes({ class: 'tab-btn' }).appendTo(btnContainer)
    let careBtn = new CreateElement('button').setText('care').setAttributes({ class: 'tab-btn' }).appendTo(btnContainer)

    let aboutFormContainer = new CreateElement('form')
        .setAttributes({ id: 'about-form', class: 'form-container' }).appendTo(clothingFormContainer)
    let careFormContainer = new CreateElement('form')
        .setAttributes({ id: 'care-form', class: 'form-container' }).appendTo(clothingFormContainer)

    let aboutFormFields = {
        image: new ImageUpload('image', { type: 'input', inputType: 'file', class: 'image', accept: 'image/png, image/jpeg', capture: 'camera' }, aboutFormContainer),
        brand: new TextInput('brand', { placeholder: 'Enter brand name', required: true }, aboutFormContainer),
        category: new SelectOption('category', {
            type: 'span', options: ['tops', 't-shirts', 'blouses', 'cardigans',
                'sweaters', 'sweatshirts', 'blazers', 'coats', 'jackets',
                'skirts', 'shorts', 'jeans', 'trousers', 'joggers', 'knitwear', 'dresses'
            ], multiple: false, dropdown: true
        }, aboutFormContainer),
        colour: new Colours('colour', {
            type: 'button', options: {
                'red': '#e53935', 'pink': '#d81b60', 'Deep Purple': '#5e35b1',
                'indigo': '#3949ab', 'blue': '#1e88e5', 'Light Blue': '#039be5', 'cyan': '#00acc1',
                'teal': '#00897b', 'green': '#43a047', 'Light Green': '#7cb342', 'lime': '#c0ca33',
                'yellow': '#fdd835', 'amber': '#fbb300', 'orange': '#fb8c00', 'Deep Orange': '#f4511e',
                'brown': '#6d4c41', 'Light Grey': '#757575', 'Blue Grey': '#546e7a',
                'Deep Grey': '#212121', 'black': '#000000', 'white': '#ffffff'
            }, class: 'color btn'
        }, aboutFormContainer),
        season: new CheckboxGroup('season', { options: ['winter', 'spring', 'summer', 'autumn'] }, aboutFormContainer),
        occasion: new SelectOption('occasion', {
            type: 'span', options: ['chill', 'work', 'date night', 'gym',
                'brunch', 'outdoors', 'holiday', 'formal'
            ], multiple: true, dropdown: true
        }, aboutFormContainer),
        origin: new SelectOption('origin', {
            type: 'span',
            options: ['new item', 'hand me down', 'thrifted', 'gifted', 'upcycled', 'vintage', 'custom-made', 'rental',],
            multiple: true, dropdown: true
        }, aboutFormContainer)
    }

    let aboutForm = handleFormSubmit(aboutFormContainer,
        async (formValues, imageName) => {
            await clothingManager.addItem({
                brand: formValues.brand,
                category: formValues.category,
                colour: formValues.colour,
                season: formValues.season,
                occasion: formValues.occasion,
                origin: formValues.origin,
                image: imageName
            })
        })

    careFormContainer.classList.add("hidden")
    aboutBtn.classList.add("selected")

    let toggleBtns = () => {
        [careFormContainer, aboutFormContainer].forEach(el => el.classList.toggle('hidden'))
        [careBtn, aboutBtn].forEach(btn => btn.classList.toggle('selected'))
    }
    [careBtn, aboutBtn].forEach(btn => btn.addEventListener('click', () => { toggleBtns() }))
}

async function renderEditClothingItem(clothingFormContainer, wardrobeContainer, item) {
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
        let selectInput = container.querySelector(`input[name=${name}]`)
        if (selectInput) selectInput.value = value
        // console.log(name)

        let elements = document.querySelectorAll(`.form-group.${name} .element`)
        elements.forEach(element => {
            element.classList.toggle('selected', element.getAttribute('value') == value)
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
                let value = element.value || element.getAttribute('value')
                element.classList.toggle('selected', selectedValues.includes(value))
            })
        }
    }

    setMultiSelection(aboutFormContainer, "colour", item.colour, false, isColour = true)
    setMultiSelection(aboutFormContainer, "season", item.season, isCheckbox = true)
    setMultiSelection(aboutFormContainer, "occasion", item.occasion)
    setMultiSelection(aboutFormContainer, "origin", item.origin)

    let image = aboutFormContainer.querySelector('.image')
    if (item.image) {
        // let img = image.querySelector('img')
        // const { data: signedUrlData, error: urlError } = await supabase.storage
        //     .from('fashion-future')
        //     .createSignedUrl(`${item.user_id}/${item.image}`, 60)

        // if (urlError) throw urlError
        // if (signedUrlData.signedUrl) {
        //     img.src = signedUrlData.signedUrl
        //     img.classList.remove('create-outfit')
        //     img.classList.add('preview')
        // }
    }

    let submitBtn = clothingFormContainer.querySelector('.submit')
    submitBtn.addEventListener('click', (e) => {
        e.preventDefault()
        updateClothingItem(item.id, aboutFormContainer, clothingFormContainer)
    })

    //do not add it inside the form again!!
    let deleteBtn = new CreateElement('button').setAttributes({ class: 'delete btn' }).setText('delete')
        .addEventListener('click', async () => {
            await clothingManager.deleteItems([item.id])
            renderWardrobe()
            displayInHome('wardrobe')
        }).appendTo(clothingFormContainer)
}

async function updateClothingItem(itemId, formContainer, clothingFormContainer) {
    let formData = new FormData(formContainer)
    let formValues = {}

    formData.forEach((value, key) => {
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

    if (imageFile && Array.isArray(imageFile)) {
        imageFile = imageFile[imageFile.length - 1]
    }

    if (imageFile) {
        imageName = imageFile.name
        await uploadFile(window.user, imageName, imageFile)
    }

    try {
        await clothingManager.updateItem(
            formValues.brand,
            formValues.category,
            formValues.colour,
            formValues.season,
            formValues.occasion,
            formValues.origin,
            imageName,
            itemId
        )

        displayInHome('wardrobe')
        renderClothingItem(clothingFormContainer, clothingList)

    } catch (error) {
        console.error('error updating', error)
    }
}

async function renderWardrobe() {
    let editMode = false
    let filterMode = false

    displayInHome('wardrobe')

    new CreateElement('h2').setText('Clothing items').appendTo(wardrobeHeader)
    let btnContainer = new CreateElement('div').setAttributes({ class: 'btn-container' }).appendTo(wardrobeHeader)
    let deleteButton = new CreateElement('button').setText('Delete').setAttributes({ style: 'display:none', class: 'delete btn' }).appendTo(wardrobeHeader)
    let editWardrobe = new CreateElement('button').setAttributes({ class: 'edit btn' }).appendTo(btnContainer)
    new CreateElement('i').setAttributes({ class: 'fa-trash fa-solid' }).appendTo(editWardrobe)

    let allClothes = await renderClothingItem(clothingFormContainer, clothingList)
    renderClothingForm(clothingFormContainer)

    let filtersBtn = new CreateElement('button').setAttributes({ class: 'filter btn' }).appendTo(btnContainer)
    new CreateElement('i').setAttributes({ class: 'fa-filter fa-solid' }).appendTo(filtersBtn)

    let toggleEditMode = () => {
        editMode = !editMode
        filterMode = false

        allClothes.forEach(({ container, checkbox }) => {
            editMode
                ? container.removeEventListener('click', container.itemClickHandler)
                : container.addEventListener('click', container.itemClickHandler)

            setDisplay([checkbox, deleteButton], editMode ? 'block' : 'none')
        })

        filtersBtn.disabled = editMode
    }

    let toggleFilterMode = () => {
        filterMode = !filterMode
        editMode = false

        let filtersDisplay = document.querySelector('.filters')

        if (!filtersDisplay) {
            renderFilters(wardrobeHeader, clothingList, (filteredItems) => {
                clothingList.innerHTML = ''
                filteredItems.forEach(e => renderClothingItem(clothingFormContainer, clothingList, [e]))
                console.log(filteredItems);
            })
            filtersDisplay = document.querySelector('.filters');
        }

        if (filtersDisplay) {

            if (filterMode) {
                filtersDisplay.classList.add('expanded');
                setDisplay([clothingList], 'none')

            } else {
                filtersDisplay.classList.remove('expanded');
                setDisplay([clothingList, wardrobeHeader], 'grid')
            }

            setDisplay([filtersDisplay], filterMode ? 'block' : 'none')
        }
        editWardrobe.disabled = filterMode
    }

    editWardrobe.addEventListener('click', toggleEditMode);
    filtersBtn.addEventListener('click', toggleFilterMode);

    deleteButton.addEventListener('click', async () => {

        let selectedClothesCheckbox = allClothes.filter(({ checkbox }) => checkbox.checked)
        console.log(selectedClothesCheckbox);

        if (selectedClothesCheckbox.length === 0) {
            alert('No items selected.')
            return
        }
        console.log(selectedClothesCheckbox);

        let clothesIdFromCheckbox = selectedClothesCheckbox.map(({ id }) => id)
        allClothes = await clothingManager.deleteItems(clothesIdFromCheckbox, selectedClothesCheckbox, allClothes)
        editMode = false

        allClothes.forEach(({ container, checkbox }) => {
            container.addEventListener('click', container.itemClickHandler)
            setDisplay([checkbox], 'none')
        })

        setDisplay([clothingFormContainer, deleteButton], 'none')
        setDisplay([clothingList], 'grid')
    })

    let navBtn = document.querySelectorAll('nav ol li button')
    navBtn[0].addEventListener('click', () => {
        if (clothingFormContainer.hasChildNodes()) {
            displayInHome('form')
        }
    })
}

async function renderHeader() {
    new CreateElement('div').setAttributes({ class: 'icon' }).appendTo(userInfo)
    let info = new CreateElement('ul').setAttributes({ class: 'info' }).appendTo(userInfo)
    new CreateElement('li').setText(`${window.user.user_metadata.first_name} ${window.user.user_metadata.last_name}`)
        .appendTo(info)
    new CreateElement('li').setText('personality').appendTo(info)

    const clothingItems = await clothingManager.getAllClothes()

    let clothingItemsTotal = clothingItems.length
    new CreateElement('li').setText(`${clothingItemsTotal} items in wardrobe`).appendTo(info)

    modeBtns()
}

let modeBtns = () => {
    let container = new CreateElement('div').setAttributes({ class: 'btn-container' }).appendTo(userInfo)
    new CreateElement('button').setText('Wardrobe').setAttributes({ class: 'btn' })
        .addEventListener('click', () => {
            displayInHome('wardrobe')
            renderWardrobe()
        }).appendTo(container)
    new CreateElement('button').setText('Stats').setAttributes({ class: 'btn' })
        .addEventListener('click', () => {
            displayInHome('stats')
            render()
        }).appendTo(container)
}
