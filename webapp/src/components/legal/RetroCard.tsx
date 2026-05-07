type RetroCardProps = {
    children: React.ReactNode;
    className?: string;
  };
  
  export function RetroCard({ children, className = '' }: RetroCardProps) {
    return (
      <div
        className={`border-4 border-border bg-card text-card-foreground shadow-[8px_8px_0_0_var(--border)] ${className}`}
      >
        {children}
      </div>
    );
  }