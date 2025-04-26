document.addEventListener("userInitialized", async () => {
    //console.log("user", window.user)
    render()
})

let mainHeader = new CreateElement('h2').setText('Your stats').appendTo(document.body)
let closetOverview = new CreateElement('section').setAttributes({ class: 'overview-section' }).appendTo(document.body)

async function render() {

    //points
    let data = await getPointsData()
    console.log(data);

    //stats
    //brand category colour season occasion origin
    let header1 = new CreateElement('h3').setText('General Wardrobe Stats').appendTo(closetOverview)
    let stats1 = new CreateElement('div').setAttributes({ class: 'stats-container' }).appendTo(closetOverview)
    let header2 = new CreateElement('h3').setText('Wear Stats').appendTo(closetOverview)
    let stats2 = new CreateElement('div').setAttributes({ class: 'stats-container' }).appendTo(closetOverview)

    await chartInfo('doughnut', withWear = false, 'brand', undefined, stats1)
    await chartInfo('bar', withWear = false, 'category', undefined, stats1)
    await chartInfo('doughnut', withWear = false, 'season', seasonColours, stats1)
    await chartInfo('doughnut', withWear = false, 'colour', clothingColours, stats1)
    await chartInfo('bar', withWear = false, 'origin', undefined, stats1)
    await chartInfo('doughnut', withWear = false, 'occasion', undefined, stats1)

    await chartInfo('doughnut', withWear = true, 'brand', undefined, stats2)
    await chartInfo('bar', withWear = true, 'category', undefined, stats2)
    await chartInfo('doughnut', withWear = true, 'season', seasonColours, stats2)
    await chartInfo('doughnut', withWear = true, 'colour', clothingColours, stats2)
    await chartInfo('bar', withWear = true, 'origin', undefined, stats2)
    await chartInfo('doughnut', withWear = true, 'occasion', undefined, stats2)
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
                : [value];

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

    let container = new CreateElement('div').setAttributes({ class: 'chart-container', id: `${clothingDataType}-chart`, 'data-wear': withWear, 'data-chart-type': chartType }).appendTo(appendTo)
    let ctx = new CreateElement('canvas').appendTo(container)

    ctx.classList.add('chart-canvas', chartType === 'bar' ? 'bar-chart' : 'doughnut-chart');

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
            indexAxis: chartType == 'bar' ? 'x' : undefined,
            responsive: true,
            plugins: {
                legend: {
                    display: false,
                },
                title: {
                    display: false,
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
                        }, ticks: {
                            stepSize: 1
                        }
                    }
                }
            })
        },
    };

    new Chart(ctx, config)
    let span = new CreateElement('span').appendTo(container)
    new CreateElement('i').setAttributes({ class: "fa-solid fa-rotate" }).appendTo(span)

    return data
}

async function chartInfo(chartType, withWear = false, clothingDataType, dataColours = undefined, appendTo) {
    let data = await createChart(chartType, withWear, clothingDataType, dataColours, appendTo)
    if (!data) return

    let chart = document.querySelector(`#${clothingDataType}-chart[data-wear="${withWear}"]`)
    chart.classList.remove('expanded');
    setDisplay([chart], 'none');

    let cardId = `${clothingDataType}-${withWear ? 'withWear' : 'noWear'}-card`;
    chart.setAttribute('data-card-id', cardId);
    let card = new CreateElement('div').setAttributes({ class: 'chart-card', id: cardId }).appendTo(appendTo)

    new CreateElement('h4').setText(clothingDataType).appendTo(card)
    let info = new CreateElement('p').setText().appendTo(card)
    let span = new CreateElement('span').appendTo(card)
    new CreateElement('i').setAttributes({ class: "fa-solid fa-rotate" }).appendTo(span)

    let canvas = chart.querySelector('canvas');
    canvas.addEventListener('click', (e) => e.stopPropagation());

    chart.addEventListener('click', () => {
        chart.classList.remove('expanded');
        setDisplay([chart], 'none');
        setDisplay([card], 'flex');
    });

    card.addEventListener('click', () => {
        document.querySelectorAll('.chart-container.expanded').forEach(openChart => {
            openChart.classList.remove('expanded');
            setDisplay([openChart], 'none');

            let cardId = openChart.getAttribute('data-card-id');
            let originalCard = document.getElementById(cardId);
            if (originalCard && originalCard != card) {
                setDisplay([originalCard], 'flex');
            }
        });

        chart.classList.add('expanded');
        setDisplay([chart], 'flex');
        setDisplay([card], 'none');

        chart.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    let count = [...Object.entries(data)]

    let mostWorn = count[0]
    let [topItem, topCount] = mostWorn
    topItem = capitalise(topItem)

    let dataKeys = formatWithAnd(Object.keys(data).map(key => capitalise(key)))

    function formatWithAnd(arr) {
        if (arr.length == 1) return arr[0];
        if (arr.length == 2) return `${arr[0]} and ${arr[1]}`;
        return `${arr.slice(0, -1).join(', ')}, and ${arr[arr.length - 1]}`;
    }

    switch (withWear) {
        case true:
            if (count.length > 1) {
                switch (clothingDataType) {
                    case 'category':
                        info.innerHTML = `Your most worn categories are ${dataKeys}`;
                        break;
                    case 'brand':
                        info.innerHTML = `You've been repping ${dataKeys} the most`;
                        break;
                    case 'colour':
                        info.innerHTML = `You've worn ${dataKeys} tones more than any others. You wore ${topItem} tones ${topCount} times — your fave shade?`;
                        break;
                    case 'season':
                        info.innerHTML = `You've been dressing mostly for ${dataKeys} weather. You have worn ${topItem} items ${topCount} times!`;
                        break;
                    case 'occasion':
                        info.innerHTML = `Your outfits are mostly worn for ${dataKeys}`;
                        break;
                    case 'origin':
                        info.innerHTML = `You've been favoring clothes from ${dataKeys}`;
                        break;
                    default:
                        info.innerHTML = `Your top ${count.length} most worn ${clothingDataType}s are ${dataKeys}`;
                }
            } else {
                switch (clothingDataType) {
                    case 'season':
                        info.innerHTML = `You've only worn clothes suited for ${dataKeys}. You have worn them ${topCount} times!`;
                        break;
                    case 'brand':
                        info.innerHTML = `You mostly wear ${dataKeys}`;
                        break;
                    default:
                        info.innerHTML = `Your most worn ${clothingDataType} is ${dataKeys}`;
                }
            }
            break;

        default:
            if (count.length > 1) {
                switch (clothingDataType) {
                    case 'category':
                        info.innerHTML = `Your closet includes a variety of categories: ${dataKeys}`;
                        break;
                    case 'brand':
                        info.innerHTML = `Your wardrobe spans ${dataKeys}`;
                        break;
                    case 'colour':
                        info.innerHTML = `Your clothes come in ${dataKeys} shades`;
                        break;
                    case 'season':
                        info.innerHTML = `Your wardrobe is ready for ${dataKeys} seasons`;
                        break;
                    case 'occasion':
                        info.innerHTML = `You're covered for all sorts of events: ${dataKeys}`;
                        break;
                    case 'origin':
                        info.innerHTML = `Your clothes come from ${dataKeys}`;
                        break;
                    default:
                        info.innerHTML = `Your top ${count.length} ${clothingDataType}s are ${dataKeys}`;
                }
            } else {
                switch (clothingDataType) {
                    case 'season':
                        info.innerHTML = `All your clothes are perfect for ${dataKeys}`;
                        break;
                    default:
                        info.innerHTML = `The only ${clothingDataType} in your closet is ${dataKeys}`;
                }
            }
            break;
    }

}
