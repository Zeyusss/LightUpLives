document.addEventListener('DOMContentLoaded', function () {

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


  const testimonialCarousel = document.querySelector('#carouselExampleSlidesOnly');
  if (testimonialCarousel) {
    new bootstrap.Carousel(testimonialCarousel, {
      interval: 5000, 
      ride: 'carousel',
      pause: 'hover', 
      wrap: true 
    });
  } else {
    console.warn('Testimonial carousel not found');
  }


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


  const donateButtons = document.querySelectorAll('.button1 a, button a[href*="#donate"]');
  donateButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      
      alert('Redirecting to donation page...');
      
    });
  });

  const volunteerButtons = document.querySelectorAll('a[href*="#volunteer"], button a[href*="#become-volunteer"]');
  volunteerButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      
      alert('Redirecting to volunteer sign-up page...');
      
    });
  });


  const progressBars = document.querySelectorAll('.progress-bar');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const bar = entry.target;
        if (!bar.classList.contains('animated')) {
          bar.classList.add('animated');
          const width = bar.style.width;
          bar.style.width = '0%';
          setTimeout(() => {
            bar.style.transition = 'width 1.5s ease-in-out';
            bar.style.width = width;
          }, 100);
        }
      }
    });
  }, { threshold: 0.5 });

  progressBars.forEach(bar => observer.observe(bar));


  const videoLink = document.querySelector('.video a');
  if (videoLink) {
    videoLink.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        window.open(videoLink.href, '_blank');
      }
    });
  }
});
