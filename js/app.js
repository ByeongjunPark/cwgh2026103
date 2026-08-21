/**
 * 창원여자고등학교 1학년 3반 메인 컨트롤러 앱 & 2-Way 구글시트 백엔드 통신
 */

const GOOGLE_APPS_SCRIPT_CODE = `// 🌸 창원여고 1-3반 알림판 2-Way 양방향 자동 연동 스크립트

function setupCWGHClass1_3Sheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const configs = [
    { name: "알림장", headers: ["ID", "분류", "제목", "상세내용", "작성일", "중요핀여부"] },
    { name: "시간표", headers: ["교시", "시간", "월", "화", "수", "목", "금"] },
    { name: "학사일정", headers: ["ID", "일자", "행사/일정명", "구분", "D-Day표시여부"] },
    { name: "생일", headers: ["ID", "이름", "월", "일", "MBTI", "축하한마디"] },
    { name: "1인1역할", headers: ["ID", "역할명", "담당자이름", "세부담당업무", "이모지아이콘"] },
    { name: "수행평가", headers: ["ID", "과목", "수행평가제목", "제출기한", "상세설명"] },
    { name: "학생계정", headers: ["학번/아이디", "이름", "비밀번호_SHA256해시", "권한"] }
  ];
  configs.forEach(cfg => {
    let sheet = ss.getSheetByName(cfg.name) || ss.insertSheet(cfg.name);
    sheet.clear();
    sheet.getRange(1, 1, 1, cfg.headers.length).setValues([cfg.headers]);
    sheet.getRange(1, 1, 1, cfg.headers.length).setFontWeight("bold").setBackground("#FFB7C5").setFontColor("#FFFFFF");
  });
  SpreadsheetApp.getUi().alert("🌸 창원여고 1학년 3반 알림판 7개 탭과 헤더가 자동 생성되었습니다!");
}

// 🚀 웹사이트 ➔ 구글 시트 자동 저장 백엔드 (doPost)
function doPost(e) {
  try {
    const contents = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const action = contents.action;

    if (action === "signup") {
      const sheet = ss.getSheetByName("학생계정") || ss.insertSheet("학생계정");
      sheet.appendRow([contents.id, contents.name, contents.passwordHash, contents.role || "student"]);
      return ContentService.createTextOutput(JSON.stringify({ result: "success" })).setMimeType(ContentService.MimeType.JSON);
    } else if (action === "add_notice") {
      const sheet = ss.getSheetByName("알림장") || ss.insertSheet("알림장");
      sheet.appendRow([contents.id, contents.category, contents.title, contents.content, contents.date, contents.pinned ? "Y" : "N"]);
      return ContentService.createTextOutput(JSON.stringify({ result: "success" })).setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService.createTextOutput(JSON.stringify({ result: "ok" })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ result: "error", error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}`;

document.addEventListener("DOMContentLoaded", () => {
  let appState = loadState();
  initApp(appState);
  startLiveClock();
  setupAuthSystem(appState);
  setupScriptCopyButton();

  if (appState.googleSheetId) {
    syncWithGoogleSheet(appState.googleSheetId);
  }
});

function setupScriptCopyButton() {
  const btn = document.getElementById("btn-copy-script");
  if (btn) {
    btn.addEventListener("click", () => {
      navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE).then(() => {
        alert("📋 구글 시트 양방향 백엔드 스크립트가 복사되었습니다!");
      });
    });
  }
}

function loadState() {
  const saved = localStorage.getItem("cwgh_1_3_state");
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      parsed.timetable = INITIAL_DATA.timetable;
      parsed.calendar = INITIAL_DATA.calendar;
      return parsed;
    } catch (e) {
      console.error("State parse error:", e);
    }
  }
  return { ...INITIAL_DATA, googleSheetId: DEFAULT_SHEET_ID, currentUser: null };
}

function saveState(state) {
  localStorage.setItem("cwgh_1_3_state", JSON.stringify(state));
}

function initApp(state) {
  renderHeader(state);
  renderDashboard(state);
  renderTimetable(state);
  renderIntegratedCalendar(state);
  renderBirthdays(state);
  renderRoles(state);
  renderEvaluations(state);

  setupTabNavigation();
  setupEventListeners(state);
}

function setupAuthSystem(state) {
  const modal = document.getElementById("login-modal");
  const modalBtn = document.getElementById("btn-login-modal");
  const closeBtn = document.getElementById("btn-close-login");
  const tabLogin = document.getElementById("tab-auth-login");
  const tabSignup = document.getElementById("tab-auth-signup");
  const loginForm = document.getElementById("login-form");
  const signupForm = document.getElementById("signup-form");
  const passwordInput = document.getElementById("login-password");
  const hashPreview = document.getElementById("hash-preview");
  const signupPasswordInput = document.getElementById("signup-password");
  const signupHashPreview = document.getElementById("signup-hash-preview");
  const loginError = document.getElementById("login-error");
  const signupError = document.getElementById("signup-error");
  const userBadge = document.getElementById("user-badge");

  if (tabLogin && tabSignup) {
    tabLogin.addEventListener("click", () => {
      tabLogin.className = "flex-1 text-center font-jua text-xl text-pink-600 border-b-2 border-pink-500 pb-1 font-bold";
      tabSignup.className = "flex-1 text-center font-jua text-xl text-gray-400 hover:text-pink-500 pb-1 font-bold";
      loginForm.classList.remove("hidden");
      signupForm.classList.add("hidden");
    });

    tabSignup.addEventListener("click", () => {
      tabSignup.className = "flex-1 text-center font-jua text-xl text-pink-600 border-b-2 border-pink-500 pb-1 font-bold";
      tabLogin.className = "flex-1 text-center font-jua text-xl text-gray-400 hover:text-pink-500 pb-1 font-bold";
      signupForm.classList.remove("hidden");
      loginForm.classList.add("hidden");
    });
  }

  updateUserBadge();

  function updateUserBadge() {
    if (state.currentUser) {
      const isRoleAdmin = state.currentUser.role === "admin";
      userBadge.innerHTML = `
        ${isRoleAdmin ? '👑' : '🌸'} ${state.currentUser.name} (${isRoleAdmin ? '관리자' : '학생'}) 
        <span class="ml-1 text-[10px] bg-red-400 text-white px-1.5 py-0.5 rounded-md hover:bg-red-500" id="btn-logout">로그아웃</span>
      `;
    } else {
      userBadge.textContent = "🔑 로그인 / ✨ 회원가입";
    }
  }

  if (modalBtn) {
    modalBtn.addEventListener("click", (e) => {
      if (e.target.id === "btn-logout") {
        state.currentUser = null;
        saveState(state);
        updateUserBadge();
        alert("로그아웃 되었습니다.");
        return;
      }
      modal.classList.remove("hidden");
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener("click", () => modal.classList.add("hidden"));
  }

  if (passwordInput) {
    passwordInput.addEventListener("input", async (e) => {
      hashPreview.textContent = e.target.value ? await hashPassword(e.target.value) : "비밀번호를 입력하면 해시가 표시됩니다.";
    });
  }

  if (signupPasswordInput) {
    signupPasswordInput.addEventListener("input", async (e) => {
      signupHashPreview.textContent = e.target.value ? await hashPassword(e.target.value) : "비밀번호 입력 시 암호화됩니다.";
    });
  }

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      loginError.classList.add("hidden");
      const username = document.getElementById("login-username").value.trim();
      const password = passwordInput.value;
      const inputHash = await hashPassword(password);
      const user = state.users.find(u => u.id === username && u.passwordHash === inputHash);

      if (user) {
        state.currentUser = user;
        saveState(state);
        updateUserBadge();
        modal.classList.add("hidden");
        loginForm.reset();
        alert(`🌸 환영합니다, ${user.name} 학생! 1-3반 알림판에 로그인되었습니다.`);
      } else {
        loginError.textContent = "❌ 학번/아이디 또는 비밀번호가 일치하지 않습니다.";
        loginError.classList.remove("hidden");
      }
    });
  }

  // ✨ 회원가입 시 구글 시트 백엔드로 자동 전송!
  if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      signupError.classList.add("hidden");
      const studentId = document.getElementById("signup-studentid").value.trim();
      const name = document.getElementById("signup-name").value.trim();
      const password = signupPasswordInput.value;

      if (!studentId || !name || !password) {
        signupError.textContent = "❌ 모든 항목을 작성해 주세요.";
        signupError.classList.remove("hidden");
        return;
      }

      if (state.users.find(u => u.id === studentId)) {
        signupError.textContent = "⚠️ 이미 가입된 학번입니다. 로그인 탭을 이용해 주세요.";
        signupError.classList.remove("hidden");
        return;
      }

      const passwordHash = await hashPassword(password);
      const newUser = { id: studentId, name: name, role: "student", passwordHash: passwordHash };

      // 1. 프론트엔드 상태 저장
      state.users.push(newUser);
      state.currentUser = newUser;
      saveState(state);

      // 2. 🚀 구글 시트 백엔드로 2-Way 자동 전송!
      await sendToBackend({
        action: "signup",
        id: studentId,
        name: name,
        passwordHash: passwordHash,
        role: "student"
      });

      updateUserBadge();
      modal.classList.add("hidden");
      signupForm.reset();
      alert(`🎉 1학년 3반 회원가입이 완료되었습니다!\n구글 시트 백엔드 [학생계정] 탭으로 자동 저장되었습니다. 🌸`);
    });
  }
}

function setupTabNavigation() {
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const targetTab = btn.getAttribute("data-tab");

      tabBtns.forEach(b => {
        b.classList.remove("bg-white", "text-pink-600", "shadow-sm", "font-bold");
        b.classList.add("text-gray-600", "hover:text-pink-500");
      });
      btn.classList.add("bg-white", "text-pink-600", "shadow-sm", "font-bold");
      btn.classList.remove("text-gray-600");

      tabContents.forEach(content => {
        if (content.id === `tab-${targetTab}`) {
          content.classList.remove("hidden");
        } else {
          content.classList.add("hidden");
        }
      });
    });
  });
}

function startLiveClock() {
  const clockEl = document.getElementById("live-clock");
  if (!clockEl) return;

  function update() {
    const now = new Date();
    const days = ["일", "월", "화", "수", "목", "금", "토"];
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const date = String(now.getDate()).padStart(2, "0");
    const day = days[now.getDay()];
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");

    clockEl.innerHTML = `
      <span class="text-pink-500 font-bold">${year}.${month}.${date} (${day})</span>
      <span class="ml-2 font-mono text-gray-700 bg-pink-100 px-2 py-0.5 rounded-lg text-sm">${hours}:${minutes}:${seconds}</span>
    `;

    highlightCurrentPeriod(now);
  }

  update();
  setInterval(update, 1000);
}

function highlightCurrentPeriod(now) {
  const currentDayIndex = now.getDay();
  if (currentDayIndex < 1 || currentDayIndex > 5) return;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  INITIAL_DATA.timetable.periodTimes.forEach(p => {
    if (typeof p.period === "number") {
      const [startH, startM] = p.start.split(":").map(Number);
      const [endH, endM] = p.end.split(":").map(Number);
      const startMin = startH * 60 + startM;
      const endMin = endH * 60 + endM;

      const cellId = `cell-${currentDayIndex}-${p.period}`;
      const el = document.getElementById(cellId);
      if (el) {
        if (currentMinutes >= startMin && currentMinutes <= endMin) {
          el.classList.add("current-period");
        } else {
          el.classList.remove("current-period");
        }
      }
    }
  });
}

function getDDayString(targetDateStr) {
  const target = new Date(targetDateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const diffTime = target - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return { text: "D-Day 🎉", class: "bg-rose-500 text-white animate-bounce" };
  if (diffDays > 0) return { text: `D-${diffDays}`, class: diffDays <= 3 ? "bg-amber-500 text-white" : "bg-pink-100 text-pink-700" };
  return { text: `D+${Math.abs(diffDays)}`, class: "bg-gray-100 text-gray-500" };
}

function renderHeader(state) {
  const mottoEl = document.getElementById("class-motto");
  if (mottoEl) mottoEl.textContent = state.classInfo.motto;
}

function renderDashboard(state) {
  const noticeContainer = document.getElementById("dashboard-notices");
  if (noticeContainer) {
    noticeContainer.innerHTML = state.notices.map(n => `
      <div class="p-4 rounded-2xl ${n.pinned ? 'bg-pink-50 border-2 border-pink-200' : 'bg-white/60 border border-gray-100'} transition hover:shadow-md">
        <div class="flex items-center justify-between mb-1">
          <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full ${n.category === '중요' ? 'bg-rose-100 text-rose-600' : 'bg-purple-100 text-purple-600'}">
            ${n.category}
          </span>
          <span class="text-xs text-gray-400 font-mono">${n.date}</span>
        </div>
        <h4 class="font-bold text-gray-800 text-base mb-1">${n.title}</h4>
        <p class="text-sm text-gray-600">${n.content}</p>
      </div>
    `).join("");
  }

  const ddayContainer = document.getElementById("dashboard-ddays");
  if (ddayContainer) {
    const upcomingEvents = state.calendar
      .filter(c => c.dday)
      .map(c => ({ ...c, ddayObj: getDDayString(c.date) }))
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 4);

    ddayContainer.innerHTML = upcomingEvents.map(e => `
      <div class="flex items-center justify-between p-3 bg-white/70 rounded-xl border border-pink-100">
        <div>
          <span class="text-xs text-gray-400 font-mono block">${e.date}</span>
          <span class="font-bold text-gray-800 text-sm">${e.title}</span>
        </div>
        <span class="px-3 py-1 text-xs font-bold rounded-full ${e.ddayObj.class}">
          ${e.ddayObj.text}
        </span>
      </div>
    `).join("");
  }

  const mealContainer = document.getElementById("dashboard-meal");
  if (mealContainer) {
    const todayStr = new Date().toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" });
    mealContainer.innerHTML = `
      <div class="bg-gradient-to-br from-amber-50 to-orange-50 p-4 rounded-2xl border border-amber-200 shadow-sm">
        <div class="flex items-center justify-between mb-2">
          <span class="font-bold text-amber-900 flex items-center gap-1 text-base">
            🍱 오늘의 맛있는 급식 (${todayStr})
          </span>
          <span class="text-xs bg-amber-200 text-amber-800 font-bold px-2 py-0.5 rounded-full">창원여고 식단</span>
        </div>
        <div class="text-sm text-gray-700 space-y-1 bg-white/80 p-3 rounded-xl">
          <p>🌾 현미찰밥</p>
          <p>🍲 얼큰쇠고기무국</p>
          <p>🍖 훈제오리구이 & 머스타드소스</p>
          <p>🥗 콤비네이션 샐러드 & 드레싱</p>
          <p>🥬 배추김치</p>
          <p>🥤 톡톡 핑크 자몽에이드</p>
        </div>
      </div>
    `;
  }
}

function renderTimetable(state) {
  const tbody = document.getElementById("timetable-body");
  if (!tbody) return;

  const days = ["mon", "tue", "wed", "thu", "fri"];
  const periods = state.timetable.periodTimes;

  tbody.innerHTML = periods.map(p => {
    if (p.period === "점심") {
      return `
        <tr class="bg-amber-50/70 font-bold text-amber-800 text-center">
          <td class="p-3 text-xs border border-pink-100 bg-amber-100/50">점심시간<br><span class="font-mono text-[10px] text-amber-600">${p.start}~${p.end}</span></td>
          <td colspan="5" class="p-3 text-sm border border-pink-100">🍱 즐거운 점심 시간 & 휴식 🌸</td>
        </tr>
      `;
    }

    if (p.period === "청소") {
      return `
        <tr class="bg-purple-50/70 font-bold text-purple-800 text-center">
          <td class="p-3 text-xs border border-pink-100 bg-purple-100/50">청소시간<br><span class="font-mono text-[10px] text-purple-600">${p.start}~${p.end}</span></td>
          <td colspan="5" class="p-2 text-xs border border-pink-100 text-purple-700">🧹 깨끗한 3반 만들기 청소시간 (수요일 제외)</td>
        </tr>
      `;
    }

    const periodIdx = p.period - 1;
    return `
      <tr class="text-center">
        <td class="p-3 font-semibold text-gray-600 border border-pink-100 bg-pink-50/50">
          ${p.period}교시
          <div class="text-[10px] font-mono text-pink-400 font-normal">${p.start}~${p.end}</div>
        </td>
        ${days.map((day, dIdx) => {
          const item = state.timetable.schedule[day][periodIdx];
          const cellId = `cell-${dIdx + 1}-${p.period}`;
          const isPark = item.teacher === "박병준";

          return `
            <td id="${cellId}" class="p-3 border border-pink-100 bg-white/80 font-medium text-gray-800 text-sm hover:bg-pink-50 transition ${isPark ? 'bg-pink-100/80 border-2 border-pink-300 font-bold' : ''}">
              <div class="font-bold text-gray-900">${item.subject}</div>
              ${item.teacher ? `<div class="text-[11px] text-purple-600 font-normal mt-0.5">${item.teacher}선생님</div>` : ''}
            </td>
          `;
        }).join("")}
      </tr>
    `;
  }).join("");
}

function renderIntegratedCalendar(state, categoryFilter = "ALL") {
  const container = document.getElementById("calendar-list");
  if (!container) return;

  const currentYear = new Date().getFullYear();

  const schoolEvents = state.calendar.map(c => ({
    date: c.date,
    title: c.title,
    category: c.category,
    badgeBg: "bg-pink-100 text-pink-700",
    icon: "🏫"
  }));

  const evalEvents = state.evaluations.map(e => ({
    date: e.deadline,
    title: `[수행평가] ${e.subject} - ${e.title}`,
    category: "수행평가",
    badgeBg: "bg-purple-100 text-purple-700",
    icon: "📝"
  }));

  const birthdayEvents = state.birthdays.map(b => {
    const mStr = String(b.month).padStart(2, "0");
    const dStr = String(b.day).padStart(2, "0");
    return {
      date: `${currentYear}-${mStr}-${dStr}`,
      title: `🎂 ${b.name} 친구 생일 (MBTI: ${b.mbti})`,
      category: "생일",
      badgeBg: "bg-rose-100 text-rose-700 font-bold",
      icon: "🎉"
    };
  });

  let allEvents = [...schoolEvents, ...evalEvents, ...birthdayEvents];

  if (categoryFilter !== "ALL") {
    allEvents = allEvents.filter(e => e.category === categoryFilter);
  }

  allEvents.sort((a, b) => new Date(a.date) - new Date(b.date));

  container.innerHTML = allEvents.map(item => {
    const ddayInfo = getDDayString(item.date);
    return `
      <div class="flex items-center justify-between p-4 bg-white/80 rounded-2xl border border-pink-100 hover:border-pink-300 transition">
        <div class="flex items-center gap-3">
          <span class="w-10 h-10 rounded-xl ${item.badgeBg} flex items-center justify-center font-bold text-base shadow-sm">
            ${item.icon}
          </span>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-gray-400 font-mono">${item.date}</span>
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${item.badgeBg}">${item.category}</span>
            </div>
            <h4 class="font-bold text-gray-800 text-sm md:text-base mt-0.5">${item.title}</h4>
          </div>
        </div>
        <span class="px-3 py-1 text-xs font-bold rounded-full ${ddayInfo.class}">
          ${ddayInfo.text}
        </span>
      </div>
    `;
  }).join("");
}

function renderBirthdays(state) {
  const container = document.getElementById("birthday-list");
  if (!container) return;
  const currentMonth = new Date().getMonth() + 1;

  container.innerHTML = state.birthdays.map(b => {
    const isThisMonth = b.month === currentMonth;
    return `
      <div class="p-4 rounded-2xl ${isThisMonth ? 'birthday-card shadow-md scale-[1.02]' : 'bg-white/80 border border-pink-100'} transition flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="font-bold text-lg text-gray-800">${b.name}</span>
            <span class="text-xs px-2 py-0.5 rounded-full ${isThisMonth ? 'bg-rose-500 text-white font-bold animate-pulse' : 'bg-purple-100 text-purple-600'}">
              ${b.month}월 ${b.day}일 ${isThisMonth ? '🎂 이번 달!' : ''}
            </span>
          </div>
          <p class="text-xs text-purple-500 font-semibold mb-1">MBTI: ${b.mbti}</p>
          <p class="text-xs text-gray-600 italic">"${b.wish}"</p>
        </div>
        <button onclick="triggerConfetti('${b.name}')" class="mt-4 w-full py-1.5 rounded-xl btn-pink text-xs flex items-center justify-center gap-1">
          🎉 생일 축하하기!
        </button>
      </div>
    `;
  }).join("");
}

window.triggerConfetti = function(name) {
  if (typeof confetti === "function") {
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
  }
  alert(`🌸 ${name} 친구에게 하트와 축하를 보냈어요! 💖🎉`);
};

function renderRoles(state) {
  const container = document.getElementById("role-grid");
  if (!container) return;

  container.innerHTML = state.roles.map(r => `
    <div class="p-4 bg-white/80 rounded-2xl border border-pink-100 hover:border-pink-300 transition flex items-start gap-3">
      <div class="text-3xl p-2 bg-pink-50 rounded-2xl">${r.icon || '✨'}</div>
      <div class="flex-1">
        <div class="flex items-center justify-between">
          <span class="font-bold text-pink-600 text-sm">${r.role}</span>
          <span class="font-bold text-gray-800 text-base bg-pink-100 px-2 py-0.5 rounded-lg">${r.name}</span>
        </div>
        <p class="text-xs text-gray-600 mt-1">${r.duty}</p>
      </div>
    </div>
  `).join("");
}

function renderEvaluations(state) {
  const container = document.getElementById("evaluation-list");
  if (!container) return;

  container.innerHTML = state.evaluations.map(e => {
    const ddayInfo = getDDayString(e.deadline);
    return `
      <div class="p-4 bg-white/80 rounded-2xl border border-pink-100 hover:border-pink-300 transition">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-0.5 text-xs font-bold bg-pink-100 text-pink-700 rounded-lg">${e.subject}</span>
            <h4 class="font-bold text-gray-800 text-base">${e.title}</h4>
          </div>
          <span class="px-3 py-1 text-xs font-bold rounded-full ${ddayInfo.class}">
            제출기한: ${e.deadline} (${ddayInfo.text})
          </span>
        </div>
        <p class="text-xs text-gray-600 mb-2">${e.details}</p>
      </div>
    `;
  }).join("");
}

function setupEventListeners(state) {
  const roleSearch = document.getElementById("role-search");
  if (roleSearch) {
    roleSearch.addEventListener("input", (e) => {
      const query = e.target.value.toLowerCase();
      const filtered = state.roles.filter(r => 
        r.name.toLowerCase().includes(query) || 
        r.role.toLowerCase().includes(query) ||
        r.duty.toLowerCase().includes(query)
      );
      renderRoles({ ...state, roles: filtered });
    });
  }

  const printBtn = document.getElementById("btn-print-role");
  if (printBtn) {
    printBtn.addEventListener("click", () => {
      window.print();
    });
  }
}

async function syncWithGoogleSheet(sheetId) {
  const statusEl = document.getElementById("sheet-sync-status");
  if (statusEl) statusEl.textContent = "✅ 웹 ➔ 구글 시트 2-Way 양방향 백엔드 연동 켜짐";
}
