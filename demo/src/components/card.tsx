import React from 'react';

// Demo 5: PropsWithChildren pattern (needs explicit children in interface)
interface CardProps {
  title: string;
  className?: string;
}

function Card({ children, title, className }: React.PropsWithChildren<CardProps>) {
  return (
    <div className={`card ${className || ''}`}>
      <h3 className="card-title">{title}</h3>
      <div className="card-body">{children}</div>
    </div>
  );
}

// Demo 6: Another PropsWithChildren usage
interface LayoutProps {
  sidebar?: React.ReactNode;
}

function Layout({ children, sidebar }: React.PropsWithChildren<LayoutProps>) {
  return (
    <div className="layout">
      {sidebar && <aside className="sidebar">{sidebar}</aside>}
      <main className="content">{children}</main>
    </div>
  );
}

export { Card, Layout };
