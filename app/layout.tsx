import './globals.css';
import ChatBot from '../components/ChatBot';

const SITE_URL = 'https://nexobimbr.vercel.app';
const TITULO = 'NexoBIM — cursos de BIM, Revit e MEP';
const DESCRICAO = 'Vídeo aulas, planos de estudo e certificação por nível em BIM, Revit e MEP.';

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITULO,
  description: DESCRICAO,
  openGraph: {
    title: TITULO,
    description: DESCRICAO,
    url: SITE_URL,
    siteName: 'NexoBIM',
    locale: 'pt_BR',
    type: 'website',
    images: ['/logo-nexobim-preto.png'],
  },
  twitter: {
    card: 'summary',
    title: TITULO,
    description: DESCRICAO,
    images: ['/logo-nexobim-preto.png'],
  },
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
