import {afterEach,expect,it,vi} from 'vitest'
import {cleanup,render,screen,within,waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import HierarchyEditor from '../../src/courses/HierarchyEditor.jsx'
import VersionContent from '../../src/courses/VersionContent.jsx'
import {choose,closeEditor} from './editor-ui.jsx'

afterEach(cleanup)
const practice={id:1,category:'practice',format:'text',text:'Zadanie',answer_mode:'keyed',answer_text:'42'}
const lesson={id:3,kind:'lesson',title:'Lekcja',theory:[],practice:[practice]}
const nodes=[{id:1,kind:'section',title:'Dział',children:[{id:2,kind:'topic',title:'Temat',children:[lesson]}]}]
const props={nodes,courseId:1,versionId:2,mutate:vi.fn(async()=>true),upload:vi.fn()}

it.each([false,true])('read-only: teoria, praktyka, test na końcu (student=%s)',async(student)=>{
 const u=userEvent.setup()
 render(<VersionContent student={student} courseId={1} version={{id:2,number:1,nodes:[{...lesson,theory:[{id:7,format:'markdown',text:'Teoria QA'}],test:{questions:[{text:'Pytanie QA',type:'single',options:[]}]}}]}}/>)
 const detail=screen.getByRole('region',{name:'Szczegóły'})
 const theory=within(detail).getByText('Teoria QA')
 const task=within(detail).getByText('Zadanie')
 const test=within(detail).getByRole('heading',{name:'Test (definicja, bez oceniania)'})
 expect(theory.compareDocumentPosition(task)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
 expect(task.compareDocumentPosition(test)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
 await u.click(screen.getByRole('button',{name:'Zadanie 1: Lekcja'}))
 expect(screen.queryByRole('heading',{name:'Test (definicja, bez oceniania)'})).not.toBeInTheDocument()
})

it('pokazuje strukturę przed jednym szczegółem, rozróżnia ID zadania i węzła oraz zachowuje szkice',async()=>{
 const u=userEvent.setup();render(<HierarchyEditor {...props}/>)
 const structure=screen.getByRole('navigation',{name:'Struktura kursu'})
 expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
 await choose(u,'Dział: Dział')
 const details=screen.getByRole('dialog',{name:/^Szczegóły —/})
 expect(structure.compareDocumentPosition(details)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
 expect(within(details).getAllByRole('region',{name:/— edycja/})).toHaveLength(1)
 await u.type(screen.getByLabelText('Nazwa Dział'),' — szkic')
 await choose(u,'Lekcja: Lekcja')
 await u.click(screen.getByRole('button',{name:'Dodaj teorię'}))
 await u.type(screen.getByLabelText('Treść nowego materiału 3 theory'),'Teoria bez zapisu')
 await choose(u,'Zadanie 1: Lekcja')
 expect(document.getElementById('hierarchy-entry-practice:3:1')).toHaveAttribute('aria-pressed','true')
 expect(screen.getByLabelText('Sposób rozwiązania — W przygotowaniu')).toBeDisabled()
 await u.clear(screen.getByLabelText('Poprawna odpowiedź 1-3-practice'))
 await u.type(screen.getByLabelText('Poprawna odpowiedź 1-3-practice'),'43')
 await choose(u,'Dział: Dział')
 expect(screen.getByLabelText('Nazwa Dział')).toHaveValue('Dział — szkic')
 await choose(u,'Lekcja: Lekcja')
 await u.click(screen.getByRole('button',{name:'Dodaj teorię'}))
 expect(screen.getByLabelText('Treść nowego materiału 3 theory')).toHaveValue('Teoria bez zapisu')
 await choose(u,'Zadanie 1: Lekcja')
 expect(screen.getByLabelText('Poprawna odpowiedź 1-3-practice')).toHaveValue('43')
 await u.click(screen.getByRole('button',{name:'Zapisz materiał 1'}))
 expect(props.mutate).toHaveBeenLastCalledWith('lessons/3/items/1/','PATCH',{format:'text',text:'Zadanie',asset_id:null,image_alt:'',video_url:'',answer_mode:'keyed',answer_text:'43'})
})

it('zachowuje wybór po reorder, po usunięciu zadania wybiera lekcję bez utraty jej szkicu',async()=>{
 const u=userEvent.setup();const view=render(<HierarchyEditor {...props}/>)
 await choose(u,'Lekcja: Lekcja');await u.type(screen.getByLabelText('Nazwa Lekcja'),' szkic')
 await choose(u,'Zadanie 1: Lekcja')
 const updated=[{...nodes[0],children:[{...nodes[0].children[0],children:[{...lesson,practice:[{...practice,id:4},practice]}]}]}]
 view.rerender(<HierarchyEditor {...props} nodes={updated}/>)
 expect(document.getElementById('hierarchy-entry-practice:3:1')).toHaveAttribute('aria-pressed','true')
 await closeEditor(u)
 screen.getByRole('button',{name:'Zadanie 2: Lekcja'}).focus()
 view.rerender(<HierarchyEditor {...props} nodes={[{...lesson,practice:[]}]}/>)
 expect(screen.getByRole('button',{name:'Lekcja: Lekcja'})).toHaveAttribute('aria-pressed','true')
 await waitFor(()=>expect(screen.getByRole('button',{name:'Lekcja: Lekcja'})).toHaveFocus())
 await choose(u,'Lekcja: Lekcja')
 expect(screen.getByLabelText('Nazwa Lekcja')).toHaveValue('Lekcja szkic')
})

it('po usunięciu lekcji wybranego zadania wybiera najbliższego zachowanego przodka',async()=>{
 const u=userEvent.setup();const view=render(<HierarchyEditor {...props}/>)
 await choose(u,'Zadanie 1: Lekcja')
 view.rerender(<HierarchyEditor {...props} nodes={[{...nodes[0],children:[{...nodes[0].children[0],children:[]}]}]}/>)
 expect(screen.getByRole('button',{name:'Temat: Temat'})).toHaveAttribute('aria-pressed','true')
 await waitFor(()=>expect(screen.getByRole('button',{name:'Temat: Temat'})).toHaveFocus())
})

it('obsługuje pustą strukturę',()=>{
 render(<HierarchyEditor {...props} nodes={[]}/>)
 expect(screen.getByRole('navigation',{name:'Struktura kursu'})).toHaveTextContent('Dodaj pierwszy dział.')
 expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

it('podgląd udostępnia nawigację i wyłącznie nieaktywne pole sposobu rozwiązania',async()=>{
 const u=userEvent.setup();render(<VersionContent version={{id:2,number:1,nodes}} courseId={1}/>)
 await choose(u,'Zadanie 1: Lekcja')
 expect(screen.getByLabelText('Sposób rozwiązania — W przygotowaniu')).toBeDisabled()
 expect(screen.queryByRole('button',{name:/Zapisz|Usuń|Dodaj/})).not.toBeInTheDocument()
 expect(screen.getByRole('region',{name:'Szczegóły'})).toHaveTextContent('Odpowiedź: 42')
})

it('rozróżnia zadania o tym samym ID w różnych lekcjach i zachowuje szkice wymagań, testu i nowych elementów',async()=>{
 const u=userEvent.setup()
 render(<HierarchyEditor {...props} nodes={[nodes[0],{...lesson,id:5,title:'Druga lekcja'}]}/>)
 await choose(u,'Dział: Dział')
 await u.click(screen.getByRole('button',{name:'Dodaj temat'}))
 await u.type(screen.getByLabelText('Nazwa nowego elementu 1'),'Nowy temat')
 await u.keyboard('{Escape}');await u.click(screen.getByRole('button',{name:'Zamknij i zachowaj szkic'}))
 await u.click(screen.getByText('Wymaganie wstępne: Dział'))
 await u.clear(screen.getByLabelText('Próg zaliczenia Dział (%)'));await u.type(screen.getByLabelText('Próg zaliczenia Dział (%)'),'80')
 await u.click(screen.getByRole('button',{name:'Dodaj pytanie Dział'}))
 await u.type(screen.getByLabelText('Treść pytania 1-1'),'Pytanie bez zapisu')
 await choose(u,'Zadanie 1: Lekcja')
 await u.clear(screen.getByRole('textbox',{name:'Treść materiału 1'}))
 await u.type(screen.getByRole('textbox',{name:'Treść materiału 1'}),'Pierwszy szkic')
 await choose(u,'Zadanie 1: Druga lekcja')
 const second=screen.getByRole('textbox',{name:'Treść materiału 1'})
 expect(second).toHaveValue('Zadanie')
 await u.clear(second);await u.type(second,'Drugi szkic')
 await choose(u,'Zadanie 1: Lekcja')
 expect(screen.getByRole('textbox',{name:'Treść materiału 1'})).toHaveValue('Pierwszy szkic')
 await choose(u,'Dział: Dział')
 expect(screen.getByLabelText('Próg zaliczenia Dział (%)')).toHaveValue(80)
 expect(screen.getByLabelText('Treść pytania 1-1')).toHaveValue('Pytanie bez zapisu')
 await u.click(screen.getByRole('button',{name:'Dodaj temat'}))
 expect(screen.getByLabelText('Nazwa nowego elementu 1')).toHaveValue('Nowy temat')
})
