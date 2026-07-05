export default function FinanceHero({ title, subtitle, actions, variant = "default" }) {
  return (
    <header className={`fms-hero fms-hero-${variant}`}>
      <div className="fms-hero-text">
        <h2 className="fms-hero-title">{title}</h2>
        {subtitle && <p className="fms-hero-sub">{subtitle}</p>}
      </div>
      {actions && <div className="fms-hero-actions">{actions}</div>}
    </header>
  );
}
