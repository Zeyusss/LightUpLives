document.addEventListener('DOMContentLoaded', async () => {
    if (typeof bootstrap === 'undefined') {
        console.error('Bootstrap is not available. Ensure bootstrap.bundle.min.js is included.');
        return;
    }

    const addNewsModalElement = document.getElementById('addNewsModal');
    const editNewsModalElement = document.getElementById('editNewsModal');
    if (!addNewsModalElement || !editNewsModalElement) {
        console.error('Modal elements not found. Check IDs: addNewsModal, editNewsModal');
        return;
    }

    const addNewsModal = new bootstrap.Modal(addNewsModalElement);
    const editNewsModal = new bootstrap.Modal(editNewsModalElement);

    const newsTable = document.getElementById('newsTable');
    const totalNews = document.getElementById('total-news');
    const searchNews = document.getElementById('search-news');
    const categoryFilter = document.getElementById('news-category-filter');
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

    let events = [];
    let currentPage = 1;
    const postsPerPage = 10;
    let currentFilter = 'all';
    let searchQuery = '';

    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || user.role !== 'admin') {
        alert('Unauthorized access. Please log in as an admin.');
        window.location.href = '../../pages/auth/login.html';
        return;
    }

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

    async function loadEvents(page = 1, filter = 'all', query = '') {
        try {
            const res = await fetch('http://localhost:3000/events');
            if (!res.ok) throw new Error(`Failed to fetch events: ${res.status}`);
            events = await res.json();

            let filteredEvents = events;
            if (filter !== 'all') {
                filteredEvents = filteredEvents.filter(event => event.category === filter);
            }
            if (query) {
                filteredEvents = filteredEvents.filter(event => 
                    event.title.toLowerCase().includes(query.toLowerCase()) || 
                    event.description.toLowerCase().includes(query.toLowerCase())
                );
            }

            totalNews.textContent = filteredEvents.length;
            const start = (page - 1) * postsPerPage;
            const paginatedEvents = filteredEvents.slice(start, start + postsPerPage);

            newsTable.innerHTML = paginatedEvents.length === 0 
                ? '<tr><td colspan="6" class="text-center">No events found</td></tr>'
                : paginatedEvents.map(event => `
                    <tr>
                        <td>${event.id}</td>
                        <td><a href="#" class="text-primary">${event.title}</a></td>
                        <td>${event.category || 'N/A'}</td>
                        <td>${new Date(event.date).toLocaleDateString('en-GB')}</td>
                        <td><span class="badge ${event.isViewed ? 'badge-success' : 'badge-warning'}">${event.isViewed ? 'Yes' : 'No'}</span></td>
                        <td>
                            <button class="btn btn-primary btn-sm edit-btn" data-id="${event.id}">Edit</button>
                            <button class="btn btn-danger btn-sm delete-btn" data-id="${event.id}">Delete</button>
                        </td>
                    </tr>
                `).join('');

            const totalPages = Math.ceil(filteredEvents.length / postsPerPage);
            [prevPage, nextPage].forEach(el => el.style.display = totalPages > 1 ? 'inline-block' : 'none');
            if (page > 1) prevPage.style.display = 'inline-block';
            if (page < totalPages) nextPage.style.display = 'inline-block';
        } catch (error) {
            console.error('Error:', error.message);
            newsTable.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Failed to load events.</td></tr>';
        }
    }

    searchNews.addEventListener('input', () => {
        searchQuery = searchNews.value.trim();
        currentPage = 1;
        loadEvents(currentPage, currentFilter, searchQuery);
    });

    categoryFilter.addEventListener('change', () => {
        currentFilter = categoryFilter.value;
        currentPage = 1;
        loadEvents(currentPage, currentFilter, searchQuery);
    });

    prevPage.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            loadEvents(currentPage, currentFilter, searchQuery);
        }
    });

    nextPage.addEventListener('click', () => {
        const totalPages = Math.ceil(events.length / postsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            loadEvents(currentPage, currentFilter, searchQuery);
        }
    });

    saveNewsBtn.addEventListener('click', async () => {
        const title = document.getElementById('newsTitle').value.trim();
        const content = document.getElementById('newsContent').value.trim();
        const category = document.getElementById('newsCategory').value;
        const image = imageInput.files[0];

        if (!title || !content || !image) {
            alert('Please fill all required fields.');
            return;
        }

        const reader = new FileReader();
        reader.onload = async function(e) {
            const newEvent = {
                id: `e${Date.now()}`,
                title, content, category,
                date: new Date().toISOString().split('T')[0],
                location: "8502 Preston Rd, Inglewood, Maine 98380",
                description: content,
                organizerImage: e.target.result,
                organizerName: "Admin User",
                imageClass: `event-image-${Math.floor(Math.random() * 5) + 1}`,
                isFree: true,
                isViewed: false
            };

            try {
                const res = await fetch('http://localhost:3000/events', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newEvent)
                });
                if (!res.ok) throw new Error('Failed to add event');
                addNewsModal.hide();
                newsForm.reset();
                imagePreview.style.display = 'none';
                loadEvents(currentPage, currentFilter, searchQuery);
                alert('Event added successfully!');
            } catch (error) {
                console.error('Error:', error.message);
                alert('Failed to add event.');
            }
        };
        reader.readAsDataURL(image);
    });

    newsTable.addEventListener('click', async (e) => {
        if (e.target.classList.contains('edit-btn')) {
            const eventId = e.target.dataset.id;
            try {
                const res = await fetch(`http://localhost:3000/events/${eventId}`);
                if (!res.ok) throw new Error('Failed to fetch event');
                const event = await res.json();

                document.getElementById('editNewsId').value = event.id;
                document.getElementById('editNewsTitle').value = event.title;
                document.getElementById('editNewsContent').value = event.description;
                document.getElementById('editNewsCategory').value = event.category || 'all';
                editImagePreview.src = event.organizerImage;
                editImagePreview.style.display = 'block';

                editNewsModal.show();
            } catch (error) {
                console.error('Error:', error.message);
                alert('Failed to load event.');
            }
        }

        if (e.target.classList.contains('delete-btn')) {
            const eventId = e.target.dataset.id;
            if (confirm('Are you sure?')) {
                try {
                    const res = await fetch(`http://localhost:3000/events/${eventId}`, { method: 'DELETE' });
                    if (!res.ok) throw new Error('Failed to delete event');
                    loadEvents(currentPage, currentFilter, searchQuery);
                    alert('Event deleted successfully!');
                } catch (error) {
                    console.error('Error:', error.message);
                    alert('Failed to delete event.');
                }
            }
        }
    });

    updateNewsBtn.addEventListener('click', async () => {
        const id = document.getElementById('editNewsId').value;
        const title = document.getElementById('editNewsTitle').value.trim();
        const content = document.getElementById('editNewsContent').value.trim();
        const category = document.getElementById('editNewsCategory').value;
        const image = editImageInput.files[0];
        let organizerImage = editImagePreview.src;

        if (!title || !content) {
            alert('Please fill all required fields.');
            return;
        }

        if (image) {
            const reader = new FileReader();
            reader.onload = async function(e) {
                organizerImage = e.target.result;
                await updateEvent(id, title, content, category, organizerImage);
            };
            reader.readAsDataURL(image);
        } else {
            await updateEvent(id, title, content, category, organizerImage);
        }
    });

    async function updateEvent(id, title, content, category, organizerImage) {
        try {
            const res = await fetch(`http://localhost:3000/events/${id}`);
            if (!res.ok) throw new Error('Failed to fetch event');
            const event = await res.json();

            const updatedEvent = {
                ...event,
                title, description: content, category,
                organizerImage, isViewed: event.isViewed
            };

            const resUpdate = await fetch(`http://localhost:3000/events/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedEvent)
            });
            if (!resUpdate.ok) throw new Error('Failed to update event');
            editNewsModal.hide();
            loadEvents(currentPage, currentFilter, searchQuery);
            alert('Event updated successfully!');
        } catch (error) {
            console.error('Error:', error.message);
            alert('Failed to update event.');
        }
    }

    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('user');
        window.location.href = '../../pages/auth/login.html';
    });

    try {
        await loadEvents(currentPage, currentFilter, searchQuery);
    } catch (error) {
        console.error('Initialization error:', error);
    }
});