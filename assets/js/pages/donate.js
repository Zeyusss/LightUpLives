document.addEventListener('DOMContentLoaded', async function () {
  const urlParams = new URLSearchParams(window.location.search);
  const campaignId = urlParams.get('id');
  console.log('Campaign ID from URL:', campaignId);

  const user = JSON.parse(localStorage.getItem('user')) || { id: 'anonymous', role: 'guest' };
  const isAdmin = user.role === 'admin';

  function truncateText(text, maxLength) {
    if (!text) return 'No description available.';
    return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
  }

  async function checkSuccessStoryExists(campaignId) {
    try {
      const res = await fetch(`http://localhost:3000/success-stories?id=${campaignId}`);
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
      const successRes = await fetch('http://localhost:3000/success-stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...campaign, movedToSuccessAt: new Date().toISOString() }),
      });
      if (!successRes.ok) throw new Error(`Failed to move to success stories: ${successRes.statusText}`);

      const updateRes = await fetch(`http://localhost:3000/campaigns/${campaign.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      });
      if (!updateRes.ok) throw new Error(`Failed to update campaign status: ${updateRes.statusText}`);

      console.log('Successfully moved to success stories:', campaign.id);
    } catch (error) {
      console.error('Error moving to success stories:', error.message);
    }
  }

  function updateCampaignUI(campaignCard, campaign) {
    console.log('Updating UI for campaign:', campaign);
    const campaignImage = campaignCard.querySelector('.campaign-img');
    const campaignTitle = campaignCard.querySelector('.campaign-title');
    const campaignDesc = campaignCard.querySelector('.campaign-description');
    const organizerName = campaignCard.querySelector('.organizer-name');
    const organizerImg = campaignCard.querySelector('.organizer-img');
    const progressBar = campaignCard.querySelector('.progress-bar');
    const progressText = progressBar?.querySelector('.progress-text');
    const progressPercentage = progressBar?.querySelector('.progress-percentage');
    const statsItems = campaignCard.querySelectorAll('.stats-item');
    const donationForm = document.querySelector('.donation-form');
    const donateBtn = donationForm.querySelector('button[type="submit"]');

    if (campaignImage) campaignImage.src = campaign.image || '../assets/images/donation/children-participating-treasure-hunt.webp';
    if (campaignTitle) campaignTitle.textContent = campaign.title || 'Untitled Campaign';
    if (campaignDesc) campaignDesc.textContent = truncateText(campaign.description, 200);
    if (organizerName) organizerName.textContent = campaign.creatorName || 'Unknown Organizer';
    if (organizerImg) organizerImg.src = campaign.creatorImage || '../assets/images/donation/avatar/young-bearded-man-with-striped-shirt.webp';

    const raisedAmount = campaign.raisedAmount ?? campaign.amountRaised ?? 0;
    const goal = campaign.goal ?? 1000;
    const isCompleted = raisedAmount >= goal || campaign.status === 'completed';
    const percentage = Math.min(((raisedAmount / goal) * 100).toFixed(0), 100);
    const backers = campaign.backers ?? 0;

    if (progressBar) {
      progressBar.style.width = `${percentage}%`;
      progressBar.setAttribute('aria-valuenow', percentage);
      progressBar.classList.toggle('full', isCompleted);
    }
    if (progressText) progressText.textContent = `$${raisedAmount.toLocaleString()}`;
    if (progressPercentage) progressPercentage.textContent = `${percentage}%`;
    if (statsItems.length >= 4) {
      statsItems[0].querySelector('.stats-value').textContent = `$${raisedAmount.toLocaleString()}`;
      statsItems[1].querySelector('.stats-value').textContent = `$${goal.toLocaleString()}`;
      statsItems[2].querySelector('.stats-value').textContent = `${percentage}%`;
      statsItems[3].querySelector('.stats-value').textContent = backers;
    }

    if (donateBtn) {
      if (isCompleted) {
        donateBtn.className = 'btn goal-reached-btn';
        donateBtn.textContent = 'Goal Reached';
        donateBtn.disabled = true;
        donationForm.querySelectorAll('input, button').forEach(el => el.disabled = true);
      } else {
        donateBtn.className = 'btn btn-accent-custom w-100';
        donateBtn.textContent = 'Complete Donation';
        donateBtn.disabled = false;
        donationForm.querySelectorAll('input, button').forEach(el => el.disabled = false);
      }
    }

    const donorsList = document.querySelector('.donors-list');
    const showMoreBtn = document.querySelector('.show-more-donors');
    if (donorsList && campaign.donors) {
      donorsList.innerHTML = '';
      const maxInitialDonors = 4;
      campaign.donors.forEach((donor, index) => {
        const donorCard = document.createElement('div');
        donorCard.className = 'col-md-6 donor-card';
        if (index >= maxInitialDonors) {
          donorCard.style.display = 'none';
        }
        donorCard.innerHTML = `
          <div class="donor-info">
            <h5>${donor.name}</h5>
            <p>Donated $${donor.amount.toLocaleString()} on ${new Date(donor.date).toLocaleDateString()}</p>
          </div>
          ${isAdmin ? `<div class="donor-actions">
            <button class="delete-donor-btn btn btn-outline-danger btn-sm" data-index="${index}">Delete</button>
          </div>` : ''}
        `;
        donorsList.appendChild(donorCard);
      });

      if (isAdmin) {
        document.querySelectorAll('.donor-actions').forEach(action => {
          action.style.display = 'block';
        });
      }

      if (campaign.donors.length > maxInitialDonors) {
        showMoreBtn.style.display = 'block';
        showMoreBtn.textContent = 'Show More';
        donorsList.classList.remove('expanded');
      } else {
        showMoreBtn.style.display = 'none';
      }
    }
  }

  const showMoreBtn = document.querySelector('.show-more-donors');
  if (showMoreBtn) {
    showMoreBtn.addEventListener('click', () => {
      const donorsList = document.querySelector('.donors-list');
      if (donorsList.classList.contains('expanded')) {
        donorsList.classList.remove('expanded');
        showMoreBtn.textContent = 'Show More';
        document.querySelectorAll('.donor-card').forEach((card, index) => {
          card.style.display = index < 4 ? 'flex' : 'none';
        });
      } else {
        donorsList.classList.add('expanded');
        showMoreBtn.textContent = 'Show Less';
        document.querySelectorAll('.donor-card').forEach(card => {
          card.style.display = 'flex';
        });
      }
    });
  }

  document.addEventListener('click', async (e) => {
    if (e.target.classList.contains('delete-donor-btn')) {
      const index = parseInt(e.target.dataset.index);
      if (confirm(`Are you sure you want to delete this donor? This will adjust the campaign's raised amount.`)) {
        try {
          const campaign = campaignData;
          const donor = campaign.donors[index];
          const updatedDonors = campaign.donors.filter((_, i) => i !== index);
          const updatedRaisedAmount = (campaign.raisedAmount || campaign.amountRaised || 0) - (donor.amount || 0);
          const updatedBackers = (campaign.backers || 0) - 1;

          const updateCampaignRes = await fetch(`http://localhost:3000/campaigns/${campaignId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...campaign,
              raisedAmount: updatedRaisedAmount,
              backers: updatedBackers,
              donors: updatedDonors
            }),
          });

          if (!updateCampaignRes.ok) {
            throw new Error(`Failed to delete donor: ${updateCampaignRes.statusText}`);
          }

          const pledgesRes = await fetch(`http://localhost:3000/pledges?campaignId=${campaignId}&amount=${donor.amount}&createdAt=${donor.date}`);
          const pledges = await pledgesRes.json();
          if (pledges.length > 0) {
            const pledgeId = pledges[0].id;
            const deletePledgeRes = await fetch(`http://localhost:3000/pledges/${pledgeId}`, {
              method: 'DELETE',
            });
            if (!deletePledgeRes.ok) {
              console.warn(`Failed to delete pledge ${pledgeId}: ${deletePledgeRes.statusText}`);
            }
          }

          campaignData = await updateCampaignRes.json();
          const campaignCard = document.querySelector(`.campaign-card[data-campaign-id="${campaignId}"]`) || 
                              document.querySelector('.campaign-card[data-campaign-id="1"]');
          if (campaignCard) {
            if (campaignCard.dataset.campaignId !== campaignId) {
              campaignCard.dataset.campaignId = campaignId;
            }
            updateCampaignUI(campaignCard, campaignData);
          }
          alert('Donor deleted successfully!');
        } catch (error) {
          console.error('Error deleting donor:', error.message);
          alert(`Failed to delete donor: ${error.message}`);
        }
      }
    }
  });

  async function loadFeaturedCampaigns() {
    try {
      const res = await fetch('http://localhost:3000/campaigns');
      if (!res.ok) throw new Error(`Failed to fetch campaigns: ${res.status} ${res.statusText}`);
      const campaigns = await res.json();
      console.log('Fetched campaigns:', campaigns);
      const container = document.getElementById('featured-campaigns');
      container.innerHTML = '';
      campaigns.forEach(campaign => {
        if (campaign.id != campaignId && campaign.status !== 'completed') {
          const card = document.createElement('div');
          card.className = 'col-md-4 mb-4';
          card.innerHTML = `
            <div class="campaign-card h-100" data-campaign-id="${campaign.id}">
              <img src="${campaign.image || '../assets/images/donation/children-participating-treasure-hunt.webp'}" alt="Campaign Image" class="campaign-img">
              <div class="campaign-content">
                <h3 class="campaign-title"></h3>
                <div class="campaign-organizer">
                  <img src="${campaign.creatorImage || '../assets/images/donation/avatar/young-bearded-man-with-striped-shirt.webp'}" alt="organizer" class="organizer-img">
                  <span>By <strong class="organizer-name"></strong></span>
                </div>
                <p class="campaign-description"></p>
                <div class="progress">
                  <div class="progress-bar" role="progressbar" style="width: 0%" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
                    <span class="progress-text">$0</span>
                    <span class="progress-percentage">0%</span>
                  </div>
                </div>
                <div class="campaign-stats">
                  <div class="stats-item">
                    <div class="stats-value">$0</div>
                    <div class="stats-label">Raised</div>
                  </div>
                  <div class="stats-item">
                    <div class="stats-value">$0</div>
                    <div class="stats-label">Goal</div>
                  </div>
                  <div class="stats-item">
                    <div class="stats-value">0%</div>
                    <div class="stats-label">Completed</div>
                  </div>
                  <div class="stats-item">
                    <div class="stats-value">0</div>
                    <div class="stats-label">Donors</div>
                  </div>
                </div>
                <a href="?id=${campaign.id}" class="btn btn-accent-custom w-100 mt-3">Donate</a>
              </div>
            </div>
          `;
          container.appendChild(card);
          updateCampaignUI(card.querySelector('.campaign-card'), campaign);
        }
      });

      if (campaignId) {
        const campaign = campaigns.find(c => c.id == campaignId);
        if (campaign) {
          campaignData = campaign;
          const campaignCard = document.querySelector(`.campaign-card[data-campaign-id="${campaignId}"]`) || 
                              document.querySelector('.campaign-card[data-campaign-id="1"]');
          if (campaignCard) {
            if (campaignCard.dataset.campaignId !== campaignId) {
              campaignCard.dataset.campaignId = campaignId;
            }
            updateCampaignUI(campaignCard, campaignData);
          } else {
            console.warn(`No campaign card found for ID: ${campaignId}`);
            alert('Campaign not found.');
          }
        } else {
          console.warn(`No campaign data found for ID: ${campaignId}`);
          alert('Campaign not found in backend data.');
        }
      }
    } catch (error) {
      console.error('Error loading featured campaigns:', error.message);
      alert('Failed to load campaigns. Please try again.');
    }
  }

  let campaignData = null;
  await loadFeaturedCampaigns();

  const donationForm = document.querySelector('.donation-form form');
  const amountOptions = document.querySelectorAll('.amount-option');
  let selectedAmount = 25;

  amountOptions.forEach(option => {
    option.addEventListener('click', () => {
      amountOptions.forEach(opt => opt.classList.remove('active'));
      option.classList.add('active');
      const customAmountInput = document.getElementById('customAmount');
      if (option.textContent === 'Custom') {
        customAmountInput.style.display = 'block';
        selectedAmount = null;
      } else {
        customAmountInput.style.display = 'none';
        selectedAmount = parseInt(option.textContent.replace('$', '')) || 0;
      }
    });
  });

  donationForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const fullName = document.getElementById('fullName').value.trim();
    const email = document.getElementById('email').value.trim();
    const cardNumber = document.getElementById('cardNumber').value.trim();
    const expiry = document.getElementById('expiry').value;
    const cvv = document.getElementById('cvv').value.trim();
    const makeRecurring = document.getElementById('makeRecurring').checked;
    const customAmountInput = document.getElementById('customAmount');

    if (!fullName || !email || !cardNumber || !expiry || !cvv) {
      alert('Please fill in all required fields.');
      return;
    }

    if (!selectedAmount && customAmountInput.style.display === 'block') {
      selectedAmount = parseFloat(customAmountInput.value) || 0;
      if (selectedAmount <= 0) {
        alert('Please enter a valid custom amount.');
        return;
      }
    } else if (!selectedAmount) {
      alert('Please select a donation amount or enter a custom amount.');
      return;
    }

    if (!campaignId || !campaignData) {
      alert('No campaign selected. Please select a campaign.');
      return;
    }

    if (campaignData.raisedAmount >= campaignData.goal || campaignData.status === 'completed') {
      alert('This campaign has already reached its goal.');
      return;
    }

    try {
      const userId = user.id;
      const createdAt = new Date().toISOString();
      const updatedRaisedAmount = (campaignData.raisedAmount || campaignData.amountRaised || 0) + selectedAmount;
      const updatedBackers = (campaignData.backers || 0) + 1;
      const updatedDonors = [
        ...(campaignData.donors || []),
        {
          name: fullName,
          amount: selectedAmount,
          date: createdAt
        }
      ];

      const updateCampaignRes = await fetch(`http://localhost:3000/campaigns/${campaignId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...campaignData,
          raisedAmount: updatedRaisedAmount,
          backers: updatedBackers,
          donors: updatedDonors
        }),
      });

      if (!updateCampaignRes.ok) {
        throw new Error(`Failed to update campaign: ${updateCampaignRes.statusText}`);
      }

      const pledgeRes = await fetch('http://localhost:3000/pledges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId,
          userId,
          amount: selectedAmount,
          status: 'pending',
          createdAt,
          refundReason: ''
        }),
      });

      if (!pledgeRes.ok) {
        throw new Error(`Failed to create pledge: ${pledgeRes.statusText}`);
      }

      campaignData = await updateCampaignRes.json();
      if (campaignData.raisedAmount >= campaignData.goal && campaignData.status !== 'completed') {
        await moveToSuccessStories(campaignData);
        campaignData.status = 'completed';
      }

      const campaignCard = document.querySelector(`.campaign-card[data-campaign-id="${campaignId}"]`) || 
                          document.querySelector('.campaign-card[data-campaign-id="1"]');
      if (campaignCard) {
        if (campaignCard.dataset.campaignId !== campaignId) {
          campaignCard.dataset.campaignId = campaignId;
        }
        updateCampaignUI(campaignCard, campaignData);
      }

      donationForm.reset();
      amountOptions.forEach(opt => opt.classList.remove('active'));
      amountOptions[0].classList.add('active');
      customAmountInput.style.display = 'none';
      selectedAmount = 25;

      alert('Donation completed successfully! Awaiting confirmation.');
    } catch (error) {
      console.error('Error processing donation:', error.message);
      alert(`Failed to process donation: ${error.message}`);
    }
  });
});