// components/NewTicketModal.js
import React, { memo, useEffect, useState } from 'react';
import { Modal, View, Text, ScrollView, TouchableOpacity, TextInput, Image, StyleSheet, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker';
import { scale, moderateScale } from '../utils/responsive';
import useKeyboardHeight from '../utils/useKeyboardHeight';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

function NewTicketModal({ visible, onClose, onSubmit, theme }) {
  const { C, R, W } = theme;
  const keyboardHeight = useKeyboardHeight();

  // ✅ Hooks are always at the top, never conditional
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Equipment');
  const [equipment, setEquipment] = useState('');
  const [desc, setDesc] = useState('');
  const [photo, setPhotos] = useState(null); // single image

  // Reset fields when modal closes (safe – runs after render)
useEffect(() => {
  if (!visible) {
    setTitle('');
    setEquipment('');
    setDesc('');
    setCategory('Equipment');
    setPhotos(null); // ✅ Change from [] to null
  }
}, [visible]);
  const canSubmit = title.trim().length > 2 && desc.trim().length > 4;
  const pickPhoto = async () => {
    try {
      const res = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.85,
        selectionLimit: 1,   // only 1 allowed
      });
      if (res?.assets?.length) {
        const img = res.assets[0];
        setPhotos({ uri: img.uri, fileName: img.fileName });
      }
    } catch {}
  };

  const removePhoto = () => setPhotos(null);

  return (
    // ✅ Component stays mounted; only Modal visibility toggles
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={st.overlay}>
        <View style={[st.modalCard, {maxHeight: SCREEN_HEIGHT * 0.75}]}>
          <View style={st.modalHeader}>
            <Text style={st.modalTitle}>New ticket</Text>
            <TouchableOpacity onPress={onClose} style={st.close}><Icon name="close" size={scale(18)} color={C.ink}/></TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: scale(24) + keyboardHeight }}>
            <Field C={C} label="Title" icon="document-text-outline" placeholder="Write a short summary…" value={title} onChange={setTitle}/>
            <View style={{marginBottom: scale(12)}}>
              <Text style={[st.inputLbl, {color:C.muted}]}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {['Equipment','Service','Billing','App/Account','Other'].map(c=>(
                  <TouchableOpacity key={c} onPress={()=>setCategory(c)} style={[st.catChip, {borderColor:'#E5E7EB', backgroundColor:'#fff'}, category===c && {borderColor:C.primary, backgroundColor:'#FFF1F1'}]}>
                    <Text style={[st.catTxt, category===c && {color:C.primary, fontWeight:'900'}]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <Field C={C} label="Equipment (optional)" icon="construct-outline" placeholder="e.g., Deep Freezer / Chimney…" value={equipment} onChange={setEquipment}/>
            <Field C={C} label="Describe the issue" icon="chatbox-ellipses-outline" placeholder="Tell us what's happening…" value={desc} onChange={setDesc} multiline/>

            <Text style={[st.inputLbl,{marginTop: scale(2), color:C.muted}]}>Proof photo (only 1)</Text>
<View style={{flexDirection:'row', alignItems:'center', marginVertical: scale(6)}}>
  {/* ✅ This will only show photo preview when photo exists */}
  {photo ? (
    <View style={st.photoBox}>
      <Image source={{uri:photo.uri}} style={st.photoImg}/>
      <TouchableOpacity onPress={removePhoto} style={st.photoDel}>
        <Icon name="close" size={scale(12)} color="#fff"/>
      </TouchableOpacity>
    </View>
  ) : (
    // ✅ This will only show "Add photo" button when no photo
    <TouchableOpacity onPress={pickPhoto} style={[st.addPhoto, {borderColor:'#FECACA'}]}>
      <Icon name="images-outline" size={scale(18)} color={C.primary}/>
      <Text style={{color:C.primary, fontWeight:'900', marginLeft: scale(6)}}>Add photo</Text>
    </TouchableOpacity>
  )}
</View>
            <TouchableOpacity
              disabled={!canSubmit}
              onPress={()=> onSubmit({ title, category, equipment: equipment||'—', desc, photos: photo ? [photo] : [] })}
              style={[st.primaryBtnWide, {backgroundColor:C.primary, opacity: canSubmit?1:0.5, marginTop: scale(8)}]}
              activeOpacity={0.85}>
              <Icon name="paper-plane" size={scale(18)} color="#fff" style={st.primaryIcon}/>
              <Text style={st.primaryTxtCenter}>Create ticket</Text>
            </TouchableOpacity>
            <View style={{height: scale(6)}}/>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const Field = ({ C, label, icon, placeholder, value, onChange, multiline }) => (
  <View style={{marginBottom: scale(12)}}>
    <Text style={[st.inputLbl, {color:C.muted}]}>{label}</Text>
    <View style={[st.inputWrap, {borderColor:'#EEF2F7'}]}>
      <Icon name={icon} size={scale(16)} color="#9CA3AF"/>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        style={[st.inputField, {color:'#0F172A'}, multiline && {height: scale(96), textAlignVertical:'top'}]}
        multiline={!!multiline}
      />
    </View>
  </View>
);

export default memo(NewTicketModal);

/* ---- local styles for the modal ---- */
const st = StyleSheet.create({
  overlay:{ flex:1, backgroundColor:'rgba(0,0,0,0.35)', alignItems:'center', justifyContent:'center', paddingHorizontal: scale(16) },
  modalCard:{ width: '90%', backgroundColor:'#fff', borderRadius: scale(20), padding: scale(16), borderWidth:1, borderColor:'#EEF2F7' },
  modalHeader:{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom: scale(8) },
  modalTitle:{ color:'#1D2254', fontWeight:'900', fontSize: moderateScale(18) },
  close:{ width: scale(36), height: scale(36), borderRadius: scale(12), backgroundColor:'#F3F4F6', alignItems:'center', justifyContent:'center' },

  inputLbl:{ marginBottom: scale(6), fontSize: moderateScale(12), fontWeight:'700' },
  inputWrap:{ backgroundColor:'#fff', borderRadius: scale(12), borderWidth:1, paddingHorizontal: scale(10), paddingVertical: scale(10), flexDirection:'row', alignItems:'center' },
  inputField:{ marginLeft: scale(8), flex:1, fontSize: moderateScale(14) },

  catChip:{ paddingHorizontal: scale(12), paddingVertical: scale(8), borderRadius: scale(999), marginRight: scale(8), borderWidth:1 },
  catTxt:{ color:'#334155', fontWeight:'800', fontSize: moderateScale(13) },

  addPhoto:{ flexDirection:'row', alignItems:'center', backgroundColor:'#FFF1F1', borderWidth:1, paddingHorizontal: scale(12), paddingVertical: scale(10), borderRadius: scale(12), marginRight: scale(8) },
  photoBox:{ width: scale(72), height: scale(72), borderRadius: scale(12), overflow:'hidden', borderWidth:1, borderColor:'#E5E7EB', marginRight: scale(8) },
  photoImg:{ width:'100%', height:'100%' },
  photoDel:{ position:'absolute', top: scale(4), right: scale(4), backgroundColor:'rgba(0,0,0,0.55)', width: scale(20), height: scale(20), borderRadius: scale(10), alignItems:'center', justifyContent:'center' },

  primaryBtnWide:{ borderRadius: scale(14), height: scale(48), justifyContent:'center', alignItems:'center', position:'relative' },
  primaryIcon:{ position:'absolute', left: scale(16) },
  primaryTxtCenter:{ color:'#fff', fontWeight:'900', fontSize: moderateScale(14) },
});
