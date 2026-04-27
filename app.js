document.addEventListener("DOMContentLoaded", () => {
  function applyActivityNames() {
    document.querySelectorAll("[data-activity='1']").forEach(el => {
      el.textContent = SITE.activity1;
    });

    document.querySelectorAll("[data-activity='2']").forEach(el => {
      el.textContent = SITE.activity2;
    });

    document.querySelectorAll("[data-activity='3']").forEach(el => {
      el.textContent = SITE.activity3;
    });
  }

  fetch("menu.html")
    .then(res => res.text())
    .then(data => {
      const menu = document.getElementById("menu");

      if (menu) {
        menu.innerHTML = data;
      }

      applyActivityNames();
    });

  applyActivityNames();
});