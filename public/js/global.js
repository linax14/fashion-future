const supabase = window.supabase.createClient('https://idtiohrkbkotgjsbgcij.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkdGlvaHJrYmtvdGdqc2JnY2lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzcyMTI4MjgsImV4cCI6MjA1Mjc4ODgyOH0.JVeYsapCa4SgTMqs89vfWA0Nke5oAQmHUPmjhDulea4')
window.user = null;

window.onload = async (event) => {
    let theme = 'dark'
    document.documentElement.setAttribute('data-theme', theme)
}

(async function () {
    window.user = await getUser();
    console.log("user", window.user);

    document.dispatchEvent(new Event("userInitialized"));
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

function capitalise(str) {
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

function formatDate(dateString) {
    const [year, month, day] = dateString.split('-');
    const paddedDay = day.padStart(2, '0');
    const paddedMonth = month.padStart(2, '0');

    return `${paddedDay}-${paddedMonth}-${year}`;
}

async function getChallenges() {
    try {
        const { data, error } = await supabase.from('challenges').select()
        if (error) throw error
        return data

    } catch (error) { console.error(error) }
}

function mergeChallenges(existingChallenges, newChallenges) {
    const existingIds = new Set(existingChallenges.map(c => c.id))
    return [...existingChallenges, ...newChallenges.filter(c => !existingIds.has(c.id))]
}

async function initializeUserChallenges(user) {

    let data = await selectUserTable(window.user, 'user_details')

    if (!data || data.length == 0) {
        await supabase
            .from('user_details')
            .insert({ user_id: user.id, challenges_progress: [] })
            .eq('user_id', user.id)

        data = await selectUserTable(window.user, 'user_details');
    }

    let existingChallenges = data[0]?.challenges_progress || []

    let newChallenges = await getChallenges()

    if (!newChallenges || newChallenges.length === 0) {
        console.warn("No new challenges found.")
        return data
    }

    let updatedChallenges = mergeChallenges(existingChallenges, newChallenges)

    await updateUserTable(window.user, 'user_details', { challenges_progress: updatedChallenges })
    data = await selectUserTable(window.user, 'user_details')

    return data
}

async function initializeUserCalendar(user) {

    let data = await selectUserTable(window.user, 'user_details')
    let userData = data[0]

    if (!userData.year) {
        await updateUserTable(window.user, 'user_details', { 'year': year });
    }

    let calendar = {}
    months.forEach((month, index) => {
        let daysInMonth = new Date(year, index + 1, 0).getDate()
        calendar[month] = {};

        for (let day = 1; day <= daysInMonth; day++) {
            calendar[month][day] = { challenges: [] };
        }
    })

    if (!userData.calendar) {
        await updateUserTable(window.user, 'user_details', { 'calendar': calendar })
        data = await selectUserTable(window.user, 'user_details')
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

renderNavigation()