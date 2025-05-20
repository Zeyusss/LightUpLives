document.addEventListener('DOMContentLoaded', async function () {
  const user = JSON.parse(localStorage.getItem('user'));
  if (!user || user.role !== 'admin') {
    alert('You must be an admin to access this page.');
    window.location.href = '../../pages/auth/login.html';
    return;
  }
  // DOM Elements
  const filterPendingBtn = document.getElementById('filterPending');
  const filterApprovedBtn = document.getElementById('filterApproved');
  const filterRejectedBtn = document.getElementById('filterRejected');
  const container = document.getElementById('pendingCampaignsTable');
  const rejectionReasonModal = document.getElementById('rejectionReasonModal');
  const confirmRejectBtn = document.getElementById('confirmReject');
  let currentCampaignId = null;
  
  async function loadCampaigns(filterStatus = 'pending') {
    try {
      const res = await fetch(`http://localhost:3000/campaigns?approvalStatus=${filterStatus}`);
      if (!res.ok) throw new Error(`Failed to fetch campaigns: ${res.status} ${res.statusText}`);
      const campaigns = await res.json();
      container.innerHTML = '';
      if (campaigns.length === 0) {
        container.innerHTML = `<tr><td colspan="6" class="text-muted">No ${filterStatus} campaigns.</td></tr>`;
        return;
      }
      for (const c of campaigns) {
        let campaignerName = 'Unknown';
        try {
          const userRes = await fetch(`http://localhost:3000/users/${c.creatorId}`);
          if (userRes.ok) {
            const campaigner = await userRes.json();
            campaignerName = campaigner.name || 'Unknown';
          } else {
            console.warn(`User with ID ${c.creatorId} not found for campaign ${c.id}`);
          }
        } catch (error) {
          console.warn(`Error fetching user ${c.creatorId}:`, error);
        }
        const submissionDate = c.createdAt || c.startDate ? new Date(c.createdAt || c.startDate).toLocaleDateString() : 'Unknown';
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${c.title || 'Untitled'}</td>
          <td>${campaignerName}</td>
          <td>${c.goal ? `$${c.goal.toLocaleString()}` : 'N/A'}</td>
          <td>${submissionDate}</td>
          <td><span class="badge badge-${c.approvalStatus === 'pending' ? 'pending' : c.approvalStatus === 'approved' ? 'success' : 'danger'}">${c.approvalStatus ? c.approvalStatus.toUpperCase() : 'UNKNOWN'}</span></td>
          <td>
            <div class="actions">
              <button class="btn btn-outline btn-sm view-campaign" data-id="${c.id}">View</button>
              ${filterStatus === 'pending' ? `
                <button class="btn btn-primary btn-sm approve-campaign" data-id="${c.id}">Approve</button>
                <button class="btn btn-outline btn-sm reject-campaign" data-id="${c.id}">Reject</button>
              ` : ''}
            </div>
          </td>`;
        container.appendChild(row);
      }
      
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
          $(rejectionReasonModal).modal('show');
        });
      });
    } catch (error) {
      console.error('Error loading campaigns:', error.message, error.stack);
      container.innerHTML = `<tr><td colspan="6" class="text-muted">Failed to load campaigns: ${error.message}</td></tr>`;
    }
  }
  
  async function updateCampaignStatus(campaignId, approvalStatus, rejectionReason = '') {
    try {
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
        loadCampaigns(document.querySelector('.btn-outline.active')?.id.replace('filter', '').toLowerCase() || 'pending');
      } else {
        throw new Error(`Failed to update campaign status: ${updateRes.status} ${updateRes.statusText}`);
      }
    } catch (error) {
      console.error('Error updating campaign status:', error.message, error.stack);
      alert(`Failed to update campaign status: ${error.message}`);
    }
  }
  // filter 
  filterPendingBtn.addEventListener('click', () => {
    filterPendingBtn.classList.add('active');
    filterApprovedBtn.classList.remove('active');
    filterRejectedBtn.classList.remove('active');
    loadCampaigns('pending');
  });
  filterApprovedBtn.addEventListener('click', () => {
    filterApprovedBtn.classList.add('active');
    filterPendingBtn.classList.remove('active');
    filterRejectedBtn.classList.remove('active');
    loadCampaigns('approved');
  });
  filterRejectedBtn.addEventListener('click', () => {
    filterRejectedBtn.classList.add('active');
    filterPendingBtn.classList.remove('active');
    filterApprovedBtn.classList.remove('active');
    loadCampaigns('rejected');
  });
  confirmRejectBtn.addEventListener('click', async () => {
    const rejectionReason = document.getElementById('rejectionReason').value.trim();
    if (currentCampaignId) {
      await updateCampaignStatus(currentCampaignId, 'rejected', rejectionReason);
      $(rejectionReasonModal).modal('hide');
      document.getElementById('rejectionReason').value = '';
      currentCampaignId = null;
    }
  });
  
  filterPendingBtn.classList.add('active');
  await loadCampaigns('pending');
  // load campaigner requests
  async function loadCampaignerRequests() {
    const requestsBody = document.getElementById('campaigner-requests-body');
    try {
      const res = await fetch('http://localhost:3000/users');
      if (!res.ok) throw new Error(`Failed to fetch users: ${res.status} ${res.statusText}`);
      const users = await res.json();
      const pendingRequests = users.filter(u => u.campaignerRequest && u.campaignerStatus === 'pending');
      if (pendingRequests.length === 0) {
        requestsBody.innerHTML = `<tr><td colspan="6" class="text-muted">No pending requests</td></tr>`;
        return;
      }
      pendingRequests.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${user.name || 'Unknown'}</td>
          <td>${user.email || 'Unknown'}</td>
          <td>${user.campaignerApplication?.idea || 'N/A'}</td>
          <td>${user.campaignerApplication?.experience || 'N/A'}</td>
          <td>${user.campaignerApplication?.date ? new Date(user.campaignerApplication.date).toLocaleDateString() : 'Unknown'}</td>
          <td>
            <button class="btn btn-sm btn-success me-2" data-action="approve" data-id="${user.id}">Approve</button>
            <button class="btn btn-sm btn-danger" data-action="reject" data-id="${user.id}">Reject</button>
          </td>`;
        requestsBody.appendChild(row);
      });
      
      requestsBody.addEventListener('click', async e => {
        if (!e.target.matches('button')) return;
        const userId = e.target.dataset.id;
        const action = e.target.dataset.action;
        try {
          const getRes = await fetch(`http://localhost:3000/users/${userId}`);
          if (!getRes.ok) throw new Error(`Failed to fetch user: ${getRes.status} ${getRes.statusText}`);
          const user = await getRes.json();
          const updatedUser = {
            ...user,
            campaignerStatus: action === 'approve' ? 'approved' : 'rejected',
            role: action === 'approve' ? 'campaigner' : 'backer',
          };
          const updateRes = await fetch(`http://localhost:3000/users/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedUser),
          });
          if (updateRes.ok) {
            e.target.closest('tr').remove();
            alert(`User ${action === 'approve' ? 'approved' : 'rejected'} successfully`);
          } else {
            throw new Error(`Failed to update user: ${updateRes.status} ${updateRes.statusText}`);
          }
        } catch (error) {
          console.error('Error updating campaigner status:', error.message, error.stack);
          alert(`Failed to update campaigner status: ${error.message}`);
        }
      });
    } catch (error) {
      console.error('Error loading campaigner requests:', error.message, error.stack);
      requestsBody.innerHTML = `<tr><td colspan="6" class="text-muted">Failed to load campaigner requests: ${error.message}</td></tr>`;
    }
  }

  await loadCampaignerRequests();
});