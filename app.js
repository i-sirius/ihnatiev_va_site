document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-activity='1']").forEach(el => {
    el.textContent = SITE.activity1;
  });

  document.querySelectorAll("[data-activity='2']").forEach(el => {
    el.textContent = SITE.activity2;
  });

  document.querySelectorAll("[data-activity='3']").forEach(el => {
    el.textContent = SITE.activity3;
  });
});