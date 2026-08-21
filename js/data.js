/**
 * 창원여자고등학교 1학년 3반 종합알림판 데이터 & 2-Way 구글 시트 백엔드 & SHA-256 엔진
 */

const DEFAULT_SHEET_ID = "16tH6lwRXZxxcW0vfiZxZwbYWEjbTNHsThj5J86WwbPQ";
const PUBLISHED_SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQQcpbm9qzIXY30tq6_0ukEGKxaPqE4KGS8hOygOjkRIKvJwMzFSL4XdK5wauHJRfmvKjJbxYUmaDZr/pub?output=csv";

// Google Apps Script WebApp Backend URL
let GAS_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbx_cwgh103_placeholder/exec";

// SHA-256 해시 함수
async function hashPassword(plainText) {
  if (!plainText) return "";
  const cleanText = plainText.trim();
  const encoder = new TextEncoder();
  const data = encoder.encode(cleanText);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// 구글 시트 백엔드로 데이터 전송 (회원가입, 공지사항, 수행평가 등록)
async function sendToBackend(payload) {
  try {
    if (!GAS_WEBAPP_URL || GAS_WEBAPP_URL.includes("placeholder")) {
      console.log("[백엔드 시뮬레이션 데이터 저장]:", payload);
      return { result: "success" };
    }
    await fetch(GAS_WEBAPP_URL, {
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

// 기본 데이터 세트
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
  users: [],
  notices: [],
  evaluations: [],
  birthdays: [],
  roles: [],

  // 공식 학사일정 (2026년 2학기)
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

  // 시간표
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
  }
};
