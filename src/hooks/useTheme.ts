import { useThemeStore } from '../store/themeStore';
import { Colors, LightColors } from '../constants/colors';

export const useTheme = () => {
  const { theme } = useThemeStore();
  return theme === 'light' ? LightColors : Colors;
};
