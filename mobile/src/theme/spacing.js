export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 20,
  xl: 28,
  xxl: 36,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
};

export const shadow = {
  card: {
    // react-native-web prefers boxShadow; keep native props for mobile
    boxShadow: '0px 4px 12px rgba(46, 83, 57, 0.08)',
    shadowColor: '#2E5339',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
  cardPressed: {
    boxShadow: '0px 6px 16px rgba(46, 83, 57, 0.12)',
    shadowColor: '#2E5339',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
};
