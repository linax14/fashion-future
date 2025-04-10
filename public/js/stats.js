
async function renderStats() {
    displayInHome('stats')
    new CreateElement('h1').setText('sup').appendTo(statsContainer)

    let data = await getPointsData()
    console.log(data);

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
    let data = await points.detailedData()

    return data
}
