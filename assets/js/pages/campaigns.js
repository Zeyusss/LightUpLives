document.addEventListener('DOMContentLoaded', async function () {
  const user = JSON.parse(localStorage.getItem('user')) || { role: 'guest', id: 'anonymous' };
  const campaignsGrid = document.getElementById('campaigns-grid');
  const searchInput = document.getElementById('search-campaigns');
  const categoryFilter = document.getElementById('category-filter');
  const sortFilter = document.getElementById('sort-filter');
  const loadMoreBtn = document.getElementById('load-more-btn');
  const reportForm = document.getElementById('report-form');
  const reportCampaignModal = document.getElementById('reportCampaignModal');
  const reportCampaignIdInput = document.getElementById('reportCampaignId');

  let currentPage = 1;
  const itemsPerPage = 6;
  let allCampaigns = [];
  let lastFetchTime = 0;
  const cacheDuration = 60 * 1000;

  function truncateText(text, maxLength) {
    if (!text) return 'No description available.';
    return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
  }

  function updateCampaignUI(campaignCard, campaign) {
    console.log('Updating campaign card:', campaign);
    const campaignImage = campaignCard.querySelector('.campaign-image');
    const campaignTitle = campaignCard.querySelector('.campaign-title');
    const campaignDesc = campaignCard.querySelector('.campaign-desc');
    const campaignCategory = campaignCard.querySelector('.campaign-category');
    const progressBar = campaignCard.querySelector('.progress-bar');
    const progressText = progressBar?.querySelector('.progress-text');
    const progressPercentage = progressBar?.querySelector('.progress-percentage');
    const campaignTime = campaignCard.querySelector('.campaign-time');
    const statsSpans = campaignCard.querySelectorAll('.campaign-stats span');
    const footer = campaignCard.querySelector('.campaign-footer');

    if (campaignImage) {
      campaignImage.style.backgroundImage = `url(${campaign.image || '../assets/images/donation/children-participating-treasure-hunt.webp'})`;
    }
    if (campaignTitle) campaignTitle.textContent = campaign.title || 'Untitled';
    if (campaignDesc) campaignDesc.textContent = truncateText(campaign.description, 100);
    if (campaignCategory) campaignCategory.textContent = campaign.category?.toUpperCase() || 'UNKNOWN';
    if (campaignTime) {
      const daysLeft = campaign.endDate ? Math.ceil((new Date(campaign.endDate) - new Date()) / (1000 * 60 * 60 * 24)) : 'N/A';
      campaignTime.innerHTML = `<i class="far fa-clock"></i> ${daysLeft} days left`;
    }

    const raisedAmount = campaign.raisedAmount ?? campaign.amountRaised ?? 0;
    const goal = campaign.goal ?? 1000;
    const isCompleted = raisedAmount >= goal || campaign.status === 'completed';
    const percentage = Math.min(((raisedAmount / goal) * 100).toFixed(0), 100);

    if (progressBar) {
      progressBar.style.width = `${percentage}%`;
      progressBar.setAttribute('aria-valuenow', percentage);
      progressBar.classList.toggle('full', isCompleted);
    }
    if (progressText) progressText.textContent = `$${raisedAmount.toLocaleString()}`;
    if (progressPercentage) progressPercentage.textContent = `${percentage}%`;
    if (statsSpans.length >= 2) {
      statsSpans[0].textContent = `$${raisedAmount.toLocaleString()} raised`;
      statsSpans[1].textContent = `$${goal.toLocaleString()} goal`;
    }

    if (footer) {
      footer.innerHTML = isCompleted
        ? '<button class=" btn goal-reached-btn" disabled>Goal Reached</button>'
        : `
          <a href="donate.html?id=${campaign.id}" class="donate-btn">Donate</a>
          ${['admin', 'campaigner', 'backer'].includes(user.role) ? `<button class="report-btn btn btn-outline-danger btn-sm" data-id="${campaign.id}" aria-label="Report campaign">Report Campaign</button>` : ''}
        `;
    }
  }

  async function checkSuccessStoryExists(campaignId) {
    try {
      const res = await fetch(`http://localhost:3000/success-stories?campaignId=${campaignId}`);
      if (!res.ok) throw new Error('Failed to check success stories');
      const stories = await res.json();
      return stories.length > 0;
    } catch (error) {
      console.error('Error checking success stories:', error.message);
      return false;
    }
  }

  async function moveToSuccessStories(campaign) {
    try {

      if (campaign.status === 'completed' || await checkSuccessStoryExists(campaign.id)) {
        console.log('Campaign already in success stories:', campaign.id);
        return;
      }

      console.log('Moving to success stories:', campaign);

      const newSuccessId = `SS${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const successRes = await fetch('http://localhost:3000/success-stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: newSuccessId, 
          title: campaign.title || 'Untitled',
          description: campaign.description || 'No description available.',
          image: campaign.image || '../assets/images/success-stories/default-story.jpg',
          goal: campaign.goal || 1000,
          raisedAmount: campaign.raisedAmount ?? campaign.amountRaised ?? 0,
          donors: campaign.donors || 0, 
          category: campaign.category || 'UNKNOWN',
          endDate: campaign.endDate || null,
          campaignId: campaign.id,
          status: campaign.status || 'completed', 
          movedToSuccessAt: new Date().toISOString()
        }),
      });
      if (!successRes.ok) throw new Error(`Failed to move to success stories: ${successRes.statusText}`);

      const updateRes = await fetch(`http://localhost:3000/campaigns/${campaign.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      });
      if (!updateRes.ok) throw new Error(`Failed to update campaign status: ${updateRes.statusText}`);

      console.log('Successfully moved to success stories:', campaign.id);
      allCampaigns = allCampaigns.filter(c => c.id !== campaign.id);
      renderCampaigns();
    } catch (error) {
      console.error('Error moving to success stories:', error.message);
    }
  }

  async function loadCampaigns(page = 1, reset = false) {
    if (!campaignsGrid) return;
    campaignsGrid.innerHTML = '<div class="text-center"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';

    const now = Date.now();
    if (!reset && now - lastFetchTime < cacheDuration && allCampaigns.length > 0) {
      console.log('Using cached campaigns');
      renderCampaigns();
      return;
    }

    try {
      const res = await fetch(`http://localhost:3000/campaigns?_page=${page}&_limit=${itemsPerPage}&approvalStatus=approved`);
      if (!res.ok) throw new Error(`Failed to fetch campaigns: ${res.status} ${res.statusText}`);
      const campaigns = await res.json();
      console.log('Fetched campaigns:', campaigns);

      if (reset) {
        allCampaigns = [];
        currentPage = 1;
      }

      campaigns.forEach(campaign => {
        const existingIndex = allCampaigns.findIndex(c => c.id === campaign.id);
        if (existingIndex >= 0) {
          allCampaigns[existingIndex] = campaign;
        } else {
          allCampaigns.push(campaign);
        }

        const raisedAmount = campaign.raisedAmount ?? campaign.amountRaised ?? 0;
        const goal = campaign.goal ?? 1000;
        if (raisedAmount >= goal && !campaign.status) {
          moveToSuccessStories(campaign);
        }
      });

      lastFetchTime = now;
      renderCampaigns();
      loadMoreBtn.style.display = campaigns.length < itemsPerPage ? 'none' : 'block';
    } catch (error) {
      console.error('Error loading campaigns:', error.message);
      campaignsGrid.innerHTML = `<p class="text-muted">Failed to load campaigns: ${error.message}</p>`;
    }
  }

  function renderCampaigns() {
    if (!campaignsGrid) return;

    const searchQuery = searchInput?.value.trim().toLowerCase() || '';
    const selectedCategory = categoryFilter?.value || '';
    const sortOption = sortFilter?.value || '';

    let filteredCampaigns = allCampaigns;

    if (searchQuery) {
      filteredCampaigns = filteredCampaigns.filter(c => c.title?.toLowerCase().includes(searchQuery));
    }

    if (selectedCategory) {
      filteredCampaigns = filteredCampaigns.filter(c => c.category === selectedCategory);
    }

    if (sortOption) {
      filteredCampaigns = [...filteredCampaigns].sort((a, b) => {
        if (sortOption === 'newest') {
          return new Date(b.createdAt || '1970-01-01') - new Date(a.createdAt || '1970-01-01');
        } else if (sortOption === 'progress') {
          const aProgress = (a.raisedAmount || a.amountRaised || 0) / (a.goal || 1000);
          const bProgress = (b.raisedAmount || b.amountRaised || 0) / (b.goal || 1000);
          return bProgress - aProgress;
        } else if (sortOption === 'ending') {
          return new Date(a.endDate || '9999-12-31') - new Date(b.endDate || '9999-12-31');
        } else if (sortOption === 'amount') {
          return (b.goal || 0) - (a.goal || 0);
        }
        return 0;
      });
    }

    campaignsGrid.innerHTML = '';
    if (filteredCampaigns.length === 0) {
      campaignsGrid.innerHTML = '<p class="text-muted">No campaigns found.</p>';
      return;
    }

    filteredCampaigns.forEach(c => {
      const card = document.createElement('div');
      card.className = 'campaign-card';
      card.setAttribute('data-campaign-id', c.id);
      card.innerHTML = `
        <div class="campaign-image" style="background-image: url('${c.image || '../assets/images/donation/children-participating-treasure-hunt.webp'}')">
          ${c.id === 1 ? '<span class="campaign-badge">Urgent</span>' : c.id === 3 ? '<span class="campaign-badge">Popular</span>' : c.id === 6 ? '<span class="campaign-badge">New</span>' : ''}
        </div>
        <div class="campaign-content">
          <span class="campaign-category"></span>
          <h3 class="campaign-title"></h3>
          <p class="campaign-desc"></p>
          <span class="campaign-time"></span>
          <div class="campaign-progress">
            <div class="progress">
              <div class="progress-bar" role="progressbar" style="width: 0%" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
                <span class="progress-text">$0</span>
                <span class="progress-percentage">0%</span>
              </div>
            </div>
            <div class="campaign-stats">
              <span>$0 raised</span>
              <span>$0 goal</span>
            </div>
          </div>
        </div>
        <div class="campaign-footer"></div>
      `;
      campaignsGrid.appendChild(card);
      updateCampaignUI(card, c);
    });

    document.querySelectorAll('.report-btn').forEach(button => {
      button.addEventListener('click', (e) => {
        const campaignId = e.target.dataset.id;
        if (!campaignId) {
          alert('Error: No campaign selected for reporting.');
          return;
        }
        reportCampaignIdInput.value = campaignId;
        try {
          $(reportCampaignModal).modal('show');
        } catch (error) {
          alert('Failed to open report modal. Make sure jQuery and Bootstrap are loaded.');
        }
      });
    });
  }

  reportForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const userName = document.getElementById('reportUserName')?.value.trim();
    const description = document.getElementById('reportDescription')?.value.trim();
    const campaignId = reportCampaignIdInput?.value;

    if (!userName || !description || !campaignId) {
      alert('Please fill in all fields and select a valid campaign.');
      return;
    }

    const newReport = {
      id: `R${Math.floor(Math.random() * 10000).toString().padStart(3, '0')}`,
      campaignId,
      userId: user.id || 'anonymous',
      userName,
      description,
      status: 'pending',
      createdAt: new Date().toISOString(),
      rejectReason: '',
    };

    try {
      const res = await fetch('http://localhost:3000/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newReport),
      });

      if (res.ok) {
        alert('Report submitted successfully!');
        $(reportCampaignModal).modal('hide');
        reportForm.reset();
        reportCampaignIdInput.value = '';
      } else {
        throw new Error(`Failed to submit report: ${res.status}`);
      }
    } catch (error) {
      alert(`Failed to submit report: ${error.message}`);
    }
  });

  searchInput?.addEventListener('input', () => renderCampaigns());
  categoryFilter?.addEventListener('change', () => renderCampaigns());
  sortFilter?.addEventListener('change', () => renderCampaigns());
  loadMoreBtn?.addEventListener('click', () => {
    currentPage++;
    loadCampaigns(currentPage);
  });

  document.querySelectorAll('.category-pill').forEach(pill => {
    pill.addEventListener('click', (e) => {
      document.querySelectorAll('.category-pill').forEach(p => p.classList.remove('active'));
      e.target.classList.add('active');
      const category = e.target.dataset.category.toLowerCase();
      categoryFilter.value = category === 'all' ? '' : category;
      console.log('Category filter set to:', categoryFilter.value);
      renderCampaigns();
    });
  });


  window.addEventListener('focus', () => {
    const now = Date.now();
    if (now - lastFetchTime >= cacheDuration) {
      loadCampaigns(currentPage, true);
    } else {
      console.log('Skipping refresh, using cached campaigns');
      renderCampaigns();
    }
  });

  await loadCampaigns(1, true);
});