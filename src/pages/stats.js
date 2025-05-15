document.addEventListener("userInitialized", async () => {

    await render()
})

let closetOverview = new CreateElement('section').setAttributes({ class: 'overview-section' }).appendTo(document.body)

async function render() {
    setupStats(false, 'General Wardrobe Stats', closetOverview)
    setupStats(true, 'Wear Stats', closetOverview)
}

async function setupStats(withWear, title, appendTo) {
    new CreateElement('h3').setText(title).appendTo(appendTo)
    let stats = new CreateElement('div').setAttributes({ class: 'stats-container' }).appendTo(appendTo)

    let wardrobe = await wardrobeItems(withWear)

    if ((withWear && wardrobe.totalWear < 20) || (!withWear && wardrobe.totalItems < 10)) {
        let remainingItems = withWear
            ? 20 - wardrobe.totalWear
            : 10 - wardrobe.totalItems

        let msg
        if (withWear) {
            msg = `
            Almost there! You need to log ${remainingItems} more ${remainingItems == 1 ? 'item' : 'items'} in your outfits to unlock wear stats.<br>
            <a href='./public/planner.html' class='locked-link'>
            <img src='./assets/icons/calendar.png'/>
            Log a fit<a/>`

        } else {
            msg = `Oops! It looks like you haven't added enough items to your wardrobe to unlock wardrobe stats. 
            Just ${remainingItems} more ${remainingItems == 1 ? 'item' : 'items'} to go! <br>
            <a href='./public/wardrobe.html' class='locked-link invert-image'>
            <img src='https://img.icons8.com/pastel-glyph/64/hanger--v1.png'/> Head to wardrobe <a/>`
        }

        lockedState(stats, msg)
        return
    }

    let clothingAttributes = [
        { data: 'brand', chart: 'doughnut', colors: undefined },
        { data: 'colour', chart: 'doughnut', colors: clothingColours },
        { data: 'season', chart: 'doughnut', colors: seasonColours },
        { data: 'occasion', chart: 'doughnut', colors: undefined },
        { data: 'category', chart: 'bar', colors: undefined },
        { data: 'origin', chart: 'bar', colors: undefined }
    ]

    for (const value of clothingAttributes) {
        await chartInfo(value.chart, withWear, value.data, value.colors, stats)
    }
}

async function wardrobeItems(withWear = false) {
    let data = await selectUserTable(window.user, 'clothing_items')

    let clothingItemsByAttribute = {}
    let multiValues = ['colour', 'season', 'occasion'];
    let wearCount
    let totalWear = 0

    data.forEach(item => { totalWear += item.wear_count });

    for (const item of data) {

        if (withWear == true) {
            wearCount = item.wear_count ?? 0;
            if (wearCount == 0) continue;
        }

        for (let [key, value] of Object.entries(item)) {
            if (!value || key == 'id' || key == 'user_id' || key == 'image' || key == 'wear_count' || key == 'care_instructions') continue;

            let values = multiValues.includes(key)
                ? value.split(',').map(v => v.trim().toLowerCase())
                : [value];

            clothingItemsByAttribute[key] = clothingItemsByAttribute[key] || {};

            if (withWear == true) {
                for (const val of values) {
                    clothingItemsByAttribute[key][val] = (clothingItemsByAttribute[key][val] || 0) + wearCount;
                }
            } else {
                for (const val of values) {
                    clothingItemsByAttribute[key][val] = (clothingItemsByAttribute[key][val] || 0) + 1;

                }
            }
        };

    }
    return { clothingItemsByAttribute, totalItems: data.length, totalWear }
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

let randomPastelRGB = () => {
    let r = Math.floor((Math.random() * 100) + 100);
    let g = Math.floor((Math.random() * 100) + 100);
    let b = Math.floor((Math.random() * 100) + 100);

    return `${r},${g},${b}`;
};

async function createChart(chartType, withWear = false, clothingAttribute, dataColours = undefined, appendTo) {
    let data = await wardrobeItems(withWear)
    data.clothingItemsByAttribute = data.clothingItemsByAttribute[clothingAttribute]

    if (!data.clothingItemsByAttribute) return
    data.clothingItemsByAttribute = Object.fromEntries([...Object.entries(data.clothingItemsByAttribute)].sort((a, b) => b[1] - a[1]))

    let labels = Object.keys(data.clothingItemsByAttribute).map(d => capitalise(d));
    let values = Object.values(data.clothingItemsByAttribute);

    let backgroundColors
    let borderColors

    if (!dataColours) {
        backgroundColors = values.map(() => `rgba(${randomPastelRGB()},0.4)`);
        borderColors = backgroundColors.map(c => c.replace('0.4', '1'))
    } else {
        let keys = Object.keys(data.clothingItemsByAttribute).map(key => key.toLowerCase())

        let options = Object.fromEntries(Object.entries(dataColours).map(([key, value]) =>
            [key.toLowerCase(), value]))

        options = keys.map((key) => options[key])
        backgroundColors = options.map(op => `rgba(${getRGB(op)},0.4)`)
        borderColors = options.map(op => `rgb(${getRGB(op)})`)
    }

    let container = new CreateElement('div').setAttributes({ class: 'chart-container', id: `${clothingAttribute}-chart`, 'data-wear': withWear, 'data-chart-type': chartType }).appendTo(appendTo)
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
            indexAxis: chartType == 'bar' ? 'y' : undefined,
            responsive: true,
            plugins: {
                legend: {
                    display: false,
                },
                title: {
                    display: false,
                    text: `${capitalise(clothingAttribute)}`
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

    return data.clothingItemsByAttribute
}

async function chartInfo(chartType, withWear = false, clothingAttribute, dataColours = undefined, appendTo) {
    let data = await createChart(chartType, withWear, clothingAttribute, dataColours, appendTo)
    if (!data) return

    let chart = document.querySelector(`#${clothingAttribute}-chart[data-wear="${withWear}"]`)
    chart.classList.remove('expanded');
    setDisplay([chart], 'none');

    let cardId = `${clothingAttribute}-${withWear ? 'withWear' : 'noWear'}-card`;
    chart.setAttribute('data-card-id', cardId);
    let card = new CreateElement('div').setAttributes({ class: 'chart-card', id: cardId }).appendTo(appendTo)

    new CreateElement('h4').setText(clothingAttribute).appendTo(card)
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

    data = Object.fromEntries([...Object.entries(data)].sort((a, b) => b[1] - a[1]).slice(0, 5))
    let dataKeys = formatWithAnd(Object.keys(data).map(key => capitalise(key)))

    function formatWithAnd(arr) {
        if (arr.length == 1) return arr[0];
        if (arr.length == 2) return `${arr[0]} and ${arr[1]}`;
        return `${arr.slice(0, -1).join(', ')}, and ${arr[arr.length - 1]}`;
    }

    switch (withWear) {
        case true:
            if (count.length > 1) {
                switch (clothingAttribute) {
                    case 'category':
                        info.innerHTML = `Most worn items came from ${dataKeys}`;
                        break;
                    case 'brand':
                        info.innerHTML = `${dataKeys}  keeps showing up - clearly a go-to label`;
                        break;
                    case 'colour':
                        info.innerHTML = `${dataKeys} tones are on heavy rotation. ${capitalise(topItem)} alone was worn ${topCount} times — is it your fave shade?`;
                        break;
                    case 'season':
                        info.innerHTML = `You've been dressing mostly for ${dataKeys} weather. You have worn ${topItem} items ${topCount} times!`;
                        break;
                    case 'occasion':
                        info.innerHTML = `Your clothing is getting the most mileage during ${dataKeys} occasion`;
                        break;
                    case 'origin':
                        info.innerHTML = `You've been favoring clothes from ${dataKeys}`;
                        break;
                    default:
                        info.innerHTML = `Your top ${count.length} most worn ${clothingAttribute}s are ${dataKeys}`;
                }
            } else {
                switch (clothingAttribute) {
                    case 'season':
                        info.innerHTML = `${capitalise(dataKeys)} season clothes were worn the most. You have worn them ${topCount} times!`;
                        break;
                    case 'brand':
                        info.innerHTML = `${capitalise(dataKeys)} dominates the rotation lately.`;
                        break;
                    default:
                        info.innerHTML = `Your most worn ${clothingAttribute} is ${dataKeys}`;
                }
            }
            break;

        default:
            if (count.length > 1) {
                switch (clothingAttribute) {
                    case 'category':
                        info.innerHTML = `Your closet includes a variety of categories: ${dataKeys}`;
                        break;
                    case 'brand':
                        info.innerHTML = `${capitalise(dataKeys)} labels make up your wardrobe - nice mix!`;
                        break;
                    case 'colour':
                        info.innerHTML = `This palette covers: ${dataKeys} shades`;
                        break;
                    case 'season':
                        info.innerHTML = `Your wardrobe is ready for ${dataKeys} seasons`;
                        break;
                    case 'occasion':
                        info.innerHTML = `Pieces are suited for: ${dataKeys}. Life's many moods, covered`;
                        break;
                    case 'origin':
                        info.innerHTML = `Garments come from ${dataKeys}`;
                        break;
                    default:
                        info.innerHTML = `Your top ${count.length} ${clothingAttribute}s are ${dataKeys}`;
                }
            } else {
                switch (clothingAttribute) {
                    case 'season':
                        info.innerHTML = `All your clothes are perfect for ${dataKeys}`;
                        break;
                    default:
                        info.innerHTML = `The only ${clothingAttribute} in your closet is ${dataKeys}`;
                }
            }
            break;
    }
}

