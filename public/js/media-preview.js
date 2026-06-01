const mediaInput   = document.getElementById("mediaInput");
const mediaPreview = document.getElementById("mediaPreview");
const submitBtn    = document.getElementById("submitBtn");

if (mediaInput) {
  mediaInput.addEventListener("change", function () {
    mediaPreview.innerHTML = "";
    const files = Array.from(this.files);
    if (files.length > 5) { alert("Maximum 5 files allowed."); this.value = ""; return; }
    files.forEach(function (file) {
      const isVideo = file.type.startsWith("video/");
      const wrapper = document.createElement("div");
      wrapper.style.cssText = "width:80px;";
      if (isVideo) {
        const icon = document.createElement("div");
        icon.className = "d-flex align-items-center justify-content-center bg-dark text-white rounded";
        icon.style.cssText = "width:80px;height:80px;font-size:11px;text-align:center;";
        icon.textContent = "Video";
        wrapper.appendChild(icon);
      } else {
        const img = document.createElement("img");
        img.src = URL.createObjectURL(file);
        img.className = "rounded";
        img.style.cssText = "width:80px;height:80px;object-fit:cover;";
        wrapper.appendChild(img);
      }
      const size = document.createElement("div");
      size.className = "text-muted text-center mt-1";
      size.style.cssText = "font-size:10px;";
      size.textContent = (file.size/1024/1024).toFixed(1) + " MB";
      wrapper.appendChild(size);
      mediaPreview.appendChild(wrapper);
    });
  });
}

const postForm = document.getElementById("postForm");
if (postForm && submitBtn) {
  postForm.addEventListener("submit", function () {
    if (mediaInput && mediaInput.files.length > 0) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Uploading...";
    }
  });
}
