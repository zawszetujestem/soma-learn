import {createContext,useContext,useEffect,useId,useRef,useState} from 'react'
import {createPortal} from 'react-dom'

export const EditorFeedback=createContext({busy:false,content:null})
export async function saveDraftScope(action) {
 const scope=document.activeElement?.closest('[data-draft-scope]')
 const success=await action()
 if(success&&scope?.isConnected)scope.dispatchEvent(new CustomEvent('editor-saved',{bubbles:true}))
 return success
}
const focusables=el=>[...el.querySelectorAll('button,input,textarea,select,a[href],summary,[tabindex="0"]')].filter(e=>!e.matches(':disabled')&&!e.closest('[hidden]')&&(!e.closest('details:not([open])')||e.tagName==='SUMMARY'))

// Keep children mounted: closing a dialog never discards editor-local drafts.
export function EditorModal({open,onClose,title,breadcrumb,children,confirmClose=true,role='dialog'}) {
 const {busy,content,activeModal,setActiveModal}=useContext(EditorFeedback)
 const dialog=useRef(null),close=useRef(null),previous=useRef(null)
 const [dirty,setDirty]=useState(false),[confirm,setConfirm]=useState(false)
 const dirtyScopes=useRef(new Set())
 const id=useId()
 useEffect(()=>{
  const el=dialog.current
  function saved(e){dirtyScopes.current.delete(e.target);setDirty(dirtyScopes.current.size>0)}
  el.addEventListener('editor-saved',saved)
  return ()=>el.removeEventListener('editor-saved',saved)
 },[])
 function changed(e){dirtyScopes.current.add(e.target.closest('[data-draft-scope]')??e.target);setDirty(true)}
 useEffect(()=>{if(open&&busy&&!dialog.current.parentElement.hasAttribute('inert'))dialog.current.focus()},[open,busy])
 useEffect(()=>{
  if(!open)return
  previous.current=document.activeElement
  const previousModal=activeModal
  setActiveModal?.(id)
  const backdrop=dialog.current.parentElement
  // A mounted child overlay may already be inert/hidden by the parent.
  const ownInert=backdrop.hasAttribute('inert'),ownAria=backdrop.getAttribute('aria-hidden')
  backdrop.removeAttribute('inert');backdrop.removeAttribute('aria-hidden')
  const siblings=[...document.body.children].filter(e=>e!==backdrop)
  const saved=[...siblings,...document.querySelectorAll('main')].map(e=>[e,e.hasAttribute('inert'),e.getAttribute('aria-hidden')])
  saved.forEach(([e])=>{e.setAttribute('inert','');e.setAttribute('aria-hidden','true')})
  const overflow=document.body.style.overflow
  document.body.style.overflow='hidden'
  close.current?.focus()
  function contain(e){if(!backdrop.hasAttribute('inert')&&!dialog.current.contains(e.target)){(close.current?.disabled?dialog.current:close.current)?.focus()}}
  document.addEventListener('focusin',contain)
  return ()=>{
   document.removeEventListener('focusin',contain)
   saved.forEach(([e,inert,aria])=>{if(!inert)e.removeAttribute('inert');if(aria===null)e.removeAttribute('aria-hidden');else e.setAttribute('aria-hidden',aria)})
   if(ownInert)backdrop.setAttribute('inert','')
   if(ownAria!==null)backdrop.setAttribute('aria-hidden',ownAria)
   document.body.style.overflow=overflow
   setActiveModal?.(previousModal??null)
   setConfirm(false)
   if(previous.current?.isConnected){
    const target=previous.current.closest('[hidden]')?previous.current.closest('.editor-menu')?.querySelector('[aria-haspopup="menu"]'):previous.current
    target?.focus()
   }
  }
 },[open])
 function requestClose(){if(busy)return;const unsaved=dirty&&[...dirtyScopes.current].some(scope=>scope.isConnected);if(unsaved&&confirmClose)setConfirm(true);else onClose()}
 function cancelWarning(){setConfirm(false);close.current?.focus()}
 function key(e){
  if(e.key==='Escape'){e.preventDefault();e.stopPropagation();if(confirm)cancelWarning();else requestClose()}
  if(e.key==='Tab'){
   const all=focusables(dialog.current),first=all[0],last=all.at(-1)
   if(!first){e.preventDefault();dialog.current.focus()}
   else if(e.shiftKey&&(document.activeElement===first||document.activeElement===dialog.current)){e.preventDefault();last.focus()}
   else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
  }
 }
 return createPortal(<div hidden={!open} className="app-shell editor-modal-backdrop"><section ref={dialog} role={role} aria-modal="true" aria-labelledby={id} aria-busy={busy} tabIndex={-1} className="editor-modal version-editor" onKeyDown={key}>
  <header className="editor-modal-header"><div>{breadcrumb}<h2 id={id}>{title}</h2></div><button ref={close} type="button" className="button button-secondary" disabled={busy} onClick={requestClose}>{role==='alertdialog'?'Anuluj':'Zamknij'}</button></header>
  {confirm&&<section role="alert" className="courses-banner"><p>Niezapisane zmiany pozostaną w szkicu.</p><button autoFocus type="button" className="button" onClick={onClose}>Zamknij i zachowaj szkic</button><button type="button" className="button button-secondary" onClick={cancelWarning}>Wróć do edycji</button></section>}
  {open&&activeModal===id&&content}
  <fieldset className="editor-fieldset" data-draft-scope disabled={busy} onChangeCapture={changed} onClickCapture={e=>{if(e.target.closest('button')?.textContent?.match(/Dodaj pytanie|Dodaj opcję|Usuń pytanie|Usuń opcję/))changed(e)}}>{children}</fieldset>
 </section></div>,document.body)
}

export function EditorMenu({label,children}) {
 const [open,setOpen]=useState(false)
 const ref=useRef(null),trigger=useRef(null)
 const id=useId()
 useEffect(()=>{
  if(!open)return
  focusables(ref.current)[0]?.focus()
  function outside(e){if(!ref.current?.contains(e.target)&&e.target!==trigger.current)setOpen(false)}
  document.addEventListener('pointerdown',outside)
  return ()=>document.removeEventListener('pointerdown',outside)
 },[open])
 function key(e){
  const items=focusables(ref.current)
  if(e.key==='Escape'){e.stopPropagation();e.preventDefault();setOpen(false);trigger.current?.focus()}
  if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)&&!e.target.matches('input,textarea,select')){
   e.preventDefault()
   const i=items.indexOf(document.activeElement)
   items[e.key==='Home'?0:e.key==='End'?items.length-1:(i+(e.key==='ArrowDown'?1:-1)+items.length)%items.length]?.focus()
  }
  if(e.key==='Tab'&&((e.shiftKey&&document.activeElement===items[0])||(!e.shiftKey&&document.activeElement===items.at(-1)))){setOpen(false);trigger.current?.focus()}
 }
 return <div className="editor-menu"><button ref={trigger} type="button" className="button button-secondary editor-kebab" aria-label={label} aria-haspopup="menu" aria-expanded={open} aria-controls={id} onClick={()=>setOpen(v=>!v)} onKeyDown={e=>{if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();setOpen(true)}}}>⋮</button><div id={id} ref={ref} hidden={!open} role="menu" aria-label={label} className="editor-menu-panel" onKeyDown={key} onClick={e=>{const action=e.target.closest('button');if(action&&!action.id){setOpen(false);trigger.current?.focus()}}}>{children}</div></div>
}

export function EditorDelete({title,onCancel,onConfirm,busy,description}) {
 return <EditorModal open title={`Usunąć ${title}?`} role="alertdialog" onClose={onCancel} confirmClose={false}><p>{description??'Usunięte zostanie całe poddrzewo wraz z materiałami i testami. Tej operacji nie można cofnąć.'}</p><button type="button" className="button" disabled={busy} onClick={onConfirm}>Potwierdź usunięcie</button></EditorModal>
}
