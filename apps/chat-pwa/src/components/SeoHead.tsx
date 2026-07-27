import { useEffect } from 'react';

interface Props {
  title: string;
  description: string;
  path?: string;
}

const SITE_NAME = 'Blockmind';
const BASE_URL = 'https://blockmind.app';

export default function SeoHead({ title, description, path }: Props) {
  useEffect(() => {
    document.title = `${title} | ${SITE_NAME}`;

    const setMeta = (name: string, content: string) => {
      let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute('name', name);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    const setOg = (property: string, content: string) => {
      let el = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute('property', property);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    setMeta('description', description);
    setOg('og:title', `${title} | ${SITE_NAME}`);
    setOg('og:description', description);
    if (path) setOg('og:url', `${BASE_URL}${path}`);

    setMeta('twitter:title', `${title} | ${SITE_NAME}`);
    setMeta('twitter:description', description);

    return () => {
      document.title = `${SITE_NAME} — AI Blockchain Assistant`;
    };
  }, [title, description, path]);

  return null;
}
