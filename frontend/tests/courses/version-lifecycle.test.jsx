import { afterEach, expect, it, vi } from 'vitest'
import {screen,within,render} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {mockApi,renderApp,resetTestEnv,ok,fail,MENTOR,ADMIN,STUDENT,sessionAs,COURSE_PUBLIC,INSTANCE_OWN} from './helpers.jsx'
import {editorApi,editorPath,V,version,manage,lesson} from './version-fixtures.jsx'
afterEach(resetTestEnv)
it('mentor publicznego draftu zgłasza, ale nie publikuje, widzi issues',async()=>{
 mockApi(editorApi({[`GET ${V}validation/`]:ok({valid:false,issues:[{path:'nodes.11',code:'empty',message:'Brakuje lekcji.'}]}),[`POST ${V}submit/`]:fail(400,{message:'Uzupełnij program.'})}));renderApp(editorPath);const u=userEvent.setup();await screen.findByRole('heading',{name:'Edytor wersji'});expect(screen.queryByRole('button',{name:'Opublikuj'})).not.toBeInTheDocument();await u.click(screen.getByRole('button',{name:'Sprawdź poprawność'}));await screen.findByText(/Brakuje lekcji/);await u.click(screen.getByRole('button',{name:'Wyślij do akceptacji'}));expect(await screen.findByRole('alert')).toHaveTextContent('Uzupełnij program.')
})
it('admin widzi zgłoszenia i podgląd',async()=>{
 mockApi({...sessionAs(ADMIN),'GET /api/course-moderation/':ok([{...version,state:'submitted'}])});renderApp('/course-moderation/');expect(await screen.findByRole('link',{name:/Wersja robocza/})).toHaveAttribute('href','/kursy/podglad/1/wersje/2')
})

it.each([
 [MENTOR,'private','draft','Opublikuj','publish'],
 [ADMIN,'public','draft','Opublikuj','publish'],
 [MENTOR,'public','submitted','Wycofaj','withdraw'],
 [MENTOR,'public','rejected','Wyślij do akceptacji','submit'],
])('akcja dla roli/widoczności/stanu %#',async(user,visibility,state,label,action)=>{
 const data={...version,state,course_owner:user.id,course_visibility:visibility};const {calls}=mockApi(editorApi({'GET /api/courses/mine/1/':ok({...manage,owner:user.id,visibility}),[`POST ${V}${action}/`]:ok(data)},user,data));renderApp(editorPath);const u=userEvent.setup();await u.click(await screen.findByRole('button',{name:label}));await screen.findByText('Zapisano zmiany.');expect(calls.find(c=>c.method==='POST').headers['If-Match']).toBe('"v2-r1"')
})
it.each(['Akceptuj','Odrzuć'])('moderacja: %s wysyła decyzję z rewizją i pokazuje message',async label=>{
 const action=label==='Akceptuj'?'accept':'reject';const {calls}=mockApi(editorApi({[`POST ${V}${action}/`]:fail(409,{message:'Zgłoszenie zostało wycofane.'})},ADMIN,{...version,state:'submitted'}));renderApp('/kursy/podglad/1/wersje/2');const u=userEvent.setup();await u.click(await screen.findByRole('button',{name:label}));expect(await screen.findByRole('alert')).toHaveTextContent('Zgłoszenie zostało wycofane.');expect(calls.find(c=>c.method==='POST').headers['If-Match']).toBe('"v2-r1"')
})
it('published nie ma formularzy ani zapisu',async()=>{mockApi(editorApi({},MENTOR,{...version,state:'published'}));renderApp(editorPath);await screen.findByRole('heading',{name:'Edytor wersji'});expect(screen.queryByRole('button',{name:'Zapisz draft'})).not.toBeInTheDocument();expect(screen.queryByRole('button',{name:'Dodaj dział'})).not.toBeInTheDocument()})
