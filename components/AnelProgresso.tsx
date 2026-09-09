export default function AnelProgresso({ percentual, tamanho = 40 }: { percentual: number; tamanho?: number }) {
  const raio = (tamanho - 6) / 2;
  const circunferencia = 2 * Math.PI * raio;
  const preenchido = (percentual / 100) * circunferencia;
  const meio = tamanho / 2;

  return (
    <svg width={tamanho} height={tamanho} className="anel-progresso" viewBox={`0 0 ${tamanho} ${tamanho}`}>
      <circle cx={meio} cy={meio} r={raio} fill="none" stroke="var(--borda)" strokeWidth="4" />
      {percentual > 0 && (
        <circle
          cx={meio}
          cy={meio}
          r={raio}
          fill="none"
          stroke="var(--azul-linha)"
          strokeWidth="4"
          strokeDasharray={`${preenchido} ${circunferencia}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${meio} ${meio})`}
        />
      )}
      <text x={meio} y={meio} textAnchor="middle" dominantBaseline="central" className="anel-progresso-texto">
        {Math.round(percentual)}%
      </text>
    </svg>
  );
}
