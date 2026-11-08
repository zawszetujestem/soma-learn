import {screen} from '@testing-library/react'
export async function closeEditor(u) {
 while(screen.queryByRole('dialog')){
  await u.keyboard('{Escape}')
  const preserve=screen.queryByRole('button',{name:'Zamknij i zachowaj szkic'})
  if(preserve)await u.click(preserve)
 }
}
export async function choose(u,name) {
 await closeEditor(u)
 await u.click(await screen.findByRole('button',{name}))
}
export async function settings(u) {
 await closeEditor(u)
 await u.click(await screen.findByRole('button',{name:'Menu edytora kursu'}))
 await u.click(screen.getByRole('menuitem',{name:'Ustawienia wersji'}))
}
export async function versionMenu(u) {await closeEditor(u);await u.click(await screen.findByRole('button',{name:'Menu wersji'}))}
export async function nodeMenu(u,title) {await closeEditor(u);await u.click(await screen.findByRole('button',{name:`Akcje ${title}`}))}
