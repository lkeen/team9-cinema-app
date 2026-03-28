// Shared navigation bar for all pages

function loadNav() {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "null");

  let links = "";

  if (token && user) {
    links = `
      <a href="index.html">Home</a>
      <a href="edit-profile.html">Profile</a>
      ${user.role === "Admin" ? '<a href="admin.html">Admin</a>' : ""}
      <a href="#" onclick="logout(); return false;">Logout</a>
      <span class="nav-user">Hi, ${user.first_name}</span>
    `;
  } else {
    links = `
      <a href="index.html">Home</a>
      <a href="login.html">Login</a>
      <a href="register.html">Register</a>
    `;
  }

  const nav = document.createElement("div");
  nav.innerHTML = `
    <nav class="main-nav">
      <div class="nav-brand">Cinema E-Booking</div>
      <div class="nav-links">${links}</div>
    </nav>
    <style>
      .main-nav {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #222;
        padding: 12px 24px;
        margin: -20px -20px 20px -20px;
        color: white;
      }
      .nav-brand {
        font-size: 20px;
        font-weight: bold;
        color: #007bff;
      }
      .nav-links a {
        color: white;
        text-decoration: none;
        margin-left: 18px;
        font-size: 15px;
        transition: color 0.2s;
      }
      .nav-links a:hover {
        color: #007bff;
      }
      .nav-user {
        color: #aaa;
        margin-left: 18px;
        font-size: 14px;
      }
    </style>
  `;
  document.body.prepend(nav);
}

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "index.html";
}

// Wrapper for authenticated fetch calls
async function authFetch(url, options = {}) {
  const token = localStorage.getItem("token");
  if (!options.headers) options.headers = {};
  if (token) {
    options.headers["Authorization"] = "Bearer " + token;
  }
  if (
    options.body &&
    typeof options.body === "string" &&
    !options.headers["Content-Type"]
  ) {
    options.headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url, options);

  if (response.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "login.html";
    return null;
  }

  return response;
}

// Auto-load nav on DOMContentLoaded
document.addEventListener("DOMContentLoaded", loadNav);
