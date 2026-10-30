import { ok, sessionAs, MENTOR } from './helpers.jsx'
export const V='/api/courses/1/versions/2/'
export const lesson={id:13,kind:'lesson',title:'Lekcja pierwsza',children:[],theory:[],practice:[],test:null,prerequisite:null}
export const version={id:2,course:1,course_owner:2,course_visibility:'public',course_is_active:true,number:2,state:'draft',revision:1,title:'Wersja robocza',description:'Opis',scope:null,subject:null,nodes:[{id:11,kind:'section',title:'Dział pierwszy',children:[{id:12,kind:'topic',title:'Temat pierwszy',children:[lesson]}]}]}
export const manage={id:1,owner:2,visibility:'public',is_active:true,working_version:version,current_published_version:null,tasks:[]}
export function editorApi(extra={}, user=MENTOR, v=version) {return {...sessionAs(user),'GET /api/courses/mine/1/':ok(manage), [`GET ${V}`]:{...ok(v),headers:{ETag:'"v2-r1"'}},'GET /api/course-scopes/':ok([{id:1,name:'Podstawowy',is_active:true}]),'GET /api/course-subjects/':ok([{id:2,name:'Matematyka',is_active:true}]), ...extra}}
export const editorPath='/kursy/moje/1/wersje/2/edytuj'
