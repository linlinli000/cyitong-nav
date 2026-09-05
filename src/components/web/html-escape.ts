/** 字符串 → HTML 文本/属性转义（& < > " ' 五个字符），用于客户端模板字符串插值 */
export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]!);
}
