// Estado de carregamento mostrado no lugar do "Carregando..." — dá uma pista
// visual de como o conteúdo vai se organizar em vez de só um texto solto.
export default function Esqueleto({ linhas = 3 }: { linhas?: number }) {
  return (
    <div className="envolucro">
      <div className="esqueleto-bloco esqueleto-titulo" />
      {Array.from({ length: linhas }).map((_, i) => (
        <div className="painel" key={i}>
          <div className="esqueleto-bloco" style={{ width: '40%' }} />
          <div className="esqueleto-bloco" style={{ width: '70%' }} />
        </div>
      ))}
    </div>
  );
}
