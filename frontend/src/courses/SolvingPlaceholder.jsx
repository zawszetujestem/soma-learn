import {Field} from './EditorParts.jsx'

export default function SolvingPlaceholder() {
 return <div className="solving-placeholder"><span className="badge">W przygotowaniu</span><Field label="Sposób rozwiązania — W przygotowaniu"><textarea disabled placeholder="Rozwiązanie krok po kroku nie jest jeszcze dostępne."/></Field></div>
}
