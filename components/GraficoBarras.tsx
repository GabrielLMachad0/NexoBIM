type Ponto = { rotulo: string; valor: number };

// Gráfico de barras simples em SVG — sem biblioteca externa, só o suficiente
// pra mostrar evolução mês a mês (cadastros, certificados etc.).
export default function GraficoBarras({ pontos }: { pontos: Ponto[] }) {
  const maximo = Math.max(1, ...pontos.map((p) => p.valor));
  const largura = 100 / pontos.length;

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 140, marginTop: 8 }}>
      {pontos.map((p, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
          <span style={{ fontSize: 11, color: 'var(--texto-suave)' }}>{p.valor}</span>
          <div
            style={{
              width: '100%',
              maxWidth: 36,
              minHeight: p.valor > 0 ? 3 : 0,
              height: `${(p.valor / maximo) * 100}%`,
              background: 'var(--azul-linha)',
              borderRadius: '2px 2px 0 0',
            }}
          />
          <span style={{ fontSize: 11, color: 'var(--texto-suave)', whiteSpace: 'nowrap' }}>{p.rotulo}</span>
        </div>
      ))}
    </div>
  );
}
