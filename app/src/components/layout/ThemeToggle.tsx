import { useStore } from '../../store';

export default function ThemeToggle() {
  const theme = useStore((s) => s.settings.theme);
  const updateSettings = useStore((s) => s.updateSettings);

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    updateSettings({ theme: next });
    document.documentElement.setAttribute('data-theme', next);
  };

  return (
    <button
      className="theme-toggle-global"
      onClick={toggle}
      title="Toggle theme"
    >
      {theme === 'dark' ? '\u2600\uFE0F' : '\uD83C\uDF19'}
    </button>
  );
}
