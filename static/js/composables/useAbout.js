const { ref, inject } = Vue;
import { useContentResource } from './useContentResource.js';
import { paths } from '../config/routes.js';
import { t } from '../i18n.js';

export function useAbout() {
  const siteConfig = inject('siteConfig', ref({ social: {} }));

  // Title falls back to the localized "About" label when the page omits one.
  // useContentResource derives this as a computed (exposed as pageTitle) that
  // drives both the tab title and the header, so the fallback follows a UI-
  // language switch and there is no separate displayTitle to keep in sync.
  const { pageData, pageTitle, loading, error, fetchData: load } =
    useContentResource((data) => data?.title || t('menu.about'));

  const fetchData = (path = paths.about()) => load(path);

  return { pageData, pageTitle, loading, error, siteConfig, fetchData };
}
