import {expect,it} from 'vitest'
import {render,screen} from '@testing-library/react'
import SafeMarkdown,{safeLink,safeVideo} from '../../src/courses/SafeMarkdown.jsx'
it('formatuje markdown bez HTML, obrazów i niebezpiecznych linków',()=>{
 const {container}=render(<SafeMarkdown>{'**Ważne** <script>alert(1)</script> ![obcy](https://evil.test/x) [zły](javascript:alert) [dobry](https://example.test)'}</SafeMarkdown>)
 expect(screen.getByText('Ważne').tagName).toBe('STRONG');expect(container.querySelector('script,img,iframe')).toBeNull()
 expect(container.querySelector('a[href^="javascript"]')).toBeNull();expect(screen.getByRole('link',{name:'dobry'})).toHaveAttribute('href','https://example.test')
})
it('odrzuca schematy, protocol-relative i fałszywe hosty wideo',()=>{
 for(const url of ['javascript:x','data:text/html,x','//evil.test','https://youtube.com.evil.test/x','https://user@youtube.com/x','https://youtube.com:444/x'])expect(safeVideo(url)).toBe(false)
 expect(safeLink('//evil.test')).toBe('');expect(safeVideo('https://youtu.be/abc')).toBe(true)
})
