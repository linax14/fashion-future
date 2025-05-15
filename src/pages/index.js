document.documentElement.setAttribute('data-bs-theme', 'light')

document.querySelector('#logged-top-nav').remove()
let sideNav = new CreateElement('nav').setAttributes({ class: 'top-nav', id: 'main-top-nav' }).appendTo(document.body)
let main = new CreateElement('div').setAttributes({ id: 'index-main' }).appendTo(document.body)
let section = new CreateElement('section').setAttributes({ id: 'index-section' }).appendTo(main)

let authContainer = new CreateElement('div').setAttributes({ class: 'auth-container' }).appendTo(main)
let authFormContainer = new CreateElement('div').setAttributes({ class: 'auth-form-container' }).appendTo(authContainer)

let { signIn, signUp } = renderTopNav()

let displayInHome = (type) => {

    let bottomNav = document.querySelector('.bottom-nav')
    switch (type) {
        case 'welcome':
            setDisplay([section], 'flex')
            setDisplay([bottomNav], 'none')
            main.style.backgroundImage = `none`;
            main.style.height = 'auto'
            if (authContainer) setDisplay([authContainer], 'none')

            document.querySelectorAll('#main-top-nav ol li.active').forEach(li => li.classList.remove('active'))
            document.querySelector('#about-us').classList.add('active')
            break;

        case 'auth':
            setDisplay([authContainer], 'flex')
            setDisplay([section], 'none')
            main.style.backgroundImage = `url('./assets/bg/bg.png')`;
            main.style.height = '90vh'
            authFormContainer.innerHTML = ''
            break
        default:
            break;
    }
}

let contentSections = (title, list, id, appendTo) => {

    let container = new CreateElement('div').setAttributes({ id: id }).appendTo(appendTo)
    new CreateElement('h2').setText(title).appendTo(container)
    let ol = new CreateElement('ol').appendTo(container)
    list.forEach(li => { new CreateElement('li').setText(li).appendTo(ol) })

    return container
}

mainRender()

function mainRender() {
    displayInHome('welcome')

    new CreateElement('h2').setText('Fashion Future').appendTo(section)

    new CreateElement('p').setText(`Discover a new way to manage your wardrobe. 
        With Fashion Future you can create outfits, track your
        wardrobe and make sustainable choices.`).setAttributes({ class: 'index-p' }).appendTo(section)

    let cta = new CreateElement('div').setAttributes({ class: 'repeat' }).appendTo(section)
    let ol = new CreateElement('ol').setAttributes({ class: 'repeat-li' }).appendTo(cta)
    let list = ['Reduce', ' Reuse', ' Recycle', 'Rethink ', 'Refuse', ' Repair', 'Refashion it!']
    list.forEach(li => new CreateElement('li').setText(li).appendTo(ol))

    let clone = ol.cloneNode(true)
    cta.appendChild(clone)

    let s3 = contentSections('Ready?', [
        `Start building your sustainable wardrobe today!`,
        `Sign up and unlock a more organised and eco-friendly experience.`
    ], 'ready', section)

    new CreateElement('button').setAttributes({ class: 'btn' }).setText('Sign me up!').addEventListener('click', () => {
        renderSignUpForm()
    }).appendTo(s3)

    let s1 = contentSections('Why choose our virtual closet?', [
        'Sustainability Quizzes',
        'Challenges tailored to you',
        `Outfit Creation`,
        `Wardrobe and Wear stats`
    ], 'why-us', section)

    let imgs = new CreateElement('div').appendTo(s1)
    new CreateElement('img').setAttributes({ src: './assets/index/wardrobe-light.png', class: 'index-img', id: 'left' }).appendTo(imgs)
    new CreateElement('img').setAttributes({ src: './assets/index/stats-light.png', class: 'index-img', id: 'right' }).appendTo(imgs)

    let s2 = contentSections('How it works', [
        `Upload your clothes`,
        `Build your wardrobe`,
        `Complete challenges and quizzes`,
        `Earn points and discover your personality`
    ], 'how', section)

    let imgs2 = new CreateElement('div').appendTo(s2)
    new CreateElement('img').setAttributes({ src: './assets/index/dash-light.png', class: 'index-img', id: 'left' }).appendTo(imgs2)
    new CreateElement('img').setAttributes({ src: './assets/index/planner-light.png', class: 'index-img', id: 'right' }).appendTo(imgs2)

    return section
}

let passwordVisibility = (appendTo) => {

    let visible = false
    let visibilityTimeout

    new CreateElement('i').setAttributes({ class: 'fa-solid fa-eye' })
        .addEventListener('click', () => {
            visible = !visible
            password.type = visible ? 'text' : 'password'
            password.setAttribute('aria-pressed', visible)
            password.setAttribute('aria-label', visible ? 'Hide password' : 'Show password')

            if (visible) {
                visibilityTimeout = setTimeout(() => {
                    password.type = 'password'
                    visible = false
                    password.setAttribute('aria-pressed', false)
                    password.setAttribute('aria-label', 'Show password')
                }, 1500);
            } else { clearTimeout(visibilityTimeout) }
        }).appendTo(appendTo)
}

signIn.addEventListener('click', () => signInFormClickHandler())
signUp.addEventListener('click', () => renderSignUpForm())

let signUpUser = async (userEmail, userPassword, firstName, lastName, birthday, theme) => {
    const { data, error } = await supabase.auth.signUp({
        email: userEmail,
        password: userPassword,
        options: {
            data: {
                first_name: firstName,
                last_name: lastName,
                birthday: birthday,
                theme
            }
        }
    })

    if (error) {
        console.error(error)
        return
    } else {
        console.log('User', data)
    }
}

let signInWithEmail = async (emailInput, passwordInput) => {
    const { data, error } = await supabase.auth.signInWithPassword({
        email: emailInput,
        password: passwordInput,
    })

    if (error) {
        console.error('Error creating user:', error)
        return null
    } else {
        console.log('User data:', data)
        return data
    }
}

function renderSignUpForm() {
    displayInHome('auth')
    document.querySelectorAll('#main-top-nav ol li.active').forEach(li => li.classList.remove('active'))
    document.querySelector('#sign-up-btn').classList.add('active')

    new CreateElement('h2').setText('Join Fashion Future').appendTo(authFormContainer)

    let signUpForm = new CreateElement('form').setAttributes({ id: 'sign-up' }).appendTo(authFormContainer)
    let firstName = new CreateElement('input').setAttributes({ type: 'text', placeholder: 'First Name', required: true }).appendTo(signUpForm)
    let lastName = new CreateElement('input').setAttributes({ type: 'text', placeholder: 'Last Name', required: true }).appendTo(signUpForm)
    let birthday = new CreateElement('input').setAttributes({ type: 'date', required: true }).appendTo(signUpForm)
    let emailInput = new CreateElement('input').setAttributes({ type: 'email', placeholder: 'E-mail', required: true }).appendTo(signUpForm)

    let passwordInputDiv = new CreateElement('div').appendTo(signUpForm)
    let passwordInput = new CreateElement('input').setAttributes({ type: 'password', placeholder: 'Password', minlength: 8, id: 'password', required: true }).appendTo(passwordInputDiv)
    passwordVisibility(passwordInputDiv)

    let selectTheme = new CreateElement('div').appendTo(signUpForm)
    new CreateElement('small').setText('Theme').appendTo(selectTheme)
    let theme = new CreateElement('select').setAttributes({ name: 'theme', id: 'select-theme' }).setText('theme').appendTo(selectTheme)

    let options = ['dark', 'earthy', 'light']
    options.forEach(option => {
        new CreateElement('option').setAttributes({ value: option }).setText(`${option}`).appendTo(theme)
    })

    let formSubmit = new CreateElement('button').setAttributes({ class: 'btn' }).setText('sign up').appendTo(signUpForm)
    let signIn = new CreateElement('p').setText(`Already have an account? `).appendTo(authFormContainer)
    new CreateElement('span').setText('Sign in').setAttributes({ style: `border-bottom:1px solid white` }).addEventListener('click', () => { signInFormClickHandler() }).appendTo(signIn)

    signUpForm.addEventListener('submit', async (event) => {
        event.preventDefault()

        await signUpUser(emailInput.value, passwordInput.value, escapeHTML(firstName.value),
            escapeHTML(lastName.value), birthday.value, theme.value)

        if (signUpUser) {
            let userData = await signInWithEmail(emailInput.value, passwordInput.value)
            if (userData) {
                window.location.href = './public/dashboard.html'
            } return
        }
    })
}

function renderTopNav() {
    let ol = new CreateElement('ol').appendTo(sideNav)
    new CreateElement('li').setAttributes({ class: 'btn', id: 'about-us' }).setText('About us').addEventListener('click', () => {
        displayInHome('welcome')
    }).appendTo(ol)
    let signIn = new CreateElement('li').setAttributes({ class: 'btn', id: 'sign-in-btn' }).setText('sign in').appendTo(ol)
    let signUp = new CreateElement('li').setAttributes({ class: 'btn', id: 'sign-up-btn' }).setText('sign up').appendTo(ol)
    return { signIn, signUp }
}

function signInFormClickHandler() {
    displayInHome('auth')
    document.querySelectorAll('#main-top-nav ol li.active').forEach(li => li.classList.remove('active'))
    document.querySelector('#sign-in-btn').classList.add('active')

    new CreateElement('h2').setText('welcome back!').appendTo(authFormContainer)

    let signInForm = new CreateElement('form').setAttributes({ id: 'sign-in' }).appendTo(authFormContainer)

    let emailInputDiv = new CreateElement('div').appendTo(signInForm)
    let emailInput = new CreateElement('input').setAttributes({ type: 'email', placeholder: 'Email', required: true }).appendTo(emailInputDiv)
    let passwordInputDiv = new CreateElement('div').appendTo(signInForm)
    let passwordInput = new CreateElement('input').setAttributes({ type: 'password', placeholder: 'Password', minlength: 8, id: 'password', required: true }).appendTo(passwordInputDiv)
    passwordVisibility(passwordInputDiv)

    let error = new CreateElement('p').appendTo(signInForm)
    error.style.display = 'none'
    let formSubmit = new CreateElement('button').setAttributes({ class: 'btn' }).setText('sign in').appendTo(signInForm)

    let timeoutId

    signInForm.addEventListener('submit', async (event) => {
        event.preventDefault()

        error.style.display = 'none'
        error.innerText = ''

        if (timeoutId) {
            clearTimeout(timeoutId)
        }

        let userData = await signInWithEmail(emailInput.value, passwordInput.value)
        if (userData) {
            console.log(userData);

            if (timeoutId) {
                clearTimeout(timeoutId)
            }

            let { data: deleteRequest, error: deleteError } = await supabase.from('delete_request').select().eq('user_id', userData.user.id).single()
            if (deleteError) {
                console.error(deleteError);
            }

            console.log(deleteRequest);

            if (deleteRequest) {
                error.innerText = 'Your account is scheduled for deletion and cannot be accessed.'
                error.style.display = 'block'
                await supabase.auth.signOut()
                return
            }

            window.location.href = './public/dashboard.html'

        } else {
            setTimeout(() => {
                error.innerText = 'Incorrect email or password. Please try again!'
                error.style.display = 'block'
            }, 100)
        }

    })
}

