import { afterEach, expect, it, vi } from 'vitest'
import {screen,within,render} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {mockApi,renderApp,resetTestEnv,ok,fail,MENTOR,ADMIN,STUDENT,sessionAs,COURSE_PUBLIC,INSTANCE_OWN} from './helpers.jsx'
import {editorApi,editorPath,V,version,manage,lesson} from './version-fixtures.jsx'
afterEach(resetTestEnv)
it('potwierdzenie poddrzewa obsługuje Escape i przywraca fokus',async()=>{mockApi(editorApi());renderApp(editorPath);const u=userEvent.setup();const button=await screen.findByRole('button',{name:'Usuń Dział pierwszy'});button.focus();await u.keyboard('{Enter}');expect(screen.getByRole('alertdialog')).toBeInTheDocument();expect(screen.getByRole('button',{name:'Anuluj'})).toHaveFocus();await u.keyboard('{Escape}');expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();expect(button).toHaveFocus()})

it('po usunieciu materialu fokus wraca do edytora zamiast body',async()=>{
 const item={id:50,format:'markdown',text:'Teoria'};let v={...version,nodes:[{...lesson,theory:[item]}]}
 mockApi(editorApi({[`GET ${V}`]:()=>({...ok(v),headers:{ETag:'"v2-r1"'}}),[`DELETE ${V}lessons/13/items/50/`]:()=>{v={...version,nodes:[lesson]};return {status:204}}}));renderApp(editorPath);const u=userEvent.setup()
 await u.click(await screen.findByText('Materia\u0142 1: markdown'));const button=screen.getByRole('button',{name:'Usu\u0144 materia\u0142 50'});button.focus();await u.keyboard('{Enter}');await screen.findByText('Zapisano zmiany.')
 expect(screen.getByRole('heading',{name:'Edytor wersji'})).toHaveFocus()
})
