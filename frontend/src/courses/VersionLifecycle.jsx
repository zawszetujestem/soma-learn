import {useState} from 'react'
import {Link,useNavigate} from 'react-router-dom'
import {contentApi} from './api.js'
import {Action,stateLabels} from './EditorParts.jsx'
import {visibilityLabels} from './format.js'
import {useCurrentUser} from './RequireAuth.jsx'
import {canManageCourse,canManageVersion,canPublishVersion} from './managementPolicy.js'
export function VersionActions({version,course,run,check,menu=false}) {
 const user=useCurrentUser();const [reason,setReason]=useState('');const editable=['draft','rejected'].includes(version.state)
 const owner=version.course_owner===user.id
 const admin=user.roles.includes('admin')
 const publicCourse=version.course_visibility==='public'
 const manageable=canManageVersion(user,version,course)
 const canSubmit=manageable&&owner&&publicCourse&&!admin
 const canPublish=canPublishVersion(user,version,course)
 const canModerate=admin&&!owner&&publicCourse&&version.state==='submitted'
 const actionProps=menu?{role:'menuitem'}:{}
 return <section className="course-section" aria-label="Cykl życia wersji"><p>Wersja {version.number} · {stateLabels[version.state]}</p>{version.rejection_reason&&<p>Powód odrzucenia: {version.rejection_reason}</p>}<div className="course-actions"><Action {...actionProps} onClick={check}>Sprawdź poprawność</Action>{editable&&canPublish&&<Action {...actionProps} onClick={()=>run('publish')}>Opublikuj</Action>}{editable&&canSubmit&&<Action {...actionProps} onClick={()=>run('submit')}>Wyślij do akceptacji</Action>}{version.state==='submitted'&&canSubmit&&<Action {...actionProps} onClick={()=>run('withdraw')}>Wycofaj</Action>}{canModerate&&<><Action {...actionProps} onClick={()=>run('accept')}>Akceptuj</Action><Action {...actionProps} onClick={()=>run('reject',{reason})}>Odrzuć</Action></>}</div>{canModerate&&<label className="field">Powód odrzucenia (opcjonalny)<textarea value={reason} onChange={e=>setReason(e.target.value)}/></label>}</section>
}
export function ValidationIssues({result}) {return result&&<section aria-live="polite"><h2>Wynik walidacji</h2>{result.valid?<p>Wersja jest gotowa do publikacji.</p>:<ul>{result.issues?.map((issue,i)=><li key={i}>{issue.path}: {issue.message}</li>)}</ul>}</section>}
export function VersionManagementLinks({course,onError}) {
 const user=useCurrentUser();const manageable=canManageCourse(user,course)
 const navigate=useNavigate();const [busy,setBusy]=useState(false)
 const working=course.working_version;const published=course.current_published_version
 const idOf=v=>typeof v==='object'?v?.id:v
 async function create(){setBusy(true);try{const v=await contentApi.createVersion(course.id);navigate(`/kursy/moje/${course.id}/wersje/${v.id}/edytuj`)}catch(error){onError(error)}finally{setBusy(false)}}
 return <div className="course-actions">{manageable&&working&&<Link className="button button-secondary" to={`/kursy/moje/${course.id}/wersje/${idOf(working)}/edytuj`}>Otwórz wersję roboczą</Link>}{manageable&&!working&&published&&<Action disabled={busy} onClick={create}>Utwórz nową wersję</Action>}{published&&<Link className="text-link" to={`/kursy/podglad/${course.id}/wersje/${idOf(published)}`}>Podgląd publikacji</Link>}{!manageable&&course.versions?.filter(version=>version.id!==idOf(published)).map(version=><Link key={version.id} className="text-link" to={`/kursy/podglad/${course.id}/wersje/${version.id}`}>Podgląd wersji {version.number}</Link>)}</div>
}

export function VersionIdentity({version}) {
 return <><p>{visibilityLabels[version.course_visibility]}{version.course_is_active===false?' \u00b7 nieaktywny':''}</p><p>{[version.scope?.name,version.subject?.name].filter(Boolean).join(' / ')||'Nie wybrano klasyfikacji.'}</p></>
}
