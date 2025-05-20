// Register
document.addEventListener("DOMContentLoaded", function () {
  const registerForm = document.getElementById("register-form");
  if (registerForm) {
    registerForm.addEventListener("submit", async function (e) {
      e.preventDefault();
const firstName = registerForm.querySelector("#firstName").value.trim();
const lastName = registerForm.querySelector("#lastName").value.trim();
const email = registerForm.querySelector("#registeremail").value.trim();
const password = registerForm.querySelector("#password").value;
const confirmPassword = registerForm.querySelector("#confirmPassword").value;
const agreed = registerForm.querySelector("#terms").checked;

if (!agreed) {
  alert("You must agree to the Terms and Conditions.");
  return;
}

if (password !== confirmPassword) {
  alert("Passwords do not match.");
  return;
}

const name = `${firstName} ${lastName}`;
      //  Check if user exist
      const checkRes = await fetch(`http://localhost:3000/users?email=${email}`);
      if (!checkRes.ok) {
  alert("Server error during email check");
  return;
}
      const existingUsers = await checkRes.json();
console.log("Users with this email:", existingUsers);
      if (existingUsers.length > 0) {
        alert("This Email Already Exist.");
        return;
        }
      const newUser = {
        name,
        email,
        password,
        profileImage:"",
        role: "backer",
        isActive: true,
        campaignerRequest: false,
        campaignerStatus:null,
        campaignerApplication: {},
        lastUpdated: "2024-01-01T00:00:00Z",
      };
      await fetch("http://localhost:3000/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser)
      });
      alert("account has been created successfully");
      window.location.href = "../../../pages/auth/login.html";
    });
  }
});
// Login
document.addEventListener("DOMContentLoaded", function () {
    const loginForm = document.getElementById("login-form");
    if (loginForm) {
    loginForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const res = await fetch(`http://localhost:3000/users?email=${email}&password=${password}`);
      const users = await res.json();
      if (users.length === 0) {
        alert("The login information is incorrect.");
        return;
      }
      const user = users[0];
      if (!user.isActive) {
        alert("This account has been disabled.");
        return;
      }
      localStorage.setItem("user", JSON.stringify(user));
      if (user.role === "admin") {
        window.location.href = "../../dashboard/admin-panel/index.html";
      } else {
        window.location.href = "../../dashboard/bucker-profile/bucker-profile.html"; 
      }
    });
  }
});


const logoutBtn = document.getElementById("logout-btn");

if (logoutBtn) {
  logoutBtn.addEventListener("click", function (e) {
    e.preventDefault(); 
    localStorage.removeItem("user");
    window.location.href = "../../pages/auth/login.html";
  });
}

