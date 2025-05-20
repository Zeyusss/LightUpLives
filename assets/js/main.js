// Header
const headerPlaceholder = document.getElementById("header-placeholder");
if (headerPlaceholder) {
  fetch("../../components/header.html")
    .then(response => response.text())
    .then(data => {
      headerPlaceholder.innerHTML = data;
      // Header
      const profileLink = document.getElementById("my-profile-link");
      const logoutBtn = document.getElementById("logout-btn");
      const user = JSON.parse(localStorage.getItem("user"));
      console.log("User from localStorage:", user);
      // My Profile
      if (profileLink) {
        if (!user || !user.role) {
          profileLink.href = "../../pages/auth/login.html";
        } else {
          switch (user.role) {
            case "admin":
              profileLink.href = "../../dashboard/admin-panel/index.html";
              break;
            case "campaigner":
              profileLink.href = "../../dashboard/user-profile/user-profile.html";
              break;
            case "backer":
              profileLink.href = "../../dashboard/user-profile/user-profile.html";
              break;
            default:
              profileLink.href = "../../pages/auth/login.html";
          }
        }
      }
      // LogOut Button
      if (logoutBtn) {
        logoutBtn.addEventListener("click", function () {
          localStorage.removeItem("user");
          window.location.href = "../../pages/auth/login.html";
        });
      }
    })
    .catch(error => {
      console.error("Error loading header:", error);
    });
}

// Footer
const footerPlaceholder = document.getElementById("footer-placeholder");
if (footerPlaceholder) {
  fetch("../../components/footer.html")
    .then(response => response.text())
    .then(data => {
      footerPlaceholder.innerHTML = data;
    })
    .catch(error => {
      console.error("Error loading footer:", error);
    });
}

document.addEventListener("DOMContentLoaded", function () {
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", function (e) {
      e.preventDefault(); 
      localStorage.removeItem("user");
      window.location.href = "../../pages/auth/login.html";
    });
  }
});
