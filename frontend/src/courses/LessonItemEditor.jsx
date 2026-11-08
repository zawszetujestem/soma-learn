import {useEffect,useState} from 'react'
import {contentApi} from './api.js'
import {Action,Field} from './EditorParts.jsx'
import {MaterialContent} from './VersionContent.jsx'
import {safeVideo} from './SafeMarkdown.jsx'
import SolvingPlaceholder from './SolvingPlaceholder.jsx'
import {entryButtonId,nodeEntry} from './HierarchyWorkspace.jsx'
import {EditorMenu,EditorModal} from './EditorOverlay.jsx'
const formats={theory:{markdown:'Tekst Markdown',pdf:'PDF',image:'Obraz',video:'Link wideo'},practice:{text:'Tekst',text_image:'Tekst i obraz',pdf:'PDF',image:'Obraz'}}
function ItemForm({lessonId,category,item,onSave,courseId,versionId,upload}) {
 const [form,setForm]=useState({format:item?.format??(category==='theory'?'markdown':'text'),text:item?.text??'',image_alt:item?.image_alt??'',video_url:item?.video_url??'',answer_mode:item?.answer_mode??'open',answer_text:item?.answer_text??'',asset_id:item?.asset_id??item?.asset?.id??item?.asset??null})
 const [error,setError]=useState(null);const [uploading,setUploading]=useState(false);const [fileKey,setFileKey]=useState(0)
 const fileFormat=['image','text_image','pdf'].includes(form.format)
 const id=`${item?.id??'nowy'}-${lessonId}-${category}`
 function field(key){return e=>setForm(f=>({...f,[key]:e.target.value}))}
 async function file(e){const f=e.target.files?.[0];if(!f)return;setError(null);const max=form.format==='pdf'?20000000:5000000
 if(f.size>max){setError(`Plik przekracza limit ${max/1000000} MB.`);return}
 setUploading(true);await upload(async()=>{const asset=await contentApi.upload(courseId,versionId,f);setForm(old=>({...old,asset_id:asset.id}));return asset});setUploading(false)
 }
 async function save(){setError(null)
 if(['markdown','text','text_image'].includes(form.format)&&!form.text.trim()){setError('Podaj treść materiału.');return}
 if(fileFormat&&!form.asset_id){setError('Wybierz i prześlij plik.');return}
 if(['image','text_image'].includes(form.format)&&!form.image_alt.trim()){setError('Podaj opis alternatywny obrazu.');return}
 if(form.format==='video'&&!safeVideo(form.video_url)){setError('Podaj link HTTPS do YouTube lub Vimeo.');return}
 if(category==='practice'&&form.answer_mode==='keyed'&&!form.answer_text.trim()){setError('Podaj poprawną odpowiedź.');return}
 const data={category,format:form.format,text:['markdown','text','text_image'].includes(form.format)?form.text:'',asset_id:fileFormat?form.asset_id:null,image_alt:['image','text_image'].includes(form.format)?form.image_alt:'',video_url:form.format==='video'?form.video_url:''}
 if(category==='practice'){data.answer_mode=form.answer_mode;data.answer_text=form.answer_mode==='keyed'?form.answer_text:null}
 const success=await onSave(data)
 if(success&&!item){setForm({format:category==='theory'?'markdown':'text',text:'',image_alt:'',video_url:'',answer_mode:'open',answer_text:'',asset_id:null});setFileKey(k=>k+1)}
 }
 return <form className="item-form" data-draft-scope onSubmit={e=>{e.preventDefault();save()}}><Field label={`Format materiału ${id}`}><select value={form.format} onChange={e=>{field('format')(e);setForm(f=>({...f,asset_id:null}));setFileKey(k=>k+1)}}>{Object.entries(formats[category]).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></Field>
 {['markdown','text','text_image'].includes(form.format)&&<Field label={item?`Treść materiału ${item.id}`:`Treść nowego materiału ${lessonId} ${category}`}><textarea value={form.text} onChange={field('text')}/></Field>}
 {form.format==='video'&&<Field label={`Link wideo ${id}`}><input type="url" value={form.video_url} onChange={field('video_url')}/></Field>}
 {fileFormat&&<><Field label={`Plik ${id}`}><input key={fileKey} type="file" accept={form.format==='pdf'?'application/pdf':'.jpg,.jpeg,.png,.webp'} onChange={file} disabled={uploading}/></Field><Field label={`ID przesłanego zasobu ${id}`}><input value={form.asset_id??''} onChange={field('asset_id')}/></Field><p>{uploading?'Przesyłanie pliku…':'Upload nie dodaje materiału — zapisz go osobno.'}</p></>}
 {['image','text_image'].includes(form.format)&&<Field label={`Opis alternatywny ${id}`}><input value={form.image_alt} onChange={field('image_alt')}/></Field>}
 {category==='practice'&&<><Field label={`Sposób odpowiedzi ${id}`}><select value={form.answer_mode} onChange={e=>{field('answer_mode')(e);if(e.target.value==='open')setForm(f=>({...f,answer_text:''}))}}><option value="open">Otwarte</option><option value="keyed">Z kluczem odpowiedzi</option></select></Field>{form.answer_mode==='keyed'&&<Field label={`Poprawna odpowiedź ${id}`}><textarea value={form.answer_text} onChange={field('answer_text')}/></Field>}</>}
 {error&&<p role="alert" className="courses-error">{error}</p>}<Action type="submit" disabled={uploading}>{item?`Zapisz materiał ${item.id}`:category==='theory'?'Dodaj teorię':'Dodaj praktykę'}</Action></form>
}
export function AddMaterialModal({open,onClose,category,node,courseId,versionId,mutate,upload}) {
 const [selected,setSelected]=useState('theory')
 useEffect(()=>{if(open)setSelected(category??'theory')},[open,category])
 return <EditorModal open={open} onClose={onClose} title="Nowy materiał"><p>W lekcji: {node.title}</p><div className="course-actions" role="group" aria-label="Rodzaj materiału">{['theory','practice'].map(value=><Action key={value} aria-pressed={selected===value} onClick={()=>setSelected(value)}>{value==='theory'?'Teoria':'Praktyka'}</Action>)}</div>
 {['theory','practice'].map(value=><div key={value} hidden={selected!==value}><ItemForm lessonId={node.id} category={value} courseId={courseId} versionId={versionId} upload={upload} onSave={data=>mutate(`lessons/${node.id}/items/`,'POST',data)}/></div>)}
 </EditorModal>
}
export default function LessonItemEditor({node,courseId,versionId,mutate,upload,selectedPractice,selectedTheory,board=false,onDelete,onAdd}) {
 const selectedItem=selectedPractice??selectedTheory
 return <div className="lesson-items">
  {selectedPractice&&<h3>Zadanie {node.practice.findIndex(item=>item.id===selectedPractice.id)+1}: {node.title}</h3>}
  <p>Limity: PDF do 20 MB, JPG/PNG/WebP do 5 MB; 20 załączników na lekcję; 1 GB na kurs (wszystkie wersje i nieużywane uploady).</p>
  {['theory','practice'].map(category=><section key={category} hidden={!!selectedItem&&category!==(selectedPractice?'practice':'theory')} aria-label={`${category==='theory'?'Teoria':'Praktyka'}: ${node.title}`}>
   <h4>{category==='theory'?'Teoria':'Praktyka'}</h4>
   {category==='practice'&&<SolvingPlaceholder/>}
   {!node[category]?.length&&!selectedPractice&&<p>Brak materiałów.</p>}
   {(node[category]||[]).map((item,i,items)=>{
    const prefix=`material-${node.id}-${category}-${item.id}`
    const actions=<><Action role={board?'menuitem':undefined} id={`${prefix}-up`} data-focus-fallback={`${prefix}-down`} disabled={i===0} onClick={()=>mutate(`lessons/${node.id}/items/${item.id}/move/`,'POST',{direction:'up'})}>Góra materiał {item.id}</Action>
      <Action role={board?'menuitem':undefined} id={`${prefix}-down`} data-focus-fallback={`${prefix}-up`} disabled={i===items.length-1} onClick={()=>mutate(`lessons/${node.id}/items/${item.id}/move/`,'POST',{direction:'down'})}>Dół materiał {item.id}</Action>
      <Action role={board?'menuitem':undefined} data-focus-fallback={entryButtonId(nodeEntry(node.id))} onClick={()=>board?onDelete({title:`materiał ${item.id}`,item,path:`lessons/${node.id}/items/${item.id}/`}):mutate(`lessons/${node.id}/items/${item.id}/`,'DELETE')}>Usuń materiał {item.id}</Action></>
    return <details key={item.id} hidden={!!selectedItem&&item.id!==selectedItem.id} open={selectedItem?.id===item.id?true:undefined}>
     <summary>Materiał {i+1}: {item.format}</summary>
     <MaterialContent item={item} courseId={courseId} versionId={versionId}/>
     <ItemForm lessonId={node.id} category={category} item={item} courseId={courseId} versionId={versionId} upload={upload} onSave={data=>{const {category:_,...changes}=data;return mutate(`lessons/${node.id}/items/${item.id}/`,'PATCH',changes)}}/>
     <div className="course-actions">
      {board?<EditorMenu label={`Akcje materiał ${item.id}`}>{actions}</EditorMenu>:actions}
     </div>
    </details>
   })}
   <div hidden={!!selectedItem}><Action onClick={()=>onAdd(category)}>{category==='theory'?'Dodaj teorię':'Dodaj praktykę'}</Action></div>
  </section>)}
 </div>
}
