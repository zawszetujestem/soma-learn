import {useState} from 'react'
import {Action,Field,flattenNodes} from './EditorParts.jsx'
export default function PrerequisiteEditor({node,nodes,mutate}) {
 const [source,setSource]=useState(String(node.prerequisite?.source_id??''))
 const [threshold,setThreshold]=useState(node.prerequisite?.threshold??70)
 const flat=flattenNodes(nodes);const index=flat.findIndex(n=>n.id===node.id)
 const eligible=flat.slice(0,index).filter(n=>n.test&&!flat[index]?.ancestors.includes(n.id)&&!n.ancestors.includes(node.id))
 return <details><summary>Wymaganie wstępne: {node.title}</summary>{node.prerequisite?.message&&<p>{node.prerequisite.message}</p>}
 <Field label={`Źródło wymagania ${node.title}`}><select value={source} onChange={e=>setSource(e.target.value)}><option value="">Bez wymagania</option>{eligible.map(n=><option key={n.id} value={n.id}>{n.title}</option>)}</select></Field>
 <Field label={`Próg zaliczenia ${node.title} (%)`}><input type="number" min="1" max="100" step="1" value={threshold} onChange={e=>setThreshold(e.target.value)}/></Field>
 <Action disabled={Boolean(source)&&(!Number.isInteger(Number(threshold))||threshold<1||threshold>100)} onClick={()=>source?mutate(`nodes/${node.id}/prerequisite/`,'PUT',{source_id:Number(source),threshold:Number(threshold)}):mutate(`nodes/${node.id}/prerequisite/`,'DELETE')}>Zapisz wymaganie {node.title}</Action><p>Źródło musi mieć własny test i występować wcześniej; nie może być przodkiem ani potomkiem.</p></details>
}
