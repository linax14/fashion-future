document.addEventListener("userInitialized", async () => {
    //console.log("user", window.user)
    renderHeader()
    renderWardrobe()
})

//add clothing items to sb
async function addClothingItems(user, brand = null, category = null, colour = null, season = null, occasion = null, origin = null, image = null) {
    try {
        const { data, error } = await supabase.from('clothing_items')
            .insert({ brand, category, colour, season, occasion, origin, user_id: user.id, image, }).select()
        if (error) throw new Error(error.message)
        return data

    } catch (error) {
        console.log(error)
        throw error
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

function handleFormSubmit(newItemContainer, wardrobeContainer, form, onSubmitCallback, itemId = null) {
    let wardrobeHeader = document.querySelector('.header')
    let isDirty = false

    form.addEventListener("input", () => isDirty = true)

    //submit form btn
    new CreateElement('button').setAttributes({ class: 'submit btn', type: 'submit' }).setText('submit')
        .appendTo(form)

    form.addEventListener("submit", async (event) => {
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

        let headerContainer = document.querySelector('.header-user')
        wardrobeContainer.innerHTML = ''
        wardrobeHeader.innerHTML = ''
        wardrobeContainer.innerHTML = ''
        setDisplay([wardrobeContainer, headerContainer, wardrobeHeader], 'grid')
        setDisplay([newItemContainer], 'none')
        newItemContainer.style.visibility = 'hidden'
    })


    return { form, isDirty: () => isDirty }
}

async function renderAddClothingItem(newItemContainer, wardrobeContainer, headerContainer) {
    let wardrobeHeader = document.querySelector('.header')

    closeBtnX(newItemContainer, () => {
        setDisplay([newItemContainer], 'none')
        newItemContainer.style.visibility = 'hidden'
        setDisplay([wardrobeContainer, wardrobeHeader, headerContainer], 'grid')
    })

    let btnContainer = new CreateElement('div').setAttributes({ class: 'btn-container' }).appendTo(newItemContainer)
    let aboutBtn = new CreateElement('button').setText('about').setAttributes({ class: 'tab-btn' }).appendTo(btnContainer)
    let careBtn = new CreateElement('button').setText('care').setAttributes({ class: 'tab-btn' }).appendTo(btnContainer)

    let aboutFormContainer = new CreateElement('form')
        .setAttributes({ id: 'about-form', class: 'form-container' }).appendTo(newItemContainer)
    let careFormContainer = new CreateElement('form')
        .setAttributes({ id: 'care-form', class: 'form-container' }).appendTo(newItemContainer)

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

    let aboutForm = handleFormSubmit(newItemContainer, wardrobeContainer, aboutFormContainer,
        async (formValues, imageName) => {
            await addClothingItems(window.user,
                formValues.brand,
                formValues.category,
                formValues.colour,
                formValues.season,
                formValues.occasion,
                formValues.origin,
                imageName
            )
        })

    careFormContainer.classList.add("hidden")
    aboutBtn.classList.add("selected")

    let toggleBtns = () => {
        [careFormContainer, aboutFormContainer].forEach(el => el.classList.toggle('hidden'))
        [careBtn, aboutBtn].forEach(btn => btn.classList.toggle('selected'))
    }
    [careBtn, aboutBtn].forEach(btn => btn.addEventListener('click', () => { toggleBtns() }))
}

async function renderEditClothingItem(newItemContainer, wardrobeContainer, item) {
    let headerContainer = document.querySelector('.header-user')
    let wardrobeHeader = document.querySelector('.header')
    setDisplay([newItemContainer], 'block')
    newItemContainer.style.visibility = 'visible'
    setDisplay([wardrobeContainer, wardrobeHeader, headerContainer], 'none')
    console.log(item)

    let aboutFormContainer = newItemContainer.querySelector('#about-form')

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
        console.log(name)

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
        let img = image.querySelector('img')
        const { data: signedUrlData, error: urlError } = await supabase.storage
            .from('fashion-future')
            .createSignedUrl(`${item.user_id}/${item.image}`, 60)

        if (urlError) throw urlError
        if (signedUrlData.signedUrl) {
            img.src = signedUrlData.signedUrl
            img.classList.remove('create-outfit')
            img.classList.add('preview')
        }
    }

    let submitBtn = newItemContainer.querySelector('.submit')
    submitBtn.addEventListener('click', (e) => {
        e.preventDefault()
        updateClothingItem(item.id, aboutFormContainer, newItemContainer, wardrobeContainer)
    })

}

async function deleteClothingItems(itemIds, selectedItems, itemElements) {
    try {
        const { error } = await supabase.from('clothing_items').delete().in('id', itemIds)
        if (error) throw error

        selectedItems.forEach(({ container }) => container.remove())
        itemElements = itemElements.filter(({ id }) => !itemIds.includes(id))

        console.log('items deleted')

    } catch (err) {
        console.error('error deleting', err)
    }
    return itemElements
}

async function updateClothingItem(itemId, formContainer, newItemContainer, wardrobeContainer) {
    let formData = new FormData(formContainer)
    let formValues = {}

    console.log(formValues)

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
        const { data, error } = await supabase
            .from('clothing_items')
            .update({
                brand: formValues.brand,
                category: formValues.category,
                colour: formValues.colour,
                season: formValues.season,
                occasion: formValues.occasion,
                origin: formValues.origin,
                image: imageName
            })
            .eq('id', itemId)

        if (error) {
            console.error(`supabase error: ${error}`)
            throw new Error(error.message)
        }

        let headerContainer = document.querySelector('.header-user')
        setDisplay([newItemContainer], 'none')
        newItemContainer.style.visibility = 'hidden'
        setDisplay([wardrobeContainer, headerContainer], 'grid')
        wardrobeContainer.innerHTML = ''
        displayClothingItems(newItemContainer, wardrobeContainer)

    } catch (error) {
        console.error('error updating', error)
    }
}

async function renderWardrobe() {
    let editMode = false
    let filterMode = false

    let headerContainer = document.querySelector('.header-user')
    let wardrobeHeader = new CreateElement('div').setAttributes({ class: 'header' }).appendTo(document.body)
    wardrobeHeader.innerHTML = ''
    let wardrobeContainer = new CreateElement('div').setAttributes({ class: 'wardrobe-container' }).appendTo(document.body)
    wardrobeContainer.innerHTML = ''
    new CreateElement('h2').setText('All items').appendTo(wardrobeHeader)
    let btnContainer = new CreateElement('div').setAttributes({ class: 'btn-container' }).appendTo(wardrobeHeader)
    let deleteButton = new CreateElement('button').setText('Delete').setAttributes({ style: 'display:none', class: 'delete btn' }).appendTo(wardrobeHeader)
    let editWardrobe = new CreateElement('button').setAttributes({ class: 'edit btn' }).appendTo(btnContainer)
    new CreateElement('i').setAttributes({ class: 'fa-trash fa-solid' }).appendTo(editWardrobe)

    let newItemContainer = new CreateElement('div').setAttributes({ class: 'newItem-container' }).appendTo(document.body)
    let clothingItemElements = await displayClothingItems(newItemContainer, wardrobeContainer)
    renderAddClothingItem(newItemContainer, wardrobeContainer, headerContainer)

    setDisplay([newItemContainer], 'none')
    newItemContainer.style.visibility = 'hidden'

    let filtersBtn = new CreateElement('button').setAttributes({ class: 'filter btn' }).appendTo(btnContainer)
    new CreateElement('i').setAttributes({ class: 'fa-filter fa-solid' }).appendTo(filtersBtn)

    let toggleEditMode = () => {
        editMode = !editMode
        filterMode = false

        clothingItemElements.forEach(({ container, checkbox }) => {
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

        let miniModal = document.querySelector('.filters')

        if (!miniModal) {
            renderFilters(wardrobeHeader, wardrobeContainer, (filteredItems) => {
                wardrobeContainer.innerHTML = ''
                filteredItems.forEach(e => displayClothingItems(newItemContainer, wardrobeContainer, [e]))
                console.log(filteredItems);
            })
            miniModal = document.querySelector('.filters');
        }

        if (miniModal) {
            let isExpanded = miniModal.classList.toggle('expanded')

            if (filterMode) {
                miniModal.classList.add('expanded');
            } else {
                miniModal.classList.remove('expanded');
                setDisplay([wardrobeContainer], 'grid')
            }

            setDisplay([miniModal], filterMode ? 'block' : 'none')
            setDisplay([wardrobeContainer, wardrobeHeader], isExpanded && filterMode ? 'none' : 'grid')
        }
        editWardrobe.disabled = filterMode
    }

    editWardrobe.addEventListener('click', toggleEditMode);
    filtersBtn.addEventListener('click', toggleFilterMode);

    deleteButton.addEventListener('click', async () => {

        let selectedItems = clothingItemElements.filter(({ checkbox }) => checkbox.checked)
        if (selectedItems.length === 0) {
            alert('No items selected.')
            return
        }

        let itemIds = selectedItems.map(({ id }) => id)
        clothingItemElements = await deleteClothingItems(itemIds, selectedItems, clothingItemElements)
        editMode = false

        clothingItemElements.forEach(({ container, checkbox }) => {
            container.addEventListener('click', container.itemClickHandler)
            setDisplay([checkbox], 'none')
        })

        setDisplay([newItemContainer, deleteButton], 'none')
        setDisplay([wardrobeContainer], 'grid')
    })

    let navBtn = document.querySelectorAll('nav ol li button')
    navBtn[0].addEventListener('click', () => {
        if (newItemContainer.hasChildNodes()) {
            setDisplay([newItemContainer], 'block')
            newItemContainer.style.visibility = 'visible'
            setDisplay([wardrobeContainer, headerContainer, wardrobeHeader], 'none')
        } else {
            setDisplay([wardrobeContainer, newItemContainer], 'none')
            newItemContainer.style.visibility = 'hidden'
            setDisplay([headerContainer, wardrobeHeader], 'grid')

            renderAddClothingItem(newItemContainer, wardrobeContainer, headerContainer)
        }
    })
}

async function renderHeader() {
    let userInfo = new CreateElement('div').setAttributes({ class: 'header-user' }).appendTo(document.body)
    new CreateElement('div').setAttributes({ class: 'icon' }).appendTo(userInfo)
    new CreateElement('p').setText(`${window.user.user_metadata.first_name} ${window.user.user_metadata.last_name}`)
        .appendTo(userInfo)
    new CreateElement('p').setText('personality').appendTo(userInfo)

    const clothingItems = await selectUserTable(window.user, 'clothing_items')

    let clothingItemsTotal = clothingItems.length
    new CreateElement('p').setText(`${clothingItemsTotal} items in wardrobe`).appendTo(userInfo)

}


