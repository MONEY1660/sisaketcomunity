// ศรีสะเกษ Community — post composer behaviours & GPS Check-in
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

  // GPS Check-in elements
  var btnGetGps = document.getElementById("btn-get-gps");
  var gpsBtnText = document.getElementById("gps-btn-text");
  var postLatInput = document.getElementById("post-latitude");
  var postLngInput = document.getElementById("post-longitude");
  var locationNameInput = document.getElementById("location-name-input");
  var gpsResultBox = document.getElementById("ssk-gps-result");
  var coordsDisplay = document.getElementById("coords-display");
  var previewGmapsLink = document.getElementById("preview-gmaps-link");
  var btnClearGps = document.getElementById("btn-clear-gps");

  var tags = [];
  var mediaFiles = [];

  function refreshSubmitState() {
    var hasText = (textArea && textArea.value.trim().length > 0);
    var hasMedia = mediaFiles.length > 0;
    var hasGps = (postLatInput && postLatInput.value && postLngInput && postLngInput.value);
    var hasLocationName = (locationNameInput && locationNameInput.value.trim().length > 0);
    submitBtn.disabled = !(hasText || hasMedia || hasGps || hasLocationName);
  }

  /* ---- text ---- */
  if (textArea) {
    textArea.addEventListener("input", function () {
      if (charCount) charCount.textContent = textArea.value.length;
      refreshSubmitState();
    });
  }

  /* ---- media dropzone ---- */
  function renderMediaPreview() {
    if (!preview) return;
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

  if (fileInput) {
    fileInput.addEventListener("change", function () {
      addFiles(fileInput.files);
    });
  }

  if (dropzone) {
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
  }

  /* ---- tags ---- */
  function renderTags() {
    if (!tagInputWrap || !tagInputField || !tagsHidden) return;
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
    if (tagInputField) tagInputField.value = "";
  }

  if (tagInputField) {
    tagInputField.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        addTag(tagInputField.value);
      } else if (e.key === "Backspace" && tagInputField.value === "" && tags.length) {
        tags.pop();
        renderTags();
      }
    });
  }

  document.querySelectorAll(".ssk-tag-suggestion").forEach(function (btn) {
    btn.addEventListener("click", function () {
      addTag(btn.getAttribute("data-tag"));
    });
  });

  /* ============================================================
     GPS Location Fetching & Google Maps Link
     ============================================================ */
  function setGpsLocation(lat, lng) {
    var latNum = parseFloat(lat);
    var lngNum = parseFloat(lng);
    if (isNaN(latNum) || isNaN(lngNum)) return;

    var latStr = latNum.toFixed(7);
    var lngStr = lngNum.toFixed(7);

    if (postLatInput) postLatInput.value = latStr;
    if (postLngInput) postLngInput.value = lngStr;

    if (coordsDisplay) {
      coordsDisplay.textContent = latNum.toFixed(5) + ", " + lngNum.toFixed(5);
    }

    if (previewGmapsLink) {
      previewGmapsLink.href = "https://www.google.com/maps?q=" + latStr + "," + lngStr;
    }

    if (gpsResultBox) {
      gpsResultBox.style.display = "block";
    }

    // Default place name if empty
    if (locationNameInput && !locationNameInput.value.trim()) {
      locationNameInput.value = "ตำแหน่งปัจจุบัน (" + latNum.toFixed(4) + ", " + lngNum.toFixed(4) + ")";
      locationNameInput.dataset.autoFilled = "true";

      // Try reverse geocode to get a nice district / locality name in Thai
      var revUrl = "https://nominatim.openstreetmap.org/reverse?format=json&lat=" + latNum + "&lon=" + lngNum + "&zoom=16&addressdetails=1&accept-language=th";
      fetch(revUrl)
        .then(function (res) { return res.json(); })
        .then(function (data) {
          if (data && locationNameInput && locationNameInput.dataset.autoFilled === "true") {
            var place = data.name;
            if (!place && data.address) {
              place = data.address.tourism || data.address.amenity || data.address.suburb || data.address.city_district || data.address.town || data.address.city || data.address.county || data.address.state;
            }
            if (place) {
              locationNameInput.value = place.trim();
            }
          }
        })
        .catch(function () {
          // ignore network error
        });
    }

    refreshSubmitState();
  }

  function clearGpsLocation() {
    if (postLatInput) postLatInput.value = "";
    if (postLngInput) postLngInput.value = "";
    if (locationNameInput) {
      locationNameInput.value = "";
      delete locationNameInput.dataset.autoFilled;
    }
    if (gpsResultBox) {
      gpsResultBox.style.display = "none";
    }
    refreshSubmitState();
  }

  if (btnClearGps) {
    btnClearGps.addEventListener("click", clearGpsLocation);
  }

  if (locationNameInput) {
    locationNameInput.addEventListener("input", function () {
      delete locationNameInput.dataset.autoFilled;
      refreshSubmitState();
    });
  }

  if (btnGetGps) {
    btnGetGps.addEventListener("click", function () {
      if (!navigator.geolocation) {
        alert("ขออภัย อุปกรณ์หรือเบราว์เซอร์ของคุณไม่รองรับการดึงพิกัด GPS");
        return;
      }

      btnGetGps.disabled = true;
      if (gpsBtnText) {
        gpsBtnText.textContent = "🛰️ กำลังค้นหาตำแหน่ง GPS ของคุณ…";
      }
      if (window.sskToast) {
        window.sskToast("กำลังค้นหาพิกัด GPS จากอุปกรณ์…");
      }

      navigator.geolocation.getCurrentPosition(
        function (pos) {
          btnGetGps.disabled = false;
          if (gpsBtnText) {
            gpsBtnText.textContent = "📍 ดึงตำแหน่งปัจจุบันของฉัน (GPS)";
          }

          var lat = pos.coords.latitude;
          var lng = pos.coords.longitude;

          setGpsLocation(lat, lng);

          if (window.sskToast) {
            window.sskToast("ดึงพิกัดตำแหน่ง GPS สำเร็จแล้ว! 📍");
          }
        },
        function (err) {
          btnGetGps.disabled = false;
          if (gpsBtnText) {
            gpsBtnText.textContent = "📍 ดึงตำแหน่งปัจจุบันของฉัน (GPS)";
          }

          var msg = "ไม่สามารถระบุพิกัดได้ กรุณาลองใหม่อีกครั้ง";
          if (err.code === 1) {
            msg = "คุณปฏิเสธการเข้าถึงตำแหน่ง GPS (กรุณาอนุญาตการเข้าถึง Location ในการตั้งค่าเบราว์เซอร์)";
          } else if (err.code === 2) {
            msg = "ไม่พบสัญญาณตำแหน่งพิกัดจากอุปกรณ์ กรุณาเปิด GPS/Location ในเครื่อง";
          } else if (err.code === 3) {
            msg = "การค้นหาพิกัด GPS ใช้เวลานานเกินไป กรุณากดลองใหม่อีกครั้ง";
          }
          alert(msg);
        },
        {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 0
        }
      );
    });
  }

  /* ---- submit feedback ---- */
  form.addEventListener("submit", function () {
    if (window.sskToast) {
      window.sskToast("กำลังเผยแพร่โพสต์ของคุณ…");
    }
  });
})();
