import {useRef,useState} from 'react'
import {Action,Field,ConfirmDelete} from './EditorParts.jsx'
import PrerequisiteEditor from './PrerequisiteEditor.jsx'
import TestEditor from './TestEditor.jsx'
import LessonItemEditor from './LessonItemEditor.jsx'
const labels={section:'dział',topic:'temat',lesson:'lekcję'}
function AddNode({kind,parentId,mutate}) {
 const [title,setTitle]=useState('');const [error,setError]=useState(null)
 async function add(){if(!title.trim()){setError('Podaj nazwę elementu.');return}if(await mutate('nodes/','POST',{kind,parent_id:parentId??null,title:title.trim()})){setTitle('');setError(null)}}
 return <div className="add-node"><Field label={kind==='section'?'Nazwa nowego działu':`Nazwa nowego elementu ${parentId}`}><input maxLength={200} value={title} onChange={e=>setTitle(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();add()}}}/></Field><Action onClick={add}>Dodaj {labels[kind]}</Action>{error&&<p role="alert">{error}</p>}</div>
}
function NodeEditor({node,siblings,index,nodes,mutate,courseId,versionId,upload,onDelete}) {
 const [title,setTitle]=useState(node.title)
 const next={section:'topic',topic:'lesson'}[node.kind]
 return <li className="hierarchy-node"><section aria-label={`${node.title} — edycja`}><h3>{node.title}</h3><Field label={`Nazwa ${node.title}`}><input value={title} maxLength={200} onChange={e=>setTitle(e.target.value)}/></Field><div className="course-actions"><Action disabled={!title.trim()} onClick={()=>mutate(`nodes/${node.id}/`,'PATCH',{title:title.trim()})}>Zapisz nazwę {node.title}</Action><Action id={`node-${node.id}-up`} data-focus-fallback={`node-${node.id}-down`} disabled={index===0} onClick={()=>mutate(`nodes/${node.id}/move/`,'POST',{direction:'up'})}>Góra {node.title}</Action><Action id={`node-${node.id}-down`} data-focus-fallback={`node-${node.id}-up`} disabled={index===siblings.length-1} onClick={()=>mutate(`nodes/${node.id}/move/`,'POST',{direction:'down'})}>Dół {node.title}</Action><Action onClick={()=>onDelete(node)}>Usuń {node.title}</Action></div>
 <PrerequisiteEditor node={node} nodes={nodes} mutate={mutate}/><TestEditor node={node} mutate={mutate}/>
 {node.kind==='lesson'&&<LessonItemEditor node={node} courseId={courseId} versionId={versionId} mutate={mutate} upload={upload}/>}
 {next&&<><ol className="hierarchy-list">{(node.children||[]).map((child,i,list)=><NodeEditor key={child.id} node={child} siblings={list} index={i} nodes={nodes} mutate={mutate} courseId={courseId} versionId={versionId} upload={upload} onDelete={onDelete}/>)}</ol><AddNode kind={next} parentId={node.id} mutate={mutate}/></>}
 </section></li>
}
export default function HierarchyEditor({nodes,mutate,courseId,versionId,upload,busy}) {
 const [deleting,setDeleting]=useState(null);const heading=useRef(null)
 return <section className="course-section"><h2 ref={heading} tabIndex={-1}>Program kursu</h2>{!nodes?.length&&<p className="courses-empty">Dodaj pierwszy dział.</p>}<ol className="hierarchy-list">{(nodes||[]).map((node,i,list)=><NodeEditor key={node.id} node={node} index={i} siblings={list} nodes={nodes} mutate={mutate} courseId={courseId} versionId={versionId} upload={upload} onDelete={setDeleting}/>)}</ol><AddNode kind="section" mutate={mutate}/>{deleting&&<ConfirmDelete title={deleting.title} busy={busy} onCancel={()=>setDeleting(null)} onConfirm={async()=>{if(await mutate(`nodes/${deleting.id}/`,'DELETE')){setDeleting(null);heading.current?.focus()}}}/>}</section>
}
