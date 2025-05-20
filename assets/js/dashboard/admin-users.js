document.addEventListener('DOMContentLoaded', async function () {
  const user = JSON.parse(localStorage.getItem('user'));
  if (!user || user.role !== 'admin') {
    alert('You must be an admin to access this page.');
    window.location.href = '../../pages/auth/login.html';
    return;
  }

  // DOM Elements
  const filterAllBtn = document.getElementById('filterAll');
  const filterAdminBtn = document.getElementById('filterAdmin');
  const filterCampaignerBtn = document.getElementById('filterCampaigner');
  const filterBackerBtn = document.getElementById('filterBacker');
  const searchUsersInput = document.getElementById('search-users');
  const showUserModalBtn = document.getElementById('showUserModal');
  const hideUserModalBtn = document.getElementById('hideUserModal');
  const createUserBtn = document.getElementById('createUser');
  const updateUserBtn = document.getElementById('updateUser');
  const userModal = document.querySelector('.user-modal');
  const usersTable = document.getElementById('usersTable');
  const totalUsersSpan = document.getElementById('total-users');
  const rejectionReasonModal = document.getElementById('rejectionReasonModal');
  const confirmRejectBtn = document.getElementById('confirmReject');
  const userNameInput = document.getElementById('user-name');
  const userEmailInput = document.getElementById('user-email');
  const userPasswordInput = document.getElementById('user-password');
  const userRoleInput = document.getElementById('user-role');
  const userStatusInput = document.getElementById('user-status');
  const userAvatarInput = document.getElementById('user-avatar');
  let currentUserId = null;
  let currentFilter = 'all';

  // Load users based on filter
  async function loadUsers(filter = 'all', searchQuery = '') {
    try {
      let url = 'http://localhost:3000/users';
      if (filter !== 'all') {
        url += `?role=${filter}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to fetch users: ${res.status} ${res.statusText}`);
      let users = await res.json();

      // Apply search filter
      if (searchQuery) {
        searchQuery = searchQuery.toLowerCase();
        users = users.filter(u => 
          u.name?.toLowerCase().includes(searchQuery) || 
          u.email?.toLowerCase().includes(searchQuery)
        );
      }

      usersTable.innerHTML = '';
      totalUsersSpan.textContent = users.length;

      if (users.length === 0) {
        usersTable.innerHTML = `<tr><td colspan="6" class="text-muted">No ${filter === 'all' ? 'users' : filter + ' users'} found.</td></tr>`;
        return;
      }

      for (const u of users) {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td class="avatar-col">
            <img src="${u.avatar || '../../assets/images/dashboard/cleanpic.png'}" alt="${u.name || 'User'}" class="user-avatar">
          </td>
          <td>${u.name || 'Unknown'}</td>
          <td>${u.email || 'N/A'}</td>
          <td><span class="badge badge-${u.role === 'admin' ? 'primary' : u.role === 'campaigner' ? 'success' : 'pending'}">${u.role ? u.role.charAt(0).toUpperCase() + u.role.slice(1) : 'Unknown'}</span></td>
          <td><span class="badge badge-${u.status === 'active' ? 'confirmed' : 'refunded'}">${u.status ? u.status.charAt(0).toUpperCase() + u.status.slice(1) : 'Unknown'}</span></td>
          <td class="action-col">
            ${u.campaignerRequest && u.campaignerStatus === 'pending' ? `
              <button class="btn btn-success btn-sm approve-campaigner" data-id="${u.id}" data-bs-toggle="tooltip" title="Approve Campaigner role"><i class="fas fa-check"></i></button>
              <button class="btn btn-outline btn-sm reject-campaigner" data-id="${u.id}" data-bs-toggle="tooltip" title="Reject Campaigner role"><i class="fas fa-times"></i></button>
            ` : ''}
            <button class="btn btn-warning btn-sm ${u.status === 'banned' ? 'unban-user' : 'ban-user'}" data-id="${u.id}" data-bs-toggle="tooltip" title="${u.status === 'banned' ? 'Unban' : 'Ban'} this user"><i class="fas fa-${u.status === 'banned' ? 'user-check' : 'ban'}"></i></button>
            <button class="btn btn-danger btn-sm delete-user" data-id="${u.id}" data-bs-toggle="tooltip" title="Delete this user"><i class="fas fa-trash"></i></button>
            <button class="btn btn-primary btn-sm edit-user" data-id="${u.id}" data-bs-toggle="tooltip" title="Edit this user"><i class="fas fa-edit"></i></button>
          </td>`;
        usersTable.appendChild(row);
      }

      document.querySelectorAll('.approve-campaigner').forEach(button => {
        button.addEventListener('click', async (e) => {
          const userId = e.target.closest('button').dataset.id;
          if (confirm('Are you sure you want to approve this campaigner request?')) {
            await updateCampaignerStatus(userId, 'approved');
          }
        });
      });

      document.querySelectorAll('.reject-campaigner').forEach(button => {
        button.addEventListener('click', (e) => {
          currentUserId = e.target.closest('button').dataset.id;
          console.log('Reject campaigner button clicked, userId:', currentUserId); 
          if (!currentUserId) {
            console.error('No user ID set for rejection');
            alert('Error: No user selected for rejection.');
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

      document.querySelectorAll('.ban-user, .unban-user').forEach(button => {
        button.addEventListener('click', async (e) => {
          const userId = e.target.closest('button').dataset.id;
          const action = e.target.closest('button').classList.contains('ban-user') ? 'ban' : 'unban';
          if (confirm(`Are you sure you want to ${action} this user?`)) {
            await updateUserStatus(userId, action === 'ban' ? 'banned' : 'active');
          }
        });
      });

      document.querySelectorAll('.delete-user').forEach(button => {
        button.addEventListener('click', async (e) => {
          const userId = e.target.closest('button').dataset.id;
          if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
            await deleteUser(userId);
          }
        });
      });

      document.querySelectorAll('.edit-user').forEach(button => {
        button.addEventListener('click', async (e) => {
          const userId = e.target.closest('button').dataset.id;
          await editUser(userId);
        });
      });
    } catch (error) {
      console.error('Error loading users:', error.message, error.stack);
      usersTable.innerHTML = `<tr><td colspan="6" class="text-muted">Failed to load users: ${error.message}</td></tr>`;
    }
  }

  // update campaigner status
  async function updateCampaignerStatus(userId, campaignerStatus, rejectionReason = '') {
    try {
      console.log('Updating campaigner status:', { userId, campaignerStatus, rejectionReason }); 
      const res = await fetch(`http://localhost:3000/users/${userId}`);
      if (!res.ok) throw new Error(`Failed to fetch user: ${res.status} ${res.statusText}`);
      const user = await res.json();

      const updatedUser = {
        ...user,
        campaignerStatus,
        role: campaignerStatus === 'approved' ? 'campaigner' : user.role,
        campaignerRejectionReason: campaignerStatus === 'rejected' ? rejectionReason : '',
      };

      const updateRes = await fetch(`http://localhost:3000/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedUser),
      });

      if (updateRes.ok) {
        alert(`Campaigner request ${campaignerStatus} successfully!`);
        loadUsers(currentFilter, searchUsersInput.value);
      } else {
        throw new Error(`Failed to update campaigner status: ${updateRes.status} ${updateRes.statusText}`);
      }
    } catch (error) {
      console.error('Error updating campaigner status:', error.message, error.stack);
      alert(`Failed to update campaigner status: ${error.message}`);
    }
  }

  // update user status
  async function updateUserStatus(userId, status) {
    try {
      const res = await fetch(`http://localhost:3000/users/${userId}`);
      if (!res.ok) throw new Error(`Failed to fetch user: ${res.status} ${res.statusText}`);
      const user = await res.json();

      const updatedUser = { ...user, status };

      const updateRes = await fetch(`http://localhost:3000/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedUser),
      });

      if (updateRes.ok) {
        alert(`User ${status === 'banned' ? 'banned' : 'unbanned'} successfully!`);
        loadUsers(currentFilter, searchUsersInput.value);
      } else {
        throw new Error(`Failed to update user status: ${updateRes.status} ${updateRes.statusText}`);
      }
    } catch (error) {
      console.error('Error updating user status:', error.message, error.stack);
      alert(`Failed to update user status: ${error.message}`);
    }
  }

  // Delete user
  async function deleteUser(userId) {
    try {
      const res = await fetch(`http://localhost:3000/users/${userId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        alert('User deleted successfully!');
        loadUsers(currentFilter, searchUsersInput.value);
      } else {
        throw new Error(`Failed to delete user: ${res.status} ${res.statusText}`);
      }
    } catch (error) {
      console.error('Error deleting user:', error.message, error.stack);
      alert(`Failed to delete user: ${error.message}`);
    }
  }

  // edit user
  async function editUser(userId) {
    try {
      const res = await fetch(`http://localhost:3000/users/${userId}`);
      if (!res.ok) throw new Error(`Failed to fetch user: ${res.status} ${res.statusText}`);
      const user = await res.json();

      currentUserId = userId;
      userModal.classList.remove('d-none');
      document.querySelector('.modal-title').textContent = 'Edit User';
      document.getElementById('imagePreview').src = user.avatar || '../../assets/images/dashboard/cleanpic.png';
      userNameInput.value = user.name || '';
      userEmailInput.value = user.email || '';
      userPasswordInput.value = ''; 
      userRoleInput.value = user.role || 'backer';
      userStatusInput.value = user.status || 'active';
      userAvatarInput.value = '';
      createUserBtn.classList.add('d-none');
      updateUserBtn.classList.remove('d-none');
      document.querySelectorAll('.alert-danger').forEach(alert => alert.classList.add('d-none'));
    } catch (error) {
      console.error('Error loading user for edit:', error.message, error.stack);
      alert(`Failed to load user: ${error.message}`);
    }
  }

  // create or update user
  async function saveUser(isUpdate = false) {
    const name = userNameInput.value.trim();
    const email = userEmailInput.value.trim();
    const password = userPasswordInput.value.trim();
    const role = userRoleInput.value;
    const status = userStatusInput.value;
    const avatarFile = userAvatarInput.files[0];

    let isValid = true;
    if (!name || name.length < 3 || name.length > 50 || !/^[a-zA-Z\s]+$/.test(name)) {
      document.querySelector('.name-alert').classList.remove('d-none');
      isValid = false;
    } else {
      document.querySelector('.name-alert').classList.add('d-none');
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      document.querySelector('.email-alert').classList.remove('d-none');
      isValid = false;
    } else {
      document.querySelector('.email-alert').classList.add('d-none');
    }

    if (!isUpdate && (!password || password.length < 6)) {
      document.querySelector('.password-alert').classList.remove('d-none');
      isValid = false;
    } else {
      document.querySelector('.password-alert').classList.add('d-none');
    }

    if (!['backer', 'campaigner', 'admin'].includes(role)) {
      document.querySelector('.role-alert').classList.remove('d-none');
      isValid = false;
    } else {
      document.querySelector('.role-alert').classList.add('d-none');
    }

    if (!['active', 'banned'].includes(status)) {
      document.querySelector('.status-alert').classList.remove('d-none');
      isValid = false;
    } else {
      document.querySelector('.status-alert').classList.add('d-none');
    }

    if (!isValid) return;

    let avatarBase64 = '../../assets/images/dashboard/cleanpic.png';
    if (avatarFile) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = async () => {
          const canvas = document.createElement('canvas');
          const maxWidth = 100;
          const scaleSize = maxWidth / img.width;
          canvas.width = maxWidth;
          canvas.height = img.height * scaleSize;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          avatarBase64 = canvas.toDataURL('image/jpeg', 0.7);
          await submitUser(avatarBase64, isUpdate);
        };
      };
      reader.readAsDataURL(avatarFile);
    } else {
      await submitUser(avatarBase64, isUpdate);
    }

    async function submitUser(avatar, isUpdate) {
      const userData = {
        name,
        email,
        role,
        status,
        avatar,
        campaignerRequest: role === 'campaigner' ? true : false,
        campaignerStatus: role === 'campaigner' ? 'approved' : 'none',
      };
      if (!isUpdate || password) {
        userData.password = password; 
      }

      try {
        const url = isUpdate ? `http://localhost:3000/users/${currentUserId}` : 'http://localhost:3000/users';
        const method = isUpdate ? 'PUT' : 'POST';
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userData),
        });

        if (res.ok) {
          alert(`User ${isUpdate ? 'updated' : 'created'} successfully!`);
          userModal.classList.add('d-none');
          loadUsers(currentFilter, searchUsersInput.value);
        } else {
          throw new Error(`Failed to ${isUpdate ? 'update' : 'create'} user: ${res.status} ${res.statusText}`);
        }
      } catch (error) {
        console.error(`Error ${isUpdate ? 'updating' : 'creating'} user:`, error.message, error.stack);
        alert(`Failed to ${isUpdate ? 'update' : 'create'} user: ${error.message}`);
      }
    }
  }

  // filter 
  filterAllBtn.addEventListener('click', () => {
    filterAllBtn.classList.add('active');
    filterAdminBtn.classList.remove('active');
    filterCampaignerBtn.classList.remove('active');
    filterBackerBtn.classList.remove('active');
    currentFilter = 'all';
    loadUsers('all', searchUsersInput.value);
  });

  filterAdminBtn.addEventListener('click', () => {
    filterncmp://assets/images/logo/logo-icon.pngAdminBtn.classList.add('active');
    filterAllBtn.classList.remove('active');
    filterCampaignerBtn.classList.remove('active');
    filterBackerBtn.classList.remove('active');
    currentFilter = 'admin';
    loadUsers('admin', searchUsersInput.value);
  });

  filterCampaignerBtn.addEventListener('click', () => {
    filterCampaignerBtn.classList.add('active');
    filterAllBtn.classList.remove('active');
    filterAdminBtn.classList.remove('active');
    filterBackerBtn.classList.remove('active');
    currentFilter = 'campaigner';
    loadUsers('campaigner', searchUsersInput.value);
  });

  filterBackerBtn.addEventListener('click', () => {
    filterBackerBtn.classList.add('active');
    filterAllBtn.classList.remove('active');
    filterAdminBtn.classList.remove('active');
    filterCampaignerBtn.classList.remove('active');
    currentFilter = 'backer';
    loadUsers('backer', searchUsersInput.value);
  });

  // search users
  searchUsersInput.addEventListener('input', () => {
    loadUsers(currentFilter, searchUsersInput.value);
  });

  // show  user modal
  showUserModalBtn.addEventListener('click', () => {
    userModal.classList.remove('d-none');
    currentUserId = null;
    document.querySelector('.modal-title').textContent = 'Create New User';
    document.getElementById('imagePreview').src = '../../assets/images/dashboard/cleanpic.png';
    userNameInput.value = '';
    userEmailInput.value = '';
    userPasswordInput.value = '';
    userRoleInput.value = 'backer';
    userStatusInput.value = 'active';
    userAvatarInput.value = '';
    createUserBtn.classList.remove('d-none');
    updateUserBtn.classList.add('d-none');
    document.querySelectorAll('.alert-danger').forEach(alert => alert.classList.add('d-none'));
  });

  // hide user modal
  hideUserModalBtn.addEventListener('click', () => {
    userModal.classList.add('d-none');
  });

  // preview image
  userAvatarInput.addEventListener('change', (e) => {
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

  // create user
  createUserBtn.addEventListener('click', () => {
    saveUser(false);
  });

  // update user
  updateUserBtn.addEventListener('click', () => {
    saveUser(true);
  });

  // confirm reject campaigner request
  confirmRejectBtn.addEventListener('click', async () => {
    if (!currentUserId) {
      console.error('No user ID set for confirmation');
      alert('Error: No user selected for rejection.');
      $(rejectionReasonModal).modal('hide');
      return;
    }
    const rejectionReason = document.getElementById('rejectionReason').value.trim();
    console.log('Confirm reject clicked, userId:', currentUserId, 'reason:', rejectionReason); 
    await updateCampaignerStatus(currentUserId, 'rejected', rejectionReason);
    $(rejectionReasonModal).modal('hide');
    document.getElementById('rejectionReason').value = '';
    currentUserId = null;
  });


  document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(element => {
    new bootstrap.Tooltip(element);
  });

  filterAllBtn.classList.add('active');
  await loadUsers('all');
});