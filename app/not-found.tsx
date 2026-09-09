import Image from 'next/image';

export default function NaoEncontrado() {
  return (
    <div>
      <header className="topo">
        <a className="marca" href="/">
          <Image src="/logo-nexobim-topo.png" alt="NexoBIM" width={80} height={22} priority />
        </a>
      </header>

      <div className="envolucro" style={{ maxWidth: 480, paddingTop: 80, textAlign: 'center' }}>
        <span className="etiqueta">Erro 404</span>
        <h1 style={{ fontSize: 24, fontWeight: 600, margin: '0 0 12px' }}>Página não encontrada</h1>
        <p className="painel-legenda" style={{ marginBottom: 24 }}>
          O link pode ter mudado ou a página não existe mais.
        </p>
        <a className="botao" href="/">Voltar pra home</a>
      </div>
    </div>
  );
}
