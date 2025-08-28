import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ImageBackground, Animated, Easing,
  TouchableOpacity, ScrollView, FlatList, Share, useWindowDimensions
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';

/* ---------- THEME ---------- */
const C = {
  primary: '#EF3A3A',
  ink: '#1D2254',
  bg: '#F5F7FA',
  card: '#FFFFFF',
  text: '#0F172A',
  muted: '#6B7280',
  border: '#E5E7EB',
  ok: '#10B981',
  warn: '#F59E0B',
  danger: '#EF4444',
};
const R = 18;

/* ---------- DEMO DATA ---------- */
const storyImages = [
  'https://s3-us-west-2.amazonaws.com/speedybrandimages/tmp_ba6cd8e2-3942-4d4b-bebc-a273130e6b29.webp',
  'https://lh7-us.googleusercontent.com/XnO7uPqhk93Z8VpWwyunmyz-B6vQXHRGShqFA_8tS2xNZR2xg90_RFTl-_QwAFSwJcYltOkAD7Y2yDuq_TKktOXFb_knhmfNdHo4jvZLAy25g1F8jtQ1NRQ9DeIWZQp8JBc6yXDcILNn4C_dWHR9k4o',
  'https://lh7-us.googleusercontent.com/XpqpI8PT6wddRnj9CFheJzaFKx-7fL5FIuT6bQLUWg2iJTozxzVJqQ16rT7V805-QB-1uzUVkZ24vdcky8-iLw4ae6iAQTQ7Gts2x7D__j30b454ttxOv1gxtkWljwDUOAZIN2V8xIf3bRqrFdf3uXU',
  'https://fixitrightappliances.ca/wp-content/uploads/2024/04/A-busy-commercial-kitchen-repair-scene-showing-an-array-of-diverse-refrigerators-open-with-their-mechanics-visible.-Various-tools-are-scattered-around-1-1024x585.webp',
  'https://fixitrightappliances.ca/wp-content/uploads/2024/04/A-detailed-depiction-of-a-commercial-refrigerator-repair-scene-in-a-wide-format.-The-image-shows-a-skilled-technician-wearing-a-uniform-and-equipped-1.webp',
];

const servicesCatalog = [
  { id: 's1', name: 'Site Visit', price: 499 },
  { id: 's2', name: 'Compressor Service', price: 1299 },
  { id: 's3', name: 'Gas Refill', price: 1699 },
  { id: 's4', name: 'Thermostat Change', price: 899 },
  { id: 's5', name: 'Door Seal', price: 999 },
  { id: 's6', name: 'Evaporator Clean', price: 749 },
  { id: 's7', name: 'Condenser Clean', price: 699 },
  { id: 's8', name: 'Fan / Motor', price: 1199 },
  { id: 's9', name: 'PCB Repair', price: 1999 },
  { id: 's10', name: 'Deep Cleaning', price: 1499 },
];

const included = ['Multi-point inspection', 'Basic exterior clean', 'Minor tuning', 'Completion photos'];
const excluded = ['Major spares', 'Civil/electrical work', 'Inaccessible units'];
const conditions = [
  'Final price post diagnosis & your approval.',
  '3-month labor warranty (no warranty on consumables).',
  'Visit fee adjusted in final bill if service taken.',
];

const processSteps = [
  { icon: 'apps-outline', title: 'Raise Request', desc: 'Pick services & submit.' },
  { icon: 'construct-outline', title: 'Assign Pro', desc: 'Nearest certified tech scheduled.' },
  { icon: 'build-outline', title: 'On-site Work', desc: 'Diagnosis + transparent fix.' },
  { icon: 'card-outline', title: 'Pay & Rate', desc: 'UPI/QR & share feedback.' },
];

const technicians = [
  { id: 't1', name: 'Rahul S.', rating: 4.9, jobs: 420, avatar: 'https://images.squarespace-cdn.com/content/v1/678f9a713a805330c4de6d72/a3a245ea-d8f7-4a32-b3bd-f4b7c3b7bca6/maintenance-technician-jobs.png' },
  { id: 't2', name: 'Mehul K.', rating: 4.8, jobs: 380, avatar: 'https://t4.ftcdn.net/jpg/12/05/94/93/360_F_1205949339_E8zyVq7QPO5CrbGmNfQibo7TLJjiryW0.jpg' },
  { id: 't3', name: 'Sana P.', rating: 4.7, jobs: 310, avatar: 'https://img.freepik.com/premium-photo/confident-young-plumber-holding-wrench-smiling-camera_818261-33324.jpg' },
];

const faqs = [
  { id: 'f1', q: 'How soon can I get a visit?', a: 'Usually within 4–8 working hours in metro cities.' },
  { id: 'f2', q: 'Do you use genuine spares?', a: 'Yes, OEM or high-quality compatible parts with bill.' },
  { id: 'f3', q: 'If I don’t go ahead?', a: 'Only the diagnostic/visit fee is applicable.' },
];

const reviews = [
  { id: 'r1', name: 'Sourabh', stars: 5, text: 'Walk-in cooling back in 1 hour. Superb!' },
  { id: 'r2', name: 'Aarti', stars: 4, text: 'Clean work & transparent pricing.' },
  { id: 'r3', name: 'Vikram', stars: 5, text: 'Explained everything + great tips.' },
];

/* ---------- UTILS ---------- */
const Rs = (n) => `₹ ${n.toLocaleString('en-IN')}`;
const Stars = ({ value, size = 12 }) => (
  <View style={{ flexDirection: 'row' }}>
    {Array.from({ length: 5 }).map((_, i) => (
      <Icon key={i} name={i < Math.round(value) ? 'star' : 'star-outline'} size={size} color="#F59E0B" />
    ))}
  </View>
);

/* ---------- FAQ ITEM ---------- */
const FAQItem = React.memo(({ f }) => {
  const [open, setOpen] = useState(false);
  return (
    <View style={st.faqItem}>
      <TouchableOpacity style={st.faqHead} onPress={() => setOpen((o) => !o)}>
        <Text style={st.faqQ}>{f.q}</Text>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={18} color={C.ink} />
      </TouchableOpacity>
      {open && <Text style={st.faqA}>{f.a}</Text>}
    </View>
  );
});

/* ---------- SKELETON ---------- */
function SkeletonRequestDetail({ insetsBottom, width }) {
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

  const ServiceChip = () => (
    <View style={[st.serviceChip, { width: Math.min(240, width * 0.7) }]}>
      <View style={{ flex: 1 }}>
        <Animated.View style={[sk.lineMd, { width: '70%', opacity: pulse }]} />
        <Animated.View style={[sk.lineSm, { width: 80, marginTop: 6, opacity: pulse }]} />
      </View>
      <Animated.View style={[sk.btnPill, { opacity: pulse }]} />
    </View>
  );

  const TechCard = () => (
    <View style={st.techCard}>
      <Animated.View style={[sk.avatar, { opacity: pulse }]} />
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Animated.View style={[sk.lineMd, { width: '70%', opacity: pulse }]} />
        <Animated.View style={[sk.lineXs, { width: 90, marginTop: 6, opacity: pulse }]} />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top','left','right']}>
      {/* HERO skeleton with actions, progress, title band & rating pill */}
      <View style={{ backgroundColor: C.card, borderBottomLeftRadius: R, borderBottomRightRadius: R, overflow: 'hidden' }}>
        <Animated.View style={[sk.hero, { opacity: pulse }]} />
        <View style={[st.actionsWrap, { paddingTop: 8 }]}>
          <View style={sk.glassBtn} />
          <View style={[sk.glassBtn, { marginLeft: 8 }]} />
        </View>
        <View style={{ position: 'absolute', left: '5%', right: '5%', bottom: 70, height: 4, backgroundColor: '#FFFFFF55', borderRadius: 3 }} />
        <View style={st.heroBottom}>
          <View style={{ flex: 1 }}>
            <Animated.View style={[sk.lineLg, { width: '60%', opacity: pulse }]} />
            <Animated.View style={[sk.lineSm, { width: 140, marginTop: 6, opacity: pulse }]} />
          </View>
          <View style={sk.ratingPill} />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insetsBottom + 100 }} showsVerticalScrollIndicator={false}>
        {/* About */}
        <View style={st.section}>
          <Animated.View style={[sk.h2, { width: 100, opacity: pulse }]} />
          <Animated.View style={[sk.para, { width: '95%', marginTop: 8, opacity: pulse }]} />
          <Animated.View style={[sk.para, { width: '85%', marginTop: 6, opacity: pulse }]} />
        </View>

        {/* Services chips */}
        <View style={st.section}>
          <Animated.View style={[sk.h2, { width: 130, opacity: pulse }]} />
          <Animated.View style={[sk.lineXs, { width: 220, marginTop: 6, opacity: pulse }]} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 16, marginTop: 10 }}>
            {[0,1,2].map(i => <ServiceChip key={i} />)}
          </ScrollView>
        </View>

        {/* Included / Not Included */}
        <View style={st.section}>
          <Animated.View style={[sk.h2, { width: 160, opacity: pulse }]} />
          <View style={st.wrapPills}>
            {[0,1,2].map(i => <View key={`in-${i}`} style={[sk.pill, { backgroundColor:'#ECFDF5', borderColor:'#D1FAE5' }]} />)}
          </View>

          <Animated.View style={[sk.h2, { width: 140, marginTop: 14, opacity: pulse }]} />
          <View style={st.wrapPills}>
            {[0,1,2].map(i => <View key={`ex-${i}`} style={[sk.pill, { backgroundColor:'#FFF1F1', borderColor:'#FEE2E2' }]} />)}
          </View>
        </View>

        {/* Conditions */}
        <View style={st.section}>
          <Animated.View style={[sk.h2, { width: 120, opacity: pulse }]} />
          {[0,1,2].map(i=>(
            <View key={i} style={{ flexDirection:'row', marginBottom:10, marginTop: i===0?8:0 }}>
              <View style={sk.iconWarn} />
              <Animated.View style={[sk.para, { width:'85%', marginLeft:8, opacity:pulse }]} />
            </View>
          ))}
        </View>

        {/* Process stepper */}
        <View style={st.section}>
          <Animated.View style={[sk.h2, { width: 120, opacity: pulse }]} />
          <View style={{ marginTop: 4 }}>
            {[0,1,2,3].map((i)=>(
              <View key={i} style={st.stepRow}>
                <View style={st.stepRail}>
                  <View style={sk.dot} />
                  {i<3 && <View style={st.stepLine} />}
                </View>
                <View style={st.stepCard}>
                  <View style={sk.stepIcon} />
                  <View style={{ flex:1 }}>
                    <Animated.View style={[sk.lineMd, { width:'60%', opacity:pulse }]} />
                    <Animated.View style={[sk.lineSm, { width:'80%', marginTop:6, opacity:pulse }]} />
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Technicians grid */}
        <View style={st.section}>
          <Animated.View style={[sk.h2, { width: 150, opacity: pulse }]} />
          <View style={{ flexDirection:'row', gap:10, marginTop:8 }}>
            <View style={{ flex:1 }}><TechCard/></View>
            <View style={{ flex:1 }}><TechCard/></View>
          </View>
        </View>

        {/* FAQs */}
        <View style={st.section}>
          <Animated.View style={[sk.h2, { width: 70, opacity: pulse }]} />
          {[0,1,2].map(i=>(
            <View key={i} style={st.faqItem}>
              <Animated.View style={[sk.lineMd, { width:'70%', opacity:pulse }]} />
              <Animated.View style={[sk.para, { width:'95%', marginTop:8, opacity:pulse }]} />
            </View>
          ))}
        </View>

        {/* Reviews */}
        <View style={st.section}>
          <Animated.View style={[sk.h2, { width: 90, opacity: pulse }]} />
          {[0,1,2].map(i=>(
            <View key={i} style={st.revCard}>
              <Animated.View style={[sk.lineMd, { width:'40%', opacity:pulse }]} />
              <Animated.View style={[sk.para, { width:'90%', marginTop:8, opacity:pulse }]} />
            </View>
          ))}
          <View style={sk.outlineBtn} />
        </View>

        {/* Provide */}
        <View style={st.section}>
          <Animated.View style={[sk.h2, { width: 150, opacity: pulse }]} />
          <View style={st.provideRow}>
            {[0,1,2,3].map(i=>(
              <View key={i} style={[st.provide,{ width:'48%' }]}>
                <View style={sk.provideIcon}/>
                <Animated.View style={[sk.lineSm, { width:'60%', opacity:pulse }]} />
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Sticky cart */}
      <View style={[st.cartBar, { paddingBottom: insetsBottom > 0 ? insetsBottom : 12 }]}>
        <View style={{ flex:1 }}>
          <Animated.View style={[sk.lineXs, { width: 120, opacity: pulse }]} />
          <Animated.View style={[sk.lineMd, { width: 80, marginTop:6, opacity: pulse }]} />
        </View>
        <View style={sk.primaryBtn} />
      </View>
    </SafeAreaView>
  );
}

/* ---------- MAIN ---------- */
export default function RequestDetail({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const item = route?.params?.item ?? {
    title: 'Commercial Fridge Service',
    category: 'Fridge',
    rating: 4.8,
    requests: 1225,
    desc: 'Cooling issues, gas refill, thermostat faults & preventive maintenance.',
  };

  /* HERO — single image + progress at bottom (90% width) */
  const [idx, setIdx] = useState(0);
  const bar = useRef(new Animated.Value(0)).current;
  const PROG = 10000;

  const run = useCallback(() => {
    bar.setValue(0);
    Animated.timing(bar, { toValue: 1, duration: PROG, easing: Easing.linear, useNativeDriver: false })
      .start(({ finished }) => { if (finished) setIdx((p) => (p + 1) % storyImages.length); });
  }, []);

  /* Skeleton + pause hero while skeleton is shown */
  const [loading, setLoading] = useState(true);
  const showSkel = loading;
  useEffect(() => { const t = setTimeout(() => setLoading(false), 700); return () => clearTimeout(t); }, []);
  useEffect(() => { bar.stopAnimation(); if (!showSkel) run(); return () => bar.stopAnimation(); }, [idx, showSkel, run]);

  /* Cart */
  const [cart, setCart] = useState({});
  const add = (id) => setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 }));
  const sub = (id) => setCart((c) => { const q = (c[id] || 0) - 1; const n = { ...c }; if (q <= 0) delete n[id]; else n[id] = q; return n; });
  const totals = useMemo(() => {
    let items = 0, amt = 0;
    servicesCatalog.forEach((s) => { const q = cart[s.id] || 0; items += q; amt += q * s.price; });
    return { items, amt };
  }, [cart]);

  const shareIt = async () => { try { await Share.share({ title: item.title, message: `${item.title} • ${item.category}\n${item.desc}\n\nKNI – Pro Kitchen Services` }); } catch {} };

  /* RENDER */
  if (showSkel) {
    return <SkeletonRequestDetail insetsBottom={insets.bottom} width={width} />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'left', 'right']}>
      {/* HERO */}
      <View style={{ backgroundColor: C.card, borderBottomLeftRadius: R, borderBottomRightRadius: R, overflow: 'hidden' }}>
        <ImageBackground source={{ uri: storyImages[idx] }} style={{ width: '100%', height: 260, justifyContent: 'flex-end' }}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.22)' }]} />

          {/* top right: compact glass action bar */}
          <View style={[st.actionsWrap, { paddingTop: 8 }]}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={st.glassBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="close" size={18} color={C.ink} />
            </TouchableOpacity>
            <TouchableOpacity onPress={shareIt} style={[st.glassBtn, { marginLeft: 8 }]}>
              <Icon name="share-social-outline" size={18} color={C.ink} />
            </TouchableOpacity>
          </View>

          {/* progress at bottom, 90% width */}
          <View style={{ position: 'absolute', left: '5%', right: '5%', bottom: 70, height: 4, backgroundColor: '#FFFFFF55', borderRadius: 3, overflow: 'hidden' }}>
            <Animated.View style={{ height: 4, width: bar.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }), backgroundColor: '#fff' }} />
          </View>

          {/* title strip */}
          <View style={st.heroBottom}>
            <View style={{ flex: 1 }}>
              <Text style={st.title}>{item.title}</Text>
              <Text style={st.subTitle}>{item.category} • {item.requests?.toLocaleString()} requests</Text>
            </View>
            <View style={st.ratingPill}><Icon name="star" size={14} color="#fff" /><Text style={st.ratingTxt}>{item.rating}</Text></View>
          </View>
        </ImageBackground>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 100 }} showsVerticalScrollIndicator={false}>
        {/* About */}
        <View style={st.section}>
          <Text style={st.sectionTitle}>About</Text>
          <Text style={st.desc}>{item.desc}</Text>
        </View>

        {/* Services — horizontal only */}
        <View style={st.section}>
          <Text style={st.sectionTitle}>Add services</Text>
          <Text style={st.sectionSub}>Shortlist what you need. You can edit before confirming.</Text>
          <FlatList
            horizontal
            data={servicesCatalog}
            keyExtractor={(s) => s.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingRight: 16 }}
            renderItem={({ item: s }) => {
              const q = cart[s.id] || 0;
              return (
                <View style={[st.serviceChip, { width: Math.min(240, width * 0.7) }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={st.serviceTitle}>{s.name}</Text>
                    <Text style={st.servicePrice}>{Rs(s.price)}</Text>
                  </View>
                  {q === 0 ? (
                    <TouchableOpacity onPress={() => add(s.id)} style={st.addBtnSm}>
                      <Icon name="add" size={18} color="#fff" /><Text style={st.addTxt}>Add</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={st.counterSm}>
                      <TouchableOpacity onPress={() => sub(s.id)} style={st.counterBtnSm}><Icon name="remove" size={18} color={C.primary} /></TouchableOpacity>
                      <Text style={st.qty}>{q}</Text>
                      <TouchableOpacity onPress={() => add(s.id)} style={st.counterBtnSm}><Icon name="add" size={18} color={C.primary} /></TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            }}
          />
        </View>

        {/* Included / Not included */}
        <View style={st.section}>
          <Text style={st.sectionTitle}>What’s included</Text>
          <View style={st.wrapPills}>
            {included.map((t, i) => (
              <View key={`in-${i}`} style={[st.pill, { backgroundColor: '#ECFDF5', borderColor: '#D1FAE5' }]}>
                <Icon name="checkmark-circle" size={16} color={C.ok} /><Text style={st.pillTxt}>{t}</Text>
              </View>
            ))}
          </View>

          <Text style={[st.sectionTitle, { marginTop: 14 }]}>Not included</Text>
          <View style={st.wrapPills}>
            {excluded.map((t, i) => (
              <View key={`ex-${i}`} style={[st.pill, { backgroundColor: '#FFF1F1', borderColor: '#FEE2E2' }]}>
                <Icon name="close-circle" size={16} color={C.danger} /><Text style={st.pillTxt}>{t}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Conditions */}
        <View style={st.section}>
          <Text style={st.sectionTitle}>Conditions</Text>
          {conditions.map((t, i) => (
            <View key={i} style={{ flexDirection: 'row', marginBottom: 10 }}>
              <Icon name="information-circle-outline" size={18} color={C.warn} />
              <Text style={[st.desc, { marginLeft: 8, marginTop: -2 }]}>{t}</Text>
            </View>
          ))}
        </View>

        {/* Process */}
        <View style={st.section}>
          <Text style={st.sectionTitle}>Our process</Text>
          <View style={st.stepper}>
            {processSteps.map((s, i) => (
              <View key={i} style={st.stepRow}>
                <View style={st.stepRail}>
                  <View style={st.stepDot}><Text style={st.stepNum}>{i + 1}</Text></View>
                  {i < processSteps.length - 1 && <View style={st.stepLine} />}
                </View>
                <View style={st.stepCard}>
                  <View style={st.stepIconWrap}><Icon name={s.icon} size={16} color={C.primary} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={st.stepTitle}>{s.title}</Text>
                    <Text style={st.stepDesc}>{s.desc}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Technicians */}
        <View style={st.section}>
          <Text style={st.sectionTitle}>Top technicians</Text>
          <FlatList
            data={technicians}
            keyExtractor={(t) => t.id}
            numColumns={2}
            columnWrapperStyle={{ gap: 10 }}
            contentContainerStyle={{ paddingBottom: 4 }}
            scrollEnabled={false}
            renderItem={({ item: t }) => (
              <View style={st.techCard}>
                <ImageBackground source={{ uri: t.avatar }} style={st.techPic} imageStyle={{ borderRadius: 12 }} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={st.techName}>{t.name}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                    <Stars value={t.rating} size={11} />
                    <Text style={st.techJobs}> • {t.jobs}</Text>
                  </View>
                </View>
              </View>
            )}
          />
        </View>

        {/* FAQs */}
        <View style={st.section}>
          <Text style={st.sectionTitle}>FAQs</Text>
          {faqs.map((f) => <FAQItem key={f.id} f={f} />)}
        </View>

        {/* Reviews */}
        <View style={st.section}>
          <Text style={st.sectionTitle}>Reviews</Text>
          {reviews.map((r) => (
            <View key={r.id} style={st.revCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={st.revName}>{r.name}</Text><Stars value={r.stars} />
              </View>
              <Text style={st.revTxt}>{r.text}</Text>
            </View>
          ))}
          <TouchableOpacity style={st.outlineBtn}><Text style={st.outlineTxt}>View all reviews</Text></TouchableOpacity>
        </View>

        {/* Provide */}
        <View style={st.section}>
          <Text style={st.sectionTitle}>What we provide</Text>
          <View style={st.provideRow}>
            {[
              { icon: 'shield-checkmark', label: 'KNI Verified' },
              { icon: 'medkit-outline', label: 'Genuine Spares' },
              { icon: 'timer-outline', label: 'Quick TAT' },
              { icon: 'document-text-outline', label: 'Digital Invoice' },
            ].map((p, i) => (
              <View key={i} style={st.provide}>
                <View style={st.provideIcon}><Icon name={p.icon} size={18} color={C.primary} /></View>
                <Text style={st.provideLbl}>{p.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Sticky cart */}
      <View style={[st.cartBar, { paddingBottom: insets.bottom > 0 ? insets.bottom : 12 }]}>
        <View style={{ flex: 1 }}>
          <Text style={st.cartTop}>{totals.items ? `${totals.items} item${totals.items > 1 ? 's' : ''}` : 'No items added'}</Text>
          <Text style={st.cartAmt}>{Rs(totals.amt)}</Text>
        </View>
        <TouchableOpacity
          disabled={!totals.items}
          style={[st.primaryBtn, !totals.items && { opacity: 0.5 }]}
          onPress={() => navigation.navigate('RequestNow')}
        >
          <Text style={st.primaryTxt}>{totals.items ? 'Request Now' : 'Select services'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

/* ---------- STYLES ---------- */
const st = StyleSheet.create({
  /* hero */
  actionsWrap: { position: 'absolute', top: 0, right: 12, flexDirection: 'row' },
  glassBtn: {
    backgroundColor: '#FFFFFFEE', width: 38, height: 38, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#FFFFFF99', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  heroBottom: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFFFFFEE' },
  title: { fontSize: 18, fontWeight: '800', color: C.ink },
  subTitle: { fontSize: 12, color: C.muted, marginTop: 2 },
  ratingPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.primary, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  ratingTxt: { color: '#fff', fontWeight: '700', marginLeft: 6, fontSize: 12 },

  /* sections */
  section: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 6 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: C.ink, marginBottom: 8 },
  sectionSub: { fontSize: 12, color: C.muted, marginBottom: 8 },
  desc: { color: C.text, fontSize: 14, lineHeight: 20 },

  /* services horizontal chip list */
  serviceChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 14, padding: 12, marginRight: 10, borderWidth: 1, borderColor: '#EEF2F7' },
  serviceTitle: { color: C.text, fontWeight: '700', fontSize: 14 },
  servicePrice: { color: C.ink, marginTop: 2, fontWeight: '700' },
  addBtnSm: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, marginLeft: 10 },
  addTxt: { color: '#fff', fontWeight: '800', marginLeft: 6, fontSize: 12 },
  counterSm: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF1F1', borderRadius: 999, marginLeft: 10 },
  counterBtnSm: { paddingHorizontal: 10, paddingVertical: 6 },
  qty: { minWidth: 22, textAlign: 'center', fontWeight: '800', color: C.primary },

  /* wrapped pills */
  wrapPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1 },
  pillTxt: { marginLeft: 6, color: '#334155', fontSize: 12 },

  /* vertical stepper */
  stepper: { marginTop: 4 },
  stepRow: { flexDirection: 'row', marginBottom: 14 },
  stepRail: { width: 30, alignItems: 'center' },
  stepDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFE8E8', alignItems: 'center', justifyContent: 'center' },
  stepNum: { color: C.primary, fontWeight: '800', fontSize: 12 },
  stepLine: { width: 2, backgroundColor: '#E5E7EB', flex: 1, marginTop: 2, marginBottom: -2 },
  stepCard: { flex: 1, backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: '#EEF2F7', padding: 12, flexDirection: 'row', alignItems: 'center' },
  stepIconWrap: { width: 34, height: 34, borderRadius: 12, backgroundColor: '#FFF1F1', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  stepTitle: { color: C.text, fontWeight: '800' },
  stepDesc: { color: C.muted, marginTop: 2 },

  /* technicians grid */
  techCard: { flex: 1, backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: '#EEF2F7', padding: 10, marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
  techPic: { width: 54, height: 54 },
  techName: { color: C.text, fontWeight: '700' },
  techJobs: { color: C.muted, fontSize: 11 },

  /* FAQ */
  faqItem: { backgroundColor: C.card, borderRadius: 14, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#EEF2F7' },
  faqHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  faqQ: { color: C.text, fontWeight: '700', fontSize: 14 },
  faqA: { color: C.muted, marginTop: 8, lineHeight: 20 },

  /* reviews */
  revCard: { backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: '#EEF2F7', padding: 12, marginBottom: 10 },
  revName: { color: C.text, fontWeight: '700' },
  revTxt: { color: C.text, marginTop: 2 },
  outlineBtn:{ borderWidth:1, borderColor:'#CBD5E1', borderRadius:12, paddingVertical:12, alignItems:'center', marginTop:6, backgroundColor:'#fff' },
  outlineTxt:{ color:'#334155', fontWeight:'900' },

  /* provide */
  provideRow: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginTop: 6 },
  provide: { width: '48%', backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: '#EEF2F7', padding: 12, flexDirection: 'row', alignItems: 'center' },
  provideIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#FFE8E8', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  provideLbl: { color: C.text, fontWeight: '700' },

  /* sticky cart */
  cartBar: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1, borderColor: '#E5E7EB' },
  cartTop: { color: C.muted, fontSize: 12 },
  cartAmt: { color: C.ink, fontSize: 18, fontWeight: '800' },
  primaryBtn: { backgroundColor: C.primary, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 18 },
  primaryTxt: { color: '#fff', fontWeight: '800' },
});

/* ---------- Skeleton styles ---------- */
const sk = StyleSheet.create({
  hero: { height: 260, backgroundColor: '#E9EEF5' },

  glassBtn:{ backgroundColor:'#FFFFFFEE', width:38, height:38, borderRadius:12, borderWidth:1, borderColor:'#FFFFFF99' },
  ratingPill:{ width:90, height:28, borderRadius:999, backgroundColor:'#F1F5F9' },

  h2:{ height:20, borderRadius:8, backgroundColor:'#E9EEF5' },
  para:{ height:12, borderRadius:6, backgroundColor:'#E9EEF5' },

  lineLg:{ height:18, borderRadius:8, backgroundColor:'#E9EEF5' },
  lineMd:{ height:14, borderRadius:8, backgroundColor:'#E9EEF5' },
  lineSm:{ height:12, borderRadius:8, backgroundColor:'#E9EEF5' },
  lineXs:{ height:10, borderRadius:8, backgroundColor:'#E9EEF5' },

  btnPill:{ width:78, height:32, borderRadius:999, backgroundColor:'#F1F5F9', borderWidth:1, borderColor:'#E2E8F0', marginLeft:10 },

  pill:{ height:32, borderRadius:999, borderWidth:1, width:160 },

  iconWarn:{ width:18, height:18, borderRadius:6, backgroundColor:'#FEF3C7' },

  dot:{ width:24, height:24, borderRadius:12, backgroundColor:'#FFE8E8' },
  stepIcon:{ width:34, height:34, borderRadius:12, backgroundColor:'#FFF1F1', marginRight:10 },

  avatar:{ width:54, height:54, borderRadius:12, backgroundColor:'#E9EEF5' },

  provideIcon:{ width:36, height:36, borderRadius:12, backgroundColor:'#F1F5F9', marginRight:10 },

  outlineBtn:{ height:48, borderRadius:12, borderWidth:1, borderColor:'#CBD5E1', backgroundColor:'#fff', marginTop:6 },

  primaryBtn:{ width:160, height:44, borderRadius:14, backgroundColor:'#F1F5F9', borderWidth:1, borderColor:'#E2E8F0' },
});
