// components/NewTicketModal.js
import React, { memo, useEffect, useState } from 'react';
import { Modal, View, Text, ScrollView, TouchableOpacity, TextInput, Image, StyleSheet, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker';

function NewTicketModal({ visible, onClose, onSubmit, theme }) {
  const { C, R, W } = theme;

  // ✅ Hooks are always at the top, never conditional
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Equipment');
  const [equipment, setEquipment] = useState('');
  const [desc, setDesc] = useState('');
  const [photo, setPhotos] = useState(null); // single image

  // Reset fields when modal closes (safe – runs after render)
  useEffect(() => {
    if (!visible) {
      setTitle(''); setEquipment(''); setDesc(''); setCategory('Equipment'); setPhotos([]);
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
        <View style={[st.modalCard, {maxHeight: 560}]}>
          <View style={st.modalHeader}>
            <Text style={st.modalTitle}>New ticket</Text>
            <TouchableOpacity onPress={onClose} style={st.close}><Icon name="close" size={18} color={C.ink}/></TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Field C={C} label="Title" icon="document-text-outline" placeholder="Write a short summary…" value={title} onChange={setTitle}/>
            <View style={{marginBottom:12}}>
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
            <Field C={C} label="Describe the issue" icon="chatbox-ellipses-outline" placeholder="Tell us what’s happening…" value={desc} onChange={setDesc} multiline/>

            <Text style={[st.inputLbl,{marginTop:2, color:C.muted}]}>Proof photo (only 1)</Text>
<View style={{flexDirection:'row', alignItems:'center', marginVertical:6}}>
  {!photo ? (
    <TouchableOpacity onPress={pickPhoto} style={[st.addPhoto, {borderColor:'#FECACA'}]}>
      <Icon name="images-outline" size={18} color={C.primary}/>
      <Text style={{color:C.primary, fontWeight:'900', marginLeft:6}}>Add photo</Text>
    </TouchableOpacity>
  ) : (
    <View style={st.photoBox}>
      <Image source={{uri:photo.uri}} style={st.photoImg}/>
      <TouchableOpacity onPress={removePhoto} style={st.photoDel}>
        <Icon name="close" size={12} color="#fff"/>
      </TouchableOpacity>
    </View>
  )}
</View>


            <TouchableOpacity
              disabled={!canSubmit}
              onPress={()=> onSubmit({ title, category, equipment: equipment||'—', desc, photos: photo ? [photo] : [] })}
              style={[st.primaryBtnWide, {backgroundColor:C.primary, opacity: canSubmit?1:0.5, marginTop:8}]}
              activeOpacity={0.85}>
              <Icon name="paper-plane" size={18} color="#fff" style={st.primaryIcon}/>
              <Text style={st.primaryTxtCenter}>Create ticket</Text>
            </TouchableOpacity>
            <View style={{height:6}}/>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const Field = ({ C, label, icon, placeholder, value, onChange, multiline }) => (
  <View style={{marginBottom:12}}>
    <Text style={[st.inputLbl, {color:C.muted}]}>{label}</Text>
    <View style={[st.inputWrap, {borderColor:'#EEF2F7'}]}>
      <Icon name={icon} size={16} color="#9CA3AF"/>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        style={[st.inputField, {color:'#0F172A'}, multiline && {height:96, textAlignVertical:'top'}]}
        multiline={!!multiline}
      />
    </View>
  </View>
);

export default memo(NewTicketModal);

/* ---- local styles for the modal ---- */
const st = StyleSheet.create({
  overlay:{ flex:1, backgroundColor:'rgba(0,0,0,0.35)', alignItems:'center', justifyContent:'center', paddingHorizontal:16 },
  modalCard:{ width: Dimensions.get('window').width*0.9, backgroundColor:'#fff', borderRadius:20, padding:16, borderWidth:1, borderColor:'#EEF2F7' },
  modalHeader:{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:8 },
  modalTitle:{ color:'#1D2254', fontWeight:'900', fontSize:18 },
  close:{ width:36, height:36, borderRadius:12, backgroundColor:'#F3F4F6', alignItems:'center', justifyContent:'center' },

  inputLbl:{ marginBottom:6, fontSize:12, fontWeight:'700' },
  inputWrap:{ backgroundColor:'#fff', borderRadius:12, borderWidth:1, paddingHorizontal:10, paddingVertical:10, flexDirection:'row', alignItems:'center' },
  inputField:{ marginLeft:8, flex:1 },

  catChip:{ paddingHorizontal:12, paddingVertical:8, borderRadius:999, marginRight:8, borderWidth:1 },
  catTxt:{ color:'#334155', fontWeight:'800' },

  addPhoto:{ flexDirection:'row', alignItems:'center', backgroundColor:'#FFF1F1', borderWidth:1, paddingHorizontal:12, paddingVertical:10, borderRadius:12, marginRight:8 },
  photoBox:{ width:72, height:72, borderRadius:12, overflow:'hidden', borderWidth:1, borderColor:'#E5E7EB', marginRight:8 },
  photoImg:{ width:'100%', height:'100%' },
  photoDel:{ position:'absolute', top:4, right:4, backgroundColor:'rgba(0,0,0,0.55)', width:20, height:20, borderRadius:10, alignItems:'center', justifyContent:'center' },

  primaryBtnWide:{ borderRadius:14, height:48, justifyContent:'center', alignItems:'center', position:'relative' },
  primaryIcon:{ position:'absolute', left:16 },
  primaryTxtCenter:{ color:'#fff', fontWeight:'900' },
});
