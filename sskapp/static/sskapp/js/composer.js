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

  // GPS & Location elements
  var btnGetGps = document.getElementById("btn-get-gps");
  var btnPickMap = document.getElementById("btn-pick-map");
  var gpsBtnText = document.getElementById("gps-btn-text");
  var postLatInput = document.getElementById("post-latitude");
  var postLngInput = document.getElementById("post-longitude");
  var locationNameInput = document.getElementById("location-name-input");
  var postLocationUrl = document.getElementById("post-location-url");
  var btnOpenLocationUrl = document.getElementById("btn-open-location-url");
  var gpsResultBox = document.getElementById("ssk-gps-result");
  var coordsDisplay = document.getElementById("coords-display");
  var previewGmapsLink = document.getElementById("preview-gmaps-link");
  var btnClearGps = document.getElementById("btn-clear-gps");
  var existingMediaBox = document.getElementById("ssk-existing-media-box");
  var removeMediaCheckbox = document.getElementById("remove_media");

  var tags = [];
  var mediaFiles = [];

  function refreshSubmitState() {
    var hasText = (textArea && textArea.value.trim().length > 0);
    var hasExistingMedia = (existingMediaBox && (!removeMediaCheckbox || !removeMediaCheckbox.checked));
    var hasMedia = (mediaFiles.length > 0 || hasExistingMedia);
    var hasGps = (postLatInput && postLatInput.value && postLngInput && postLngInput.value);
    var hasLocationName = (locationNameInput && locationNameInput.value.trim().length > 0);
    var hasLocationUrl = (postLocationUrl && postLocationUrl.value.trim().length > 0);
    if (submitBtn) {
      submitBtn.disabled = !(hasText || hasMedia || hasGps || hasLocationName || hasLocationUrl);
    }
  }

  if (removeMediaCheckbox) {
    removeMediaCheckbox.addEventListener("change", refreshSubmitState);
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

  // Initialize existing tags if available (e.g. in Edit mode)
  if (tagInputWrap && tagInputWrap.dataset.initialTags) {
    try {
      var initial = JSON.parse(tagInputWrap.dataset.initialTags);
      if (Array.isArray(initial)) {
        initial.forEach(function (t) {
          if (t && tags.indexOf(t) === -1) tags.push(t);
        });
        renderTags();
      }
    } catch (e) {
      // fallback
    }
  } else if (tagsHidden && tagsHidden.value) {
    tagsHidden.value.split(",").forEach(function (t) {
      var trimmed = t.trim();
      if (trimmed && tags.indexOf(trimmed) === -1) tags.push(trimmed);
    });
    renderTags();
  }

  // Initial state check
  refreshSubmitState();

  /* ============================================================
     GPS Location Fetching, Geolocation Permission & Google Maps
     ============================================================ */
  function setGpsLocation(lat, lng) {
    var latNum = parseFloat(lat);
    var lngNum = parseFloat(lng);
    if (isNaN(latNum) || isNaN(lngNum)) return;

    var latStr = latNum.toFixed(7);
    var lngStr = lngNum.toFixed(7);
    var gmapUrl = "https://www.google.com/maps?q=" + latStr + "," + lngStr;

    if (postLatInput) postLatInput.value = latStr;
    if (postLngInput) postLngInput.value = lngStr;

    if (coordsDisplay) {
      coordsDisplay.textContent = latNum.toFixed(5) + ", " + lngNum.toFixed(5);
    }

    if (previewGmapsLink) {
      previewGmapsLink.href = gmapUrl;
    }

    // Auto-populate the Location URL field if empty or previously auto-filled
    if (postLocationUrl) {
      if (!postLocationUrl.value.trim() || postLocationUrl.dataset.autoFilled === "true") {
        postLocationUrl.value = gmapUrl;
        postLocationUrl.dataset.autoFilled = "true";
      }
      updateUrlOpenButton();
    }

    if (gpsResultBox) {
      gpsResultBox.style.display = "block";
    }

    // Default place name if empty
    if (locationNameInput && (!locationNameInput.value.trim() || locationNameInput.dataset.autoFilled === "true")) {
      locationNameInput.value = "พิกัดปัจจุบัน (" + latNum.toFixed(4) + ", " + lngNum.toFixed(4) + ")";
      locationNameInput.dataset.autoFilled = "true";

      // Try reverse geocode to get a nice district / locality name in Thai
      var revUrl = "https://nominatim.openstreetmap.org/reverse?format=json&lat=" + latNum + "&lon=" + lngNum + "&zoom=16&addressdetails=1&accept-language=th";
      fetch(revUrl)
        .then(function (res) { return res.json(); })
        .then(function (data) {
          if (data && locationNameInput && locationNameInput.dataset.autoFilled === "true") {
            var place = data.name;
            if (!place && data.address) {
              place = data.address.tourism || data.address.amenity || data.address.village || data.address.suburb || data.address.city_district || data.address.town || data.address.city || data.address.county || data.address.state;
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
    if (locationNameInput && locationNameInput.dataset.autoFilled === "true") {
      locationNameInput.value = "";
      delete locationNameInput.dataset.autoFilled;
    }
    if (postLocationUrl && postLocationUrl.dataset.autoFilled === "true") {
      postLocationUrl.value = "";
      delete postLocationUrl.dataset.autoFilled;
      updateUrlOpenButton();
    }
    if (gpsResultBox) {
      gpsResultBox.style.display = "none";
    }
    refreshSubmitState();
  }

  function updateUrlOpenButton() {
    if (!postLocationUrl || !btnOpenLocationUrl) return;
    var url = postLocationUrl.value.trim();
    if (url && (url.indexOf("http://") === 0 || url.indexOf("https://") === 0)) {
      btnOpenLocationUrl.href = url;
      btnOpenLocationUrl.style.display = "inline-flex";
    } else {
      btnOpenLocationUrl.style.display = "none";
    }
  }

  // Parse coordinates if user pastes a Google Maps URL into postLocationUrl
  function extractCoordsFromUrl(url) {
    if (!url) return null;
    // Format 1: @15.1186,104.3225
    var matchAt = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (matchAt) {
      return { lat: parseFloat(matchAt[1]), lng: parseFloat(matchAt[2]) };
    }
    // Format 2: q=15.1186,104.3225 or query=15.1186,104.3225
    var matchQ = url.match(/[?&](?:q|query)=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (matchQ) {
      return { lat: parseFloat(matchQ[1]), lng: parseFloat(matchQ[2]) };
    }
    // Format 3: ll=15.1186,104.3225
    var matchLl = url.match(/[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (matchLl) {
      return { lat: parseFloat(matchLl[1]), lng: parseFloat(matchLl[2]) };
    }
    return null;
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

  if (postLocationUrl) {
    postLocationUrl.addEventListener("input", function () {
      delete postLocationUrl.dataset.autoFilled;
      updateUrlOpenButton();
      var extracted = extractCoordsFromUrl(postLocationUrl.value.trim());
      if (extracted) {
        setGpsLocation(extracted.lat, extracted.lng);
        if (window.sskToast) {
          window.sskToast("ตรวจพบพิกัดจากลิงก์ Google Maps เรียบร้อย! 📍");
        }
      }
      refreshSubmitState();
    });
  }

  /**
   * Request Geolocation permission and locate user
   * @param {boolean} openMapsInNewTab - whether to open Google Maps after locating
   */
  function requestLocationPermissionAndLocate(openMapsInNewTab) {
    if (!navigator.geolocation) {
      alert("ขออภัย อุปกรณ์หรือเบราว์เซอร์ของคุณไม่รองรับการดึงพิกัดตำแหน่ง (Geolocation)");
      if (openMapsInNewTab) {
        window.open("https://www.google.com/maps/search/?api=1&query=%E0%B8%A8%E0%B8%A3%E0%B8%B5%E0%B8%AA%E0%B8%B0%E0%B8%81%E0%B8%A9", "_blank");
      }
      return;
    }

    if (btnGetGps) btnGetGps.disabled = true;
    if (btnPickMap) btnPickMap.disabled = true;

    if (gpsBtnText) {
      gpsBtnText.textContent = "🛰️ กำลังขอสิทธิ์ & ค้นหาตำแหน่ง…";
    }
    if (window.sskToast) {
      window.sskToast("กำลังขอสิทธิ์และค้นหาพิกัดตำแหน่งของคุณ…");
    }

    navigator.geolocation.getCurrentPosition(
      function (pos) {
        if (btnGetGps) btnGetGps.disabled = false;
        if (btnPickMap) btnPickMap.disabled = false;
        if (gpsBtnText) {
          gpsBtnText.textContent = "📍 ดึงตำแหน่งปัจจุบันอีกครั้ง (GPS)";
        }

        var lat = pos.coords.latitude;
        var lng = pos.coords.longitude;

        setGpsLocation(lat, lng);

        if (window.sskToast) {
          window.sskToast("ระบุพิกัดตำแหน่งปัจจุบันสำเร็จแล้ว! 📍");
        }

        if (openMapsInNewTab) {
          var targetUrl = "https://www.google.com/maps?q=" + lat.toFixed(7) + "," + lng.toFixed(7);
          window.open(targetUrl, "_blank");
        }
      },
      function (err) {
        if (btnGetGps) btnGetGps.disabled = false;
        if (btnPickMap) btnPickMap.disabled = false;
        if (gpsBtnText) {
          gpsBtnText.textContent = "📍 ขอสิทธิ์ & ระบุตำแหน่งปัจจุบัน";
        }

        var msg = "ไม่สามารถระบุพิกัดได้ กรุณาลองใหม่อีกครั้ง";
        if (err.code === 1) {
          msg = "คุณปฏิเสธการให้สิทธิ์เข้าถึงตำแหน่ง (กรุณาอนุญาต Location Permission ในเบราว์เซอร์และเปิด GPS บนอุปกรณ์เพื่อระบุพิกัดอัตโนมัติ)";
        } else if (err.code === 2) {
          msg = "ไม่พบสัญญาณพิกัดตำแหน่งจากอุปกรณ์ กรุณาเปิดระบบระบุตำแหน่ง (GPS/Location) บนเครื่องของคุณ";
        } else if (err.code === 3) {
          msg = "การค้นหาพิกัดตำแหน่งใช้เวลานานเกินไป กรุณากดลองใหม่อีกครั้ง";
        }
        alert(msg);

        if (openMapsInNewTab) {
          // Open general map search for Sisaket
          window.open("https://www.google.com/maps/search/?api=1&query=%E0%B8%A8%E0%B8%A3%E0%B8%B5%E0%B8%AA%E0%B8%B0%E0%B8%81%E0%B8%A9", "_blank");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0
      }
    );
  }

  // Trigger GPS permission & locate on button click
  if (btnGetGps) {
    btnGetGps.addEventListener("click", function () {
      requestLocationPermissionAndLocate(false);
    });
  }

  // "เลือกบน Google Maps" button: requests permission, locates user, and opens Google Maps!
  if (btnPickMap) {
    btnPickMap.addEventListener("click", function (e) {
      e.preventDefault();
      // If coordinates already found, just open the Google Maps URL
      if (postLatInput && postLatInput.value && postLngInput && postLngInput.value) {
        var existingUrl = "https://www.google.com/maps?q=" + postLatInput.value + "," + postLngInput.value;
        window.open(existingUrl, "_blank");
      } else {
        // Request permission and locate, then open Google Maps
        requestLocationPermissionAndLocate(true);
      }
    });
  }

  /* ---- submit feedback ---- */
  form.addEventListener("submit", function () {
    if (window.sskToast) {
      window.sskToast("กำลังเผยแพร่โพสต์ของคุณ…");
    }
  });
})();
