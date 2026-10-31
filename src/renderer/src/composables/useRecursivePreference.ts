import { useAppSettings } from './useAppSettings';

export const useRecursivePreference = () => {
  const { recursiveSubdirectories, setRecursiveSubdirectories, ensureSettingsLoaded } =
    useAppSettings();

  return {
    recursiveSubdirectories,
    ensureSettingsLoaded,
    setRecursiveSubdirectories
  };
};
