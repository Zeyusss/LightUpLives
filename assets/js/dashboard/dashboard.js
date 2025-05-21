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
  const totalCampaignsSpan = document.getElementById('total-campaigns');
  const activeCampaignsSpan = document.getElementById('active-campaigns');
  const totalUsersSpan = document.getElementById('total-users');
  const totalPledgesSpan = document.getElementById('total-pledges');
  const analyticsSection = document.getElementById('analytics-section');
  let currentCampaignId = null;

  // Load Stats
  async function loadStats() {
    try {
      // Total Campaigns
      const campaignsRes = await fetch('http://localhost:3000/campaigns');
      if (!campaignsRes.ok) throw new Error(`Failed to fetch campaigns: ${campaignsRes.status} ${campaignsRes.statusText}`);
      const campaigns = await campaignsRes.json();
      totalCampaignsSpan.textContent = campaigns.length;

      // Active Campaigns (approved and confirmed)
      const activeCampaigns = campaigns.filter(c => c.approvalStatus === 'approved' && c.status === 'confirmed');
      activeCampaignsSpan.textContent = activeCampaigns.length;

      // Total Users
      const usersRes = await fetch('http://localhost:3000/users');
      if (!usersRes.ok) throw new Error(`Failed to fetch users: ${usersRes.status} ${usersRes.statusText}`);
      const users = await usersRes.json();
      totalUsersSpan.textContent = users.length.toLocaleString();

      // Total Pledges
      const pledgesRes = await fetch('http://localhost:3000/pledges');
      if (!pledgesRes.ok) throw new Error(`Failed to fetch pledges: ${pledgesRes.status} ${campaignsRes.statusText}`);
      const pledges = await pledgesRes.json();
      const totalPledges = pledges.reduce((sum, p) => sum + (p.amount || 0), 0);
      totalPledgesSpan.textContent = `$${totalPledges.toLocaleString()}`;
    } catch (error) {
      console.error('Error loading stats:', error.message);
      totalCampaignsSpan.textContent = 'N/A';
      activeCampaignsSpan.textContent = 'N/A';
      totalUsersSpan.textContent = 'N/A';
      totalPledgesSpan.textContent = 'N/A';
    }
  }

  // Load Charts
  async function loadCharts() {
    try {
      // Verify Chart.js is available
      if (typeof Chart === 'undefined') {
        throw new Error('Chart.js library is not loaded');
      }

      // Fetch campaigns and pledges
      const campaignsRes = await fetch('http://localhost:3000/campaigns');
      if (!campaignsRes.ok) throw new Error(`Failed to fetch campaigns: ${campaignsRes.status} ${campaignsRes.statusText}`);
      const campaigns = await campaignsRes.json();

      const pledgesRes = await fetch('http://localhost:3000/pledges');
      if (!pledgesRes.ok) throw new Error(`Failed to fetch pledges: ${pledgesRes.status} ${pledgesRes.statusText}`);
      const pledges = await pledgesRes.json();

      if (campaigns.length === 0 && pledges.length === 0) {
        analyticsSection.innerHTML = `<p class="text-muted">No data available for analytics.</p>`;
        return;
      }

      // Get canvas elements
      const categoryCanvas = document.getElementById('campaignsByCategoryChart');
      const pledgesCanvas = document.getElementById('pledgesOverTimeChart');
      if (!categoryCanvas || !pledgesCanvas) {
        throw new Error('Canvas elements not found');
      }

      // Bar Chart: Campaigns by Category
      const categories = [...new Set(campaigns.map(c => c.category || 'Unknown'))];
      const categoryCounts = categories.map(cat => 
        campaigns.filter(c => c.category === cat).length
      );

      new Chart(categoryCanvas, {
        type: 'bar',
        data: {
          labels: categories,
          datasets: [{
            label: 'Number of Campaigns',
            data: categoryCounts,
            backgroundColor: [
              'rgba(0, 147, 104, 0.7)', // --color-primary
              'rgba(236, 163, 12, 0.7)', // --color-accent
            ],
            borderColor: [
              'rgba(0, 147, 104, 1)',
              'rgba(236, 163, 12, 1)',
            ],
            borderWidth: 1,
            borderRadius: 4,
            barPercentage: 0.4,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
              labels: {
                font: { size: 14, weight: '600' },
                color: '#4a5568', // --color-dark
              }
            },
            title: {
              display: true,
              text: 'Campaigns by Category',
              font: { size: 18, weight: '700' },
              color: '#213430', // --color-secondary
              padding: { top: 10, bottom: 20 }
            },
            tooltip: {
              backgroundColor: 'rgba(33, 52, 48, 0.9)',
              titleFont: { size: 14, weight: '600' },
              bodyFont: { size: 12 },
              padding: 10,
              cornerRadius: 4,
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Count',
                font: { size: 14, weight: '600' },
                color: '#4a5568',
              },
              grid: { color: 'rgba(0, 0, 0, 0.05)' },
              ticks: { color: '#4a5568', font: { size: 12 } },
            },
            x: {
              title: {
                display: true,
                text: 'Category',
                font: { size: 14, weight: '600' },
                color: '#4a5568',
              },
              grid: { display: false },
              ticks: { color: '#4a5568', font: { size: 12 } },
            }
          },
          animation: {
            duration: 1000,
            easing: 'easeOutQuart',
          }
        }
      });

      // Line Chart: Pledge Amounts Over Time (by Month)
      const months = ['2025-04', '2025-05']; // Based on db.json dates
      const monthlyPledges = months.map(month => {
        const monthPledges = pledges.filter(p => 
          p.createdAt && p.createdAt.startsWith(month)
        );
        return monthPledges.reduce((sum, p) => sum + (p.amount || 0), 0);
      });

      new Chart(pledgesCanvas, {
        type: 'line',
        data: {
          labels: months.map(m => new Date(m).toLocaleString('default', { month: 'short', year: 'numeric' })),
          datasets: [{
            label: 'Total Pledge Amount ($)',
            data: monthlyPledges,
            borderColor: 'rgba(0, 147, 104, 1)', // --color-primary
            backgroundColor: 'rgba(0, 147, 104, 0.2)',
            fill: true,
            tension: 0.4,
            pointBackgroundColor: 'rgba(0, 147, 104, 1)',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 7,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
              labels: {
                font: { size: 14, weight: '600' },
                color: '#4a5568',
              }
            },
            title: {
              display: true,
              text: 'Pledge Amounts Over Time',
              font: { size: 18, weight: '700' },
              color: '#213430',
              padding: { top: 10, bottom: 20 }
            },
            tooltip: {
              backgroundColor: 'rgba(33, 52, 48, 0.9)',
              titleFont: { size: 14, weight: '600' },
              bodyFont: { size: 12 },
              padding: 10,
              cornerRadius: 4,
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Amount ($)',
                font: { size: 14, weight: '600' },
                color: '#4a5568',
              },
              grid: { color: 'rgba(0, 0, 0, 0.05)' },
              ticks: {
                color: '#4a5568',
                font: { size: 12 },
                callback: value => `$${value.toLocaleString()}`,
              },
            },
            x: {
              title: {
                display: true,
                text: 'Month',
                font: { size: 14, weight: '600' },
                color: '#4a5568',
              },
              grid: { display: false },
              ticks: { color: '#4a5568', font: { size: 12 } },
            }
          },
          animation: {
            duration: 1000,
            easing: 'easeOutQuart',
          }
        }
      });

    } catch (error) {
      console.error('Error loading charts:', error.message, error.stack);
      analyticsSection.innerHTML = `<p class="text-muted">Failed to load analytics: ${error.message}</p>`;
    }
  }

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

      // Attach event listeners for View buttons
      document.querySelectorAll('.view-campaign').forEach(button => {
        button.addEventListener('click', (e) => {
          const campaignId = e.target.dataset.id;
          if (!campaignId) {
            console.error('View button clicked but campaignId is missing');
            alert('Error: Campaign ID not found. Please try again.');
            return;
          }
          console.log(`Redirecting to campaign page with ID: ${campaignId}`);
          try {
            window.location.href = `../../pages/donate.html?id=${campaignId}`;
          } catch (error) {
            console.error('Error during redirect:', error.message);
            alert('Error redirecting to campaign page. Please check the console for details.');
          }
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

  // Filter Buttons
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

  // Load Campaigner Requests
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

  document.getElementById('logoutBtn').addEventListener('click', function () {
    localStorage.removeItem('user');
    window.location.href = '../../pages/auth/login.html';
  });

  filterPendingBtn.classList.add('active');
  await loadStats();
  await loadCampaigns('pending');
  await loadCampaignerRequests();
  await loadCharts();
});