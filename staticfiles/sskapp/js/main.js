// ศรีสะเกษ Community — shared UI behaviours (toast, password toggle, like button)
(function () {
  "use strict";

  function showToast(message) {
    var toast = document.getElementById("ssk-toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(function () {
      toast.classList.remove("is-visible");
    }, 2400);
  }
  window.sskToast = showToast;

  document.addEventListener("click", function (e) {
    var toggle = e.target.closest("[data-toggle-password]");
    if (toggle) {
      var input = document.getElementById(toggle.getAttribute("data-toggle-password"));
      if (input) {
        input.type = input.type === "password" ? "text" : "password";
      }
      return;
    }

    var likeBtn = e.target.closest("[data-like]");
    if (likeBtn) {
      likeBtn.classList.toggle("ssk-action--active");
      var countEl = likeBtn.textContent.match(/\d+/);
      showToast(likeBtn.classList.contains("ssk-action--active") ? "ถูกใจโพสต์นี้แล้ว" : "ยกเลิกถูกใจแล้ว");
    }
  });
})();
