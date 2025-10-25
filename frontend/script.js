// <!-- XỬ LÝ AVATAR -->

document.addEventListener("DOMContentLoaded", () => {
  const avatarPreview = document.getElementById("avatarPreview");
  const avatarWrapper =
    document.getElementById("avatarWrapper") || avatarPreview.parentElement;

  const userName = "<%= user.name || 'User' %>";
  const avatarSrc = "<%= user.avatarPath || '' %>";

  // Nếu người dùng chưa có ảnh avatar thật
  if (!avatarSrc || avatarSrc.includes("default-avatar")) {
    // Ẩn ảnh thật
    avatarPreview.style.display = "none";

    // Tạo avatar chữ cái đầu tiên
    const initial = userName.trim()
      ? userName.trim().charAt(0).toUpperCase()
      : "?";

    // Kiểm tra màu trong localStorage
    const colorKey = `avatarColor_${userName}`;
    let bgColor = localStorage.getItem(colorKey);

    // Nếu chưa có thì random 1 lần
    if (!bgColor) {
      const colors = [
        "#f87171",
        "#fb923c",
        "#facc15",
        "#4ade80",
        "#60a5fa",
        "#a78bfa",
        "#f472b6",
      ];
      bgColor = colors[Math.floor(Math.random() * colors.length)];
      localStorage.setItem(colorKey, bgColor);
    }

    // Tạo avatar bằng chữ
    const letterAvatar = document.createElement("div");
    letterAvatar.textContent = initial;
    letterAvatar.style.cssText = `width: 100%;height: 100%;border-radius: 50%;background: ${bgColor};color: white;font-weight: 600; font-size: 1.2rem;display: flex;align-items: center;justify-content: center;`;
    avatarWrapper.appendChild(letterAvatar);
  } else {
    // Có ảnh thật thì hiển thị ảnh
    avatarPreview.src = avatarSrc;
    avatarPreview.style.display = "block";
  }

  // ====== Khi người dùng chọn ảnh mới ======
  const avatarInput = document.getElementById("avatarInput");
  if (avatarInput) {
    avatarInput.addEventListener("change", (event) => {
      const file = event.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        // Nếu đã có avatar chữ thì xóa
        const existingLetter = avatarWrapper.querySelector("div");
        if (existingLetter) existingLetter.remove();

        // Hiển thị ảnh mới
        avatarPreview.src = reader.result;
        avatarPreview.style.display = "block";
      };
      reader.readAsDataURL(file);
    });
  }
});

// <!-- hiển thị thông báo  -->

function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;

  container.appendChild(toast);
  setTimeout(() => toast.classList.add("show"), 100);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// <!-- javascript hiện cửa sổ tạo nhóm -->

const popupGroup = document.getElementById("popupGroup");
const btnAddGroup = document.getElementById("btnAddGroup");
const closeGroupPopup = document.getElementById("closeGroupPopup"); // nút X
const cancelGroupBtn = document.getElementById("cancelGroupBtn"); // nút Huỷ

// Hàm mở popup
function openGroupPopup() {
  popupGroup.style.display = "flex";
  popupGroup.style.alignItems = "center";
  popupGroup.style.justifyContent = "center";
  popupGroup.style.backdropFilter = "blur(2px)";
}

// Hàm đóng popup
function closeGroup() {
  popupGroup.style.display = "none";
}

// Sự kiện mở popup
if (btnAddGroup) {
  btnAddGroup.addEventListener("click", openGroupPopup);
}

// Sự kiện đóng popup khi bấm nút X hoặc Huỷ
closeGroupPopup.addEventListener("click", closeGroup);
cancelGroupBtn.addEventListener("click", closeGroup);

// Đóng popup khi click ra ngoài phần nội dung
popupGroup.addEventListener("click", function (e) {
  if (e.target === popupGroup) {
    closeGroup();
  }
});
// ---------------------------------------------------
// Load danh sách nhóm đã tham gia
async function loadGroups() {
  const groupList = document.getElementById("groupList");
  if (!groupList) return;
  groupList.innerHTML =
    '<div style="text-align:center;color:var(--text-muted);padding:20px;">Đang tải...</div>';
  try {
    const res = await fetch("/groups/my-groups", {
      credentials: "same-origin",
    });
    if (!res.ok) throw new Error("Lỗi khi tải nhóm");
    const groups = await res.json();
    if (!Array.isArray(groups) || groups.length === 0) {
      groupList.innerHTML =
        '<div style="text-align:center;color:var(--text-muted);padding:20px;">Bạn chưa tham gia nhóm nào.</div>';
      return;
    }
    groupList.innerHTML = groups
      .map((g) => {
        const leaderName = g.leaderName || "Không rõ";
        return `
                      <div class="group-card" data-id="${g.id}" style="cursor:pointer; border:1px solid #ddd; border-radius:8px; padding:10px 12px; margin:6px 0;">
                        <div class="group-title">${g.groupName}</div>
                        <div class="group-leader">Nhóm trưởng: <span>${leaderName}</span></div>
                      </div>
                      `;
      })
      .join("");

    // Thêm sự kiện click sau khi render
    document.querySelectorAll(".group-card").forEach((card) => {
      card.addEventListener("click", () => {
        const groupId = card.getAttribute("data-id");
        window.location.href = `/groups/${groupId}`; // render group.ejs tương ứng
      });
    });
  } catch (err) {
    groupList.innerHTML =
      '<div style="color:#ef4444;text-align:center;padding:20px;">Lỗi khi tải danh sách nhóm.</div>';
  }
}
window.addEventListener("DOMContentLoaded", loadGroups);

// Xử lý submit tạo nhóm
const groupForm = document.getElementById("groupForm");
if (groupForm) {
  groupForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    const groupName = document.getElementById("groupName").value.trim();
    if (!groupName) return alert("Vui lòng nhập tên nhóm");
    try {
      const res = await fetch("/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupName }),
        credentials: "same-origin",
      });
      const data = await res.json();
      // if (!res.ok) throw new Error(data.error || 'Lỗi tạo nhóm');
      // alert('Tạo nhóm thành công!');
      if (!res.ok) {
        showToast(data.error || "Lỗi tạo nhóm", "error");
      } else {
        showToast("Tạo nhóm thành công!", "success");
      }

      groupForm.reset();
      document.getElementById("popupGroup").style.display = "none";
      loadGroups();
    } catch (err) {
      alert(err.message || "Lỗi khi tạo nhóm");
    }
  });
}

// <!-- javascript hiện cửa sổ thêm thàn viên -->

const popupMember = document.getElementById("popupMember");
const addMemberBtnSmall = document.getElementById("addMemberBtnSmall");
const closeMemberPopup = document.getElementById("closeMemberPopup"); // nút X
const cancelMenberBtn = document.getElementById("cancelMenberBtn"); // nút Huỷ

// Hàm mở popup
function openMemberPopup() {
  popupMember.style.display = "flex";
  popupMember.style.alignItems = "center";
  popupMember.style.justifyContent = "center";
  popupMember.style.backdropFilter = "blur(2px)";
}

// Hàm đóng popup
function closeMember() {
  popupMember.style.display = "none";
}

// Sự kiện mở popup
if (addMemberBtnSmall) {
  addMemberBtnSmall.addEventListener("click", openMemberPopup);
}

// Sự kiện đóng popup khi bấm nút X hoặc Huỷ
closeMemberPopup.addEventListener("click", closeMember);
cancelMenberBtn.addEventListener("click", closeMember);

// Đóng popup khi click ra ngoài phần nội dung
popupMember.addEventListener("click", function (e) {
  if (e.target === popupMember) {
    closeMember();
  }
});

// XỬ LÝ THÊM THÀNH VIÊN
const memberForm = document.getElementById("memberForm");
const memberNameInput = document.getElementById("memberName");
const groupId = "<%= group.id %>";

memberForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const memberName = memberNameInput.value.trim();
  if (!memberName) {
    showToast("Vui lòng nhập tên tài khoản hoặc email!", "warning");
    return;
  }

  try {
    const res = await fetch(`/groups/${groupId}/add-member`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ memberName }),
    });

    const result = await res.json();

    // ✅ Kiểm tra phản hồi từ server
    if (res.ok && result.success) {
      // Thành công
      showToast(result.message || "Đã thêm thành viên thành công.", "success");
      closeMember(); // Đóng popup
      memberNameInput.value = "";
      loadMembers(); // Cập nhật danh sách
    } else {
      // Các lỗi cụ thể được trả về từ server
      switch (res.status) {
        case 400:
          showToast(
            result.error || "Vui lòng nhập tên tài khoản hoặc email.",
            "warning"
          );
          break;
        case 403:
          showToast(
            result.error || "Chỉ trưởng nhóm mới có quyền thêm thành viên.",
            "error"
          );
          break;
        case 404:
          showToast(
            result.error || "Không tìm thấy tài khoản hoặc email này.",
            "error"
          );
          break;
        case 409:
          showToast(
            result.error || "Người này đã là thành viên của nhóm.",
            "warning"
          );
          break;
        default:
          showToast(result.error || "Thêm thành viên thất bại.", "error");
          break;
      }
    }
  } catch (err) {
    console.error("Lỗi fetch:", err);
    showToast("Lỗi khi gửi yêu cầu đến máy chủ.", "error");
  }
});

// <!-- Xử lý xóa nhóm -->

document.addEventListener("DOMContentLoaded", () => {
  // Lấy phần tử popup và các nút
  const popupDeleteGroup = document.getElementById("popupDeleteGroup");
  const openDeletePopup = document.getElementById("openDeletePopup");
  const closeDeletePopup = document.getElementById("closeDeletePopup");
  const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
  const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
  const groupId = "<%= group.id %>";

  // ====== Hàm mở popup ======
  function openPopupDelete() {
    popupDeleteGroup.style.display = "flex";
    popupDeleteGroup.style.alignItems = "center";
    popupDeleteGroup.style.justifyContent = "center";
    popupDeleteGroup.style.backdropFilter = "blur(2px)";
  }

  // ====== Hàm đóng popup ======
  function closePopupDelete() {
    popupDeleteGroup.style.display = "none";
  }

  // ====== Gắn sự kiện ======
  openDeletePopup.addEventListener("click", openPopupDelete);
  closeDeletePopup.addEventListener("click", closePopupDelete);
  cancelDeleteBtn.addEventListener("click", closePopupDelete);

  // Đóng popup khi click ra ngoài
  popupDeleteGroup.addEventListener("click", (e) => {
    if (e.target === popupDeleteGroup) {
      closePopupDelete();
    }
  });

  // ====== Khi xác nhận xóa nhóm ======
  confirmDeleteBtn.addEventListener("click", async () => {
    closePopupDelete(); // đóng popup ngay

    try {
      const res = await fetch(`/groups/${groupId}/delete`, {
        method: "DELETE",
        credentials: "same-origin",
      });

      const result = await res.json();

      if (res.ok && result.success) {
        showToast(result.message || "Nhóm đã được xóa thành công!", "success");
        setTimeout(() => (window.location.href = "/"), 2000);
      } else {
        showToast(result.error || "Không thể xóa nhóm.", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Lỗi khi gửi yêu cầu xóa nhóm.", "error");
    }
  });
});

// <!-- javascript load thành viên -->

async function loadMembers() {
  const membersWrap = document.getElementById("membersWrapRight");
  const memberCountRight = document.getElementById("memberCountRight");
  const groupId = "<%= group.id %>";

  membersWrap.innerHTML =
    '<div style="padding:10px;color:var(--text-muted);text-align:center">Đang tải...</div>';
  try {
    const res = await fetch(`/groups/${groupId}/members`, {
      credentials: "same-origin",
    });
    if (!res.ok) throw new Error("Lỗi khi tải danh sách thành viên");
    const members = await res.json();
    if (members.length === 0) {
      membersWrap.innerHTML =
        '<div style="padding:10px;color:var(--text-muted);text-align:center">Chưa có thành viên nào.</div>';
      memberCountRight.textContent = "0 thành viên";
      return;
    }

    // === Hàm tạo avatar ===
    const colors = [
      "#f87171",
      "#fb923c",
      "#facc15",
      "#4ade80",
      "#60a5fa",
      "#a78bfa",
      "#f472b6",
    ];

    const getAvatarHTML = (member) => {
      if (member.avatarPath && member.avatarPath.trim() !== "") {
        // Có ảnh thật
        return `<img src="${member.avatarPath}" style="width: 32px; height: 32px; object-fit: cover; border-radius: 50%;">`;
      } else {
        // Không có ảnh -> chữ cái đầu
        const letter = member.name
          ? member.name.trim().charAt(0).toUpperCase()
          : "?";
        const colorKey = `avatarColor_${member.userId}`;
        let bgColor = localStorage.getItem(colorKey);
        if (!bgColor) {
          bgColor = colors[Math.floor(Math.random() * colors.length)];
          localStorage.setItem(colorKey, bgColor);
        }
        return `<div style="
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: ${bgColor};
            color: white;
            font-weight: 600;
            font-size: 1rem;
            display: flex;
            align-items: center;
            justify-content: center;
          ">${letter}</div>`;
      }
    };

    // === Render danh sách ===
    membersWrap.innerHTML = members
      .map(
        (m) => `
        <div class="member-item" data-userid="${
          m.userId
        }" style="display: flex; align-items: center; gap: 8px; padding: 6px 0;">
          <div class="avatar">${getAvatarHTML(m)}</div>
          <div style="flex:1">
            <div style="font-weight:600;color:var(--text)">${m.name}</div>
            <div style="font-size:0.9rem;color:var(--text-muted)">
              ${m.roleInGroup === "leader" ? "👑 Trưởng nhóm" : "👤 Thành viên"}
            </div>
          </div>
        </div>`
      )
      .join("");

    memberCountRight.textContent = `${members.length} thành viên`;
  } catch (err) {
    console.error(err);
    membersWrap.innerHTML =
      '<div style="padding:10px;color:#ef4444;text-align:center">Không thể tải danh sách thành viên.</div>';
  }
}

document.addEventListener("DOMContentLoaded", loadMembers);

// <!-- javascript xem, nhắn tin, xóa thành viên -->

const memberMenu = document.getElementById("memberMenu");
let currentMember = null;

// Khi click vào 1 thành viên → hiển thị menu
document.addEventListener("click", (e) => {
  const memberItem = e.target.closest(".member-item");

  // Nếu click vào 1 thành viên
  if (memberItem && memberItem.dataset.userid) {
    e.preventDefault();
    currentMember = memberItem.dataset.userid;

    // Lấy vị trí click
    const rect = memberItem.getBoundingClientRect();
    memberMenu.style.display = "block";
    memberMenu.style.left = `${e.pageX}px`;
    memberMenu.style.top = `${e.pageY}px`;
    memberMenu.setAttribute("aria-hidden", "false");
    return;
  }

  // Nếu click ra ngoài menu thì ẩn menu
  if (!e.target.closest("#memberMenu")) {
    memberMenu.style.display = "none";
    memberMenu.setAttribute("aria-hidden", "true");
  }
});

// Xử lý hành động trong menu
memberMenu.addEventListener("click", async (e) => {
  const action = e.target.dataset.action;
  if (!action || !currentMember) return;

  memberMenu.style.display = "none"; // ẩn menu sau khi chọn

  // Xem thông tin thành viên
  if (action === "view") {
    const popupMemberInfo = document.getElementById("popupMemberInfo");
    const closeMemberInfo = document.getElementById("closeMemberInfo");

    // Đóng popup
    closeMemberInfo.addEventListener("click", () => {
      popupMemberInfo.style.display = "none";
    });

    // Hàm mở popup
    function openMemberInfo(member) {
      document.getElementById("memberName").value = member.name || "";
      document.getElementById("memberUsername").value = member.username || "";
      document.getElementById("memberEmail").value = member.email || "";
      document.getElementById("memberPhone").value = member.phoneNumber || "";
      document.getElementById("memberDob").value = member.dob
        ? new Date(member.dob).toISOString().split("T")[0]
        : "";
      document.getElementById("memberGender").value = member.gender || "";
      document.getElementById("memberAddress").value = member.address || "";
      document.getElementById("avatarPreviewMember").src =
        member.avatarPath || "/uploads/default-avatar.png";
      document.getElementById("bgPreviewMember").src =
        member.backgroundPath || "/uploads/default-bg.png";

      popupMemberInfo.style.display = "flex";
    }

    // Khi chọn “Xem thông tin”
    memberMenu.addEventListener("click", async (e) => {
      const action = e.target.dataset.action;
      if (action === "view" && currentMember) {
        try {
          const res = await fetch(`/groups/users/${currentMember}/info`);
          const member = await res.json();
          if (res.ok) {
            openMemberInfo(member);
          } else {
            alert(member.error || "Không thể tải thông tin thành viên");
          }
        } catch (err) {
          console.error(err);
          alert("Lỗi khi tải thông tin thành viên.");
        }
      }
    });
  }

  // Gửi tin nhắn
  if (action === "message") {
    alert(`💬 Gửi tin nhắn cho: ${currentMember}`);
    // Bạn có thể redirect sang trang chat hoặc mở khung chat
  }

  // --- Popup XÓA THÀNH VIÊN ---
  const popupRemove = document.getElementById("popupRemoveMember");
  const removeConfirmYes = document.getElementById("removeConfirmYes");
  const removeConfirmNo = document.getElementById("removeConfirmNo");
  const closeRemoveBtn = document.getElementById("closeRemoveBtn");
  let memberToRemove = null; // biến tạm lưu id thành viên cần xóa

  // Hiển thị popup xác nhận
  async function showRemovePopup(memberId) {
    memberToRemove = memberId;
    if (popupRemove) {
      popupRemove.classList.add("active");
      popupRemove.setAttribute("aria-hidden", "false");
    }

    const memberMenu = document.querySelector(".member-menu");
    if (memberMenu) memberMenu.classList.remove("show");
  }

  // Xử lý xác nhận XÓA
  removeConfirmYes &&
    removeConfirmYes.addEventListener("click", async () => {
      if (!memberToRemove) return;

      try {
        const groupId = "<%= group.id %>";
        const res = await fetch(`/groups/${groupId}/remove-member`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: memberToRemove }),
          credentials: "same-origin",
        });

        const result = await res.json();

        if (res.ok && result.success) {
          showToast(
            result.message || "🗑️ Đã xoá thành viên thành công!",
            "success"
          );
          loadMembers(); // cập nhật danh sách
        } else {
          // Các lỗi phổ biến từ backend: 400, 403, 404, 409, 500
          showToast(result.error || "Không thể xoá thành viên.", "error");
        }
      } catch (err) {
        console.error("Lỗi khi xoá thành viên:", err);
        showToast("⚠️ Lỗi khi gửi yêu cầu xoá thành viên.", "error");
      } finally {
        // Đóng popup dù thành công hay thất bại
        popupRemove.classList.remove("active");
        popupRemove.setAttribute("aria-hidden", "true");
        memberToRemove = null;
      }
    });

  // Nút "Hủy"
  removeConfirmNo &&
    removeConfirmNo.addEventListener("click", () => {
      popupRemove.classList.remove("active");
      popupRemove.setAttribute("aria-hidden", "true");
    });

  // Nút x
  closeRemoveBtn &&
    closeRemoveBtn.addEventListener("click", () => {
      popupRemove.classList.remove("active");
      popupRemove.setAttribute("aria-hidden", "true");
    });

  // Click ra ngoài popup
  popupRemove &&
    popupRemove.addEventListener("click", (e) => {
      if (e.target === popupRemove) {
        popupRemove.classList.remove("active");
        popupRemove.setAttribute("aria-hidden", "true");
      }
    });

  // ESC để đóng
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && popupRemove.classList.contains("active")) {
      popupRemove.classList.remove("active");
      popupRemove.setAttribute("aria-hidden", "true");
    }
  });

  // ================== KHI CLICK XÓA ==================
  if (action === "remove") {
    showRemovePopup(currentMember);
  }
});

// <!-- javascript đóng popup hiện thông tin -->

// Lấy phần tử popup và nút đóng
const popupProfile = document.getElementById("popupProfile");
const closeProfileBtn = document.getElementById("closeProfileBtn");

// ===== Account menu & profile popup =====
const openProfile = document.getElementById("openProfile");
const userMenu = document.getElementById("userMenu");
openProfile.addEventListener("click", function (e) {
  e.stopPropagation();
  userMenu.style.display =
    userMenu.style.display === "block" ? "none" : "block";
});
document.addEventListener("mousedown", function (e) {
  if (!openProfile.contains(e.target)) {
    userMenu.style.display = "none";
  }
});
document.getElementById("Profile").onclick = function () {
  document.getElementById("popupProfile").style.display = "flex";
  document.getElementById("popupProfile").setAttribute("aria-hidden", "false");
  userMenu.style.display = "none";
};

// Khi bấm nút X thì ẩn popup
closeProfileBtn.addEventListener("click", function () {
  popupProfile.style.display = "none";
});

// <!-- javascript xem trước avatar và background -->

// Xem trước ảnh
function previewImage(event, previewId) {
  const reader = new FileReader();
  reader.onload = () => {
    document.getElementById(previewId).src = reader.result;
  };
  reader.readAsDataURL(event.target.files[0]);
}

// <!------------------------------------------------------------------------------------------------------>

const profileForm = document.getElementById("profileForm");
const avatarInput = document.getElementById("avatarInput");
const backgroundInput = document.getElementById("backgroundInput");
const confirmOverlay = document.getElementById("confirmOverlay");
const confirmYes = document.getElementById("confirmYes");
const confirmNo = document.getElementById("confirmNo");
//const popupProfile = document.getElementById('popupProfile');

// Khi chọn ảnh mới -> hiện popup xác nhận
avatarInput.addEventListener("change", handleImageChange);
backgroundInput.addEventListener("change", handleImageChange);

function handleImageChange(event) {
  const file = event.target.files[0];
  if (!file) return;
  previewImage(
    event,
    event.target.id === "avatarInput" ? "avatarPreview" : "bgPreview"
  );
  confirmOverlay.style.display = "flex";
}

// Hàm xem trước ảnh
function previewImage(event, previewId) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById(previewId).src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// Khi bấm “Xác nhận” => submit form + đóng popup
confirmYes.addEventListener("click", () => {
  confirmOverlay.style.display = "none";
  profileForm.submit(); // gửi form để backend lưu vào DB
  popupProfile.style.display = "none"; // đóng popup thông tin
});

// Khi bấm “Hủy” => đóng popup xác nhận
confirmNo.addEventListener("click", () => {
  confirmOverlay.style.display = "none";
  avatarInput.value = "";
  backgroundInput.value = "";
});

// <!-- javascript sửa thông tin -->

const editBtn = document.getElementById("editProfileBtn");
const saveBtn = document.getElementById("saveProfileBtn");

editBtn.addEventListener("click", () => {
  // Ẩn nút "Sửa"
  editBtn.style.display = "none";

  // Hiện nút "Xác nhận"
  saveBtn.style.display = "inline-block";

  // Mở khóa các input (trừ username và email)
  document
    .querySelectorAll("input[readonly], select[disabled]")
    .forEach((el) => {
      const fieldName = el.getAttribute("name");
      if (fieldName !== "username" && fieldName !== "email") {
        el.removeAttribute("readonly");
        el.removeAttribute("disabled");
        el.style.background = "#fff";
      }
    });
});

// Khi bấm "Xác nhận" thì đổi lại nút "Sửa"
saveBtn.addEventListener("click", () => {
  editBtn.style.display = "inline-block";
  saveBtn.style.display = "none";
});

// javascript mở trang cài đặt

const whOverlay = document.getElementById("whSettings");
const whBtnOpen = document.getElementById("OpenSettings");
const whBtnClose = document.getElementById("whClose");

if (whBtnOpen) {
  whBtnOpen.addEventListener("click", () => {
    whOverlay.style.display = "block";
    if (userMenu) userMenu.style.display = "none";
  });
}
if (whBtnClose) {
  whBtnClose.addEventListener("click", () => {
    whOverlay.style.display = "none";
  });
}
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && whOverlay.style.display === "block") {
    whOverlay.style.display = "none";
  }
});

// Tabs trong trang cài đặt
document.querySelectorAll(".wh-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document
      .querySelectorAll(".wh-tab")
      .forEach((t) => t.classList.remove("wh-active"));
    document
      .querySelectorAll(".wh-panel")
      .forEach((p) => p.classList.remove("wh-show"));
    tab.classList.add("wh-active");
    document
      .querySelector(`.wh-panel[data-tab="${tab.dataset.tab}"]`)
      ?.classList.add("wh-show");
  });
});

// Sidebar highlight
document.querySelectorAll(".wh-nav-item").forEach((btn) => {
  btn.addEventListener("click", () => {
    document
      .querySelectorAll(".wh-nav-item")
      .forEach((b) => b.classList.remove("wh-active"));
    btn.classList.add("wh-active");
  });
});

// ===== CONFIG =====
const USE_FETCH = true;
const API = {
  createGroup: "/groups",
  updateProfile: "/api/profile/update",
};

// Xem trước hình (background/avatar)
function previewImage(evt, targetId) {
  const file = evt.target.files?.[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  const img = document.getElementById(targetId);
  if (img) {
    img.src = url;
  }
}

// ===== Theme =====
const THEME_KEY = "workhub-theme";
const themeBtn = document.getElementById("btnTheme");
const themeIcon = document.getElementById("themeIcon");

function getPreferredTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}
function applyTheme(t) {
  document.documentElement.setAttribute("data-theme", t);
  themeBtn.title = t === "dark" ? "Chuyển sang sáng" : "Chuyển sang tối";
  themeBtn.setAttribute("aria-pressed", t === "dark");
  themeIcon.innerHTML =
    t === "dark"
      ? `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke-width="2"/>`
      : `<circle cx="12" cy="12" r="5" stroke-width="2"/> 
                 <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke-width="2"/>`;
}
function toggleTheme() {
  const current =
    document.documentElement.getAttribute("data-theme") || "light";
  const next = current === "dark" ? "light" : "dark";
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
}
applyTheme(getPreferredTheme());
themeBtn.addEventListener("click", toggleTheme);

// Tabs (toolbar)
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document
      .querySelectorAll(".tab-btn")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
  });
});

// Right panels
const notifPanel = document.getElementById("notifPanel");
const notifPanelContent = document.getElementById("notifPanelContent");
const calendarPanel = document.getElementById("calendarPanel");
const calendarPanelContent = document.getElementById("calendarPanelContent");
const closeNotifPanel = document.getElementById("closeNotifPanel");
const closeCalendarPanel = document.getElementById("closeCalendarPanel");
const btnNotif = document.getElementById("btnNotif");
const btnCalendar = document.getElementById("btnCalendar");

let panelOrder = [];
function showPanel(panel) {
  if (panelOrder.includes(panel)) {
    closePanel(panel);
    return;
  }
  panelOrder = [panel, ...panelOrder];
  if (panelOrder.length > 2) panelOrder = panelOrder.slice(0, 2);

  notifPanel.classList.remove("top", "bottom", "show");
  calendarPanel.classList.remove("top", "bottom", "show");

  function renderNotif() {
    notifPanelContent.innerHTML = `
            <div class="notif-list">
              <div class="notif-item"><div class="notif-dot"></div>Nội dung thông báo</div>
              <div class="notif-item"><div class="notif-dot"></div>Nội dung thông báo</div>
              <div class="notif-item"><div class="notif-dot"></div>Nội dung thông báo</div>
              <div class="notif-item"><div class="notif-dot"></div>Nội dung thông báo</div>
            </div>
          `;
  }
  function renderCalendar() {
    calendarPanelContent.innerHTML = `
            <div class="calendar-card" id="calendarCard">
              <div class="calendar-head">
                <div>
                  <div class="calendar-title" id="titleDay">Hôm nay</div>
                  <div class="calendar-sub" id="subMonth"></div>
                </div>
                <div>
                  <button class="btn" id="prevMth">◀</button>
                  <button class="btn" id="nextMth">▶</button>
                </div>
              </div>
              <div class="calendar-grid" id="calGrid"></div>
            </div>
          `;
    setTimeout(initCalendar, 0);
  }

  if (panelOrder.length === 1) {
    if (panelOrder[0] === "notif") {
      notifPanel.classList.add("show", "top");
      renderNotif();
    } else {
      calendarPanel.classList.add("show", "top");
      renderCalendar();
    }
  } else {
    if (panelOrder[0] === "notif" && panelOrder[1] === "calendar") {
      notifPanel.classList.add("show", "top");
      calendarPanel.classList.add("show", "bottom");
      renderNotif();
    } else {
      calendarPanel.classList.add("show", "top");
      notifPanel.classList.add("show", "bottom");
      renderCalendar();
    }
  }
}
function closePanel(panel) {
  panelOrder = panelOrder.filter((p) => p !== panel);
  notifPanel.classList.remove("top", "bottom", "show");
  calendarPanel.classList.remove("top", "bottom", "show");
  if (panelOrder.length === 1) {
    if (panelOrder[0] === "notif") {
      notifPanel.classList.add("show", "top");
    } else {
      calendarPanel.classList.add("show", "top");
    }
  }
}
btnNotif.onclick = () => showPanel("notif");
btnCalendar.onclick = () => showPanel("calendar");
closeNotifPanel && (closeNotifPanel.onclick = () => closePanel("notif"));
closeCalendarPanel &&
  (closeCalendarPanel.onclick = () => closePanel("calendar"));
document.addEventListener("mousedown", (e) => {
  if (
    notifPanel.classList.contains("show") &&
    !notifPanel.contains(e.target) &&
    !btnNotif.contains(e.target)
  )
    closePanel("notif");
  if (
    calendarPanel.classList.contains("show") &&
    !calendarPanel.contains(e.target) &&
    !btnCalendar.contains(e.target)
  )
    closePanel("calendar");
});

function initCalendar() {
  const calGrid = document.getElementById("calGrid");
  const titleDay = document.getElementById("titleDay");
  const subMonth = document.getElementById("subMonth");
  const prevMth = document.getElementById("prevMth");
  const nextMth = document.getElementById("nextMth");

  let view = new Date();
  function headText(d) {
    return new Intl.DateTimeFormat("vi-VN", {
      weekday: "short",
      month: "short",
      day: "2-digit",
    }).format(d);
  }
  function buildCalendar(date) {
    const y = date.getFullYear(),
      m = date.getMonth();
    titleDay.textContent = headText(new Date());
    subMonth.textContent = new Intl.DateTimeFormat("vi-VN", {
      month: "long",
      year: "numeric",
    })
      .format(new Date(y, m, 1))
      .toUpperCase();
    const first = new Date(y, m, 1);
    const start = (first.getDay() + 6) % 7; // Monday first
    const days = new Date(y, m + 1, 0).getDate();
    const prevDays = new Date(y, m, 0).getDate();
    const parts = [];
    ["T2", "T3", "T4", "T5", "T6", "T7", "CN"].forEach((d) =>
      parts.push(`<div class="dow">${d}</div>`)
    );
    for (let i = 0; i < 42; i++) {
      let label,
        cls = "cell";
      if (i < start) {
        label = prevDays - start + i + 1;
        cls += " faded";
      } else if (i < start + days) {
        label = i - start + 1;
      } else {
        label = i - (start + days) + 1;
        cls += " faded";
      }
      const today = new Date();
      if (
        y === today.getFullYear() &&
        m === today.getMonth() &&
        label === today.getDate() &&
        !cls.includes("faded")
      )
        cls += " today";
      parts.push(`<div class="${cls}">${label}</div>`);
    }
    calGrid.innerHTML = parts.join("");
  }
  prevMth.addEventListener("click", () => {
    view.setMonth(view.getMonth() - 1);
    buildCalendar(view);
  });
  nextMth.addEventListener("click", () => {
    view.setMonth(view.getMonth() + 1);
    buildCalendar(view);
  });
  buildCalendar(view);
}

//Đăng xuất với hộp thoại xác nhận
const logoutBtn = document.getElementById("Logout");
const logoutConfirm = document.getElementById("popupLogout");
const logoutConfirmYes = document.getElementById("logoutConfirmYes");
const logoutConfirmNo = document.getElementById("logoutConfirmNo");

logoutBtn &&
  logoutBtn.addEventListener("click", (e) => {
    e.preventDefault();
    if (logoutConfirm) {
      logoutConfirm.classList.add("active");
      logoutConfirm.setAttribute("aria-hidden", "false");
    } else {
      // chuyển hướng
      window.location.href = "/auth/logout";
    }
    // ẩn user menu
    if (userMenu) userMenu.style.display = "none";
  });

// confirm
logoutConfirmYes &&
  logoutConfirmYes.addEventListener("click", () => {
    window.location.href = "/auth/logout";
  });
logoutConfirmNo &&
  logoutConfirmNo.addEventListener("click", () => {
    if (logoutConfirm) {
      logoutConfirm.classList.remove("active");
      logoutConfirm.setAttribute("aria-hidden", "true");
    }
  });
const closeLogoutBtn = document.getElementById("closeLogoutBtn");
closeLogoutBtn &&
  closeLogoutBtn.addEventListener("click", () => {
    if (logoutConfirm) {
      logoutConfirm.classList.remove("active");
      logoutConfirm.setAttribute("aria-hidden", "true");
    }
  });

// Nhấn X hoặc click ra ngoài để thoát
if (logoutConfirm) {
  logoutConfirm.addEventListener("click", (e) => {
    if (e.target === logoutConfirm) {
      logoutConfirm.classList.remove("active");
      logoutConfirm.setAttribute("aria-hidden", "true");
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && logoutConfirm.classList.contains("active")) {
      logoutConfirm.classList.remove("active");
      logoutConfirm.setAttribute("aria-hidden", "true");
    }
  });
}


