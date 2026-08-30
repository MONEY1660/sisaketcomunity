// ศรีสะเกษ Community — post composer behaviours & Check-in system
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

  // Location / Check-in elements
  var mapElement = document.getElementById("ssk-composer-map");
  var btnGetGps = document.getElementById("btn-get-gps");
  var mapSearchInput = document.getElementById("map-search-input");
  var btnSearchLocation = document.getElementById("btn-search-location");
  var locationNameInput = document.getElementById("location-name-input");
  var postLatInput = document.getElementById("post-latitude");
  var postLngInput = document.getElementById("post-longitude");
  var checkinStatusBar = document.getElementById("ssk-checkin-status");
  var coordsDisplay = document.getElementById("coords-display");
  var previewGmapsLink = document.getElementById("preview-gmaps-link");
  var btnClearCheckin = document.getElementById("btn-clear-checkin");
  var locChips = document.querySelectorAll(".ssk-loc-chip");

  var tags = [];
  var mediaFiles = [];

  function refreshSubmitState() {
    var hasText = (textArea && textArea.value.trim().length > 0);
    var hasMedia = mediaFiles.length > 0;
    var hasLocation = (locationNameInput && locationNameInput.value.trim().length > 0);
    submitBtn.disabled = !(hasText || hasMedia || hasLocation);
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
     Check-in & Interactive Map (Leaflet & Google Maps integration)
     ============================================================ */
  var map = null;
  var marker = null;
  // Sisaket Town Hall default center
  var DEFAULT_LAT = 15.1186;
  var DEFAULT_LNG = 104.3220;

  function initMap() {
    if (!mapElement || typeof L === "undefined") return;

    map = L.map("ssk-composer-map", {
      center: [DEFAULT_LAT, DEFAULT_LNG],
      zoom: 12,
      zoomControl: true,
      attributionControl: false
    });

    // OpenStreetMap tiles
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19
    }).addTo(map);

    // Click map to place/move marker
    map.on("click", function (e) {
      setPinLocation(e.latlng.lat, e.latlng.lng, true);
    });

    // Ensure map tiles render properly if container was initially hidden/sized
    setTimeout(function () {
      map.invalidateSize();
    }, 400);
  }

  function setPinLocation(lat, lng, fetchName) {
    lat = parseFloat(lat);
    lng = parseFloat(lng);
    if (isNaN(lat) || isNaN(lng)) return;

    if (!marker) {
      // Create custom marker icon
      var customIcon = L.divIcon({
        className: 'ssk-custom-map-pin',
        html: '<div class="ssk-pin-glow"></div><div class="ssk-pin-icon">📍</div>',
        iconSize: [36, 36],
        iconAnchor: [18, 36],
        popupAnchor: [0, -36]
      });

      marker = L.marker([lat, lng], {
        draggable: true,
        icon: customIcon
      }).addTo(map);

      marker.on("dragend", function (ev) {
        var pos = ev.target.getLatLng();
        setPinLocation(pos.lat, pos.lng, true);
      });
    } else {
      marker.setLatLng([lat, lng]);
    }

    if (map) {
      map.panTo([lat, lng]);
    }

    // Update hidden inputs
    if (postLatInput) postLatInput.value = lat.toFixed(7);
    if (postLngInput) postLngInput.value = lng.toFixed(7);

    // Update UI status bar
    if (coordsDisplay) {
      coordsDisplay.textContent = lat.toFixed(5) + ", " + lng.toFixed(5);
    }
    if (previewGmapsLink) {
      previewGmapsLink.href = "https://www.google.com/maps?q=" + lat.toFixed(7) + "," + lng.toFixed(7);
    }
    if (checkinStatusBar) {
      checkinStatusBar.style.display = "flex";
    }

    // Try reverse geocoding to suggest place name if input is empty or requested
    if (fetchName && (!locationNameInput.value.trim() || locationNameInput.dataset.autoFilled === "true")) {
      reverseGeocode(lat, lng);
    }

    refreshSubmitState();
  }

  function reverseGeocode(lat, lng) {
    var url = "https://nominatim.openstreetmap.org/reverse?format=json&lat=" + lat + "&lon=" + lng + "&zoom=18&addressdetails=1&accept-language=th";
    fetch(url)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data && (data.display_name || data.name)) {
          var name = data.name;
          if (!name && data.address) {
            name = data.address.tourism || data.address.amenity || data.address.road || data.address.suburb || data.address.city || data.address.county || data.address.state;
          }
          if (!name) {
            name = (data.display_name || "").split(",")[0];
          }
          if (name && locationNameInput) {
            locationNameInput.value = name.trim();
            locationNameInput.dataset.autoFilled = "true";
            refreshSubmitState();
          }
        }
      })
      .catch(function () {
        // Fallback silently if offline or request fails
      });
  }

  function clearCheckin() {
    if (marker && map) {
      map.removeLayer(marker);
      marker = null;
    }
    if (postLatInput) postLatInput.value = "";
    if (postLngInput) postLngInput.value = "";
    if (locationNameInput) {
      locationNameInput.value = "";
      delete locationNameInput.dataset.autoFilled;
    }
    if (mapSearchInput) mapSearchInput.value = "";
    if (checkinStatusBar) checkinStatusBar.style.display = "none";
    if (map) map.setView([DEFAULT_LAT, DEFAULT_LNG], 12);
    refreshSubmitState();
  }

  // Location name typing
  if (locationNameInput) {
    locationNameInput.addEventListener("input", function () {
      delete locationNameInput.dataset.autoFilled;
      if (previewGmapsLink && !postLatInput.value && locationNameInput.value.trim()) {
        previewGmapsLink.href = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(locationNameInput.value.trim());
      }
      refreshSubmitState();
    });
  }

  // Clear checkin button
  if (btnClearCheckin) {
    btnClearCheckin.addEventListener("click", clearCheckin);
  }

  // Landmark suggestion chips
  locChips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      var name = chip.getAttribute("data-name");
      var lat = parseFloat(chip.getAttribute("data-lat"));
      var lng = parseFloat(chip.getAttribute("data-lng"));

      if (locationNameInput) {
        locationNameInput.value = name;
        delete locationNameInput.dataset.autoFilled;
      }
      if (map) {
        map.setView([lat, lng], 15);
      }
      setPinLocation(lat, lng, false);
      if (window.sskToast) {
        window.sskToast("ปักหมุดที่: " + name);
      }
    });
  });

  // GPS Current Location button
  if (btnGetGps) {
    btnGetGps.addEventListener("click", function () {
      if (!navigator.geolocation) {
        alert("ขออภัย อุปกรณ์ของคุณไม่รองรับ Geolocation GPS");
        return;
      }

      btnGetGps.classList.add("loading");
      var originalText = btnGetGps.innerHTML;
      btnGetGps.innerHTML = '<span>กำลังค้นหาพิกัด GPS…</span>';

      if (window.sskToast) {
        window.sskToast("กำลังดึงพิกัดจาก GPS ของคุณ…");
      }

      navigator.geolocation.getCurrentPosition(
        function (pos) {
          btnGetGps.classList.remove("loading");
          btnGetGps.innerHTML = originalText;

          var lat = pos.coords.latitude;
          var lng = pos.coords.longitude;

          if (map) {
            map.setView([lat, lng], 16);
          }
          setPinLocation(lat, lng, true);

          if (window.sskToast) {
            window.sskToast("ดึงพิกัดปัจจุบันสำเร็จ! 📍");
          }
        },
        function (err) {
          btnGetGps.classList.remove("loading");
          btnGetGps.innerHTML = originalText;
          var msg = "ไม่สามารถระบุพิกัดได้ (กรุณาอนุญาตการเข้าถึง Location ในเบราว์เซอร์)";
          if (err.code === 1) {
            msg = "คุณปฏิเสธการเข้าถึงตำแหน่ง GPS (กรุณาเปิดสิทธิ์ Location)";
          }
          alert(msg);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  }

  // Search Location by Name
  function searchLocation() {
    if (!mapSearchInput) return;
    var query = mapSearchInput.value.trim();
    if (!query) return;

    // Append Sisaket / Thailand context for better local matches if not specified
    var searchQuery = query;
    if (searchQuery.indexOf("ศรีสะเกษ") === -1 && searchQuery.indexOf("Sisaket") === -1) {
      searchQuery += " ศรีสะเกษ";
    }

    var searchUrl = "https://nominatim.openstreetmap.org/search?format=json&q=" + encodeURIComponent(searchQuery) + "&countrycodes=th&limit=1&accept-language=th";
    
    if (btnSearchLocation) {
      btnSearchLocation.textContent = "กำลังค้นหา...";
      btnSearchLocation.disabled = true;
    }

    fetch(searchUrl)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (btnSearchLocation) {
          btnSearchLocation.textContent = "ค้นหา";
          btnSearchLocation.disabled = false;
        }

        if (data && data.length > 0) {
          var item = data[0];
          var lat = parseFloat(item.lat);
          var lng = parseFloat(item.lon);

          if (map) {
            map.setView([lat, lng], 15);
          }
          if (locationNameInput && !locationNameInput.value.trim()) {
            locationNameInput.value = query;
          }
          setPinLocation(lat, lng, false);
          if (window.sskToast) {
            window.sskToast("พบสถานที่: " + (item.display_name.split(",")[0] || query));
          }
        } else {
          // Fallback search without province suffix
          fetch("https://nominatim.openstreetmap.org/search?format=json&q=" + encodeURIComponent(query) + "&countrycodes=th&limit=1&accept-language=th")
            .then(function (res2) { return res2.json(); })
            .then(function (data2) {
              if (data2 && data2.length > 0) {
                var item2 = data2[0];
                var lat2 = parseFloat(item2.lat);
                var lng2 = parseFloat(item2.lon);
                if (map) map.setView([lat2, lng2], 15);
                if (locationNameInput && !locationNameInput.value.trim()) {
                  locationNameInput.value = query;
                }
                setPinLocation(lat2, lng2, false);
                if (window.sskToast) {
                  window.sskToast("พบสถานที่: " + query);
                }
              } else {
                alert("ไม่พบตำแหน่งของ \"" + query + "\" บนแผนที่ กรุณาลองค้นหาคำอื่นหรือคลิกเลือกบนแผนที่โดยตรง");
              }
            });
        }
      })
      .catch(function () {
        if (btnSearchLocation) {
          btnSearchLocation.textContent = "ค้นหา";
          btnSearchLocation.disabled = false;
        }
        alert("เกิดข้อผิดพลาดในการค้นหาสถานที่");
      });
  }

  if (btnSearchLocation) {
    btnSearchLocation.addEventListener("click", searchLocation);
  }
  if (mapSearchInput) {
    mapSearchInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        searchLocation();
      }
    });
  }

  // Initialize Map
  initMap();

  /* ---- submit feedback ---- */
  form.addEventListener("submit", function () {
    if (window.sskToast) {
      window.sskToast("กำลังเผยแพร่โพสต์ของคุณ…");
    }
  });
})();
