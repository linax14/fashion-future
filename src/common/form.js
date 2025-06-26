class FormField {
    constructor(name, config, container) {
        this.name = name
        this.config = config
        this.container = container

        this.wrapper = new CreateElement('div')
            .setAttributes({ class: `form-group ${name}` })
            .appendTo(this.container)

        this.label = new CreateElement('label')
            .setAttributes({ for: name }).setText(capitalise(name.split('_').join(' ')))
            .appendTo(this.wrapper)
    }
}

class TextInput extends FormField {
    constructor(name, config, container) {
        super(name, config, container)

        new CreateElement('input')
            .setAttributes({
                type: config.inputType || 'text', name: name,
                placeholder: config.placeholder || '',
                required: config.required || false
            })
            .appendTo(this.wrapper)
    }
}

class CheckboxGroup extends FormField {
    constructor(name, config, container) {
        super(name, config, container)

        let hiddenInput = new CreateElement('input')
            .setAttributes({ type: 'hidden', name: name })
            .appendTo(this.wrapper)

        let selected = ''

        config.options.forEach(option => {
            let checkboxWrapper = new CreateElement('div')
                .setAttributes({ class: 'checkbox-wrapper' })
                .appendTo(this.wrapper)

            let checkbox = new CreateElement('input')
                .setAttributes({ type: 'checkbox', value: option })
                .addEventListener('change', () => {

                    let selectedArray = selected ? selected.split(',') : [];

                    if (checkbox.checked) {
                        if (!selectedArray.includes(option)) {
                            selectedArray.push(option);
                        }
                    } else {
                        selectedArray = selectedArray.filter(c => c !== option);
                    }

                    selected = selectedArray.join(',');
                    hiddenInput.value = selected;
                })
                .appendTo(checkboxWrapper)

            new CreateElement('label')
                .setAttributes({ for: `${name}-${option}` })
                .setText(capitalise(option))
                .appendTo(checkboxWrapper)
        })
    }
}

class ImageUpload extends FormField {
    constructor(name, config, container) {
        super(name, config, container)
        this.selectedFile = null

        let formContainer = document.querySelector('.clothing-formContainer');

        let addImage = new CreateElement('img')
            .setAttributes({ src: './assets/createOutfit.png' })
            .addEventListener('click', () => {

                let img = formContainer.querySelector(config.class);

                if (!img) {
                    img = new CreateElement('input')
                        .setAttributes({
                            class: config.class,
                            type: config.inputType,
                            accept: config.accept,
                            capture: config.capture,
                            name: name
                        })
                        .addEventListener('change', async (event) => {
                            let file = event.target.files[0]
                            this.selectedFile = await resizeImage(file);

                            if (this.selectedFile) {
                                let url = URL.createObjectURL(this.selectedFile)

                                addImage.setAttribute('src', url)
                                addImage.classList.remove('create-outfit')
                                addImage.classList.add('preview')
                            }
                        })
                        .appendTo(this.wrapper)
                    img.click()
                }
            })
            .appendTo(this.wrapper)
    }

    getFile() {
        return this.selectedFile
    }
}

class SelectOption extends FormField {
    constructor(name, config, container) {
        super(name, config, container)

        this.hiddenInput = new CreateElement('input')
            .setAttributes({ type: 'hidden', name: name })
            .appendTo(this.wrapper)

        this.isDropdown = config.dropdown ?? false;
        this.allowMultiple = config.multiple ?? true;
        this.selected = this.allowMultiple ? [] : null;

        let dropdown = null;
        let close = null;

        if (this.isDropdown) {
            close = new CreateElement('span')
                .setAttributes({ class: 'toggle btn' })
                .setText('+')
                .appendTo(this.label);
        }

        if (this.isDropdown) {
            dropdown = new CreateElement('div')
                .setAttributes({ class: 'dropdown-options' })
                .appendTo(this.wrapper);
        }

        let optionsContainer = this.isDropdown ? dropdown : this.wrapper;

        config.options.sort().forEach(option => {
            let element = new CreateElement(config.type)
                .setAttributes({ 'data-value': option, class: 'element' })
                .addEventListener('click', (event) => {
                    event.stopPropagation()
                    if (this.allowMultiple) {
                        if (this.selected.includes(option)) {
                            this.selected = this.selected.filter(c => c != option);
                            element.classList.remove('selected');
                        } else {
                            this.selected.push(option);
                            element.classList.add('selected');
                        }
                        this.hiddenInput.value = this.selected.join(',');
                    } else {
                        if (this.selected == option) {
                            this.selected = null;
                            element.classList.remove('selected');
                            this.hiddenInput.value = '';
                        } else {
                            optionsContainer.querySelectorAll('.selected').forEach(el => {
                                el.classList.remove('selected');
                            });

                            this.selected = option;
                            element.classList.add('selected');
                            this.hiddenInput.value = option;
                        }
                    }
                })
                .setText(capitalise(option))
                .appendTo(optionsContainer)
        })

        if (this.isDropdown) {
            this.wrapper.addEventListener('click', (event) => {
                event.stopPropagation();

                document.querySelectorAll('.dropdown-options.open').forEach(el => {
                    if (!this.wrapper.contains(el)) {
                        el.classList.remove('open');
                    }
                });

                dropdown.classList.toggle('open');
            });


            document.addEventListener('click', (event) => {
                if (!this.wrapper.contains(event.target)) {
                    dropdown.classList.remove('open');
                }
            });
        }
    }
}

class Colours extends FormField {
    constructor(name, config, container) {
        super(name, config, container)

        this.hiddenInput = new CreateElement('input')
            .setAttributes({ type: 'hidden', name: name })
            .appendTo(this.wrapper)

        this.selected = []

        Object.entries(config.options).forEach(([option, value]) => {
            let element = new CreateElement('div')
                .setAttributes({ class: 'element', name: option })
                .appendTo(this.wrapper)

            let item = new CreateElement('span')
                .setAttributes({ class: config.class, style: `background-color:${value}` })
                .addEventListener('click', () => {

                    if (this.selected.includes(option)) {
                        this.selected = this.selected.filter(c => c !== option)
                        item.innerHTML = ''
                        item.classList.remove('selected')
                    } else {
                        this.selected.push(option)
                        item.classList.add('selected')
                    }

                    this.hiddenInput.value = this.selected.join(',')
                })
                .appendTo(element)

            new CreateElement('label').setText(capitalise(option)).appendTo(element)
        })
    }
}

class Images extends FormField {
    constructor(name, config, container) {
        super(name, config, container)

        this.hiddenInput = new CreateElement('input')
            .setAttributes({ type: 'hidden', name: name })
            .appendTo(this.wrapper)

        this.selected = ''

        Object.entries(config.options).forEach(([option, value]) => {
            let element = new CreateElement('span')
                .setAttributes({ class: 'element', 'data-value': option })
                .appendTo(this.wrapper)

            new CreateElement('label').setAttributes({ class: 'label', id: 'care-event-label' }).setText(capitalise(option)).appendTo(element)
            let item = new CreateElement('img')
                .setAttributes({ class: config.class, src: value })
                .addEventListener('click', () => {

                    this.selected = option
                    this.wrapper.querySelectorAll('.element.selected').forEach(el => el.classList.remove('selected'))
                    element.classList.add('selected')
                    this.hiddenInput.value = this.selected

                })
                .appendTo(element)
        })
    }
}

let resizeImage = async (file, maxWidth = 300, maxHeight = 200, quality = 0.7) => {
    return new Promise((resolve, reject) => {
        let img = new Image()
        img.src = URL.createObjectURL(file)

        img.onload = () => {
            let canvas = document.createElement('canvas')
            let ctx = canvas.getContext('2d')

            let w = img.width
            let h = img.height

            if (h > maxHeight || w > maxWidth) {
                if (w > h) {
                    h = (h * maxWidth) / w
                    w = maxWidth
                } else {
                    w = (w * maxHeight) / h
                    h = maxHeight
                }
            }

            canvas.width = w
            canvas.height = h

            ctx.drawImage(img, 0, 0, w, h)

            canvas.toBlob((blob) => {
                if (blob) {
                    resolve(new File([blob], file.name, { type: file.type }))
                } else {
                    reject(new Error('failed'))
                }
            }, file.type, 0.5)
        }
    })
}