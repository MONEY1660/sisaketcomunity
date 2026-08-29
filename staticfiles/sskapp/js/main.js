// ศรีสะเกษ Community — Main Interactive JS (Like, Comment, Share, Toast, Mobile UX)
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

  // Event Delegation for Clicks & Submissions
  document.addEventListener("DOMContentLoaded", function () {
    // 1. Password Toggle
    document.addEventListener("click", function (e) {
      var toggle = e.target.closest("[data-toggle-password]");
      if (toggle) {
        var input = document.getElementById(toggle.getAttribute("data-toggle-password"));
        if (input) {
          input.type = input.type === "password" ? "text" : "password";
        }
        return;
      }

      // 2. Like Button Click
      var likeBtn = e.target.closest(".like-btn");
      if (likeBtn) {
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

      // 3. Comment Button Click (Toggle Comment Drawer)
      var commentBtn = e.target.closest(".comment-btn");
      if (commentBtn) {
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

      // 4. Friend Button Click (Add / Remove Friend)
      var friendBtn = e.target.closest(".friend-btn");
      if (friendBtn) {
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

      // 5. Share Button Click (Smart Share + Copy Fallback)
      var shareBtn = e.target.closest(".share-btn");
      if (shareBtn) {
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

    // 6. Comment Form Submission
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
  });
})();
