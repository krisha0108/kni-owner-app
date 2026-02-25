// screens/RestaurantsScreen.js
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity,
  TextInput, RefreshControl, Animated, Dimensions, Modal, Linking, Platform
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { pick, types, isCancel } from '@react-native-documents/picker';

import { api, IMAGE_BASE_URL } from '../api/client';
import KniBottomNav from '../components/KniBottomNav';
import NavigationMenu from '../components/NavigationMenu';

import { scale, moderateScale } from '../utils/responsive';
const C = { primary:'#EF3A3A', ink:'#1D2254', bg:'#F5F7FA', card:'#FFFFFF',
  text:'#0F172A', muted:'#6B7280', border:'#E5E7EB', ok:'#10B981', warn:'#F59E0B', danger:'#EF4444' };
const R = 20;
const { width:W, height:H } = Dimensions.get('window');

const statusStyles = (s)=> {
  if (s === 'all') {
    return { bg:'#F1F5F9', fg:'#475569', label:'All' };
  }
  return {
    bg: s==='approved' ? '#ECFDF5' : s==='pending' ? '#FFF7ED' : '#FEF2F2',
    fg: s==='approved' ? C.ok : s==='pending' ? '#F59E0B' : C.danger,
    label: s[0].toUpperCase()+s.slice(1),
  };
};

const money = (n)=>`₹ ${Number(n||0).toLocaleString('en-IN')}`;

/* ---------------------- LIGHT TOAST ---------------------- */
function useToast() {
  const [toast, setToast] = useState({ visible:false, type:'info', msg:'' });
  const anim = useRef(new Animated.Value(0)).current;

  const show = (msg, type='info', duration=1600) => {
    setToast({ visible:true, type, msg });
    Animated.timing(anim, { toValue:1, duration:200, useNativeDriver:true }).start(() => {
      setTimeout(() => {
        Animated.timing(anim, { toValue:0, duration:200, useNativeDriver:true }).start(() => {
          setToast({ visible:false, type, msg:'' });
        });
      }, duration);
    });
  };

  const ToastView = toast.visible ? (
    <Animated.View
      pointerEvents="none"
      style={[
        st.toastWrap,
        {
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange:[0,1], outputRange:[20,0] }) }],
          backgroundColor: toast.type==='success' ? '#10B981' : toast.type==='error' ? '#EF4444' : '#334155'
        }
      ]}
    >
      <Icon
        name={toast.type==='success' ? 'checkmark-circle-outline' : toast.type==='error' ? 'alert-circle-outline' : 'information-circle-outline'}
        size={scale(18)}
        color="#fff"
        style={{ marginRight:scale(8) }}
      />
      <Text style={st.toastTxt}>{toast.msg}</Text>
    </Animated.View>
  ) : null;

  return { show, ToastView };
}

/* ---------------------- MAIN ---------------------- */
export default function RestaurantsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { show, ToastView } = useToast();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [items, setItems] = useState([]);
  const [menuVisible, setMenuVisible] = useState(false);

  // modals
  const [formOpen, setFormOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [ownerId, setOwnerId] = useState(null);

  useEffect(() => {
    (async () => {
      const id = await AsyncStorage.getItem("ownerId");
      setOwnerId(id ?? null);
    })();
  }, []);

  // Restaurant list
  const fetchRestaurants = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/restaurants');

      const mapped = res.data.data.map((r) => ({
        id: r.id,
        name: r.hotel_name,
        address: r.address,
        desc: r.description || '',
        fssai: r.fssai_number,
        fssaiPdf: r.fssai_certificate ? `${IMAGE_BASE_URL}/${r.fssai_certificate}` : '',
        status: r.status,
        photos: [
          r.main_image ? `${IMAGE_BASE_URL}/${r.main_image}` : '',
          ...(Array.isArray(r.gallery_images)
            ? r.gallery_images.map((img) => `${IMAGE_BASE_URL}/${img}`)
            : []),
          r.business_card ? `${IMAGE_BASE_URL}/${r.business_card}` : '',
        ].filter(Boolean),
      }));

      setItems(mapped);
    } catch (err) {
      console.error(err);
      show('Failed to fetch restaurants', 'error');
    } finally {
      setLoading(false);
    }
  }, [show]);

  useEffect(() => {
    fetchRestaurants();
  }, [fetchRestaurants]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRestaurants();
    setRefreshing(false);
  };

  // form state
  const [form, setForm] = useState({
    id: undefined,
    name:'', address:'', fssai:'', desc:'',
    main:'', img1:'', img2:'', img3:'', card:'',
    fssaiPdf:'', fssaiPdfName:''
  });

  // loading + pulse
  const pulse = useRef(new Animated.Value(0.5)).current;
  useEffect(()=>{
    const t = setTimeout(()=>setLoading(false), 700);
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse,{toValue:1,duration:900,useNativeDriver:false}),
      Animated.timing(pulse,{toValue:0.5,duration:900,useNativeDriver:false}),
    ]));
    loop.start(); return ()=>{ clearTimeout(t); loop.stop(); };
  },[pulse]);

  const [debouncedQuery, setDebouncedQuery] = useState('');
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(handler);
  }, [query]);

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    return items.filter(r => {
      const okStatus = filter === 'all' || r.status === filter;
      const okQ = !q || r.name.toLowerCase().includes(q) || r.address.toLowerCase().includes(q);
      return okStatus && okQ;
    });
  }, [items, debouncedQuery, filter]);

  // open add/edit
  const startEdit = (r)=>{
    if (r) {
      setForm({
        id:r.id, name:r.name, address:r.address, fssai:r.fssai, desc:r.desc,
        main:r.photos?.[0]||'', img1:r.photos?.[1]||'', img2:r.photos?.[2]||'', img3:r.photos?.[3]||'', card:r.photos?.[4]||'',
        fssaiPdf:r.fssaiPdf||'', fssaiPdfName: r.fssaiPdf ? getFilenameFromUri(r.fssaiPdf) : ''
      });
    } else {
      setForm({ id:undefined, name:'', address:'', fssai:'', desc:'', main:'', img1:'', img2:'', img3:'', card:'', fssaiPdf:'', fssaiPdfName:'' });
    }
    setFormOpen(true);
  };

  // Handle both create and update restaurant
  const saveForm = async () => {
    console.log('ownerId at submit:', ownerId);
    if (!ownerId) {
      show('Owner not found. Please login again.', 'error');
      return;
    }

    if (!form.name || !form.address) {
      show('Please enter name & address', 'error');
      return;
    }

    // FSSAI certificate is required for new restaurants
    if (!form.id && !form.fssaiPdf) {
      show('FSSAI certificate is required', 'error');
      return;
    }

    try {
      const fd = new FormData();
      
      if (form.id) {
        fd.append('_method', 'PUT');
      }
      
      fd.append('restaurant_owner_id', String(ownerId));
      fd.append('hotel_name', form.name);
      fd.append('address', form.address);
      fd.append('fssai_number', form.fssai || '');
      fd.append('description', form.desc || '');

      if (form.main) {
        if (!form.main.startsWith('http')) {
          fd.append('main_image', {
            uri: form.main,
            type: 'image/jpeg',
            name: 'main_image.jpg',
          });
        }
      }
      
      [form.img1, form.img2, form.img3].forEach((img, index) => {
        if (img) {
          if (!img.startsWith('http')) {
            fd.append(`gallery_images[]`, {
              uri: img,
              type: 'image/jpeg',
              name: `gallery_${index}.jpg`,
            });
          }
        }
      });

      if (form.card) {
        if (!form.card.startsWith('http')) {
          fd.append('business_card', {
            uri: form.card,
            type: 'image/jpeg',
            name: 'business_card.jpg',
          });
        }
      }
      
      if (form.fssaiPdf) {
        if (!form.fssaiPdf.startsWith('http')) {
          fd.append('fssai_certificate', {
            uri: form.fssaiPdf,
            type: 'application/pdf',
            name: form.fssaiPdfName || 'fssai_certificate.pdf',
          });
        }
      }

      let res;
      if (form.id) {
        res = await api.post(`/restaurants/${form.id}`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        res = await api.post('/restaurants', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      show(`Restaurant ${form.id ? 'updated' : 'added'} successfully`, 'success');
      setFormOpen(false);
      fetchRestaurants();
    } catch (err) {
      console.log("❌ API error:", err);
      show(`Failed to ${form.id ? 'update' : 'save'} restaurant`, 'error');
    }
  };

  const askDelete = (r)=>{ setToDelete(r); setConfirmOpen(true); };
  
  const doDelete = async () => {
    try {
      await api.delete(`/restaurants/${toDelete.id}`);
      show('Restaurant deleted', 'success');
      fetchRestaurants();
    } catch (err) {
      console.error(err);
      show('Failed to delete', 'error');
    } finally {
      setConfirmOpen(false);
      setToDelete(null);
    }
  };

  // Image pickers - simplified without permission requests
  const pickImage = async (key) => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 1,
        includeBase64: false,
        quality: 0.8,
      });

      if (result.didCancel) return;
      
      if (result.errorCode) {
        show('Failed to pick image', 'error');
        return;
      }

      if (result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setForm(f => ({ ...f, [key]: uri }));
      }
    } catch (error) {
      console.log('ImagePicker exception:', error);
      show('Failed to open gallery', 'error');
    }
  };

  const pickMultipleImages = async ()=>{
    try {
      const result = await launchImageLibrary({
        mediaType:'photo',
        selectionLimit:3,
        includeBase64:false,
        quality:0.9
      });
      
      if (result.didCancel) return;
      
      if (result.errorCode) {
        show('Failed to pick images', 'error');
        return;
      }

      if (result.assets?.length) {
        const uris = result.assets.map(a => a.uri).filter(Boolean);
        setForm(f=>({
          ...f,
          img1: uris[0] || '',
          img2: uris[1] || '',
          img3: uris[2] || '',
        }));
      }
    } catch (error) {
      console.log('Multiple Images exception:', error);
      show('Failed to open gallery', 'error');
    }
  };

  // PDF picker - make sure this function exists
  const pickPDF = async () => {
    try {
      const [file] = await pick({ type: [types.pdf] });
      if (file?.uri) {
        setForm(f => ({
          ...f,
          fssaiPdf: file.uri,
          fssaiPdfName: file.name || getFilenameFromUri(file.uri),
        }));
        show('PDF selected', 'success');
      }
    } catch (e) {
      if (isCancel(e)) {
        console.log("User cancelled PDF picker");
      } else {
        console.error("PDF pick error", e);
      }
    }
  };

  const openPdf = async (url)=>{
    if (!url || url.trim() === '') {
      show('PDF not available', 'error');
      return;
    }
    
    try{
      await Linking.openURL(url);
      show('Opening PDF...', 'success');
    } catch(error) {
      console.log('Error opening PDF:', error);
      show('Could not open PDF. Please check if the file exists.', 'error');
    }
  };

  // utility
  const clearImg = (key)=> setForm(f=>({...f,[key]:''}));
  const getFilenameFromUri = (u='')=>{
    try{
      const q = u.split('?')[0];
      const s = q.split('/').pop() || '';
      return decodeURIComponent(s);
    }catch{ return ''; }
  };

  return (
    <SafeAreaView style={{flex:1, backgroundColor:C.bg}} edges={['top','left','right']}>
      {/* Header */}
      <View style={[st.header,{paddingTop:scale(6)}]}>
        <TouchableOpacity onPress={()=>navigation.goBack?.()} style={st.hBtn}>
          <Icon name="chevron-back" size={scale(20)} color={C.ink}/>
        </TouchableOpacity>
        <Text style={st.hTitle}>Restaurants</Text>
        <TouchableOpacity onPress={() => setMenuVisible(true)} style={{ padding: scale(8) }}>
          <Icon name="menu" size={scale(22)} color="#1D2254" />
        </TouchableOpacity>
      </View>

      {/* Search + Filters */}
      <View style={{paddingHorizontal:scale(16)}}>
        <View style={st.searchWrap}>
          <Icon name="search" size={scale(18)} color="#94A3B8"/>
          <TextInput
            placeholder="Search restaurants..."
            placeholderTextColor="#94A3B8"
            value={query}
            onChangeText={setQuery}
            style={st.searchInput}
          />
          {!!query && (
            <TouchableOpacity onPress={()=>setQuery('')} style={st.clearBtn}>
              <Icon name="close-circle" size={scale(18)} color="#B0B8C4"/>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingVertical:scale(10)}}>
          {['all','approved','pending','rejected'].map(s=>{
            const on = filter===s;
            const ss = statusStyles(s==='all'?'approved':s);
            const icon = s==='approved'?'checkmark-circle' : s==='pending'?'time-outline' : s==='rejected'?'close-circle' : 'grid';
            return (
              <TouchableOpacity key={s} onPress={()=>setFilter(s)} style={[st.filterChip, on&&{borderColor:ss.fg, backgroundColor:ss.bg}]}>
                <Icon name={s==='all'?'grid':icon} size={scale(14)} color={on?ss.fg:'#64748B'}/>
                <Text style={[st.filterTxt,on&&{color:ss.fg}]}>{s==='all'?'All':ss.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* List */}
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} tintColor={C.primary}/>}
        contentContainerStyle={{ padding:scale(16), paddingBottom: insets.bottom + scale(24) }}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonRestaurantCard key={i} />)
        ) : (
          filtered.map(r=> (
            <RestaurantCard
              key={r.id}
              r={r}
              onView={()=>navigation.navigate?.('RestaurantView',{ restaurant:r })}
              onEdit={()=>startEdit(r)}
              onFSSAI={()=> openPdf(r.fssaiPdf)}
              onDelete={()=>askDelete(r)}
              openPdf={openPdf}
            />
          ))
        )}
      </ScrollView>

      {/* ADD / EDIT MODAL */}
      <Modal visible={formOpen} transparent animationType="fade" onRequestClose={()=>setFormOpen(false)}>
        <View style={st.overlay}>
          <View style={st.modalCard}>
            <View style={st.modalHeader}>
              <Text style={st.modalTitle}>{form?.id?'Edit hotel':'Add hotel'}</Text>
              <TouchableOpacity onPress={()=>setFormOpen(false)} style={st.close}>
                <Icon name="close" size={scale(18)} color={C.ink}/>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Basic fields */}
              {[
                {key:'name',    label:'Name',      icon:'business-outline', placeholder:'Restaurant name'},
                {key:'address', label:'Address',   icon:'location-outline', placeholder:'Full address'},
                {key:'fssai',   label:'FSSAI No.', icon:'document-text-outline', placeholder:'14-digit FSSAI'},
                {key:'desc',    label:'Tagline / Description', icon:'reader-outline', placeholder:'Short description'},
              ].map(f=>(
                <View key={f.key} style={{marginBottom:scale(12)}}>
                  <Text style={st.inputLbl}>{f.label}</Text>
                  <View style={st.inputWrap}>
                    <Icon name={f.icon} size={scale(16)} color="#9CA3AF" />
                    <TextInput
                      value={form[f.key]}
                      onChangeText={(t)=>setForm(v=>({...v,[f.key]:t}))}
                      placeholder={f.placeholder}
                      placeholderTextColor="#9CA3AF"
                      style={st.inputField}
                      multiline={f.key==='desc'}
                    />
                  </View>
                </View>
              ))}

              {/* Images */}
              <Text style={[st.inputLbl,{marginTop:scale(6)}]}>Images</Text>

              {/* Main image */}
              <View style={{marginBottom:scale(12)}}>
                <Text style={st.subLbl}>Main Image</Text>
                <View style={{flexDirection:'row', alignItems:'center', gap:scale(10)}}>
                  <TouchableOpacity onPress={()=>pickImage('main')} style={st.previewWrap}>
                    {form.main ? (
                      <Image source={{uri:form.main}} style={st.previewImg}/>
                    ) : (
                      <View style={st.previewEmpty}><Icon name="image-outline" size={scale(20)} color="#9CA3AF"/></View>
                    )}
                  </TouchableOpacity>
                  {!!form.main && (
                    <TouchableOpacity onPress={()=>clearImg('main')} style={st.outlineMini}>
                      <Icon name="close-circle" size={scale(16)} color={C.danger}/>
                      <Text style={st.outlineMiniTxt}>Clear</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={()=>pickImage('main')} style={st.pickerBtn}>
                    <Icon name="images-outline" size={scale(16)} color="#fff"/><Text style={st.pickerTxt}>Pick</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* 3 gallery images */}
              <View style={{marginBottom:scale(12)}}>
                <Text style={st.subLbl}>Gallery Images (up to 3)</Text>
                <View style={{flexDirection:'row', alignItems:'center', gap:scale(10)}}>
                  {[{k:'img1'},{k:'img2'},{k:'img3'}].map((slot)=>(
                    <TouchableOpacity key={slot.k} onPress={pickMultipleImages} style={st.previewWrap}>
                      {form[slot.k] ? (
                        <Image source={{uri:form[slot.k]}} style={st.previewImg}/>
                      ) : (
                        <View style={st.previewEmpty}><Icon name="image-outline" size={scale(20)} color="#9CA3AF"/></View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={{flexDirection:'row', gap:scale(10), marginTop:scale(8)}}>
                  <TouchableOpacity onPress={pickMultipleImages} style={st.pickerBtn}>
                    <Icon name="images-outline" size={scale(16)} color="#fff"/><Text style={st.pickerTxt}>Pick 1–3</Text>
                  </TouchableOpacity>
                  {(form.img1||form.img2||form.img3) ? (
                    <TouchableOpacity onPress={()=>setForm(f=>({...f, img1:'', img2:'', img3:''}))} style={st.outlineMini}>
                      <Icon name="close-circle" size={scale(16)} color={C.danger}/>
                      <Text style={st.outlineMiniTxt}>Clear all</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>

              {/* Business card */}
              <View style={{marginBottom:scale(12)}}>
                <Text style={st.subLbl}>Business Card Image</Text>
                <View style={{flexDirection:'row', alignItems:'center', gap:scale(10)}}>
                  <TouchableOpacity onPress={()=>pickImage('card')} style={st.previewWrap}>
                    {form.card ? (
                      <Image source={{uri:form.card}} style={st.previewImg}/>
                    ) : (
                      <View style={st.previewEmpty}><Icon name="image-outline" size={scale(20)} color="#9CA3AF"/></View>
                    )}
                  </TouchableOpacity>
                  {!!form.card && (
                    <TouchableOpacity onPress={()=>clearImg('card')} style={st.outlineMini}>
                      <Icon name="close-circle" size={scale(16)} color={C.danger}/>
                      <Text style={st.outlineMiniTxt}>Clear</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={()=>pickImage('card')} style={st.pickerBtn}>
                    <Icon name="images-outline" size={scale(16)} color="#fff"/><Text style={st.pickerTxt}>Pick</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* PDF picker */}
              <Text style={[st.inputLbl,{marginTop:scale(6)}]}>FSSAI certificate (PDF) <Text style={{color:'#EF4444'}}>*</Text></Text>
              <View style={{gap:scale(8), marginBottom:scale(12)}}>
                <View style={{flexDirection:'row', alignItems:'center', gap:scale(10)}}>
                  <TouchableOpacity onPress={pickPDF} style={[st.pdfIcon,{backgroundColor:'#FFF1F1'}]}>
                    <Icon name="document-text-outline" size={scale(20)} color={C.primary}/>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={pickPDF} style={st.pickerBtn}>
                    <Icon name="document-text-outline" size={scale(16)} color="#fff"/>
                    <Text style={st.pickerTxt}>Pick PDF</Text>
                  </TouchableOpacity>
                  {!!form.fssaiPdf && (
                    <TouchableOpacity onPress={()=>setForm(f=>({...f, fssaiPdf:'', fssaiPdfName:''}))} style={st.outlineMini}>
                      <Icon name="close-circle" size={scale(16)} color={C.danger}/>
                      <Text style={st.outlineMiniTxt}>Clear</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {!!form.fssaiPdfName && (
                  <View style={st.filePill}>
                    <Icon name="document-attach-outline" size={scale(14)} color="#0F172A" />
                    <Text style={st.filePillTxt} numberOfLines={1}>{form.fssaiPdfName}</Text>
                  </View>
                )}
              </View>

              <TouchableOpacity onPress={saveForm} style={[st.primaryBtn,{marginTop:scale(10)}]}>
                <Text style={st.primaryTxt}>{form?.id?'Save changes':'Add hotel'}</Text>
              </TouchableOpacity>
              <View style={{height:scale(8)}}/>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* DELETE CONFIRM MODAL */}
      <Modal visible={confirmOpen} transparent animationType="fade" onRequestClose={()=>setConfirmOpen(false)}>
        <View style={st.overlay}>
          <View style={st.confirmCard}>
            <View style={{alignItems:'center'}}>
              <View style={st.warnIcon}><Icon name="trash-outline" size={scale(20)} color="#fff"/></View>
              <Text style={st.confirmTitle}>Delete hotel?</Text>
              <Text style={st.confirmSub}>This will permanently remove "{toDelete?.name}".</Text>
            </View>
            <View style={{flexDirection:'row', gap:scale(10), marginTop:scale(14)}}>
              <TouchableOpacity onPress={()=>setConfirmOpen(false)} style={[st.outlineBtn,{flex:1}]}>
                <Text style={st.outlineTxt}>No, keep it</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={doDelete} style={[st.dangerBtn,{flex:1}]}>
                <Text style={st.dangerTxt}>Yes, delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Toast */}
      {ToastView}
      <NavigationMenu visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />
      <KniBottomNav navigation={navigation} />
    </SafeAreaView>
  );
}

/* ---------------------- SKELETON CARD ---------------------- */
function SkeletonRestaurantCard() {
  const pulse = useRef(new Animated.Value(0.6)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0.6, duration: 900, useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View style={st.card}>
      {/* Media */}
      <Animated.View style={[st.skelHero, { opacity: pulse }]}>
        <View style={st.skelStatusPill} />
        <View style={st.skelThumbRow}>
          <View style={st.skelThumb} />
          <View style={st.skelThumb} />
          <View style={st.skelThumbMore} />
        </View>
      </Animated.View>

      {/* Body */}
      <View style={{ padding: scale(12) }}>
        <Animated.View style={[st.skelTitleLine, { opacity: pulse }]} />
        <Animated.View style={[st.skelAddrLine, { opacity: pulse }]} />
        <Animated.View style={[st.skelDescLine, { opacity: pulse }]} />
        <Animated.View style={[st.skelDescLineShort, { opacity: pulse }]} />

        <View style={st.metaRow}>
          <View style={st.skelMetaChip} />
          <View style={[st.skelMetaChip, { width: scale(120) }]} />
          <View style={{ flex: 1 }} />
          <View style={{ width: scale(80), height: scale(20) }} />
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: scale(10), marginTop: scale(10) }}>
          <View style={[st.skelActionPill, { width: scale(90) }]} />
          <View style={[st.skelActionPill, { width: scale(90) }]} />
          <View style={[st.skelActionPill, { width: scale(100) }]} />
        </View>
      </View>
    </View>
  );
}

/* ---------------------- SUB-COMPS ---------------------- */
function RestaurantCard({ r, onView, onEdit, onDelete, onFSSAI, openPdf }) {
  const s = statusStyles(r.status);
  
  // Get available thumbnails (img1, img2, business card)
  const thumbnails = [];
  if (r.photos[1]) thumbnails.push(r.photos[1]); // img1
  if (r.photos[2]) thumbnails.push(r.photos[2]); // img2
  if (r.photos[4]) thumbnails.push(r.photos[4]); // business card
  
  // If we have less than 3 thumbnails, fill the remaining slots with the main image
  while (thumbnails.length < 3 && r.photos[0]) {
    thumbnails.push(r.photos[0]);
  }

  return (
    <View style={st.card}>
      {/* Main Hero Image */}
      <View style={{position:'relative'}}>
        {r.photos[0] ? (
          <Image source={{uri: r.photos[0]}} style={st.mainImg} />
        ) : (
          <View style={[st.mainImg, {backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center'}]}>
            <Icon name="restaurant" size={scale(40)} color="#ccc" />
          </View>
        )}
        
        {/* Status Badge */}
        <View style={[st.statusPill,{backgroundColor:s.bg}]}>
          <Icon name={r.status==='approved'?'checkmark-circle':r.status==='pending'?'time-outline':'close-circle'} size={scale(14)} color={s.fg}/>
          <Text style={[st.statusTxt,{color:s.fg}]}>{s.label}</Text>
        </View>

        {/* Thumbnails Row */}
        <View style={st.thumbRow}>
          {thumbnails.slice(0, 3).map((uri, i) => (
            <View key={i} style={st.thumbWrap}>
              <Image source={{uri}} style={st.thumb} />
            </View>
          ))}
          {r.photos.length > 5 && (
            <View style={st.moreOverlay}>
              <Text style={st.moreTxt}>+{r.photos.length - 4}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Content */}
      <View style={{padding:scale(12)}}>
        <Text style={st.title} numberOfLines={1}>{r.name}</Text>
        <Text style={st.addr} numberOfLines={1}>{r.address}</Text>
        <Text style={st.desc} numberOfLines={2}>{r.desc}</Text>

        <View style={st.metaRow}>
          <View style={{flex:1}}/>
          <TouchableOpacity onPress={onView} style={st.linkBtn}><Text style={st.linkTxt}>View</Text><Icon name="chevron-forward" size={scale(16)} color={C.primary}/></TouchableOpacity>
        </View>

        <View style={{flexDirection:'row', flexWrap:'wrap', gap:scale(10), marginTop:scale(10)}}>
          {/* Edit button - only show if restaurant is not approved */}
          {r.status !== 'approved' && (
            <TouchableOpacity onPress={onEdit} style={st.actionMini}>
              <Icon name="create-outline" size={scale(16)} color={C.primary}/>
              <Text style={st.actionTxt}>Edit</Text>
            </TouchableOpacity>
          )}
          
          {/* FSSAI button - always show if PDF exists */}
          {r.fssaiPdf && r.fssaiPdf.trim() !== '' && (
            <TouchableOpacity onPress={() => {
              console.log("🔍 FSSAI Button clicked for:", r.name);
              console.log("📄 PDF URL:", r.fssaiPdf);
              openPdf(r.fssaiPdf);
            }} style={[st.actionMini,{backgroundColor:'#EEF2FF',borderColor:'#DBEAFE'}]}>
              <Icon name="document-outline" size={scale(16)} color="#475569"/>
              <Text style={[st.actionTxt,{color:'#1E293B'}]}>FSSAI</Text>
            </TouchableOpacity>
          )}

          {/* Delete button - only show if restaurant is not approved */}
          {r.status !== 'approved' && (
            <TouchableOpacity onPress={onDelete} style={[st.actionMini,{backgroundColor:'#FEF2F2',borderColor:'#FCA5A5'}]}>
              <Icon name="trash-outline" size={scale(16)} color={C.danger}/>
              <Text style={[st.actionTxt,{color:C.danger}]}>Delete</Text>
            </TouchableOpacity>
          )}

        </View>
      </View>
    </View>
  );
}

/* ---------------------- STYLES ---------------------- */
const st = StyleSheet.create({
  header:{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:scale(16), paddingBottom:scale(8) },
  hBtn:{ width:scale(38), height:scale(38), borderRadius:scale(12), borderWidth:1, borderColor:'#EEF2F7', backgroundColor:'#fff', alignItems:'center', justifyContent:'center' },
  hTitle:{ color:C.ink, fontWeight:'900', fontSize:moderateScale(24) },

  searchWrap:{ flexDirection:'row', alignItems:'center', backgroundColor:'#fff', borderRadius:scale(999), paddingHorizontal:scale(14), borderWidth:1, borderColor:'#E5E7EB', height:scale(48), shadowColor:'#000', shadowOpacity:0.04, shadowRadius:scale(8), elevation:2 },
  searchInput:{ flex:1, marginLeft:scale(10), color:C.ink },
  clearBtn:{ marginLeft:scale(6) },

  filterChip:{ flexDirection:'row', alignItems:'center', gap:scale(6), paddingHorizontal:scale(12), paddingVertical:scale(8), borderRadius:scale(999), borderWidth:1, borderColor:'#E5E7EB', backgroundColor:'#fff', marginRight:scale(8) },
  filterTxt:{ color:'#334155', fontWeight:'800', fontSize:moderateScale(12) },

  card:{ backgroundColor:C.card, borderRadius:R, borderWidth:1, borderColor:'#EEF2F7', overflow:'hidden', marginBottom:scale(14), shadowColor:'#000', shadowOpacity:0.04, shadowRadius:scale(8), elevation:3 },
  mainImg:{ width:'100%', height:scale(180) },

  thumbRow:{ position:'absolute', right:scale(12), bottom:scale(12), flexDirection:'row', gap:scale(8) },
  thumbWrap:{ width:scale(56), height:scale(56), borderRadius:scale(12), backgroundColor:'#fff', padding:scale(2),
    borderWidth:1, borderColor:'#E2E8F0', shadowColor:'#000', shadowOpacity:0.12, shadowRadius:scale(6), elevation:4, overflow:'hidden' },
  thumb:{ width:'100%', height:'100%', borderRadius:scale(10) },
  moreOverlay:{ ...StyleSheet.absoluteFillObject, backgroundColor:'rgba(0,0,0,0.45)', alignItems:'center', justifyContent:'center', borderRadius:scale(10) },
  moreTxt:{ color:'#fff', fontWeight:'900', fontSize:moderateScale(12) },

  statusPill:{ position:'absolute', left:scale(12), top:scale(12), flexDirection:'row', alignItems:'center', gap:scale(6), paddingHorizontal:scale(12), paddingVertical:scale(6), borderRadius:scale(999) },
  statusTxt:{ fontWeight:'800', fontSize:moderateScale(12) },

  title:{ color:C.text, fontWeight:'900', fontSize:moderateScale(20), marginTop:scale(6) },
  addr:{ color:C.muted, marginTop:scale(2) },
  desc:{ color:C.text, marginTop:scale(6) },
  metaRow:{ flexDirection:'row', alignItems:'center', marginTop:scale(10) },
  metaChip:{ flexDirection:'row', alignItems:'center', backgroundColor:'#F8FAFC', borderWidth:1, borderColor:'#EEF2F7', paddingHorizontal:scale(10), paddingVertical:scale(6), borderRadius:scale(999), marginRight:scale(8) },
  metaTxt:{ color:C.ink, fontWeight:'800', fontSize:moderateScale(12) },
  linkBtn:{ flexDirection:'row', alignItems:'center' },
  linkTxt:{ color:C.primary, fontWeight:'900', marginRight:scale(4) },
  actionMini:{ flexDirection:'row', alignItems:'center', gap:scale(6), backgroundColor:'#FFF1F1', borderWidth:1, borderColor:'#FECACA', paddingHorizontal:scale(12), paddingVertical:scale(10), borderRadius:scale(12) },
  actionTxt:{ color:C.primary, fontWeight:'900' },

  // modal shells
  overlay:{ flex:1, backgroundColor:'rgba(0,0,0,0.35)', alignItems:'center', justifyContent:'center', paddingHorizontal:scale(16) },
  modalCard:{ width: W*0.9, maxWidth: scale(560), height: H*0.7, backgroundColor:'#fff', borderRadius:R, padding:scale(16), borderWidth:1, borderColor:'#EEF2F7' },
  modalHeader:{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:scale(8) },
  modalTitle:{ color:C.ink, fontWeight:'900', fontSize:moderateScale(18) },
  close:{ width:scale(36), height:scale(36), borderRadius:scale(12), backgroundColor:'#F3F4F6', alignItems:'center', justifyContent:'center' },

  inputLbl:{ color:C.muted, marginBottom:scale(6), fontSize:moderateScale(12), fontWeight:'700' },
  subLbl:{ color:'#64748B', marginBottom:scale(6), fontSize:moderateScale(12), fontWeight:'700' },

  inputWrap:{ backgroundColor:'#fff', borderRadius:scale(12), borderWidth:1, borderColor:'#EEF2F7', paddingHorizontal:scale(10), paddingVertical:scale(10), flexDirection:'row', alignItems:'center' },
  inputField:{ marginLeft:scale(8), color:C.text, flex:1 },

  pickRow:{ flexDirection:'row', alignItems:'center', gap:scale(8) },
  previewWrap:{ width:scale(72), height:scale(72), borderRadius:scale(12), borderWidth:2, borderColor:'#fff',
    shadowColor:'#000', shadowOpacity:0.12, shadowRadius:scale(6), elevation:4, overflow:'hidden', backgroundColor:'#F1F5F9', alignItems:'center', justifyContent:'center' },
  previewImg:{ width:'100%', height:'100%' },
  previewEmpty:{ flex:1, alignItems:'center', justifyContent:'center' },

  pdfIcon:{ width:scale(56), height:scale(56), borderRadius:scale(12), borderWidth:2, borderColor:'#fff', backgroundColor:'#FFF1F1', alignItems:'center', justifyContent:'center',
    shadowColor:'#000', shadowOpacity:0.12, shadowRadius:scale(6), elevation:4 },

  pickerBtn:{ flexDirection:'row', alignItems:'center', gap:scale(6), backgroundColor:C.primary, paddingHorizontal:scale(12), paddingVertical:scale(10), borderRadius:scale(12) },
  pickerTxt:{ color:'#fff', fontWeight:'900' },

  outlineMini:{ flexDirection:'row', alignItems:'center', gap:scale(6), borderWidth:1, borderColor:'#CBD5E1', paddingHorizontal:scale(10), paddingVertical:scale(8), borderRadius:scale(12), backgroundColor:'#fff' },
  outlineMiniTxt:{ color:'#334155', fontWeight:'800', fontSize:moderateScale(12) },

  primaryBtn:{ backgroundColor:C.primary, borderRadius:scale(14), paddingVertical:scale(12), alignItems:'center' },
  primaryTxt:{ color:'#fff', fontWeight:'900' },

  // file pill (PDF name)
  filePill:{ flexDirection:'row', alignItems:'center', gap:scale(6), backgroundColor:'#F1F5F9', borderWidth:1, borderColor:'#E2E8F0', paddingVertical:scale(8), paddingHorizontal:scale(10), borderRadius:scale(10), maxWidth:'100%' },
  filePillTxt:{ color:'#0F172A', fontWeight:'700', flexShrink:1 },

  // confirm
  confirmCard:{ width:W*0.85, maxWidth:scale(500), backgroundColor:'#fff', borderRadius:R, padding:scale(16), borderWidth:1, borderColor:'#EEF2F7' },
  warnIcon:{ width:scale(44), height:scale(44), borderRadius:scale(14), backgroundColor:C.danger, alignItems:'center', justifyContent:'center', marginBottom:scale(8) },
  confirmTitle:{ color:C.ink, fontWeight:'900', fontSize:moderateScale(18) },
  confirmSub:{ color:C.muted, textAlign:'center', marginTop:scale(6) },

  outlineBtn:{ borderWidth:1, borderColor:'#CBD5E1', borderRadius:scale(12), paddingVertical:scale(12), alignItems:'center' },
  outlineTxt:{ color:'#334155', fontWeight:'900' },
  dangerBtn:{ backgroundColor:'#FEE2E2', borderColor:'#FECACA', borderWidth:1, borderRadius:scale(12), paddingVertical:scale(12), alignItems:'center' },
  dangerTxt:{ color:C.danger, fontWeight:'900' },

  /* ====== SKELETON (mirrors real card) ====== */
  skelHero: {
    width: '100%',
    height: scale(180),
    backgroundColor: '#E9EEF5',
    position: 'relative',
  },
  skelStatusPill: {
    position: 'absolute',
    left: scale(12),
    top: scale(12),
    height: scale(28),
    width: scale(98),
    borderRadius: scale(999),
    backgroundColor: '#E6EEF7',
  },
  skelThumbRow: {
    position: 'absolute',
    right: scale(12),
    bottom: scale(12),
    flexDirection: 'row',
    gap: scale(8),
  },
  skelThumb: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(12),
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  skelThumbMore: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(12),
    backgroundColor: '#E2E8F0',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  skelTitleLine: {
    marginTop: scale(6),
    height: scale(18),
    borderRadius: scale(6),
    backgroundColor: '#E9EEF5',
    width: '70%',
  },
  skelAddrLine: {
    marginTop: scale(8),
    height: scale(12),
    borderRadius: scale(6),
    backgroundColor: '#E9EEF5',
    width: '55%',
  },
  skelDescLine: {
    marginTop: scale(8),
    height: scale(12),
    borderRadius: scale(6),
    backgroundColor: '#E9EEF5',
    width: '95%',
  },
  skelDescLineShort: {
    marginTop: scale(6),
    height: scale(12),
    borderRadius: scale(6),
    backgroundColor: '#E9EEF5',
    width: '80%',
  },

  skelMetaChip: {
    height: scale(28),
    width: scale(90),
    borderRadius: scale(999),
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#EEF2F7',
    marginRight: scale(8),
  },

  skelActionPill: {
    height: scale(38),
    borderRadius: scale(12),
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  // Toast
  toastWrap:{
    position:'absolute',
    bottom:scale(24),
    alignSelf:'center',
    maxWidth: W*0.9,
    borderRadius:scale(14),
    paddingVertical:scale(10),
    paddingHorizontal:scale(14),
    flexDirection:'row',
    alignItems:'center',
    shadowColor:'#000',
    shadowOpacity:0.15,
    shadowRadius:scale(12),
    elevation:6,
  },
  toastTxt:{ color:'#fff', fontWeight:'800', flexShrink:1 }
});
