import './globals.css';
import ChatBot from '../components/ChatBot';

export const metadata = {
  title: 'NexoBIM — cursos de BIM, Revit e MEP',
  description: 'Vídeo aulas, planos de estudo e certificação por nível em BIM, Revit e MEP.',
};

export const viewport = {
  themeColor: '#1a1a1c',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <ChatBot />
      </body>
    </html>
  );
}
