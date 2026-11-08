import {useEffect,useRef,useState} from 'react'
import {EditorModal,EditorMenu} from './EditorOverlay.jsx'
import {entryButtonId,nodeEntry,practiceEntry} from './HierarchyWorkspace.jsx'
const kinds={section:'Dział',topic:'Temat',lesson:'Lekcja'}
const theoryEntry=(lesson,id)=>`theory:${lesson}:${id}`
function entriesFor(nodes,ancestors=[]) {
 return (nodes||[]).flatMap((node,index,siblings)=>[
  {key:nodeEntry(node.id),node,index,siblings,ancestors},
  ...['theory','practice'].flatMap(category=>(node[category]||[]).map((item,i,items)=>({key:category==='practice'?practiceEntry(node.id,item.id):theoryEntry(node.id,item.id),node,item,category,index:i,siblings:items,ancestors:[...ancestors,node.id],label:`${category==='practice'?'Zadanie':'Teoria'} ${i+1}: ${node.title}`}))),
  ...entriesFor(node.children,[...ancestors,node.id])
 ])
}
export default function EditorBoard({nodes,children,actions,renderActions}) {
 const entries=entriesFor(nodes)
 const [selected,setSelected]=useState(null),[open,setOpen]=useState(false)
 const previous=useRef(null)
 const active=entries.find(e=>e.key===selected)
 useEffect(()=>{
  if(selected&&!active){
   const old=previous.current
   const fallback=[...(old?.ancestors||[])].reverse().map(id=>entries.find(e=>e.key===nodeEntry(id))).find(Boolean)??entries[0]
   setSelected(fallback?.key??null);setOpen(false)
   queueMicrotask(()=>document.getElementById(fallback?entryButtonId(fallback.key):'hierarchy-structure-title')?.focus())
  }
  if(active)previous.current=active
 },[selected,active])
 function choose(key){
  setSelected(key);setOpen(true)
  if(open)queueMicrotask(()=>document.querySelector('.editor-breadcrumb [aria-current="page"]')?.focus())
 }
 const labelFor=entry=>entry.label??`${kinds[entry.node.kind]}: ${entry.node.title}`
 const path=active?[...active.ancestors.map(id=>entries.find(e=>e.key===nodeEntry(id))).filter(Boolean),active]:[]
 const breadcrumb=<nav className="editor-breadcrumb" aria-label="Ścieżka elementu"><ol>{path.map((entry,index)=><li key={entry.key}>{index===path.length-1?<span aria-current="page" tabIndex={-1}>{entry.item?entry.label:entry.node.title}</span>:<button type="button" onClick={()=>choose(entry.key)}>{entry.node.title}</button>}</li>)}</ol></nav>
 function tile(entry){
  const label=labelFor(entry)
  return <div className={`editor-tile editor-tile-${entry.category??entry.node.kind}`} onClickCapture={()=>setSelected(entry.key)} onKeyDownCapture={()=>setSelected(entry.key)}><button type="button" aria-label={label} id={entryButtonId(entry.key)} aria-pressed={selected===entry.key} onClick={()=>choose(entry.key)}><span>{label}</span><small>{entry.item?'Materiał lekcji':entry.ancestors.length?'Element podrzędny':'Dział główny'}</small></button><EditorMenu label={`Akcje ${entry.item?entry.label:entry.node.title}`}>{renderActions(entry,()=>choose(entry.key))}</EditorMenu></div>
 }
 function tree(list){
  return <ol className="editor-board-list">{(list||[]).map(node=><li key={node.id}>
   {tile(entries.find(e=>e.key===nodeEntry(node.id)))}
   {node.children?.length>0&&tree(node.children)}
   {entries.filter(e=>e.item&&e.node.id===node.id).length>0&&<ol className="editor-board-list">{entries.filter(e=>e.item&&e.node.id===node.id).map(e=><li key={e.key}>{tile(e)}</li>)}</ol>}
  </li>)}</ol>
 }
 return <><nav className="editor-board" aria-label="Struktura kursu"><header className="courses-header"><h3 id="hierarchy-structure-title" tabIndex={-1}>Struktura</h3>{actions}</header>{entries.length?tree(nodes):<p className="courses-empty">Dodaj pierwszy dział.</p>}</nav>
 <EditorModal open={open&&!!active} title={active?`Szczegóły — ${labelFor(active)}`:'Szczegóły'} breadcrumb={breadcrumb} onClose={()=>setOpen(false)}>
 {entries.filter(e=>!e.item).map(({key,...entry})=><div key={key} hidden={active?.node.id!==entry.node.id}>{children({...entry,onSelect:choose,selectedPractice:active?.node.id===entry.node.id&&active.category==='practice'?active.item:null,selectedTheory:active?.node.id===entry.node.id&&active.category==='theory'?active.item:null})}</div>)}
 </EditorModal></>
}
