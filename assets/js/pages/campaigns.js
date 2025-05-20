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

  function truncateText(text, maxLength) {
    if (!text) return 'No description available.';
    return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
  }

  async function loadCampaigns(page = 1, reset = false) {
    try {
      const res = await fetch(`http://localhost:3000/campaigns?_page=${page}&_limit=${itemsPerPage}&approvalStatus=approved`);
      if (!res.ok) throw new Error(`Failed to fetch campaigns: ${res.status} ${res.statusText}`);
      const campaigns = await res.json();

      if (reset) {
        campaignsGrid.innerHTML = '';
        allCampaigns = [];
        currentPage = 1;
      }

      allCampaigns = [...allCampaigns, ...campaigns];
      renderCampaigns();

      if (campaigns.length < itemsPerPage) {
        loadMoreBtn.style.display = 'none';
      } else {
        loadMoreBtn.style.display = 'block';
      }
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
          const aProgress = (a.raisedAmount || 0) / (a.goal || 1000);
          const bProgress = (b.raisedAmount || 0) / (b.goal || 1000);
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

    const isAuthorizedForReport = ['admin', 'campaigner', 'backer'].includes(user.role);

    filteredCampaigns.forEach(c => {
      const daysLeft = c.endDate ? Math.ceil((new Date(c.endDate) - new Date()) / (1000 * 60 * 60 * 24)) : 'N/A';
      const raisedAmount = c.raisedAmount ?? 0;
      const goal = c.goal ?? 1000;
      const progressPercentage = ((raisedAmount / goal) * 100).toFixed(0);
      const truncatedDescription = truncateText(c.description, 100);

      const card = document.createElement('div');
      card.className = 'campaign-card';
      card.setAttribute('data-campaign-id', c.id);
      card.innerHTML = `
        <div class="campaign-image" style="background-image: url('${c.image || "default-image-url"}')">
          ${c.id === 1 ? '<span class="campaign-badge">Urgent</span>' : c.id === 3 ? '<span class="campaign-badge">Popular</span>' : c.id === 6 ? '<span class="campaign-badge">New</span>' : ''}
        </div>
        <div class="campaign-content">
          <span class="campaign-category">${c.category?.toUpperCase() || 'UNKNOWN'}</span>
          <h3 class="campaign-title">${c.title || 'Untitled'}</h3>
          <p class="campaign-desc">${truncatedDescription}</p>
          <span class="campaign-time"><i class="far fa-clock"></i> ${daysLeft} days left</span>
          <div class="campaign-progress">
            <div class="progress">
              <div class="progress-bar" role="progressbar" style="width: ${progressPercentage}%" aria-valuenow="${progressPercentage}" aria-valuemin="0" aria-valuemax="100">
                <span class="progress-text">$${raisedAmount.toLocaleString()}</span>
                <span class="progress-percentage">${progressPercentage}%</span>
              </div>
            </div>
            <div class="campaign-stats">
              <span>$${raisedAmount.toLocaleString()} raised</span>
              <span>$${goal.toLocaleString()} goal</span>
            </div>
          </div>
        </div>
        <div class="campaign-footer">
          <button class="donate-btn">Donate</button>
          ${isAuthorizedForReport ? `<button class="report-btn btn btn-outline-danger btn-sm" data-id="${c.id}" aria-label="Report campaign">Report Campaign</button>` : ''}
        </div>
      `;
      campaignsGrid.appendChild(card);
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
      const category = e.target.dataset.category;
      if (categoryFilter) {
        categoryFilter.value = category === 'all' ? '' : category;
        renderCampaigns();
      }
    });
  });

  await loadCampaigns(1, true);
});
