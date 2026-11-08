import {afterEach,expect,it} from 'vitest'
import {screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {mockApi,renderApp,resetTestEnv,ok,fail,MENTOR,ADMIN} from './helpers.jsx'
import {editorApi,editorPath,V,version,manage} from './version-fixtures.jsx'
import {settings,versionMenu} from './editor-ui.jsx'
afterEach(resetTestEnv)
const previewPath='/kursy/podglad/1/wersje/2'
const actions=['Wyślij do akceptacji','Wycofaj','Opublikuj','Akceptuj','Odrzuć']
it.each([editorPath,previewPath])('admin edytuje/podgląda cudzy kurs bez zasobu mine: %s',async path=>{
 const {calls}=mockApi(editorApi({'GET /api/courses/mine/1/':fail(404,{message:'Nie znaleziono.'}),[`PATCH ${V}`]:ok(version)},ADMIN))
 renderApp(path);await screen.findByRole('heading',{name:path===editorPath?'Edytor wersji':'Treść wersji 2'})
 expect(calls.some(c=>c.path==='/api/courses/mine/1/')).toBe(true)
 expect(await screen.findByRole('alert')).toHaveTextContent('404')
 expect(screen.queryByRole('button',{name:'Opublikuj'})).not.toBeInTheDocument()
 expect(screen.queryByRole('link',{name:'Zarządzanie kursem i plan godzinowy'})).not.toBeInTheDocument()
 if(path===editorPath){await settings(userEvent.setup());await userEvent.click(screen.getByRole('button',{name:'Zapisz draft'}));await screen.findByText('Zapisano draft.');expect(calls.find(c=>c.method==='PATCH').headers['If-Match']).toBe('"v2-r1"')}
})
it.each([
 [MENTOR,2,'public','draft',['Wyślij do akceptacji']],
 [MENTOR,2,'public','rejected',['Wyślij do akceptacji']],
 [MENTOR,2,'public','submitted',['Wycofaj']],
 [MENTOR,2,'private','draft',['Opublikuj']],
 [MENTOR,2,'private','rejected',['Opublikuj']],
 [ADMIN,3,'public','draft',['Opublikuj']],
 [ADMIN,3,'public','rejected',['Opublikuj']],
 [ADMIN,2,'public','submitted',['Akceptuj','Odrzuć']],
 [ADMIN,2,'public','draft',[]],
 [ADMIN,2,'public','rejected',[]],
 [ADMIN,2,'private','submitted',[]],
 [ADMIN,3,'public','submitted',[]],
 [MENTOR,2,'public','published',[]],
 [ADMIN,2,'public','published',[]],
])('akcje z pól wersji: %#',async(user,owner,visibility,state,expected)=>{
 const data={...version,state,course_owner:owner,course_visibility:visibility,course_is_active:false}
 mockApi(editorApi({},user,data));renderApp(previewPath)
 await screen.findByRole('heading',{name:'Treść wersji 2'})
 for(const name of actions)expect(Boolean(screen.queryByRole('button',{name}))).toBe(expected.includes(name))
})

it.each([editorPath,previewPath])('admin nie publikuje pierwszej cudzej publicznej wersji: %s',async path=>{
 const first={...version,number:1}
 const {calls}=mockApi(editorApi({},ADMIN,first))
 renderApp(path)
 await screen.findByRole('heading',{name:path===editorPath?'Edytor wersji':'Treść wersji 1'})
 if(path===editorPath)await versionMenu(userEvent.setup())
 expect(screen.queryByRole('button',{name:'Opublikuj'})).not.toBeInTheDocument()
 expect(calls.every(c=>c.method==='GET')).toBe(true)
})

it('pierwsza cudza publikacja admina przechodzi przez akceptację zgłoszenia',async()=>{
 const first={...version,number:1,state:'submitted'}
 const {calls}=mockApi(editorApi({[`POST ${V}accept/`]:ok({...first,state:'published'})},ADMIN,first))
 renderApp(previewPath)
 const user=userEvent.setup()
 await user.click(await screen.findByRole('button',{name:'Akceptuj'}))
 expect(screen.queryByRole('button',{name:'Opublikuj'})).not.toBeInTheDocument()
 await screen.findByText('Zapisano zmiany.')
 expect(calls.find(c=>c.method==='POST').path).toBe(`${V}accept/`)
})

it.each([
 [editorPath,{versions:[{...version,id:1,number:1,state:'published'},version]}],
 [previewPath,{versions:[{...version,id:1,number:1,state:'published'},version]}],
 [previewPath,{current_published_version:1}],
])('admin publikuje wersję 2+ tylko z potwierdzoną historią: %s',async(path,history)=>{
 const course={...manage,...history}
 const {calls}=mockApi(editorApi({'GET /api/courses/mine/1/':ok(course),[`POST ${V}publish/`]:ok(version)},ADMIN))
 renderApp(path)
 const user=userEvent.setup()
 if(path===editorPath)await versionMenu(user)
 await user.click(await screen.findByRole(path===editorPath?'menuitem':'button',{name:'Opublikuj'}))
 await screen.findByText('Zapisano zmiany.')
 expect(calls.find(c=>c.method==='POST').path).toBe(`${V}publish/`)
})

it('brak historii nie przyznaje adminowi publish na podstawie samego numeru',async()=>{
 mockApi(editorApi({},ADMIN,{...version,number:9}))
 renderApp(previewPath)
 await screen.findByRole('heading',{name:'Treść wersji 9'})
 expect(screen.queryByRole('button',{name:'Opublikuj'})).not.toBeInTheDocument()
})
it('admin moderuje cudze publiczne zgłoszenie również w edytorze',async()=>{
 const {calls}=mockApi(editorApi({[`POST ${V}reject/`]:ok({...version,state:'rejected'})},ADMIN,{...version,state:'submitted'}))
 renderApp(editorPath);const u=userEvent.setup();await versionMenu(u);await u.type(await screen.findByLabelText('Powód odrzucenia (opcjonalny)'),'Popraw treść');await u.click(screen.getByRole('menuitem',{name:'Odrzuć'}));await screen.findByText('Zapisano zmiany.')
 expect(calls.find(c=>c.method==='POST')).toMatchObject({path:`${V}reject/`,body:{reason:'Popraw treść'},headers:{'If-Match':'"v2-r1"'}})
})

it('po decyzji admina oglasza sukces i utrzymuje fokus gdy akcja znika',async()=>{
 let data={...version,state:'submitted'}
 mockApi(editorApi({[`GET ${V}`]:()=>({...ok(data),headers:{ETag:'"v2-r1"'}}),[`POST ${V}accept/`]:()=>{data={...data,state:'published'};return ok(data)}},ADMIN))
 renderApp(previewPath);const u=userEvent.setup();const button=await screen.findByRole('button',{name:'Akceptuj'});button.focus();await u.keyboard('{Enter}')
 await screen.findByText('Zapisano zmiany.')
 expect(screen.getByRole('heading',{name:'Podgl\u0105d wersji'})).toHaveFocus()
 expect(screen.queryByRole('button',{name:'Akceptuj'})).not.toBeInTheDocument()
})

it.each([editorPath,previewPath])('pokazuje tozsamosc i klasyfikacje z wersji: %s',async path=>{
 mockApi(editorApi({},ADMIN,{...version,course_visibility:'private',course_is_active:false,scope:{id:1,name:'Zakres archiwalny',is_active:false},subject:{id:2,name:'Przedmiot archiwalny',is_active:false}}));renderApp(path)
 expect(await screen.findByText('Prywatny \u00b7 nieaktywny')).toBeInTheDocument()
 expect(screen.getByText('Zakres archiwalny / Przedmiot archiwalny')).toBeInTheDocument()
})
