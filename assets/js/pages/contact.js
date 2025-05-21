document.addEventListener('DOMContentLoaded', function () {
  const contactForm = document.querySelector('.contact-form form');
  const nameInput = document.getElementById('name');
  const emailInput = document.getElementById('email');
  const phoneInput = document.getElementById('phone');
  const subjectInput = document.getElementById('subject');
  const messageInput = document.getElementById('message');

  contactForm.addEventListener('submit', async function (e) {
    e.preventDefault();


    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const phone = phoneInput.value.trim();
    const subject = subjectInput.value.trim();
    const message = messageInput.value.trim();


    let isValid = true;


    if (!name || name.length < 2 || name.length > 50 || !/^[a-zA-Z\s]+$/.test(name)) {
      showError(nameInput, 'Name must be 2-50 characters (letters and spaces only).');
      isValid = false;
    } else {
      clearError(nameInput);
    }


    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showError(emailInput, 'Please enter a valid email address.');
      isValid = false;
    } else {
      clearError(emailInput);
    }


    if (phone && !/^(\+\d{1,3}\s?)?[0-9\s\(\)\-]{7,15}$/.test(phone)) {
      showError(phoneInput, 'Please enter a valid phone number (e.g., +12061562849 or 206-156-2849).');
      isValid = false;
    } else {
      clearError(phoneInput);
    }


    if (subject && (subject.length < 3 || subject.length > 100)) {
      showError(subjectInput, 'Subject must be 3-100 characters if provided.');
      isValid = false;
    } else {
      clearError(subjectInput);
    }


    if (!message || message.length < 10 || message.length > 500) {
      showError(messageInput, 'Message must be 10-500 characters.');
      isValid = false;
    } else {
      clearError(messageInput);
    }

    if (!isValid) return;


    const formData = {
      userName: name,
      description: `Subject: ${subject || 'N/A'}\nMessage: ${message}\nEmail: ${email}\nPhone: ${phone || 'N/A'}`,
      status: 'pending', 
      createdAt: new Date().toISOString(),
      type: 'contact' 
    };

    try {
      const response = await fetch('http://localhost:3000/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        alert('Message sent successfully!');
        contactForm.reset();
      } else {
        throw new Error(`Failed to send message: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error sending contact form:', error);
      alert(`Failed to send message: ${error.message}`);
    }
  });


  function showError(input, message) {
    const formGroup = input.closest('.form-group');
    let errorDiv = formGroup.querySelector('.alert-danger');
    if (!errorDiv) {
      errorDiv = document.createElement('div');
      errorDiv.className = 'alert alert-danger d-block mt-2';
      formGroup.appendChild(errorDiv);
    }
    errorDiv.textContent = message;
    input.classList.add('is-invalid');
  }

  function clearError(input) {
    const formGroup = input.closest('.form-group');
    const errorDiv = formGroup.querySelector('.alert-danger');
    if (errorDiv) {
      errorDiv.remove();
    }
    input.classList.remove('is-invalid');
  }
});
