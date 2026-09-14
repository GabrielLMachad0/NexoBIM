const COMECA_COM_URL = /^https?:\/\//;

// Planos e tarefas guardam texto livre que às vezes inclui links (PDF, gravação
// no Drive). Sem isso, o link aparece como texto puro — copiável, mas não clicável.
export function comLinksClicaveis(texto: string): React.ReactNode[] {
  return texto.split(/(https?:\/\/[^\s]+)/).map((trecho, i) =>
    COMECA_COM_URL.test(trecho) ? (
      <a key={i} href={trecho} target="_blank" rel="noreferrer">{trecho}</a>
    ) : (
      trecho
    )
  );
}
