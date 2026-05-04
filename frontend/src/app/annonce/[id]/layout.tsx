type LayoutProps = {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
};

export default function AnnonceLayout({ children }: LayoutProps) {
  return children;
}
