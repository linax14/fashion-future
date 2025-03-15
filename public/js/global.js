const supabase = window.supabase.createClient('https://idtiohrkbkotgjsbgcij.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkdGlvaHJrYmtvdGdqc2JnY2lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzcyMTI4MjgsImV4cCI6MjA1Mjc4ODgyOH0.JVeYsapCa4SgTMqs89vfWA0Nke5oAQmHUPmjhDulea4')

async function getUser() {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        console.error("User not logged in.")
        return
    }

    return user
}

async function getUserOutfits() {
    let user = await getUser()

    const { data: outfits, error: outfitsError } = await supabase
        .from('outfit')
        .select()
        .eq('user_id', user.id);

    if (outfitsError) throw outfitsError;

    return outfits
}

function capitalise(str) {
    return str.charAt(0).toUpperCase() + str.slice(1)
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
                .addEventListener('click', () => {
                    let addClothingModal = document.querySelector('.modal')
                    addClothingModal.style.display = 'block'
                })
                .appendTo(listItem)
        } else {
            new CreateElement(value.link.type)
                .setAttributes({ href: value.link.href })
                .setText(value.link.text)
                .appendTo(listItem)
        }
    })
}

class FormField {
    constructor(name, config, container) {
        this.name = name
        this.config = config
        this.container = container

        this.wrapper = new CreateElement('div')
            .setAttributes({ class: `modal-group ${name}` })
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

        config.options.forEach(option => {
            let checkboxWrapper = new CreateElement('div')
                .setAttributes({ class: 'checkbox-wrapper' })
                .appendTo(this.wrapper)

            new CreateElement('input')
                .setAttributes({ type: 'checkbox', name: name, value: option })
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

        new CreateElement('button')
            .setAttributes({ type: 'button', class: 'btn' })
            .addEventListener('click', () => {
                let img = new CreateElement('input')
                    .setAttributes({
                        class: config.class,
                        type: config.inputType,
                        accept: config.accept,
                        capture: config.capture,
                        name: name
                    })
                    .appendTo(this.wrapper)
                img.click()
            })
            .setText('Add Image').appendTo(this.wrapper)
    }
}

class SelectOption extends FormField {
    constructor(name, config, container) {
        super(name, config, container)

        let hiddenInput = new CreateElement('input')
            .setAttributes({ type: 'hidden', name: name })
            .appendTo(this.wrapper)


        let selected = null

        config.options.sort().forEach(category => {
            let element = new CreateElement(config.type)
                .setAttributes({ value: category, class: 'element' })
                .addEventListener('click', () => {

                    if (selected == element) {
                        selected.classList.remove('selected')
                        selected = null
                        hiddenInput.value = ''

                    } else {

                        if (selected) {
                            selected.classList.remove('selected')
                        }

                        selected = element
                        element.classList.add('selected')
                        hiddenInput.value = category
                    }
                })
                .setText(capitalise(category))
                .appendTo(this.wrapper)
        })
    }
}

class SelectColours extends FormField {
    constructor(name, config, container) {
        super(name, config, container)

        let hiddenColorInput = new CreateElement('input')
            .setAttributes({ type: 'hidden', name: name })
            .appendTo(this.wrapper)

        let selected = []

        Object.entries(config.options).forEach(([option, value]) => {
            let element = new CreateElement('div')
                .setAttributes({ class: 'colors', name: option })
                .appendTo(this.wrapper)

            let color = new CreateElement('span')
                .setAttributes({ style: `background-color:${value}`, class: 'color btn' })
                .addEventListener('click', () => {

                    if (selected.includes(option)) {
                        selected = selected.filter(c => c !== option)
                        color.innerHTML = ''
                        color.classList.remove('selected')
                    } else {
                        selected.push(option)
                        color.classList.add('selected')
                    }

                    hiddenColorInput.value = selected.join(',')
                })
                .appendTo(element)


            new CreateElement('label')
                .setAttributes({ for: option }).setText(capitalise(option))
                .appendTo(element)
        })
    }
}

window.onload = (event) => {
    let theme = 'dark'
    document.documentElement.setAttribute('data-theme', theme)
}

renderNavigation()