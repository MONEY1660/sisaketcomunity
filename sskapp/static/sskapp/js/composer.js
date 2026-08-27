// ศรีสะเกษ Community — post composer behaviours
(function () {
  "use strict";

  var form = document.getElementById("ssk-post-form");
  if (!form) return;

  var textArea = document.getElementById("post-text");
  var charCount = document.getElementById("ssk-charcount");
  var submitBtn = document.getElementById("ssk-submit-btn");
  var dropzone = document.getElementById("ssk-dropzone");
  var fileInput = document.getElementById("post-media");
  var preview = document.getElementById("ssk-media-preview");
  var tagInputWrap = document.getElementById("ssk-tag-input");
  var tagInputField = document.getElementById("tag-input-field");
  var tagsHidden = document.getElementById("tags-hidden-field");

  var tags = [];
  var mediaFiles = [];

  function refreshSubmitState() {
    var hasText = textArea.value.trim().length > 0;
    var hasMedia = mediaFiles.length > 0;
    submitBtn.disabled = !(hasText || hasMedia);
  }

  /* ---- text ---- */
  textArea.addEventListener("input", function () {
    charCount.textContent = textArea.value.length;
    refreshSubmitState();
  });

  /* ---- media dropzone ---- */
  function renderMediaPreview() {
    preview.innerHTML = "";
    mediaFiles.forEach(function (file, index) {
      var item = document.createElement("div");
      item.className = "ssk-media-preview__item";

      var url = URL.createObjectURL(file);
      var el;
      if (file.type.indexOf("video") === 0) {
        el = document.createElement("video");
        el.src = url;
        el.muted = true;
      } else {
        el = document.createElement("img");
        el.src = url;
        el.alt = "ตัวอย่างสื่อที่แนบ";
      }
      item.appendChild(el);

      var removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "ssk-media-preview__remove";
      removeBtn.setAttribute("aria-label", "ลบไฟล์นี้");
      removeBtn.innerHTML = "&times;";
      removeBtn.addEventListener("click", function () {
        mediaFiles.splice(index, 1);
        renderMediaPreview();
        refreshSubmitState();
      });
      item.appendChild(removeBtn);

      preview.appendChild(item);
    });
  }

  function addFiles(fileList) {
    Array.prototype.forEach.call(fileList, function (file) {
      mediaFiles.push(file);
    });
    renderMediaPreview();
    refreshSubmitState();
  }

  fileInput.addEventListener("change", function () {
    addFiles(fileInput.files);
  });

  ["dragenter", "dragover"].forEach(function (evt) {
    dropzone.addEventListener(evt, function (e) {
      e.preventDefault();
      dropzone.classList.add("is-dragover");
    });
  });
  ["dragleave", "drop"].forEach(function (evt) {
    dropzone.addEventListener(evt, function (e) {
      e.preventDefault();
      dropzone.classList.remove("is-dragover");
    });
  });
  dropzone.addEventListener("drop", function (e) {
    if (e.dataTransfer && e.dataTransfer.files) {
      addFiles(e.dataTransfer.files);
    }
  });

  /* ---- tags ---- */
  function renderTags() {
    tagInputWrap.querySelectorAll(".ssk-tag-chip").forEach(function (chip) {
      chip.remove();
    });
    tags.forEach(function (tag, index) {
      var chip = document.createElement("span");
      chip.className = "ssk-tag-chip";
      chip.textContent = tag;

      var removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.setAttribute("aria-label", "ลบแท็ก " + tag);
      removeBtn.innerHTML = "&times;";
      removeBtn.addEventListener("click", function () {
        tags.splice(index, 1);
        renderTags();
      });
      chip.appendChild(removeBtn);

      tagInputWrap.insertBefore(chip, tagInputField);
    });
    tagsHidden.value = tags.join(",");
  }

  function addTag(rawValue) {
    var value = rawValue.trim().replace(/^#/, "");
    if (!value) return;
    if (tags.indexOf(value) === -1 && tags.length < 8) {
      tags.push(value);
      renderTags();
    }
    tagInputField.value = "";
  }

  tagInputField.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(tagInputField.value);
    } else if (e.key === "Backspace" && tagInputField.value === "" && tags.length) {
      tags.pop();
      renderTags();
    }
  });

  document.querySelectorAll(".ssk-tag-suggestion").forEach(function (btn) {
    btn.addEventListener("click", function () {
      addTag(btn.getAttribute("data-tag"));
    });
  });

  /* ---- submit feedback (frontend-only demo) ---- */
  form.addEventListener("submit", function () {
    if (window.sskToast) {
      window.sskToast("กำลังเผยแพร่โพสต์ของคุณ…");
    }
  });
})();
