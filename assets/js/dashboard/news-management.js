document.addEventListener('DOMContentLoaded', async () => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || user.role !== 'admin') {
        alert('Unauthorized access. Please log in as an admin.');
        window.location.href = '../../pages/auth/login.html';
        return;
    }

    // DOM elements
    const newsTable = document.getElementById('newsTable');
    const totalNews = document.getElementById('total-news');
    const searchNews = document.getElementById('search-news');
    const categoryFilter = document.getElementById('news-category-filter');
    const addNewsModal = new bootstrap.Modal(document.getElementById('addNewsModal'));
    const editNewsModal = new bootstrap.Modal(document.getElementById('editNewsModal'));
    const newsForm = document.getElementById('newsForm');
    const saveNewsBtn = document.getElementById('saveNews');
    const editNewsForm = document.getElementById('editNewsForm');
    const updateNewsBtn = document.getElementById('updateNews');
    const prevPage = document.getElementById('prev-page');
    const nextPage = document.getElementById('next-page');
    const imageInput = document.getElementById('newsImage');
    const imagePreview = document.getElementById('imagePreview');
    const editImageInput = document.getElementById('editNewsImage');
    const editImagePreview = document.getElementById('editImagePreview');
    
    // State
    let newsPosts = [];
    let currentPage = 1;
    const postsPerPage = 10;
    let currentFilter = 'all';
    let searchQuery = '';

    // Image handling
    imageInput.addEventListener('change', function() {
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                imagePreview.src = e.target.result;
                imagePreview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    });

    editImageInput.addEventListener('change', function() {
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                editImagePreview.src = e.target.result;
                editImagePreview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    });


    async function loadNews(page = 1, filter = 'all', query = '') {
        try {
            const res = await fetch('http://localhost:3000/news');
            if (!res.ok) {
                throw new Error(`Failed to fetch news: ${res.status} - ${res.statusText}`);
            }
            const data = await res.json();
            newsPosts = Array.isArray(data) ? data : [];


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


            totalNews.textContent = filteredPosts.length;


            const totalPages = Math.ceil(filteredPosts.length / postsPerPage);
            const start = (page - 1) * postsPerPage;
            const paginatedPosts = filteredPosts.slice(start, start + postsPerPage);


            newsTable.innerHTML = '';


            if (paginatedPosts.length === 0) {
                newsTable.innerHTML = '<tr><td colspan="6" class="text-center">No news posts found</td></tr>';
            } else {
                paginatedPosts.forEach(post => {
                    if (post && post.id && post.title && post.category && post.createdAt && post.isViewed !== undefined) {
                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td>${post.id}</td>
                            <td><a href="../../pages/news-page.html?id=${post.id}" class="text-primary text-decoration-none">${post.title}</a></td>
                            <td>${post.category}</td>
                            <td>${new Date(post.createdAt).toLocaleDateString('en-US')}</td>
                            <td><span class="badge ${post.isViewed ? 'badge-viewed' : 'badge-not-viewed'}">${post.isViewed ? 'Viewed' : 'Not Viewed'}</span></td>
                            <td>
                                <button class="btn btn-primary btn-sm btn-action edit-btn" data-id="${post.id}">Edit</button>
                                <button class="btn btn-danger btn-sm btn-action delete-btn" data-id="${post.id}">Delete</button>
                            </td>
                        `;
                        newsTable.appendChild(row);
                    } else {
                        console.warn('Invalid post data:', post);
                    }
                });
            }


            prevPage.style.display = page > 1 ? 'flex' : 'none';
            nextPage.style.display = page < totalPages ? 'flex' : 'none';
        } catch (error) {
            console.error('Error loading news:', error.message);
            newsTable.innerHTML = '<tr><td colspan="6" class="text-muted text-center">Failed to load news posts.</td></tr>';
        }
    }


    searchNews.addEventListener('input', () => {
        searchQuery = searchNews.value.trim();
        currentPage = 1;
        loadNews(currentPage, currentFilter, searchQuery);
    });

    categoryFilter.addEventListener('change', () => {
        currentFilter = categoryFilter.value;
        currentPage = 1;
        loadNews(currentPage, currentFilter, searchQuery);
    });


    prevPage.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            loadNews(currentPage, currentFilter, searchQuery);
        }
    });

    nextPage.addEventListener('click', () => {
        const totalPages = Math.ceil(newsPosts.length / postsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            loadNews(currentPage, currentFilter, searchQuery);
        }
    });


    saveNewsBtn.addEventListener('click', async () => {
        const title = document.getElementById('newsTitle').value.trim();
        const content = document.getElementById('newsContent').value.trim();
        const category = document.getElementById('newsCategory').value;
        const image = imageInput.files[0];

        if (!title || !content || !category || !image) {
            alert('Please fill in all required fields, including an image.');
            return;
        }

        if (!image.type.startsWith('image/')) {
            alert('Please select an image file.');
            return;
        }

        if (image.size > 5 * 1024 * 1024) {
            alert('Image size must be less than 5MB.');
            return;
        }

        try {
            const reader = new FileReader();
            const imageData = await new Promise((resolve) => {
                reader.onload = () => resolve(reader.result);
                reader.readAsDataURL(image);
            });

            const newPost = {
                title,
                content,
                category,
                image: imageData,
                createdAt: new Date().toISOString(),
                isViewed: false
            };

            console.log('New post data:', newPost);

            const res = await fetch('http://localhost:3000/news', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newPost)
            });

            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(`Failed to add news: ${res.status} - ${errorText}`);
            }

            const addedPost = await res.json();
            console.log('Added post response:', addedPost);

            alert('News post added successfully!');
            addNewsModal.hide();
            newsForm.reset();
            imagePreview.style.display = 'none';
            await loadNews(currentPage, currentFilter, searchQuery);
        } catch (error) {
            console.error('Error adding news:', error.message);
            alert(`Failed to add news post: ${error.message}`);
        }
    });


    newsTable.addEventListener('click', async (e) => {
        if (e.target.classList.contains('edit-btn')) {
            const newsId = e.target.dataset.id; 
            try {
                const res = await fetch(`http://localhost:3000/news/${newsId}`);
                if (!res.ok) throw new Error(`Failed to fetch news: ${res.status} - ${res.statusText}`);
                const post = await res.json();

                document.getElementById('editNewsId').value = post.id;
                document.getElementById('editNewsTitle').value = post.title;
                document.getElementById('editNewsContent').value = post.content;
                document.getElementById('editNewsCategory').value = post.category;
                editImagePreview.src = post.image;
                editImagePreview.style.display = 'block';

                editNewsModal.show();
            } catch (error) {
                console.error('Error fetching news for edit:', error.message);
                alert('Failed to load news post.');
            }
        }
    });


    updateNewsBtn.addEventListener('click', async () => {
        const id = document.getElementById('editNewsId').value; 
        const title = document.getElementById('editNewsTitle').value.trim();
        const content = document.getElementById('editNewsContent').value.trim();
        const category = document.getElementById('editNewsCategory').value;
        const image = editImageInput.files[0];
        let imageData = editImagePreview.src;

        if (!title || !content || !category) {
            alert('Please fill in all required fields.');
            return;
        }

        if (image) {
            if (!image.type.startsWith('image/')) {
                alert('Please select an image file.');
                return;
            }
            if (image.size > 5 * 1024 * 1024) {
                alert('Image size must be less than 5MB.');
                return;
            }
            const reader = new FileReader();
            imageData = await new Promise((resolve) => {
                reader.onload = () => resolve(reader.result);
                reader.readAsDataURL(image);
            });
        }

        try {
            const currentRes = await fetch(`http://localhost:3000/news/${id}`);
            if (!currentRes.ok) throw new Error(`Failed to fetch news: ${currentRes.status} - ${currentRes.statusText}`);
            const currentPost = await currentRes.json();

            const updatedPost = {
                id: id,
                title: title,
                content: content,
                category: category,
                image: imageData,
                createdAt: currentPost.createdAt,
                isViewed: currentPost.isViewed
            };

            const res = await fetch(`http://localhost:3000/news/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedPost)
            });

            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(`Failed to update news: ${res.status} - ${errorText}`);
            }

            alert('News post updated successfully!');
            editNewsModal.hide();
            await loadNews(currentPage, currentFilter, searchQuery);
        } catch (error) {
            console.error('Error updating news:', error.message);
            alert(`Failed to update news post: ${error.message}`);
        }
    });


    newsTable.addEventListener('click', async (e) => {
        if (e.target.classList.contains('delete-btn')) {
            const newsId = e.target.dataset.id; 
            if (!confirm('Are you sure you want to delete this news post?')) return;

            try {
                const res = await fetch(`http://localhost:3000/news/${newsId}`, {
                    method: 'DELETE'
                });

                if (!res.ok) {
                    const errorText = await res.text();
                    throw new Error(`Failed to delete news: ${res.status} - ${errorText}`);
                }

                alert('News post deleted successfully!');
                await loadNews(currentPage, currentFilter, searchQuery);
            } catch (error) {
                console.error('Error deleting news:', error.message);
                alert(`Failed to delete news post: ${error.message}`);
            }
        }
    });


    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('user');
        window.location.href = '../../pages/auth/login.html';
    });


    await loadNews(currentPage, currentFilter, searchQuery);
});