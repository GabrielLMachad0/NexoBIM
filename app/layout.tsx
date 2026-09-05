import './globals.css';

export const metadata = {
  title: 'NexoBIM — cursos de BIM, Revit e MEP',
  description: 'Vídeo aulas, planos de estudo e certificação por nível em BIM, Revit e MEP.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
