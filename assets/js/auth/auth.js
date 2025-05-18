// Wait for DOM to load
document.addEventListener('DOMContentLoaded', () => {
    // DOM Selection
    const loginForm = document.querySelector('.auth-form');
    const emailInput = document.querySelector('#email');
    const passwordInput = document.querySelector('#password');
    const rememberMeCheckbox = document.querySelector('#remember-me');
    const submitButton = document.querySelector('.btn-primary');
    const socialIcons = document.querySelectorAll('.social-icon');

    // Error container (create dynamically)
    let errorContainer = null;

    // Initialize form with saved email if exists
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
        emailInput.value = savedEmail;
        rememberMeCheckbox.checked = true;
    }

    // Email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Show error message with Bootstrap alert
    function showError(message) {
        if (errorContainer) {
            errorContainer.remove();
        }

        // Create new error alert
        errorContainer = document.createElement('div');
        errorContainer.className = 'alert alert-danger alert-dismissible fade show';
        errorContainer.setAttribute('role', 'alert');
        errorContainer.setAttribute('aria-live', 'assertive');
        errorContainer.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        loginForm.parentNode.insertBefore(errorContainer, loginForm);

        errorContainer.focus();
    }

    // Clear error message
    function clearError() {
        if (errorContainer) {
            errorContainer.remove();
            errorContainer = null;
        }
    }

    // Validate inputs
    function validateInputs() {
        clearError();
        let isValid = true;
        let errorMessage = '';

        // Validate email
        if (!emailInput.value.trim()) {
            isValid = false;
            errorMessage = 'Email is required.';
            emailInput.classList.add('is-invalid');
        } else if (!emailRegex.test(emailInput.value.trim())) {
            isValid = false;
            errorMessage = 'Please enter a valid email address.';
            emailInput.classList.add('is-invalid');
        } else {
            emailInput.classList.remove('is-invalid');
        }

        // Validate password
        if (!passwordInput.value) {
            isValid = false;
            errorMessage = errorMessage || 'Password is required.';
            passwordInput.classList.add('is-invalid');
        } else if (passwordInput.value.length < 8) {
            isValid = false;
            errorMessage = errorMessage || 'Password must be at least 8 characters long.';
            passwordInput.classList.add('is-invalid');
        } else {
            passwordInput.classList.remove('is-invalid');
        }

        if (!isValid) {
            showError(errorMessage);
        }

        return isValid;
    }

    // Mock API call for login
    function mockLogin(email, password) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                // Simulate successful login for demo email/password
                if (email === 'test@example.com' && password === 'password123') {
                    resolve({ success: true, user: { email, name: 'Test User' } });
                } else {
                    reject(new Error('Invalid email or password.'));
                }
            }, 1000); // Simulate 1s network delay
        });
    }

    // Handle form submission
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Validate inputs
        if (!validateInputs()) {
            return;
        }

        // Disable button and show loading state
        submitButton.disabled = true;
        const originalButtonText = submitButton.querySelector('span').textContent;
        submitButton.querySelector('span').textContent = 'Signing In...';

        try {
            // Mock API call
            const response = await mockLogin(emailInput.value.trim(), passwordInput.value);

            // Handle Remember Me
            if (rememberMeCheckbox.checked) {
                localStorage.setItem('rememberedEmail', emailInput.value.trim());
            } else {
                localStorage.removeItem('rememberedEmail');
            }

            // Store user data (for demo purposes)
            sessionStorage.setItem('user', JSON.stringify(response.user));

            // Redirect to dashboard
            window.location.href = '../dashboard/index.html';
        } catch (error) {
            showError(error.message);
        } finally {
            // Re-enable button and restore text
            submitButton.disabled = false;
            submitButton.querySelector('span').textContent = originalButtonText;
        }
    });

    // Handle social login clicks
    socialIcons.forEach(icon => {
        icon.addEventListener('click', (e) => {
            e.preventDefault();
            const provider = icon.querySelector('i').classList.contains('fa-google') ? 'Google' :
                            icon.querySelector('i').classList.contains('fa-facebook-f') ? 'Facebook' : 'Twitter';
            console.log(`Initiating ${provider} login...`);
            // In a real app, this would redirect to the provider's OAuth flow
            showError(`${provider} login is not implemented in this demo.`);
        });
    });

    // Clear validation styles on input
    [emailInput, passwordInput].forEach(input => {
        input.addEventListener('input', () => {
            input.classList.remove('is-invalid');
            clearError();
        });
    });
});