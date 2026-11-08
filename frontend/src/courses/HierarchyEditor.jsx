import {useState} from 'react'
import {Action,Field,flattenNodes} from './EditorParts.jsx'
import PrerequisiteEditor from './PrerequisiteEditor.jsx'
import TestEditor from './TestEditor.jsx'
import LessonItemEditor,{AddMaterialModal} from './LessonItemEditor.jsx'
import EditorBoard from './EditorBoard.jsx'
import {nodeEntry} from './HierarchyWorkspace.jsx'
import {EditorDelete,EditorMenu,EditorModal,saveDraftScope} from './EditorOverlay.jsx'
const labels={section:'dział',topic:'temat',lesson:'lekcję'}
function AddNode({kind,parentId,mutate}) {
 const [title,setTitle]=useState('');const [error,setError]=useState(null)
 async function add(){if(!title.trim()){setError('Podaj nazwę elementu.');return}if(await mutate('nodes/','POST',{kind,parent_id:parentId??null,title:title.trim()})){setTitle('');setError(null)}}
 return <div className="add-node" data-draft-scope><Field label={kind==='section'?'Nazwa nowego działu':`Nazwa nowego elementu ${parentId}`}><input maxLength={200} value={title} onChange={e=>setTitle(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();add()}}}/></Field><Action onClick={add}>Dodaj {labels[kind]}</Action>{error&&<p role="alert">{error}</p>}</div>
}
function NodeEditor({node,nodes,mutate,courseId,versionId,upload,onDelete,onAdd,selectedPractice,selectedTheory,onSelect}) {
 const [title,setTitle]=useState(node.title)
 const next={section:'topic',topic:'lesson'}[node.kind]
 const material=!!selectedPractice||!!selectedTheory
 return <section className="hierarchy-node" aria-label={`${node.title} — edycja`}>
 <section className="editor-detail-card" aria-label="Podstawowe" hidden={material} data-draft-scope><h3>Podstawowe</h3><Field label={`Nazwa ${node.title}`}><input value={title} maxLength={200} onChange={e=>setTitle(e.target.value)}/></Field><div className="course-actions"><Action disabled={!title.trim()} onClick={()=>mutate(`nodes/${node.id}/`,'PATCH',{title:title.trim()})}>Zapisz nazwę {node.title}</Action></div></section>
 <section className="editor-detail-card" aria-label="Elementy podrzędne"><h3 hidden={material}>Elementy podrzędne</h3>
 {next&&<><p>{node.children?.length?`Elementy: ${node.children.length}.`:'Brak elementów. Dodaj pierwszy.'}</p>{node.children?.length>0&&<ul className="editor-child-list">{node.children.map(child=><li key={child.id}><Action onClick={()=>onSelect(nodeEntry(child.id))}>{child.kind==='topic'?'Temat':'Lekcja'}: {child.title}</Action></li>)}</ul>}<Action onClick={()=>onAdd(node)}>Dodaj {labels[next]}</Action></>}
 {node.kind==='lesson'&&<LessonItemEditor node={node} courseId={courseId} versionId={versionId} mutate={mutate} upload={upload} selectedPractice={selectedPractice} selectedTheory={selectedTheory} board onDelete={onDelete} onAdd={category=>onAdd(node,category)}/>}
 </section>
 <section className="editor-detail-card" aria-label="Wymagania wstępne" hidden={material}><PrerequisiteEditor node={node} nodes={nodes} mutate={mutate}/></section>
 <section className="editor-detail-card" aria-label="Test" hidden={material}><TestEditor node={node} mutate={mutate} board/></section>
 </section>
}
export default function HierarchyEditor({nodes,mutate:performMutation,courseId,versionId,upload,busy}) {
 const mutate=(path,...args)=>path.includes('/move/')?performMutation(path,...args):saveDraftScope(()=>performMutation(path,...args))
 const [deleting,setDeleting]=useState(null)
 const [adding,setAdding]=useState(null)
 const onAdd=(node,category)=>setAdding({nodeId:node.id,category})
 function actions(entry,open){
  const {node,item,index,siblings,category}=entry
  const name=item?`materiał ${item.id}`:node.title
  const prefix=item?`board-material-${node.id}-${category}-${item.id}`:`node-${node.id}`
  const path=item?`lessons/${node.id}/items/${item.id}/`:`nodes/${node.id}/`
  return <><Action role="menuitem" onClick={open}>Szczegóły i edycja</Action>{!item&&<Action role="menuitem" onClick={()=>onAdd(node)}>{node.kind==='lesson'?'Dodaj materiał':`Dodaj ${labels[{section:'topic',topic:'lesson'}[node.kind]]}`}</Action>}
   <Action role="menuitem" id={`${prefix}-up`} data-focus-fallback={`${prefix}-down`} disabled={index===0} onClick={()=>mutate(`${path}move/`,'POST',{direction:'up'})}>Góra {name}</Action>
   <Action role="menuitem" id={`${prefix}-down`} data-focus-fallback={`${prefix}-up`} disabled={index===siblings.length-1} onClick={()=>mutate(`${path}move/`,'POST',{direction:'down'})}>Dół {name}</Action>
   {!item&&node.test&&<Action role="menuitem" onClick={()=>setDeleting({title:`test ${node.title}`,path:`nodes/${node.id}/test/`,description:'Usunięty zostanie test. Tej operacji nie można cofnąć.'})}>Usuń test {node.title}</Action>}
   <Action role="menuitem" onClick={()=>setDeleting({title:item?`materiał ${item.id}`:node.title,path,item})}>Usuń {name}</Action></>
 }
 return <section className="course-section"><h2 tabIndex={-1}>Program kursu</h2><EditorBoard nodes={nodes} renderActions={actions} actions={<EditorMenu label="Dodawanie do programu"><Action role="menuitem" onClick={()=>setAdding({nodeId:null})}>Dodaj dział</Action></EditorMenu>}>{entry=><NodeEditor {...entry} nodes={nodes} mutate={mutate} courseId={courseId} versionId={versionId} upload={upload} onDelete={setDeleting} onAdd={onAdd}/>}</EditorBoard>
 <EditorModal open={!!adding&&adding.nodeId===null} title="Nowy dział" onClose={()=>setAdding(null)}><AddNode kind="section" mutate={mutate}/></EditorModal>
 {flattenNodes(nodes).map(node=>node.kind==='lesson'
  ?<AddMaterialModal key={node.id} open={adding?.nodeId===node.id} category={adding?.category} node={node} courseId={courseId} versionId={versionId} upload={upload} mutate={mutate} onClose={()=>setAdding(null)}/>
  :<EditorModal key={node.id} open={adding?.nodeId===node.id} title={node.kind==='section'?'Nowy temat':'Nowa lekcja'} onClose={()=>setAdding(null)}><p>W elemencie: {node.title}</p><AddNode kind={node.kind==='section'?'topic':'lesson'} parentId={node.id} mutate={mutate}/></EditorModal>)}
 {deleting&&<EditorDelete title={deleting.title} busy={busy} description={deleting.description??(deleting.item?'Usunięty zostanie materiał. Tej operacji nie można cofnąć.':undefined)} onCancel={()=>setDeleting(null)} onConfirm={async()=>{if(await mutate(deleting.path,'DELETE'))setDeleting(null)}}/>}</section>
}
