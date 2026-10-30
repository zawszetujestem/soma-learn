import { useEffect, useRef } from 'react'
export function Field({label,children}) { return <label className="field"><span>{label}</span>{children}</label> }
export function Action({children,...props}) {return <button type="button" className="button button-secondary" {...props}>{children}</button>}
export function ConfirmDelete({title,onCancel,onConfirm,busy}) {
 const cancel=useRef(null);const dialog=useRef(null)
 useEffect(()=>{const previous=document.activeElement;cancel.current?.focus();return()=>{if(previous?.isConnected)previous.focus()}},[])
 function key(event) {
  if(event.key==='Escape'&&!busy){event.preventDefault();onCancel()}
  if(event.key==='Tab') {const buttons=[...dialog.current.querySelectorAll('button:not(:disabled)')];const first=buttons[0],last=buttons.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus()}}
 }
 return <div className="confirm-backdrop"><section ref={dialog} className="confirm-dialog" role="alertdialog" aria-modal="true" aria-label="Usunięcie poddrzewa" aria-describedby="delete-description" onKeyDown={key}><h2>Usunąć {title}?</h2><p id="delete-description">Usunięte zostanie całe poddrzewo wraz z materiałami i testami. Tej operacji nie można cofnąć.</p><div className="course-actions"><button ref={cancel} type="button" className="button button-secondary" onClick={onCancel} disabled={busy}>Anuluj</button><Action onClick={onConfirm} disabled={busy}>Potwierdź usunięcie</Action></div></section></div>
}
export const stateLabels={draft:'Draft',submitted:'Wysłana do akceptacji',rejected:'Odrzucona',published:'Opublikowana'}
export const flattenNodes=(nodes,ancestors=[]) => (nodes||[]).flatMap(node=>[{...node,ancestors},...flattenNodes(node.children,[...ancestors,node.id])])
