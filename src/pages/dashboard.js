document.addEventListener("userInitialized", async () => {
    await renderDashboard(window.user)
    clothingManager = new ClothingManager(window.user)
})

let displayInDashboard = async (type) => {
    let streakContainer = document.querySelector('#outfit-streak')
    let sustainabilityTips = document.querySelector('#sustainability-tips-container')
    let challengeContainer = document.querySelector('#challenge-container')
    let quizContainer = document.querySelector('#quiz-container')
    let personality = document.querySelector('.chart-container')
    let locked = document.querySelectorAll('.locked-state.dashboard-card')
    let points = document.querySelector('#points-container')
    let greeting = document.querySelector('#dashboard-greeting')

    let header = document.querySelector('.header')
    let sideNav = document.querySelector('.top-nav')

    switch (type) {
        case 'quiz':
            if (streakContainer) setDisplay([streakContainer], 'none')
            if (sustainabilityTips) setDisplay([sustainabilityTips], 'none')
            if (challengeContainer) setDisplay([challengeContainer], 'none')
            if (personality) setDisplay([personality], 'none')
            if (locked) locked.forEach(el => setDisplay([el], 'none'))
            if (points) setDisplay([points], 'none')
            if (greeting) setDisplay([greeting], 'none')

            quizContainer.style.gridColumn = 'span 12'
            setDisplay([quizContainer], 'flex')
            break;

        case 'settings':
            setDisplay([document.querySelector('.dashboard')], 'none')
            sideNav.classList.remove('expanded')
            window.location.href = './public/settings.html'
            break

        default:

            if (streakContainer) setDisplay([streakContainer], 'flex')
            if (sustainabilityTips) setDisplay([sustainabilityTips], 'flex')

            if (quizContainer) {
                setDisplay([quizContainer], 'block')
                quizContainer.style.gridColumn = 'span 4'
            }
            if (challengeContainer) setDisplay([challengeContainer], 'flex')
            if (locked) locked.forEach(el => setDisplay([el], 'flex'))
            if (personality) setDisplay([personality], 'grid')
            if (header) setDisplay([header], 'flex')
            if (points) setDisplay([points], 'flex')
            if (greeting) setDisplay([greeting], 'block')

            break;
    }
}

async function renderDashboard(user) {
    let main = new CreateElement('div').setAttributes({ class: 'dashboard' }).appendTo(document.body)
    new CreateElement('h1').setAttributes({ id: 'dashboard-greeting' }).setText(`Good ${getTimePeriod()}, ${window.user.user_metadata.first_name} `).appendTo(main)

    //from global.js
    let day = date.getDate()
    let today = `${year}-${month + 1}-${day}`

    localStorageReset(today)

    await getQuiz(window.user, today, main)
    await renderOutfitStreak(today, main)
    await dailyTips(window.user, today, main)
    await dailyChallenge(window.user, today, main)
    await revealPersonality(main)

    await displayInDashboard()
}

let localStorageReset = (today) => {
    let lastDay = localStorage.getItem('lastDay')

    if (lastDay != today) {
        localStorage.removeItem('challengeCompleted')
        localStorage.removeItem('fromChallenge')
    }

    localStorage.setItem('lastDay', today)
}

async function renderOutfitStreak(createOutfitDate, appendTo) {
    let data = await calendarDataTarget(createOutfitDate, 'day')
    let div = new CreateElement('div').setAttributes({ class: 'dashboard-card', id: 'outfit-streak' }).appendTo(appendTo)

    if (data.target.streak == 0) {
        new CreateElement('span').setAttributes({ class: 'main' }).setText(`Log a fit`).appendTo(div)
        new CreateElement('span').setAttributes({ class: 'details' }).setText('Start your streak').appendTo(div)
    } else {
        new CreateElement('span').setAttributes({ class: 'main' }).setText(`${data.target.streak} Day`).appendTo(div)
        new CreateElement('span').setAttributes({ class: 'details' }).setText('outfit streak').appendTo(div)
    }

    return div
}

async function dailyTips(user, dateInfo, appendTo) {

    let calendarData = await selectUserTable(window.user, 'user_calendar')
    let [year, month, day] = dateInfo.split('-')
    let currentMonth = months[month - 1].toLowerCase()

    let { data, error } = await supabase.from('tips').select()
    if (error) { console.error(error) }

    let shownTips = new Set()
    let availableTips = data.filter(tip => !shownTips.has(tip.id))
    let usableTips = availableTips.length > 0 ? availableTips : data

    for (const element of calendarData) {
        if (element.year == year) {

            for (let [months, days] of Object.entries(element.calendar)) {
                for (let [daysNum, dayData] of Object.entries(days)) {
                    if (dayData?.tip?.id) { shownTips.add(dayData?.tip?.id) }
                }

            }
        }
    }

    for (const element of calendarData) {
        if (element.year == year) {
            let targetMonth = element.calendar[currentMonth]

            if (targetMonth) {
                let target = targetMonth[day]
                if (!target.tip) {

                    let getRandom = usableTips[Math.floor(Math.random() * usableTips.length)]
                    target.tip = getRandom
                    await updateUserTable(window.user, 'user_calendar', { calendar: element.calendar });

                }

                displayDailyTip(appendTo, target)
            }
        }
    }
}


let displayDailyTip = (appendTo, target) => {
    let div = new CreateElement('div').setAttributes({ class: 'dashboard-card', id: 'sustainability-tips-container' }).appendTo(appendTo)
    let icons = new CreateElement('div').setAttributes({ class: 'icons' }).appendTo(div)

    for (let i = 0; i < 3; i++) {
        new CreateElement('i').setAttributes({ class: 'fa-solid fa-lightbulb' }).appendTo(icons)
    }

    let h = new CreateElement('span').setText('Daily Tip').setAttributes({ class: 'main-header' }).appendTo(div)
    setDisplay([h], 'flex')

    let main = new CreateElement('span').setText(target.tip.main).setAttributes({ class: 'main' }).appendTo(div)
    let details = new CreateElement('span').setText(target.tip.details).setAttributes({ class: 'details' }).appendTo(div)

    setDisplay([main, details], 'none')

    div.addEventListener('click', () => {
        let isVisible = main.style.display == 'flex'
        setDisplay([h], isVisible ? 'block' : 'none')
        setDisplay([main, details], isVisible ? 'none' : 'flex')

        if (isVisible) {
            main.style.alignSelf = 'center'
            div.style.gridColumn = 'span 4'
            div.style.alignItems = 'center'

            document.querySelector('#outfit-streak').style.gridColumn = 'span 4'
            document.querySelector('#outfit-streak').style.gridColumn = 'span 4'
            document.querySelector('#quiz-container').style.gridColumn = 'span 4'

            icons.style.display = 'flex'

        } else {
            main.style.alignSelf = 'start'
            div.style.gridColumn = 'span 12'
            div.style.alignItems = 'self-start'

            document.querySelector('#outfit-streak').style.gridColumn = 'span 8'
            document.querySelector('#quiz-container').style.gridColumn = 'span 4'

            icons.style.display = 'none'
        }
    })
}

async function dailyChallenge(user, dateInfo, appendTo) {

    let calendarData = await selectUserTable(window.user, 'user_calendar')
    let [year, month, day] = dateInfo.split('-')
    let currentMonth = months[month - 1].toLowerCase()

    let challenges = new Set()

    let data = await clothingManager.getData('outfit')
    if (!data || data.length < 5) {
        let min = 5 - data.length
        let locked = lockedState(appendTo,
            `<span class='main'>challenge time</span>
            <span class='details'>${min} more ${min == 1 ? 'outfit' : 'outfits'} to unlock challenges </span>
             <a href='./public/planner.html' class='locked-link'>
            Log a fit<a/>`)

        locked.classList.add('dashboard-card')
        return
    }

    for (const element of calendarData) {
        if (element.year == year) {

            for (let [months, days] of Object.entries(element.calendar)) {
                for (let [daysNum, dayData] of Object.entries(days)) {
                    if (dayData?.challenge?.id) { challenges.add(dayData?.challenge?.id) }
                }
            }
        }
    }

    for (const element of calendarData) {
        if (element.year == year) {
            let targetMonth = element.calendar[currentMonth]

            let target
            if (targetMonth) {
                target = targetMonth[day]
                if (!target.challenge) {

                    let data = await allChallenges()

                    if (data && data.challenge) {
                        target.challenge = data.challenge
                        localStorage.setItem('filteredData', JSON.stringify(data.filteredClothingData))
                    }

                    if (data && data.challengeData) {
                        localStorage.setItem('challengeData', JSON.stringify(data.challengeData))
                    }
                    await updateUserTable(window.user, 'user_calendar', { calendar: element.calendar });
                }
                renderChallenge(target, dateInfo, appendTo)
                await challengeCompleted(target, element)
            }
        }
    }
}

async function challengeCompleted(target, element) {
    let challengeElement = document.querySelector('#challenge-container')

    let renderChallengeCompleted = () => {
        let heading = challengeElement.querySelector('span.icon')
        if (heading) {
            heading.textContent += '✔'
        }
    }

    let completedChallenge = localStorage.getItem('challengeCompleted')
    if (completedChallenge) {
        let { challengeId, dateInfo } = JSON.parse(completedChallenge)

        if (challengeElement.dataset.challengeId == challengeId) {
            renderChallengeCompleted()
            target.challenge.complete = true
            await updateUserTable(window.user, 'user_calendar', { calendar: element.calendar })
        };
    }
}

function renderChallenge(target, dateInfo, appendTo) {
    let div = new CreateElement('div').setAttributes({ id: 'challenge-container', class: 'dashboard-card', 'data-challenge-id': target.challenge.id }).appendTo(appendTo)
    let isComplete = target.challenge.complete

    let title = new CreateElement('span').setAttributes({ class: 'main' }).appendTo(div)
    title.innerText = `${capitalise(target.challenge.title)}`

    let span = new CreateElement('span').setAttributes({ class: 'icon' }).appendTo(title)
    new CreateElement('img').setAttributes({ src: 'https://img.icons8.com/ios/50/nui2.png', alt: 'click to complete challenge', class: 'icon' }).appendTo(span)
    new CreateElement('p').setText(capitalise(target.challenge.details)).appendTo(div)

    if (isComplete) {
        div.removeEventListener('click', async () => completeChallengeEvent(target, dateInfo))
    } else {
        div.addEventListener('click', async () => completeChallengeEvent(target, dateInfo))
    }

    return div
}
async function completeChallengeEvent(target, dateInfo) {
    let clothingData = await selectUserTable(window.user, 'clothing_items')
    localStorage.setItem('fromChallenge', true)

    if (target.challenge.event_type) {
        let event = target.challenge.target
        let eventType = target.challenge.event_type

        switch (event) {
            case 'outfit':
                switch (eventType) {
                    case 'new_outfit':

                        localStorage.setItem('challengeAction', JSON.stringify({
                            action: 'addOutfit',
                            dateInfo: dateInfo,
                            fromChallenge: true,
                            challengeId: target.challenge.id,
                        }))
                        window.location.href = './public/planner.html'

                        break

                    default:
                        break
                }
                break
            case 'clothing_items':
                if (eventType == 'add_care') {
                    localStorage.setItem('challengeAction', JSON.stringify({
                        action: 'addCare',
                        dateInfo: dateInfo,
                        fromChallenge: true,
                        challengeId: target.challenge.id,
                    }))
                    window.location.href = './public/wardrobe.html'
                }
                break
            default:
                break
        }
    }
}

async function prepareClothingChallengeData(clothingAttribute, appendTo) {
    let data = await selectUserTable(window.user, 'clothing_items')

    let clothingAttributeMap = {}
    let itemMap = {}

    for (let item of data) {

        let wear_count = item.wear_count || 0
        if (!item[clothingAttribute]) continue

        let values = typeof item[clothingAttribute] == 'string'
            ? item[clothingAttribute].split(',').map(v => v.trim().toLowerCase())
            : [String(item[clothingAttribute]).toLowerCase()]

        for (let value of values) {
            clothingAttributeMap[value] = (clothingAttributeMap[value] || 0) + wear_count

            if (!itemMap[value]) itemMap[value] = []
            itemMap[value].push(item)
        }
    }

    let minWear = Math.min(...Object.values(clothingAttributeMap))
    let leastWorn = Object.entries(clothingAttributeMap)
        .filter(([value, totalWear]) => totalWear == minWear)
        .map(([value]) => value)

    let selectedItems = []

    for (let item of leastWorn) {
        for (let clothingItems of itemMap[item]) {
            if (!selectedItems.some(existing => existing.id == clothingItems.id)) {
                selectedItems.push(...itemMap[item])
            }
        }
    }

    return { leastWorn, selectedItems }
}

async function generateClothingChallenge(clothingAttribute) {
    let data = await prepareClothingChallengeData(clothingAttribute)

    if (data.leastWorn.length <= 0 || data.selectedItems.length <= 0) return false

    let challenge = {}
    let challengeId = `auto-generated`

    let challengeData = {
        leastWorn: `${(data.leastWorn[0])}`,
        clothingAttribute: clothingAttribute
    }

    switch (clothingAttribute) {
        case 'colour':
            challenge = {
                "id": `${challengeId}`,
                "title": `${challengeData.leastWorn} Revival`,
                "details": `${challengeData.leastWorn} is your least worn ${clothingAttribute}. Create a new outfit that incorporates at least 1 ${challengeData.leastWorn} item.`,
                "target": "outfit",
                "event_type": "new_outfit",
                "filtered_data": true
            }
            break;
        case 'season':
            challenge = {
                id: `${challengeId}`,
                title: `Seasonal Switch-Up: ${challengeData.leastWorn}`,
                details: `You haven't worn many items for ${challengeData.leastWorn} lately. Style an outfit perfect for the ${challengeData.leastWorn} season.`,
                target: "outfit",
                event_type: "new_outfit",
                filtered_data: true
            }
            break;
        case 'occasion':
            challenge = {
                id: `${challengeId}`,
                title: `Time for ${challengeData.leastWorn}`,
                details: `Your ${challengeData.leastWorn} items deserve the spotlight. Put together a look suited for a ${challengeData.leastWorn} occasion.`,
                target: "outfit",
                event_type: "new_outfit",
                filtered_data: true
            }
            break
        case 'category':
            challenge = {
                id: `${challengeId}`,
                title: `Wear More ${capitalise(challengeData.leastWorn)}`,
                details: `${capitalise(challengeData.leastWorn)} are the least worn in your wardrobe. Create an outfit that includes one of them.`,
                target: "outfit",
                event_type: "new_outfit",
                filtered_data: true
            }
            break;
        case 'origin':
            challenge = {
                id: `${challengeId}`,
                title: `Origin Story: ${challengeData.leastWorn}`,
                details: `You've barely worn clothing from ${challengeData.leastWorn}. Style an outfit that highlights at least one item from this origin.`,
                target: "outfit",
                event_type: "new_outfit",
                filtered_data: true
            }

            break;
        default:
            break;
    }

    if (Object.keys(challenge).length == 0) return false

    return { challenge, filteredClothingData: data.selectedItems, challengeData }
}

async function generateCareChallenge() {
    let data = await selectUserTable(window.user, 'clothing_items')
    let careAttributes = ['bleach', 'iron', 'natural_dry', 'tumble_dry', 'wash']

    let selectedItems = []

    for (let item of Object.values(data)) {

        let instructions = item.care_instructions
        let isValid

        if (!instructions || typeof instructions != 'object') isValid = false
        else {
            for (let attr of careAttributes) {
                let value = instructions[attr]
                if (value == '' || value == undefined || value == null) {
                    isValid = false
                    break
                }
            }
        }

        if (!isValid) selectedItems.push(item)
    }

    let challengeId = `auto-generated`
    let challenge = {
        id: `${challengeId}`,
        title: `Give your clothes some love`,
        details: `Some of your clothing items are missing care details! Help them last longer by filling in their care instructions. A little TLC goes a long way.`,
        target: "clothing_items",
        event_type: "add_care",
        filtered_data: true
    }
    return { challenge, filteredClothingData: selectedItems }
}

async function allChallenges() {
    let clothingAttributes = ['colour', 'season', 'occasion', 'category', 'origin']
    let allChallenges = []

    for (let attribute of clothingAttributes) {
        let data = await generateClothingChallenge(attribute)
        if (data?.challenge) { allChallenges.push(data) }
    }

    let careInfo = await generateCareChallenge()
    if (careInfo?.challenge) { allChallenges.push(careInfo) }

    let randomChallenge = allChallenges[Math.floor(Math.random() * allChallenges.length)]

    return randomChallenge
}

let totalYearPoints = async (year) => {
    let calendarData = await selectUserTable(window.user, 'user_calendar')
    calendarData = calendarData.find(item => item.year == year)?.calendar

    let total = 0

    for (let month in calendarData) {
        for (let day in calendarData[month]) {
            let dayPoints = calendarData[month][day].points || {}

            if (Object.keys(dayPoints).length == 0) {
                total += 0
            } else {
                for (let type in dayPoints) {
                    let val = Number(dayPoints[type]) || 0
                    if (!isNaN(val)) total += dayPoints[type]
                }
            }
        }
    }

    return total
}

class Points {
    constructor(user, date) {
        this.user = user
        this.date = date
        this.currentMonth = months[month].toLowerCase()
    }

    async getData() {
        this.calendarData = await selectUserTable(this.user, 'user_calendar')
        this.data = await calendarDataTarget(this.date, 'month')
    }

    async perCategory() {
        if (!this.data) await this.getData();

        let totalPoints = {}
        let targetMonth = this.data.targetMonth

        if (targetMonth) {

            for (const key in targetMonth) {
                let value = targetMonth[key]
                for (let tag in value.points) {
                    let point = value.points[tag]
                    if (!totalPoints[tag]) totalPoints[tag] = 0
                    totalPoints[tag] += point
                }
            }
        }
        return totalPoints
    }

    async total() {
        let points = await this.perCategory();
        return Object.values(points).reduce((acc, val) => acc + val, 0);
    }

    async percentages() {
        let perTag = await this.perCategory()
        let total = Object.values(perTag).reduce((acc, val) => acc + val, 0);
        let percentages = {}

        for (const [tag, value] of Object.entries(perTag)) {
            percentages[tag] = total ? Math.round((value / total) * 100) : 0;
        }

        return percentages
    }

    async detailedData() {
        let data = {
            percategory: await this.perCategory(),
            sum: await this.total(),
            percentages: await this.percentages()
        }

        return data
    }
}

let getPointsData = async () => {
    let day = date.getDate()
    let today = `${year}-${month + 1}-${day}`
    let points = new Points(window.user, today)
    return await points.detailedData()
}

let personalities = {
    alchemist: {
        order: ['knowledge', 'mastery', 'discipline', 'curiosity', 'style'],
        tag: ['Precise', 'introspective', 'perfectionist'],
        description: `<span>Seeker of patterns and pursuer of precision.</span>
            <span>You engage deeply — completing quizzes and aiming for that 100%.</span>
            <span>This reflects your thoughtful,introspective style and drive to truly understand and master what interests you.</span>`,
        icon: 'fa-solid fa-flask'
    },
    nomad: {
        uniform: true,
        tag: ['Spontaneous', 'explorative', 'free-flowing'],
        description: `<span>A wanderer at heart.</span><span>You explore many things but rarely stick to just one.
            Your journey is spontaneous and open ended - it is marked by bursts of curiosity and experimentation.</span>
           <span>This openness and curiosity are part of what make your journey unique.</span>`,
        icon: 'fa-solid fa-mountain-sun'
    },
    curator: {
        order: ['style', 'mastery', 'knowledge', 'discipline', 'curiosity',],
        tag: ['Expressive', 'intentional', 'aesthetic'],
        description: `</span>A visual storyteller and expressive thinker.</span><span>You treat your wardrobe like an evolving gallery -
            logging outfits regularly and curating your look with care.</span><span>Style is more than appearance; it is your way of showing up with intention and flair.</span>`,
        icon: 'fa-solid fa-image'
    },
    strategist: {
        order: ['curiosity', 'knowledge', 'mastery', 'style', 'discipline',],
        tag: ['Focused', 'intentional', 'results-oriented'],
        description: `
            <span>You show up with a plan — completing challenges with purpose, valuing structure, 
            and blending discipline with curiosity.</span><span>Your process is intentional and your results speak for themselves.</span>`,
        icon: 'fa-solid fa-chess'
    }
}

async function revealPersonality(appendTo) {

    let data = await getPointsData()
    let total = await totalYearPoints(year)

    if (total < 10) {
        let locked = lockedState(appendTo,
            `<span class='main'>personality</span>
            <span class='details'>Reach 10 points to unlock!</span>
            <span>Current points: ${total}</span>`
        )

        locked.classList.add('dashboard-card')
        return
    }

    let userValues = Object.values(data.percentages)
    let order = Object.keys(data.percentages)
        .map((trait, i) => [trait, userValues[i]])
        .sort((a, b) => b[1] - a[1])
        .map(([trait]) => trait)

    let bestMatch = null
    let bestScore = -Infinity

    for (let [type, definition] of Object.entries(personalities)) {
        let score = 0

        if (definition.uniform) {
            let avg = userValues.reduce((a, b) => a + b, 0) / userValues.length
            let variance = userValues.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / userValues.length
            let stdDev = Math.sqrt(variance)
            if (stdDev < 5) {
                score = 100 - Math.min(stdDev * 2, 100)
            } else { score = 0 }

        } else if (definition.order) {

            for (let i = 0; i < definition.order.length; i++) {
                let trait = definition.order[i];
                let rank = order.indexOf(trait)
                if (rank != -1) {
                    score += (definition.order.length - Math.abs(i - rank))
                }
            }

            score = (score / (definition.order.length * definition.order.length)) * 100
        }

        if (score > bestScore) {
            bestScore = score
            bestMatch = type
        }
    }

    personalityChart(appendTo, data, { bestMatch, description: personalities[bestMatch].description, tag: personalities[bestMatch].tag })

    return bestMatch
}

function personalityChart(appendTo, data, personality) {
    let container = new CreateElement('div').setAttributes({ class: 'chart-container dashboard-card' }).appendTo(appendTo)
    new CreateElement('span').setAttributes({ class: 'main' }).setText(capitalise(personality.bestMatch)).appendTo(container)

    let span = new CreateElement('span').setText(`${(personality.tag).join(' • ')} `).appendTo(container)

    let description = new CreateElement('p').appendTo(container)

    let isVisible = false
    if (isVisible) setDisplay([description], 'none')

    let learn = new CreateElement('span').setAttributes({ id: 'learn-more' }).addEventListener('click', () => {
        isVisible = !isVisible
        if (isVisible) {
            setDisplay([description], 'flex')
            learn.innerText = 'Show less'
        } else {
            setDisplay([description], 'none')
            learn.innerText = 'Learn more'
        }

        description.innerHTML = `${personality.description}`

    }).setText(`Learn more`).appendTo(container)

    renderPointsContainer(appendTo, data)
}

function renderPointsContainer(appendTo, data) {
    let pointsContainer = new CreateElement('div').setAttributes({ class: 'chart-container dashboard-card', id: 'points-container' }).appendTo(appendTo)

    let icon = new CreateElement('i').setAttributes({ class: `fa-solid fa-seedling` }).appendTo(pointsContainer)
    let span = new CreateElement('span').setText(`${capitalise(months[month])} Scores`).setAttributes({ class: 'main' }).appendTo(pointsContainer)
    let viewPoints = new CreateElement('button').setAttributes({ class: 'btn' }).setText(`Reveal`).appendTo(span)

    let ctx = new CreateElement('canvas').setAttributes({ class: 'chart' }).appendTo(pointsContainer)
    ctx.style.display = 'none'

    viewPoints.addEventListener('click', () => {
        if (ctx.style.display == 'none') {
            pointsContainer.classList.add('points-column')
            ctx.style.display = 'block'
            setDisplay([icon], 'none')
            viewPoints.innerText = 'Show less'
        } else {
            pointsContainer.classList.remove('points-column')
            ctx.style.display = 'none'
            setDisplay([icon], 'flex')
            viewPoints.innerText = 'Reveal'
        }

    })
    ctx.classList.add('chart-canvas', 'bar')

    let dataColours = {
        'style': '#4caf50',
        'discipline': '#2196f3',
        'curiosity': '#ff9800',
        'knowledge': '#9c27b0',
        'mastery': '#ffc107',
    }

    let keys = Object.keys(data.percategory).map(key => key.toLowerCase())
    let options = Object.fromEntries(Object.entries(dataColours).map(([key, value]) => [key.toLowerCase(), value]))
    options = keys.map((key) => options[key])
    let backgroundColors = options.map(op => `rgba(${getRGB(op)},0.4)`)
    let borderColors = options.map(op => `rgb(${getRGB(op)})`)

    const config = {
        type: 'bar',
        data: {
            labels: Object.keys(data.percategory),
            datasets: [{
                data: Object.values(data.percategory),
                backgroundColor: backgroundColors,
                borderColor: borderColors,
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            plugins: {
                legend: {
                    display: false,
                },
                title: {
                    display: false,
                    text: `${capitalise('a')}`
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        stepSize: 5
                    }
                },
                y: {
                    grid: {
                        display: false
                    }, ticks: {
                        stepSize: 1
                    }
                }
            }
        },
    }

    new Chart(ctx, config)
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