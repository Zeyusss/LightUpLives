document.addEventListener('DOMContentLoaded', async function () {
  const user = JSON.parse(localStorage.getItem('user'));
  if (!user || user.role !== 'admin') {
    alert('You must be an admin to access this page.');
    window.location.href = '../../pages/auth/login.html';
    return;
  }

  // DOM Elements
  const searchReportsInput = document.getElementById('search-reports');
  const reportStatusFilter = document.getElementById('report-status-filter');
  const dateFromInput = document.getElementById('date-from');
  const dateToInput = document.getElementById('date-to');
  const reportsTable = document.getElementById('reportsTable');
  const totalItemsSpan = document.getElementById('total-reports'); // Changed to total-reports
  const rejectReasonModal = document.getElementById('rejectReasonModal');
  const confirmRejectBtn = document.getElementById('confirmReject');
  const prevPageBtn = document.getElementById('prev-page');
  const nextPageBtn = document.getElementById('next-page');
  const page1Btn = document.getElementById('page-1');
  const page2Btn = document.getElementById('page-2');
  const page3Btn = document.getElementById('page-3');
  let currentReportId = null;
  let currentPage = 1;
  const itemsPerPage = 10;

  // Load campaign reports
  async function loadReports(page = 1, status = 'all', dateFrom = '', dateTo = '', searchQuery = '') {
    try {
      let url = `http://localhost:3000/reports?_page=${page}&_limit=${itemsPerPage}`;
      if (status !== 'all') url += `&status=${status}`;
      if (dateFrom) url += `&createdAt_gte=${dateFrom}`;
      if (dateTo) url += `&createdAt_lte=${dateTo}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to fetch reports: ${res.status} ${res.statusText}`);
      const reports = await res.json();

      // Load campaigns once to avoid repeated fetch
      const campaignsRes = await fetch(`http://localhost:3000/campaigns`);
      const allCampaigns = await campaignsRes.json();

      // Enrich reports with campaign title or mark as contact
      const enrichedReports = reports.map(r => {
        if (r.type === 'contact') {
          return { ...r, campaignTitle: 'N/A (Contact Message)' };
        }
        const campaign = allCampaigns.find(c => c.id == r.campaignId);
        return {
          ...r,
          campaignTitle: campaign?.title || 'Unknown'
        };
      });

      // Search filter
      let filteredReports = enrichedReports;
      if (searchQuery) {
        searchQuery = searchQuery.toLowerCase();
        filteredReports = enrichedReports.filter(r =>
          r.userName?.toLowerCase().includes(searchQuery) ||
          r.campaignTitle?.toLowerCase().includes(searchQuery) ||
          r.description?.toLowerCase().includes(searchQuery)
        );
      }

      reportsTable.innerHTML = '';
      if (totalItemsSpan) {
        totalItemsSpan.textContent = filteredReports.length;
      } else {
        console.warn('Element with ID total-reports not found');
      }

      if (filteredReports.length === 0) {
        reportsTable.innerHTML = `<tr><td colspan="6" class="text-muted">No reports found.</td></tr>`;
        updatePagination(page);
        return;
      }

      for (const r of filteredReports) {
        const reportDate = r.createdAt ? new Date(r.createdAt).toLocaleDateString() : 'Unknown';
        const statusClass = r.status === 'pending' ? 'pending' : r.status === 'approved' ? 'approved' : 'rejected';
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${r.id || 'N/A'}</td>
          <td>${r.campaignTitle}</td>
          <td>${r.userName || 'Unknown'}</td>
          <td><span class="badge badge-${statusClass}">${r.status ? r.status.charAt(0).toUpperCase() + r.status.slice(1) : 'Unknown'}</span></td>
          <td>${reportDate}</td>
          <td>
            <div class="actions">
              <button class="btn btn-outline-primary btn-sm view-report" data-id="${r.id}" aria-label="View report">View</button>
              <button class="btn btn-outline-secondary btn-sm download-report" data-id="${r.id}" aria-label="Download report">Download</button>
              ${r.status === 'pending' ? `
                <button class="btn btn-success btn-sm approve-report" data-id="${r.id}" aria-label="Approve report">Approve</button>
                <button class="btn btn-danger btn-sm reject-report" data-id="${r.id}" aria-label="Reject report">Reject</button>
              ` : ''}
              <button class="btn btn-danger btn-sm delete-report" data-id="${r.id}" aria-label="Delete report">Delete</button>
            </div>
          </td>`;
        reportsTable.appendChild(row);
      }

      // Attach event listeners
      document.querySelectorAll('.view-report').forEach(button => {
        button.addEventListener('click', async (e) => await viewReport(e.target.dataset.id));
      });

      document.querySelectorAll('.download-report').forEach(button => {
        button.addEventListener('click', async (e) => await downloadReport(e.target.dataset.id));
      });

      document.querySelectorAll('.approve-report').forEach(button => {
        button.addEventListener('click', async (e) => {
          if (confirm('Are you sure you want to approve this report?')) {
            await updateReportStatus(e.target.dataset.id, 'approved');
          }
        });
      });

      document.querySelectorAll('.reject-report').forEach(button => {
        button.addEventListener('click', (e) => {
          currentReportId = e.target.dataset.id;
          $(rejectReasonModal).modal('show');
        });
      });

      document.querySelectorAll('.delete-report').forEach(button => {
        button.addEventListener('click', async (e) => {
          const id = e.target.dataset.id;
          if (confirm('Are you sure you want to delete this report?')) {
            await deleteReport(id);
          }
        });
      });

      updatePagination(page);
    } catch (error) {
      console.error('Error loading reports:', error.message);
      reportsTable.innerHTML = `<tr><td colspan="6" class="text-muted">Failed to load reports: ${error.message}</td></tr>`;
    }
  }

  // View report
  async function viewReport(reportId) {
    try {
      const res = await fetch(`http://localhost:3000/reports/${reportId}`);
      if (!res.ok) throw new Error(`Failed to fetch report: ${res.status} ${res.statusText}`);
      const report = await res.json();

      let campaignTitle = report.type === 'contact' ? 'N/A (Contact Message)' : 'Unknown';
      if (report.type !== 'contact') {
        try {
          const campaignRes = await fetch(`http://localhost:3000/campaigns/${report.campaignId}`);
          if (campaignRes.ok) {
            const campaign = await campaignRes.json();
            campaignTitle = campaign.title || 'Unknown';
          }
        } catch (error) {
          console.warn(`Error fetching campaign ${report.campaignId}:`, error);
        }
      }

      let message = `Report #${report.id}\nCampaign: ${campaignTitle}\nReported By: ${report.userName}\nStatus: ${report.status}\nDescription: ${report.description}\nDate: ${report.createdAt ? new Date(report.createdAt).toLocaleDateString() : 'Unknown'}`;
      if (report.status === 'rejected' && report.rejectReason) {
        message += `\nReject Reason: ${report.rejectReason}`;
      }
      alert(message);
    } catch (error) {
      console.error('Error viewing report:', error.message, error.stack);
      alert(`Failed to view report: ${error.message}`);
    }
  }

  // Download report as PDF
  async function downloadReport(reportId) {
    try {
      const res = await fetch(`http://localhost:3000/reports/${reportId}`);
      if (!res.ok) throw new Error(`Failed to fetch report: ${res.status} ${res.statusText}`);
      const report = await res.json();

      let campaignTitle = report.type === 'contact' ? 'N/A (Contact Message)' : 'Unknown';
      if (report.type !== 'contact') {
        try {
          const campaignRes = await fetch(`http://localhost:3000/campaigns/${report.campaignId}`);
          if (campaignRes.ok) {
            const campaign = await campaignRes.json();
            campaignTitle = campaign.title || 'Unknown';
          }
        } catch (error) {
          console.warn(`Error fetching campaign ${report.campaignId}:`, error);
        }
      }

      const reportDate = report.createdAt ? new Date(report.createdAt).toLocaleDateString() : 'Unknown';
      const docDefinition = {
        content: [
          { text: `Report #${report.id}`, style: 'header' },
          { text: `Campaign: ${campaignTitle}`, style: 'subheader' },
          { text: `Reported By: ${report.userName}`, style: 'subheader' },
          { text: `Status: ${report.status ? report.status.charAt(0).toUpperCase() + report.status.slice(1) : 'Unknown'}`, style: 'subheader' },
          { text: `Date: ${reportDate}`, style: 'subheader' },
          { text: `Description: ${report.description}`, style: 'subheader' },
          ...(report.status === 'rejected' && report.rejectReason ? [{ text: `Reject Reason: ${report.rejectReason}`, style: 'subheader' }] : [])
        ],
        styles: {
          header: { fontSize: 18, bold: true, margin: [0, 0, 0, 10] },
          subheader: { fontSize: 14, margin: [0, 5, 0, 5] }
        }
      };

      pdfMake.createPdf(docDefinition).download(`report_${report.id}_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (error) {
      console.error('Error downloading report:', error.message, error.stack);
      alert(`Failed to download report: ${error.message}`);
    }
  }

  // Update report status
  async function updateReportStatus(reportId, status, rejectReason = '') {
    try {
      console.log('Updating report status:', { reportId, status, rejectReason });
      const res = await fetch(`http://localhost:3000/reports/${reportId}`);
      if (!res.ok) throw new Error(`Failed to fetch report: ${res.status} ${res.statusText}`);
      const report = await res.json();

      const updatedReport = {
        ...report,
        status,
        rejectReason: status === 'rejected' ? rejectReason : report.rejectReason || ''
      };

      const updateRes = await fetch(`http://localhost:3000/reports/${reportId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedReport)
      });

      if (updateRes.ok) {
        alert(`Report ${status} successfully!`);
        loadReports(currentPage, reportStatusFilter.value, dateFromInput.value, dateToInput.value, searchReportsInput.value);
      } else {
        throw new Error(`Failed to update report status: ${updateRes.status} ${updateRes.statusText}`);
      }
    } catch (error) {
      console.error('Error updating report status:', error.message, error.stack);
      alert(`Failed to update report status: ${error.message}`);
    }
  }

  // Delete report
  async function deleteReport(reportId) {
    try {
      const res = await fetch(`http://localhost:3000/reports/${reportId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error(`Failed to delete report: ${res.status} ${res.statusText}`);
      alert(`Report #${reportId} deleted successfully.`);
      loadReports(currentPage, reportStatusFilter.value, dateFromInput.value, dateToInput.value, searchReportsInput.value);
    } catch (error) {
      console.error('Error deleting report:', error.message);
      alert(`Failed to delete report: ${error.message}`);
    }
  }

  // Update pagination
  function updatePagination(page) {
    currentPage = page;
    page1Btn.classList.toggle('active', page === 1);
    page2Btn.classList.toggle('active', page === 2);
    page3Btn.classList.toggle('active', page === 3);
    prevPageBtn.classList.toggle('disabled', page === 1);
    nextPageBtn.classList.toggle('disabled', page === 3);
  }

  // Event listeners
  reportStatusFilter.addEventListener('change', () => {
    loadReports(1, reportStatusFilter.value, dateFromInput.value, dateToInput.value, searchReportsInput.value);
  });

  dateFromInput.addEventListener('change', () => {
    loadReports(1, reportStatusFilter.value, dateFromInput.value, dateToInput.value, searchReportsInput.value);
  });

  dateToInput.addEventListener('change', () => {
    loadReports(1, reportStatusFilter.value, dateFromInput.value, dateToInput.value, searchReportsInput.value);
  });

  searchReportsInput.addEventListener('input', () => {
    loadReports(1, reportStatusFilter.value, dateFromInput.value, dateToInput.value, searchReportsInput.value);
  });

  confirmRejectBtn.addEventListener('click', async () => {
    if (!currentReportId) {
      console.error('No report ID set for rejection');
      alert('Error: No report selected for rejection.');
      $(rejectReasonModal).modal('hide');
      return;
    }
    const rejectReason = document.getElementById('rejectReason').value.trim();
    console.log('Confirm reject clicked, reportId:', currentReportId, 'reason:', rejectReason);
    await updateReportStatus(currentReportId, 'rejected', rejectReason);
    $(rejectReasonModal).modal('hide');
    document.getElementById('rejectReason').value = '';
    currentReportId = null;
  });

  document.getElementById('logoutBtn').addEventListener('click', function () {
    localStorage.removeItem('user');
    window.location.href = '../../pages/auth/login.html';
  });

  // Initial load
  reportStatusFilter.value = 'all';
  await loadReports(1);
});
