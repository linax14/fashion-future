const supabase = window.supabase.createClient('https://idtiohrkbkotgjsbgcij.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkdGlvaHJrYmtvdGdqc2JnY2lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYyODQ2OTQsImV4cCI6MjA2MTg2MDY5NH0.YCpQhh9Hj1WVtGRXy8sAeFnGk7Bq9NppKozyxv-abTg')
window.user = null;

renderNavigation()
renderTopNav()

window.onload = async (event) => {
    let theme = localStorage.getItem('theme')
    theme ? document.documentElement.setAttribute('data-bs-theme', theme) : document.documentElement.setAttribute('data-bs-theme', 'light')
}

(async function () {
    window.user = await getUser()
    await initializeUserCalendar(user)
    let theme = window.user.user_metadata.theme
    localStorage.setItem('theme', theme)
    theme ? document.documentElement.setAttribute('data-bs-theme', theme) : document.documentElement.setAttribute('data-bs-theme', 'dark')
    document.dispatchEvent(new Event("userInitialized"));
})();

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

let mergeData = (existingData, newData) => {
    const existingIds = new Set(existingData.map(c => c.id))
    return [...existingData, ...newData.filter(c => !existingIds.has(c.id))]
}

let initializeUserDetails = async (fromTable, initializeColumn) => {

    let { data } = await supabase.from(fromTable).select()
    let userData = await selectUserTable(window.user, 'user_details')
    if (!userData || userData.length <= 0) await supabase.from('user_details').insert({ user_id: user.id })

    let currentData = userData[0]?.[initializeColumn] || []
    let newData = data
    let updatedData = mergeData(currentData, newData)

    await updateUserTable(window.user, 'user_details', { [initializeColumn]: updatedData })
    data = await selectUserTable(window.user, 'user_details')
    return data
}

async function initializeUserCalendar(user) {
    let data = await selectUserTable(window.user, 'user_calendar')

    if (data.length == 0) {
        await supabase.from('user_calendar').insert({ user_id: user.id })
        data = await selectUserTable(window.user, 'user_calendar')
    }

    data = data[0]
    if (!data.year) await updateUserTable(window.user, 'user_calendar', { 'year': year });

    let calendar = {}
    months.forEach((month, index) => {
        let daysInMonth = new Date(year, index + 1, 0).getDate()
        calendar[month] = {};

        for (let day = 1; day <= daysInMonth; day++) {
            calendar[month][day] = { challenges: [], quiz: [], streak: 0, points: {} };
        }
    })

    if (!data.calendar) {
        await updateUserTable(window.user, 'user_calendar', { 'calendar': calendar })
        data = await selectUserTable(window.user, 'user_calendar')
    }

    return data
}

class ClothingManager {
    constructor(user) {
        this.user = user
    }

    async generateId(tableName) {
        try {
            const { data, error } = await supabase
                .from(tableName)
                .insert({ 'user_id': user.id })
                .eq('user_id', this.user.id)
                .select()

            if (error) throw error

            let outfitId = data[0].id
            return outfitId
        } catch (error) {
            console.error(error);
        }
    }

    async update(tableName, outfitId, updates) {

        const { data, error } = await supabase
            .from(tableName)
            .update(updates)
            .eq('id', outfitId)
            .select()

        if (error) throw error
        return data
    }

    async getItems(tableName, outfitIds) {
        if (tableName == 'outfit' || tableName == 'outfit_items') {
            tableName = 'outfit_items'
            try {
                const { data, error } = await supabase
                    .from(tableName)
                    .select('outfit_id, clothing_item_id')
                    .in('outfit_id', outfitIds);

                if (error) throw error;

                let group = {};

                data.forEach(item => {
                    if (!group[item.outfit_id]) {
                        group[item.outfit_id] = [];
                    }
                    group[item.outfit_id].push(item.clothing_item_id);
                });

                return group;
            } catch (error) {
                console.error(error);
            }
        } else if (tableName == 'care_event' || tableName == 'care_items') {
            tableName = 'care_items'
            try {
                const { data, error } = await supabase
                    .from(tableName)
                    .select('outfit_id, clothing_item_id')
                    .in('outfit_id', outfitIds);

                if (error) throw error;

                let group = {};

                data.forEach(item => {
                    if (!group[item.outfit_id]) {
                        group[item.outfit_id] = [];
                    }
                    group[item.outfit_id].push(item.clothing_item_id);
                });

                return group;
            } catch (error) {
                console.error(error);
            }
        }
    }

    async deleteRecord(tableName, outfitId) {
        try {
            let { error } = await supabase.from(tableName).delete().eq('id', outfitId);
            if (error) return console.error("Error fetching existing items:", error);
        } catch (error) {
            console.error(error);
        }
    }

    async getData(tableName, outfitId = null) {
        const outfits = await selectUserTable(this.user, tableName)
        const outfitIds = outfits.map(outfit => outfit.id)
        const outfitItems = await this.getItems(tableName, outfitIds)
        const clothingItemIds = [].concat(...Object.values(outfitItems))
        const clothingItems = await selectUserTable(this.user, 'clothing_items', clothingItemIds)

        let details = outfits.filter(outfit => outfit.id == outfitId)
            .map(({ date, user_id, id, ...rest }) => rest)

        let outfitDetails = outfits.map(outfit => {
            const outfitItemIds = outfitItems[outfit.id] || [];

            const itemsForOutfit = clothingItems.filter(item => outfitItemIds.includes(item.id));

            if (tableName != 'care_event') {
                return {
                    outfitId: outfit.id,
                    wornDates: outfit.wear_dates,
                    clothingItems: itemsForOutfit,
                    worn: outfit.worn
                };
            } else {
                return {
                    outfitId: outfit.id,
                    wornDates: outfit.date,
                    clothingItems: itemsForOutfit,
                    care_details: details[0]
                }
            }

        });

        return outfitId === null
            ? outfitDetails
            : outfitDetails.filter(outfit => outfit.outfitId == outfitId);
    }
}

class ClothingItems extends ClothingManager {
    constructor(user) {
        super(user)
    }

    async addItems(tableName, outfitId, clothingIds) {

        if (clothingIds && !Array.isArray(clothingIds)) clothingIds = [clothingIds];
        if (!clothingIds || clothingIds.length == 0) throw new Error("At least one clothing item is required to create an outfit.");

        try {
            const { data, error } = await supabase
                .from(tableName)
                .insert(
                    clothingIds.map(clothingId => ({
                        'outfit_id': outfitId,
                        'clothing_item_id': clothingId,
                        'user_id': this.user.id
                    }))
                )
                .eq('user_id', this.user.id)
                .select()

            if (error) throw error

            return data

        } catch (error) {
            console.error(error);
        }
    }

    async removeItems(tableName, outfitId, itemsToRemove) {
        try {
            const { data, error } = await supabase.from(tableName)
                .delete().eq('outfit_id', outfitId)
                .in('clothing_item_id', itemsToRemove);
            if (error) console.error("error removing items:", error);
        } catch (error) {
            console.error(error);
        }
    }

    async getData(tableName, clothingIds) {

        if (clothingIds && !Array.isArray(clothingIds)) clothingIds = [clothingIds];
        if (!clothingIds || clothingIds.length == 0) throw new Error("At least one clothing item is required to create an outfit.");

        try {
            const { data, error } = await supabase
                .from(tableName)
                .select()
                .in('id', clothingIds)
                .eq('user_id', this.user.id)

            if (error) throw error

            return data

        } catch (error) {
            console.error(error);
        }
    }

}

async function getImage(element, appendTo, callback, className = '') {
    try {
        const { data: signedUrlData, error: urlError } = await supabase.storage
            .from('fashion-future')
            .createSignedUrl(`${element.user_id}/${element.image}`, 60);

        if (urlError) throw urlError;
        if (signedUrlData.signedUrl) {
            if (typeof callback === 'function') {
                callback(signedUrlData, appendTo, className)
            } else { return signedUrlData }
        }

        // new CreateElement('img')
        //     .setAttributes({
        //         class: 'wardrobe image fallback', src: '../assets/createOutfit.png',
        //         alt: `Fallback image representing a variety of clothing items when no specific image is available`
        //     })
        //     .appendTo(appendTo)

    } catch (urlError) {
        console.error(`Error fetching image URL: ${urlError}`);
        new CreateElement('img')
            .setAttributes({
                class: 'wardrobe image fallback', src: './assets/createOutfit.png',
                alt: `Fallback image representing a variety of clothing items when no specific image is available`
            })
            .appendTo(appendTo)
    }
}

let getUserData = async (dateInfo, progressType) => {

    let [userDetailsData, calendarData] = await Promise.all([
        selectUserTable(window.user, 'user_details'),
        selectUserTable(window.user, 'user_calendar')
    ])

    let progress = {}
    let challengesToday = []

    let updateChallengesProgress
    if (userDetailsData[0].challenges_progress) {
        updateChallengesProgress = userDetailsData[0].challenges_progress
    } else {
        updateChallengesProgress = {}
    }

    let updateQuestionsProgress
    if (userDetailsData[0].questions_progress) {
        updateQuestionsProgress = userDetailsData[0].questions_progress
    }

    Object.values(updateChallengesProgress).forEach(value => {
        value.complete_count ??= 0;
    })

    Object.values(updateQuestionsProgress).forEach(value => {
        value.correctAnswers ??= 0;
        value.attempts ??= 0;
    })
    switch (progressType) {
        case 'challenges':
            progress.challengesProgress = updateChallengesProgress

            let [year, month, day] = dateInfo.split('-');
            let currentMonth = months[month - 1].toLowerCase();
            challengesToday = calendarData[0].calendar[currentMonth]?.[day]?.challenges || [];
            break;

        case 'questions':
            progress.questionsProgress = updateQuestionsProgress
            break;

        default:
            break;
    }

    return progressType == 'questions'
        ? { progress }
        : { progress, challengesToday, calendarData }
}

async function updatePoints(types = [], dataDate) {
    let calendarData = await selectUserTable(window.user, 'user_calendar')
    let data = await calendarDataTarget(dataDate, 'day')
    let target = data.target
    let calendar = data.calendar

    if (target) {

        if (!target.points) target.points = {}
        let tags = { 'style': 0, 'discipline': 0, 'curiosity': 0, 'knowledge': 0, 'mastery': 0 }

        for (let key in tags) {
            if (!(key in target.points)) {
                target.points[key] = tags[key]
            }
        }

        for (let type of types) {
            if (isNaN(target.points[type])) target.points[type] = 0;
            target.points[type] += 1
        }

        let formatted = formatWithAnd(types)
        await renderPoints(formatted)
        await updateUserTable(window.user, 'user_calendar', { calendar: calendar })
    }

    return { calendarData, target }
}

function formatWithAnd(arr) {
    if (arr.length == 1) return arr[0];
    if (arr.length == 2) return `${arr[0]} and ${arr[1]}`;
    return `${arr.slice(0, -1).join(', ')}, and ${arr[arr.length - 1]}`;
}

function renderPoints(text) {
    let div = new CreateElement('div').setAttributes({ class: 'modal', id: 'points-modal', style: 'z-index:2' }).appendTo(document.body)
    let body = new CreateElement('div').setAttributes({ class: 'body-block', style: 'z-index:1' }).appendTo(document.body)

    new CreateElement('img').setAttributes({ src: 'https://img.icons8.com/ios/50/leaf--v1.png', class: 'invert-image' }).appendTo(div)
    new CreateElement('h4').setText('Congratulations').appendTo(div)
    let p = new CreateElement('p').appendTo(div)
    p.innerHTML = `You earned ${text} points`

    setTimeout(() => {

        div.classList.add('fade-out')
        body.classList.add('fade-out')

        setTimeout(() => {
            div.remove()
            body.remove()
        }, 1000);
    }, 4000);

    return div
}

let calendarDataTarget = async (dataDate, type) => {
    //type = 'month'/'day'
    let calendarData = await selectUserTable(window.user, 'user_calendar')
    let target

    for (const element of calendarData) {

        const [year, month, day] = dataDate.split('-')
        const currentMonth = months[month - 1].toLowerCase()

        if (element.year == year) {
            let targetMonth = element.calendar[currentMonth]
            if (targetMonth) {
                if (type == 'day') {
                    target = targetMonth[day]
                    return { calendar: element.calendar, target }
                } else if (type == 'month') {
                    return { calendar: element.calendar, targetMonth }
                }
            }
        }
    }
    return { calendarData, target }
}

