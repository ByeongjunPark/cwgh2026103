/**
 * 창원여자고등학교 1학년 3반 메인 컨트롤러 앱
 */

document.addEventListener("DOMContentLoaded", () => {
  // 1. 앱 상태 (State) 초기화
  let appState = loadState();

  // 2. 초기 렌더링
  initApp(appState);

  // 3. 실시간 시계 & D-Day 갱신
  startLiveClock();

  // 4. 구글 시트 데이터 자동 동기화 시도
  if (appState.googleSheetId) {
    syncWithGoogleSheet(appState.googleSheetId);
  }
});

// LocalStorage 상태 로드
function loadState() {
  const saved = localStorage.getItem("cwgh_1_3_state");
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error("State parse error:", e);
    }
  }
  return { ...INITIAL_DATA, googleSheetId: DEFAULT_SHEET_ID, editMode: false };
}

// LocalStorage 상태 저장
function saveState(state) {
  localStorage.setItem("cwgh_1_3_state", JSON.stringify(state));
}

// 앱 초기화 및 이벤트 바인딩
function initApp(state) {
  renderHeader(state);
  renderDashboard(state);
  renderTimetable(state);
  renderCalendar(state);
  renderBirthdays(state);
  renderRoles(state);
  renderEvaluations(state);
  renderSettings(state);

  setupTabNavigation();
  setupEventListeners(state);
}

// 탭 네비게이션
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

// 실시간 시계
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

// 현재 시간 기반 교시 하이라이트
function highlightCurrentPeriod(now) {
  const currentDayIndex = now.getDay(); // 1=월, 5=금
  if (currentDayIndex < 1 || currentDayIndex > 5) return;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // periodTimes 검사
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

// D-Day 계산기
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

// 헤더 렌더링
function renderHeader(state) {
  const mottoEl = document.getElementById("class-motto");
  if (mottoEl) {
    mottoEl.textContent = state.classInfo.motto;
  }
}

// 메인 대시보드 렌더링
function renderDashboard(state) {
  // 1. 공지사항 렌더링
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

  // 2. D-Day 요약 렌더링
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

  // 3. 오늘 급식 렌더링 (샘플 및 NEIS 연동 안내)
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

// 시간표 렌더링
function renderTimetable(state) {
  const tbody = document.getElementById("timetable-body");
  if (!tbody) return;

  const days = ["mon", "tue", "wed", "thu", "fri"];
  const periods = state.timetable.periodTimes;

  tbody.innerHTML = periods.map(p => {
    if (p.period === "점심") {
      return `
        <tr class="bg-amber-50/70 font-bold text-amber-800 text-center">
          <td class="p-3 text-xs border border-pink-100">점심시간<br><span class="font-mono text-[10px] text-amber-600">${p.start}~${p.end}</span></td>
          <td colspan="5" class="p-3 text-sm border border-pink-100">🍱 즐거운 점심 시간 & 휴식 🌸</td>
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
          const subject = state.timetable.schedule[day][periodIdx] || "-";
          const cellId = `cell-${dIdx + 1}-${p.period}`;
          return `
            <td id="${cellId}" class="p-3 border border-pink-100 bg-white/80 font-medium text-gray-800 text-sm hover:bg-pink-50 transition">
              ${subject}
            </td>
          `;
        }).join("")}
      </tr>
    `;
  }).join("");
}

// 학사일정 렌더링
function renderCalendar(state) {
  const container = document.getElementById("calendar-list");
  if (!container) return;

  container.innerHTML = state.calendar.map(c => {
    const ddayInfo = getDDayString(c.date);
    return `
      <div class="flex items-center justify-between p-4 bg-white/80 rounded-2xl border border-pink-100 hover:border-pink-300 transition">
        <div class="flex items-center gap-3">
          <span class="w-10 h-10 rounded-xl bg-pink-100 text-pink-600 flex items-center justify-center font-bold text-sm">
            ${c.category.substring(0, 2)}
          </span>
          <div>
            <span class="text-xs text-gray-400 font-mono">${c.date}</span>
            <h4 class="font-bold text-gray-800 text-base">${c.title}</h4>
          </div>
        </div>
        <span class="px-3 py-1 text-xs font-bold rounded-full ${ddayInfo.class}">
          ${ddayInfo.text}
        </span>
      </div>
    `;
  }).join("");
}

// 생일 렌더링 및 폭죽 이벤트
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

// 폭죽 효과 (Confetti)
window.triggerConfetti = function(name) {
  if (typeof confetti === "function") {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  }
  alert(`🌸 ${name} 친구에게 하트와 축하를 보냈어요! 💖🎉`);
};

// 1인 1역할 렌더링
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

// 수행평가 렌더링
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

// 설정 및 구글 시트 연동 렌더링
function renderSettings(state) {
  const inputEl = document.getElementById("google-sheet-id");
  if (inputEl) {
    inputEl.value = state.googleSheetId || DEFAULT_SHEET_ID;
  }
}

// 이벤트 리스너 세팅
function setupEventListeners(state) {
  // 구글 시트 동기화 버튼
  const syncBtn = document.getElementById("btn-sync-sheet");
  if (syncBtn) {
    syncBtn.addEventListener("click", async () => {
      const inputEl = document.getElementById("google-sheet-id");
      const sheetId = inputEl ? inputEl.value.trim() : DEFAULT_SHEET_ID;
      state.googleSheetId = sheetId;
      saveState(state);
      await syncWithGoogleSheet(sheetId);
    });
  }

  // 1인 1역할 검색
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

  // 인쇄 버튼
  const printBtn = document.getElementById("btn-print-role");
  if (printBtn) {
    printBtn.addEventListener("click", () => {
      window.print();
    });
  }
}

// 구글 시트 연동 실행
async function syncWithGoogleSheet(sheetId) {
  const statusEl = document.getElementById("sheet-sync-status");
  if (statusEl) statusEl.textContent = "🔄 구글 시트 데이터 불러오는 중...";

  const csvRows = await fetchGoogleSheetData(sheetId);
  if (csvRows && csvRows.length > 0) {
    if (statusEl) statusEl.textContent = "✅ 구글 시트 동기화 성공!";
    console.log("구글 시트 로드 결과:", csvRows);
  } else {
    if (statusEl) statusEl.textContent = "⚠️ 시트가 비공개 상태이거나 읽을 수 없어 기본 모드로 작동합니다. (시트 공유 설정을 확인하세요)";
  }
}
