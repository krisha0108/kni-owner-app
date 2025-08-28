// screens/RestaurantsScreen.js
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity,
  TextInput, RefreshControl, Animated, Dimensions, Modal, Linking, Platform
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker';

// Renamed package
import { pick, types } from '@react-native-documents/picker';

const C = { primary:'#EF3A3A', ink:'#1D2254', bg:'#F5F7FA', card:'#FFFFFF',
  text:'#0F172A', muted:'#6B7280', border:'#E5E7EB', ok:'#10B981', warn:'#F59E0B', danger:'#EF4444' };
const R = 20;
const { width:W, height:H } = Dimensions.get('window');

/* ---------------------- DEMO DATA ---------------------- */
const DEMO = [
  {
    id:'r1',
    name:'Spice Hub',
    address:'SG Highway, Ahmedabad',
    desc:'Modern Indian kitchen with 600L cold room.',
    fssai:'10718004001234',
    fssaiPdf:'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    status:'approved',
    servicesCount: 48,
    expense: 345000,
    photos:[
      'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/2d/07/23/9c/agashiye-terrace-dining.jpg',
      'https://www.ahmedabadcarrentals.com/blog/wp-content/uploads/2022/11/Skyz-Restaurant.jpg',
      'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/25/40/66/16/peshawri.jpg',
      'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/25/40/66/fc/royal-vega.jpg',
      'https://www.meraprint.com/wp-content/uploads/2021/09/business-visiting-cards-37.jpg',
    ],
  },
  {
    id:'r2',
    name:'Café Verde',
    address:'Law Garden, Ahmedabad',
    desc:'Cafe & bakery; high-traffic brunch spot.',
    fssai:'10718004005678',
    fssaiPdf:'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    status:'pending',
    servicesCount: 31,
    expense: 221400,
    photos:[
      'https://cdn.prod.website-files.com/66456ff69b6aadbdb065af90/684ff40cb5ddb0029dfdb9fd_Banner.jpg',
      'https://www.renovation.com.ph/wp-content/uploads/2024/03/restaurant-interior-deisgn-shutterstock_1601828464.jpg',
      'https://assets.cntraveller.in/photos/63d8e5103d7229d4cf308f01/16:9/w_1024%2Cc_limit/Prequel-lead.jpg',
      'https://assets.cntraveller.in/photos/63d8ed393d7229d4cf308f03/master/w_1600%2Cc_limit/Prequel%25202.jpg',
      'https://d1csarkz8obe9u.cloudfront.net/posterpreviews/restaurant-hotel-business-card-design-template-4a7ac72342791720fb90e7ea1009a8d8_screen.jpg?ts=1737116654',
    ],
  },
  {
    id:'r3',
    name:'Tandoor Tales',
    address:'Bodakdev, Ahmedabad',
    desc:'North-Indian grill house with twin tandoors.',
    fssai:'10718004007890',
    fssaiPdf:'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    status:'approved',
    servicesCount: 19,
    expense: 132200,
    photos:[
      'https://images.lifestyleasia.com/wp-content/uploads/sites/7/2024/08/21185142/Restaurants-in-Indiranagar-chef-Tarun-Sibal-1-1600x900.jpg',
      'https://qul.imgix.net/97dc85c5-c26d-4c9d-aa91-ecb2bbd5f520/719481_sld.jpg',
      'https://b.zmtcdn.com/data/pictures/4/20514854/8cd5588c9d1e61a08cc8d7845e79703b_featured_v2.jpg',
      'https://lh3.googleusercontent.com/KhK6AgK6W2Zh__ly4BnxdG5PJtq4_hyDq9tuAsgke6crH-m_bsJNHQtm-UjJVJDUVj7xvCWIsUBqDqoKlfZIZBhUXBovFpPw67skAX4=w1200-rw',
      'https://print-on-click.in/pub/media/catalog/product/h/o/hotel_visiting_card_10._main.png',
    ],
  },
];

const statusStyles = (s)=>({
  bg: s==='approved' ? '#ECFDF5' : s==='pending' ? '#FFF7ED' : '#FEF2F2',
  fg: s==='approved' ? C.ok : s==='pending' ? '#F59E0B' : C.danger,
  label: s[0].toUpperCase()+s.slice(1),
});

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
        size={18}
        color="#fff"
        style={{ marginRight:8 }}
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
  const [filter, setFilter] = useState('all'); // all | approved | pending | rejected
  const [items, setItems] = useState(DEMO);

  // modals
  const [formOpen, setFormOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toDelete, setToDelete] = useState(null);

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
  },[]);

  const onRefresh = ()=>{
    setRefreshing(true); setLoading(true);
    setTimeout(()=>{ setRefreshing(false); setLoading(false); }, 900);
  };

  const filtered = useMemo(()=>{
    const q = query.trim().toLowerCase();
    return items.filter(r=>{
      const okStatus = filter==='all' ? true : r.status===filter;
      const okQ = !q || r.name.toLowerCase().includes(q) || r.address.toLowerCase().includes(q);
      return okStatus && okQ;
    });
  },[items, query, filter]);

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

  const saveForm = ()=>{
    if(!form.name || !form.address){
      show('Please enter name & address', 'error');
      return;
    }
    const payload = {
      id: form.id || ('r'+(Math.random()*1e6|0)),
      name: form.name, address: form.address, fssai: form.fssai, desc: form.desc,
      status: form.id ? (items.find(x=>x.id===form.id)?.status||'pending') : 'pending',
      servicesCount: form.id ? (items.find(x=>x.id===form.id)?.servicesCount||0) : 0,
      expense: form.id ? (items.find(x=>x.id===form.id)?.expense||0) : 0,
      fssaiPdf: form.fssaiPdf || '',
      photos: [form.main, form.img1, form.img2, form.img3, form.card],
    };

    setItems(prev => {
      const exists = prev.some(p=>p.id===payload.id);
      return exists ? prev.map(p=>p.id===payload.id ? payload : p) : [payload, ...prev];
    });
    setFormOpen(false);
    show(form.id ? 'Changes saved' : 'Restaurant added', 'success');
  };

  const askDelete = (r)=>{ setToDelete(r); setConfirmOpen(true); };
  const doDelete = ()=>{
    if (toDelete) {
      setItems(prev=>prev.filter(x=>x.id!==toDelete.id));
      show('Restaurant deleted', 'success');
    }
    setConfirmOpen(false); setToDelete(null);
  };

  // pickers
  const pickImage = async (key)=>{
    try {
      const res = await launchImageLibrary({
        mediaType:'photo',
        selectionLimit:1,
        includeBase64:false,
        quality:0.9
      });
      if (res?.assets?.length) {
        const uri = res.assets[0].uri || '';
        setForm(f=>({...f,[key]:uri}));
      }
    } catch {}
  };

  const pickMultipleImages = async ()=>{
    try {
      const res = await launchImageLibrary({
        mediaType:'photo',
        selectionLimit:3,
        includeBase64:false,
        quality:0.9
      });
      if (res?.assets?.length) {
        const uris = res.assets.map(a=>a.uri).filter(Boolean);
        setForm(f=>({
          ...f,
          img1: uris[0] || '',
          img2: uris[1] || '',
          img3: uris[2] || '',
        }));
      }
    } catch {}
  };

  const pickPDF = async ()=>{
    try{
      const [file] = await pick({ types: [types.pdf] });
      if (file?.uri) {
        setForm(f=>({...f, fssaiPdf: file.uri, fssaiPdfName: file.name || getFilenameFromUri(file.uri) }));
        show('PDF selected', 'success');
      }
    }catch(e){}
  };

  const openPdf = async (url)=>{
    try{
      const ok = await Linking.canOpenURL(url);
      if (!ok) show('Could not open PDF', 'error');
      else Linking.openURL(url);
    }catch{
      show('Could not open PDF', 'error');
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
      <View style={[st.header,{paddingTop:6}]}>
        <TouchableOpacity onPress={()=>navigation.goBack?.()} style={st.hBtn}><Icon name="chevron-back" size={20} color={C.ink}/></TouchableOpacity>
        <Text style={st.hTitle}>Restaurants</Text>
        <TouchableOpacity onPress={()=>startEdit(null)} style={st.hBtn}><Icon name="add" size={20} color={C.ink}/></TouchableOpacity>
      </View>

      {/* Search + Filters */}
      <View style={{paddingHorizontal:16}}>
        <View style={st.searchWrap}>
          <Icon name="search" size={18} color="#94A3B8"/>
          <TextInput
            placeholder="Search restaurants..."
            placeholderTextColor="#94A3B8"
            value={query}
            onChangeText={setQuery}
            style={st.searchInput}
          />
          {!!query && (
            <TouchableOpacity onPress={()=>setQuery('')} style={st.clearBtn}>
              <Icon name="close-circle" size={18} color="#B0B8C4"/>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingVertical:10}}>
          {['all','approved','pending','rejected'].map(s=>{
            const on = filter===s;
            const ss = statusStyles(s==='all'?'approved':s);
            const icon = s==='approved'?'checkmark-circle' : s==='pending'?'time-outline' : s==='rejected'?'close-circle' : 'grid';
            return (
              <TouchableOpacity key={s} onPress={()=>setFilter(s)} style={[st.filterChip, on&&{borderColor:ss.fg, backgroundColor:ss.bg}]}>
                <Icon name={s==='all'?'grid':icon} size={14} color={on?ss.fg:'#64748B'}/>
                <Text style={[st.filterTxt,on&&{color:ss.fg}]}>{s==='all'?'All':ss.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* List */}
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} tintColor={C.primary}/>}
        contentContainerStyle={{ padding:16, paddingBottom: insets.bottom + 24 }}
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
              onFSSAI={()=> openPdf(r.fssaiPdf) }
              onDelete={()=>askDelete(r)}
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
              <TouchableOpacity onPress={()=>setFormOpen(false)} style={st.close}><Icon name="close" size={18} color={C.ink}/></TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Basic fields */}
              {[
                {key:'name',    label:'Name',      icon:'business-outline', placeholder:'Restaurant name'},
                {key:'address', label:'Address',   icon:'location-outline', placeholder:'Full address'},
                {key:'fssai',   label:'FSSAI No.', icon:'document-text-outline', placeholder:'14-digit FSSAI'},
                {key:'desc',    label:'Tagline / Description', icon:'reader-outline', placeholder:'Short description'},
              ].map(f=>(
                <View key={f.key} style={{marginBottom:12}}>
                  <Text style={st.inputLbl}>{f.label}</Text>
                  <View style={st.inputWrap}>
                    <Icon name={f.icon} size={16} color="#9CA3AF" />
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

              {/* --- Redesigned pickers (no URL fields) --- */}
              <Text style={[st.inputLbl,{marginTop:6}]}>Images</Text>

              {/* Main image */}
              <View style={{marginBottom:12}}>
                <Text style={st.subLbl}>Main Image</Text>
                <View style={{flexDirection:'row', alignItems:'center', gap:10}}>
                  <TouchableOpacity onPress={()=>pickImage('main')} style={st.previewWrap}>
                    {form.main ? (
                      <Image source={{uri:form.main}} style={st.previewImg}/>
                    ) : (
                      <View style={st.previewEmpty}><Icon name="image-outline" size={20} color="#9CA3AF"/></View>
                    )}
                  </TouchableOpacity>
                  {!!form.main && (
                    <TouchableOpacity onPress={()=>clearImg('main')} style={st.outlineMini}>
                      <Icon name="close-circle" size={16} color={C.danger}/>
                      <Text style={st.outlineMiniTxt}>Clear</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={()=>pickImage('main')} style={st.pickerBtn}>
                    <Icon name="images-outline" size={16} color="#fff"/><Text style={st.pickerTxt}>Pick</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* 3 gallery images */}
              <View style={{marginBottom:12}}>
                <Text style={st.subLbl}>Gallery Images (up to 3)</Text>
                <View style={{flexDirection:'row', alignItems:'center', gap:10}}>
                  {[{k:'img1'},{k:'img2'},{k:'img3'}].map((slot)=>(
                    <TouchableOpacity key={slot.k} onPress={pickMultipleImages} style={st.previewWrap}>
                      {form[slot.k] ? (
                        <Image source={{uri:form[slot.k]}} style={st.previewImg}/>
                      ) : (
                        <View style={st.previewEmpty}><Icon name="image-outline" size={20} color="#9CA3AF"/></View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={{flexDirection:'row', gap:10, marginTop:8}}>
                  <TouchableOpacity onPress={pickMultipleImages} style={st.pickerBtn}>
                    <Icon name="images-outline" size={16} color="#fff"/><Text style={st.pickerTxt}>Pick 1–3</Text>
                  </TouchableOpacity>
                  {(form.img1||form.img2||form.img3) ? (
                    <TouchableOpacity onPress={()=>setForm(f=>({...f, img1:'', img2:'', img3:''}))} style={st.outlineMini}>
                      <Icon name="close-circle" size={16} color={C.danger}/>
                      <Text style={st.outlineMiniTxt}>Clear all</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>

              {/* Business card */}
              <View style={{marginBottom:12}}>
                <Text style={st.subLbl}>Business Card Image</Text>
                <View style={{flexDirection:'row', alignItems:'center', gap:10}}>
                  <TouchableOpacity onPress={()=>pickImage('card')} style={st.previewWrap}>
                    {form.card ? (
                      <Image source={{uri:form.card}} style={st.previewImg}/>
                    ) : (
                      <View style={st.previewEmpty}><Icon name="image-outline" size={20} color="#9CA3AF"/></View>
                    )}
                  </TouchableOpacity>
                  {!!form.card && (
                    <TouchableOpacity onPress={()=>clearImg('card')} style={st.outlineMini}>
                      <Icon name="close-circle" size={16} color={C.danger}/>
                      <Text style={st.outlineMiniTxt}>Clear</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={()=>pickImage('card')} style={st.pickerBtn}>
                    <Icon name="images-outline" size={16} color="#fff"/><Text style={st.pickerTxt}>Pick</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* PDF picker */}
              <Text style={[st.inputLbl,{marginTop:6}]}>FSSAI certificate (PDF)</Text>
              <View style={{gap:8, marginBottom:12}}>
                <View style={{flexDirection:'row', alignItems:'center', gap:10}}>
                  <TouchableOpacity onPress={pickPDF} style={[st.pdfIcon,{backgroundColor:'#FFF1F1'}]}>
                    <Icon name="document-text-outline" size={20} color={C.primary}/>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={pickPDF} style={st.pickerBtn}>
                    <Icon name="document-text-outline" size={16} color="#fff"/>
                    <Text style={st.pickerTxt}>Pick PDF</Text>
                  </TouchableOpacity>
                  {!!form.fssaiPdf && (
                    <TouchableOpacity onPress={()=>setForm(f=>({...f, fssaiPdf:'', fssaiPdfName:''}))} style={st.outlineMini}>
                      <Icon name="close-circle" size={16} color={C.danger}/>
                      <Text style={st.outlineMiniTxt}>Clear</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {!!form.fssaiPdfName && (
                  <View style={st.filePill}>
                    <Icon name="document-attach-outline" size={14} color="#0F172A" />
                    <Text style={st.filePillTxt} numberOfLines={1}>{form.fssaiPdfName}</Text>
                  </View>
                )}
              </View>

              <TouchableOpacity onPress={saveForm} style={[st.primaryBtn,{marginTop:10}]}>
                <Text style={st.primaryTxt}>{form?.id?'Save changes':'Add hotel'}</Text>
              </TouchableOpacity>
              <View style={{height:8}}/>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* DELETE CONFIRM MODAL */}
      <Modal visible={confirmOpen} transparent animationType="fade" onRequestClose={()=>setConfirmOpen(false)}>
        <View style={st.overlay}>
          <View style={st.confirmCard}>
            <View style={{alignItems:'center'}}>
              <View style={st.warnIcon}><Icon name="trash-outline" size={20} color="#fff"/></View>
              <Text style={st.confirmTitle}>Delete hotel?</Text>
              <Text style={st.confirmSub}>This will permanently remove “{toDelete?.name}”.</Text>
            </View>
            <View style={{flexDirection:'row', gap:10, marginTop:14}}>
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
  }, []);

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
      <View style={{ padding: 12 }}>
        <Animated.View style={[st.skelTitleLine, { opacity: pulse }]} />
        <Animated.View style={[st.skelAddrLine, { opacity: pulse }]} />
        <Animated.View style={[st.skelDescLine, { opacity: pulse }]} />
        <Animated.View style={[st.skelDescLineShort, { opacity: pulse }]} />

        <View style={st.metaRow}>
          <View style={st.skelMetaChip} />
          <View style={[st.skelMetaChip, { width: 120 }]} />
          <View style={{ flex: 1 }} />
          <View style={{ width: 80, height: 20 }} />
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
          <View style={[st.skelActionPill, { width: 90 }]} />
          <View style={[st.skelActionPill, { width: 90 }]} />
          <View style={[st.skelActionPill, { width: 100 }]} />
        </View>
      </View>
    </View>
  );
}

/* ---------------------- SUB-COMPS ---------------------- */
function RestaurantCard({ r, onView, onEdit, onDelete, onFSSAI }) {
  const s = statusStyles(r.status);
  return (
    <View style={st.card}>
      {/* Media */}
      <View style={{position:'relative'}}>
        <Image source={{uri:r.photos[0]}} style={st.mainImg}/>
        {/* thumb strips */}
        <View style={st.thumbRow}>
          {[r.photos[1], r.photos[2]].filter(Boolean).map((u, i)=>(
            <View key={i} style={st.thumbWrap}>
              <Image source={{uri:u}} style={st.thumb}/>
            </View>
          ))}
          {!!r.photos[4] && (
            <View style={st.thumbWrap}>
              <Image source={{uri:r.photos[4]}} style={st.thumb}/>
              <View style={st.moreOverlay}><Text style={st.moreTxt}>+2</Text></View>
            </View>
          )}
        </View>
        <View style={[st.statusPill,{backgroundColor:s.bg}]}>
          <Icon name={r.status==='approved'?'checkmark-circle':r.status==='pending'?'time-outline':'close-circle'} size={14} color={s.fg}/>
          <Text style={[st.statusTxt,{color:s.fg}]}>{s.label}</Text>
        </View>
      </View>

      {/* Content */}
      <View style={{padding:12}}>
        <Text style={st.title} numberOfLines={1}>{r.name}</Text>
        <Text style={st.addr} numberOfLines={1}>{r.address}</Text>
        <Text style={st.desc} numberOfLines={2}>{r.desc}</Text>

        <View style={st.metaRow}>
          <View style={st.metaChip}><Icon name="repeat-outline" size={14} color={C.ink}/><Text style={st.metaTxt}>{r.servicesCount}</Text></View>
          <View style={st.metaChip}><Icon name="cash-outline" size={14} color={C.ink}/><Text style={st.metaTxt}>{money(r.expense)}</Text></View>
          <View style={{flex:1}}/>
          <TouchableOpacity onPress={onView} style={st.linkBtn}><Text style={st.linkTxt}>View</Text><Icon name="chevron-forward" size={16} color={C.primary}/></TouchableOpacity>
        </View>

        <View style={{flexDirection:'row', flexWrap:'wrap', gap:10, marginTop:10}}>
          <TouchableOpacity onPress={onEdit} style={st.actionMini}><Icon name="create-outline" size={16} color={C.primary}/><Text style={st.actionTxt}>Edit</Text></TouchableOpacity>
          <TouchableOpacity onPress={onFSSAI} style={[st.actionMini,{backgroundColor:'#EEF2FF',borderColor:'#DBEAFE'}]}>
            <Icon name="document-outline" size={16} color="#475569"/><Text style={[st.actionTxt,{color:'#1E293B'}]}>FSSAI</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete} style={[st.actionMini,{backgroundColor:'#FEF2F2',borderColor:'#FCA5A5'}]}>
            <Icon name="trash-outline" size={16} color={C.danger}/><Text style={[st.actionTxt,{color:C.danger}]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

/* ---------------------- STYLES ---------------------- */
const st = StyleSheet.create({
  header:{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingBottom:8 },
  hBtn:{ width:38, height:38, borderRadius:12, borderWidth:1, borderColor:'#EEF2F7', backgroundColor:'#fff', alignItems:'center', justifyContent:'center' },
  hTitle:{ color:C.ink, fontWeight:'900', fontSize:24 },

  searchWrap:{ flexDirection:'row', alignItems:'center', backgroundColor:'#fff', borderRadius:999, paddingHorizontal:14, borderWidth:1, borderColor:'#E5E7EB', height:48, shadowColor:'#000', shadowOpacity:0.04, shadowRadius:8, elevation:2 },
  searchInput:{ flex:1, marginLeft:10, color:C.ink },
  clearBtn:{ marginLeft:6 },

  filterChip:{ flexDirection:'row', alignItems:'center', gap:6, paddingHorizontal:12, paddingVertical:8, borderRadius:999, borderWidth:1, borderColor:'#E5E7EB', backgroundColor:'#fff', marginRight:8 },
  filterTxt:{ color:'#334155', fontWeight:'800', fontSize:12 },

  card:{ backgroundColor:C.card, borderRadius:R, borderWidth:1, borderColor:'#EEF2F7', overflow:'hidden', marginBottom:14, shadowColor:'#000', shadowOpacity:0.04, shadowRadius:8, elevation:3 },
  mainImg:{ width:'100%', height:180 },

  thumbRow:{ position:'absolute', right:12, bottom:12, flexDirection:'row', gap:8 },
  thumbWrap:{ width:56, height:56, borderRadius:12, backgroundColor:'#fff', padding:2,
    borderWidth:1, borderColor:'#E2E8F0', shadowColor:'#000', shadowOpacity:0.12, shadowRadius:6, elevation:4, overflow:'hidden' },
  thumb:{ width:'100%', height:'100%', borderRadius:10 },
  moreOverlay:{ ...StyleSheet.absoluteFillObject, backgroundColor:'rgba(0,0,0,0.45)', alignItems:'center', justifyContent:'center', borderRadius:10 },
  moreTxt:{ color:'#fff', fontWeight:'900', fontSize:12 },

  statusPill:{ position:'absolute', left:12, top:12, flexDirection:'row', alignItems:'center', gap:6, paddingHorizontal:12, paddingVertical:6, borderRadius:999 },
  statusTxt:{ fontWeight:'800', fontSize:12 },

  title:{ color:C.text, fontWeight:'900', fontSize:20, marginTop:6 },
  addr:{ color:C.muted, marginTop:2 },
  desc:{ color:C.text, marginTop:6 },
  metaRow:{ flexDirection:'row', alignItems:'center', marginTop:10 },
  metaChip:{ flexDirection:'row', alignItems:'center', backgroundColor:'#F8FAFC', borderWidth:1, borderColor:'#EEF2F7', paddingHorizontal:10, paddingVertical:6, borderRadius:999, marginRight:8 },
  metaTxt:{ color:C.ink, fontWeight:'800', fontSize:12 },
  linkBtn:{ flexDirection:'row', alignItems:'center' },
  linkTxt:{ color:C.primary, fontWeight:'900', marginRight:4 },
  actionMini:{ flexDirection:'row', alignItems:'center', gap:6, backgroundColor:'#FFF1F1', borderWidth:1, borderColor:'#FECACA', paddingHorizontal:12, paddingVertical:10, borderRadius:12 },
  actionTxt:{ color:C.primary, fontWeight:'900' },

  // modal shells
  overlay:{ flex:1, backgroundColor:'rgba(0,0,0,0.35)', alignItems:'center', justifyContent:'center', paddingHorizontal:16 },
  modalCard:{ width: W*0.9, maxWidth: 560, height: H*0.7, backgroundColor:'#fff', borderRadius:R, padding:16, borderWidth:1, borderColor:'#EEF2F7' },
  modalHeader:{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:8 },
  modalTitle:{ color:C.ink, fontWeight:'900', fontSize:18 },
  close:{ width:36, height:36, borderRadius:12, backgroundColor:'#F3F4F6', alignItems:'center', justifyContent:'center' },

  inputLbl:{ color:C.muted, marginBottom:6, fontSize:12, fontWeight:'700' },
  subLbl:{ color:'#64748B', marginBottom:6, fontSize:12, fontWeight:'700' },

  inputWrap:{ backgroundColor:'#fff', borderRadius:12, borderWidth:1, borderColor:'#EEF2F7', paddingHorizontal:10, paddingVertical:10, flexDirection:'row', alignItems:'center' },
  inputField:{ marginLeft:8, color:C.text, flex:1 },

  pickRow:{ flexDirection:'row', alignItems:'center', gap:8 },
  previewWrap:{ width:72, height:72, borderRadius:12, borderWidth:2, borderColor:'#fff',
    shadowColor:'#000', shadowOpacity:0.12, shadowRadius:6, elevation:4, overflow:'hidden', backgroundColor:'#F1F5F9', alignItems:'center', justifyContent:'center' },
  previewImg:{ width:'100%', height:'100%' },
  previewEmpty:{ flex:1, alignItems:'center', justifyContent:'center' },

  pdfIcon:{ width:56, height:56, borderRadius:12, borderWidth:2, borderColor:'#fff', backgroundColor:'#FFF1F1', alignItems:'center', justifyContent:'center',
    shadowColor:'#000', shadowOpacity:0.12, shadowRadius:6, elevation:4 },

  pickerBtn:{ flexDirection:'row', alignItems:'center', gap:6, backgroundColor:C.primary, paddingHorizontal:12, paddingVertical:10, borderRadius:12 },
  pickerTxt:{ color:'#fff', fontWeight:'900' },

  outlineMini:{ flexDirection:'row', alignItems:'center', gap:6, borderWidth:1, borderColor:'#CBD5E1', paddingHorizontal:10, paddingVertical:8, borderRadius:12, backgroundColor:'#fff' },
  outlineMiniTxt:{ color:'#334155', fontWeight:'800', fontSize:12 },

  primaryBtn:{ backgroundColor:C.primary, borderRadius:14, paddingVertical:12, alignItems:'center' },
  primaryTxt:{ color:'#fff', fontWeight:'900' },

  // file pill (PDF name)
  filePill:{ flexDirection:'row', alignItems:'center', gap:6, backgroundColor:'#F1F5F9', borderWidth:1, borderColor:'#E2E8F0', paddingVertical:8, paddingHorizontal:10, borderRadius:10, maxWidth:'100%' },
  filePillTxt:{ color:'#0F172A', fontWeight:'700', flexShrink:1 },

  // confirm
  confirmCard:{ width:W*0.85, maxWidth:500, backgroundColor:'#fff', borderRadius:R, padding:16, borderWidth:1, borderColor:'#EEF2F7' },
  warnIcon:{ width:44, height:44, borderRadius:14, backgroundColor:C.danger, alignItems:'center', justifyContent:'center', marginBottom:8 },
  confirmTitle:{ color:C.ink, fontWeight:'900', fontSize:18 },
  confirmSub:{ color:C.muted, textAlign:'center', marginTop:6 },

  outlineBtn:{ borderWidth:1, borderColor:'#CBD5E1', borderRadius:12, paddingVertical:12, alignItems:'center' },
  outlineTxt:{ color:'#334155', fontWeight:'900' },
  dangerBtn:{ backgroundColor:'#FEE2E2', borderColor:'#FECACA', borderWidth:1, borderRadius:12, paddingVertical:12, alignItems:'center' },
  dangerTxt:{ color:C.danger, fontWeight:'900' },

  /* ====== SKELETON (mirrors real card) ====== */
  skelHero: {
    width: '100%',
    height: 180,
    backgroundColor: '#E9EEF5',
    position: 'relative',
  },
  skelStatusPill: {
    position: 'absolute',
    left: 12,
    top: 12,
    height: 28,
    width: 98,
    borderRadius: 999,
    backgroundColor: '#E6EEF7',
  },
  skelThumbRow: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    flexDirection: 'row',
    gap: 8,
  },
  skelThumb: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  skelThumbMore: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  skelTitleLine: {
    marginTop: 6,
    height: 18,
    borderRadius: 6,
    backgroundColor: '#E9EEF5',
    width: '70%',
  },
  skelAddrLine: {
    marginTop: 8,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E9EEF5',
    width: '55%',
  },
  skelDescLine: {
    marginTop: 8,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E9EEF5',
    width: '95%',
  },
  skelDescLineShort: {
    marginTop: 6,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E9EEF5',
    width: '80%',
  },

  skelMetaChip: {
    height: 28,
    width: 90,
    borderRadius: 999,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#EEF2F7',
    marginRight: 8,
  },

  skelActionPill: {
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  // Toast
  toastWrap:{
    position:'absolute',
    bottom:24,
    alignSelf:'center',
    maxWidth: W*0.9,
    borderRadius:14,
    paddingVertical:10,
    paddingHorizontal:14,
    flexDirection:'row',
    alignItems:'center',
    shadowColor:'#000',
    shadowOpacity:0.15,
    shadowRadius:12,
    elevation:6,
  },
  toastTxt:{ color:'#fff', fontWeight:'800', flexShrink:1 }
});
