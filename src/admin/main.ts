import { mount } from 'svelte';
import App from './App.svelte';
import { adminLanguage, ensureAdminLocaleLoaded, t } from './i18n';
import { startSitePresence } from './site_presence';
import { mountAdminUpdatePanel } from './update_panel';
import '../ui/cryptic/dashboard_chrome';
import './admin.css';

startSitePresence();

// Admin SPA entry. Loads the active locale before the first localized paint,
// then mounts the Svelte app into #app. The CR update panel lives outside the
// Svelte tree and self-mounts when its host exists.
async function boot(): Promise<void> {
  await ensureAdminLocaleLoaded(adminLanguage());
  document.title = t('app.title');
  const target = document.getElementById('app');
  if (!target) throw new Error('missing #app mount target');
  mount(App, { target });
  mountAdminUpdatePanel();
}

void boot();
