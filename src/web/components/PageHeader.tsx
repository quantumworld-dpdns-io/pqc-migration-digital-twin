import type { ReactNode } from 'react';

type PageHeaderProps = {
  kicker: string;
  title: string;
  description?: string;
  actions?: ReactNode;
};

export function PageHeader({ kicker, title, description, actions }: PageHeaderProps) {
  return (
    <header className="page-header mb-10 md:mb-12">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl space-y-3">
          <p className="kicker">{kicker}</p>
          <h1 className="page-title">{title}</h1>
          {description ? (
            <p className="text-sm leading-relaxed text-zinc-500 md:text-[15px]">{description}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-3 lg:justify-end">{actions}</div>
        ) : null}
      </div>
    </header>
  );
}
