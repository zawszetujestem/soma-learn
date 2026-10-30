import { afterEach, expect, it, vi } from 'vitest'
import {screen,within,render} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {mockApi,renderApp,resetTestEnv,ok,fail,MENTOR,ADMIN,STUDENT,sessionAs,COURSE_PUBLIC,INSTANCE_OWN} from './helpers.jsx'
import {editorApi,editorPath,V,version,manage,lesson} from './version-fixtures.jsx'
afterEach(resetTestEnv)
it.each([MENTOR,ADMIN])('pokazuje Utwórz nowy zarządzającym',async user=>{mockApi({...sessionAs(user),'GET /api/courses/':ok([])});renderApp('/kursy');expect(await screen.findByRole('link',{name:'Utwórz nowy'})).toHaveAttribute('href','/kursy/moje/nowy')})
it('program publikacji bez materiałów',async()=>{mockApi({...sessionAs(STUDENT),'GET /api/instances/':ok([]),'GET /api/courses/1/':ok({...COURSE_PUBLIC,program:version.nodes})});renderApp('/kursy/1');expect(await screen.findByText('Lekcja pierwsza')).toBeInTheDocument();expect(screen.queryByRole('link',{name:'Utwórz nowy'})).not.toBeInTheDocument()})
