import {useEffect,useRef,useState} from 'react'

export const nodeEntry=id=>`node:${id}`
export const practiceEntry=(lessonId,id)=>`practice:${lessonId}:${id}`
export const entryButtonId=entry=>`hierarchy-entry-${entry}`
const kindLabels={section:'Dział',topic:'Temat',lesson:'Lekcja'}

function entriesFor(nodes,ancestors=[]) {
 return (nodes||[]).flatMap((node,index,siblings)=>[
  {key:nodeEntry(node.id),node,index,siblings,ancestors},
  ...(node.practice||[]).map((item,i)=>({key:practiceEntry(node.id,item.id),node,item,ancestors:[...ancestors,node.id],label:`Zadanie ${i+1}: ${node.title}`})),
  ...entriesFor(node.children,[...ancestors,node.id]),
 ])
}

// Panels remain mounted, keyed by entity, so all editor-local drafts (including
// uploads, questions and validation errors) survive navigation and reorder.
export default function HierarchyWorkspace({nodes,children,empty='Program nie został jeszcze uzupełniony.',actions}) {
 const entries=entriesFor(nodes)
 const [selected,setSelected]=useState(()=>entries[0]?.key??null)
 const previous=useRef(null)
 const current=entries.find(e=>e.key===selected)
 const old=previous.current
 const active=current??entries.find(e=>e.key===nodeEntry(old?.node.id))
  ??[...(old?.ancestors||[])].reverse().map(id=>entries.find(e=>e.key===nodeEntry(id))).find(Boolean)
  ??entries[0]
 useEffect(()=>{
  if(selected!==(active?.key??null)) {
   setSelected(active?.key??null)
   const target=active?document.getElementById(entryButtonId(active.key)):document.getElementById('hierarchy-structure-title')
   target?.focus()
  }
  previous.current=active
 },[selected,active])
 function navigation(list) {
  return <ol className="hierarchy-navigation-list">{(list||[]).map(node=><li key={node.id}>
   <button type="button" id={entryButtonId(nodeEntry(node.id))} aria-pressed={active?.key===nodeEntry(node.id)} onClick={()=>setSelected(nodeEntry(node.id))}>{kindLabels[node.kind]}: {node.title}</button>
   {node.children?.length>0&&navigation(node.children)}
   {node.practice?.length>0&&<ol className="hierarchy-navigation-list">{node.practice.map((item,i)=><li key={item.id}><button type="button" id={entryButtonId(practiceEntry(node.id,item.id))} aria-pressed={active?.key===practiceEntry(node.id,item.id)} onClick={()=>setSelected(practiceEntry(node.id,item.id))}>Zadanie {i+1}: {node.title}</button></li>)}</ol>}
  </li>)}</ol>
 }
 return <div className="hierarchy-workspace">
  <nav aria-label="Struktura kursu" className="hierarchy-structure"><h3 id="hierarchy-structure-title" tabIndex={-1}>Struktura</h3>{entries.length?navigation(nodes):<p className="courses-empty">{empty}</p>}{actions}</nav>
  <section aria-label="Szczegóły" className="hierarchy-details"><h2>Szczegóły</h2>{!active&&<p className="courses-empty">Wybierz element struktury, aby zobaczyć szczegóły.</p>}
   {entries.filter(e=>!e.item).map(({key,...entry})=><div key={key} hidden={active?.node.id!==entry.node.id}>{children({...entry,selectedPractice:active?.node.id===entry.node.id?active.item:null})}</div>)}
  </section>
 </div>
}
