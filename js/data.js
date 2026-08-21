/**
 * 창원여자고등학교 1학년 3반 종합알림판 데이터 & 구글 시트 & 비밀번호 SHA-256 회원가입/로그인 엔진
 */

const DEFAULT_SHEET_ID = "16tH6lwRXZxxcW0vfiZxZwbYWEjbTNHsThj5J86WwbPQ";

/**
 * 비밀번호 SHA-256 해싱 함수 (Web Crypto API)
 */
async function hashPassword(plainText) {
  if (!plainText) return "";
  const encoder = new TextEncoder();
  const data = encoder.encode(plainText);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// 기본 샘플 데이터 및 회원가입 레지스트리
const INITIAL_DATA = {
  classInfo: {
    schoolName: "창원여자고등학교",
    gradeClass: "1학년 3반",
    motto: "🌸 서로 존중하고 함께 빛나는 1학년 3반 🌸",
    teacher: "담임선생님",
    links: {
      school: "https://cwyeo-h.gne.go.kr",
      riroschool: "https://cwyeoh.riroschool.kr/home.php"
    }
  },
  // 등록된 사용자 목록 (SHA-256 해시 저장)
  users: [
    { id: "admin", name: "담임선생님/반장", role: "admin", passwordHash: "a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3" }, // 비번: 1033
    { id: "10301", name: "김민서", role: "student", passwordHash: "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8" }, // 비번: 10301
    { id: "10302", name: "박지유", role: "student", passwordHash: "03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4" }  // 비번: 1234
  ],
  notices: [
    {
      id: "notice-1",
      title: "📌 1학기 수행평가 일정 및 마감 기한 필독!",
      content: "이번 주 국어/수학 수행평가가 있으니 제출 기한을 꼭 확인하세요.",
      date: "2026-08-21",
      category: "중요",
      pinned: true
    },
    {
      id: "notice-2",
      title: "🎀 1인 1역할 책임감 있게 실천하기",
      content: "자신의 역할을 잊지 말고 매일 하교 전 점검해 주세요! (우유, 칠판, 환기 등)",
      date: "2026-08-20",
      category: "안내",
      pinned: false
    },
    {
      id: "notice-3",
      title: "🏫 창원여고 동아리 발표회 안내",
      content: "동아리 활동 보고서 제출은 이번 달 말까지입니다.",
      date: "2026-08-18",
      category: "행사",
      pinned: false
    }
  ],
  calendar: [
    { id: "c-1", date: "2026-03-03", title: "입학식 및 1학기 개학식", category: "학사일정", dday: false },
    { id: "c-2", date: "2026-04-22", title: "1학기 중간고사 시작", category: "시험", dday: true },
    { id: "c-3", date: "2026-05-15", title: "현장체험학습 (소풍)", category: "행사", dday: true },
    { id: "c-4", date: "2026-06-25", title: "1학기 기말고사 시작", category: "시험", dday: true },
    { id: "c-5", date: "2026-07-20", title: "여름방학식", category: "방학", dday: true },
    { id: "c-6", date: "2026-08-18", title: "2학기 개학식", category: "학사일정", dday: false },
    { id: "c-7", date: "2026-10-14", title: "2학기 중간고사", category: "시험", dday: true },
    { id: "c-8", date: "2026-11-19", title: "대학수학능력시험", category: "시험", dday: true },
    { id: "c-9", date: "2026-12-24", title: "창원여고 동백축제", category: "행사", dday: true },
    { id: "c-10", date: "2027-01-08", title: "학년말 종업식 및 졸업식", category: "학사일정", dday: true }
  ],
  evaluations: [
    {
      id: "ev-1",
      subject: "국어",
      title: "현대시 독서 감상문 작성",
      deadline: "2026-08-28",
      details: "원고지 3매 작성 후 국어 선생님께 직접 제출",
      submittedCount: 18,
      totalCount: 25
    },
    {
      id: "ev-2",
      subject: "통합과학",
      title: "신소재 탐구 탐구보고서",
      deadline: "2026-09-04",
      details: "리로스쿨 과제 제출함에 PDF 형태로 업로드",
      submittedCount: 12,
      totalCount: 25
    },
    {
      id: "ev-3",
      subject: "영어",
      title: "영작문 발표 (Speaking Assessment)",
      deadline: "2026-09-10",
      details: "3분 이내 본인 소개 및 관심사 영어 발표",
      submittedCount: 5,
      totalCount: 25
    },
    {
      id: "ev-4",
      subject: "수학",
      title: "서술형 문제 풀이 과정 평가",
      deadline: "2026-09-15",
      details: "수업 시간 중 서술형 평가 실시",
      submittedCount: 0,
      totalCount: 25
    }
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
      { period: 7, start: "15:30", end: "16:20" }
    ],
    schedule: {
      mon: ["국어", "수학", "영어", "통합사회", "체육", "통합과학", "창체"],
      tue: ["수학", "영어", "국어", "한국사", "음악", "통합사회", "자율"],
      wed: ["영어", "통합과학", "수학", "국어", "체육", "미술", "동아리"],
      thu: ["통합사회", "한국사", "통합과학", "수학", "영어", "정보", "진로"],
      fri: ["한국사", "국어", "수학", "영어", "정보", "음악", "학급회의"]
    }
  },
  roles: [
    { id: "r-1", role: "반장", name: "김민서", duty: "학급 총괄 및 알림장 관리", icon: "👑" },
    { id: "r-2", role: "부반장", name: "박지유", duty: "수업 태도 정리 및 행사 보조", icon: "⭐" },
    { id: "r-3", role: "칠판 도우미", name: "이서연", duty: "매 교시 쉬는 시간 칠판 깨끗이 닦기", icon: "🧹" },
    { id: "r-4", role: "정보/기자재", name: "정다은", duty: "TV/빔프로젝터/컴퓨터 관리", icon: "💻" },
    { id: "r-5", role: "우유/물품", name: "최수아", duty: "학급 분배 물품 수령 및 관리", icon: "🥛" },
    { id: "r-6", role: "환기/에어컨", name: "강예린", duty: "쉬는 시간 창문 환기 및 냉난방기 조절", icon: "🌬️" },
    { id: "r-7", role: "급식 도우미", name: "윤아인", duty: "급식 줄 세우기 및 질서 지도", icon: "🍱" },
    { id: "r-8", role: "환경/분리수거", name: "한지민", duty: "재활용 쓰레기통 분리배출 관리", icon: "🌱" },
    { id: "r-9", role: "도서/학습", name: "임하은", duty: "학급 문고 관리 및 유인물 분배", icon: "📖" },
    { id: "r-10", role: "체육 도우미", name: "배서현", duty: "체육 시간 체육복 점검 및 기구 챙기기", icon: "⚽" }
  ],
  birthdays: [
    { id: "b-1", name: "김민서", month: 1, day: 15, mbti: "ENFP", wish: "열공하자!" },
    { id: "b-2", name: "박지유", month: 3, day: 22, mbti: "INFJ", wish: "즐거운 3반 ♡" },
    { id: "b-3", name: "이서연", month: 4, day: 5, mbti: "ESTP", wish: "맛있는 거 사줘" },
    { id: "b-4", name: "정다은", month: 5, day: 18, mbti: "INFP", wish: "행복한 하루!" },
    { id: "b-5", name: "최수아", month: 6, day: 30, mbti: "ESFJ", wish: "우리반 파이팅" },
    { id: "b-6", name: "강예린", month: 8, day: 25, mbti: "ISFP", wish: "생일 축하해줘!" },
    { id: "b-7", name: "윤아인", month: 9, day: 12, mbti: "ENFJ", wish: "3반 모두 사랑해" },
    { id: "b-8", name: "한지민", month: 10, day: 4, mbti: "ISTJ", wish: "수험생 모드" },
    { id: "b-9", name: "임하은", month: 11, day: 19, mbti: "ENTP", wish: "올해 생일 선물은 100점" },
    { id: "b-10", name: "배서현", month: 12, day: 28, mbti: "ESFP", wish: "연말 파티 고고!" }
  ]
};

/**
 * 구글 시트 다중 탭 (알림장, 수행평가, 1인1역할, 생일 등) 파서
 */
async function fetchGoogleSheetData(sheetId) {
  try {
    // 1. 기본 CSV 파싱
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=0`;
    const response = await fetch(csvUrl);
    if (!response.ok) {
      throw new Error(`Google Sheet fetch error (status ${response.status})`);
    }
    const text = await response.text();
    const rows = parseCSV(text);
    return rows;
  } catch (err) {
    console.warn("구글 시트 연동 실패:", err);
    return null;
  }
}

// CSV 파서
function parseCSV(text) {
  const lines = text.split(/\r?\n/);
  return lines.map(line => {
    const result = [];
    let insideQuote = false;
    let entry = "";
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        insideQuote = !insideQuote;
      } else if (char === ',' && !insideQuote) {
        result.push(entry.trim());
        entry = "";
      } else {
        entry += char;
      }
    }
    result.push(entry.trim());
    return result;
  });
}
