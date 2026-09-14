import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          background: '#1a1a1c',
          backgroundImage:
            'linear-gradient(#3d3d41 1px, transparent 1px), linear-gradient(90deg, #3d3d41 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      >
        <div
          style={{
            fontSize: 30,
            fontWeight: 700,
            letterSpacing: '0.5px',
            color: '#05e0e0',
            marginBottom: 28,
          }}
        >
          NEXOBIM
        </div>
        <div
          style={{
            fontSize: 62,
            fontWeight: 700,
            color: '#f2f2f2',
            lineHeight: 1.15,
            maxWidth: 920,
          }}
        >
          Aprenda BIM do fundamento à execução do projeto
        </div>
        <div
          style={{
            marginTop: 32,
            fontSize: 28,
            color: '#a3a3a8',
            maxWidth: 860,
          }}
        >
          Cursos de Revit, Revit MEP e MicroDesk — vídeo aulas, tarefas e certificado por nível
        </div>
      </div>
    ),
    { ...size }
  );
}
