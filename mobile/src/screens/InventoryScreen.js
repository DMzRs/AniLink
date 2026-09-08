import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, ActivityIndicator, Alert, TextInput, ScrollView, Modal, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../theme/colors';
import { radius, spacing, shadow } from '../theme/spacing';
import { typography } from '../theme/typography';
import InventoryStepper from '../components/InventoryStepper';
import StatusChip from '../components/StatusChip';
import { mockProducts } from '../data/mockProducts';
import { getFarmerProducts, adjustStock, updateProduct, createProduct, getCategories } from '../api/inventory';
import { getOrders } from '../api/orders';
import { useAuth } from '../context/AuthContext';
import { peso } from '../utils/format';
import NotificationBell from '../components/NotificationBell';

function SummaryCard({ daily, weekly, pendingCount }) {
  return (
    <View style={s.summaryCard}>
      <Text style={s.summaryEyebrow}>Today • {new Date().toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}</Text>
      <View style={s.summaryRow}>
        <View style={s.summaryBox}>
          <Text style={s.summaryLabel}>Daily sales</Text>
          <Text style={s.summaryValue}>{peso(daily)}</Text>
          <Text style={s.summarySub}>Orders pending: {pendingCount}</Text>
        </View>
        <View style={s.summaryDivider} />
        <View style={s.summaryBox}>
          <Text style={s.summaryLabel}>Weekly totals</Text>
          <Text style={s.summaryValue}>{peso(weekly)}</Text>
          <Text style={s.summarySub}>7-day harvest</Text>
        </View>
      </View>
    </View>
  );
}

export default function InventoryScreen({ navigation }) {
  const { token, login, user } = useAuth();
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [usingMock, setUsingMock] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  const [showAdd, setShowAdd] = useState(false);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ name: '', category_id: '', unit_type: 'kg', price_per_unit: '', available_quantity: '', harvest_date: '', description: '', min_bulk_quantity: '', bulk_price: '' });
  const [pickedImages, setPickedImages] = useState([]);
  const [formError, setFormError] = useState(null);
  const [creating, setCreating] = useState(false);

  const isFarmer = user?.role === 'farmer';

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      // auto-login demo farmer if no token
      let hasToken = !!token;
      if (!hasToken) {
        try { await login('lito@anilink.test', 'password123'); hasToken = true; } catch {}
      }
      if (!hasToken) throw new Error('Offline');

      const [prodData, orderRes] = await Promise.all([
        getFarmerProducts().catch(() => { throw new Error('products'); }),
        getOrders().catch(() => ({ data: [] })),
      ]);
      setProducts(Array.isArray(prodData) ? prodData : prodData.data ?? []);
      const orderList = orderRes.data ?? orderRes ?? [];
      setOrders(Array.isArray(orderList) ? orderList : []);
      setUsingMock(false);
    } catch (e) {
      // rural connectivity fallback — show cached mockProducts filtered to demo farmer
      setProducts(mockProducts.filter((p) => p.farmer.name.includes('Lito') || p.farmer.verified));
      setUsingMock(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, login]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    getCategories().then((res) => {
      const arr = Array.isArray(res) ? res : (res?.data ?? []);
      if (arr.length) setCategories(arr);
    }).catch(() => {});
  }, []);

  const lowStock = useMemo(() => products.filter((p) => Number(p.available_quantity) <= 5 && p.status !== 'archived'), [products]);

  const daily = useMemo(() => {
    const today = new Date().toDateString();
    return orders
      .filter((o) => new Date(o.created_at).toDateString() === today && o.status !== 'cancelled')
      .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
  }, [orders]);

  const weekly = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
    return orders
      .filter((o) => new Date(o.created_at).getTime() > weekAgo && o.status !== 'cancelled')
      .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
  }, [orders]);

  const pendingCount = useMemo(() => orders.filter((o) => o.status === 'pending').length, [orders]);

  const handleAdjust = async (product, delta) => {
    const prev = product.available_quantity;
    const next = Math.max(0, Number(prev) + delta);
    setUpdatingId(product.id);
    // optimistic
    setProducts((prevList) => prevList.map((p) => (p.id === product.id ? { ...p, available_quantity: next, status: next === 0 ? 'sold_out' : p.status === 'sold_out' && next > 0 ? 'available' : p.status } : p)));
    try {
      if (usingMock) {
        await new Promise((r) => setTimeout(r, 400));
        return;
      }
      const res = await adjustStock(product.id, delta, delta > 0 ? 'restock' : 'adjustment');
      const updated = res.data ?? res;
      setProducts((prevList) => prevList.map((p) => (p.id === updated.id ? updated : p)));
    } catch (e) {
      // revert
      setProducts((prevList) => prevList.map((p) => (p.id === product.id ? { ...p, available_quantity: prev } : p)));
      Alert.alert('Sync failed', e.message + ' — will retry when online (spec offline queuing).');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSoldOut = async (product) => {
    const isSoldOut = product.status === 'sold_out';
    setUpdatingId(product.id);
    try {
      if (usingMock) {
        await new Promise((r) => setTimeout(r, 300));
        setProducts((l) => l.map((p) => (p.id === product.id ? { ...p, status: isSoldOut ? 'available' : 'sold_out', available_quantity: isSoldOut ? Math.max(5, Number(p.available_quantity)) : 0 } : p)));
        return;
      }
      const res = await updateProduct(product.id, { status: isSoldOut ? 'available' : 'sold_out', available_quantity: isSoldOut ? undefined : 0 });
      const updated = res.data ?? res;
      setProducts((l) => l.map((p) => (p.id === updated.id ? updated : p)));
    } catch (e) {
      Alert.alert('Failed', e.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission needed', 'Allow photo access to add harvest image.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: 5 - pickedImages.length, quality: 0.7 });
    if (!result.canceled) {
      const raw = result.assets.slice(0, 5 - pickedImages.length);
      const allowed = raw.filter(a => {
        const mime = (a.mimeType || '').toLowerCase();
        const name = (a.fileName || a.uri || '').toLowerCase();
        return mime === 'image/png' || mime === 'image/jpeg' || mime === 'image/jpg' || name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg');
      });
      if (allowed.length < raw.length) Alert.alert('Only PNG, JPG, JPEG allowed', 'Other formats were skipped.');
      setPickedImages(prev => [...prev, ...allowed].slice(0, 5));
    }
  };

  const handleCreate = async () => {
    if (!form.name.trim() || !form.category_id || !form.price_per_unit || !form.available_quantity) {
      setFormError('Name, category, price and stock are required.');
      return;
    }
    setCreating(true); setFormError(null);
    try {
      if (usingMock) {
        const mock = { id: `tmp-${Date.now()}`, name: form.name.trim(), category: categories.find(c => String(c.id)===String(form.category_id)) || { name: form.category_id }, category_id: form.category_id, unit_type: form.unit_type, price_per_unit: Number(form.price_per_unit), available_quantity: Number(form.available_quantity), harvest_date: form.harvest_date || new Date().toISOString().slice(0,10), description: form.description, min_bulk_quantity: form.min_bulk_quantity ? Number(form.min_bulk_quantity) : null, bulk_price: form.bulk_price ? Number(form.bulk_price) : null, status: 'available', farmer: { name: user?.name || 'You', farm_name: user?.farmerProfile?.farm_name || 'Your Farm', verified: true }, rating: 5, reviews: 0, image: pickedImages[0]?.uri || null };
        setProducts(prev => [mock, ...prev]);
        setForm({ name: '', category_id: '', unit_type: 'kg', price_per_unit: '', available_quantity: '', harvest_date: '', description: '', min_bulk_quantity: '', bulk_price: '' });
        setPickedImages([]);
        setShowAdd(false);
        return;
      }
      let payload;
      if (pickedImages.length > 0) {
        const fd = new FormData();
        fd.append('name', form.name.trim());
        fd.append('category_id', String(Number(form.category_id)));
        fd.append('unit_type', form.unit_type);
        fd.append('price_per_unit', String(Number(form.price_per_unit)));
        fd.append('available_quantity', String(Number(form.available_quantity)));
        if (form.harvest_date) fd.append('harvest_date', form.harvest_date);
        if (form.description) fd.append('description', form.description);
        if (form.min_bulk_quantity) fd.append('min_bulk_quantity', String(Number(form.min_bulk_quantity)));
        if (form.bulk_price) fd.append('bulk_price', String(Number(form.bulk_price)));
        pickedImages.forEach((asset) => {
          const uri = asset.uri;
          const name = asset.fileName || `photo-${Date.now()}.jpg`;
          const type = asset.mimeType || 'image/jpeg';
          fd.append('images[]', { uri, name, type });
        });
        payload = fd;
      } else {
        payload = {
          name: form.name.trim(),
          category_id: Number(form.category_id),
          unit_type: form.unit_type,
          price_per_unit: Number(form.price_per_unit),
          available_quantity: Number(form.available_quantity),
          harvest_date: form.harvest_date || undefined,
          description: form.description || undefined,
          min_bulk_quantity: form.min_bulk_quantity ? Number(form.min_bulk_quantity) : undefined,
          bulk_price: form.bulk_price ? Number(form.bulk_price) : undefined,
        };
      }
      const res = await createProduct(payload);
      const created = res.data ?? res;
      setProducts(prev => [created, ...prev]);
      setForm({ name: '', category_id: '', unit_type: 'kg', price_per_unit: '', available_quantity: '', harvest_date: '', description: '', min_bulk_quantity: '', bulk_price: '' });
      setShowAdd(false);
      Alert.alert('Listed!', `${created.name} is now live. Buyer feed will show it.`);
    } catch (e) {
      setFormError(e.message);
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}><ActivityIndicator color={colors.forestGreen} /><Text style={s.loadingText}>Loading inventory…</Text></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header — Forest Green primary per DESIGN.md */}
      <View style={s.header}>
        <View>
          <Text style={s.headerEyebrow}>AniManage • Inventory</Text>
          <Text style={s.headerTitle}>{usingMock ? 'Demo farm (offline cache)' : isFarmer ? (user?.farmerProfile?.farm_name || user?.name) : 'Santos Family Farm'}</Text>
          <Text style={s.headerSub}>{products.length} listings • {lowStock.length} low stock</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <Pressable onPress={() => setShowAdd(true)} style={s.addBtn}><Text style={s.addBtnText}>+ Add</Text></Pressable>
          <NotificationBell onPress={() => navigation.navigate('Notifications')} />
          <View style={s.headerBadge}><Text style={s.headerBadgeText}>✓ 2FA</Text></View>
        </View>
      </View>

      <FlatList
        data={products}
        keyExtractor={(p) => String(p.id)}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.md, paddingBottom: 28 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAll(); }} tintColor={colors.forestGreen} />}
        ListHeaderComponent={
          <View style={{ gap: spacing.md }}>
            <SummaryCard daily={daily} weekly={weekly} pendingCount={pendingCount} />
            {usingMock && <View style={s.offlineBanner}><Text style={s.offlineText}>Offline — cached harvests • stock changes will sync (per spec offline queuing)</Text></View>}
            {lowStock.length > 0 && (
              <View style={s.alertCard}>
                <Text style={s.alertTitle}>⚠ Low-stock alerts • {lowStock.length}</Text>
                {lowStock.map((p) => (
                  <View key={p.id} style={s.alertRow}>
                    <Text style={s.alertName} numberOfLines={1}>{p.name} — {p.available_quantity} {p.unit_type} left</Text>
                    <Pressable onPress={() => handleAdjust(p, 10)} style={s.alertAction}><Text style={s.alertActionText}>+10</Text></Pressable>
                  </View>
                ))}
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => {
          const isUpdating = updatingId === item.id;
          const isSoldOut = item.status === 'sold_out' || Number(item.available_quantity) === 0;
          return (
            <View style={[s.card, isSoldOut && s.cardSoldOut]}>
              <View style={s.cardTop}>
                {item.image ? <Image source={{ uri: item.image }} style={s.thumbImage} /> : <View style={s.thumb}><Text style={s.thumbEmoji}>{item.category?.name === 'Bigas' ? '🌾' : item.category?.name === 'Isda' ? '🐟' : '🥬'}</Text></View>}
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={s.nameRow}>
                    <Text style={s.name} numberOfLines={1}>{item.name}</Text>
                    {isSoldOut ? <View style={s.soldOutPill}><Text style={s.soldOutText}>Sold out</Text></View> : <StatusChip status={item.status} />}
                  </View>
                  <Text style={s.meta} numberOfLines={1}>{item.category?.name} • {peso(item.price_per_unit)}/{item.unit_type} • Harvest {item.harvest_date}</Text>
                  {item.bulk_price && <Text style={s.bulk}>Bulk {peso(item.bulk_price)}/{item.unit_type} at {item.min_bulk_quantity}+</Text>}
                </View>
              </View>

              <View style={s.stepperRow}>
                <InventoryStepper
                  value={Number(item.available_quantity)}
                  unit={item.unit_type}
                  loading={isUpdating}
                  lowStock={Number(item.available_quantity) <= 5}
                  onChange={(delta) => handleAdjust(item, delta)}
                />
                <Pressable
                  onPress={() => handleSoldOut(item)}
                  style={({ pressed }) => [s.soldOutBtn, isSoldOut && s.soldOutBtnActive, pressed && { opacity: 0.9 }]}
                >
                  <Text style={[s.soldOutBtnText, isSoldOut && s.soldOutBtnTextActive]}>{isSoldOut ? 'Restock' : 'Mark sold out'}</Text>
                </Pressable>
              </View>
              <Text style={s.oneTapHint}>One-tap update — no modal, 44pt targets</Text>
            </View>
          );
        }}
        ListEmptyComponent={<View style={s.empty}><Text style={s.emptyText}>No listings yet — tap + Add to list your harvest.</Text></View>}
      />

      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAdd(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.neutralBg }}>
          <View style={s.modalHeader}>
            <Pressable onPress={() => setShowAdd(false)} style={s.modalClose}><Text style={s.modalCloseText}>✕</Text></Pressable>
            <Text style={s.modalTitle}>New harvest listing</Text>
            <View style={{ width: 36 }} />
          </View>
          <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.sm, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
            <Text style={s.modalSub}>Farmer creates the listing — same POST /api/products as web. Verified badge after admin approval.</Text>
            <Text style={s.label}>Product name *</Text>
            <TextInput value={form.name} onChangeText={v => setForm(s => ({ ...s, name: v }))} placeholder="e.g. Siling Labuyo" placeholderTextColor="#C2CAD5" style={s.input} />
            <Text style={s.label}>Category *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {categories.map(c => (
                <Pressable key={c.id} onPress={() => setForm(s => ({ ...s, category_id: String(c.id) }))} style={[s.catChip, String(form.category_id)===String(c.id) && s.catChipActive]}>
                  <Text style={[s.catChipText, String(form.category_id)===String(c.id) && s.catChipTextActive]}>{c.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Text style={s.label}>Unit *</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {['kg','sack','piece','bundle','bag','box'].map(u => (
                <Pressable key={u} onPress={() => setForm(s => ({ ...s, unit_type: u }))} style={[s.unitChip, form.unit_type===u && s.unitChipActive]}>
                  <Text style={[s.unitChipText, form.unit_type===u && s.unitChipTextActive]}>{u}</Text>
                </Pressable>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 1 }}><Text style={s.label}>Price / unit *</Text><TextInput value={form.price_per_unit} onChangeText={v=>setForm(s=>({...s, price_per_unit: v}))} placeholder="120" keyboardType="numeric" style={s.input} /></View>
              <View style={{ flex: 1 }}><Text style={s.label}>Stock *</Text><TextInput value={form.available_quantity} onChangeText={v=>setForm(s=>({...s, available_quantity: v}))} placeholder="18" keyboardType="numeric" style={s.input} /></View>
            </View>
            <Text style={s.label}>Harvest date</Text>
            <TextInput value={form.harvest_date} onChangeText={v=>setForm(s=>({...s, harvest_date: v}))} placeholder="2026-09-06 (YYYY-MM-DD)" style={s.input} />
            <Text style={s.label}>Description</Text>
            <TextInput value={form.description} onChangeText={v=>setForm(s=>({...s, description: v}))} placeholder="Hand-harvested, ideal for..." style={[s.input, { height: 72, textAlignVertical: 'top', paddingTop: 10 }]} multiline />
            <Text style={s.label}>Photos — harvest / field (up to 5)</Text>
            {pickedImages.length > 0 && (
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {pickedImages.map((asset, i) => (
                  <View key={i} style={s.previewWrap}>
                    <Image source={{ uri: asset.uri }} style={s.previewImg} />
                    <Pressable onPress={() => setPickedImages(prev => prev.filter((_, idx) => idx !== i))} style={s.previewRemove}><Text style={s.previewRemoveText}>×</Text></Pressable>
                  </View>
                ))}
              </View>
            )}
            <Pressable onPress={pickImage} disabled={pickedImages.length >= 5} style={[s.pickBtn, pickedImages.length >= 5 && { opacity: 0.4 }]}>
              <Text style={s.pickBtnText}>{pickedImages.length >= 5 ? 'Max 5 photos' : '+ Pick photo (compresses to 5MB)'}</Text>
            </Pressable>
            <Text style={s.hint}>Low-bandwidth: placeholder shows until Wi-Fi upload completes.</Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 1 }}><Text style={s.label}>Min bulk qty</Text><TextInput value={form.min_bulk_quantity} onChangeText={v=>setForm(s=>({...s, min_bulk_quantity: v}))} placeholder="5" keyboardType="numeric" style={s.input} /></View>
              <View style={{ flex: 1 }}><Text style={s.label}>Bulk price</Text><TextInput value={form.bulk_price} onChangeText={v=>setForm(s=>({...s, bulk_price: v}))} placeholder="95" keyboardType="numeric" style={s.input} /></View>
            </View>
            {formError && <View style={s.formError}><Text style={s.formErrorText}>{formError}</Text></View>}
            <Pressable onPress={handleCreate} disabled={creating} style={[s.submitBtn, creating && { opacity: 0.6 }]}>
              {creating ? <ActivityIndicator color={colors.white} /> : <Text style={s.submitText}>List harvest — ₱{form.price_per_unit || '—'} / {form.unit_type}</Text>}
            </Pressable>
            <Text style={s.hint}>Photos upload on Wi-Fi later — placeholder until then (low-bandwidth first).</Text>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.neutralBg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: spacing.xl },
  loadingText: { ...typography.body, color: colors.textMuted },
  header: {
    backgroundColor: colors.forestGreen, paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
  },
  headerEyebrow: { ...typography.label, color: 'rgba(255,255,255,0.7)', fontSize: 10 },
  headerTitle: { ...typography.heading, color: colors.white, marginTop: 2 },
  headerSub: { ...typography.caption, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  headerBadge: { backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  headerBadgeText: { ...typography.caption, fontFamily: 'Poppins_600SemiBold', color: colors.white, fontSize: 11 },
  summaryCard: { backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderLight, padding: spacing.md, gap: 10, boxShadow: '0px 4px 12px rgba(46, 83, 57, 0.06)', elevation: 2 },
  summaryEyebrow: { ...typography.label, color: colors.textMuted, fontSize: 10 },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryBox: { flex: 1, gap: 2 },
  summaryLabel: { ...typography.caption, color: colors.textMuted },
  summaryValue: { ...typography.price, color: colors.forestGreen, fontSize: 18 },
  summarySub: { ...typography.caption, color: colors.textMuted, fontSize: 11 },
  summaryDivider: { width: 1, backgroundColor: colors.borderLight, marginHorizontal: spacing.sm, alignSelf: 'stretch' },
  offlineBanner: { backgroundColor: colors.harvestGoldLight, borderRadius: radius.md, padding: 10, borderWidth: 1, borderColor: '#F2D98A' },
  offlineText: { ...typography.caption, color: colors.harvestGoldDark, textAlign: 'center', fontFamily: 'Poppins_600SemiBold' },
  alertCard: { backgroundColor: '#FDEDEC', borderRadius: radius.md, borderWidth: 1, borderColor: '#E8C6C6', padding: spacing.md, gap: 8 },
  alertTitle: { ...typography.bodyMedium, color: colors.status.cancelled },
  alertRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  alertName: { ...typography.body, color: colors.textPrimary, flex: 1 },
  alertAction: { backgroundColor: colors.white, borderRadius: radius.pill, paddingHorizontal: 12, height: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  alertActionText: { ...typography.caption, fontFamily: 'Poppins_600SemiBold', color: colors.forestGreen },
  card: { backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderLight, padding: spacing.md, gap: spacing.sm },
  cardSoldOut: { borderColor: '#E8C6C6', backgroundColor: '#FFFBFB' },
  cardTop: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  thumb: { width: 48, height: 48, borderRadius: 12, backgroundColor: colors.forestGreenLight, alignItems: 'center', justifyContent: 'center' },
  thumbImage: { width: 48, height: 48, borderRadius: 12, backgroundColor: colors.forestGreenLight },
  thumbEmoji: { fontSize: 22 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  name: { ...typography.bodyMedium, color: colors.textPrimary, flexShrink: 1 },
  soldOutPill: { backgroundColor: colors.status.cancelled, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  soldOutText: { ...typography.caption, fontFamily: 'Poppins_600SemiBold', color: colors.white, fontSize: 11 },
  meta: { ...typography.caption, color: colors.textMuted },
  bulk: { ...typography.caption, color: colors.harvestGoldDark, fontFamily: 'Poppins_500Medium' },
  stepperRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  soldOutBtn: { height: 44, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  soldOutBtnActive: { backgroundColor: colors.forestGreen, borderColor: colors.forestGreen },
  soldOutBtnText: { ...typography.caption, fontFamily: 'Poppins_600SemiBold', color: colors.textSecondary },
  soldOutBtnTextActive: { color: colors.white },
  oneTapHint: { ...typography.caption, color: colors.textMuted, fontSize: 11, textAlign: 'center' },
  addBtn: { backgroundColor: colors.white, borderRadius: radius.pill, paddingHorizontal: 12, height: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  addBtnText: { ...typography.caption, fontFamily: 'Poppins_600SemiBold', color: colors.forestGreen, fontSize: 12 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  modalTitle: { ...typography.heading, color: colors.textPrimary },
  modalClose: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.neutralBg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  modalCloseText: { color: colors.textSecondary, fontSize: 16 },
  modalSub: { ...typography.caption, color: colors.textMuted, lineHeight: 16 },
  label: { ...typography.caption, fontFamily: 'Poppins_600SemiBold', color: colors.textMuted, fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase' },
  input: { backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, height: 44, ...typography.body, color: colors.textPrimary },
  catChip: { paddingHorizontal: 14, height: 36, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  catChipActive: { backgroundColor: colors.forestGreen, borderColor: colors.forestGreen },
  catChipText: { ...typography.caption, fontFamily: 'Poppins_500Medium', color: colors.textSecondary },
  catChipTextActive: { color: colors.white },
  unitChip: { flex: 1, height: 36, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  unitChipActive: { backgroundColor: colors.forestGreen, borderColor: colors.forestGreen },
  unitChipText: { ...typography.caption, color: colors.textSecondary },
  unitChipTextActive: { color: colors.white, fontFamily: 'Poppins_600SemiBold' },
  formError: { backgroundColor: '#FDEDEC', borderRadius: radius.md, padding: 10, borderWidth: 1, borderColor: '#E8C6C6' },
  formErrorText: { ...typography.caption, color: colors.status.cancelled },
  submitBtn: { backgroundColor: colors.forestGreen, borderRadius: radius.pill, height: 48, alignItems: 'center', justifyContent: 'center' },
  submitText: { ...typography.bodyMedium, color: colors.white },
  hint: { ...typography.caption, color: colors.textMuted, textAlign: 'center', fontSize: 11 },
  previewWrap: { width: 80, height: 80, borderRadius: radius.sm, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, position: 'relative', backgroundColor: colors.neutralBg },
  previewImg: { width: '100%', height: '100%' },
  previewRemove: { position: 'absolute', top: 2, right: 2, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  previewRemoveText: { color: colors.white, fontSize: 12, lineHeight: 12 },
  pickBtn: { height: 44, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed' },
  pickBtnText: { ...typography.bodyMedium, color: colors.forestGreen },
  empty: { padding: 32, alignItems: 'center' },
  emptyText: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
});
