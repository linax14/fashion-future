document.addEventListener("userInitialized", async () => {
    //console.log("user", window.user)
    render()
})

async function render() {
    displayInHome('stats')

    //points
    let data = await getPointsData()
    console.log(data);

    //stats
    //brand category colour season occasion origin
    let stats1 = new CreateElement('div').setAttributes({ class: 'stats-container' }).appendTo(statsSection)
    let stats2 = new CreateElement('div').setAttributes({ class: 'stats-container' }).appendTo(statsSection)

    createChart('doughnut', withWear = false, 'brand', undefined, stats1)
    createChart('bar', withWear = false, 'category', undefined, stats1)
    createChart('doughnut', withWear = false, 'season', seasonColours, stats1)
    createChart('doughnut', withWear = false, 'colour', clothingColours, stats1)
    createChart('bar', withWear = false, 'origin', undefined, stats1)
    createChart('doughnut', withWear = false, 'occasion', undefined, stats1)

    createChart('doughnut', withWear = true, 'brand', undefined, stats2)
    createChart('bar', withWear = true, 'category', undefined, stats2)
    createChart('doughnut', withWear = true, 'season', seasonColours, stats2)
    createChart('doughnut', withWear = true, 'colour', clothingColours, stats2)
    createChart('bar', withWear = true, 'origin', undefined, stats2)
    createChart('doughnut', withWear = true, 'occasion', undefined, stats2)

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

async function wardrobeItems(withWear = false) {
    let data = await selectUserTable(window.user, 'clothing_items')

    let obj = {}
    let multiValues = ['colour', 'season', 'occasion'];
    let wearCount

    for (const item of data) {

        if (withWear == true) {
            wearCount = item.wear_count ?? 0;
            if (wearCount == 0) continue;
        }

        for (let [key, value] of Object.entries(item)) {
            if (!value || key == 'id' || key == 'user_id' || key == 'image' || key == 'wear_count') continue;

            let values = multiValues.includes(key)
                ? value.split(',').map(v => v.trim().toLowerCase())
                : [value.toLowerCase()];

            obj[key] = obj[key] || {};

            if (withWear == true) {
                for (const val of values) {
                    obj[key][val] = (obj[key][val] || 0) + wearCount;
                }
            } else {
                for (const val of values) {
                    obj[key][val] = (obj[key][val] || 0) + 1;

                }
            }
        };
    }
    return obj
}

let clothingColours = {
    'red': '#e53935', 'pink': '#d81b60', 'purple': '#8e24aa', 'Deep Purple': '#5e35b1',
    'indigo': '#3949ab', 'blue': '#1e88e5', 'Light Blue': '#039be5', 'cyan': '#00acc1',
    'teal': '#00897b', 'green': '#43a047', 'Light Green': '#7cb342', 'lime': '#c0ca33',
    'yellow': '#fdd835', 'amber': '#fbb300', 'orange': '#fb8c00', 'Deep Orange': '#f4511e',
    'brown': '#6d4c41', 'Light Grey': '#757575', 'Blue Grey': '#546e7a',
    'Deep Grey': '#212121', 'black': '#000000', 'white': '#ffffff'
}

let seasonColours = {
    'spring': '#ffc2c3', 'summer': '#70e7ff', 'autumn': '#f5c25d', 'winter': '#536299'
}

let getRGB = (hex) => {
    hex = hex.replace('#', '')
    let r = parseInt(hex.slice(0, 2), 16);
    let g = parseInt(hex.slice(2, 4), 16);
    let b = parseInt(hex.slice(4, 6), 16);

    return `${r},${g},${b}`;
}

let randomPastelRGB = () => {
    let r = Math.floor((Math.random() * 100) + 100);
    let g = Math.floor((Math.random() * 100) + 100);
    let b = Math.floor((Math.random() * 100) + 100);

    return `${r},${g},${b}`;
};

async function createChart(chartType, withWear = false, clothingDataType, dataColours = undefined, appendTo) {
    let data = await wardrobeItems(withWear)
    data = data[clothingDataType]
    if (!data) {
        console.log('no data');
        return
    }
    
    data = Object.fromEntries([...Object.entries(data)].sort((a, b) => b[1] - a[1]).slice(0, 5))

    let labels = Object.keys(data).map(d => capitalise(d));
    let values = Object.values(data);

    let backgroundColors
    let borderColors

    if (!dataColours) {
        backgroundColors = values.map(() => `rgba(${randomPastelRGB()},0.4)`);
        borderColors = backgroundColors.map(c => c.replace('0.4', '1'))
    } else {
        let keys = Object.keys(data).map(key => key.toLowerCase())

        let options = Object.fromEntries(Object.entries(dataColours).map(([key, value]) =>
            [key.toLowerCase(), value]))

        options = keys.map((key) => options[key])
        backgroundColors = options.map(op => `rgba(${getRGB(op)},0.4)`)
        borderColors = options.map(op => `rgb(${getRGB(op)})`)
    }

    let container = new CreateElement('div').setAttributes({ class: 'chart-container', id: `${clothingDataType}-chart` }).appendTo(appendTo)
    let ctx = new CreateElement('canvas').appendTo(container)

    if (chartType == 'bar') {
        ctx.style.width = '60vw'
        ctx.style.height = '50vh !important'
    } else {
        ctx.style.width = '50vw'
        ctx.style.height = '50vh !important'
    }

    const config = {
        type: chartType,
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: backgroundColors,
                borderColor: borderColors, borderWidth: 1
            }]
        },
        options: {
            indexAxis: chartType == 'bar' ? 'y' : undefined,
            responsive: true,
            plugins: {
                legend: {
                    display: false,
                },
                title: {
                    display: true,
                    text: `${capitalise(clothingDataType)}`
                }
            },
            ...(chartType == 'bar' && {
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            stepSize: 1
                        }
                    },
                    y: {
                        grid: {
                            display: false
                        }
                    }
                }
            })
        },
    };
    new Chart(ctx, config)

    return data
}
