document.addEventListener('DOMContentLoaded', async function () {
  const user = JSON.parse(localStorage.getItem('user'));
  if (!user || user.role !== 'admin') {
    alert('You must be an admin to access this page.');
    window.location.href = '../../pages/auth/login.html';
    return;
  }

  // DOM Elements
  const filterAllBtn = document.getElementById('filterAll');
  const filterPendingBtn = document.getElementById('filterPending');
  const filterApprovedBtn = document.getElementById('filterApproved');
  const filterRejectedBtn = document.getElementById('filterRejected');
  const showCampaignModalBtn = document.getElementById('showCampaignModal');
  const hideCampaignModalBtn = document.getElementById('hideCampaignModal');
  const createCampaignBtn = document.getElementById('createCampaign');
  const campaignModal = document.querySelector('.campaign-modal');
  const container = document.getElementById('campaignsTable');
  const rejectionReasonModal = document.getElementById('rejectionReasonModal');
  const confirmRejectBtn = document.getElementById('confirmReject');
  const campaignTitleInput = document.getElementById('campaign-title');
  const campaignCategoryInput = document.getElementById('campaign-category');
  const campaignGoalInput = document.getElementById('campaign-goal');
  const campaignApprovalStatusInput = document.getElementById('campaign-approval-status');
  const campaignImageInput = document.getElementById('campaign-image');
  const campaignDescriptionInput = document.getElementById('campaign-description');
  const campaignStartDateInput = document.getElementById('campaign-start-date');
  const campaignEndDateInput = document.getElementById('campaign-end-date');
  let currentCampaignId = null;

  // load campaigns
  async function loadCampaigns(filterStatus = 'all') {
    try {
      const url = filterStatus === 'all' 
        ? 'http://localhost:3000/campaigns' 
        : `http://localhost:3000/campaigns?approvalStatus=${filterStatus}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to fetch campaigns: ${res.status} ${res.statusText}`);
      const campaigns = await res.json();
      console.log('Fetched campaigns:', campaigns); 
      container.innerHTML = '';

      if (campaigns.length === 0) {
        container.innerHTML = `<tr><td colspan="8" class="text-muted">No ${filterStatus === 'all' ? 'campaigns' : filterStatus + ' campaigns'}.</td></tr>`;
        return;
      }

      for (const c of campaigns) {
        if (!c.id) {
          console.warn(`Campaign missing ID:`, c); 
        }

        let campaignerName = 'Unknown';
        try {
          const userRes = await fetch(`http://localhost:3000/users/${c.creatorId}`);
          if (userRes.ok) {
            const campaigner = await userRes.json();
            campaignerName = campaigner.name || 'Unknown';
          } else {
            console.warn(`User with ID ${c.creatorId} not found for campaign ${c.id || 'unknown'}`);
          }
        } catch (error) {
          console.warn(`Error fetching user ${c.creatorId}:`, error);
        }

        const submissionDate = c.createdAt || c.startDate ? new Date(c.createdAt || c.startDate).toLocaleDateString() : 'Unknown';

        const isAuthorizedForReport = ['admin', 'campaigner', 'backer'].includes(user.role);
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${c.id || 'N/A'}</td>
          <td><img src="${c.image || '../../assets/images/dashboard/cleanpic.png'}" alt="${c.title || 'Untitled'}" class="campaign-image"></td>
          <td>${c.title || 'Untitled'}</td>
          <td>${campaignerName}</td>
          <td>${c.goal ? `$${c.goal.toLocaleString()}` : 'N/A'}</td>
          <td>${submissionDate}</td>
          <td><span class="badge badge-${c.approvalStatus === 'pending' ? 'pending' : c.approvalStatus === 'approved' ? 'success' : 'danger'}">${c.approvalStatus ? c.approvalStatus.toUpperCase() : 'UNKNOWN'}</span></td>
          <td>
            <div class="actions">
              <button class="btn btn-outline btn-sm view-campaign" data-id="${c.id || ''}">View</button>
              ${c.approvalStatus === 'pending' && c.id ? `
                <button class="btn btn-primary btn-sm approve-campaign" data-id="${c.id}">Approve</button>
                <button class="btn btn-outline btn-sm reject-campaign" data-id="${c.id}">Reject</button>
              ` : c.approvalStatus === 'pending' ? `
                <button class="btn btn-primary btn-sm approve-campaign disabled" disabled>Approve</button>
                <button class="btn btn-outline btn-sm reject-campaign disabled" disabled>Reject</button>
              ` : ''}
              ${isAuthorizedForReport && c.id ? `
                <button class="btn btn-warning btn-sm report-campaign" data-id="${c.id}">Report</button>
              ` : ''}
              <button class="btn btn-danger btn-sm delete-campaign" data-id="${c.id || ''}">Delete</button>

            </div>
          </td>`;
        container.appendChild(row);
      }
      document.querySelectorAll('.delete-campaign').forEach(button => {
  button.addEventListener('click', async (e) => {
    const campaignId = e.target.dataset.id;
    if (!campaignId) {
      alert('Error: No campaign selected for deletion.');
      return;
    }
    if (confirm('Are you sure you want to delete this campaign? This action cannot be undone.')) {
      try {
        const res = await fetch(`http://localhost:3000/campaigns/${campaignId}`, {
          method: 'DELETE'
        });
        if (res.ok) {
          alert('Campaign deleted successfully!');
          loadCampaigns(document.querySelector('.btn-outline.active')?.id.replace('filter', '').toLowerCase() || 'all');
        } else {
          throw new Error(`Failed to delete campaign: ${res.status} ${res.statusText}`);
        }
      } catch (error) {
        console.error('Error deleting campaign:', error);
        alert(`Failed to delete campaign: ${error.message}`);
      }
    }
  });
});


      document.querySelectorAll('.view-campaign').forEach(button => {
        button.addEventListener('click', (e) => {
          const campaignId = e.target.dataset.id;
          window.location.href = `../../pages/campaigns/campaign.html?id=${campaignId}`;
        });
      });

      document.querySelectorAll('.approve-campaign').forEach(button => {
        button.addEventListener('click', async (e) => {
          const campaignId = e.target.dataset.id;
          if (confirm('Are you sure you want to approve this campaign?')) {
            await updateCampaignStatus(campaignId, 'approved');
          }
        });
      });

      document.querySelectorAll('.reject-campaign').forEach(button => {
        button.addEventListener('click', (e) => {
          currentCampaignId = e.target.dataset.id;
          console.log('Reject button clicked, campaignId:', currentCampaignId, 'dataset:', e.target.dataset); 
          if (!currentCampaignId) {
            console.error('No campaign ID set for rejection, button dataset:', e.target.dataset);
            alert('Error: No campaign selected for rejection.');
            return;
          }
          try {
            $(rejectionReasonModal).modal('show');
          } catch (error) {
            console.error('Error showing rejection modal:', error);
            alert('Error: Failed to show rejection modal. Please check if jQuery and Bootstrap are loaded.');
          }
        });
      });

      document.querySelectorAll('.report-campaign').forEach(button => {
        button.addEventListener('click', (e) => {
          const campaignId = e.target.dataset.id;
          if (!campaignId) {
            console.error('No campaign ID for report, button dataset:', e.target.dataset);
            alert('Error: No campaign selected for reporting.');
            return;
          }
          
          alert(`Reporting campaign with ID: ${campaignId}`);
          
        });
      });
    } catch (error) {
      console.error('Error loading campaigns:', error.message, error.stack);
      container.innerHTML = `<tr><td colspan="8" class="text-muted">Failed to load campaigns: ${error.message}</td></tr>`;
    }
  }

  // update campaign
  async function updateCampaignStatus(campaignId, approvalStatus, rejectionReason = '') {
    try {
      console.log('Updating campaign:', { campaignId, approvalStatus, rejectionReason });
      const res = await fetch(`http://localhost:3000/campaigns/${campaignId}`);
      if (!res.ok) throw new Error(`Failed to fetch campaign: ${res.status} ${res.statusText}`);
      const campaign = await res.json();

      const updatedCampaign = {
        ...campaign,
        approvalStatus,
        status: approvalStatus === 'approved' ? 'confirmed' : campaign.status,
        rejectionReason: approvalStatus === 'rejected' ? rejectionReason : '',
      };

      const updateRes = await fetch(`http://localhost:3000/campaigns/${campaignId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedCampaign),
      });

      if (updateRes.ok) {
        alert(`Campaign ${approvalStatus} successfully!`);
        loadCampaigns(document.querySelector('.btn-outline.active')?.id.replace('filter', '').toLowerCase() || 'all');
      } else {
        throw new Error(`Failed to update campaign status: ${updateRes.status} ${updateRes.statusText}`);
      }
    } catch (error) {
      console.error('Error updating campaign status:', error.message, error.stack);
      alert(`Failed to update campaign status: ${error.message}`);
    }
  }

  filterAllBtn.addEventListener('click', () => {
    filterAllBtn.classList.add('active');
    filterPendingBtn.classList.remove('active');
    filterApprovedBtn.classList.remove('active');
    filterRejectedBtn.classList.remove('active');
    loadCampaigns('all');
  });

  filterPendingBtn.addEventListener('click', () => {
    filterPendingBtn.classList.add('active');
    filterAllBtn.classList.remove('active');
    filterApprovedBtn.classList.remove('active');
    filterRejectedBtn.classList.remove('active');
    loadCampaigns('pending');
  });

  filterApprovedBtn.addEventListener('click', () => {
    filterApprovedBtn.classList.add('active');
    filterAllBtn.classList.remove('active');
    filterPendingBtn.classList.remove('active');
    filterRejectedBtn.classList.remove('active');
    loadCampaigns('approved');
  });

  filterRejectedBtn.addEventListener('click', () => {
    filterRejectedBtn.classList.add('active');
    filterAllBtn.classList.remove('active');
    filterPendingBtn.classList.remove('active');
    filterApprovedBtn.classList.remove('active');
    loadCampaigns('rejected');
  });

  confirmRejectBtn.addEventListener('click', async () => {
    if (!currentCampaignId) {
      console.error('No campaign ID set for confirmation');
      alert('Error: No campaign selected for rejection.');
      $(rejectionReasonModal).modal('hide');
      return;
    }
    const rejectionReason = document.getElementById('rejectionReason').value.trim();
    console.log('Confirm reject clicked, campaignId:', currentCampaignId, 'reason:', rejectionReason);
    await updateCampaignStatus(currentCampaignId, 'rejected', rejectionReason);
    $(rejectionReasonModal).modal('hide');
    document.getElementById('rejectionReason').value = '';
    currentCampaignId = null;
  });

  showCampaignModalBtn.addEventListener('click', () => {
    campaignModal.classList.remove('d-none');
    document.getElementById('imagePreview').src = '../../assets/images/dashboard/cleanpic.png';
    campaignTitleInput.value = '';
    campaignCategoryInput.value = 'environment';
    campaignGoalInput.value = '';
    campaignApprovalStatusInput.value = 'pending';
    campaignImageInput.value = '';
    campaignDescriptionInput.value = '';
    campaignStartDateInput.value = '';
    campaignEndDateInput.value = '';
    createCampaignBtn.classList.remove('d-none');
    document.querySelector('.update-btn')?.classList.add('d-none');
    document.querySelectorAll('.alert-danger').forEach(alert => alert.classList.add('d-none'));
  });

  hideCampaignModalBtn.addEventListener('click', () => {
    campaignModal.classList.add('d-none');
  });

  campaignImageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        document.getElementById('imagePreview').src = e.target.result;
      };
      reader.readAsDataURL(file);
    } else {
      document.getElementById('imagePreview').src = '../../assets/images/dashboard/cleanpic.png';
    }
  });

  // create campaign
  createCampaignBtn.addEventListener('click', async () => {
    const title = campaignTitleInput.value.trim();
    const category = campaignCategoryInput.value;
    const goal = parseInt(campaignGoalInput.value);
    const approvalStatus = campaignApprovalStatusInput.value;
    const description = campaignDescriptionInput.value.trim();
    const startDate = campaignStartDateInput.value;
    const endDate = campaignEndDateInput.value;
    const imageFile = campaignImageInput.files[0];

    let isValid = true;
    if (!title || title.length < 3 || title.length > 50 || !/^[a-zA-Z0-9\s]+$/.test(title)) {
      document.querySelector('.title-alert').classList.remove('d-none');
      isValid = false;
    } else {
      document.querySelector('.title-alert').classList.add('d-none');
    }

    if (!['environment', 'education', 'health', 'community', 'technology', 'art-culture'].includes(category)) {
      document.querySelector('.category-alert').classList.remove('d-none');
      isValid = false;
    } else {
      document.querySelector('.category-alert').classList.add('d-none');
    }

    if (!goal || goal < 1000) {
      document.querySelector('.goal-alert').classList.remove('d-none');
      isValid = false;
    } else {
      document.querySelector('.goal-alert').classList.add('d-none');
    }

    if (!description || description.length < 150) {
      document.querySelector('.description-alert').classList.remove('d-none');
      isValid = false;
    } else {
      document.querySelector('.description-alert').classList.add('d-none');
    }

    if (!startDate) {
      document.querySelector('.start-date-alert').classList.remove('d-none');
      isValid = false;
    } else {
      document.querySelector('.start-date-alert').classList.add('d-none');
    }

    if (!endDate || new Date(endDate) <= new Date(startDate)) {
      document.querySelector('.end-date-alert').classList.remove('d-none');
      isValid = false;
    } else {
      document.querySelector('.end-date-alert').classList.add('d-none');
    }

    if (!['pending', 'approved', 'rejected'].includes(approvalStatus)) {
      document.querySelector('.status-alert').classList.remove('d-none');
      isValid = false;
    } else {
      document.querySelector('.status-alert').classList.add('d-none');
    }

    if (!isValid) return;

    let imageBase64 = '../../assets/images/dashboard/cleanpic.png';
    if (imageFile) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = async () => {
          const canvas = document.createElement('canvas');
          const maxWidth = 300;
          const scaleSize = maxWidth / img.width;
          canvas.width = maxWidth;
          canvas.height = img.height * scaleSize;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          imageBase64 = canvas.toDataURL('image/jpeg', 0.7);
          await submitCampaign();
        };
      };
      reader.readAsDataURL(imageFile);
    } else {
      await submitCampaign();
    }

    async function submitCampaign() {
      const campaignData = {
        creatorId: user.id,
        title,
        category,
        goal,
        description,
        image: imageBase64,
        approvalStatus,
        status: approvalStatus === 'approved' ? 'confirmed' : 'pending',
        startDate,
        endDate,
        amountRaised: 0,
        backers: 0,
        updates: [],
        rejectionReason: '',
        createdAt: new Date().toISOString(),
        donors:[],
        fundingStatus:[],
        creatorName:[]
      };

      try {
        const res = await fetch('http://localhost:3000/campaigns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(campaignData),
        });

        if (res.ok) {
          const newCampaign = await res.json();
          console.log('Created campaign:', newCampaign); 
          alert('Campaign created successfully!');
          campaignModal.classList.add('d-none');
          loadCampaigns(document.querySelector('.btn-outline.active')?.id.replace('filter', '').toLowerCase() || 'all');
        } else {
          throw new Error(`Failed to create campaign: ${res.status} ${res.statusText}`);
        }
      } catch (error) {
        console.error('Error creating campaign:', error.message, error.stack);
        alert(`Failed to create campaign: ${error.message}`);
      }
    }
  });
document.getElementById('logoutBtn').addEventListener('click', function () {
  localStorage.removeItem('user'); 
  window.location.href = '../../pages/auth/login.html'; 
});
  filterAllBtn.classList.add('active');
  await loadCampaigns('all');
});