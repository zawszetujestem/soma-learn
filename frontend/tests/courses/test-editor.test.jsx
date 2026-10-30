import { afterEach, expect, it, vi } from 'vitest'
import {screen,within,render} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {mockApi,renderApp,resetTestEnv,ok,fail,MENTOR,ADMIN,STUDENT,sessionAs,COURSE_PUBLIC,INSTANCE_OWN} from './helpers.jsx'
import {editorApi,editorPath,V,version,manage,lesson} from './version-fixtures.jsx'
afterEach(resetTestEnv)
it('PUT zastępuje całą definicję single/multiple i pokazuje message',async()=>{
 const node={...version.nodes[0],test:{questions:[{type:'single',text:'Pytanie',options:[{text:'A',is_correct:true},{text:'B',is_correct:false}]}]}}
 const {calls}=mockApi(editorApi({[`PUT ${V}nodes/11/test/`]:fail(400,{message:'Niepoprawne opcje.'})},MENTOR,{...version,nodes:[node]}));renderApp(editorPath);const u=userEvent.setup()
 await u.selectOptions(await screen.findByLabelText('Typ pytania 11-1'),'multiple');await u.click(screen.getByRole('button',{name:'Zapisz test Dział pierwszy'}));expect(await screen.findByRole('alert')).toHaveTextContent('Niepoprawne opcje.');expect(calls.find(c=>c.method==='PUT').body.questions[0]).toMatchObject({type:'multiple',options:[{text:'A',is_correct:true},{text:'B',is_correct:false}]})
})

it('wskazuje konkretne braki testu bez blokowania zapisu draftu',async()=>{
 const node={...version.nodes[0],test:{questions:[{type:'single',text:'',options:[{text:'A',is_correct:true},{text:'',is_correct:true}]}]}}
 const {calls}=mockApi(editorApi({[`PUT ${V}nodes/11/test/`]:ok({})},MENTOR,{...version,nodes:[node]}));renderApp(editorPath)
 expect(await screen.findByText('Pytanie 1: podaj tre\u015b\u0107.')).toBeInTheDocument()
 expect(screen.getByText('Pytanie 1: opcja 2 jest pusta.')).toBeInTheDocument()
 expect(screen.getByText('Pytanie 1: single wymaga dok\u0142adnie jednej poprawnej opcji.')).toBeInTheDocument()
 await userEvent.click(screen.getByRole('button',{name:'Zapisz test Dzia\u0142 pierwszy'}));await screen.findByText('Zapisano zmiany.')
 expect(calls.some(c=>c.method==='PUT')).toBe(true)
})
it('usuniecie testu resetuje definicje formularza',async()=>{
 let v={...version,nodes:[{...version.nodes[0],test:{questions:[{type:'single',text:'Stare pytanie',options:[]}]}}]}
 mockApi(editorApi({[`GET ${V}`]:()=>({...ok(v),headers:{ETag:'"v2-r1"'}}),[`DELETE ${V}nodes/11/test/`]:()=>{v={...version};return {status:204}}}));renderApp(editorPath)
 await userEvent.click(await screen.findByRole('button',{name:'Usu\u0144 test Dzia\u0142 pierwszy'}));await screen.findByText('Zapisano zmiany.')
 expect(screen.queryByDisplayValue('Stare pytanie')).not.toBeInTheDocument()
})

it('nie sugeruje obowiazkowego testu na kazdym wezle',async()=>{
 mockApi(editorApi());renderApp(editorPath);await screen.findByRole('heading',{name:'Edytor wersji'})
 expect(screen.queryByText('Test nie ma pyta\u0144.')).not.toBeInTheDocument()
})
it('istniejacy pusty test ma komunikat o brakujacych pytaniach',async()=>{
 mockApi(editorApi({},MENTOR,{...version,nodes:[{...version.nodes[0],test:{id:1,questions:[]}}]}));renderApp(editorPath)
 expect(await screen.findByText('Test nie ma pyta\u0144.')).toBeInTheDocument()
})
