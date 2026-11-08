import SafeMarkdown,{safeVideo} from './SafeMarkdown.jsx'
import PrivateAsset from './PrivateAsset.jsx'
import {flattenNodes} from './EditorParts.jsx'
import HierarchyWorkspace from './HierarchyWorkspace.jsx'
import SolvingPlaceholder from './SolvingPlaceholder.jsx'
export function Program({nodes}) {return !nodes?.length?<p className="courses-empty">Program nie został jeszcze uzupełniony.</p>:<ol className="version-program">{nodes.map(n=><li key={n.id}>{n.title}{n.children?.length>0&&<Program nodes={n.children}/>}</li>)}</ol>}
export function MaterialContent({item,courseId,versionId,student=false}) {
 const assetId=item.asset_id??item.asset?.id??item.asset
 return <article className="material-content">{item.text&&<SafeMarkdown>{item.text}</SafeMarkdown>}{item.format==='video'&&safeVideo(item.video_url)&&<a href={item.video_url} target="_blank" rel="noopener noreferrer">Otwórz wideo</a>}{assetId&&<PrivateAsset courseId={courseId} versionId={versionId} assetId={assetId} format={item.format} alt={item.image_alt}/>}{!student&&item.answer_mode==='keyed'&&item.answer_text&&<p>Odpowiedź: {item.answer_text}</p>}</article>
}
export default function VersionContent({version,courseId,student=false}) {
 const flat=flattenNodes(version.nodes)
 function detail({node:n,selectedPractice}) {
  return <section className="content-node"><div hidden={!!selectedPractice}><h3>{n.title}</h3>{n.prerequisite&&<p className="courses-banner">{n.prerequisite.message||`Wymaga zaliczenia ${flat.find(s=>s.id===n.prerequisite.source_id)?.title??'wskazanego elementu'} na ${n.prerequisite.threshold}%`}</p>}{n.theory?.map(item=><MaterialContent key={item.id} item={item} courseId={courseId} versionId={version.id} student={student}/>)}{!n.theory?.length&&!n.practice?.length&&!n.test&&<p>Brak materiałów. Wybierz elementy w strukturze.</p>}</div>
   {selectedPractice&&<h3>Zadanie {n.practice.findIndex(item=>item.id===selectedPractice.id)+1}: {n.title}</h3>}
   {n.practice?.length>0&&<h4>Praktyka</h4>}{n.practice?.map(item=><div key={item.id} hidden={!!selectedPractice&&selectedPractice.id!==item.id}><MaterialContent item={item} courseId={courseId} versionId={version.id} student={student}/><SolvingPlaceholder/></div>)}
   {n.test&&<div hidden={!!selectedPractice}><h4>Test (definicja, bez oceniania)</h4>{n.test.questions?.map((q,i)=><div key={q.id??i}><p>{i+1}. {q.text} ({q.type==='single'?'jedna odpowiedź':'wiele odpowiedzi'})</p><ul>{q.options?.map((o,j)=><li key={o.id??j}>{o.text}{!student&&o.is_correct?' — poprawna':''}</li>)}</ul></div>)}</div>}
  </section>
 }
 return <section className="course-section" aria-label="Treść wersji"><h2>Treść wersji {version.number}</h2><HierarchyWorkspace nodes={version.nodes} empty="Brak materiałów w tej wersji.">{detail}</HierarchyWorkspace></section>
}
