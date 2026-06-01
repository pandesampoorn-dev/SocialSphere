// SocialSphere — Main JS
document.addEventListener("DOMContentLoaded", function () {
  // Auto-dismiss alerts
  setTimeout(function () {
    document.querySelectorAll(".alert.fade.show").forEach(function (el) {
      try { bootstrap.Alert.getOrCreateInstance(el).close(); } catch(e) {}
    });
  }, 4000);
});
