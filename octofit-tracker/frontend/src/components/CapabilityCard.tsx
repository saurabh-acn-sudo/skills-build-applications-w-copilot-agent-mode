import { useEffect, useState, type ReactNode } from 'react';
import { getJson } from '../api/client.js';

type Props<T> = {
  title: string;
  description: string;
  path: string;
  dataKey: string;
  emptyText: string;
  renderItem: (item: T, index: number) => ReactNode;
};

export function CapabilityCard<T>({ title, description, path, dataKey, emptyText, renderItem }: Props<T>) {
  const [items, setItems] = useState<T[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setItems(null);
    setError(null);
    getJson<Record<string, T[]>>(path).then((result) => {
      if (active) setItems(result[dataKey] ?? []);
    }).catch((requestError: unknown) => {
      if (active) setError(requestError instanceof Error ? requestError.message : 'Unable to load data.');
    });
    return () => { active = false; };
  }, [dataKey, path]);

  return (
    <section className="card h-100">
      <div className="card-body">
        <h2 className="h4">{title}</h2>
        <p>{description}</p>
        {error ? <p role="alert">Unable to load {title.toLowerCase()}: {error}</p>
          : items === null ? <p role="status">Loading {title.toLowerCase()}...</p>
            : items.length === 0 ? <p>{emptyText}</p>
              : <ul>{items.map((item, index) => <li key={index}>{renderItem(item, index)}</li>)}</ul>}
      </div>
    </section>
  );
}
