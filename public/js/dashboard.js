
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

async function renderDashboard(user) {

    let main = new CreateElement('div').appendTo(document.body)
    let time = getTimePeriod()

    let header = new CreateElement('div').appendTo(main)
    let welcomeMsg = new CreateElement('h1').setText(`Good ${time} ${user.user_metadata.first_name}`).appendTo(header)

    getDailyChallenges(main)
}
