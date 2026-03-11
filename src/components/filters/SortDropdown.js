import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { scale, moderateScale } from '../../utils/responsive';

const { height } = Dimensions.get('window');

const C = {
  primary: '#EF3A3A',
  primaryLight: '#FEF2F2',
  ink: '#1D2254',
  text: '#0F172A',
  muted: '#6B7280',
  bg: '#F5F7FA',
  card: '#FFFFFF',
  border: '#E5E7EB',
};

const SORT_ICONS = {
  'date-desc': 'arrow-down',
  'date-asc': 'arrow-up',
  'amount-desc': 'trending-down',
  'amount-asc': 'trending-up',
  'name-asc': 'text',
  'name-desc': 'text',
};

export default function SortDropdown({ value, options, onChange }) {
  const [visible, setVisible] = useState(false);
  const slideAnim = useState(new Animated.Value(height))[0];
  const backdropAnim = useState(new Animated.Value(0))[0];

  const selectedOption = options.find((opt) => opt.value === value);

  const openModal = () => {
    setVisible(true);
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }),
      Animated.timing(backdropAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeModal = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => setVisible(false));
  };

  const handleSelect = (optionValue) => {
    onChange(optionValue);
    closeModal();
  };

  return (
    <>
      <TouchableOpacity style={styles.sortButton} onPress={openModal} activeOpacity={0.7}>
        <View style={styles.sortIconBox}>
          <Icon name="swap-vertical" size={scale(16)} color={C.primary} />
        </View>
        <Icon name="chevron-down" size={scale(14)} color={C.muted} />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="none">
        <View style={styles.container}>
          <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
            <TouchableOpacity style={styles.backdropTouch} onPress={closeModal} />
          </Animated.View>

          <Animated.View
            style={[
              styles.bottomSheet,
              { transform: [{ translateY: slideAnim }] },
            ]}
          >
            {/* Handle */}
            <View style={styles.handleContainer}>
              <View style={styles.handle} />
            </View>

            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <View style={styles.headerIcon}>
                  <Icon name="swap-vertical" size={scale(20)} color={C.primary} />
                </View>
                <Text style={styles.title}>Sort By</Text>
              </View>
              <TouchableOpacity onPress={closeModal} style={styles.closeBtn}>
                <Icon name="close" size={scale(22)} color={C.muted} />
              </TouchableOpacity>
            </View>

            {/* Options */}
            <View style={styles.optionsList}>
              {options.map((option, index) => {
                const isSelected = value === option.value;
                const iconName = SORT_ICONS[option.value] || 'list';

                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.option,
                      isSelected && styles.optionActive,
                      index === options.length - 1 && styles.optionLast,
                    ]}
                    onPress={() => handleSelect(option.value)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.optionLeft}>
                      <View
                        style={[
                          styles.optionIconBox,
                          isSelected && styles.optionIconBoxActive,
                        ]}
                      >
                        <Icon
                          name={iconName}
                          size={scale(16)}
                          color={isSelected ? C.primary : C.muted}
                        />
                      </View>
                      <Text
                        style={[
                          styles.optionText,
                          isSelected && styles.optionTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </View>
                    {isSelected && (
                      <View style={styles.checkIcon}>
                        <Icon name="checkmark" size={scale(16)} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={{ height: scale(32) }} />
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    backgroundColor: C.card,
    borderWidth: 2,
    borderColor: C.border,
    borderRadius: scale(14),
    paddingHorizontal: scale(4),
    paddingVertical: scale(4),
    paddingRight: scale(12),
  },
  sortIconBox: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(10),
    backgroundColor: C.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdropTouch: {
    flex: 1,
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: C.card,
    borderTopLeftRadius: scale(28),
    borderTopRightRadius: scale(28),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: scale(-4) },
    shadowOpacity: 0.15,
    shadowRadius: scale(20),
    elevation: 20,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: scale(12),
    paddingBottom: scale(4),
  },
  handle: {
    width: scale(40),
    height: scale(4),
    borderRadius: scale(2),
    backgroundColor: C.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(20),
    paddingVertical: scale(16),
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
  },
  headerIcon: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(14),
    backgroundColor: C.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: moderateScale(20),
    fontWeight: '800',
    color: C.ink,
  },
  closeBtn: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(12),
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionsList: {
    paddingHorizontal: scale(16),
    paddingTop: scale(12),
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: scale(14),
    paddingHorizontal: scale(12),
    marginBottom: scale(8),
    borderRadius: scale(14),
    backgroundColor: C.bg,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  optionActive: {
    backgroundColor: C.primaryLight,
    borderColor: C.primary,
  },
  optionLast: {
    marginBottom: 0,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
  },
  optionIconBox: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(10),
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionIconBoxActive: {
    backgroundColor: '#fff',
  },
  optionText: {
    fontSize: moderateScale(15),
    fontWeight: '600',
    color: C.text,
  },
  optionTextActive: {
    fontWeight: '700',
    color: C.primary,
  },
  checkIcon: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
