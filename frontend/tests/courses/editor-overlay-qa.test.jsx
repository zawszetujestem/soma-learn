import {afterEach,expect,it} from 'vitest'
import {screen,within,waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {mockApi,renderApp,resetTestEnv,ok,fail} from './helpers.jsx'
import {editorApi,editorPath,V,version,lesson} from './version-fixtures.jsx'
import {choose,closeEditor,settings} from './editor-ui.jsx'
afterEach(resetTestEnv)

it('QA: focus trap obejmuje summary, blokuje tło i scroll oraz przywraca je po zamknięciu',async()=>{
 mockApi(editorApi());renderApp(editorPath);const u=userEvent.setup()
 const tile=await screen.findByRole('button',{name:'Dział: Dział pierwszy'})
 await u.click(tile)
 expect(document.body.style.overflow).toBe('hidden')
 const dialog=screen.getByRole('dialog')
 const close=within(dialog).getByRole('button',{name:'Zamknij'})
 await u.keyboard('{Shift>}{Tab}{/Shift}')
 expect(within(dialog).getByRole('button',{name:'Zapisz test Dział pierwszy'})).toHaveFocus()
 await u.keyboard('{Tab}');expect(close).toHaveFocus()
 tile.focus();expect(close).toHaveFocus()
 await u.keyboard('{Escape}')
 expect(tile).toHaveFocus()
 expect(document.querySelector('main')).not.toHaveAttribute('inert')
 expect(document.body.style.overflow).not.toBe('hidden')
})

it('QA: zapis nazwy nie kasuje niezapisanego testu, czysty zapis metadanych zamyka się bez ostrzeżenia',async()=>{
 const {calls}=mockApi(editorApi({[`PATCH ${V}nodes/11/`]:ok({}),[`PATCH ${V}`]:ok(version)}));renderApp(editorPath);const u=userEvent.setup()
 await choose(u,'Dział: Dział pierwszy')
 await u.click(screen.getByRole('button',{name:'Dodaj pytanie Dział pierwszy'}))
 await u.type(screen.getByLabelText('Nazwa Dział pierwszy'),' nowa')
 await u.click(screen.getByRole('button',{name:'Zapisz nazwę Dział pierwszy'}))
 await screen.findByText('Zapisano zmiany.')
 await u.keyboard('{Escape}')
 expect(screen.getByText('Niezapisane zmiany pozostaną w szkicu.')).toBeVisible()
 await u.keyboard('{Escape}')
 const activeDialog=screen.getByRole('dialog')
 expect(activeDialog).toContainElement(document.activeElement)
 expect(document.activeElement).toBeVisible()
 expect(screen.queryByText('Niezapisane zmiany pozostaną w szkicu.')).not.toBeInTheDocument()
 await u.keyboard('{Escape}')
 expect(calls.filter(c=>c.method!=='GET')).toHaveLength(1)
 await u.click(screen.getByRole('button',{name:'Zamknij i zachowaj szkic'}))
 await settings(u);await u.type(screen.getByLabelText('Tytuł wersji'),' nowy')
 await u.click(screen.getByRole('button',{name:'Zapisz draft'}));await screen.findByText('Zapisano draft.')
 await u.keyboard('{Escape}')
 expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

it.each([
 ['Dział: Dział pierwszy','Dział pierwszy','Dodaj temat','Nowy temat','Nazwa nowego elementu 11','nodes/',{kind:'topic',parent_id:11,title:'Szkic'}],
 ['Temat: Temat pierwszy','Temat pierwszy','Dodaj lekcję','Nowa lekcja','Nazwa nowego elementu 12','nodes/',{kind:'lesson',parent_id:12,title:'Szkic'}],
 ['Lekcja: Lekcja pierwsza','Lekcja pierwsza','Dodaj teorię','Nowy materiał','Treść nowego materiału 13 theory','lessons/13/items/',{category:'theory',format:'markdown',text:'Szkic',asset_id:null,image_alt:'',video_url:''}],
 ['Lekcja: Lekcja pierwsza','Lekcja pierwsza','Dodaj praktykę','Nowy materiał','Treść nowego materiału 13 practice','lessons/13/items/',{category:'practice',format:'text',text:'Szkic',asset_id:null,image_alt:'',video_url:'',answer_mode:'open',answer_text:null}],
])('QA: %s otwiera odrębny add, zachowuje parent i szkice, obsługuje błąd oraz zapis',async(tile,name,action,title,field,path,payload)=>{
 let reject=true,finish
 const {calls}=mockApi(editorApi({[`POST ${V}${path}`]:()=>new Promise(resolve=>{finish=()=>resolve(reject?fail(400,{message:'Błąd dodawania.'}):ok({id:99}))})}))
 renderApp(editorPath);const u=userEvent.setup()
 await choose(u,tile)
 const parent=screen.getByRole('dialog')
 await u.type(screen.getByLabelText(`Nazwa ${name}`),' parent szkic')
 const trigger=screen.getByRole('button',{name:action})
 await u.click(trigger)
 const add=screen.getByRole('dialog',{name:title})
 expect(add).not.toBe(parent)
 expect(parent).toBeInTheDocument()
 expect(parent.parentElement).toHaveAttribute('inert')
 await u.type(screen.getByLabelText(field),'Szkic')
 await u.keyboard('{Escape}');await u.click(screen.getByRole('button',{name:'Zamknij i zachowaj szkic'}))
 expect(screen.getByRole('dialog')).toBe(parent)
 expect(trigger).toHaveFocus()
 expect(screen.getByLabelText(`Nazwa ${name}`)).toHaveValue(`${name} parent szkic`)
 await u.click(trigger)
 expect(screen.getByLabelText(field)).toHaveValue('Szkic')
 await u.click(within(add).getByRole('button',{name:action}))
 expect(add).toHaveAttribute('aria-busy','true')
 await u.keyboard('{Escape}');expect(add).toBeVisible()
 finish()
 expect(await screen.findByRole('alert')).toHaveTextContent('Błąd dodawania.')
 expect(within(add).getByRole('alert')).toHaveTextContent('Błąd dodawania.')
 expect(screen.getByLabelText(field)).toHaveValue('Szkic')
 reject=false
 await u.click(within(add).getByRole('button',{name:action}));finish()
 await screen.findByText('Zapisano zmiany.')
 expect(calls.filter(c=>c.method==='POST').map(c=>c.body)).toEqual([payload,payload])
 await u.keyboard('{Escape}')
 expect(screen.getByRole('dialog')).toBe(parent)
 expect(trigger).toHaveFocus()
 expect(screen.queryByText('Niezapisane zmiany pozostaną w szkicu.')).not.toBeInTheDocument()
 await u.keyboard('{Escape}')
 expect(screen.getByText('Niezapisane zmiany pozostaną w szkicu.')).toBeVisible()
})

it('QA: add materiału przełącza teorię/praktykę bez utraty szkiców i waliduje we własnym modalu',async()=>{
 mockApi(editorApi());renderApp(editorPath);const u=userEvent.setup()
 await choose(u,'Lekcja: Lekcja pierwsza')
 const parent=screen.getByRole('dialog')
 await u.click(screen.getByRole('button',{name:'Dodaj teorię'}))
 const add=screen.getByRole('dialog',{name:'Nowy materiał'})
 await u.click(screen.getByRole('button',{name:'Dodaj teorię'}))
 expect(within(add).getByRole('alert')).toHaveTextContent('Podaj treść materiału.')
 await u.type(screen.getByLabelText('Treść nowego materiału 13 theory'),'Teoria szkic')
 await u.click(screen.getByRole('button',{name:'Praktyka',exact:true}))
 await u.type(screen.getByLabelText('Treść nowego materiału 13 practice'),'Praktyka szkic')
 await u.click(screen.getByRole('button',{name:'Teoria',exact:true}))
 expect(screen.getByLabelText('Treść nowego materiału 13 theory')).toHaveValue('Teoria szkic')
 await u.keyboard('{Escape}');await u.click(screen.getByRole('button',{name:'Zamknij i zachowaj szkic'}))
 expect(screen.getByRole('dialog')).toBe(parent)
 await u.click(screen.getByRole('button',{name:'Dodaj praktykę'}))
 expect(screen.getByLabelText('Treść nowego materiału 13 practice')).toHaveValue('Praktyka szkic')
 expect(screen.getByRole('button',{name:'Zamknij'})).toHaveFocus()
})

it.each([
 ['Dział pierwszy','Dodaj temat','Nowy temat'],
 ['Temat pierwszy','Dodaj lekcję','Nowa lekcja'],
 ['Lekcja pierwsza','Dodaj materiał','Nowy materiał'],
])('QA: menu %s otwiera add zamiast szczegółów rodzica',async(name,action,title)=>{
 mockApi(editorApi());renderApp(editorPath);const u=userEvent.setup()
 await u.click(await screen.findByRole('button',{name:`Akcje ${name}`}))
 await u.click(screen.getByRole('menuitem',{name:action}))
 expect(screen.getByRole('dialog',{name:title})).toBeVisible()
 await u.keyboard('{Escape}')
 expect(screen.getByRole('button',{name:`Akcje ${name}`})).toHaveFocus()
})

it('QA: zagnieżdżone potwierdzenie materiału jest jedynym aktywnym modalem i nie gubi szkicu',async()=>{
 const item={id:50,format:'text',text:'Zadanie',answer_mode:'keyed',answer_text:'42'}
 const {calls}=mockApi(editorApi({},undefined,{...version,nodes:[{...lesson,practice:[item]}]}));renderApp(editorPath);const u=userEvent.setup()
 await choose(u,'Zadanie 1: Lekcja pierwsza')
 await u.type(screen.getByLabelText('Poprawna odpowiedź 50-13-practice'),' szkic')
 await u.click(screen.getByRole('button',{name:'Akcje materiał 50'}))
 await u.click(screen.getByRole('menuitem',{name:'Usuń materiał 50'}))
 expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
 expect(screen.getByRole('button',{name:'Anuluj'})).toHaveFocus()
 await u.keyboard('{Tab}')
 expect(screen.getByRole('button',{name:'Potwierdź usunięcie'})).toHaveFocus()
 await u.keyboard('{Tab}');expect(screen.getByRole('button',{name:'Anuluj'})).toHaveFocus()
 await u.keyboard('{Escape}')
 expect(screen.getByRole('button',{name:'Akcje materiał 50'})).toHaveFocus()
 expect(screen.getByLabelText('Poprawna odpowiedź 50-13-practice')).toHaveValue('42 szkic')
 expect(calls.every(c=>c.method==='GET')).toBe(true)
})

it('QA: ładowanie i błędy zasobów pozostają w ustawieniach, busy blokuje Escape i podwójne wywołanie',async()=>{
 let finish
 const {calls}=mockApi(editorApi({'GET /api/courses/1/assets/':()=>new Promise(r=>{finish=r})}));renderApp(editorPath);const u=userEvent.setup()
 await settings(u)
 await u.click(screen.getByRole('button',{name:'Pokaż zasoby i wykorzystanie limitu'}))
 expect(screen.getByRole('dialog')).toHaveAttribute('aria-busy','true')
 expect(screen.getByRole('button',{name:'Zamknij'})).toBeDisabled()
 await u.keyboard('{Escape}');expect(screen.getByRole('dialog')).toBeInTheDocument()
 finish(fail(500,{message:'Zasoby niedostępne.'}))
 expect(await screen.findByRole('alert')).toHaveTextContent('Zasoby niedostępne.')
 expect(calls.filter(c=>c.path==='/api/courses/1/assets/')).toHaveLength(1)
 await closeEditor(u)
})
