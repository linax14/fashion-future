
function getTimePeriod() {
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

async function welcomeUser() {
}

async function getChallenges() {
    try {
        const { data, error } = await supabase.from('challenges').select()
        if (error) throw error
        return data

    } catch (error) { console.log(error) }
}

function mergeChallenges(existingChallenges, newChallenges) {
    const existingIds = new Set(existingChallenges.map(c => c.id))
    return [...existingChallenges, ...newChallenges.filter(c => !existingIds.has(c.id))]
}

async function getUserDetails() {
    let user = await getUser()

    const { data, error } = await supabase
        .from('user_details')
        .select()
        .eq('user_id', user.id)

    if (error) throw error

    if (data.length == 0) {
        await supabase
            .from('user_details')
            .insert({ user_id: user.id, challenges_progress: [] })
            .eq('user_id', user.id)
    }

    let existingChallenges = data.challenges_progress || []

    let newChallenges = await getChallenges()

    if (!newChallenges || newChallenges.length === 0) {
        console.warn("No new challenges found.")
        return
    }

    let updatedChallenges = mergeChallenges(existingChallenges, newChallenges)

    const { error: updateError } = await supabase
        .from('user_details')
        .update({ challenges_progress: updatedChallenges })
        .eq('user_id', user.id)

    if (updateError) {
        console.error("error updating:", updateError)
    }

    return data
}

async function displayChallenges(main) {
    let user = await getUser()
    let userDetails = await getUserDetails()

    let challengesProgress = userDetails[0].challenges_progress
    console.log(challengesProgress)

    let randomChallenges = challengesProgress
        .sort(() => Math.random() - 0.5)
        .slice(0, 5)

    let challengesContainer = new CreateElement('div')
        .setAttributes({ class: 'challenges' })
        .appendTo(main)

    new CreateElement('h2')
        .setAttributes({ class: 'header' })
        .setText('challenges')
        .appendTo(challengesContainer)


    Object.entries(randomChallenges).forEach(([key, value]) => {

        let elements = new CreateElement('div').setAttributes({ class: 'elements' }).appendTo(challengesContainer)

        let checkbox = new CreateElement('input')
            .setAttributes({ type: 'checkbox', id: value.id })
            .addEventListener('change', async (event) => {
                event.preventDefault()

                if (checkbox.checked) {
                    count += 1
                    console.log(count)

                } else {
                    count -= 1
                }

                const { data, error } = await supabase
                    .from('user_details')
                    .select()
                    .eq('user_id', user.id)

                if (error) throw error
                console.log(data)

                let challengesProgress = data[0].challenges_progress

                let challengeToUpdate = challengesProgress.find(item => item.id == checkbox.id)
                console.log(challengeToUpdate)

                if (challengeToUpdate) {
                    challengeToUpdate.complete_count = count
                }

                await supabase
                    .from('user_details')
                    .update({ user_id: user.id, challenges_progress: challengesProgress })
                    .eq('user_id', user.id)

                console.log(data)

            })
            .appendTo(elements)


        new CreateElement('h3').setText(value.title).appendTo(elements)
        new CreateElement('p').setText(value.details).appendTo(elements)

        checkbox.checked = value.complete_count > 0
        let count = value.complete_count || 0
    })
}

async function renderDashboard() {
    let user = await getUser()

    let main = new CreateElement('div').appendTo(document.body)
    let time = getTimePeriod()

    let header = new CreateElement('div').appendTo(main)
    let welcomeMsg = new CreateElement('h1').setText(`Good ${time} ${user.user_metadata.first_name}`).appendTo(header)

    displayChallenges(main)
}

renderDashboard()