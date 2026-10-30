import { useEffect, useRef, useState } from 'react'
import { Action,Field } from './EditorParts.jsx'
const blankQuestion=()=>({type:'single',text:'',options:[{text:'',is_correct:false},{text:'',is_correct:false}]})
export default function TestEditor({node,mutate}) {
 const [questions,setQuestions]=useState(node.test?.questions?.map(q=>({type:q.type,text:q.text,options:q.options.map(o=>({text:o.text,is_correct:Boolean(o.is_correct)}))}))??[])
 const addButton=useRef(null)
 useEffect(()=>{if(!node.test)setQuestions([])},[Boolean(node.test)])
 const issues=[]
 if(!questions.length)issues.push('Test nie ma pyta\u0144.')
 questions.forEach((q,i)=>{
  const prefix=`Pytanie ${i+1}: `
  if(!q.text.trim())issues.push(prefix+'podaj tre\u015b\u0107.')
  if(q.options.length<2)issues.push(prefix+'dodaj co najmniej dwie opcje.')
  q.options.forEach((o,j)=>{if(!o.text.trim())issues.push(prefix+`opcja ${j+1} jest pusta.`)})
  const correct=q.options.filter(o=>o.is_correct).length
  if(q.type==='single'&&correct!==1)issues.push(prefix+'single wymaga dok\u0142adnie jednej poprawnej opcji.')
  if(q.type==='multiple'&&!correct)issues.push(prefix+'zaznacz co najmniej jedn\u0105 poprawn\u0105 opcj\u0119.')
 })
 function change(i,data){setQuestions(q=>q.map((v,j)=>j===i?{...v,...data}:v))}
 function option(i,j,data){change(i,{options:questions[i].options.map((v,k)=>k===j?{...v,...data}:v)})}
 return <details className="test-editor" open><summary>Test: {node.title}</summary><p>Niekompletny test można zapisać jako draft. Publikacja wymaga pytania, co najmniej dwóch opcji i poprawnych odpowiedzi (jednej dla single).</p>
 {(node.test||questions.length>0)&&issues.length>0&&<div role="status" aria-live="polite"><p>Braki do publikacji:</p><ul>{issues.map((issue,i)=><li key={i}>{issue}</li>)}</ul></div>}
 {questions.map((q,i)=><fieldset key={i}><legend>Pytanie {i+1}</legend><Field label={`Treść pytania ${node.id}-${i+1}`}><textarea value={q.text} onChange={e=>change(i,{text:e.target.value})}/></Field><Field label={`Typ pytania ${node.id}-${i+1}`}><select value={q.type} onChange={e=>change(i,{type:e.target.value})}><option value="single">Jedna odpowiedź</option><option value="multiple">Wiele odpowiedzi</option></select></Field>
 {q.options.map((o,j)=><div className="test-option" key={j}><Field label={`Opcja ${node.id}-${i+1}-${j+1}`}><input value={o.text} onChange={e=>option(i,j,{text:e.target.value})}/></Field><label><input type="checkbox" checked={o.is_correct} onChange={e=>option(i,j,{is_correct:e.target.checked})}/> Poprawna opcja {i+1}.{j+1}</label><Action onClick={()=>change(i,{options:q.options.filter((_,k)=>k!==j)})}>Usuń opcję {i+1}.{j+1}</Action></div>)}
 <Action onClick={()=>change(i,{options:[...q.options,{text:'',is_correct:false}]})}>Dodaj opcję do pytania {node.id}-{i+1}</Action><Action onClick={()=>{setQuestions(q=>q.filter((_,j)=>i!==j));addButton.current?.focus()}}>Usuń pytanie {node.id}-{i+1}</Action></fieldset>)}
 <div className="course-actions"><Action ref={addButton} onClick={()=>setQuestions(q=>[...q,blankQuestion()])}>Dodaj pytanie {node.title}</Action><Action onClick={()=>mutate(`nodes/${node.id}/test/`,node.test?'PUT':'POST',{questions})}>Zapisz test {node.title}</Action>{node.test&&<Action onClick={()=>mutate(`nodes/${node.id}/test/`,'DELETE')}>Usuń test {node.title}</Action>}</div></details>
}
