import { afterEach, expect, it, vi } from 'vitest'
import {screen,within,render} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {mockApi,renderApp,resetTestEnv,ok,fail,MENTOR,ADMIN,STUDENT,sessionAs,COURSE_PUBLIC,INSTANCE_OWN} from './helpers.jsx'
import {editorApi,editorPath,V,version,manage,lesson} from './version-fixtures.jsx'
afterEach(resetTestEnv)
it('zapisuje teorię i zachowuje tekst po błędzie serwera',async()=>{
 const {calls}=mockApi(editorApi({[`POST ${V}lessons/13/items/`]:fail(400,{message:'Materiał jest niepoprawny.'})}));renderApp(editorPath);const u=userEvent.setup()
 await u.type(await screen.findByLabelText('Treść nowego materiału 13 theory'),'**Teoria**');await u.click(screen.getByRole('button',{name:'Dodaj teorię'}));expect(await screen.findByRole('alert')).toHaveTextContent('Materiał jest niepoprawny.');expect(screen.getByLabelText('Treść nowego materiału 13 theory')).toHaveValue('**Teoria**')
 expect(calls.find(c=>c.method==='POST').body).toMatchObject({category:'theory',format:'markdown',text:'**Teoria**'})
})
it('otwarta praktyka nie wysyła klucza odpowiedzi',async()=>{
 const {calls}=mockApi(editorApi({[`POST ${V}lessons/13/items/`]:ok({id:1})}));renderApp(editorPath);const u=userEvent.setup();await u.type(await screen.findByLabelText('Treść nowego materiału 13 practice'),'Zadanie');await u.click(screen.getByRole('button',{name:'Dodaj praktykę'}));await screen.findByText('Zapisano zmiany.');expect(calls.find(c=>c.method==='POST').body).toMatchObject({answer_mode:'open',answer_text:null})
})

it('multipart upload -> asset_id w bloku PDF, nowy ETag',async()=>{
 const {calls}=mockApi(editorApi({[`POST ${V}assets/`]:{status:201,body:{id:'pdf-1'},headers:{ETag:'"v2-r2"'}},[`POST ${V}lessons/13/items/`]:ok({id:99})}));renderApp(editorPath);const u=userEvent.setup()
 await u.selectOptions(await screen.findByLabelText('Format materiału nowy-13-theory'),'pdf')
 await u.upload(screen.getByLabelText('Plik nowy-13-theory'),new File(['%PDF'],'a.pdf',{type:'application/pdf'}))
 await screen.findByText('Plik przesłano. Zapisz materiał.')
 await u.click(screen.getByRole('button',{name:'Dodaj teorię'}));await screen.findByText('Zapisano zmiany.')
 const upload=calls.find(c=>c.path.endsWith('/assets/'));expect(upload.body).toBeInstanceOf(FormData);expect(upload.headers['Content-Type']).toBeUndefined()
 const save=calls.find(c=>c.path.endsWith('/items/'));expect(save.body.asset_id).toBe('pdf-1');expect(save.headers['If-Match']).toBe('"v2-r2"')
})
it.each([[413,'file_too_large'],[409,'course_storage_limit_exceeded'],[409,'attachment_limit_exceeded']])('pokazuje message limitu %i %s i nie dodaje materiału',async(status,code)=>{
 const {calls}=mockApi(editorApi({[`POST ${V}assets/`]:fail(status,{code,message:'Przekroczono limit zasobów.'})}));renderApp(editorPath);const u=userEvent.setup()
 await u.selectOptions(await screen.findByLabelText('Format materiału nowy-13-theory'),'pdf');await u.upload(screen.getByLabelText('Plik nowy-13-theory'),new File(['pdf'],'a.pdf',{type:'application/pdf'}));expect(await screen.findByRole('alert')).toHaveTextContent('Przekroczono limit zasobów.');expect(calls.some(c=>c.path.endsWith('/items/'))).toBe(false)
})
it('pobiera prywatny obraz jako Blob i zwalnia URL po unmount',async()=>{
 const {default:PrivateAsset}=await import('../../src/courses/PrivateAsset.jsx')
 const create=vi.fn(()=> 'blob:private');const revoke=vi.fn();vi.stubGlobal('URL',Object.assign(URL,{createObjectURL:create,revokeObjectURL:revoke}))
 mockApi({[`GET ${V}assets/a/download/`]:ok(new Blob(['image']))});const view=render(<PrivateAsset courseId={1} versionId={2} assetId="a" format="image" alt="Opis zdjęcia"/>);expect(await screen.findByRole('img',{name:'Opis zdjęcia'})).toHaveAttribute('src','blob:private');view.unmount();expect(revoke).toHaveBeenCalledWith('blob:private')
})
