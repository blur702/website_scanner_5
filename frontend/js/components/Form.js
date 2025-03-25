/**
 * Form Component
 * Handles form validation, submission, and state management
 */
class Form {
    constructor(options = {}) {
        this.options = {
            form: null,
            onSubmit: null,
            onValidate: null,
            onError: null,
            autoValidate: true,
            ...options
        };

        this.form = this.options.form;
        this.init();
    }

    init() {
        if (!this.form) {
            throw new Error('Form element is required');
        }

        this.setupEventListeners();
        if (this.options.autoValidate) {
            this.setupValidation();
        }
    }

    setupEventListeners() {
        this.form.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (await this.validate()) {
                await this.submit();
            }
        });

        // Handle form reset
        this.form.addEventListener('reset', () => {
            this.clearErrors();
        });
    }

    setupValidation() {
        const inputs = this.form.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.addEventListener('blur', () => {
                this.validateField(input);
            });
        });
    }

    async validate() {
        this.clearErrors();
        let isValid = true;

        // Run custom validation if provided
        if (this.options.onValidate) {
            const customValidation = await this.options.onValidate(this.getFormData());
            if (!customValidation.valid) {
                this.showErrors(customValidation.errors);
                isValid = false;
            }
        }

        // Run HTML5 validation
        if (!this.form.checkValidity()) {
            const inputs = this.form.querySelectorAll('input, select, textarea');
            inputs.forEach(input => {
                if (!input.validity.valid) {
                    this.showFieldError(input, input.validationMessage);
                }
            });
            isValid = false;
        }

        return isValid;
    }

    validateField(field) {
        this.clearFieldError(field);

        if (!field.validity.valid) {
            this.showFieldError(field, field.validationMessage);
            return false;
        }

        return true;
    }

    async submit() {
        try {
            if (this.options.onSubmit) {
                const formData = this.getFormData();
                await this.options.onSubmit(formData);
            }
        } catch (error) {
            if (this.options.onError) {
                this.options.onError(error);
            }
            this.showErrors({ form: error.message });
        }
    }

    getFormData() {
        const formData = new FormData(this.form);
        return Object.fromEntries(formData.entries());
    }

    showErrors(errors) {
        Object.entries(errors).forEach(([field, message]) => {
            const input = this.form.querySelector(`[name="${field}"]`);
            if (input) {
                this.showFieldError(input, message);
            } else if (field === 'form') {
                this.showFormError(message);
            }
        });
    }

    showFieldError(field, message) {
        field.classList.add('error');
        const errorElement = document.createElement('div');
        errorElement.className = 'form-error';
        errorElement.textContent = message;
        field.parentNode.appendChild(errorElement);
    }

    showFormError(message) {
        const errorElement = document.createElement('div');
        errorElement.className = 'form-error form-error-summary';
        errorElement.textContent = message;
        this.form.insertBefore(errorElement, this.form.firstChild);
    }

    clearErrors() {
        this.form.querySelectorAll('.form-error').forEach(error => error.remove());
        this.form.querySelectorAll('.error').forEach(field => {
            field.classList.remove('error');
        });
    }

    clearFieldError(field) {
        const errorElement = field.parentNode.querySelector('.form-error');
        if (errorElement) {
            errorElement.remove();
        }
        field.classList.remove('error');
    }

    reset() {
        this.form.reset();
        this.clearErrors();
    }

    destroy() {
        // Cleanup event listeners if needed
        this.form = null;
    }
}

export default Form;