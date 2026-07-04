import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { COLORS } from '../../lib/theme';

export interface CustomAlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive' | 'action';
}

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message: string;
  buttons?: CustomAlertButton[];
  onRequestClose?: () => void;
}

export function CustomAlert({ visible, title, message, buttons = [], onRequestClose }: CustomAlertProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onRequestClose}>
      <View style={s.overlay}>
        <View style={s.alertBox}>
          <Text style={s.title}>{title}</Text>
          <Text style={s.message}>{message}</Text>
          <View style={s.buttonContainer}>
            {buttons.map((btn, index) => {
              const isCancel = btn.style === 'cancel';
              const isDestructive = btn.style === 'destructive';
              const isAction = btn.style === 'action';
              return (
                <TouchableOpacity 
                  key={index} 
                  style={[
                    s.button,
                    isCancel && s.buttonCancel,
                    isDestructive && s.buttonDestructive,
                    isAction && s.buttonAction,
                  ]} 
                  onPress={() => {
                    if (btn.onPress) btn.onPress();
                    if (onRequestClose) onRequestClose();
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[
                    s.buttonText,
                    isCancel && s.buttonTextCancel,
                    isDestructive && s.buttonTextDestructive,
                    isAction && s.buttonTextAction,
                  ]}>
                    {btn.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  alertBox: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'column',
    gap: 12,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  buttonCancel: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  buttonDestructive: {
    backgroundColor: 'rgba(255,71,87,0.1)',
    borderColor: 'rgba(255,71,87,0.3)',
  },
  buttonAction: {
    backgroundColor: 'rgba(72,199,142,0.15)',
    borderColor: 'rgba(72,199,142,0.3)',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  buttonTextCancel: {
    color: COLORS.textMuted,
  },
  buttonTextDestructive: {
    color: '#ff4757',
  },
  buttonTextAction: {
    color: COLORS.accent,
  },
});
