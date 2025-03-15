
async function addClothingItems(brand, category, colour, season, occasion, image) {
    const user = await getUser()

    try {
        const { data, error } = await supabase
            .from('clothing_items')
            .insert({
                brand: brand || null,
                category: category || null,
                colour: colour || null,
                season: season || null,
                occasion: occasion || null,
                user_id: user.id,
                image: image || null,
            })
            .select()

        if (error) {
            console.error(`supabase error ${error}`)
            throw new Error(error.message)
        }

        return data

    } catch (error) {
        console.log(error)
        throw error
    }
}

async function getClothingItems() {
    try {

        let wardrobe = document.querySelector('.wardrobe-container')
        wardrobe.innerHTML = ''
        const user = await getUser()

        const { data, error } = await supabase
            .from('clothing_items')
            .select()
            .eq('user_id', user.id)

        if (error) {
            console.error(`supabase error ${error}`)
            throw new Error(error.message)

        }
        const itemElements = await Promise.all(data.map(async (element) => {
            let container = new CreateElement('div').setAttributes({ class: 'wardrobe item-container' }).appendTo(wardrobe)

            if (element.image) {

                try {
                    const { data: signedUrlData, error: urlError } = await supabase.storage
                        .from('fashion-future')
                        .createSignedUrl(`${element.user_id}/${element.image}`, 60)

                    if (urlError) throw urlError
                    if (signedUrlData.signedUrl) {
                        new CreateElement('img').setAttributes({ class: 'wardrobe image', src: signedUrlData.signedUrl }).appendTo(container)
                    }

                } catch (urlError) {
                    console.error(`url: ${urlError}`)
                }
            }

            new CreateElement('p').setText(element.brand).appendTo(container)
        }))

    } catch (error) {
        console.log(error)
        throw error
    }
}

async function uploadFile(filepath, file) {
    try {
        let user = await getUser()

        const { data, error } = await supabase.storage.from('fashion-future')
            .upload(`${user.id}/${filepath}`, file, {
                cacheControl: '3600',
                upsert: false
            })

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

function renderWardrobe() {
    let main = new CreateElement('div').appendTo(document.body)
    new CreateElement('h1').setText('wardrobe').appendTo(main)
    new CreateElement('h2').setText('all clothes').appendTo(main)
    let wardrobe = new CreateElement('div').setAttributes({ class: 'wardrobe-container' }).appendTo(main)

    renderModal(main)
}

function renderModal(main) {
    let addClothingModal = new CreateElement('div').setAttributes({ class: 'modal' })
        .appendTo(main)

    let closeModalBtn = new CreateElement('button').setAttributes({ class: 'close btn' }).setText('x')
        .addEventListener('click', () => {
            addClothingModal.style.display = 'none'
        })
        .appendTo(addClothingModal)

    let formContainer = new CreateElement('form').setAttributes({ class: 'form-container' }).appendTo(addClothingModal)

    let formFields = {
        image: new ImageUpload('image', { type: 'input', inputType: 'file', class: 'image', accept: 'image/png, image/jpeg', capture: 'camera' }, formContainer),
        brand: new TextInput('brand', { placeholder: 'Enter brand name', required: true }, formContainer),
        category: new SelectOption('category', {
            type: 'span', options: ['tops', 't-shirts', 'blouses', 'cardigans',
                'sweaters', 'sweatshits', 'blazers', 'coats', 'jackets',
                'skirts', 'shorts', 'jeans', 'trousers', 'joggers', 'knitwear', 'dresses'
            ]
        }, formContainer),
        colour: new SelectColours('colour', {
            type: 'button', options: {
                'red': '#e53935', 'pink': '#d81b60', 'purple': '#8e24aa', 'Deep Purple': '5e35b1',
                'indigo': '#3949ab', 'blue': '#1e88e5', 'Light Blue': '#039be5', 'cyan': '#00acc1',
                'teal': '#00897b', 'green': '#43a047', 'Light Green': '#7cb342', 'lime': '#c0ca33',
                'yellow': '#fdd835', 'amber': '#fbb300', 'orange': '#fb8c00', 'Deep Orange': '#f4511e',
                'brown': '#6d4c41', 'Light Grey': '#757575', 'Blue Grey': '#546e7a',
                'Deep Grey': '#212121', 'black': '#000000', 'white': '#ffffff'
            }
        }, formContainer),
        season: new CheckboxGroup('season', { options: ['winter', 'spring', 'summer', 'autumn'] }, formContainer),
        occasion: new SelectOption('occasion', {
            type: 'span', options: ['chill', 'work', 'date night', 'gym',
                'brunch', 'outdoors', 'holiday', 'formal'
            ]
        }, formContainer)
    }

    let submitForm = new CreateElement('button').setAttributes({ class: 'submit btn', type: 'submit' }).setText('submit')
        .addEventListener('click', async () => {
            addClothingModal.style.display = 'none'
            getClothingItems()
        })
        .appendTo(formContainer)

    formContainer.addEventListener("submit", async (event) => {
        event.preventDefault()

        let formData = new FormData(formContainer)
        let formValues = {}

        formData.forEach((value, key) => {
            if (formValues[key]) {
                if (Array.isArray(formValues[key])) {
                    formValues[key].push(value)
                } else {
                    formValues[key] = [formValues[key], value]
                }
            } else {
                formValues[key] = value
            }
        })

        console.log(formValues)
        let imageName = null

        if (formValues.image && formValues.image.name) {
            let upload = await uploadFile(formValues.image.name, formValues.image)
            console.log(upload)
            imageName = formValues.image.name
        }

        await addClothingItems(
            formValues.brand,
            formValues.category,
            formValues.colour,
            formValues.season,
            formValues.occasion,
            imageName
        )
    })

    getClothingItems()

}

renderWardrobe()
