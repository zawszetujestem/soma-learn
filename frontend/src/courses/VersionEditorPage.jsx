import {useEffect,useRef,useState} from 'react'
import {Link,useParams} from 'react-router-dom'
import {contentApi} from './api.js'
import {useCurrentUser,useLoader} from './RequireAuth.jsx'
import {ErrorMessage,LoadingMessage} from './StateViews.jsx'
import {Action,Field,stateLabels,flattenNodes} from './EditorParts.jsx'
import HierarchyEditor from './HierarchyEditor.jsx'
import VersionContent from './VersionContent.jsx'
import {VersionActions,ValidationIssues,VersionIdentity} from './VersionLifecycle.jsx'
export default function VersionEditorPage() {
 const {id,versionId}=useParams()
 const data=useLoader(async()=>{const [version,scopes,subjects]=await Promise.all([contentApi.version(id,versionId),contentApi.scopes(),contentApi.subjects()]);return {version,scopes,subjects}},[id,versionId])
 if(data.status==='loading')return <main className="courses-page page-width"><LoadingMessage>Ładowanie edytora…</LoadingMessage></main>
 if(data.status==='error')return <main className="courses-page page-width"><ErrorMessage onRetry={data.reload}>{data.error.message}</ErrorMessage></main>
 return <Editor key={`${id}/${versionId}`} data={data.data} setData={data.setData} courseId={id} versionId={versionId}/>
}
function Editor({data,setData,courseId,versionId}) {
 const {version,scopes,subjects}=data
 const user=useCurrentUser()
 const [form,setForm]=useState({title:version.title,description:version.description,scope_id:version.scope?.id??'',subject_id:version.subject?.id??''})
 const [dependencies,setDependencies]=useState([]);const [error,setError]=useState(null);const [notice,setNotice]=useState(null);const [busy,setBusy]=useState(false);const lock=useRef(false);const focusAfterOperation=useRef(null);const [validation,setValidation]=useState(null);const [library,setLibrary]=useState(null)
 useEffect(()=>{
  if(busy)return
  const target=focusAfterOperation.current
  focusAfterOperation.current=null
  if(!target)return
  if(target.isConnected&&!target.matches(':disabled'))target.focus()
  else {const fallback=target.dataset.focusFallback; (fallback&&document.getElementById(fallback)||document.getElementById('version-editor-title'))?.focus()}
 },[busy])
 const editable=['draft','rejected'].includes(version.state)
 function update(field){return e=>setForm(f=>({...f,[field]:e.target.value}))}
 async function run(action,success='Zapisano zmiany.',refresh=true){if(lock.current)return false;focusAfterOperation.current=document.activeElement;lock.current=true;setBusy(true);setError(null);setDependencies([]);setNotice(null)
 try {await action();if(refresh){const fresh=await contentApi.version(courseId,versionId);setData(d=>({...d,version:fresh}))}setNotice(success);return true}
 catch(e){setError(e.message);setDependencies(e.payload?.dependencies??[]);if(e.payload?.issues)setValidation({valid:false,issues:e.payload.issues});if(e.code==='stale_revision'){try{const fresh=await contentApi.version(courseId,versionId);setData(d=>({...d,version:fresh}));setNotice('Wersja została odświeżona. Sprawdź aktualne dane przed ponownym zapisem; wpisane pola zachowano.')}catch(refreshError){setError(`${e.message} ${refreshError.message}`)}}return false}
 finally{lock.current=false;setBusy(false)}}
 const mutate=(path,method,body)=>run(()=>contentApi.mutate(courseId,versionId,path,method,body))
 async function check(){await run(async()=>setValidation(await contentApi.validation(courseId,versionId)),null,false)}
 async function save(){await run(()=>contentApi.save(courseId,versionId,{...form,scope_id:form.scope_id?Number(form.scope_id):null,subject_id:form.subject_id?Number(form.subject_id):null}),'Zapisano draft.')}
 return <main className="courses-page page-width version-editor"><header className="courses-header"><p className="eyebrow">Wersja {version.number} · {stateLabels[version.state]}</p><h1 id="version-editor-title" tabIndex={-1}>Edytor wersji</h1><VersionIdentity version={version}/><Link className="text-link" to={`/kursy/podglad/${courseId}/wersje/${versionId}`}>Podgląd wersji</Link>{version.course_owner===user.id&&<Link className="text-link" to={`/kursy/moje/${courseId}`}>Zarządzanie kursem i plan godzinowy</Link>}</header>
 {error&&<div className="courses-alert" role="alert"><p>{error}</p>{dependencies.length>0&&<ul>{dependencies.map((d,i)=>{const nodes=flattenNodes(version.nodes);return <li key={i}>{nodes.find(n=>n.id===d.target_id)?.title??'Element'} ({d.target_id}) wymaga: {nodes.find(n=>n.id===d.source_id)?.title??'Element'} ({d.source_id}).</li>})}</ul>}</div>}<p role="status" aria-live="polite">{busy?'Trwa operacja…':notice}</p>
 <fieldset disabled={busy} className="editor-fieldset"><VersionActions version={version} run={(action,body={})=>mutate(`${action}/`,'POST',body)} check={check}/></fieldset><ValidationIssues result={validation}/>
 {!editable?<><p className="courses-banner">Ta wersja jest tylko do odczytu. {version.state==='submitted'?(version.course_owner===user.id?'Wycofaj zgłoszenie, aby wprowadzić zmiany.':'Zgłoszenie oczekuje na decyzję administratora.'):'Opublikowana treść jest niezmienna.'}</p><VersionContent version={version} courseId={courseId}/></>:<fieldset disabled={busy} className="editor-fieldset"><legend className="sr-only">Edycja draftu</legend><section className="course-section"><h2>Metadane wersji</h2><Field label="Tytuł wersji"><input value={form.title} maxLength={200} onChange={update('title')}/></Field><Field label="Opis wersji"><textarea value={form.description} onChange={update('description')}/></Field>{[['Zakres','scope_id',scopes,version.scope],['Przedmiot','subject_id',subjects,version.subject]].map(([label,key,options,current])=><Field key={key} label={label}><select value={form[key]} onChange={update(key)}><option value="">Nie wybrano</option>{current&&!current.is_active&&<option value={current.id} disabled>{current.name} (nieaktywny)</option>}{options.filter(o=>o.is_active).map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></Field>)}<Action onClick={save}>Zapisz draft</Action><p>Zapis draftu nie publikuje kursu ani nie wysyła go do akceptacji.</p></section>
 <HierarchyEditor nodes={version.nodes} mutate={mutate} upload={action=>run(action,'Plik przesłano. Zapisz materiał.',false)} courseId={courseId} versionId={versionId} busy={busy}/>
 <section className="course-section"><h2>Zasoby kursu</h2><Action onClick={()=>run(async()=>setLibrary(await contentApi.assets(courseId)),null,false)}>Pokaż zasoby i wykorzystanie limitu</Action>{library&&<><p>Wykorzystano {library.used_bytes} z {library.limit_bytes} bajtów.</p>{!library.assets.length&&<p>Brak przesłanych plików.</p>}<ul>{library.assets.map(a=><li key={a.id}>{a.original_name} — {a.size_bytes} B — ID: {a.id} · Odwołania: {a.reference_count}{a.can_delete&&<Action onClick={()=>run(async()=>{await contentApi.deleteAsset(courseId,a.id);setLibrary(await contentApi.assets(courseId))},'Usunięto nieużywany plik.',false)}>Usuń nieużywany plik {a.original_name}</Action>}</li>)}</ul></>}</section>
 </fieldset>}
 </main>
}
