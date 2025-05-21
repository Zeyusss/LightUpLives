document.addEventListener('DOMContentLoaded', () => {
    // Check if jQuery is loaded
    if (typeof jQuery === 'undefined') {
        console.error('jQuery is not loaded. Please ensure jQuery is included before Owl Carousel.');
        return;
    } else {
        console.log('jQuery version:', jQuery.fn.jquery);
    }

    // Check if Owl Carousel is loaded
    if (typeof jQuery.fn.owlCarousel === 'undefined') {
        console.error('Owl Carousel is not loaded. Please ensure Owl Carousel JS is included.');
        return;
    }

    // Fetch Causes for sec3
    fetch('http://localhost:3000/causes')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.length === 0) {
                console.warn('No causes found in the JSON Server.');
                return;
            }
            const causesContainer = document.querySelector('.sec3 .row');
            causesContainer.innerHTML = ''; // Clear static cards
            data.forEach(cause => {
                const causeCard = `
                    <div class="col-sm-12 col-md-6 col-lg-4">
                        <div class="card">
                            <div class="overlay3">
                                <img src="${cause.image}" class="card-img-top" alt="${cause.title}">
                            </div>
                            <div class="card-body">
                                <h5 class="text-light">${cause.category}</h5>
                                <h4>${cause.title}</h4>
                                <p class="p2">${cause.description}</p>
                                <div class="progress-info">
                                    <span>Raised $${cause.raised.toLocaleString()}</span>
                                    <span>Goal $${cause.goal.toLocaleString()}</span>
                                </div>
                                <div class="progress">
                                    <div class="progress-bar" role="progressbar" style="width: ${cause.progress}%" 
                                        aria-valuenow="${cause.progress}" aria-valuemin="0" aria-valuemax="100">
                                        <span class="progress-text">$${cause.raised.toLocaleString()}</span>
                                        <span class="progress-percentage">${cause.progress}%</span>
                                    </div>
                                </div>
                                <button>
                                    <a href="#" class="text-capitalize">donate now</a> <i class="fa-solid fa-heart"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                causesContainer.innerHTML += causeCard;
            });
        })
        .catch(error => console.error('Error fetching causes:', error.message));

    // Fetch Articles for sec8
    fetch('http://localhost:3000/articles')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.length === 0) {
                console.warn('No articles found in the JSON Server.');
                return;
            }
            const articlesContainer = document.querySelector('.sec8 .row');
            articlesContainer.innerHTML = ''; // Clear static cards
            data.forEach(article => {
                const articleCard = `
                    <div class="col-sm-12 col-md-6 col-lg-4">
                        <div class="parent">
                            <div class="overlay3">
                                <h5 class="div5 text-light">${article.category}</h5>
                                <img src="${article.image}" class="card-img-top" alt="${article.title}">
                            </div>
                            <div class="card-body">
                                <h4><a href="#">${article.title}</a></h4>
                                <p class="p2">${article.description}</p>
                                <hr>
                                <div class="card-footer">
                                    <span>${article.date}</span>
                                    <span>${article.comments}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                articlesContainer.innerHTML += articleCard;
            });
        })
        .catch(error => console.error('Error fetching articles:', error.message));

    // Initialize Owl Carousel for sec9 final-slider
    jQuery('.final-slider').owlCarousel({
        loop: true,
        margin: 20,
        nav: false,
        dots: false,
        autoplay: true,
        autoplayTimeout: 3000,
        responsive: {
            0: {
                items: 2 
            },
            768: {
                items: 4 
            },
            1200: {
                items: 6 
            }
        }
    });
});