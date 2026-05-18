(() => {
  function load({ path = "menu.html", targetId = "menu", onComplete = () => {} } = {}) {
    fetch(path)
      .then((response) => response.text())
      .then((html) => {
        const menu = document.getElementById(targetId);
        if (menu) {
          menu.innerHTML = html;
        }

        onComplete();
      })
      .catch(() => {
        onComplete();
      });
  }

  window.SiteMenuLoader = {
    load
  };
})();
