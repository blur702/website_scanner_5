// frontend/js/components/Form.js
// Form handling component

const Form = {
  init: () => {
    document.querySelectorAll('form').forEach(form => {
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        if (Form.validate(form)) {
          Form.submit(form);
        }
      });
    });
  },
  validate: (form) => {
    let isValid = true;

    // Find all required fields
    form.querySelectorAll('[required]').forEach(field => {
      if (!field.value.trim()) {
        isValid = false;
        // Add error class
        field.classList.add('form-error');

        // Create or update error message
        let errorMsg = field.parentNode.querySelector('.error-message');
        if (!errorMsg) {
          errorMsg = document.createElement('div');
          errorMsg.className = 'error-message';
          field.parentNode.appendChild(errorMsg);
        }
        errorMsg.textContent = `${field.name || 'This field'} is required`;
      } else {
        // Remove error class if field is valid
        field.classList.remove('form-error');
        // Remove error message if it exists
        const errorMsg = field.parentNode.querySelector('.error-message');
        if (errorMsg) errorMsg.remove();
      }
    });

    return isValid;
  },
  submit: async (form) => {
    const formData = new FormData(form);
    const data = {};
    formData.forEach((value, key) => {
      data[key] = value;
    });

    const formAction = form.getAttribute('action') || '/api/form';
    const formMethod = form.getAttribute('method') || 'POST';

    try {
      const response = await fetch(formAction, {
        method: formMethod,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        if (window.Notification) Notification.show('Form submitted successfully', 'success');
        form.reset();
      }
    } catch (error) {
      if (window.Notification) Notification.show(`Error submitting form: ${error.message}`, 'error');
    }
  },
};

window.Form = Form;