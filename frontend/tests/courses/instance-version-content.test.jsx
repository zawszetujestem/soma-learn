import { afterEach, expect, it, vi } from 'vitest'
import {screen,within,render} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {mockApi,renderApp,resetTestEnv,ok,fail,MENTOR,ADMIN,STUDENT,sessionAs,COURSE_PUBLIC,INSTANCE_OWN} from './helpers.jsx'
import {editorApi,editorPath,V,version,manage,lesson} from './version-fixtures.jsx'
afterEach(resetTestEnv)
it('czyta przypiętą wersję zamiast metadanych bieżącej publikacji',async()=>{const {calls}=mockApi({...sessionAs(STUDENT),'GET /api/instances/11/':ok({...INSTANCE_OWN,course_version:2}),'GET /api/instances/11/content/':ok({...version,title:'Przypięta V2'})});renderApp('/kursy/instancje/11');expect(await screen.findByRole('heading',{name:'Przypięta V2'})).toBeInTheDocument();expect(await screen.findByText('Lekcja pierwsza')).toBeInTheDocument();expect(calls.some(c=>c.path==='/api/courses/2/')).toBe(false)})
it('pokazuje message błędu treści instancji',async()=>{mockApi({...sessionAs(STUDENT),'GET /api/instances/11/':ok({...INSTANCE_OWN,course_version:2}),'GET /api/instances/11/content/':fail(404,{message:'Nie masz dostępu do materiałów.'})});renderApp('/kursy/instancje/11');expect(await screen.findByRole('alert')).toHaveTextContent('Nie masz dostępu do materiałów.')})

it.each([STUDENT,MENTOR,ADMIN])('klucze instancji prezentuje tylko wlascicielowi/adminowi: %#',async user=>{
 const content={...version,nodes:[{...lesson,practice:[{id:1,format:'text',text:'Zadanie',answer_mode:'keyed',answer_text:'Sekretny klucz'}],test:{questions:[{type:'single',text:'Pytanie',options:[{text:'A',is_correct:true}]}]}}]}
 mockApi({...sessionAs(user),'GET /api/instances/11/':ok({...INSTANCE_OWN,mentor:MENTOR.id}),'GET /api/instances/11/content/':ok(content)});renderApp('/kursy/instancje/11');await screen.findByText('Zadanie')
 expect(Boolean(screen.queryByText(/Sekretny klucz/))).toBe(user.id===content.course_owner||user.roles.includes('admin'))
})
