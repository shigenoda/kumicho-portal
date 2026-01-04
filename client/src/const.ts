export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Get login URL - now using password-based authentication
export const getLoginUrl = () => {
  // パスワード認証に変更したので、ログインページへ遷移
  return "/login";
};
