document.addEventListener('DOMContentLoaded', function () {
  // Load header and footer placeholders
  const headerPlaceholder = document.getElementById('header-placeholder');
  if (headerPlaceholder) {
    fetch('../../components/header.html')
      .then(response => {
        if (!response.ok) throw new Error(`Header fetch failed: ${response.status}`);
        return response.text();
      })
      .then(data => {
        headerPlaceholder.innerHTML = data;
      })
      .catch(error => console.error('Error loading header:', error));
  } else {
    console.warn('Header placeholder not found');
  }

  const footerPlaceholder = document.getElementById('footer-placeholder');
  if (footerPlaceholder) {
    fetch('../../components/footer.html')
      .then(response => {
        if (!response.ok) throw new Error(`Footer fetch failed: ${response.status}`);
        return response.text();
      })
      .then(data => {
        footerPlaceholder.innerHTML = data;
      })
      .catch(error => console.error('Error loading footer:', error));
  } else {
    console.warn('Footer placeholder not found');
  }

  // Filter buttons for gallery
  const filterButtons = document.querySelectorAll('.sec2-header button');
  const galleryItems = document.querySelectorAll('.gal');

  filterButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Remove active class from all buttons
      filterButtons.forEach(btn => btn.classList.remove('active'));
      // Add active class to clicked button
      button.classList.add('active');

      const filter = button.getAttribute('data-filter');

      // Show/hide gallery items based on filter
      galleryItems.forEach(item => {
        const category = item.getAttribute('data-category');
        if (filter === 'all' || filter === category) {
          item.style.display = 'block';
          item.style.opacity = '1';
        } else {
          item.style.opacity = '0';
          setTimeout(() => {
            item.style.display = 'none';
          }, 500); // Match CSS transition duration
        }
      });
    });
  });

  // Smooth scroll for anchor links (if any)
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const targetId = this.getAttribute('href');
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        console.warn(`Target element ${targetId} not found`);
      }
    });
  });
});
