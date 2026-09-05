// ศรีสะเกษ Community — Main Interactive JS (Like, Comment, Share, Dropdown Menu, Delete Post, Toast, Mobile UX)
(function () {
  "use strict";

  // Helper to read Django CSRF Token (meta tag, cookie, hidden form input)
  function getCookie(name) {
    var cookieValue = null;
    if (document.cookie && document.cookie !== "") {
      var cookies = document.cookie.split(";");
      for (var i = 0; i < cookies.length; i++) {
        var cookie = cookies[i].trim();
        if (cookie.substring(0, name.length + 1) === name + "=") {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  }

  function getCsrfToken() {
    // 1. Meta tag
    var meta = document.querySelector('meta[name="csrf-token"]');
    if (meta && meta.getAttribute("content") && meta.getAttribute("content") !== "{{ csrf_token }}") {
      return meta.getAttribute("content");
    }
    // 2. Cookie
    var fromCookie = getCookie("csrftoken");
    if (fromCookie) return fromCookie;
    // 3. Any hidden CSRF input on the page
    var input = document.querySelector('input[name="csrfmiddlewaretoken"]');
    if (input && input.value) return input.value;
    return "";
  }

  // Toast notification
  function showToast(message) {
    var toast = document.getElementById("ssk-toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(function () {
      toast.classList.remove("is-visible");
    }, 2800);
  }
  window.sskToast = showToast;

  function fallbackCopyText(textToCopy) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(textToCopy)
        .then(function () {
          showToast("🔗 คัดลอกลิงก์โพสต์เรียบร้อยแล้ว!");
        })
        .catch(function () {
          legacyExecCopy(textToCopy);
        });
    } else {
      legacyExecCopy(textToCopy);
    }
  }

  function legacyExecCopy(textToCopy) {
    try {
      var textArea = document.createElement("textarea");
      textArea.value = textToCopy;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      var successful = document.execCommand("copy");
      document.body.removeChild(textArea);
      if (successful) {
        showToast("🔗 คัดลอกลิงก์โพสต์เรียบร้อยแล้ว!");
      } else {
        showToast("คัดลอกลิงก์: " + textToCopy);
      }
    } catch (err) {
      showToast("คัดลอกลิงก์: " + textToCopy);
    }
  }

  // Load comments for a specific post
  function loadComments(postId, listContainer) {
    if (!postId || postId === "0") {
      listContainer.innerHTML = '<div class="comment-empty-hint">ยังไม่มีความคิดเห็นในโพสต์นี้</div>';
      return;
    }

    listContainer.innerHTML = '<div class="comment-empty-hint">กำลังโหลดความคิดเห็น...</div>';

    fetch("/comments/" + postId + "/")
      .then(function (response) {
        if (!response.ok) throw new Error("Network error");
        return response.json();
      })
      .then(function (data) {
        if (!data.comments || data.comments.length === 0) {
          listContainer.innerHTML = '<div class="comment-empty-hint">ยังไม่มีความคิดเห็น เป็นคนแรกที่แสดงความเห็นสิ!</div>';
          return;
        }

        listContainer.innerHTML = "";
        data.comments.forEach(function (c) {
          var avatarHtml = c.avatar_url
            ? '<img src="' + c.avatar_url + '" alt="' + escapeHtml(c.author_name) + '" class="comment-avatar">'
            : '<div class="comment-avatar-fallback">' + (c.avatar_letter || "ศ") + "</div>";

          var item = document.createElement("div");
          item.className = "comment-item";
          item.innerHTML =
            avatarHtml +
            '<div class="comment-content">' +
            '  <div class="comment-header">' +
            '    <span class="comment-author-name">' + escapeHtml(c.author_name) + '</span>' +
            '    <span class="comment-time">' + escapeHtml(c.created_at) + '</span>' +
            '  </div>' +
            '  <div class="comment-text">' + escapeHtml(c.text) + '</div>' +
            '</div>';
          listContainer.appendChild(item);
        });
      })
      .catch(function (err) {
        console.error(err);
        listContainer.innerHTML = '<div class="comment-empty-hint" style="color:var(--ssk-danger);">ไม่สามารถโหลดความคิดเห็นได้</div>';
      });
  }

  function escapeHtml(str) {
    if (!str) return "";
    var div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // Close all open menus
  function closeAllMenus() {
    document.querySelectorAll(".ssk-card__menu-dropdown.is-open").forEach(function (d) {
      d.classList.remove("is-open");
    });
  }

  function init() {
    // 1. Unified Click Handler (Event Delegation)
    document.addEventListener("click", function (e) {
      // --- 1A. Three Dots Menu Toggle ---
      var menuBtn = e.target.closest(".ssk-card__menu-btn");
      if (menuBtn) {
        e.preventDefault();
        e.stopPropagation();
        var currentDropdown = menuBtn.nextElementSibling;
        var isOpen = currentDropdown && currentDropdown.classList.contains("is-open");

        closeAllMenus();

        if (!isOpen && currentDropdown) {
          currentDropdown.classList.add("is-open");
        }
        return;
      }

      // Close all menus if clicked anywhere outside a menu dropdown
      if (!e.target.closest(".ssk-card__actions-dropdown")) {
        closeAllMenus();
      }

      // --- 1B. Delete Post Action ---
      var deleteBtn = e.target.closest(".btn-delete-post");
      if (deleteBtn) {
        e.preventDefault();
        e.stopPropagation();
        closeAllMenus();

        var postId = deleteBtn.getAttribute("data-post-id");
        if (!postId) return;

        var confirmed = window.confirm("คุณแน่ใจหรือไม่ว่าต้องการลบเรื่องราวนี้?\n(เมื่อลบแล้วจะไม่สามารถกู้คืนได้)");
        if (!confirmed) return;

        deleteBtn.disabled = true;
        var originalText = deleteBtn.innerHTML;
        deleteBtn.innerHTML = "<span>กำลังลบ…</span>";

        fetch("/post/" + postId + "/delete/", {
          method: "POST",
          headers: {
            "X-CSRFToken": getCsrfToken(),
            "X-Requested-With": "XMLHttpRequest",
            "Accept": "application/json"
          }
        })
        .then(function (response) {
          return response.json();
        })
        .then(function (data) {
          if (data.success) {
            showToast("ลบเรื่องราวเรียบร้อยแล้ว 🗑️");
            var card = document.getElementById("post-" + postId) || deleteBtn.closest(".ssk-card");
            if (card) {
              card.style.transition = "opacity 0.3s ease, transform 0.3s ease, max-height 0.4s ease, margin 0.4s ease, padding 0.4s ease";
              card.style.opacity = "0";
              card.style.transform = "scale(0.96)";
              card.style.maxHeight = card.offsetHeight + "px";
              window.setTimeout(function () {
                card.style.maxHeight = "0";
                card.style.marginTop = "0";
                card.style.marginBottom = "0";
                card.style.paddingTop = "0";
                card.style.paddingBottom = "0";
                card.style.overflow = "hidden";
                window.setTimeout(function () {
                  card.remove();
                }, 400);
              }, 300);
            }
          } else {
            alert(data.error || "ไม่สามารถลบโพสต์ได้ กรุณาลองใหม่อีกครั้ง");
            deleteBtn.disabled = false;
            deleteBtn.innerHTML = originalText;
          }
        })
        .catch(function (err) {
          console.error(err);
          alert("เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง");
          deleteBtn.disabled = false;
          deleteBtn.innerHTML = originalText;
        });
        return;
      }

      // --- 1C. Password Visibility Toggle ---
      var toggleBtn = e.target.closest("[data-toggle-password]");
      if (toggleBtn) {
        e.preventDefault();
        var targetId = toggleBtn.getAttribute("data-toggle-password");
        var input = document.getElementById(targetId);
        if (!input) return;

        var isPassword = input.type === "password";
        input.type = isPassword ? "text" : "password";

        if (isPassword) {
          toggleBtn.setAttribute("aria-label", "ซ่อนรหัสผ่าน");
          toggleBtn.setAttribute("title", "ซ่อนรหัสผ่าน");
          toggleBtn.classList.add("is-active");
          toggleBtn.innerHTML =
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
        } else {
          toggleBtn.setAttribute("aria-label", "แสดงรหัสผ่าน");
          toggleBtn.setAttribute("title", "แสดงรหัสผ่าน");
          toggleBtn.classList.remove("is-active");
          toggleBtn.innerHTML =
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg>';
        }
        return;
      }

      // --- 1D. Like Button Click ---
      var likeBtn = e.target.closest(".like-btn");
      if (likeBtn) {
        e.preventDefault();
        var postId = likeBtn.getAttribute("data-post-id");
        if (!postId || postId === "0") {
          likeBtn.classList.toggle("liked");
          showToast(likeBtn.classList.contains("liked") ? "❤️ ถูกใจโพสต์นี้แล้ว" : "ยกเลิกถูกใจแล้ว");
          return;
        }

        var csrf = getCsrfToken();
        fetch("/like/", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "X-CSRFToken": csrf,
          },
          body: "post_id=" + encodeURIComponent(postId),
        })
          .then(function (res) {
            if (res.status === 401 || res.status === 403) {
              showToast("🔒 กรุณาเข้าสู่ระบบก่อนกดถูกใจ");
              return null;
            }
            return res.json();
          })
          .then(function (data) {
            if (!data) return;
            if (data.liked) {
              likeBtn.classList.add("liked");
              showToast("❤️ ถูกใจโพสต์นี้แล้ว");
            } else {
              likeBtn.classList.remove("liked");
              showToast("ยกเลิกถูกใจแล้ว");
            }
            var countEl = likeBtn.querySelector(".likes-count");
            if (countEl && typeof data.likes_count !== "undefined") {
              countEl.textContent = data.likes_count;
            }
          })
          .catch(function (err) {
            console.error(err);
            showToast("เกิดข้อผิดพลาดในการกดถูกใจ");
          });
        return;
      }

      // --- 1E. Comment Button Click (Toggle Comment Drawer) ---
      var commentBtn = e.target.closest(".comment-btn");
      if (commentBtn) {
        e.preventDefault();
        var postId = commentBtn.getAttribute("data-post-id");
        var card = commentBtn.closest(".ssk-card");
        if (!card) return;
        var section = card.querySelector(".comment-section");
        if (!section) return;

        var isHidden = window.getComputedStyle(section).display === "none";
        section.style.display = isHidden ? "block" : "none";

        if (isHidden) {
          var listContainer = section.querySelector(".comments-list");
          if (listContainer) {
            loadComments(postId, listContainer);
          }
          var textarea = section.querySelector("textarea");
          if (textarea) {
            textarea.focus();
          }
        }
        return;
      }

      // --- 1F. Friend Button Click (Add / Remove Friend) ---
      var friendBtn = e.target.closest(".friend-btn");
      if (friendBtn) {
        e.preventDefault();
        var username = friendBtn.getAttribute("data-username");
        if (!username) return;

        var csrf = getCsrfToken();
        fetch("/toggle-friend/", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "X-CSRFToken": csrf,
          },
          body: "username=" + encodeURIComponent(username),
        })
          .then(function (res) {
            if (res.status === 401 || res.status === 403) {
              showToast("🔒 กรุณาเข้าสู่ระบบก่อนเพิ่มเพื่อน");
              return null;
            }
            return res.json();
          })
          .then(function (data) {
            if (!data) return;
            if (data.success) {
              document.querySelectorAll('.friend-btn[data-username="' + username + '"]').forEach(function (btn) {
                if (data.is_friend) {
                  btn.classList.remove("btn--primary");
                  btn.classList.add("btn--outline");
                  btn.textContent = "✓ เป็นเพื่อนแล้ว";
                } else {
                  btn.classList.remove("btn--outline");
                  btn.classList.add("btn--primary");
                  btn.textContent = "➕ เพิ่มเพื่อน";
                }
              });

              var friendCountEl = document.getElementById("target-friends-count");
              if (friendCountEl && typeof data.friends_count !== "undefined") {
                friendCountEl.textContent = data.friends_count;
              }

              showToast(data.is_friend ? "🎉 เพิ่มเพื่อนเรียบร้อยแล้ว!" : "ยกเลิกเป็นเพื่อนแล้ว");
            } else if (data.error) {
              showToast(data.error);
            }
          })
          .catch(function (err) {
            console.error(err);
            showToast("เกิดข้อผิดพลาดในการเพิ่มเพื่อน");
          });
        return;
      }

      // --- 1G. Share Button Click (Smart Share + Copy Fallback) ---
      var shareBtn = e.target.closest(".share-btn");
      if (shareBtn) {
        e.preventDefault();
        var postId = shareBtn.getAttribute("data-post-id");
        var shareUrl = window.location.origin + (postId && postId !== "0" ? "/feed/#post-" + postId : "/feed/");
        var shareText = shareBtn.getAttribute("data-post-text") || "เรื่องราวดีๆ จากศรีสะเกษ Community";

        if (navigator.share && /mobile|android|iphone|ipad|ipod/i.test(navigator.userAgent)) {
          navigator
            .share({
              title: "ศรีสะเกษ Community",
              text: shareText,
              url: shareUrl,
            })
            .then(function () {
              showToast("แชร์เรื่องราวเรียบร้อยแล้ว ✨");
            })
            .catch(function (err) {
              if (err && err.name !== "AbortError") {
                fallbackCopyText(shareUrl);
              }
            });
        } else {
          fallbackCopyText(shareUrl);
        }
        return;
      }
    });

    // 2. Comment Form Submission
    document.addEventListener("submit", function (e) {
      var form = e.target.closest(".comment-form");
      if (!form) return;
      e.preventDefault();

      var postId = form.getAttribute("data-post-id");
      var textarea = form.querySelector('textarea[name="comment_text"]');
      if (!textarea) return;
      var text = textarea.value.trim();

      if (!text) {
        showToast("กรุณากรอกข้อความความคิดเห็น");
        return;
      }

      var csrf = getCsrfToken();
      fetch("/comment/", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "X-CSRFToken": csrf,
        },
        body: "post_id=" + encodeURIComponent(postId) + "&text=" + encodeURIComponent(text),
      })
        .then(function (res) {
          if (res.status === 401 || res.status === 403) {
            showToast("🔒 กรุณาเข้าสู่ระบบก่อนแสดงความคิดเห็น");
            return null;
          }
          return res.json();
        })
        .then(function (data) {
          if (!data) return;
          if (data.success && data.comment) {
            textarea.value = "";
            var card = form.closest(".ssk-card");
            var listContainer = card ? card.querySelector(".comments-list") : null;
            if (listContainer) {
              var emptyHint = listContainer.querySelector(".comment-empty-hint");
              if (emptyHint) emptyHint.remove();

              var c = data.comment;
              var avatarHtml = c.avatar_url
                ? '<img src="' + c.avatar_url + '" alt="' + escapeHtml(c.author_name) + '" class="comment-avatar">'
                : '<div class="comment-avatar-fallback">' + (c.avatar_letter || "ศ") + "</div>";

              var item = document.createElement("div");
              item.className = "comment-item";
              item.innerHTML =
                avatarHtml +
                '<div class="comment-content">' +
                '  <div class="comment-header">' +
                '    <span class="comment-author-name">' + escapeHtml(c.author_name) + '</span>' +
                '    <span class="comment-time">' + escapeHtml(c.created_at) + '</span>' +
                '  </div>' +
                '  <div class="comment-text">' + escapeHtml(c.text) + '</div>' +
                '</div>';
              listContainer.prepend(item);
            }

            if (card) {
              var countEl = card.querySelector(".comment-btn .comments-count");
              if (countEl && typeof data.comments_count !== "undefined") {
                countEl.textContent = data.comments_count;
              }
            }

            showToast("💬 โพสต์ความคิดเห็นเรียบร้อยแล้ว!");
          } else if (data.error) {
            showToast(data.error);
          }
        })
        .catch(function (err) {
          console.error(err);
          showToast("เกิดข้อผิดพลาดในการส่งความคิดเห็น");
        });
    });

    // 3. Close Dropdown on Escape Key
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        closeAllMenus();
      }
    });
  }

  // Safe DOM ready execution
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
