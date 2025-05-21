document.addEventListener('DOMContentLoaded', async function () {
  const user = JSON.parse(localStorage.getItem('user'));
  if (!user || user.role !== 'admin') {
    alert('You must be an admin to access this page.');
    window.location.href = '../../pages/auth/login.html';
    return;
  }

  // DOM Elements
  const searchPledgesInput = document.getElementById('search-pledges');
  const campaignFilter = document.getElementById('campaign-filter');
  const dateFromInput = document.getElementById('date-from');
  const dateToInput = document.getElementById('date-to');
  const exportDataBtn = document.getElementById('export-data');
  const pledgesTable = document.getElementById('pledgesTable');
  const totalPledgesSpan = document.getElementById('total-pledges');
  const prevPageBtn = document.getElementById('prev-page');
  const nextPageBtn = document.getElementById('next-page');
  const page1Btn = document.getElementById('page-1');
  const page2Btn = document.getElementById('page-2');
  const page3Btn = document.getElementById('page-3');
  let currentPage = 1;
  const itemsPerPage = 10;

  async function loadCampaigns() {
    try {
      const res = await fetch('http://localhost:3000/campaigns');
      if (!res.ok) throw new Error(`Failed to fetch campaigns: ${res.status} ${res.statusText}`);
      const campaigns = await res.json();
      campaignFilter.innerHTML = '<option value="all">All Campaigns</option>';
      campaigns.forEach(c => {
        const option = document.createElement('option');
        option.value = c.id;
        option.textContent = c.title || 'Untitled';
        campaignFilter.appendChild(option);
      });
    } catch (error) {
      console.error('Error loading campaigns:', error.message);
      campaignFilter.innerHTML = '<option value="all">All Campaigns</option>';
    }
  }

  async function loadPledges(page = 1, campaignId = 'all', dateFrom = '', dateTo = '', searchQuery = '') {
    try {
      let url = `http://localhost:3000/pledges?_page=${page}&_limit=${itemsPerPage}`;
      if (campaignId !== 'all') url += `&campaignId=${campaignId}`;
      if (dateFrom) url += `&createdAt_gte=${dateFrom}`;
      if (dateTo) url += `&createdAt_lte=${dateTo}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to fetch pledges: ${res.status} ${res.statusText}`);
      const pledges = await res.json();

      let filteredPledges = pledges;
      if (searchQuery) {
        searchQuery = searchQuery.toLowerCase();
        filteredPledges = pledges.filter(p => {
          const campaignTitle = p.campaignTitle?.toLowerCase() || '';
          const pledgerName = p.pledgerName?.toLowerCase() || '';
          return campaignTitle.includes(searchQuery) || pledgerName.includes(searchQuery);
        });
      }

      pledgesTable.innerHTML = '';
      totalPledgesSpan.textContent = filteredPledges.length;

      if (filteredPledges.length === 0) {
        pledgesTable.innerHTML = `<tr><td colspan="6" class="text-muted">No pledges found.</td></tr>`;
        updatePagination(page);
        return;
      }

      for (const p of filteredPledges) {
        let campaignTitle = 'Unknown';
        let pledgerName = 'Unknown';
        try {
          const campaignRes = await fetch(`http://localhost:3000/campaigns/${p.campaignId}`);
          if (campaignRes.ok) {
            const campaign = await campaignRes.json();
            campaignTitle = campaign.title || 'Untitled';
          }
        } catch (error) {
          console.warn(`Error fetching campaign ${p.campaignId}:`, error.message);
        }
        try {
          const userRes = await fetch(`http://localhost:3000/users/${p.userId}`);
          if (userRes.ok) {
            const user = await userRes.json();
            pledgerName = user.name || 'Unknown';
          }
        } catch (error) {
          console.warn(`Error fetching user ${p.userId}:`, error.message);
        }

        const pledgeDate = p.createdAt ? new Date(p.createdAt).toLocaleDateString() : 'Unknown';
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${p.id || 'N/A'}</td>
          <td>${campaignTitle}</td>
          <td>${pledgerName}</td>
          <td>$${p.amount ? p.amount.toLocaleString() : '0'}</td>
          <td>${pledgeDate}</td>
          <td>
            <div class="actions">
              <button class="btn btn-outline btn-sm view-pledge" data-id="${p.id}" aria-label="View pledge">View</button>
            </div>
          </td>`;
        pledgesTable.appendChild(row);
      }

      document.querySelectorAll('.view-pledge').forEach(button => {
        button.addEventListener('click', async (e) => {
          const pledgeId = e.target.dataset.id;
          try {
           
            const pledgeRes = await fetch(`http://localhost:3000/pledges/${pledgeId}`);
            if (!pledgeRes.ok) throw new Error(`Failed to fetch pledge: ${pledgeRes.status} ${pledgeRes.statusText}`);
            const pledge = await pledgeRes.json();

            
            let campaignTitle = 'Unknown';
            let campaignCategory = 'Unknown';
            let campaignGoal = 'Unknown';
            let campaignCreator = 'Unknown';
            try {
              const campaignRes = await fetch(`http://localhost:3000/campaigns/${pledge.campaignId}`);
              if (campaignRes.ok) {
                const campaign = await campaignRes.json();
                campaignTitle = campaign.title || 'Untitled';
                campaignCategory = campaign.category || 'Unknown';
                campaignGoal = campaign.goal ? `$${campaign.goal.toLocaleString()}` : 'Unknown';
                campaignCreator = campaign.creatorName || 'Unknown';
              }
            } catch (error) {
              console.warn(`Error fetching campaign ${pledge.campaignId}:`, error.message);
            }

            
            let pledgerName = 'Unknown';
            let pledgerEmail = 'Unknown';
            try {
              const userRes = await fetch(`http://localhost:3000/users/${pledge.userId}`);
              if (userRes.ok) {
                const user = await userRes.json();
                pledgerName = user.name || 'Unknown';
                pledgerEmail = user.email || 'Unknown';
              }
            } catch (error) {
              console.warn(`Error fetching user ${pledge.userId}:`, error.message);
            }

            
            let transactionDetails = 'N/A';
            try {
              const transactionRes = await fetch(`http://localhost:3000/transactions?pledgeId=${pledgeId}`);
              if (transactionRes.ok) {
                const transactions = await transactionRes.json();
                if (transactions.length > 0) {
                  const t = transactions[0]; 
                  transactionDetails = `Type: ${t.type || 'Unknown'}, Date: ${t.date ? new Date(t.date).toLocaleDateString() : 'Unknown'}, Reason: ${t.reason || 'N/A'}`;
                }
              }
            } catch (error) {
              console.warn(`Error fetching transaction for pledge ${pledgeId}:`, error.message);
            }

            
            document.getElementById('pledge-id').textContent = pledge.id || 'N/A';
            document.getElementById('pledge-campaign').textContent = campaignTitle;
            document.getElementById('pledge-pledger').textContent = pledgerName;
            document.getElementById('pledge-email').textContent = pledgerEmail;
            document.getElementById('pledge-amount').textContent = pledge.amount ? `$${pledge.amount.toLocaleString()}` : '$0';
            document.getElementById('pledge-date').textContent = pledge.createdAt ? new Date(pledge.createdAt).toLocaleDateString() : 'Unknown';
            document.getElementById('pledge-refund-reason').textContent = pledge.refundReason || 'N/A';
            document.getElementById('pledge-campaign-category').textContent = campaignCategory;
            document.getElementById('pledge-campaign-goal').textContent = campaignGoal;
            document.getElementById('pledge-campaign-creator').textContent = campaignCreator;
            document.getElementById('pledge-transaction').textContent = transactionDetails;

            // Show modal
            $('#pledgeDetailsModal').modal('show');
          } catch (error) {
            console.error('Error loading pledge details:', error.message);
            alert(`Failed to load pledge details: ${error.message}`);
          }
        });
      });

      updatePagination(page);
    } catch (error) {
      console.error('Error loading pledges:', error.message);
      pledgesTable.innerHTML = `<tr><td colspan="6" class="text-muted">Failed to load pledges: ${error.message}</td></tr>`;
    }
  }

  function updatePagination(page) {
    currentPage = page;
    page1Btn.classList.toggle('active', page === 1);
    page2Btn.classList.toggle('active', page === 2);
    page3Btn.classList.toggle('active', page === 3);
    prevPageBtn.classList.toggle('disabled', page === 1);
    nextPageBtn.classList.toggle('disabled', page === 3);
  }

  async function exportData() {
    try {
      const res = await fetch('http://localhost:3000/pledges');
      if (!res.ok) throw new Error(`Failed to fetch pledges: ${res.status} ${res.statusText}`);
      const pledges = await res.json();

      const csvRows = ['Pledge ID,Campaign,Pledger,Pledger Email,Amount,Date,Refund Reason,Campaign Category,Campaign Goal,Campaign Creator'];
      for (const p of pledges) {
        let campaignTitle = 'Unknown';
        let campaignCategory = 'Unknown';
        let campaignGoal = 'Unknown';
        let campaignCreator = 'Unknown';
        let pledgerName = 'Unknown';
        let pledgerEmail = 'Unknown';
        try {
          const campaignRes = await fetch(`http://localhost:3000/campaigns/${p.campaignId}`);
          if (campaignRes.ok) {
            const campaign = await campaignRes.json();
            campaignTitle = campaign.title || 'Untitled';
            campaignCategory = campaign.category || 'Unknown';
            campaignGoal = campaign.goal || 0;
            campaignCreator = campaign.creatorName || 'Unknown';
          }
        } catch (error) {
          console.warn(`Error fetching campaign ${p.campaignId}:`, error.message);
        }
        try {
          const userRes = await fetch(`http://localhost:3000/users/${p.userId}`);
          if (userRes.ok) {
            const user = await userRes.json();
            pledgerName = user.name || 'Unknown';
            pledgerEmail = user.email || 'Unknown';
          }
        } catch (error) {
          console.warn(`Error fetching user ${p.userId}:`, error.message);
        }

        const pledgeDate = p.createdAt ? new Date(p.createdAt).toLocaleDateString() : 'Unknown';
        const row = [
          p.id || 'N/A',
          `"${campaignTitle.replace(/"/g, '""')}"`,
          `"${pledgerName.replace(/"/g, '""')}"`,
          `"${pledgerEmail.replace(/"/g, '""')}"`,
          p.amount || 0,
          pledgeDate,
          `"${(p.refundReason || '').replace(/"/g, '""')}"`,
          `"${campaignCategory.replace(/"/g, '""')}"`,
          campaignGoal,
          `"${campaignCreator.replace(/"/g, '""')}"`,
        ];
        csvRows.push(row.join(','));
      }

      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pledges_export_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting data:', error.message);
      alert(`Failed to export data: ${error.message}`);
    }
  }

  campaignFilter.addEventListener('change', () => {
    loadPledges(1, campaignFilter.value, dateFromInput.value, dateToInput.value, searchPledgesInput.value);
  });

  dateFromInput.addEventListener('change', () => {
    loadPledges(1, campaignFilter.value, dateFromInput.value, dateToInput.value, searchPledgesInput.value);
  });

  dateToInput.addEventListener('change', () => {
    loadPledges(1, campaignFilter.value, dateFromInput.value, dateToInput.value, searchPledgesInput.value);
  });

  searchPledgesInput.addEventListener('input', () => {
    loadPledges(1, campaignFilter.value, dateFromInput.value, dateToInput.value, searchPledgesInput.value);
  });

  exportDataBtn.addEventListener('click', exportData);

  prevPageBtn.addEventListener('click', () => {
    if (currentPage > 1) {
      loadPledges(currentPage - 1, campaignFilter.value, dateFromInput.value, dateToInput.value, searchPledgesInput.value);
    }
  });

  nextPageBtn.addEventListener('click', () => {
    if (currentPage < 3) {
      loadPledges(currentPage + 1, campaignFilter.value, dateFromInput.value, dateToInput.value, searchPledgesInput.value);
    }
  });

  page1Btn.addEventListener('click', () => {
    loadPledges(1, campaignFilter.value, dateFromInput.value, dateToInput.value, searchPledgesInput.value);
  });

  page2Btn.addEventListener('click', () => {
    loadPledges(2, campaignFilter.value, dateFromInput.value, dateToInput.value, searchPledgesInput.value);
  });

  page3Btn.addEventListener('click', () => {
    loadPledges(3, campaignFilter.value, dateFromInput.value, dateToInput.value, searchPledgesInput.value);
  });

  document.getElementById('logoutBtn').addEventListener('click', function () {
    localStorage.removeItem('user');
    window.location.href = '../../pages/auth/login.html';
  });

  await loadCampaigns();
  campaignFilter.value = 'all';
  await loadPledges(1);
});