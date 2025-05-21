document.addEventListener('DOMContentLoaded', async function () {
  const storiesContainer = document.querySelector('#stories .row:not(.mb-4):not(.mt-4)');
  const filterButtons = document.querySelectorAll('.filter-btn');
  const paginationContainer = document.querySelector('.pagination-custom');
  const statsCards = document.querySelectorAll('.stat-card');

  if (!storiesContainer) {
    console.error('Stories container not found');
    return;
  }
  if (!filterButtons || filterButtons.length === 0) {
    console.error('Filter buttons not found');
    return;
  }
  if (!paginationContainer) {
    console.error('Pagination container not found');
    return;
  }
  if (!statsCards || statsCards.length === 0) {
    console.error('Stats cards not found');
    return;
  }

  let allStories = [];
  let currentPage = 1;
  const itemsPerPage = 6;
  let currentFilter = 'All';

  function truncateText(text, maxLength) {
    if (!text) return 'No description available.';
    return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
  }

  function formatAmount(amount) {
    const num = parseFloat(amount) || 0;
    if (num >= 1000000) return `$${Math.round(num / 1000000 * 10) / 10}M`;
    if (num >= 1000) return `$${Math.round(num / 1000 * 10) / 10}K`;
    return `$${num.toLocaleString()}`;
  }

  function removeDuplicates(stories) {
    const seen = new Set();
    return stories.filter(story => {
      if (seen.has(story.id)) {
        console.warn('Duplicate story found:', story.id);
        return false;
      }
      seen.add(story.id);
      return true;
    });
  }

  async function fetchStats() {
    try {
      let stories = [];
      try {
        const storiesRes = await fetch('http://localhost:3000/success-stories');
        if (!storiesRes.ok) throw new Error(`Success stories fetch failed: ${storiesRes.status}`);
        stories = removeDuplicates(await storiesRes.json());
      } catch (error) {
        console.warn('Falling back to campaigns due to success-stories error:', error.message);
        const campaignsRes = await fetch('http://localhost:3000/campaigns?status=completed');
        if (!campaignsRes.ok) throw new Error(`Campaigns fetch failed: ${campaignsRes.status}`);
        stories = removeDuplicates(await campaignsRes.json());
        stories = stories.filter(story => story.raisedAmount >= story.goal || story.status === 'completed');
      }

      const totalFunds = stories.reduce((sum, s) => sum + (parseFloat(s.raisedAmount) || 0), 0);
      const successfulCampaigns = stories.length;
      const globalDonors = stories.length > 0 ? (parseInt(stories[0].donors, 10) || 50) : 'N/A';
      const countries = 42;

      statsCards[0].querySelector('.stat-number').textContent = formatAmount(totalFunds);
      statsCards[1].querySelector('.stat-number').textContent = successfulCampaigns.toLocaleString();
      statsCards[2].querySelector('.stat-number').textContent = `1654K`;
      statsCards[3].querySelector('.stat-number').textContent = countries;
    } catch (error) {
      console.error('Error fetching stats:', error.message);
      statsCards.forEach(card => {
        card.querySelector('.stat-number').textContent = 'N/A';
      });
    }
  }

async function loadSuccessStories() {
  storiesContainer.innerHTML = '<div class="col-12 text-center"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';
  try {
    let stories = [];
    try {
      const res = await fetch('http://localhost:3000/success-stories');
      if (!res.ok) throw new Error(`Failed to fetch success stories: ${res.status} ${res.statusText}`);
      stories = removeDuplicates(await res.json());
      console.log('Fetched success stories:', stories);
    } catch (error) {
      console.warn('Falling back to campaigns due to success-stories error:', error.message);
      const campaignsRes = await fetch('http://localhost:3000/campaigns?status=completed');
      if (!campaignsRes.ok) throw new Error(`Failed to fetch completed campaigns: ${campaignsRes.status} ${campaignsRes.statusText}`);
      stories = removeDuplicates(await campaignsRes.json());
      stories = stories.filter(story => story.raisedAmount >= story.goal || story.status === 'completed');
    }


    let campaigns = [];
    try {
      const campaignsRes = await fetch('http://localhost:3000/campaigns');
      if (!campaignsRes.ok) throw new Error('Failed to fetch campaigns');
      campaigns = await campaignsRes.json();
    } catch (err) {
      console.error('Error fetching campaigns:', err.message);
    }


    const campaignMap = Object.fromEntries(campaigns.map(c => [c.id, c]));


    allStories = stories.map(story => {
      const relatedCampaign = campaignMap[story.id] || campaignMap[story.campaignId];
      return {
        ...story,
        donors: relatedCampaign ? parseInt(relatedCampaign.donors, 10) || 0 : 0
      };
    });

    console.log('Merged success stories with real donors:', allStories);

    if (allStories.length === 0) {
      storiesContainer.innerHTML = '<p class="text-muted text-center">No success stories available yet. Check back soon!</p>';
      paginationContainer.style.display = 'none';
      return;
    }
    renderStories();
  } catch (error) {
    console.error('Error loading success stories:', error.message);
    storiesContainer.innerHTML = `<p class="text-muted">Failed to load success stories: ${error.message}</p>`;
    paginationContainer.style.display = 'none';
  }
}

  function renderStories() {
    const filteredStories = currentFilter === 'All'
      ? allStories
      : allStories.filter(story => story.category?.toLowerCase() === currentFilter.toLowerCase());

    const totalPages = Math.ceil(filteredStories.length / itemsPerPage) || 1;
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginatedStories = filteredStories.slice(start, end);

    storiesContainer.innerHTML = '';
    if (paginatedStories.length === 0) {
      storiesContainer.innerHTML = '<p class="text-muted text-center">No success stories found for this category.</p>';
      paginationContainer.style.display = 'none';
      return;
    }

   
    paginatedStories.forEach(story => {
      const raisedAmount = parseFloat(story.raisedAmount) || 0;
      const goal = parseFloat(story.goal) || 1000;
      const percentage = Math.min(((raisedAmount / goal) * 100).toFixed(0), 100);
      const donors = parseInt(story.donors, 10) || 50;
      const isFeatured = story.id === '1';

      const card = document.createElement('div');
      card.className = 'col-lg-4 col-md-6 mb-4';
      card.innerHTML = `
        <div class="success-card position-relative">
          ${isFeatured ? '<span class="featured-badge">Featured</span>' : ''}
          <div class="success-card-img">
            <img src="${story.image || '../../assets/images/success-stories/default-story.jpg'}" alt="${story.title || 'Success Story'}">
          </div>
          <div class="success-card-body">
            <span class="tag">${story.category?.toUpperCase() || 'UNKNOWN'}</span>
            <h3>${story.title || 'Untitled Story'}</h3>
            <p>${truncateText(story.description, 120)}</p>
            <div class="progress-custom">
              <div class="progress-bar-custom" role="progressbar" style="width: ${percentage}%" aria-valuenow="${percentage}" aria-valuemin="0" aria-valuemax="100">
                <span class="progress-text">${formatAmount(raisedAmount)}</span>
                <span class="percentage-win">${percentage}%</span>
              </div>
            </div>
          </div>
          <div class="success-card-footer">
            <div class="success-metrics">
              <span class="metric"><i class="fas fa-users"></i>Thanks For Our Donors</span>
              <span class="metric"><i class="fas fa-bullseye"></i> ${formatAmount(goal)} Goal</span>
            </div>
          </div>
        </div>
      `;
      storiesContainer.appendChild(card);
    });

    renderPagination(totalPages);
  }

  function renderPagination(totalPages) {
    paginationContainer.innerHTML = '';
    const prevItem = document.createElement('li');
    prevItem.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
    prevItem.innerHTML = `
      <a class="page-link" href="#" aria-label="Previous">
        <span aria-hidden="true">«</span>
      </a>
    `;
    paginationContainer.appendChild(prevItem);

    for (let i = 1; i <= totalPages; i++) {
      const pageItem = document.createElement('li');
      pageItem.className = `page-item ${i === currentPage ? 'active' : ''}`;
      pageItem.innerHTML = `<a class="page-link" href="#">${i}</a>`;
      paginationContainer.appendChild(pageItem);
    }

    const nextItem = document.createElement('li');
    nextItem.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
    nextItem.innerHTML = `
      <a class="page-link" href="#" aria-label="Next">
        <span aria-hidden="true">»</span>
      </a>
    `;
    paginationContainer.appendChild(nextItem);

    paginationContainer.querySelectorAll('.page-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const text = e.currentTarget.textContent;
        console.log('Clicked page:', text, 'Current Page:', currentPage, 'Total Pages:', totalPages);
        if (text === '«' && currentPage > 1) {
          currentPage--;
        } else if (text === '»' && currentPage < totalPages) {
          currentPage++;
        } else if (!isNaN(text)) {
          currentPage = parseInt(text);
        }
        renderStories();
      });
    });
  }

  filterButtons.forEach(button => {
    button.addEventListener('click', () => {
      filterButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      currentFilter = button.textContent;
      currentPage = 1;
      renderStories();
    });
  });

  await fetchStats();
  await loadSuccessStories();
});