document.addEventListener('DOMContentLoaded', async () => {
    const newsContainer = document.querySelector('.col-lg-8 .row');
    const searchInput = document.querySelector('.search-input');
    const searchBtn = document.querySelector('.search-btn');
    const categoryLinks = document.querySelectorAll('.category-list a');
    const pagination = document.querySelector('.pagination');
    const recentPostsContainer = document.querySelector('.sidebar .recent-news-item') ? 
        document.querySelector('.sidebar .recent-news-item').parentElement : 
        document.querySelector('.sidebar .recent-posts-container');
    
    let newsPosts = [];
    let currentPage = 1;
    const postsPerPage = 2;
    let currentFilter = 'all';
    let searchQuery = '';

    async function loadNews(page = 1, filter = 'all', query = '') {
        try {
            newsContainer.innerHTML = '<div class="col-12 text-center"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';
            
            const res = await fetch('http://localhost:3000/news');
            if (!res.ok) {
                throw new Error(`Failed to fetch news: ${res.status} - ${res.statusText}`);
            }
            const data = await res.json();
            newsPosts = Array.isArray(data) ? data : [];

            newsPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));


            let filteredPosts = newsPosts;
            if (filter !== 'all') {
                filteredPosts = filteredPosts.filter(post => 
                    post && typeof post.category === 'string' && post.category.toLowerCase() === filter.toLowerCase()
                );
            }
            if (query) {
                filteredPosts = filteredPosts.filter(post => 
                    post && typeof post.title === 'string' && post.title.toLowerCase().includes(query.toLowerCase()) || 
                    post && typeof post.content === 'string' && post.content.toLowerCase().includes(query.toLowerCase())
                );
            }


            const totalPages = Math.ceil(filteredPosts.length / postsPerPage);
            const start = (page - 1) * postsPerPage;
            const paginatedPosts = filteredPosts.slice(start, start + postsPerPage);


            newsContainer.innerHTML = '';

            if (paginatedPosts.length === 0) {
                newsContainer.innerHTML = '<div class="col-12"><p class="text-muted text-center">No news posts found.</p></div>';
                return;
            }


            paginatedPosts.forEach(post => {
                if (post && post.id && post.title && post.category && post.createdAt && post.image) {
                    const card = document.createElement('div');
                    card.className = 'col-md-6 mb-4';
                    
                    const shortContent = post.content.length > 150 ? 
                        post.content.substring(0, 150) + '...' : 
                        post.content;
                    
                    card.innerHTML = `
                        <div class="card h-100 news-card" data-id="${post.id}">
                            <img src="${post.image}" class="card-img-top" alt="${post.title}" onerror="this.src='../../assets/images/placeholder.jpg'">
                            <span class="card-label">${post.category}</span>
                            <div class="card-body d-flex flex-column">
                                <h5 class="card-title">${post.title}</h5>
                                <p class="card-text flex-grow-1">${shortContent}</p>
                                <div class="d-flex justify-content-between align-items-center mt-3">
                                    <span class="card-date">
                                        <i class="fa-solid fa-calendar-alt me-1"></i>
                                        ${new Date(post.createdAt).toLocaleDateString('en-US', { 
                                            year: 'numeric', 
                                            month: 'long', 
                                            day: 'numeric' 
                                        })}
                                    </span>
                                    <span class="comments-status">
                                        <i class="fa-solid fa-comment${post.isViewed ? 's' : ''} me-1"></i>
                                        ${post.isViewed ? 'Viewed' : 'No Comments'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    `;
                    newsContainer.appendChild(card);
                } else {
                    console.warn('Invalid post data:', post);
                }
            });


            updatePagination(page, totalPages);


            loadRecentPosts();
        } catch (error) {
            console.error('Error loading news:', error.message);
            newsContainer.innerHTML = '<div class="col-12"><p class="text-muted text-center">Failed to load news posts.</p></div>';
        }
    }

    function updatePagination(currentPage, totalPages) {
        pagination.innerHTML = '';
        
        const prevItem = document.createElement('li');
        prevItem.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
        prevItem.innerHTML = `<a class="page-link" href="#" aria-label="Previous">
            <span aria-hidden="true">«</span>
        </a>`;
        pagination.appendChild(prevItem);
        
        for (let i = 1; i <= totalPages; i++) {
            const pageItem = document.createElement('li');
            pageItem.className = `page-item ${i === currentPage ? 'active' : ''}`;
            pageItem.innerHTML = `<a class="page-link" href="#">${i}</a>`;
            pagination.appendChild(pageItem);
        }
        
        const nextItem = document.createElement('li');
        nextItem.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
        nextItem.innerHTML = `<a class="page-link" href="#" aria-label="Next">
            <span aria-hidden="true">»</span>
        </a>`;
        pagination.appendChild(nextItem);
    }

    function loadRecentPosts() {
        if (!recentPostsContainer) return;
        
        const recentPosts = [...newsPosts].sort((a, b) => 
            new Date(b.createdAt) - new Date(a.createdAt)
        ).slice(0, 3);
        
        recentPostsContainer.innerHTML = '';
        
        recentPosts.forEach(post => {
            if (post && post.id && post.title && post.createdAt && post.image) {
                const item = document.createElement('div');
                item.className = 'recent-news-item';
                item.innerHTML = `
                    <a href="news-page.html?id=${post.id}" class="text-decoration-none">
                        <img src="${post.image}" class="recent-news-img" alt="${post.title}" 
                             onerror="this.src='../../assets/images/placeholder.jpg'">
                        <div class="recent-news-content">
                            <h6>${post.title}</h6>
                            <span class="recent-news-date">
                                <i class="fa-solid fa-calendar-alt me-1"></i>
                                ${new Date(post.createdAt).toLocaleDateString('en-US', { 
                                    year: 'numeric', 
                                    month: 'long', 
                                    day: 'numeric' 
                                })}
                            </span>
                        </div>
                    </a>
                `;
                recentPostsContainer.appendChild(item);
            }
        });
    }


    newsContainer.addEventListener('click', async (e) => {
        const card = e.target.closest('.news-card');
        if (!card) return;
        
        const newsId = card.dataset.id; 
        window.location.href = `news-page.html?id=${newsId}`;
    });


    pagination.addEventListener('click', (e) => {
        e.preventDefault();
        const pageLink = e.target.closest('.page-link');
        if (!pageLink) return;
        
        const pageItem = pageLink.parentElement;
        if (pageItem.classList.contains('disabled')) return;
        
        const pageContent = pageLink.textContent.trim();
        
        if (pageContent === '«') {
            currentPage--;
        } else if (pageContent === '»') {
            currentPage++;
        } else {
            currentPage = parseInt(pageContent); 
        }
        
        loadNews(currentPage, currentFilter, searchQuery);
        
        const newsSection = document.querySelector('.news-section') || newsContainer;
        newsSection.scrollIntoView({ behavior: 'smooth' });
    });


    searchBtn.addEventListener('click', () => {
        searchQuery = searchInput.value.trim();
        currentPage = 1;
        loadNews(currentPage, currentFilter, searchQuery);
    });

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchQuery = searchInput.value.trim();
            currentPage = 1;
            loadNews(currentPage, currentFilter, searchQuery);
        }
    });


    categoryLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            categoryLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            currentFilter = link.textContent.trim().toLowerCase();
            currentPage = 1;
            loadNews(currentPage, currentFilter, searchQuery);
        });
    });


    await loadNews(currentPage, currentFilter, searchQuery);
});