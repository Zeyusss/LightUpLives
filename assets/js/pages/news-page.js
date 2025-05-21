document.addEventListener('DOMContentLoaded', async function () {
    const article = document.querySelector('article');
    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get('id'); 

    if (!postId) {
        article.innerHTML = '<p class="text-muted text-center">No post selected. Please select a valid news post.</p>';
        return;
    }

    async function fetchPost(id) {
        try {
            article.innerHTML = '<div class="text-center my-5"><i class="fas fa-spinner fa-spin fa-2x"></i><p class="mt-3">Loading post...</p></div>';
            
            const res = await fetch(`http://localhost:3000/news/${id}`);
            if (!res.ok) {
                throw new Error(`Failed to fetch post: ${res.status} - ${res.statusText}`);
            }
            
            const post = await res.json();
            if (!post || !post.id || !post.title || !post.category || !post.createdAt || !post.content || !post.image) {
                throw new Error('Invalid post data');
            }
            
            renderPost(post);
            
            if (!post.isViewed) {
                await updatePostView(id);
            }
            
            await fetchRelatedPosts(post.category, id);
        } catch (error) {
            console.error('Error fetching post:', error.message);
            article.innerHTML = `
                <div class="alert alert-danger">
                    <p><i class="fas fa-exclamation-triangle me-2"></i>Failed to load post: ${error.message}</p>
                    <p class="mb-0">The requested post (ID: ${id}) was not found. Please <a href="news.html">return to news listing</a> and select a valid post.</p>
                </div>
            `;
        }
    }

    async function updatePostView(id) {
        try {
            const res = await fetch(`http://localhost:3000/news/${id}`);
            if (!res.ok) {
                throw new Error(`Failed to fetch post for update: ${res.status} - ${res.statusText}`);
            }
            
            const post = await res.json();
            
            const updatedPost = {
                ...post,
                isViewed: true
            };
            
            const updateRes = await fetch(`http://localhost:3000/news/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedPost)
            });
            
            if (!updateRes.ok) {
                const errorText = await updateRes.text();
                throw new Error(`Failed to update view: ${updateRes.status} - ${errorText}`);
            }
            
            const commentsIndicator = document.querySelector('.comments');
            if (commentsIndicator) {
                commentsIndicator.innerHTML = '<i class="fa-solid fa-comments me-2"></i>Viewed';
            }
        } catch (error) {
            console.error('Error updating view:', error.message);
        }
    }

    async function fetchRelatedPosts(category, currentId) {
        try {
            const res = await fetch('http://localhost:3000/news');
            if (!res.ok) {
                throw new Error(`Failed to fetch related posts: ${res.status} - ${res.statusText}`);
            }
            
            const allPosts = await res.json();
            const relatedPosts = allPosts
                .filter(post => post && post.category === category && post.id !== currentId)
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .slice(0, 2);
            
            updateRelatedPostLinks(relatedPosts, currentId);
        } catch (error) {
            console.error('Error fetching related posts:', error.message);
        }
    }

    function updateRelatedPostLinks(relatedPosts, currentId) {
        const navigation = document.querySelector('.previous-next-posts');
        if (!navigation) return;
        
        const prevContainer = navigation.querySelector('.teleport:first-child');
        const nextContainer = navigation.querySelector('.teleport:last-child');
        
        if (relatedPosts.length === 0) {
            navigation.style.display = 'none';
            return;
        }
        
        if (relatedPosts.length === 1) {
            prevContainer.style.visibility = 'hidden';
            
            const post = relatedPosts[0];
            const titlePreview = post.title.length > 35 ? post.title.substring(0, 32) + '...' : post.title;
            
            nextContainer.innerHTML = `
                <a href="news-page.html?id=${post.id}">
                    <span class="recolor">NEXT</span><br>${titlePreview}
                </a>
                <i class="fa-solid fa-arrow-right ms-2"></i>
            `;
        } else if (relatedPosts.length >= 2) {
            const prevPost = relatedPosts[0];
            const nextPost = relatedPosts[1];
            
            const prevTitlePreview = prevPost.title.length > 35 ? prevPost.title.substring(0, 32) + '...' : prevPost.title;
            const nextTitlePreview = nextPost.title.length > 35 ? nextPost.title.substring(0, 32) + '...' : nextPost.title;
            
            prevContainer.innerHTML = `
                <i class="fa-solid fa-arrow-left me-2"></i>
                <a href="news-page.html?id=${prevPost.id}">
                    <span class="recolor">PREVIOUS</span><br>${prevTitlePreview}
                </a>
            `;
            
            nextContainer.innerHTML = `
                <a href="news-page.html?id=${nextPost.id}">
                    <span class="recolor">NEXT</span><br>${nextTitlePreview}
                </a>
                <i class="fa-solid fa-arrow-right ms-2"></i>
            `;
        }
    }

    function renderPost(post) {
        const formattedDate = new Date(post.createdAt).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        const formattedContent = post.content
            .split('\n')
            .filter(para => para.trim() !== '')
            .map(para => `<p>${para}</p>`)
            .join('');
        
        article.innerHTML = `
            <div class="post-image">
                <img src="${post.image}" class="img-fluid" alt="${post.title}" onerror="this.src='../../assets/images/placeholder.jpg'">
            </div>
            <h1 class="post-title mt-4">${post.title}</h1>
            <div class="post-meta">
                <span class="category"><i class="fa-solid fa-tag me-2"></i>${post.category}</span>
                <span class="date"><i class="fa-solid fa-calendar me-2"></i>${formattedDate}</span>
                <span class="comments"><i class="fa-solid fa-${post.isViewed ? 'comments' : 'comment'} me-2"></i>${post.isViewed ? 'Viewed' : 'No Comments'}</span>
            </div>
            <div class="post-content mt-4">
                ${formattedContent}
                <div id="comments-section" class="mt-4">
                    ${renderComments(post.id)}
                </div>
                <nav class="previous-next-posts mt-5" aria-label="Post navigation">
                    <div class="teleport">
                        <i class="fa-solid fa-arrow-left me-2"></i>
                        <a href="#">Loading...</a>
                    </div>
                    <div class="text-end teleport">
                        <a href="#">Loading...</a>
                        <i class="fa-solid fa-arrow-right ms-2"></i>
                    </div>
                </nav>
                <section class="comment-form mt-5">
                    <h3>Leave a Reply</h3>
                    <p class="mb-4">Your email address will not be published. Required fields are marked *</p>
                    <form aria-label="Comment submission form" id="commentForm">
                        <div class="mb-3">
                            <textarea class="form-control" rows="5" placeholder="Comment *" aria-label="Comment text" required></textarea>
                        </div>
                        <div class="row">
                            <div class="col-md-4 mb-3">
                                <input type="text" class="form-control" placeholder="Name *" aria-label="Name" required>
                            </div>
                            <div class="col-md-4 mb-3">
                                <input type="email" class="form-control" placeholder="Email *" aria-label="Email" required>
                            </div>
                            <div class="col-md-4 mb-3">
                                <input type="url" class="form-control" placeholder="Website" aria-label="Website">
                            </div>
                        </div>
                        <div class="form-check mt-3">
                            <input class="form-check-input" type="checkbox" id="save-info">
                            <label class="form-check-label" for="save-info">
                                Save my name, email, and website in this browser for the next time I comment.
                            </label>
                        </div>
                        <button type="submit" class="btn comment-btn mt-4" aria-label="Submit comment">
                            Post Comment
                        </button>
                    </form>
                </section>
            </div>
        `;
        
        const commentForm = document.getElementById('commentForm');
        if (commentForm) {
            commentForm.addEventListener('submit', function(e) {
                e.preventDefault();
                const commentText = commentForm.querySelector('textarea').value.trim();
                const name = commentForm.querySelector('input[placeholder="Name *"]').value.trim();
                const email = commentForm.querySelector('input[placeholder="Email *"]').value.trim();
                const website = commentForm.querySelector('input[placeholder="Website"]').value.trim();

                if (!commentText || !name || !email) {
                    alert('Please fill in all required fields (Comment, Name, and Email).');
                    return;
                }

                const newComment = {
                    id: Date.now().toString(),
                    postId: postId,
                    text: commentText,
                    name: name,
                    email: email,
                    website: website || '',
                    date: new Date().toISOString()
                };

                let comments = JSON.parse(localStorage.getItem('comments') || '[]');
                comments.push(newComment);
                localStorage.setItem('comments', JSON.stringify(comments));

                commentForm.reset();
                commentForm.querySelector('#save-info').checked = false;
                renderComments(postId); 
                alert('Comment added successfully!');
            });
        }

       
        const searchInput = document.querySelector('.search-form input');
        const searchButton = document.querySelector('.search-form button');
        if (searchInput && searchButton) {
            searchButton.addEventListener('click', () => {
                const query = searchInput.value.trim();
                if (query) {
                    window.location.href = `news.html?search=${encodeURIComponent(query)}`;
                }
            });

            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && searchInput.value.trim()) {
                    window.location.href = `news.html?search=${encodeURIComponent(searchInput.value.trim())}`;
                }
            });
        }


        updateRecentPosts();


        updateCategories();
    }

    function renderComments(postId) {
        let comments = JSON.parse(localStorage.getItem('comments') || '[]');
        const postComments = comments.filter(comment => comment.postId === postId);
        
        if (postComments.length === 0) {
            return '<p class="text-muted">No comments yet.</p>';
        }

        return `
            <h4>Comments (${postComments.length})</h4>
            <div class="comments-list">
                ${postComments.map(comment => `
                    <div class="comment mb-3 p-3 border rounded" data-comment-id="${comment.id}">
                        <div class="d-flex justify-content-between align-items-start">
                            <div>
                                <h6>${comment.name} <small class="text-muted"><i class="fa-solid fa-calendar-days me-1"></i>${new Date(comment.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</small></h6>
                                <p>${comment.text}</p>
                                ${comment.website ? `<a href="${comment.website}" target="_blank" class="text-primary">${comment.website}</a>` : ''}
                            </div>
                            <div>
                                <button class="btn btn-sm btn-primary edit-comment-btn me-2" data-comment-id="${comment.id}">Edit</button>
                                <button class="btn btn-sm btn-danger delete-comment-btn" data-comment-id="${comment.id}">Delete</button>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }


    article.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-comment-btn')) {
            const commentId = e.target.dataset.commentId;
            if (confirm('Are you sure you want to delete this comment?')) {
                let comments = JSON.parse(localStorage.getItem('comments') || '[]');
                comments = comments.filter(comment => comment.id !== commentId);
                localStorage.setItem('comments', JSON.stringify(comments));
                renderComments(postId); 
                alert('Comment deleted successfully!');
            }
        }

        if (e.target.classList.contains('edit-comment-btn')) {
            const commentId = e.target.dataset.commentId;
            let comments = JSON.parse(localStorage.getItem('comments') || '[]');
            const commentToEdit = comments.find(comment => comment.id === commentId);

            if (commentToEdit) {
                const newText = prompt('Edit your comment:', commentToEdit.text);
                if (newText && newText.trim()) {
                    commentToEdit.text = newText.trim();
                    localStorage.setItem('comments', JSON.stringify(comments));
                    renderComments(postId); 
                    alert('Comment updated successfully!');
                } else if (newText !== null) {
                    alert('Comment text cannot be empty.');
                }
            }
        }
    });


    async function updateRecentPosts() {
        try {
            const res = await fetch('http://localhost:3000/news');
            if (!res.ok) {
                throw new Error(`Failed to fetch recent posts: ${res.status} - ${res.statusText}`);
            }
            const allPosts = await res.json();
            const recentPosts = allPosts
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .slice(0, 3);

            const recentPostsContainer = document.querySelector('.recent-posts');
            if (recentPostsContainer) {
                recentPostsContainer.innerHTML = '';
                recentPosts.forEach(post => {
                    if (post && post.id && post.title && post.createdAt && post.image) {
                        const item = document.createElement('div');
                        item.className = 'recent-post-item d-flex align-items-center mb-3';
                        item.innerHTML = `
                            <div class="recent-post-image">
                                <img src="${post.image}" class="img-fluid rounded" alt="${post.title}" onerror="this.src='../../assets/images/placeholder.jpg'">
                            </div>
                            <div class="recent-post-info ms-3">
                                <h6><a href="news-page.html?id=${post.id}">${post.title}</a></h6>
                                <span class="post-date"><i class="fa-solid fa-calendar-days me-1"></i>${new Date(post.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                            </div>
                        `;
                        recentPostsContainer.appendChild(item);
                    }
                });
            }
        } catch (error) {
            console.error('Error updating recent posts:', error.message);
        }
    }


    async function updateCategories() {
        try {
            const res = await fetch('http://localhost:3000/news');
            if (!res.ok) {
                throw new Error(`Failed to fetch categories: ${res.status} - ${res.statusText}`);
            }
            const allPosts = await res.json();
            const categories = [...new Set(allPosts.map(post => post.category).filter(cat => cat))];

            const categoriesContainer = document.querySelector('.categories-list');
            if (categoriesContainer) {
                categoriesContainer.innerHTML = '';
                categories.forEach(category => {
                    const li = document.createElement('li');
                    li.innerHTML = `
                        <a href="news.html?category=${encodeURIComponent(category)}">
                            <i class="fa-solid fa-angle-right me-2"></i>${category} <span class="count">(${allPosts.filter(post => post.category === category).length})</span>
                        </a>
                    `;
                    categoriesContainer.appendChild(li);
                });
            }
        } catch (error) {
            console.error('Error updating categories:', error.message);
        }
    }

    document.addEventListener('submit', function(e) {
        if (e.target && e.target.closest('.comment-form')) {
            e.preventDefault();
           
        }
    });

    if (postId) {
        fetchPost(postId);
    } else {
        article.innerHTML = '<div class="alert alert-warning mt-4"><p class="mb-0">No post selected. Please return to the <a href="news.html">news listing</a> and select a post.</p></div>';
    }
});