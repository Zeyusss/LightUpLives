document.addEventListener('DOMContentLoaded', async function () {
  let user = JSON.parse(localStorage.getItem('user'));
  if (!user) {
    alert('You must be logged in.');
    window.location.href = '../../pages/auth/login.html';
    return;
  }
  // Fetch latest user data
  try {
    const res = await fetch(`http://localhost:3000/users/${user.id}`);
    if (!res.ok) throw new Error('Failed to fetch user data');
    user = await res.json();
    localStorage.setItem('user', JSON.stringify(user));
    console.log('User from localStorage:', user);
  } catch (error) {
    console.error('Error fetching user:', error);
    alert('Failed to load user data. Please try again.');
    return;
  }
  // DOM Elements
  const nameElement = document.querySelector('.profile-name');
  const roleElement = document.querySelector('.profile-role');
  const submitBtn = document.getElementById('submitCampaignerRequest');
  const roleRequested = document.getElementById('campaignerRequested');
  const roleRequest = document.getElementById('campaignerRequest');
  const warningMsg = document.getElementById('dangerMsg');
  const profileForm = document.getElementById('profile-form');
  const profileImg = document.querySelector('.profile-img');
  const campaignTabWrapper = document.getElementById('campaignTabWrapper');
  const createCampaignBtn = document.getElementById('createCampaignBtn');
  const campaignModal = document.getElementById('createCampaignModal'); 
  const hideCampaignModal = document.getElementById('hideCampaignModal');
  const createCampaignSubmit = document.getElementById('createCampaign');
  const campaignerStatsCard = document.getElementById('campaignerStatsCard');
  const updateCampaignModal = document.getElementById('updateCampaignModal');
  const hideUpdateModal = document.getElementById('hideUpdateModal');
  const submitUpdateBtn = document.getElementById('submitUpdate');
  
  if (nameElement && roleElement) {
    nameElement.textContent = user.name || 'No Name';
    roleElement.textContent = user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'User';
  }
  
  function handleCampaignerRequestUI(user) {
    if (!roleRequest || !roleRequested) return;
    if (user.campaignerRequest) {
      roleRequest.classList.add('d-none');
      roleRequested.classList.remove('d-none');
      roleRequested.classList.add('disabled');
      if (user.campaignerStatus === 'rejected') {
        roleRequested.textContent = 'Campaigner Request Rejected';
        roleRequested.classList.add('btn-danger');
      } else if (user.campaignerStatus === 'approved') {
        roleRequested.textContent = 'Campaigner Role Approved';
        roleRequested.classList.add('btn-success');
      } else {
        roleRequested.textContent = 'Request Pending Review';
        roleRequested.classList.add('btn-secondary');
      }
    }
  }
  function updateCampaignerUI(user) {
    if (user.role === 'campaigner' && user.campaignerStatus === 'approved') {
      if (campaignTabWrapper) campaignTabWrapper.classList.remove('d-none');
      if (createCampaignBtn) createCampaignBtn.classList.remove('d-none');
      if (campaignerStatsCard) campaignerStatsCard.classList.remove('d-none');
      loadCampaigns(user.id);
      loadCampaignerStats(user.id);
    } else {
      if (campaignTabWrapper) campaignTabWrapper.classList.add('d-none');
      if (createCampaignBtn) createCampaignBtn.classList.add('d-none');
      if (campaignerStatsCard) campaignerStatsCard.classList.add('d-none');
    }
  }
  handleCampaignerRequestUI(user);
  updateCampaignerUI(user);
  if (submitBtn) {
    submitBtn.addEventListener('click', async function () {
      const idea = document.getElementById('projectIdea')?.value.trim();
      const experience = document.getElementById('experience')?.value.trim();
      const agree = document.getElementById('agreeTerms')?.checked;
      if (!idea || !experience || !agree) {
        if (warningMsg) warningMsg.classList.remove('d-none');
        return;
      } else {
        if (warningMsg) warningMsg.classList.add('d-none');
      }
      const updateData = {
        ...user,
        campaignerRequest: true,
        campaignerStatus: 'pending',
        campaignerApplication: {
          idea,
          experience,
          date: new Date().toISOString(),
        },
      };
      try {
        const res = await fetch(`http://localhost:3000/users/${user.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData),
        });
        if (res.ok) {
          const latestUser = await (await fetch(`http://localhost:3000/users/${user.id}`)).json();
          localStorage.setItem('user', JSON.stringify(latestUser));
          alert('Request sent successfully!');
          document.querySelector('.btn-close')?.click();
          handleCampaignerRequestUI(latestUser);
          updateCampaignerUI(latestUser);
        } else {
          alert('There was a problem. Please try again.');
        }
      } catch (error) {
        console.error('Error submitting campaigner request:', error);
        alert('Failed to submit request.');
      }
    });
  }
  // 90-day profile edit restriction
  if (user.lastUpdated && profileForm) {
    const last = new Date(user.lastUpdated);
    const now = new Date();
    const days = Math.floor((now - last) / (1000 * 60 * 60 * 24));
    const saveBtn = document.querySelector("#profile-form button[type='submit']");
    if (days < 90) {
      saveBtn.disabled = true;
      saveBtn.textContent = `Can update again in ${90 - days} days`;
    }
  }
  // Profile Settings Save
  if (profileForm) {
    profileForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      const fullName = document.getElementById('fullName')?.value.trim();
      const email = document.getElementById('email')?.value.trim();
      const bio = document.getElementById('bio')?.value.trim();
      const updateData = {
        ...user,
        name: fullName,
        email,
        bio,
        lastUpdated: new Date().toISOString(),
      };
      try {
        const res = await fetch(`http://localhost:3000/users/${user.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData),
        });
        if (res.ok) {
          const updatedUser = await (await fetch(`http://localhost:3000/users/${user.id}`)).json();
          localStorage.setItem('user', JSON.stringify(updatedUser));
          alert('Profile updated!');
        } else {
          alert('Failed to update profile.');
        }
      } catch (error) {
        console.error('Error updating profile:', error);
        alert('Failed to update profile.');
      }
    });
  }
  // Load account stats
  async function loadStats(userId) {
    try {
      const res = await fetch(`http://localhost:3000/pledges?userId=${userId}`);
      const pledges = await res.json();
      document.querySelector('.stat-projects-backed').textContent = pledges.length;
      document.querySelector('.stat-total-pledged').textContent = `$${pledges.reduce((sum, p) => sum + (p.amount || 0), 0).toLocaleString()}`;
      document.querySelector('.stat-successful-projects').textContent = pledges.filter(p => p.status === 'successful').length;
      document.querySelector('.stat-active-pledges').textContent = pledges.filter(p => ['in-progress', 'pending'].includes(p.status)).length;
    } catch (error) {
      console.error('Error loading stats:', error);
      document.querySelector('.stat-projects-backed').textContent = '0';
      document.querySelector('.stat-total-pledged').textContent = '$0';
      document.querySelector('.stat-successful-projects').textContent = '0';
      document.querySelector('.stat-active-pledges').textContent = '0';
    }
  }
  // Load campaigner stats
  async function loadCampaignerStats(userId) {
    try {
      const campaignRes = await fetch(`http://localhost:3000/campaigns?creatorId=${userId}`);
      const campaigns = await campaignRes.json();
      let totalRaised = 0;
      let totalBackers = 0;
      for (const campaign of campaigns) {
        const pledgeRes = await fetch(`http://localhost:3000/pledges?campaignId=${campaign.id}`);
        const pledges = await pledgeRes.json();
        totalRaised += pledges.reduce((sum, p) => sum + (p.amount || 0), 0);
        totalBackers += pledges.length;
      }
      const campaignsCreated = campaigns.length;
      const activeCampaigns = campaigns.filter(c => c.status === 'confirmed' || c.status === 'pending').length;
      document.querySelector('.stat-campaigns-created').textContent = campaignsCreated;
      document.querySelector('.stat-total-raised').textContent = `$${totalRaised.toLocaleString()}`;
      document.querySelector('.stat-total-backers').textContent = totalBackers;
      document.querySelector('.stat-active-campaigns').textContent = activeCampaigns;
    } catch (error) {
      console.error('Error loading campaigner stats:', error);
      document.querySelector('.stat-campaigns-created').textContent = '0';
      document.querySelector('.stat-total-raised').textContent = '$0';
      document.querySelector('.stat-total-backers').textContent = '0';
      document.querySelector('.stat-active-campaigns').textContent = '0';
    }
  }
  // Load pledge history
  async function loadPledgeHistory(userId) {
    try {
      const res = await fetch(`http://localhost:3000/pledges?userId=${userId}`);
      const pledges = await res.json();
      const container = document.querySelector('#pledges');
      container.innerHTML = '';
      if (pledges.length === 0) {
        container.innerHTML = '<p class="text-muted">No pledges found.</p>';
        return;
      }
      pledges.forEach(p => {
        const card = document.createElement('div');
        card.className = 'card pledge-card mb-3';
        card.innerHTML = `
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <span class="pledge-amount">$${p.amount || 0}</span>
              <span class="pledge-date">${p.date || 'Unknown'}</span>
            </div>
            <h5 class="pledge-campaign mb-2">${p.campaignName || 'Unknown Campaign'}</h5>
            <p class="mb-2">Reward: ${p.reward || 'None'}</p>
            <div class="d-flex justify-content-between align-items-center">
              <span class="badge bg-${p.status === 'successful' ? 'success' : 'warning'}">${p.status || 'Unknown'}</span>
              <a href="#" class="btn btn-sm btn-outline-secondary">View Campaign</a>
            </div>
          </div>`;
        container.appendChild(card);
      });
    } catch (error) {
      console.error('Error loading pledge history:', error);
      document.querySelector('#pledges').innerHTML = '<p class="text-muted">Failed to load pledges.</p>';
    }
  }
  // Load campaigns
  async function loadCampaigns(userId) {
    try {
      const res = await fetch(`http://localhost:3000/campaigns?creatorId=${userId}`);
      const campaigns = await res.json();
      const container = document.getElementById('myCampaignsContainer');
      const noCampaignsMsg = document.getElementById('noCampaignsMsg');
      container.innerHTML = '';
      // Check and update campaign status based on endDate
      const today = new Date();
      for (const campaign of campaigns) {
        const endDate = new Date(campaign.endDate);
        if (endDate < today && campaign.status !== 'inactive') {
          console.log(`Updating campaign ${campaign.id} to inactive (endDate: ${campaign.endDate})`);
          const updatedCampaign = {
            ...campaign,
            status: 'inactive',
          };
          try {
            const updateRes = await fetch(`http://localhost:3000/campaigns/${campaign.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updatedCampaign),
            });
            if (!updateRes.ok) {
              console.error(`Failed to update campaign ${campaign.id} to inactive`);
            }
          } catch (error) {
            console.error(`Error updating campaign ${campaign.id}:`, error);
          }
        }
      }
      // Reload campaigns after updates
      const updatedRes = await fetch(`http://localhost:3000/campaigns?creatorId=${userId}`);
      const updatedCampaigns = await updatedRes.json();
      if (updatedCampaigns.length === 0) {
        noCampaignsMsg.classList.remove('d-none');
      } else {
        noCampaignsMsg.classList.add('d-none');
        updatedCampaigns.forEach(c => {
          console.log('Campaign image:', c.image); 
          const card = document.createElement('div');
          card.className = 'col mb-4';
          card.innerHTML = `
            <div class="campaign-card">
              <div class="campaign-image" style="background-image: url('${c.image || '../../assets/images/dashboard/cleanpic.png'}');">
                <span class="campaign-badge">${c.approvalStatus.toUpperCase()}</span>
              </div>
              <div class="campaign-content">
                <span class="campaign-category">${c.category.toUpperCase()}</span>
                <h3 class="campaign-title">${c.title || 'Untitled'}</h3>
                <span class="campaign-time"><i class="far fa-clock"></i> From ${new Date(c.startDate).toLocaleDateString()} to ${new Date(c.endDate).toLocaleDateString()}</span>
                <p class="campaign-desc">${c.description ? c.description.substring(0, 100) + '...' : 'No description'}</p>
                ${c.approvalStatus === 'rejected' && c.rejectionReason ? `
                  <div class="alert alert-danger rejection-reason">
                    Rejection Reason: ${c.rejectionReason}
                  </div>
                ` : ''}
                <div class="campaign-updates">
                  ${c.updates && c.updates.length > 0
                    ? c.updates.map(update => `<p class="update-text"><strong>Update:</strong> ${update.text} <small>(${new Date(update.date).toLocaleDateString()})</small></p>`).join('')
                    : '<p class="update-text text-muted">No updates yet.</p>'
                  }
                </div>
                <div class="campaign-info">
                  <span>Duration: ${new Date(c.startDate).toLocaleDateString()} - ${new Date(c.endDate).toLocaleDateString()}</span>
                </div>
                <div class="campaign-progress">
                  <div class="progress">
                    <div class="progress-bar" role="progressbar" style="width: ${((c.amountRaised / c.goal) * 100).toFixed(0)}%" aria-valuenow="${((c.amountRaised / c.goal) * 100).toFixed(0)}" aria-valuemin="0" aria-valuemax="100">
                      <span class="progress-text">$${c.amountRaised.toLocaleString()}</span>
                      <span class="progress-percentage">${((c.amountRaised / c.goal) * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                  <div class="campaign-stats">
                    <span>Goal: $${c.goal.toLocaleString()}</span>
                    <span>Raised: $${c.amountRaised.toLocaleString()}</span>
                    <span>Backers: ${c.backers}</span>
                  </div>
                </div>
              </div>
              <div class="campaign-footer">
                <button class="btn btn-outline-secondary view-campaign" data-id="${c.id}">View</button>
                <button class="btn btn-outline-success post-update" data-id="${c.id}" ${c.status === 'inactive' || c.approvalStatus !== 'approved' ? 'disabled' : ''}>Post Update</button>
                <button class="btn btn-outline-danger delete-campaign" data-id="${c.id}">Delete</button>
              </div>
            </div>`;
          container.appendChild(card);
        });

        
        document.querySelectorAll('.view-campaign').forEach(button => {
          button.addEventListener('click', (e) => {
            const campaignId = e.target.dataset.id;
            console.log('View campaign:', campaignId); 
            window.location.href = `../../pages/campaigns/campaign.html?id=${campaignId}`;
          });
        });

        document.querySelectorAll('.post-update').forEach(button => {
          button.addEventListener('click', (e) => {
            const campaignId = e.target.dataset.id;
            console.log('Opening update modal for campaign:', campaignId); 
            if (updateCampaignModal) {
              updateCampaignModal.dataset.campaignId = campaignId;
              document.getElementById('update-text').value = ''; 
              document.querySelector('.update-alert')?.classList.add('d-none');
              $(updateCampaignModal).modal('show');
            } else {
              console.error('Update Campaign Modal not found');
              alert('Error: Update modal not found. Please check your HTML.');
            }
          });
        });

        document.querySelectorAll('.delete-campaign').forEach(button => {
          button.addEventListener('click', (e) => {
            const campaignId = e.target.dataset.id;
            console.log('Deleting campaign:', campaignId); 
            if (confirm('Are you sure you want to delete this campaign?')) {
              deleteCampaign(campaignId);
            }
          });
        });
      }
    } catch (error) {
      console.error('Error loading campaigns:', error);
      document.getElementById('noCampaignsMsg').classList.remove('d-none');
    }
  }

  //post a campaign update
  async function postCampaignUpdate(campaignId, updateText) {
    console.log('Posting update for campaign:', campaignId, 'Text:', updateText); 
    try {
      
      const res = await fetch(`http://localhost:3000/campaigns/${campaignId}`);
      if (!res.ok) throw new Error(`Failed to fetch campaign: ${res.status}`);
      const campaign = await res.json();

      
      if (!campaign.updates) {
        campaign.updates = [];
      }

      
      const updatedCampaign = {
        ...campaign,
        updates: [
          ...campaign.updates,
          {
            text: updateText,
            date: new Date().toISOString(),
          },
        ],
      };

      
      const updateRes = await fetch(`http://localhost:3000/campaigns/${campaignId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedCampaign),
      });

      if (updateRes.ok) {
        console.log('Update posted successfully for campaign:', campaignId); 
        alert('Update posted successfully!');
        
        loadCampaigns(user.id);
        loadCampaignerStats(user.id);
      } else {
        throw new Error(`Failed to post update: ${updateRes.status}`);
      }
    } catch (error) {
      console.error('Error posting campaign update:', error);
      alert('Failed to post update. Please try again.');
    }
  }

  //delete a campaign
  async function deleteCampaign(campaignId) {
    console.log('Deleting campaign:', campaignId); 
    try {
      const res = await fetch(`http://localhost:3000/campaigns/${campaignId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        alert('Campaign deleted successfully!');
        
        loadCampaigns(user.id);
        loadCampaignerStats(user.id);
      } else {
        throw new Error(`Failed to delete campaign: ${res.status}`);
      }
    } catch (error) {
      console.error('Error deleting campaign:', error);
      alert('Failed to delete campaign.');
    }
  }

  
  if (profileImg && user.profileImage) {
    profileImg.src = user.profileImage;
  }

  
  document.getElementById('profile-picture-input')?.addEventListener('change', async function (e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {
      const img = new Image();
      img.src = event.target.result;

      img.onload = async function () {
        const canvas = document.createElement('canvas');
        const maxWidth = 150;
        const scaleSize = maxWidth / img.width;
        canvas.width = maxWidth;
        canvas.height = img.height * scaleSize;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.5);

        const updatedUser = {
          ...user,
          profileImage: compressedBase64,
        };

        try {
          const res = await fetch(`http://localhost:3000/users/${user.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedUser),
          });

          if (res.ok) {
            localStorage.setItem('user', JSON.stringify(updatedUser));
            document.querySelector('.profile-img').src = compressedBase64;
            alert('Profile picture updated!');
          } else {
            alert('Failed to update picture.');
          }
        } catch (error) {
          console.error('Error updating profile picture:', error);
          alert('Failed to update picture.');
        }
      };
    };
    reader.readAsDataURL(file);
  });

  
  document.getElementById('campaign-image')?.addEventListener('change', function (event) {
    const imageFile = event.target.files[0];
    if (imageFile) {
      console.log('Selected image:', imageFile.name);
      const reader = new FileReader();
      reader.onload = function (e) {
        console.log('Image preview loaded:', e.target.result.substring(0, 50));
        const imagePreview = document.getElementById('imagePreview');
        if (imagePreview) {
          imagePreview.src = e.target.result;
        } else {
          console.error('imagePreview element not found');
          alert('Error: Image preview element not found.');
        }
      };
      reader.onerror = function () {
        console.error('Error reading image file');
        alert('Failed to read image file.');
      };
      reader.readAsDataURL(imageFile);
    }
  });

  
  if (createCampaignBtn) {
    createCampaignBtn.addEventListener('click', () => {
      console.log('Opening create campaign modal'); 
      if (campaignModal) {
        $(campaignModal).modal('show');
        
        document.getElementById('campaign-title').value = '';
        document.getElementById('campaign-category').value = 'environment';
        document.getElementById('campaign-goal').value = '';
        document.getElementById('campaign-image').value = '';
        document.getElementById('campaign-description').value = '';
        document.getElementById('campaign-start-date').value = '';
        document.getElementById('campaign-end-date').value = '';
        document.getElementById('imagePreview').src = '../../assets/images/dashboard/cleanpic.png';
      } else {
        console.error('Create Campaign Modal not found');
        alert('Error: Create campaign modal not found. Please check your HTML.');
      }
    });
  }

  if (hideCampaignModal) {
    hideCampaignModal.addEventListener('click', () => {
      if (campaignModal) {
        $(campaignModal).modal('hide');
      }
    });
  }

  // Update campaign modal 
  if (hideUpdateModal) {
    hideUpdateModal.addEventListener('click', () => {
      console.log('Closing update modal'); 
      if (updateCampaignModal) {
        $(updateCampaignModal).modal('hide');
      }
    });
  }

  if (submitUpdateBtn) {
    submitUpdateBtn.addEventListener('click', async () => {
      const campaignId = updateCampaignModal?.dataset.campaignId;
      const updateText = document.getElementById('update-text')?.value.trim();
      console.log('Submitting update for campaign:', campaignId, 'Text:', updateText); 

      
      if (!updateText || updateText.length < 10) {
        console.log('Update text validation failed'); 
        document.querySelector('.update-alert')?.classList.remove('d-none');
        return;
      } else {
        document.querySelector('.update-alert')?.classList.add('d-none');
      }

      if (!campaignId) {
        console.error('Campaign ID not found in modal dataset');
        alert('Error: Campaign ID not found.');
        return;
      }

      await postCampaignUpdate(campaignId, updateText);
      if (updateCampaignModal) {
        $(updateCampaignModal).modal('hide');
      }
    });
  }


  if (createCampaignSubmit) {
    createCampaignSubmit.addEventListener('click', async () => {
      const title = document.getElementById('campaign-title')?.value.trim();
      const category = document.getElementById('campaign-category')?.value;
      const goal = parseInt(document.getElementById('campaign-goal')?.value);
      const description = document.getElementById('campaign-description')?.value.trim();
      const startDate = document.getElementById('campaign-start-date')?.value;
      const endDate = document.getElementById('campaign-end-date')?.value;
      const imageFile = document.getElementById('campaign-image')?.files[0];

      
      let isValid = true;
      if (!title || title.length < 3 || title.length > 50 || !/^[a-zA-Z0-9\s]+$/.test(title)) {
        document.querySelector('.title-alert')?.classList.remove('d-none');
        isValid = false;
      } else {
        document.querySelector('.title-alert')?.classList.add('d-none');
      }

      if (!['environment', 'education', 'health', 'community', 'technology', 'art-culture'].includes(category)) {
        document.querySelector('.category-alert')?.classList.remove('d-none');
        isValid = false;
      } else {
        document.querySelector('.category-alert')?.classList.add('d-none');
      }

      if (!goal || goal < 1000) {
        document.querySelector('.goal-alert')?.classList.remove('d-none');
        isValid = false;
      } else {
        document.querySelector('.goal-alert')?.classList.add('d-none');
      }

      console.log('Description:', description, 'Length:', description.length); 
      if (!description || description.length < 150) {
        document.querySelector('.description-alert')?.classList.remove('d-none');
        console.log('Description validation failed:', description.length);
        isValid = false;
      } else {
        document.querySelector('.description-alert')?.classList.add('d-none');
      }

      if (!startDate) {
        document.querySelector('.start-date-alert')?.classList.remove('d-none');
        isValid = false;
      } else {
        document.querySelector('.start-date-alert')?.classList.add('d-none');
      }

      if (!endDate || new Date(endDate) <= new Date(startDate)) {
        document.querySelector('.end-date-alert')?.classList.remove('d-none');
        isValid = false;
      } else {
        document.querySelector('.end-date-alert')?.classList.add('d-none');
      }

      if (!isValid) return;

      let imageBase64 = '../../assets/images/dashboard/cleanpic.png';
      if (imageFile) {
        console.log('Processing image file:', imageFile.name); 
        const reader = new FileReader();
        reader.onload = function (event) {
          console.log('FileReader loaded:', event.target.result.substring(0, 50)); 
          const img = new Image();
          img.src = event.target.result;
          img.onload = async function () {
            console.log('Image loaded, compressing...'); 
            const canvas = document.createElement('canvas');
            const maxWidth = 300;
            const scaleSize = maxWidth / img.width;
            canvas.width = maxWidth;
            canvas.height = img.height * scaleSize;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            imageBase64 = canvas.toDataURL('image/jpeg', 0.7);
            console.log('Image compressed to base64:', imageBase64.substring(0, 50)); 
            await submitCampaign();
          };
          img.onerror = function () {
            console.error('Error loading image');
            alert('Failed to load image. Please try another one.');
          };
        };
        reader.onerror = function () {
          console.error('Error reading file');
          alert('Failed to read image file.');
        };
        reader.readAsDataURL(imageFile);
      } else {
        console.log('No image selected, using default'); 
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
          status: 'pending',
          approvalStatus: 'pending', 
          startDate,
          endDate,
          amountRaised: 0,
          backers: 0,
          updates: [],
          rejectionReason: '', 
        };

        try {
          const res = await fetch('http://localhost:3000/campaigns', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(campaignData),
          });

          if (res.ok) {
            alert('Campaign submitted for approval!');
            if (campaignModal) {
              $(campaignModal).modal('hide');
            }
            loadCampaigns(user.id);
            loadCampaignerStats(user.id);
          } else {
            throw new Error(`Failed to create campaign: ${res.status}`);
          }
        } catch (error) {
          console.error('Error creating campaign:', error);
          alert('Failed to submit campaign.');
        }
      }
    });
  }


  await loadStats(user.id);
  await loadPledgeHistory(user.id);
});