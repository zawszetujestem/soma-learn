import { afterEach, expect, it, vi } from 'vitest'
import {screen,within,render} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {mockApi,renderApp,resetTestEnv,ok,fail,MENTOR,ADMIN,STUDENT,sessionAs,COURSE_PUBLIC,INSTANCE_OWN} from './helpers.jsx'
import {editorApi,editorPath,V,version,manage,lesson} from './version-fixtures.jsx'
afterEach(resetTestEnv)
it('oczami ucznia pobiera osobną projekcję bez kluczy i nie tworzy instancji',async()=>{
 const keyed={...lesson,practice:[{id:1,category:'practice',format:'text',text:'Zadanie',answer_mode:'keyed',answer_text:'Sekretny klucz'}]}
 const full={...version,nodes:[keyed]};const student={...full,nodes:[{...keyed,practice:[{...keyed.practice[0],answer_text:undefined}]}]}
 const {calls}=mockApi(editorApi({[`GET ${V}`]:ok(full),[`GET ${V}student-preview/`]:ok(student)}));renderApp('/kursy/podglad/1/wersje/2');const u=userEvent.setup();await screen.findByText(/Sekretny klucz/);await u.click(screen.getByRole('button',{name:'Oczami ucznia'}));await screen.findByText('Zadanie');expect(screen.queryByText(/Sekretny klucz/)).not.toBeInTheDocument();expect(calls.every(c=>c.method==='GET')).toBe(true)
})

it('prerekwizyt jest informacją, nie blokuje materiału',async()=>{
 mockApi(editorApi({[`GET ${V}`]:ok({...version,nodes:[{...lesson,prerequisite:{source_id:99,threshold:70,message:'Wymaga zaliczenia Działu 1 na 70%'},theory:[{id:1,format:'markdown',text:'Dostępny materiał'}]}]})}));renderApp('/kursy/podglad/1/wersje/2');expect(await screen.findByText('Wymaga zaliczenia Działu 1 na 70%')).toBeInTheDocument();expect(screen.getByText('Dostępny materiał')).toBeInTheDocument()
})
