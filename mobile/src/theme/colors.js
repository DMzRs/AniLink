// DESIGN.md — exact palette, no generic defaults
export const colors = {
  forestGreen: '#2E5339',        // primary — ag, nav, headers, Ready/Delivered
  forestGreenSoft: '#4A7C59',   // Confirmed
  forestGreenLight: '#E8F0E9',  // wash for backgrounds
  harvestGold: '#D4A017',        // accent — CTAs, badges, Pending
  harvestGoldLight: '#FFF4D6',  // wash
  harvestGoldDark: '#8A6A0A',
  neutralBg: '#FAF8F3',          // warm-neutral, not cream as dominant
  white: '#FFFFFF',
  textPrimary: '#1A1A1A',        // near-black, never pure black
  textSecondary: '#5C5C5C',
  textMuted: '#8A8A8A',
  border: '#E8E2D6',
  borderLight: '#F0EDE6',
  // status per DESIGN.md
  status: {
    pending: '#D4A017',
    confirmed: '#4A7C59',
    ready: '#2E5339',
    delivered: '#2E5339',
    cancelled: '#B0413E',
  },
  shadow: 'rgba(46, 83, 57, 0.08)',
  shadowStrong: 'rgba(46, 83, 57, 0.14)',
};

export const statusColor = (status) => {
  if (!status) return colors.border;
  const s = status.toLowerCase();
  if (s === 'pending') return colors.status.pending;
  if (s === 'confirmed') return colors.status.confirmed;
  if (s === 'preparing') return colors.status.confirmed;
  if (s === 'ready' || s === 'delivered' || s === 'completed') return colors.status.ready;
  if (s === 'cancelled') return colors.status.cancelled;
  return colors.textMuted;
};
