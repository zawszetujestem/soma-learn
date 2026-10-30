import { afterEach, expect, it } from 'vitest'
import {screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {mockApi,renderApp,resetTestEnv,ok,fail,sessionAs,MENTOR,currentPath} from './helpers.jsx'
import {editorApi,editorPath,V,version,manage} from './version-fixtures.jsx'
afterEach(resetTestEnv)
it('tworzy draft bez automatycznego zgłoszenia i otwiera edytor',async()=>{
 mockApi(editorApi({'POST /api/courses/':{status:201,body:manage}}));renderApp('/kursy/moje/nowy');const u=userEvent.setup()
 await u.type(await screen.findByLabelText('Tytuł kursu'),'Nowy');await u.click(screen.getByRole('button',{name:'Utwórz kurs'}))
 await screen.findByRole('heading',{name:'Edytor wersji'});expect(currentPath()).toBe(editorPath)
})
it('zapisuje metadane i aktywną klasyfikację z If-Match',async()=>{
 const {calls}=mockApi(editorApi({[`PATCH ${V}`]:ok(version)}));renderApp(editorPath);const u=userEvent.setup()
 await u.selectOptions(await screen.findByLabelText('Zakres'),'1');await u.selectOptions(screen.getByLabelText('Przedmiot'),'2');await u.click(screen.getByRole('button',{name:'Zapisz draft'}))
 await screen.findByText('Zapisano draft.');expect(calls.find(c=>c.method==='PATCH').body).toMatchObject({scope_id:1,subject_id:2})
})
it('pokazuje message po konflikcie i odświeża wersję bez ponawiania zapisu',async()=>{
 const {calls}=mockApi(editorApi({[`PATCH ${V}`]:fail(409,{code:'stale_revision',message:'Ktoś zmienił wersję.'})}));renderApp(editorPath);const u=userEvent.setup()
 await u.click(await screen.findByRole('button',{name:'Zapisz draft'}));expect(await screen.findByRole('alert')).toHaveTextContent('Ktoś zmienił wersję.')
 expect(calls.filter(c=>c.path===V&&c.method==='GET').length).toBe(2)
})
