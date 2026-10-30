import { useEffect,useState } from 'react'
import { contentApi } from './api.js'
import { ErrorMessage,LoadingMessage } from './StateViews.jsx'
export default function PrivateAsset({courseId,versionId,assetId,format,alt}) {
 const [state,setState]=useState({loading:true});const [attempt,setAttempt]=useState(0)
 useEffect(()=>{let active=true,url;setState({loading:true});contentApi.download(courseId,versionId,assetId).then(blob=>{if(active){url=URL.createObjectURL(blob);setState({url})}},error=>{if(active)setState({error})});return()=>{active=false;if(url)URL.revokeObjectURL(url)}},[courseId,versionId,assetId,attempt])
 if(state.loading)return <LoadingMessage>Ładowanie załącznika…</LoadingMessage>
 if(state.error)return <ErrorMessage onRetry={()=>setAttempt(a=>a+1)}>{state.error.message}</ErrorMessage>
 return format==='image'||format==='text_image'?<img className="private-image" src={state.url} alt={alt||'Załącznik'}/>:<a className="text-link" href={state.url} download="material.pdf">Pobierz PDF</a>
}
