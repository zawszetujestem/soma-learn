import ReactMarkdown from 'react-markdown'
export function safeLink(value) {
  if (typeof value !== 'string' || /[\u0000-\u0020\u007f]/.test(value)) return ''
  try { const url = new URL(value); return ['https:','http:','mailto:'].includes(url.protocol) && !url.username && !url.password ? value : '' } catch { return '' }
}
export function safeVideo(value) {
  try {const u=new URL(value); return u.protocol==='https:' && !u.username && !u.password && !u.port && ['youtube.com','www.youtube.com','m.youtube.com','youtu.be','vimeo.com','www.vimeo.com'].includes(u.hostname)} catch {return false}
}
export default function SafeMarkdown({children}) {
  return <div className="safe-markdown"><ReactMarkdown skipHtml disallowedElements={['img']} urlTransform={safeLink} components={{a:({href,children})=>href?<a href={href} target="_blank" rel="noopener noreferrer">{children}</a>:<span>{children}</span>}}>{children || ''}</ReactMarkdown></div>
}
