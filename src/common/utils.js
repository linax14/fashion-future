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

let capitalise = (str) => { return str.charAt(0).toUpperCase() + str.slice(1) }
let setDisplay = (elements, displayType) => elements.forEach(element => element.style.display = displayType)
let closeBtnX = (appendTo, onClick) => new CreateElement('button').setAttributes({ class: 'close' }).setText('×').addEventListener('click', onClick).appendTo(appendTo)

let fontAwesome = new CreateElement('link').setAttributes({
    rel: 'stylesheet', href: "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css",
    integrity: "sha512-Evv84Mr4kqVGRNSgIGL/F/aIDqQb7xQ2vcrdIwxfjThSH8CSR7PBEakCr51Ck+w+/U6swU2Im1vVX0SVk9ABhg==",
    crossorigin: "anonymous", referrerpolicy: "no-referrer"
}).appendTo(document.head)

// let mainCss = customCss = document.querySelector('link[href="../styles/main.css"]')
// let bootstrap = new CreateElement('link').setAttributes({
//     rel: 'stylesheet', href: "https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.3/css/bootstrap.min.css",
//     integrity: "sha512-jnSuA4Ss2PkkikSOLtYs8BlYIeeIK1h99ty4YfvRPAlzr377vr3CXDb7sb7eEEBYjDtcYj+AjBH3FLv5uSJuXg==",
//     crossorigin: "anonymous", referrerpolicy: "no-referrer"
// }).appendTo(document.head)

// if (mainCss) { document.head.insertBefore(bootstrap, mainCss) }

function renderNavigation() {
    let navigation = new CreateElement('nav').setAttributes({ class: 'bottom-nav' }).appendTo(document.body)
    let ol = new CreateElement('ol').appendTo(navigation)

    let elements = {
        dashboard: { type: 'li', link: { type: 'a', href: './public/dashboard.html', text: 'dashboard' }, i: { src: './assets/icons/dash.png' } },
        planner: { type: 'li', link: { type: 'a', href: './public/planner.html', text: 'planner' }, i: { src: './assets/icons/calendar.png' } },
        wardrobe: { type: 'li', class: 'invert-image', link: { type: 'a', href: './public/wardrobe.html', text: 'wardrobe' }, i: { src: 'https://img.icons8.com/pastel-glyph/64/hanger--v1.png' } },
        stats: { type: 'li', link: { type: 'a', href: './public/stats.html', text: 'stats' }, i: { src: './assets/icons/stats.png' } },
    }

    Object.entries(elements).forEach(([key, value]) => {
        let listItem = new CreateElement(value.type).appendTo(ol)
        let item = new CreateElement(value.link.type)
            .setAttributes({ href: value.link.href })
            .setText(value.link.text)
            .appendTo(listItem)

        if (value.class) item.classList.add(value.class)
        if (isActivePage(key)) item.classList.add(`active`)

        new CreateElement('img')
            .setAttributes(value.i)
            .appendTo(item)
    })
}

let addNavBtn = () => {

    let existing = document.querySelector('.nav-btn-add')
    if (existing) return existing

    let navList = document.querySelector('nav.bottom-nav ol');
    let navItems = navList.querySelectorAll('li');
    navBtn = document.createElement('li')
    let a = new CreateElement('a').setText('add').appendTo(navBtn)
    new CreateElement('img').setAttributes({ src: './assets/icons/plus.png' }).appendTo(a)
    navBtn.setAttribute('class', 'nav-btn-add')
    let middle = Math.floor(navItems.length / 2);
    navList.insertBefore(navBtn, navItems[middle]);

    return navBtn
}

let isActivePage = (pageName) => {
    return window.location.pathname.includes(`/${pageName}.html`)
}

function renderTopNav() {
    let nav = new CreateElement('nav').setAttributes({ class: 'top-nav', id: 'logged-top-nav' }).appendTo(document.body)

    let settings = new CreateElement('i').setAttributes({ class: `fa-solid fa-gear ${isActivePage('settings') ? 'active' : ''}`, alt: 'settings' }).appendTo(nav)
    let signOut = new CreateElement('i').setAttributes({ class: `fa-solid fa-right-from-bracket`, alt: 'sign out' }).appendTo(nav)

    settings.addEventListener('click', () => { window.location.href = './public/settings.html' })

    signOut.addEventListener('click', async () => {
        const { error } = await supabase.auth.signOut()
        console.error(error);
        window.location.href = 'index.html'
    })
}

let formatDateUnpadded = (dateString) => {
    const [year, month, day] = dateString.split('-');
    const unpaddedDay = parseInt(day, 10);
    const unpaddedMonth = parseInt(month, 10);

    return `${year}-${unpaddedMonth}-${unpaddedDay}`;
}

let editItemHandler = (clothingFormContainer, appendTo, element, fromChallenge) => {
    if (clothingFormContainer) {
        renderEditClothingItem(clothingFormContainer, appendTo, element, fromChallenge)
    }
}

let careMap = {
    'wash': './assets/careLabel/wash1.png',
    'wash at 30': './assets/careLabel/wash2.png',
    'wash at 40': './assets/careLabel/wash3.png',
    'wash at 50': './assets/careLabel/wash4.png',
    'wash at 60': './assets/careLabel/wash5.png',
    'hand wash': './assets/careLabel/wash6.png',
    'do not wash': './assets/careLabel/wash7.png',
    'bleach': './assets/careLabel/bleach1.png',
    'cl bleach': './assets/careLabel/bleach2.png',
    'ncl bleach': './assets/careLabel/bleach3.png',
    'do not bleach': './assets/careLabel/bleach4.png',
    'do not bleach': './assets/careLabel/bleach5.png',
    'tumble dry': './assets/careLabel/tumble1.png',
    'tumble dry low': './assets/careLabel/tumble2.png',
    'tumble dry normal': './assets/careLabel/tumble3.png',
    'do not tumble dry': './assets/careLabel/tumble4.png',
    'dry': './assets/careLabel/dry1.png',
    'line dry': './assets/careLabel/dry2.png',
    'dry flat': './assets/careLabel/dry3.png',
    'drip dry': './assets/careLabel/dry4.png',
    'dry in shade': './assets/careLabel/dry5.png',
    'line dry in the shade': './assets/careLabel/dry6.png',
    'dry flat in shade': './assets/careLabel/dry7.png',
    'drip dry in shade': './assets/careLabel/dry8.png',
    'iron': './assets/careLabel/iron1.png',
    'iron low': './assets/careLabel/iron2.png',
    'iron medium': './assets/careLabel/iron3.png',
    'iron high': './assets/careLabel/iron4.png',
    'do not iron': './assets/careLabel/iron5.png',
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
        let modal = new CreateElement('div').setAttributes({ class: 'modal', tabindex: -1, role: 'dialog', id: settings.modalId })
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
    let msg = new CreateElement('div').appendTo(div)
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

async function completeChallenge(points = false) {

    let challenge = JSON.parse(localStorage.getItem('challengeAction'))
    console.log(challenge);

    if (challenge && challenge.fromChallenge) {

        localStorage.setItem('challengeCompleted', JSON.stringify({
            challengeId: challenge.challengeId,
            dateInfo: challenge.dateInfo
        }))

        localStorage.removeItem('challengeAction')

        if (points) {
            await updatePoints(points, challenge.dateInfo)
            setTimeout(() => {
                window.location.href = './public/dashboard.html'
            }, 3000);
        } else {
            window.location.href = './public/dashboard.html'
        }
    }
}

let escapeHTML = (text) => {
    if (typeof text != 'string') return text

    let map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
        '/': '&#x2F;',
        '`': '&#x60;',
        '=': '&#x3D;'
    }

    return text.replace(/[&<>"'`=\/]/g, (char) => map[char])
}