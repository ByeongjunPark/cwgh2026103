/**
 * 창원여자고등학교 1학년 3반 종합알림판 데이터 & 2-Way 구글 시트 백엔드 & SHA-256 엔진
 */

const DEFAULT_SHEET_ID = "16tH6lwRXZxxcW0vfiZxZwbYWEjbTNHsThj5J86WwbPQ";
const PUBLISHED_SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQQcpbm9qzIXY30tq6_0ukEGKxaPqE4KGS8hOygOjkRIKvJwMzFSL4XdK5wauHJRfmvKjJbxYUmaDZr/pub?output=csv";

// Google Apps Script WebApp Backend URL (웹 ➔ 구글시트 양방향 전송 API)
let GAS_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbx_cwgh103_placeholder/exec";

async function hashPassword(plainText) {
  if (!plainText) return "";
  const encoder = new TextEncoder();
  const data = encoder.encode(plainText);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// 구글 시트 백엔드로 데이터 전송 (회원가입, 알림장, 수행평가 등록)
async function sendToBackend(payload) {
  try {
    if (!GAS_WEBAPP_URL || GAS_WEBAPP_URL.includes("placeholder")) {
      console.log("[백엔드 시뮬레이션] 저장 완료 (Apps Script 웹앱 배포 시 시트와 양방향 자동 연동됩니다):", payload);
      return { result: "success" };
    }
    const res = await fetch(GAS_WEBAPP_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return { result: "success" };
  } catch (err) {
    console.warn("백엔드 전송 오류:", err);
    return { result: "error", error: err };
  }
}

// 기본 데이터셋
const INITIAL_DATA = {
  classInfo: {
    schoolName: "창원여자고등학교",
    gradeClass: "1학년 3반",
    motto: "🌸 서로 존중하고 함께 빛나는 1학년 3반 🌸",
    teacher: "박병준 선생님",
    links: {
      school: "https://cwyeo-h.gne.go.kr",
      riroschool: "https://cwyeoh.riroschool.kr/home.php"
    }
  },
  users: [
    { id: "admin", name: "담임선생님/반장", role: "admin", passwordHash: "a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3" }, // 비번: 1033
    { id: "10301", name: "김민서", role: "student", passwordHash: "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8" }, // 비번: 10301
    { id: "10302", name: "박지유", role: "student", passwordHash: "03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4" }  // 비번: 1234
  ],
  calendar: [
    { id: "c-1", date: "2026-08-11", title: "2학기 개학식", category: "학사일정", dday: true },
    { id: "c-2", date: "2026-08-17", title: "대체공휴일 (광복절)", category: "휴업일", dday: false },
    { id: "c-3", date: "2026-09-02", title: "전국연합학력평가 (1, 2학년)", category: "시험", dday: true },
    { id: "c-4", date: "2026-09-08", title: "영어듣기평가 (1차)", category: "시험", dday: true },
    { id: "c-5", date: "2026-09-09", title: "영어듣기평가 (2차)", category: "시험", dday: false },
    { id: "c-6", date: "2026-09-10", title: "영어듣기평가 (3차)", category: "시험", dday: false },
    { id: "c-7", date: "2026-09-24", title: "추석 연휴 시작 (~9/26)", category: "휴업일", dday: true },
    { id: "c-8", date: "2026-09-29", title: "2학기 1차고사 (중간고사 ~10/2)", category: "시험", dday: true },
    { id: "c-9", date: "2026-10-05", title: "대체공휴일 (개천절)", category: "휴업일", dday: false },
    { id: "c-10", date: "2026-10-09", title: "한글날", category: "휴업일", dday: false },
    { id: "c-11", date: "2026-10-20", title: "전국연합학력평가 (1, 2, 3학년)", category: "시험", dday: true },
    { id: "c-12", date: "2026-10-29", title: "수업 나눔 (~10/30)", category: "행사", dday: false },
    { id: "c-13", date: "2026-11-19", title: "대학수학능력시험 (재량휴업일)", category: "시험/휴업일", dday: true },
    { id: "c-14", date: "2026-12-01", title: "2학기 2차고사 (기말고사 ~12/4)", category: "시험", dday: true },
    { id: "c-15", date: "2026-12-23", title: "학교자율적교육과정 (~12/28)", category: "행사", dday: false },
    { id: "c-16", date: "2026-12-24", title: "창원여고 동백축제 🎉", category: "행사", dday: true },
    { id: "c-17", date: "2026-12-25", title: "성탄절 (크리스마스)", category: "휴업일", dday: false },
    { id: "c-18", date: "2026-12-29", title: "졸업식 및 방학식 🌸", category: "학사일정", dday: true },
    { id: "c-19", date: "2027-02-05", title: "학년말 종업식 (1, 2학년)", category: "학사일정", dday: true }
  ],
  timetable: {
    periodTimes: [
      { period: 1, start: "08:40", end: "09:30" },
      { period: 2, start: "09:40", end: "10:30" },
      { period: 3, start: "10:40", end: "11:30" },
      { period: 4, start: "11:40", end: "12:30" },
      { period: "점심", start: "12:30", end: "13:30" },
      { period: 5, start: "13:30", end: "14:20" },
      { period: 6, start: "14:30", end: "15:20" },
      { period: "청소", start: "15:20", end: "15:40" },
      { period: 7, start: "15:40", end: "16:30" }
    ],
    schedule: {
      mon: [
        { subject: "창체", teacher: "" },
        { subject: "한국사", teacher: "우민주" },
        { subject: "체육", teacher: "나강원" },
        { subject: "사회", teacher: "박병준" },
        { subject: "과학", teacher: "조호준" },
        { subject: "인공지능", teacher: "안정선" },
        { subject: "★ (자율)", teacher: "" }
      ],
      tue: [
        { subject: "영어", teacher: "김보람" },
        { subject: "한국사", teacher: "문승욱" },
        { subject: "과탐실", teacher: "민운기" },
        { subject: "인공지능", teacher: "안정선" },
        { subject: "국어", teacher: "유옥경" },
        { subject: "과학", teacher: "남형우" },
        { subject: "수학", teacher: "김대희" }
      ],
      wed: [
        { subject: "사회", teacher: "강수정" },
        { subject: "수학", teacher: "이수진" },
        { subject: "미술", teacher: "강선자" },
        { subject: "국어", teacher: "김현승" },
        { subject: "동아리", teacher: "" },
        { subject: "★ (창체)", teacher: "" },
        { subject: "★ (자율)", teacher: "" }
      ],
      thu: [
        { subject: "국어", teacher: "유옥경" },
        { subject: "진로", teacher: "황은주" },
        { subject: "사회", teacher: "장봉선" },
        { subject: "영어", teacher: "이혜준" },
        { subject: "수학", teacher: "이수진" },
        { subject: "과학", teacher: "제선영" },
        { subject: "미술", teacher: "강선자" }
      ],
      fri: [
        { subject: "인공지능", teacher: "안정선" },
        { subject: "한국사", teacher: "우민주" },
        { subject: "미술", teacher: "강선자" },
        { subject: "체육", teacher: "나강원" },
        { subject: "과학", teacher: "김미랑" },
        { subject: "영어", teacher: "김보람" },
        { subject: "사회", teacher: "박병준" }
      ]
    }
  },
  notices: [
    {
      id: "notice-1",
      title: "📌 2학기 1차고사 (중간고사) 일정 안내",
      content: "9월 29일(화)부터 10월 2일(금)까지 1차고사가 진행됩니다. 과목별 시험 범위를 확인하세요!",
      date: "2026-08-21",
      category: "시험",
      pinned: true
    },
    {
      id: "notice-2",
      title: "🎧 영어듣기평가 일정 안내",
      content: "9월 8일(화) ~ 9월 10일(목) 3일간 진행됩니다.",
      date: "2026-08-20",
      category: "중요",
      pinned: true
    },
    {
      id: "notice-3",
      title: "🎀 1인 1역할 청소시간 점검",
      content: "매일 15:20~15:40 청소시간(수요일 제외)에 본인 담당 구역을 깨끗이 정돈해 주세요!",
      date: "2026-08-18",
      category: "안내",
      pinned: false
    }
  ],
  evaluations: [
    {
      id: "ev-1",
      subject: "국어",
      title: "유옥경/김현승 선생님 수행평가",
      deadline: "2026-09-04",
      details: "수업 시간 유인물 작성 후 제출",
      submittedCount: 20,
      totalCount: 25
    },
    {
      id: "ev-2",
      subject: "사회",
      title: "박병준/강수정/장봉선 선생님 사회 보고서",
      deadline: "2026-09-15",
      details: "주제별 사회 현상 탐구 보고서 제출",
      submittedCount: 15,
      totalCount: 25
    },
    {
      id: "ev-3",
      subject: "인공지능",
      title: "안정선 선생님 인공지능 실습 과제",
      deadline: "2026-09-20",
      details: "알고리즘 구현 실습 파일 제출",
      submittedCount: 8,
      totalCount: 25
    }
  ],
  roles: [
    { id: "r-1", role: "반장", name: "김민서", duty: "학급 총괄 및 알림장 관리", icon: "👑" },
    { id: "r-2", role: "부반장", name: "박지유", duty: "수업 태도 정리 및 행사 보조", icon: "⭐" },
    { id: "r-3", role: "칠판 도우미", name: "이서연", duty: "매 교시 쉬는 시간 칠판 깨끗이 닦기", icon: "🧹" },
    { id: "r-4", role: "정보/기자재", name: "정다은", duty: "TV/빔프로젝터/컴퓨터 관리", icon: "💻" },
    { id: "r-5", role: "우유/물품", name: "최수아", duty: "학급 분배 물품 수령 및 관리", icon: "🥛" },
    { id: "r-6", role: "환기/에어컨", name: "강예린", duty: "쉬는 시간 창문 환기 및 냉난방기 조절", icon: "🌬️" },
    { id: "r-7", role: "급식 도우미", name: "윤아인", duty: "급식 줄 세우기 및 질서 지도", icon: "🍱" }
  ],
  birthdays: [
    { id: "b-1", name: "김민서", month: 1, day: 15, mbti: "ENFP", wish: "열공하자!" },
    { id: "b-2", name: "박지유", month: 3, day: 22, mbti: "INFJ", wish: "즐거운 3반 ♡" },
    { id: "b-3", name: "이서연", month: 4, day: 5, mbti: "ESTP", wish: "맛있는 거 사줘" },
    { id: "b-4", name: "정다은", month: 5, day: 18, mbti: "INFP", wish: "행복한 하루!" },
    { id: "b-5", name: "최수아", month: 6, day: 30, mbti: "ESFJ", wish: "우리반 파이팅" },
    { id: "b-6", name: "강예린", month: 8, day: 25, mbti: "ISFP", wish: "생일 축하해줘!" }
  ]
};

async function fetchGoogleSheetData(targetUrl) {
  try {
    const url = targetUrl || PUBLISHED_SHEET_URL;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Fetch error");
    const text = await response.text();
    return parseCSV(text);
  } catch (err) {
    return null;
  }
}

function parseCSV(text) {
  const lines = text.split(/\r?\n/);
  return lines.map(line => {
    const result = [];
    let insideQuote = false;
    let entry = "";
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') insideQuote = !insideQuote;
      else if (char === ',' && !insideQuote) { result.push(entry.trim()); entry = ""; }
      else entry += char;
    }
    result.push(entry.trim());
    return result;
  });
}
