/**
 * Form Component
 * Handles form validation, submission, and state management
 */
class Form {
    constructor(options = {}) {
        this.options = {
            formId: null,
            fields: {},
            validations: {},
            onSubmit: null,
            onChange: null,
            onError: null,
            validateOnChange: true,
            validateOnBlur: true,
            resetOnSubmit: false,
            ...options
        };

        this.form = null;
        this.fields = {};
        this.errors = {};
        this.isSubmitting = false;
        this.isValid = true;

        this.init();
    }

    init() {
        if (this.options.formId) {
            this.form = document.getElementById(this.options.formId);
            if (!this.form) {
                throw new Error(`Form with id "${this.options.formId}" not found`);
            }
        }

        this.initializeFields();
        this.setupEventListeners();
    }

    initializeFields() {
        // Initialize field values and state
        Object.entries(this.options.fields).forEach(([name, config]) => {
            const element = this.form ? this.form.elements[name] : null;
            
            this.fields[name] = {
                value: config.value || '',
                element,
                touched: false,
                dirty: false,
                config
            };
        });
    }

    setupEventListeners() {
        if (!this.form) return;

        // Form submit
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSubmit();
        });

        // Field events
        Object.keys(this.fields).forEach(name => {
            const element = this.fields[name].element;
            if (!element) return;

            // Change events
            element.addEventListener('input', () => {
                this.handleFieldChange(name);
            });

            element.addEventListener('change', () => {
                this.handleFieldChange(name);
            });

            // Blur events
            element.addEventListener('blur', () => {
                this.handleFieldBlur(name);
            });
        });
    }

    async handleSubmit() {
        if (this.isSubmitting) return;

        this.isSubmitting = true;
        this.clearErrors();

        try {
            // Validate all fields
            const isValid = await this.validateAll();
            if (!isValid) {
                this.handleValidationErrors();
                return;
            }

            // Call onSubmit callback with form data
            if (this.options.onSubmit) {
                const formData = this.getValues();
                await this.options.onSubmit(formData, this);
            }

            // Reset form if configured
            if (this.options.resetOnSubmit) {
                this.reset();
            }

        } catch (error) {
            console.error('Form submission error:', error);
            if (this.options.onError) {
                this.options.onError(error, this);
            }
        } finally {
            this.isSubmitting = false;
        }
    }

    handleFieldChange(name) {
        const field = this.fields[name];
        if (!field) return;

        // Update field value
        field.value = this.getFieldValue(field.element);
        field.dirty = true;

        // Validate if configured
        if (this.options.validateOnChange) {
            this.validateField(name);
        }

        // Trigger onChange callback
        if (this.options.onChange) {
            this.options.onChange(name, field.value, this);
        }
    }

    handleFieldBlur(name) {
        const field = this.fields[name];
        if (!field) return;

        field.touched = true;

        // Validate if configured
        if (this.options.validateOnBlur) {
            this.validateField(name);
        }
    }

    async validateField(name) {
        const field = this.fields[name];
        const validations = this.options.validations[name] || [];

        this.clearFieldError(name);

        for (const validation of validations) {
            try {
                const result = await validation(field.value, this.getValues());
                if (result !== true) {
                    this.setFieldError(name, result);
                    return false;
                }
            } catch (error) {
                this.setFieldError(name, error.message);
                return false;
            }
        }

        return true;
    }

    async validateAll() {
        const validations = await Promise.all(
            Object.keys(this.fields).map(name => this.validateField(name))
        );

        this.isValid = validations.every(isValid => isValid);
        return this.isValid;
    }

    handleValidationErrors() {
        // Focus first field with error
        const firstErrorField = Object.entries(this.errors)[0];
        if (firstErrorField) {
            const [name] = firstErrorField;
            const element = this.fields[name].element;
            if (element) {
                element.focus();
            }
        }

        // Call onError callback
        if (this.options.onError) {
            this.options.onError(this.errors, this);
        }
    }

    setFieldError(name, message) {
        this.errors[name] = message;
        this.updateFieldUI(name);
    }

    clearFieldError(name) {
        delete this.errors[name];
        this.updateFieldUI(name);
    }

    clearErrors() {
        this.errors = {};
        Object.keys(this.fields).forEach(name => {
            this.updateFieldUI(name);
        });
    }

    updateFieldUI(name) {
        const field = this.fields[name];
        if (!field.element) return;

        const hasError = name in this.errors;
        
        // Update element classes
        field.element.classList.toggle('is-invalid', hasError);
        field.element.classList.toggle('is-valid', field.touched && !hasError);

        // Update or remove error message
        const container = field.element.closest('.form-group');
        if (container) {
            let errorElement = container.querySelector('.form-error');
            
            if (hasError) {
                if (!errorElement) {
                    errorElement = document.createElement('div');
                    errorElement.className = 'form-error';
                    container.appendChild(errorElement);
                }
                errorElement.textContent = this.errors[name];
            } else if (errorElement) {
                errorElement.remove();
            }
        }
    }

    getFieldValue(element) {
        if (!element) return '';

        if (element.type === 'checkbox') {
            return element.checked;
        }

        if (element.type === 'radio') {
            const checked = this.form.querySelector(`input[name="${element.name}"]:checked`);
            return checked ? checked.value : '';
        }

        if (element.type === 'select-multiple') {
            return Array.from(element.selectedOptions).map(option => option.value);
        }

        return element.value;
    }

    setFieldValue(name, value) {
        const field = this.fields[name];
        if (!field || !field.element) return;

        if (field.element.type === 'checkbox') {
            field.element.checked = Boolean(value);
        } else if (field.element.type === 'radio') {
            const radio = this.form.querySelector(`input[name="${name}"][value="${value}"]`);
            if (radio) {
                radio.checked = true;
            }
        } else if (field.element.type === 'select-multiple') {
            const values = Array.isArray(value) ? value : [value];
            Array.from(field.element.options).forEach(option => {
                option.selected = values.includes(option.value);
            });
        } else {
            field.element.value = value;
        }

        field.value = value;
        this.handleFieldChange(name);
    }

    getValues() {
        return Object.entries(this.fields).reduce((values, [name, field]) => {
            values[name] = field.value;
            return values;
        }, {});
    }

    setValues(values) {
        Object.entries(values).forEach(([name, value]) => {
            this.setFieldValue(name, value);
        });
    }

    reset() {
        if (this.form) {
            this.form.reset();
        }

        Object.keys(this.fields).forEach(name => {
            const field = this.fields[name];
            field.value = field.config.value || '';
            field.touched = false;
            field.dirty = false;
        });

        this.clearErrors();
    }

    destroy() {
        if (this.form) {
            // Remove event listeners
            this.form.removeEventListener('submit', this.handleSubmit);
            
            Object.values(this.fields).forEach(field => {
                if (field.element) {
                    field.element.removeEventListener('input', this.handleFieldChange);
                    field.element.removeEventListener('change', this.handleFieldChange);
                    field.element.removeEventListener('blur', this.handleFieldBlur);
                }
            });
        }
    }
}

// Export for module use
export default Form;