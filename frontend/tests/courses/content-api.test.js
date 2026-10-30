import { afterEach, expect, it, vi } from 'vitest'
import { contentApi, coursesApi } from '../../src/courses/api.js'
import { mockApi, ok, fail, resetTestEnv } from './helpers.jsx'
afterEach(resetTestEnv)
it('zachowuje message i pola błędu serwera', async () => {
  mockApi({'POST /api/courses/': fail(400, {message:'Tytuł jest zajęty.', code:'validation_error', title:['Błąd']})})
  await expect(coursesApi.createCourse({})).rejects.toMatchObject({message:'Tytuł jest zajęty.', payload:{title:['Błąd']}})
})
it('odczytuje ETag i wysyła If-Match, także multipart i DELETE', async () => {
 const V='/api/courses/1/versions/2/'
 const {calls}=mockApi({[`GET ${V}`]: {...ok({id:2}),headers:{ETag:'"v2-r8"'}}, [`PATCH ${V}`]: {...ok({id:2}),headers:{ETag:'"v2-r9"'}}, [`POST ${V}assets/`]: {...ok({id:'asset'}),headers:{ETag:'"v2-r10"'}}, [`DELETE ${V}nodes/3/`]: {status:204}})
 await contentApi.version(1,2)
 await contentApi.save(1,2,{title:'Nowy'})
 await contentApi.upload(1,2,new File(['pdf'],'a.pdf'))
 await contentApi.mutate(1,2,'nodes/3/','DELETE')
 expect(calls[1].headers['If-Match']).toBe('"v2-r8"')
 expect(calls[2].headers['If-Match']).toBe('"v2-r9"')
 expect(calls[2].headers['Content-Type']).toBeUndefined()
 expect(calls[2].body.get('file').name).toBe('a.pdf')
 expect(calls[3].headers['If-Match']).toBe('"v2-r10"')
})
it('pobiera prywatne pliki jako Blob z tokenem', async () => {
 sessionStorage.setItem('token','secret')
 const blob=new Blob(['pdf'])
 const {calls}=mockApi({'GET /api/courses/1/versions/2/assets/a/download/':ok(blob)})
 expect(await contentApi.download(1,2,'a')).toBe(blob)
 expect(calls[0].headers.Authorization).toBe('Token secret')
})

it('nie zgłasza sukcesu przy nieczytelnym JSON',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,status:200,headers:new Headers(),json:async()=>{throw new Error('html')}}))
 await expect(coursesApi.createCourse({})).rejects.toMatchObject({message:expect.stringMatching(/Nie udało się odczytać/),kind:'network'})
})
it('ETag pliku nie zastępuje ETag rewizji wersji',async()=>{
 const V='/api/courses/91/versions/92/'
 const {calls}=mockApi({[`GET ${V}`]:{...ok({id:92}),headers:{ETag:'"v92-r1"'}},[`GET ${V}assets/a/download/`]:{...ok(new Blob(['x'])),headers:{ETag:'"file-checksum"'}},[`PATCH ${V}`]:ok({id:92})})
 await contentApi.version(91,92);await contentApi.download(91,92,'a');await contentApi.save(91,92,{title:'T'})
 expect(calls[2].headers['If-Match']).toBe('"v92-r1"')
})
it.each([400,401,403,404,409,413,415,500])('priorytet message przy HTTP %i',async status=>{
 mockApi({'POST /api/courses/':fail(status,{message:'Komunikat z serwera.',code:'forbidden'})})
 await expect(coursesApi.createCourse({})).rejects.toMatchObject({status,message:'Komunikat z serwera.'})
})
