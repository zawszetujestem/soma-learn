import { afterEach, expect, it, vi } from 'vitest'
import {screen,within,render} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {mockApi,renderApp,resetTestEnv,ok,fail,MENTOR,ADMIN,STUDENT,sessionAs,COURSE_PUBLIC,INSTANCE_OWN} from './helpers.jsx'
import {editorApi,editorPath,V,version,manage,lesson} from './version-fixtures.jsx'
afterEach(resetTestEnv)
it('CRUD hierarchii: dodaje dział i wymaga potwierdzenia poddrzewa',async()=>{
 const {calls}=mockApi(editorApi({[`POST ${V}nodes/`]:ok({id:20}),[`DELETE ${V}nodes/11/`]:{status:204}}));renderApp(editorPath);const u=userEvent.setup()
 await u.type(await screen.findByLabelText('Nazwa nowego działu'),'Nowy dział');await u.click(screen.getByRole('button',{name:'Dodaj dział'}));await screen.findByText('Zapisano zmiany.')
 expect(calls.find(c=>c.method==='POST').body).toMatchObject({kind:'section',title:'Nowy dział'})
 await u.click(screen.getByRole('button',{name:'Usuń Dział pierwszy'}));await u.click(screen.getByRole('button',{name:'Anuluj'}));expect(calls.some(c=>c.method==='DELETE')).toBe(false)
 await u.click(screen.getByRole('button',{name:'Usuń Dział pierwszy'}));await u.click(screen.getByRole('button',{name:'Potwierdź usunięcie'}));await screen.findByText('Zapisano zmiany.');expect(calls.some(c=>c.method==='DELETE')).toBe(true)
})
it('pokazuje serwerowy message przy naruszeniu prerekwizytu',async()=>{
 mockApi(editorApi({[`POST ${V}nodes/11/move/`]:fail(409,{message:'Zależność blokuje ruch.'})},MENTOR,{...version,nodes:[...version.nodes,{id:20,kind:'section',title:'Drugi',children:[]}]}));renderApp(editorPath);const u=userEvent.setup()
 await u.click(await screen.findByRole('button',{name:'Dół Dział pierwszy'}));expect(await screen.findByRole('alert')).toHaveTextContent('Zależność blokuje ruch.')
})

it('prerekwizyt wybiera wcześniejszy węzeł z testem, nie przodka, i zapisuje próg',async()=>{
 const source={id:1,kind:'section',title:'Źródło',test:{questions:[]},children:[]}
 const ancestor={...version.nodes[0],test:{questions:[]}}
 const v={...version,nodes:[source,ancestor,{id:20,kind:'section',title:'Późniejsze',test:{questions:[]},children:[]}]}
 const {calls}=mockApi(editorApi({[`PUT ${V}nodes/13/prerequisite/`]:ok({source_id:1,threshold:70})},MENTOR,v));renderApp(editorPath);const u=userEvent.setup()
 const select=await screen.findByLabelText('Źródło wymagania Lekcja pierwsza')
 await u.click(screen.getByText('Wymaganie wstępne: Lekcja pierwsza'))
 expect(within(select).getAllByRole('option').map(o=>o.textContent)).toEqual(['Bez wymagania','Źródło'])
 await u.selectOptions(select,'1');await u.click(screen.getByRole('button',{name:'Zapisz wymaganie Lekcja pierwsza'}));await screen.findByText('Zapisano zmiany.')
 expect(calls.find(c=>c.method==='PUT').body).toEqual({source_id:1,threshold:70})
})
it('reorder odczytuje nowe uporządkowanie i utrzymuje fokus na akcji węzła',async()=>{
 let v={...version,nodes:[...version.nodes,{id:20,kind:'section',title:'Drugi',children:[]}]}
 mockApi(editorApi({[`GET ${V}`]:()=>({...ok(v),headers:{ETag:'"v2-r1"'}}),[`POST ${V}nodes/11/move/`]:()=>{v={...v,nodes:[v.nodes[1],v.nodes[0]]};return ok({moved:true})}}));renderApp(editorPath);const u=userEvent.setup()
 const button=await screen.findByRole('button',{name:'Dół Dział pierwszy'});button.focus();await u.keyboard('{Enter}');await screen.findByText('Zapisano zmiany.')
 expect(screen.getAllByRole('heading',{level:3})[0]).toHaveTextContent('Drugi');expect(screen.getByRole('button',{name:'Góra Dział pierwszy'})).toHaveFocus()
})

it('identyfikuje wezly konfliktu zaleznosci w UI',async()=>{
 mockApi(editorApi({[`POST ${V}nodes/11/move/`]:fail(409,{message:'Nie mo\u017cna przesun\u0105\u0107.',code:'prerequisite_conflict',dependencies:[{target_id:20,source_id:13}]})},MENTOR,{...version,nodes:[...version.nodes,{id:20,kind:'section',title:'Drugi',children:[]}]}));renderApp(editorPath)
 await userEvent.click(await screen.findByRole('button',{name:'D\u00f3\u0142 Dzia\u0142 pierwszy'}))
 expect(await screen.findByText('Drugi (20) wymaga: Lekcja pierwsza (13).')).toBeInTheDocument()
})
