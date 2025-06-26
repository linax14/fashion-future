document.addEventListener("userInitialized", async () => {
    renderSettings()
})

function renderSettings() {
    let main = new CreateElement('div').setAttributes({ class: 'settings' }).appendTo(document.body);
    let userDetails = new CreateElement('h3').setText('User Details').appendTo(main)
    let edit = new CreateElement('span').appendTo(userDetails)

    let editUserData = new CreateElement('button').setText('edit').setAttributes({ class: 'btn', type: 'button' }).addEventListener('click', () => {
        let isActive = edit.classList.toggle('active')

        if (isActive) {
            inputs.forEach(input => input.removeAttribute('disabled'))
            theme.removeAttribute('disabled')
            formSubmit.removeAttribute('disabled')
            setDisplay([formSubmit], 'block')
        } else {
            inputs.forEach(input => input.setAttribute('disabled', true))
            theme.setAttribute('disabled', true)
            formSubmit.setAttribute('disabled', true)
            setDisplay([formSubmit], 'none')
        }

    }).appendTo(edit)

    let user = window.user.user_metadata

    let formFields = {
        first_name: { label: 'First name', input: { type: 'text', value: user.first_name } },
        last_name: { label: 'Last name', input: { type: 'text', value: user.last_name } },
        birthday: { label: 'Birthday', input: { type: 'date', value: user.birthday } },
        email: { label: 'Email', input: { type: 'email', value: user.email } },
    }

    let userData = new CreateElement('div').setAttributes({ class: 'user-data' }).appendTo(main)
    let signUpForm = new CreateElement('form').setAttributes({ id: 'sign-up' }).appendTo(userData)

    for (let [key, field] of Object.entries(formFields)) {
        let wrapper = new CreateElement('div').appendTo(signUpForm)
        new CreateElement('label').setText(field.label).appendTo(wrapper)
        formFields[key].element = new CreateElement('input').setAttributes({
            type: field.input.type,
            name: key,
            placeholder: capitalise(field.label), value: field.input.value
        }).appendTo(wrapper)
    }

    let selectTheme = new CreateElement('div').appendTo(signUpForm)
    new CreateElement('label').setText('Theme').appendTo(selectTheme)
    let theme = new CreateElement('select').setAttributes({ name: 'theme' }).setText('theme').appendTo(selectTheme)
    let options = ['dark','light']
    options.forEach(option => {
        let el = new CreateElement('option').setAttributes({ value: option }).setText(`${option}`).appendTo(theme)
        if (option == user.theme) {
            el.setAttribute('selected', option)
        }
    })

    let inputs = signUpForm.querySelectorAll('input')
    inputs.forEach(input => input.setAttribute('disabled', true))
    theme.setAttribute('disabled', true)

    let formSubmit = new CreateElement('button').setAttributes({ class: 'btn', type: 'submit' }).setText('save').appendTo(signUpForm)
    setDisplay([formSubmit], 'none')
    formSubmit.setAttribute('disabled', true)

    let deleteBtn = new CreateElement('button').setText('delete Account').setAttributes({ class: 'btn', id: 'delete-account-btn' }).appendTo(main);

    deleteBtn.addEventListener('click', async () => {
        let { data, error } = await supabase.from('delete_request')
            .insert([{ user_id: user.id, request: new Date() }])

        if (error) {
            console.log('failed');
        } else {
            let confirm = await confirmBox({
                title: 'Delete Account', text: `Are you sure you want to delete your account? This action is permanent and all your data will be lost.`,
                save: 'Delete Account', dismiss: 'Cancel', modalId: 'delete-account'
            })

            if (confirm) {
                window.location.href = 'index.html'
            }
        }
    })

    signUpForm.addEventListener('submit', async (event) => {

        event.preventDefault()

        let updateData = {}
        for (let [key, field] of Object.entries(formFields)) {
            updateData[key] = escapeHTML(field.element.value)
        }

        if (theme.value) {
            updateData['theme'] = theme.value
        }

        const { data, error } = await supabase.auth.updateUser({
            data: updateData
        })

        if (error) console.error(error);
        inputs.forEach(input => input.setAttribute('disabled', true))
        theme.setAttribute('disabled', true)
        formSubmit.setAttribute('disabled', true)
        edit.classList.remove('active')
        setDisplay([formSubmit], 'none')

    })
    return main
}
