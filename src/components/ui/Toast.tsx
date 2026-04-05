'use client';

import { useEffect, useState, useCallback } from 'react';

type ToastType = 'success' | 'error' | '';

interface ToastMessage {
  text: string;
  type: ToastType;
}

let showToastFn: (text: string, type?: ToastType) => void = () => {};

export function showToast(text: string, type: ToastType = '') {
  showToastFn(text, type);
}

export function Toast() {
  const [message, setMessage] = useState<ToastMessage | null>(null);
  const [visible, setVisible] = useState(false);

  const show = useCallback((text: string, type: ToastType = '') => {
    setMessage({ text, type });
    setVisible(true);
    setTimeout(() => setVisible(false), 3500);
  }, []);

  useEffect(() => {
    showToastFn = show;
  }, [show]);

  return (
    <div
      className={`
        fixed bottom-6 right-6 bg-surface2 border rounded-xl px-5 py-3 text-sm z-[300]
        transition-transform duration-300
        ${visible ? 'translate-y-0' : 'translate-y-[100px]'}
        ${message?.type === 'error' ? 'border-red' : message?.type === 'success' ? 'border-green' : 'border-border'}
      `}
    >
      {message?.text}
    </div>
  );
}
