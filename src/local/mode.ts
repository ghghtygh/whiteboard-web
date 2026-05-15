// 백엔드 없이 동작하는 로컬 모드 플래그.
// VITE_API_URL 이 설정돼 있고 remote 모드로 명시되면 false. 기본은 true (M1 백엔드 도착 전까지).
const explicitRemote = import.meta.env.VITE_REMOTE_MODE === 'true'
export const IS_LOCAL_MODE = !explicitRemote
