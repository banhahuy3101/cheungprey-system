export default function ReportHero({ title, subtitle, actions, variant = "default" }) {
  return (
    <header className={`report-hero report-hero-${variant}`}>
      <div className="report-hero-text">
        <h2 className="report-hero-title">{title}</h2>
        {subtitle && <p className="report-hero-sub">{subtitle}</p>}
      </div>
      {actions && <div className="report-hero-actions">{actions}</div>}
    </header>
  );
}
