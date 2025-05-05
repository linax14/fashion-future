document.querySelector('#logged-side-nav').remove()
let sideNav = new CreateElement('nav').setAttributes({ class: 'side-nav', id: 'main-side-nav' }).appendTo(document.body)
let main = new CreateElement('div').appendTo(document.body)

let authContainer = new CreateElement('div').setAttributes({ class: 'auth-container' }).appendTo(main)
let authFormContainer = new CreateElement('div').setAttributes({ class: 'auth-form-container' }).appendTo(authContainer)

let { signIn, icon, signUp } = renderSideNav()

let displayInHome = (type) => {

    let bottomNav = document.querySelector('.bottom-nav')
    switch (type) {
        case 'welcome':
            setDisplay([bottomNav], 'none')
            if (authContainer) setDisplay([authContainer], 'none')
            break;

        case 'auth':
            closeSideNav()
            setDisplay([authContainer], 'flex')
            authFormContainer.innerHTML = ''
            break
        default:
            break;
    }
}

displayInHome('welcome')

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

signIn.addEventListener('click', () => {
    let sign = signInFormClickHandler()
    console.log(sign);

})

let closeSideNav = () => {
    setDisplay([sideNav], 'block')
    sideNav.classList.remove('expanded')
    icon.setAttribute('class', 'fa-solid fa-bars nav-toggle-icon')
}

signUp.addEventListener('click', () => {
    displayInHome('auth')
    new CreateElement('h2').setText('Join Fashion Future').appendTo(authFormContainer)

    let signUpForm = new CreateElement('form').setAttributes({ id: 'sign-up' }).appendTo(authFormContainer)
    let firstName = new CreateElement('input').setAttributes({ type: 'text', placeholder: 'First Name' }).appendTo(signUpForm)
    let lastName = new CreateElement('input').setAttributes({ type: 'text', placeholder: 'Last Name' }).appendTo(signUpForm)
    let birthday = new CreateElement('input').setAttributes({ type: 'date' }).appendTo(signUpForm)
    let emailInput = new CreateElement('input').setAttributes({ type: 'email', placeholder: 'E-mail' }).appendTo(signUpForm)

    let passwordInputDiv = new CreateElement('div').appendTo(signUpForm)
    let passwordInput = new CreateElement('input').setAttributes({ type: 'password', placeholder: 'Password', minlength: 8, id: 'password' }).appendTo(passwordInputDiv)
    passwordVisibility(passwordInputDiv)

    let selectTheme = new CreateElement('div').appendTo(signUpForm)
    new CreateElement('small').setText('Select an app theme. PS: You can change it later if you want!').appendTo(selectTheme)
    let theme = new CreateElement('select').setAttributes({ name: 'theme' }).setText('theme').appendTo(selectTheme)

    let options = ['dark', 'light']
    options.forEach(option => {
        new CreateElement('option').setAttributes({ value: option }).setText(`${option}`).appendTo(theme)
    })

    let formSubmit = new CreateElement('button').setAttributes({ class: 'btn' }).setText('sign up').appendTo(signUpForm)
    let signIn = new CreateElement('p').setText(`Already have an account? `).appendTo(authFormContainer)
    new CreateElement('span').setText('Sign in').setAttributes({ style: `border-bottom:1px solid white` }).addEventListener('click', () => { signInFormClickHandler() }).appendTo(signIn)

    signUpForm.addEventListener('submit', async (event) => {
        event.preventDefault()

        await signUpUser(emailInput.value, passwordInput.value, firstName.value,
            lastName.value, birthday.value, theme.value)

        if (signUpUser) {
            let userData = await signInWithEmail(emailInput.value, passwordInput.value)
            if (userData) {
                window.location.href = './public/dashboard.html'
            } return
        }
    })
})

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

function renderSideNav() {
    let header = new CreateElement('div').setAttributes({ class: 'header' }).appendTo(sideNav)
    let icon = new CreateElement('i').setAttributes({ class: 'fa-solid fa-bars' }).appendTo(header)
    let name = new CreateElement('h2').setText('Fashion Future').appendTo(header)
    let ol = new CreateElement('ol').appendTo(sideNav)

    icon.addEventListener('click', () => {
        let isExpanded = sideNav.classList.toggle('expanded')
        if (isExpanded) {
            icon.setAttribute('class', 'fa-solid fa-xmark nav-toggle-icon')
        } else {
            icon.setAttribute('class', 'fa-solid fa-bars nav-toggle-icon')
        }
    })

    let signIn = new CreateElement('li').setAttributes({ class: 'btn' }).setText('sign in').appendTo(ol)
    let signUp = new CreateElement('li').setAttributes({ class: 'btn' }).setText('sign up').appendTo(ol)
    return { signIn, icon, signUp }
}

function signInFormClickHandler() {
    displayInHome('auth')

    new CreateElement('h2').setText('welcome back!').appendTo(authFormContainer)

    let signInForm = new CreateElement('form').setAttributes({ id: 'sign-in' }).appendTo(authFormContainer)

    let emailInputDiv = new CreateElement('div').appendTo(signInForm)
    let emailInput = new CreateElement('input').setAttributes({ type: 'email', placeholder: 'Email' }).appendTo(emailInputDiv)
    let passwordInputDiv = new CreateElement('div').appendTo(signInForm)
    let passwordInput = new CreateElement('input').setAttributes({ type: 'password', placeholder: 'Password', minlength: 8, id: 'password' }).appendTo(passwordInputDiv)
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

