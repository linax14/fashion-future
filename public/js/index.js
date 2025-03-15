
let main = new CreateElement('div').appendTo(document.body)

let authContainer = new CreateElement('div').setAttributes({ class: 'auth-container' }).appendTo(main)
let signIn = new CreateElement('button').setAttributes({ class: 'btn' }).setText('sign in').appendTo(authContainer)
let signUp = new CreateElement('button').setAttributes({ class: 'btn' }).setText('sign up').appendTo(authContainer)

let authFormContainer = new CreateElement('div').setAttributes({ class: 'auth-form-container' }).appendTo(authContainer)

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

signIn.addEventListener('click', () => {
    authFormContainer.innerHTML = ''

    let signInForm = new CreateElement('form').appendTo(authFormContainer)

    let emailInput = new CreateElement('input').setAttributes({ type: 'email' }).appendTo(signInForm)
    let passwordInput = new CreateElement('input').setAttributes({ type: 'password' }).appendTo(signInForm)

    let formSubmit = new CreateElement('button').setAttributes({ class: 'btn' }).setText('sign in').appendTo(signInForm)

    let error = new CreateElement('p').appendTo(authFormContainer)
    error.style.display = 'none'

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

            if (timeoutId) {
                clearTimeout(timeoutId)
            }

            window.location.href = './public/views/dashboard.html'

        } else {
            setTimeout(() => {
                error.innerText = 'wrong sign in details'
                error.style.display = 'block'
            }, 100)
        }

    })
})

signUp.addEventListener('click', () => {
    authFormContainer.innerHTML = ''

    let signUpForm = new CreateElement('form').setAttributes({ class: 'sign-up-form' }).appendTo(authFormContainer)
    let firstName = new CreateElement('input').setAttributes({ type: 'text', placeholder: 'First Name' }).appendTo(signUpForm)
    let lastName = new CreateElement('input').setAttributes({ type: 'text', placeholder: 'Last Name' }).appendTo(signUpForm)
    let birthday = new CreateElement('input').setAttributes({ type: 'date' }).appendTo(signUpForm)
    let emailInput = new CreateElement('input').setAttributes({ type: 'email', placeholder: 'E-mail' }).appendTo(signUpForm)
    let passwordInput = new CreateElement('input').setAttributes({ type: 'password', placeholder: 'Password' }).appendTo(signUpForm)

    let selectTheme = new CreateElement('div').appendTo(signUpForm)
    let theme = new CreateElement('select').setAttributes({ name: 'theme' }).setText('theme').appendTo(selectTheme)

    let options = ['dark', 'light']
    options.forEach(option => {
        new CreateElement('option').setAttributes({ value: option }).setText(`${option}`).appendTo(theme)
    })

    let formSubmit = new CreateElement('button').setAttributes({ class: 'btn' }).setText('sign up').appendTo(signUpForm)

    signUpForm.addEventListener('submit', async (event) => {
        event.preventDefault()

        await signUpUser(emailInput.value, passwordInput.value, firstName.value,
            lastName.value, birthday.value, theme.value)


        if (signUpUser) {
            let userData = await signInWithEmail(emailInput.value, passwordInput.value)
            if (userData) {
                window.location.href = './public/views/dashboard.html'
            }
        }
    })
})

