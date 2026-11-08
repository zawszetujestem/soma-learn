import { afterEach, expect, it, vi } from 'vitest'
import {screen,within,render} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {mockApi,renderApp,resetTestEnv,ok,fail,MENTOR,ADMIN,STUDENT,sessionAs,COURSE_PUBLIC,INSTANCE_OWN} from './helpers.jsx'
import {editorApi,editorPath,V,version,manage,lesson} from './version-fixtures.jsx'
import {nodeMenu,choose,closeEditor} from './editor-ui.jsx'
afterEach(resetTestEnv)
it('potwierdzenie poddrzewa obsługuje Escape i przywraca fokus',async()=>{mockApi(editorApi());renderApp(editorPath);const u=userEvent.setup();await nodeMenu(u,'Dział pierwszy');const button=await screen.findByRole('menuitem',{name:'Usuń Dział pierwszy'});button.focus();await u.keyboard('{Enter}');expect(screen.getByRole('alertdialog')).toBeInTheDocument();expect(screen.getByRole('button',{name:'Anuluj'})).toHaveFocus();await u.keyboard('{Escape}');expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();expect(screen.getByRole('button',{name:'Akcje Dział pierwszy'})).toHaveFocus()})

it('po usunieciu materialu fokus wraca do edytora zamiast body',async()=>{
 const item={id:50,format:'markdown',text:'Teoria'};let v={...version,nodes:[{...lesson,theory:[item]}]}
 mockApi(editorApi({[`GET ${V}`]:()=>({...ok(v),headers:{ETag:'"v2-r1"'}}),[`DELETE ${V}lessons/13/items/50/`]:()=>{v={...version,nodes:[lesson]};return {status:204}}}));renderApp(editorPath);const u=userEvent.setup()
 await nodeMenu(u,'Teoria 1: Lekcja pierwsza');const button=screen.getByRole('menuitem',{name:'Usu\u0144 materia\u0142 50'});button.focus();await u.keyboard('{Enter}');await u.click(screen.getByRole('button',{name:'Potwierdź usunięcie'}));await screen.findByText('Zapisano zmiany.')
 expect(screen.getByRole('button',{name:'Lekcja: Lekcja pierwsza'})).toHaveFocus()
})

it('po usunięciu wybranego poddrzewa wybiera pozostały dział i przenosi fokus do jego kafelka',async()=>{
 let v={...version,nodes:[...version.nodes,{id:20,kind:'section',title:'Pozostały dział',children:[]}]}
 mockApi(editorApi({[`GET ${V}`]:()=>({...ok(v),headers:{ETag:'"v2-r1"'}}),[`DELETE ${V}nodes/11/`]:()=>{v={...v,nodes:[v.nodes[1]]};return {status:204}}}));renderApp(editorPath);const u=userEvent.setup()
 await nodeMenu(u,'Dział pierwszy');await u.click(await screen.findByRole('menuitem',{name:'Usuń Dział pierwszy'}))
 await u.click(screen.getByRole('button',{name:'Potwierdź usunięcie'}));await screen.findByText('Zapisano zmiany.')
 const selected=screen.getByRole('button',{name:'Dział: Pozostały dział'})
 expect(selected).toHaveAttribute('aria-pressed','true');expect(selected).toHaveFocus()
})

it('reorder zadania zachowuje jego szkic, wybór i fokus na możliwym kierunku ruchu',async()=>{
 const item={id:50,category:'practice',format:'text',text:'Treść',answer_mode:'keyed',answer_text:'42'}
 let v={...version,nodes:[{...lesson,practice:[item,{...item,id:51}]}]}
 mockApi(editorApi({[`GET ${V}`]:()=>({...ok(v),headers:{ETag:'"v2-r1"'}}),[`POST ${V}lessons/13/items/50/move/`]:()=>{v={...v,nodes:[{...v.nodes[0],practice:[v.nodes[0].practice[1],item]}]};return ok({moved:true})}}));renderApp(editorPath);const u=userEvent.setup()
 await u.click(await screen.findByRole('button',{name:'Zadanie 1: Lekcja pierwsza'}))
 await u.type(screen.getByLabelText('Poprawna odpowiedź 50-13-practice'),' szkic')
 await u.click(screen.getByRole('button',{name:'Akcje materiał 50'}));await u.click(screen.getByRole('menuitem',{name:'Dół materiał 50'}));await screen.findByText('Zapisano zmiany.')
 expect(document.getElementById('hierarchy-entry-practice:13:50')).toHaveAttribute('aria-pressed','true')
 expect(screen.getByLabelText('Poprawna odpowiedź 50-13-practice')).toHaveValue('42 szkic')
 expect(screen.getByRole('menuitem',{name:'Góra materiał 50'})).toHaveFocus()
})
