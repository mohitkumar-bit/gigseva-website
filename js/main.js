// ==============================
// LOAD HEADER + INIT NAVBAR
// ==============================
document.addEventListener("DOMContentLoaded", () => {

  // 👉 Load Header
  fetch("components/header.html")
    .then((res) => {
      if (!res.ok) throw new Error(`Header ${res.status}`);
      return res.text();
    })
    .then((data) => {
      const el = document.getElementById("header");
      if (!el) return;
      el.innerHTML = data;
      initNavbar();
      if (typeof renderAuthNav === "function") {
        renderAuthNav();
      }
      // Refresh profile name from API when logged in
      if (window.AuthStore?.isLoggedIn()) {
        AuthApi.getProfile()
          .then(() => renderAuthNav())
          .catch(() => {
            // token expired / revoked
            AuthStore.clear();
            renderAuthNav();
          });
      }
    })
    .catch((err) => console.error("Header load error:", err));

  // 👉 Load Footer
  fetch("components/footer.html")
    .then((res) => {
      if (!res.ok) throw new Error(`Footer ${res.status}`);
      return res.text();
    })
    .then((data) => {
      const el = document.getElementById("footer");
      if (!el) return;
      el.innerHTML = data;
    })
    .catch((err) => console.error("Footer load error:", err));

});


// ==============================
// NAVBAR FUNCTION
// ==============================
function initNavbar() {

  const hamburger = document.getElementById("hamburger");
  const navMenu = document.getElementById("navMenu");
  const navbar = document.getElementById("navbar");

  if (!hamburger || !navMenu || !navbar) {
    console.warn("Navbar elements not found!");
    return;
  }

  // ==========================
  // MOBILE TOGGLE
  // ==========================
  hamburger.addEventListener("click", () => {
    hamburger.classList.toggle("open");
    navMenu.classList.toggle("open"); // ✅ FIXED (was active)
  });

  // ==========================
  // CLOSE MENU ON LINK CLICK
  // ==========================
  const navLinks = navMenu.querySelectorAll(".nav-link");

  navLinks.forEach(link => {
    link.addEventListener("click", () => {
      hamburger.classList.remove("open");
      navMenu.classList.remove("open");
    });
  });

  // ==========================
  // SCROLL EFFECT
  // ==========================
  window.addEventListener("scroll", () => {
    navbar.classList.toggle("scrolled", window.scrollY > 50);
  });

}