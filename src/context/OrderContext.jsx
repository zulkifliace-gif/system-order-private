import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { connectBluetoothPrinter, printKitchenRunnerTicketBluetooth, isDrinkItem } from '../utils/bluetoothPrinter';

// Create Context
const OrderContext = createContext();

// Mock Initial Menu Data with Malaysian F&B items, categories, and options
export const INITIAL_MENU = [
  {
    id: 'M1',
    name: 'Nasi Ayam Hainan Steam',
    category: 'Ayam',
    price: 12.90,
    description: 'Nasi wangi dimasak dengan stok ayam, disaji bersama ayam steam lembut & sos cili halia tradisi.',
    image: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=600&q=80',
    optionGroups: [
      {
        name: 'Bahagian Ayam',
        required: true,
        options: ['Bahagian Paha (Thigh)', 'Bahagian Dada (Breast)', 'Bahagian Kepak (Wing)']
      },
      {
        name: 'Tambahan / Add-ons',
        required: false,
        options: ['Telur Masak Kicap (+RM1.50)', 'Extra Supp & Sos (+RM1.00)']
      }
    ]
  },
  {
    id: 'M2',
    name: 'Nasi Ayam Berempah Rangup',
    category: 'Ayam',
    price: 13.50,
    description: 'Ayam goreng berempah rempah ratus melayu, kriuk-kriuk rangup disaji bersama kuah kari pekat.',
    image: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=600&q=80',
    optionGroups: [
      {
        name: 'Tahap Pedas',
        required: true,
        options: ['Pedas Biasa', 'Extra Pedas Giler 🌶️']
      }
    ]
  },
  {
    id: 'M3',
    name: 'Nasi Goreng USA & Telur Mata',
    category: 'Nasi',
    price: 14.90,
    description: 'Nasi goreng tomato dimasak dengan udang, sotong & ayam, ditutup dengan telur mata goyang.',
    image: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=600&q=80',
    optionGroups: [
      {
        name: 'Gaya Telur',
        required: true,
        options: ['Telur Mata Goyang', 'Telur Dada', 'Telur Masak Penuh']
      }
    ]
  },
  {
    id: 'M4',
    name: 'Nasi Lemak Ayam Goreng Berempah',
    category: 'Nasi',
    price: 12.50,
    description: 'Nasi santan kukus daun pandan, sambal tumis manis pedas, kacang, ikan bilis & ayam goreng.',
    image: 'https://images.unsplash.com/photo-1596797882870-8c33deeac224?auto=format&fit=crop&w=600&q=80',
    optionGroups: [
      {
        name: 'Pilihan Sambal',
        required: true,
        options: ['Sambal Biasa', 'Sambal Extra Pedas', 'Sambal Asing']
      }
    ]
  },
  {
    id: 'M5',
    name: 'Sizzling Chicken Chop Western',
    category: 'Western',
    price: 18.90,
    description: 'Ayam grill empuk disira sos lada hitam homemade pekat, fries rangup & coleslaw segar.',
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80',
    optionGroups: [
      {
        name: 'Sos Western',
        required: true,
        options: ['Blackpepper Sauce', 'Mushroom Sauce']
      }
    ]
  },
  {
    id: 'M6',
    name: 'Keropok Lekor Terengganu (6 Pcs)',
    category: 'Sampingan',
    price: 6.90,
    description: 'Keropok lekor ikan asli Terengganu digoreng panas-panas bersama sos pencicah manis pedas.',
    image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80',
    optionGroups: []
  },
  {
    id: 'M7',
    name: 'Teh Tarik Kaw / Teh Ais',
    category: 'Minuman',
    price: 3.50,
    description: 'Teh wangi ditarik buih gebu dengan susu pekat manis seimbang.',
    image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=600&q=80',
    optionGroups: [
      {
        name: 'Suhu & Ais',
        required: true,
        options: ['Ais (Teh Ais)', 'Kurang Ais (Less Ice)', 'Panas (Teh Tarik Hot)']
      },
      {
        name: 'Kekadangan Manis',
        required: true,
        options: ['Manis Biasa', 'Kurang Manis (Less Sweet)', 'Kosong / Tanpa Susu']
      }
    ]
  },
  {
    id: 'M8',
    name: 'Milo Tabur Dinobong',
    category: 'Minuman',
    price: 4.80,
    description: 'Milo ais pekat berkrim dengan taburan serbuk Milo padu melimpah di atas.',
    image: 'https://images.unsplash.com/photo-1541658016709-82535e94bc69?auto=format&fit=crop&w=600&q=80',
    optionGroups: [
      {
        name: 'Suhu & Ais',
        required: true,
        options: ['Ais (Cold)', 'Kurang Ais (Less Ice)']
      }
    ]
  },
  {
    id: 'M9',
    name: 'Cendol Durian Musang King',
    category: 'Pencuci Mulut',
    price: 11.90,
    description: 'Cendol hijau kenyal, santan segar, gula melaka asli Melaka bersama ulas durian Musang King.',
    image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80',
    optionGroups: []
  }
];

const INITIAL_TABLES = Array.from({ length: 20 }, (_, i) => ({
  table_number: i + 1,
  status: 'KOSONG', // KOSONG | ADA_PELANGGAN | SEDANG_MAKAN
  current_session_id: null
}));

const STORAGE_KEYS = {
  TABLES: 'fb_tables_v1',
  SESSIONS: 'fb_sessions_v1',
  ORDERS: 'fb_orders_v1',
  RECEIPT_SETTINGS: 'fb_receipt_settings_v1',
  FEEDBACKS: 'fb_customer_feedbacks_v1'
};

const DEFAULT_RECEIPT_SETTINGS = {
  paperWidth: '58mm',
  tableCount: 20,
  headerTitle: 'RESTORAN RASA SELERA',
  headerAddress: 'No. 18, Jalan Telawi 3, Bangsar, 59100 Kuala Lumpur',
  footerMsg: 'Terima Kasih! Sila Datang Lagi.',
  logoUrl: null,
  staffPin: '1234',
  operationalMode: 'POSTPAY', // Default: 'POSTPAY' (Makan Dulu) | 'PREPAY' (Bayar Dulu)

  // Extra Charges & Tax Configuration (Cas Tambahan & Cukai)
  enableSst: false,           // SST (OFF by default)
  sstRate: 0,                 // 0% default
  enableServiceCharge: false, // Cas Perkhidmatan (Service Charge)
  serviceChargeRate: 0,       // 0% default
  enableCustomCharge: false,  // Cas Tambahan Custom
  customChargeName: 'Cas Bungkus / Servis',
  customChargeType: 'RM',     // 'RM' or '%'
  customChargeAmount: 0.00,

  // Cas Bungkus (Takeaway Charge) — Auto dikenakan bila pelanggan pilih Bungkus semasa Semakan Pesanan
  enableTakeawayCharge: false, // OFF by default
  takeawayChargeType: 'RM',    // 'RM' or '%'
  takeawayChargeAmount: 0.50,  // RM 0.50 default

  // Emergency Maintenance Mode Settings (Mod Kecemasan / Selenggaraan)
  emergencyMode: {
    enabled: false,
    message: 'Sistem mengalami gangguan secara tiba-tiba, sila buat pesanan secara manual dengan waiter.'
  }
};

export function OrderProvider({ children }) {
  const [tables, setTables] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.TABLES);
    return saved ? JSON.parse(saved) : INITIAL_TABLES;
  });

  const [sessions, setSessions] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SESSIONS);
    return saved ? JSON.parse(saved) : {};
  });

  const [orders, setOrders] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ORDERS);
    return saved ? JSON.parse(saved) : [];
  });

  // Customer Feedbacks State
  const [feedbacks, setFeedbacks] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.FEEDBACKS);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.FEEDBACKS, JSON.stringify(feedbacks));
  }, [feedbacks]);

  // Centralized Bluetooth Printer State for POS / Counter
  const [btDevice, setBtDevice] = useState(null);
  const [btConnecting, setBtConnecting] = useState(false);
  const [btStatusMsg, setBtStatusMsg] = useState('');

  // Dedicated Bluetooth Printer State for Kitchen Display System (KDS)
  const [kitchenBtDevice, setKitchenBtDevice] = useState(null);
  const [kitchenBtConnecting, setKitchenBtConnecting] = useState(false);
  const [kitchenBtStatusMsg, setKitchenBtStatusMsg] = useState('');

  // KDS Print Error Tracking State
  const [failedPrintOrderIds, setFailedPrintOrderIds] = useState({});

  const markPrintFailed = useCallback((orderId) => {
    setFailedPrintOrderIds(prev => ({ ...prev, [orderId]: true }));
  }, []);

  const clearPrintFailed = useCallback((orderId) => {
    setFailedPrintOrderIds(prev => {
      const copy = { ...prev };
      delete copy[orderId];
      return copy;
    });
  }, []);

  // Receipt Settings State (paper width, header title, address, footer)
  const [receiptSettings, setReceiptSettings] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.RECEIPT_SETTINGS);
    return saved ? JSON.parse(saved) : DEFAULT_RECEIPT_SETTINGS;
  });

  // Menu Items State — starts with INITIAL_MENU, loads from server on mount
  const [menuItems, setMenuItems] = useState(INITIAL_MENU);

  // Fetch latest menu & system settings from server on startup
  useEffect(() => {
    const port = window.location.port;
    const isLocalDev = port === '3000' || port === '5173';
    const BASE = isLocalDev ? `http://${window.location.hostname}:5000` : window.location.origin;

    fetch(`${BASE}/api/menu`)
      .then(r => r.json())
      .then(res => { if (res.status === 'OK' && Array.isArray(res.data) && res.data.length > 0) setMenuItems(res.data); })
      .catch(() => { /* Server offline — use INITIAL_MENU */ });

    fetch(`${BASE}/api/settings`)
      .then(r => r.json())
      .then(res => {
        if (res.status === 'OK' && res.data) {
          setReceiptSettings(prev => {
            const merged = { ...prev, ...res.data };
            localStorage.setItem(STORAGE_KEYS.RECEIPT_SETTINGS, JSON.stringify(merged));
            return merged;
          });
        }
      })
      .catch(() => {});

    fetch(`${BASE}/api/state`)
      .then(r => r.json())
      .then(res => {
        const fetchedSettings = res.data?.receiptSettings || res.data?.settings;
        if (res.status === 'OK' && res.data && fetchedSettings) {
          setReceiptSettings(prev => {
            const merged = { ...prev, ...fetchedSettings };
            localStorage.setItem(STORAGE_KEYS.RECEIPT_SETTINGS, JSON.stringify(merged));
            return merged;
          });
        }
        if (res.status === 'OK' && res.data && Array.isArray(res.data.feedbacks)) {
          setFeedbacks(res.data.feedbacks);
          localStorage.setItem(STORAGE_KEYS.FEEDBACKS, JSON.stringify(res.data.feedbacks));
        }
      })
      .catch(() => {});

    fetch(`${BASE}/api/feedbacks?limit=100`)
      .then(r => r.json())
      .then(res => {
        if (res.status === 'OK' && Array.isArray(res.data)) {
          setFeedbacks(res.data);
          localStorage.setItem(STORAGE_KEYS.FEEDBACKS, JSON.stringify(res.data));
        }
      })
      .catch(() => {});
  }, []);

  // Update menu and save to server
  const updateMenuItems = useCallback(async (newMenu) => {
    setMenuItems(newMenu);
    const port = window.location.port;
    const isLocalDev = port === '3000' || port === '5173';
    const BASE = isLocalDev ? `http://${window.location.hostname}:5000` : window.location.origin;
    try {
      const res = await fetch(`${BASE}/api/menu`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMenu)
      });
      return await res.json();
    } catch (e) {
      console.error('Failed to save menu to server:', e);
      return { status: 'ERROR', message: 'Gagal simpan ke server. Semak sambungan.' };
    }
  }, []);

  // Audio Context State for KDS
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const audioCtxRef = useRef(null);

  const channelRef = useRef(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TABLES, JSON.stringify(tables));
  }, [tables]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.RECEIPT_SETTINGS, JSON.stringify(receiptSettings));
  }, [receiptSettings]);

  // Consecutive Bluetooth Failure Ref
  const btConsecutiveFailuresRef = useRef(0);

  // Helper to play MP3 audio files from public directory
  const playAudioFile = useCallback((fileUrl) => {
    try {
      const audio = new Audio(fileUrl);
      audio.play().catch(e => console.warn('Audio play error:', e));
    } catch (e) {
      console.warn('Audio play exception:', e);
    }
  }, []);

  const handleBtConnectSuccess = useCallback(() => {
    btConsecutiveFailuresRef.current = 0;
    playAudioFile('/chrysalyn-clean-double-pop.mp3');
  }, [playAudioFile]);

  const handleBtConnectFailure = useCallback(() => {
    btConsecutiveFailuresRef.current += 1;
    if (btConsecutiveFailuresRef.current >= 3) {
      playAudioFile('/Sambungan Bluetooth gagal.mp3');
      btConsecutiveFailuresRef.current = 0; // Reset counter after playing 3x failure alert
    } else {
      playAudioFile('/windows-error-sound-effect.mp3');
    }
  }, [playAudioFile]);

  // Centralized Bluetooth Connect Handler
  const connectCentralizedBluetooth = useCallback(async () => {
    setBtConnecting(true);
    setBtStatusMsg('Mencari printer Bluetooth...');
    try {
      const conn = await connectBluetoothPrinter();
      setBtDevice(conn);
      setBtStatusMsg(`Terhubung: ${conn.name}`);
      handleBtConnectSuccess();
      return conn;
    } catch (err) {
      handleBtConnectFailure();
      if (err.message === 'WEB_BLUETOOTH_NOT_SUPPORTED') {
        alert('Browser ini tidak menyokong Web Bluetooth. Sila gunakan Chrome atau Edge.');
      } else {
        setBtStatusMsg('Sambungan Bluetooth dibatalkan.');
      }
      console.error(err);
      return null;
    } finally {
      setBtConnecting(false);
    }
  }, [handleBtConnectSuccess, handleBtConnectFailure]);

  const disconnectCentralizedBluetooth = useCallback(() => {
    if (btDevice && btDevice.device && btDevice.device.gatt) {
      try {
        btDevice.device.gatt.disconnect();
      } catch (e) {
        console.log(e);
      }
    }
    setBtDevice(null);
    setBtStatusMsg('Sambungan POS Bluetooth diputuskan.');
  }, [btDevice]);

  // Dedicated Kitchen Bluetooth Connect Handler
  const connectKitchenBluetooth = useCallback(async () => {
    setKitchenBtConnecting(true);
    setKitchenBtStatusMsg('Mencari printer Bluetooth Dapur...');
    try {
      const conn = await connectBluetoothPrinter();
      setKitchenBtDevice(conn);
      setKitchenBtStatusMsg(`Terhubung Dapur: ${conn.name}`);
      handleBtConnectSuccess();
      return conn;
    } catch (err) {
      handleBtConnectFailure();
      if (err.message === 'WEB_BLUETOOTH_NOT_SUPPORTED') {
        alert('Browser ini tidak menyokong Web Bluetooth. Sila gunakan Chrome atau Edge.');
      } else {
        setKitchenBtStatusMsg('Sambungan Bluetooth Dapur dibatalkan.');
      }
      console.error(err);
      return null;
    } finally {
      setKitchenBtConnecting(false);
    }
  }, [handleBtConnectSuccess, handleBtConnectFailure]);

  const disconnectKitchenBluetooth = useCallback(() => {
    if (kitchenBtDevice && kitchenBtDevice.device && kitchenBtDevice.device.gatt) {
      try {
        kitchenBtDevice.device.gatt.disconnect();
      } catch (e) {
        console.log(e);
      }
    }
    setKitchenBtDevice(null);
    setKitchenBtStatusMsg('Sambungan Bluetooth Dapur diputuskan.');
  }, [kitchenBtDevice]);

  const receiptSettingsRef = useRef(receiptSettings);
  useEffect(() => {
    receiptSettingsRef.current = receiptSettings;
  }, [receiptSettings]);

  // Play KDS sound (Default Web Audio BEEP or Custom Selected Sound from /public/sound/)
  const playBeepSound = useCallback(() => {
    try {
      const selectedSound = receiptSettingsRef.current?.kdsSound || 'DEFAULT';

      if (selectedSound !== 'DEFAULT') {
        const soundUrl = selectedSound.startsWith('/') ? selectedSound : `/sound/${selectedSound}`;
        const audio = new Audio(soundUrl);
        audio.play().catch(e => console.warn('Custom KDS audio play blocked/error:', e));
        return;
      }

      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }

      const ctx = audioCtxRef.current;
      const now = ctx.currentTime;

      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now);
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.25);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now + 0.15);
      gain2.gain.setValueAtTime(0.4, now + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.15);
      osc2.stop(now + 0.65);
    } catch (e) {
      console.warn('Audio error:', e);
    }
  }, []);

  const enableAudio = useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
      setIsAudioEnabled(true);
      playBeepSound();
      return true;
    } catch (e) {
      console.error('Failed to enable audio context:', e);
      return false;
    }
  }, [playBeepSound]);

  const handleRemoteUpdate = useCallback((data) => {
    if (!data || !data.type) return;

    if (data.tables) setTables(data.tables);
    if (data.sessions) setSessions(data.sessions);
    if (data.orders) setOrders(data.orders);
    if (data.receiptSettings) setReceiptSettings(data.receiptSettings);
  }, [isAudioEnabled, playBeepSound]);

  // Keep handleRemoteUpdate in a ref so socket listeners always call latest version
  // without needing to re-register (prevents event handler accumulation)
  const handleRemoteUpdateRef = useRef(handleRemoteUpdate);
  useEffect(() => {
    handleRemoteUpdateRef.current = handleRemoteUpdate;
  }, [handleRemoteUpdate]);

  const socketRef = useRef(null);

  // Real-Time Cross-Device Socket.io Synchronization Engine
  // IMPORTANT: This runs ONCE on mount only (empty deps [])
  // Socket is stored in socketRef and NEVER disconnected on re-render
  // to prevent the connect/disconnect spam loop.
  useEffect(() => {
    const port = window.location.port;
    const isLocalDev = port === '3000' || port === '5173';
    const BACKEND_URL = isLocalDev
      ? `http://${window.location.hostname}:5000`
      : window.location.origin;

    // Only create socket once — never recreate on re-render
    if (!socketRef.current) {
      try {
        socketRef.current = io(BACKEND_URL, {
          transports: ['polling', 'websocket'],
          reconnectionAttempts: 20,
          reconnectionDelay: 2000,
          reconnectionDelayMax: 10000
        });

        socketRef.current.on('connect', () => {
          console.log('🔌 Connected to Socket.io:', BACKEND_URL);
        });

        socketRef.current.on('disconnect', (reason) => {
          console.log('⚠️ Socket disconnected:', reason);
        });

        socketRef.current.on('INIT_STATE', (state) => {
          if (state) {
            if (state.tables && state.tables.length > 0) setTables(state.tables);
            if (state.sessions) setSessions(state.sessions);
            if (state.orders) setOrders(state.orders);
            if (Array.isArray(state.feedbacks)) setFeedbacks(state.feedbacks);
            const st = state.receiptSettings || state.settings;
            if (st) {
              setReceiptSettings(st);
              localStorage.setItem(STORAGE_KEYS.RECEIPT_SETTINGS, JSON.stringify(st));
            }
          }
        });

        socketRef.current.on('SYSTEM_STATE_UPDATED', (state) => {
          if (state) {
            if (state.tables && state.tables.length > 0) setTables(state.tables);
            if (state.sessions) setSessions(state.sessions);
            if (state.orders) setOrders(state.orders);
            if (Array.isArray(state.feedbacks)) setFeedbacks(state.feedbacks);
            const st = state.receiptSettings || state.settings;
            if (st) {
              setReceiptSettings(prev => {
                const merged = { ...prev, ...st };
                localStorage.setItem(STORAGE_KEYS.RECEIPT_SETTINGS, JSON.stringify(merged));
                return merged;
              });
            }
          }
        });

        // Real-Time Cross-Device Customer Feedback Synchronization Listener
        socketRef.current.on('NEW_FEEDBACK_SUBMITTED', (newFb) => {
          if (!newFb) return;
          console.log('💬 Socket Received NEW_FEEDBACK_SUBMITTED:', newFb);
          setFeedbacks(prev => {
            const exists = prev.some(f => f.feedback_id === newFb.feedback_id || (f.order_id === newFb.order_id && f.order_id !== 'N/A'));
            if (exists) return prev;
            const updated = [newFb, ...prev];
            localStorage.setItem(STORAGE_KEYS.FEEDBACKS, JSON.stringify(updated));
            return updated;
          });
        });

        socketRef.current.on('SETTINGS_UPDATED', (st) => {
          if (st) {
            console.log('⚡ SETTINGS_UPDATED received:', st);
            setReceiptSettings(prev => {
              const merged = { ...prev, ...st };
              localStorage.setItem(STORAGE_KEYS.RECEIPT_SETTINGS, JSON.stringify(merged));
              return merged;
            });
          }
        });

        socketRef.current.on('EMERGENCY_MODE_TOGGLED', (emergencyData) => {
          console.log('🚨 EMERGENCY_MODE_TOGGLED received:', emergencyData);
          if (emergencyData) {
            setReceiptSettings(prev => {
              const merged = { ...prev, emergencyMode: emergencyData };
              localStorage.setItem(STORAGE_KEYS.RECEIPT_SETTINGS, JSON.stringify(merged));
              return merged;
            });
          }
        });

        socketRef.current.on('NEW_ORDER_RECEIVED', () => {
          // Socket event received
        });

        socketRef.current.on('MENU_UPDATED', (updatedMenu) => {
          if (Array.isArray(updatedMenu) && updatedMenu.length > 0) {
            setMenuItems(updatedMenu);
          }
        });

        socketRef.current.on('SESSION_HAS_ENDED', (data) => {
          if (data && data.session_id) {
            setSessions(prev => ({
              ...prev,
              [data.session_id]: {
                ...(prev[data.session_id] || {}),
                status: 'CLOSED',
                closed_at: data.closed_at || new Date().toISOString()
              }
            }));
            // Transition PAYMENT_PENDING → PENDING so KDS auto-receives and customer screen updates
            setOrders(prev => prev.map(o => {
              if (o.session_id !== data.session_id) return o;
              const isPaymentPending = o.kitchen_status === 'PAYMENT_PENDING';
              return {
                ...o,
                payment_status: 'PAID',
                kitchen_status: isPaymentPending ? 'PENDING' : o.kitchen_status
              };
            }));
          }
        });

        socketRef.current.on('STOCK_VALIDATION_ERROR', (data) => {
          if (data && data.message) {
            alert(`⚠️ PERHATIAN! ${data.message}`);
          }
        });

        socketRef.current.on('SESSION_HAS_BEEN_CANCELLED', (data) => {
          if (data && data.session_id) {
            setSessions(prev => ({
              ...prev,
              [data.session_id]: {
                ...(prev[data.session_id] || {}),
                status: 'CLOSED',
                is_cancelled: true,
                closed_at: new Date().toISOString()
              }
            }));
            setOrders(prev => prev.map(o => o.session_id === data.session_id ? { ...o, kitchen_status: 'CANCELLED', kitchen_cancel_reason: data.reason || 'Sesi dibatalkan oleh kaunter' } : o));
            setTables(prev => prev.map(t => t.table_number === Number(data.table_number) ? { ...t, status: 'KOSONG', current_session_id: null } : t));
          }
        });

      } catch (e) {
        console.warn('Socket.io client connection error:', e);
      }
    }

    // BroadcastChannel — also created once
    if (!channelRef.current) {
      try {
        channelRef.current = new BroadcastChannel('fb_order_system_channel');
        channelRef.current.onmessage = (event) => {
          handleRemoteUpdateRef.current(event.data);
        };
      } catch (e) {
        console.warn('BroadcastChannel not supported', e);
      }
    }

    const onStorage = (e) => {
      if (
        e.key === STORAGE_KEYS.ORDERS || 
        e.key === STORAGE_KEYS.TABLES || 
        e.key === STORAGE_KEYS.SESSIONS ||
        e.key === STORAGE_KEYS.RECEIPT_SETTINGS
      ) {
        setTables(JSON.parse(localStorage.getItem(STORAGE_KEYS.TABLES) || '[]'));
        setSessions(JSON.parse(localStorage.getItem(STORAGE_KEYS.SESSIONS) || '{}'));
        setOrders(JSON.parse(localStorage.getItem(STORAGE_KEYS.ORDERS) || '[]'));
        setReceiptSettings(JSON.parse(localStorage.getItem(STORAGE_KEYS.RECEIPT_SETTINGS) || JSON.stringify(DEFAULT_RECEIPT_SETTINGS)));
      }
    };

    window.addEventListener('storage', onStorage);

    // DO NOT disconnect socket on cleanup — it would cause reconnect spam.
    // The socket lives for the entire app lifetime and is only cleaned up
    // when the page is actually closed/refreshed.
    return () => {
      window.removeEventListener('storage', onStorage);
      // NOTE: We intentionally do NOT call socketRef.current.disconnect() here
      // to prevent React Strict Mode double-mount from causing connect/disconnect spam.
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const broadcastState = useCallback((type, updatedTables, updatedSessions, updatedOrders) => {
    const payload = {
      type,
      tables: updatedTables,
      sessions: updatedSessions,
      orders: updatedOrders,
      timestamp: Date.now()
    };

    if (channelRef.current) {
      channelRef.current.postMessage(payload);
    }
  }, []);

  const createSession = useCallback((tableNumber) => {
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const sessionId = `SES-${tableNumber}${randomCode}`;

    const newSession = {
      session_id: sessionId,
      table_number: Number(tableNumber),
      created_at: new Date().toISOString(),
      status: 'ACTIVE'
    };

    const updatedSessions = {
      ...sessions,
      [sessionId]: newSession
    };

    const updatedTables = tables.map(t => {
      if (t.table_number === Number(tableNumber)) {
        return { ...t, status: 'ADA_PELANGGAN', current_session_id: sessionId };
      }
      return t;
    });

    setSessions(updatedSessions);
    setTables(updatedTables);
    broadcastState('NEW_SESSION', updatedTables, updatedSessions, orders);

    // Emit Socket Event for real-time cross-device sync
    if (socketRef.current) {
      socketRef.current.emit('CREATE_SESSION', { table_number: tableNumber, session_id: sessionId });
    }

    return sessionId;
  }, [sessions, tables, orders, broadcastState]);

  const submitOrder = useCallback((sessionId, tableNumber, cartItems, overallNote = '', orderType = 'DINE_IN', customerName = '') => {
    // Guard 1: Prevent ordering if session is already closed
    const currentSess = sessions[sessionId];
    if (currentSess && currentSess.status === 'CLOSED') {
      alert('Sesi pesanan untuk meja ini telah ditutup atau dibatalkan oleh kaunter.');
      return { success: false, error: 'SESSION_CLOSED' };
    }

    const currentStock = receiptSettingsRef.current?.menuStock || {};
    const stockErrors = [];

    // Helper to extract option names from cart item
    const extractOptionNames = (item) => {
      const result = [];
      if (item.selectedOptions && typeof item.selectedOptions === 'object') {
        Object.values(item.selectedOptions).forEach(val => {
          if (Array.isArray(val)) {
            val.forEach(v => { if (v && typeof v === 'string') result.push(v.trim()); });
          } else if (val && typeof val === 'string') {
            result.push(val.trim());
          }
        });
      } else if (item.options && typeof item.options === 'string') {
        item.options.split(',').forEach(o => {
          const trimmed = o.trim();
          if (trimmed) result.push(trimmed);
        });
      }
      return result;
    };

    // Guard 2: Strict Pre-Check Main Item & Option Add-on Stock BEFORE creating order
    (cartItems || []).forEach(item => {
      if (item.cancelled) return;
      const orderedQty = Number(item.quantity) || 1;
      const mainKey = item.id || item.name;

      // 1. Check Main Item Stock
      const mainStock = currentStock[mainKey] || currentStock[item.name];
      if (mainStock) {
        if (mainStock.status === 'OUT_OF_STOCK') {
          stockErrors.push(`"${item.name}" telah HABIS STOK.`);
        } else if (mainStock.stock_qty !== null && mainStock.stock_qty !== undefined) {
          const avail = Number(mainStock.stock_qty) || 0;
          if (avail <= 0) {
            stockErrors.push(`"${item.name}" telah HABIS STOK.`);
          } else if (orderedQty > avail) {
            stockErrors.push(`"${item.name}" melebihi baki stok (Diminta: ${orderedQty}, Baki: ${avail}).`);
          }
        }
      }

      // 2. Check Option / Add-on Stock
      const optNames = extractOptionNames(item);
      optNames.forEach(optName => {
        const optKey1 = `opt::${mainKey}::${optName}`;
        const optKey2 = `opt::${item.name}::${optName}`;
        const optKey3 = `opt::${optName}`;
        const optStock = currentStock[optKey1] || currentStock[optKey2] || currentStock[optKey3];

        if (optStock) {
          if (optStock.status === 'OUT_OF_STOCK') {
            stockErrors.push(`Pilihan add-on "${optName}" telah HABIS STOK.`);
          } else if (optStock.stock_qty !== null && optStock.stock_qty !== undefined) {
            const avail = Number(optStock.stock_qty) || 0;
            if (avail <= 0) {
              stockErrors.push(`Pilihan add-on "${optName}" telah HABIS STOK.`);
            } else if (orderedQty > avail) {
              stockErrors.push(`Pilihan add-on "${optName}" melebihi baki stok (Diminta: ${orderedQty}, Baki: ${avail}).`);
            }
          }
        }
      });
    });

    if (stockErrors.length > 0) {
      alert(`⚠️ PESANAN DITOLAK KERANA MASALAH STOK!\n\n${stockErrors.join('\n')}\n\nSila kemaskini troli anda.`);
      return { success: false, error: 'STOCK_ERROR', details: stockErrors };
    }

    const orderCount = orders.length + 1001;
    const orderId = `ORD-${orderCount}`;
    const totalAmount = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Auto-capitalize customer name (e.g. 'haziq' → 'Haziq', 'nur alia' → 'Nur Alia')
    const formattedName = customerName
      ? customerName.trim().replace(/\b\w/g, (c) => c.toUpperCase())
      : '';

    const isPrepayMode = receiptSettingsRef.current?.operationalMode === 'PREPAY';
    const initialKitchenStatus = isPrepayMode ? 'PAYMENT_PENDING' : 'PENDING';

    const newOrder = {
      order_id: orderId,
      session_id: sessionId,
      table_number: Number(tableNumber),
      customer_name: formattedName,
      timestamp: new Date().toISOString(),
      order_type: orderType, // DINE_IN | TAKEAWAY
      items: cartItems.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        options: item.selectedOptions ? Object.values(item.selectedOptions).flat().join(', ') : '',
        selectedOptions: item.selectedOptions,
        special_note: item.itemNote || ''
      })),
      total_amount: totalAmount,
      kitchen_status: initialKitchenStatus,
      payment_status: 'UNPAID',
      special_notes: overallNote
    };

    const updatedOrders = [newOrder, ...orders];

    const updatedTables = tables.map(t => {
      if (t.table_number === Number(tableNumber)) {
        return { ...t, status: 'SEDANG_MAKAN' };
      }
      return t;
    });

    // Also store customer_name in session for receipt display
    const updatedSessions = formattedName && sessions[sessionId]
      ? { ...sessions, [sessionId]: { ...sessions[sessionId], customer_name: formattedName } }
      : sessions;

    // NOTE: Stock deduction is handled atomically by the backend (database.js submitOrder).
    // The backend saves updated menuStock to SQLite and broadcasts via SYSTEM_STATE_UPDATED.
    // DO NOT deduct stock here on the frontend to prevent double decrement!

    setOrders(updatedOrders);
    setTables(updatedTables);
    if (formattedName) setSessions(updatedSessions);
    broadcastState('NEW_ORDER', updatedTables, formattedName ? updatedSessions : sessions, updatedOrders);

    // Emit Socket Event for real-time cross-device sync (Phone to PC & KDS)
    if (socketRef.current) {
      socketRef.current.emit('SUBMIT_ORDER', {
        session_id: sessionId,
        table_number: Number(tableNumber),
        order_id: orderId,
        customer_name: formattedName,
        order_type: orderType,
        items: newOrder.items,
        total_amount: totalAmount,
        special_notes: overallNote
      });
    }

    return { success: true, order: newOrder };
  }, [orders, tables, sessions, broadcastState, isAudioEnabled, playBeepSound]);

  const updateKitchenStatus = useCallback((orderId, newStatus) => {
    let targetOrder = null;
    const updatedOrders = orders.map(ord => {
      if (ord.order_id === orderId) {
        targetOrder = { 
          ...ord, 
          kitchen_status: newStatus,
          cooking_started_at: newStatus === 'COOKING' ? (ord.cooking_started_at || Date.now()) : ord.cooking_started_at
        };
        return targetOrder;
      }
      return ord;
    });

    const cookingStartedAt = newStatus === 'COOKING' ? (targetOrder?.cooking_started_at || Date.now()) : targetOrder?.cooking_started_at;

    setOrders(updatedOrders);
    broadcastState('STATUS_UPDATE', tables, sessions, updatedOrders);

    // FIXED: backend reads 'kitchen_status', and we include cooking_started_at for the 40s delay timer
    if (socketRef.current) {
      socketRef.current.emit('UPDATE_KITCHEN_STATUS', { 
        order_id: orderId, 
        kitchen_status: newStatus,
        cooking_started_at: cookingStartedAt
      });
    }

    // Auto-Print Kitchen Runner Ticket when order becomes READY if Kitchen Bluetooth Printer is connected
    const activeKitchenPrinter = kitchenBtDevice || btDevice;
    if (newStatus === 'READY' && targetOrder && activeKitchenPrinter) {
      (async () => {
        try {
          await printKitchenRunnerTicketBluetooth(activeKitchenPrinter, {
            tableNumber: targetOrder.table_number,
            orderId: targetOrder.order_id,
            customerName: targetOrder.customer_name || '',
            items: targetOrder.items || [],
            orderType: targetOrder.order_type || 'DINE_IN',
            specialNotes: targetOrder.special_notes || '',
            timestamp: targetOrder.timestamp
          }, receiptSettings);
          clearPrintFailed(targetOrder.order_id);
        } catch (err) {
          console.warn('Auto-print kitchen runner slip error:', err);
          markPrintFailed(targetOrder.order_id);
        }
      })();
    }
  }, [orders, tables, sessions, broadcastState, kitchenBtDevice, btDevice, receiptSettings, clearPrintFailed, markPrintFailed]);

  // ============================================================
  // STATION-ISOLATED ACTION FUNCTIONS
  // ============================================================

  /**
   * Mark a station as "currently cooking/preparing" for an order.
   * Sets food_cooking or bar_cooking flag on the order WITHOUT changing overall kitchen_status.
   * station: 'FOOD' | 'BAR'
   */
  const markStationCooking = useCallback((orderId, station) => {
    let updatedTargetOrder = null;
    const updatedOrders = orders.map(ord => {
      if (ord.order_id === orderId) {
        const updatedItems = (ord.items || []).map(item => {
          const isDrink = isDrinkItem(item, menuItems);
          if (station === 'FOOD' && !isDrink) {
            return { ...item, food_cooking: true };
          }
          if (station === 'BAR' && isDrink) {
            return { ...item, bar_cooking: true };
          }
          return item;
        });

        // Determine if order contains un-cancelled food items
        const hasFoodItems = (ord.items || []).some(item => !item.cancelled && !isDrinkItem(item, menuItems));

        // Mixed order: Only FOOD station triggers overall 'COOKING' status.
        // Drinks-only order (no food): BAR station 'Bancuh' WILL trigger overall 'COOKING' status.
        let newKitchenStatus = ord.kitchen_status;
        if (ord.kitchen_status === 'PENDING') {
          if (station === 'FOOD' || !hasFoodItems) {
            newKitchenStatus = 'COOKING';
          }
        }

        updatedTargetOrder = {
          ...ord,
          items: updatedItems,
          kitchen_status: newKitchenStatus,
          cooking_started_at: newKitchenStatus === 'COOKING' ? (ord.cooking_started_at || Date.now()) : ord.cooking_started_at
        };
        return updatedTargetOrder;
      }
      return ord;
    });
    setOrders(updatedOrders);
    broadcastState('STATION_COOKING', tables, sessions, updatedOrders);
    if (socketRef.current && updatedTargetOrder) {
      socketRef.current.emit('UPDATE_KITCHEN_STATUS', {
        order_id: orderId,
        kitchen_status: updatedTargetOrder.kitchen_status,
        cooking_started_at: updatedTargetOrder.cooking_started_at,
        items: updatedTargetOrder.items
      });
    }
  }, [orders, tables, sessions, menuItems, broadcastState]);

  /**
   * Mark all items for a station as DONE (completed).
   * Sets food_done or bar_done on each matching item.
   * station: 'FOOD' | 'BAR'
   * Does NOT change overall kitchen_status — that is managed by Clear/Serve.
   */
  const markStationItemsDone = useCallback((orderId, station) => {
    let updatedTargetOrder = null;
    const updatedOrders = orders.map(ord => {
      if (ord.order_id === orderId) {
        const updatedItems = (ord.items || []).map(item => {
          if (item.cancelled) return item;
          const isDrink = isDrinkItem(item, menuItems);
          if (station === 'FOOD' && !isDrink) {
            return { ...item, food_done: true, food_cooking: false };
          }
          if (station === 'BAR' && isDrink) {
            return { ...item, bar_done: true, bar_cooking: false };
          }
          return item;
        });
        updatedTargetOrder = { ...ord, items: updatedItems };
        return updatedTargetOrder;
      }
      return ord;
    });
    setOrders(updatedOrders);
    broadcastState('STATION_DONE', tables, sessions, updatedOrders);
    if (socketRef.current) {
      socketRef.current.emit('MARK_STATION_DONE', { 
        order_id: orderId, 
        station,
        items: updatedTargetOrder ? updatedTargetOrder.items : undefined
      });
    }
  }, [orders, tables, sessions, broadcastState]);

  // Manual Print Handler for KDS Cards (supports station-filtered printing)
  const manualPrintOrder = useCallback(async (targetOrder, stationFilter = 'ALL') => {
    const activeKitchenPrinter = kitchenBtDevice || btDevice;
    if (!targetOrder || !activeKitchenPrinter) {
      throw new Error('Sila sambungkan Bluetooth / Printer terlebih dahulu.');
    }
    // Filter items based on active station
    const allItems = targetOrder.items || [];
    let printItems = allItems;
    if (stationFilter === 'FOOD') {
      printItems = allItems.filter(i => !isDrinkItem(i, menuItems));
    } else if (stationFilter === 'BAR') {
      printItems = allItems.filter(i => isDrinkItem(i, menuItems));
    }
    if (printItems.length === 0) {
      throw new Error('Tiada item untuk dicetak bagi stesen ini.');
    }
    try {
      await printKitchenRunnerTicketBluetooth(activeKitchenPrinter, {
        tableNumber: targetOrder.table_number,
        orderId: targetOrder.order_id,
        customerName: targetOrder.customer_name || '',
        items: printItems,
        orderType: targetOrder.order_type || 'DINE_IN',
        specialNotes: targetOrder.special_notes || '',
        timestamp: targetOrder.timestamp
      }, receiptSettings, stationFilter, menuItems);
      clearPrintFailed(targetOrder.order_id);
      return true;
    } catch (err) {
      console.warn('Manual print error:', err);
      markPrintFailed(targetOrder.order_id);
      throw err;
    }
  }, [kitchenBtDevice, btDevice, receiptSettings, menuItems, clearPrintFailed, markPrintFailed]);

  const cancelOrderFromKitchen = useCallback((orderId, reason) => {
    const cancelReason = reason || 'Stok bahan mentah menu telah habis';
    let cancelledOrder = null;
    const updatedOrders = orders.map(ord => {
      if (ord.order_id === orderId) {
        cancelledOrder = ord;
        return {
          ...ord,
          kitchen_status: 'CANCELLED',
          kitchen_cancel_reason: cancelReason
        };
      }
      return ord;
    });

    setOrders(updatedOrders);
    broadcastState('STATUS_UPDATE', tables, sessions, updatedOrders);

    if (socketRef.current) {
      socketRef.current.emit('UPDATE_KITCHEN_STATUS', { order_id: orderId, kitchen_status: 'CANCELLED' });
      socketRef.current.emit('ORDER_CANCELLED_BY_KITCHEN', { order_id: orderId, reason: cancelReason });
    }

    // AUTO-SYNC: Mark items in cancelled order as OUT_OF_STOCK in KDS Stock Manager & Customer Menu
    if (cancelledOrder && cancelledOrder.items) {
      const itemsList = typeof cancelledOrder.items === 'string' ? JSON.parse(cancelledOrder.items) : cancelledOrder.items;
      if (Array.isArray(itemsList) && itemsList.length > 0) {
        const currentStock = receiptSettingsRef.current?.menuStock || {};
        const newStock = { ...currentStock };
        itemsList.forEach(item => {
          const key = item.id || item.name;
          if (key) newStock[key] = { status: 'OUT_OF_STOCK', stock_qty: 0 };
          if (item.name) newStock[item.name] = { status: 'OUT_OF_STOCK', stock_qty: 0 };
        });

        const mergedSettings = { ...receiptSettingsRef.current, menuStock: newStock };
        setReceiptSettings(mergedSettings);
        localStorage.setItem(STORAGE_KEYS.RECEIPT_SETTINGS, JSON.stringify(mergedSettings));

        if (socketRef.current) {
          socketRef.current.emit('UPDATE_SETTINGS', mergedSettings);
        }
        const port = window.location.port;
        const isLocalDev = port === '3000' || port === '5173';
        const BASE = isLocalDev ? `http://${window.location.hostname}:5000` : window.location.origin;
        try {
          fetch(`${BASE}/api/settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(mergedSettings)
          });
        } catch(e) {}
      }
    }
  }, [orders, tables, sessions, broadcastState]);

  const cancelOrderItemsFromKitchen = useCallback((orderId, itemIndicesToCancel, reason) => {
    const cancelReason = reason || 'Stok bahan mentah menu telah habis';
    let isFullyCancelled = false;
    let targetOrder = null;

    const updatedOrders = orders.map(ord => {
      if (ord.order_id === orderId) {
        const currentItems = ord.items || [];
        const updatedItems = currentItems.map((item, idx) => {
          if (itemIndicesToCancel.includes(idx)) {
            return {
              ...item,
              cancelled: true,
              cancel_reason: cancelReason,
              food_done: false,
              bar_done: false,
              food_cooking: false,
              bar_cooking: false
            };
          }
          return item;
        });

        const activeItems = updatedItems.filter(i => !i.cancelled);
        isFullyCancelled = activeItems.length === 0;
        const newKitchenStatus = isFullyCancelled ? 'CANCELLED' : ord.kitchen_status;

        targetOrder = {
          ...ord,
          items: updatedItems,
          kitchen_status: newKitchenStatus,
          kitchen_cancel_reason: isFullyCancelled ? cancelReason : ord.kitchen_cancel_reason
        };
        return targetOrder;
      }
      return ord;
    });

    setOrders(updatedOrders);
    broadcastState('STATUS_UPDATE', tables, sessions, updatedOrders);

    if (socketRef.current && targetOrder) {
      if (isFullyCancelled) {
        socketRef.current.emit('UPDATE_KITCHEN_STATUS', { order_id: orderId, kitchen_status: 'CANCELLED', items: targetOrder.items });
        socketRef.current.emit('ORDER_CANCELLED_BY_KITCHEN', {
          order_id: orderId,
          reason: cancelReason,
          is_full_cancel: true,
          items: targetOrder.items
        });
      } else {
        socketRef.current.emit('UPDATE_KITCHEN_STATUS', {
          order_id: orderId,
          kitchen_status: targetOrder.kitchen_status,
          items: targetOrder.items
        });
        socketRef.current.emit('ORDER_CANCELLED_BY_KITCHEN', {
          order_id: orderId,
          reason: `Item dibatalkan: ${cancelReason}`,
          is_full_cancel: false,
          items: targetOrder.items
        });
      }
    }

    // AUTO-SYNC: Mark cancelled items as OUT_OF_STOCK in KDS Stock Manager & Customer Menu
    if (targetOrder && Array.isArray(targetOrder.items)) {
      const currentStock = receiptSettingsRef.current?.menuStock || {};
      const newStock = { ...currentStock };
      let updatedAny = false;

      targetOrder.items.forEach((item, idx) => {
        if (itemIndicesToCancel.includes(idx)) {
          const key = item.id || item.name;
          if (key) newStock[key] = { status: 'OUT_OF_STOCK', stock_qty: 0 };
          if (item.name) newStock[item.name] = { status: 'OUT_OF_STOCK', stock_qty: 0 };
          updatedAny = true;
        }
      });

      if (updatedAny) {
        const mergedSettings = { ...receiptSettingsRef.current, menuStock: newStock };
        setReceiptSettings(mergedSettings);
        localStorage.setItem(STORAGE_KEYS.RECEIPT_SETTINGS, JSON.stringify(mergedSettings));

        if (socketRef.current) {
          socketRef.current.emit('UPDATE_SETTINGS', mergedSettings);
        }
        const port = window.location.port;
        const isLocalDev = port === '3000' || port === '5173';
        const BASE = isLocalDev ? `http://${window.location.hostname}:5000` : window.location.origin;
        try {
          fetch(`${BASE}/api/settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(mergedSettings)
          });
        } catch(e) {}
      }
    }
  }, [orders, tables, sessions, broadcastState]);

  const completePayment = useCallback((sessionId, tableNumber) => {
    const updatedSessions = {
      ...sessions,
      [sessionId]: {
        ...sessions[sessionId],
        status: 'CLOSED',
        closed_at: new Date().toISOString()
      }
    };

    const updatedOrders = orders.map(ord => {
      if (ord.session_id === sessionId) {
        const isPaymentPending = ord.kitchen_status === 'PAYMENT_PENDING';
        return { 
          ...ord, 
          payment_status: 'PAID',
          kitchen_status: isPaymentPending ? 'PENDING' : ord.kitchen_status
        };
      }
      return ord;
    });

    const updatedTables = tables.map(t => {
      if (t.table_number === Number(tableNumber)) {
        return { ...t, status: 'KOSONG', current_session_id: null };
      }
      return t;
    });

    setSessions(updatedSessions);
    setOrders(updatedOrders);
    setTables(updatedTables);
    broadcastState('SESSION_CLOSED', updatedTables, updatedSessions, updatedOrders);

    // Emit Socket Event for real-time cross-device payment close sync
    if (socketRef.current) {
      socketRef.current.emit('CLOSE_SESSION', { session_id: sessionId, table_number: Number(tableNumber) });
    }
  }, [sessions, orders, tables, broadcastState]);

  const cancelSession = useCallback((sessionId, tableNumber, reason = 'Sesi dibatalkan oleh kaunter') => {
    const updatedSessions = {
      ...sessions,
      [sessionId]: {
        ...(sessions[sessionId] || { session_id: sessionId, table_number: Number(tableNumber) }),
        status: 'CLOSED',
        is_cancelled: true,
        closed_at: new Date().toISOString()
      }
    };

    const updatedOrders = orders.map(ord => {
      if (ord.session_id === sessionId) {
        return {
          ...ord,
          kitchen_status: 'CANCELLED',
          kitchen_cancel_reason: reason
        };
      }
      return ord;
    });

    const updatedTables = tables.map(t => {
      if (t.table_number === Number(tableNumber)) {
        return { ...t, status: 'KOSONG', current_session_id: null };
      }
      return t;
    });

    setSessions(updatedSessions);
    setOrders(updatedOrders);
    setTables(updatedTables);
    broadcastState('CLOSE_SESSION', updatedTables, updatedSessions, updatedOrders);

    // Emit Socket Event for real-time cross-device session cancellation sync
    if (socketRef.current) {
      socketRef.current.emit('CANCEL_SESSION', { 
        session_id: sessionId, 
        table_number: Number(tableNumber),
        reason 
      });
    }
  }, [sessions, tables, orders, broadcastState]);

  const resetDemoData = useCallback(async () => {
    // 1. Clear Local & Session Storage
    localStorage.removeItem(STORAGE_KEYS.TABLES);
    localStorage.removeItem(STORAGE_KEYS.SESSIONS);
    localStorage.removeItem(STORAGE_KEYS.ORDERS);

    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('fb_customer_name_')) {
        sessionStorage.removeItem(key);
      }
    });

    // 2. Reset React State
    setTables(INITIAL_TABLES);
    setSessions({});
    setOrders([]);

    // 3. Reset Backend SQLite Database if active
    try {
      await fetch('http://localhost:5000/api/reset', { method: 'POST' });
    } catch (e) {
      console.warn('Backend reset call bypassed (server offline or local mode)');
    }

    // 4. Broadcast RESET state to all active browser tabs
    broadcastState('RESET', INITIAL_TABLES, {}, []);
  }, [broadcastState]);

  const clearSingleTable = useCallback((tableNumber) => {
    const tableNum = Number(tableNumber);
    const updatedTables = tables.map(t => {
      if (t.table_number === tableNum) {
        return { ...t, status: 'KOSONG', current_session_id: null };
      }
      return t;
    });

    setTables(updatedTables);
    broadcastState('TABLE_CLEAR', updatedTables, sessions, orders);
  }, [tables, sessions, orders, broadcastState]);

  const seedSampleDemo = useCallback(() => {
    const tableNo = 5;
    const sessionId = `SES-59823`;

    const sampleSession = {
      session_id: sessionId,
      table_number: tableNo,
      created_at: new Date(Date.now() - 15 * 60000).toISOString(),
      status: 'ACTIVE'
    };

    const sampleOrder1 = {
      order_id: 'ORD-1001',
      session_id: sessionId,
      table_number: tableNo,
      timestamp: new Date(Date.now() - 12 * 60000).toISOString(),
      items: [
        {
          id: 'M1',
          name: 'Nasi Ayam Hainan Steam',
          price: 12.90,
          quantity: 2,
          options: 'Bahagian Paha (Thigh)',
          special_note: 'Kuah lebih halia'
        },
        {
          id: 'M7',
          name: 'Teh Tarik Kaw / Teh Ais',
          price: 3.50,
          quantity: 2,
          options: 'Ais (Teh Ais), Kurang Manis',
          special_note: ''
        }
      ],
      total_amount: 32.80,
      kitchen_status: 'COOKING',
      payment_status: 'UNPAID',
      special_notes: 'Sila hantar air dahulu.'
    };

    const sampleOrder2 = {
      order_id: 'ORD-1002',
      session_id: sessionId,
      table_number: tableNo,
      timestamp: new Date(Date.now() - 4 * 60000).toISOString(),
      items: [
        {
          id: 'M6',
          name: 'Keropok Lekor Terengganu (6 Pcs)',
          price: 6.90,
          quantity: 1,
          options: '',
          special_note: 'Goreng garing'
        }
      ],
      total_amount: 6.90,
      kitchen_status: 'PENDING',
      payment_status: 'UNPAID',
      special_notes: ''
    };

    const updatedSessions = { [sessionId]: sampleSession };
    const updatedOrders = [sampleOrder2, sampleOrder1];
    const updatedTables = INITIAL_TABLES.map(t => {
      if (t.table_number === tableNo) {
        return { ...t, status: 'SEDANG_MAKAN', current_session_id: sessionId };
      }
      return t;
    });

    setTables(updatedTables);
    setSessions(updatedSessions);
    setOrders(updatedOrders);
    broadcastState('SEED_DEMO', updatedTables, updatedSessions, updatedOrders);
  }, [broadcastState]);

  const submitCustomerFeedback = useCallback(async (feedbackData) => {
    const { order_id, table_number, customer_name, rating, commented_items, comment } = feedbackData || {};
    const newFb = {
      feedback_id: `FB-${Date.now()}`,
      order_id: order_id || 'N/A',
      table_number: table_number || null,
      customer_name: customer_name || 'Pelanggan',
      rating: rating || 'GOOD',
      commented_items: Array.isArray(commented_items) ? commented_items : [],
      comment: comment || '',
      created_at: new Date().toISOString()
    };

    const port = window.location.port;
    const isLocalDev = port === '3000' || port === '5173';
    const BACKEND_URL = isLocalDev ? `http://${window.location.hostname}:5000` : window.location.origin;
    const targetEndpointUrl = `${BACKEND_URL}/api/feedback`;

    let response;
    try {
      response = await fetch(targetEndpointUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFb)
      });
    } catch (netErr) {
      const errorMsg = `⚠️ [DEBUG NETWORK ERROR]\n\n• Kod / Jenis Ralat: NetworkError (Failed to Fetch)\n• Endpoint URL: ${targetEndpointUrl}\n• Status Order ID: ${newFb.order_id}\n• Protokol / Host Phone: ${window.location.protocol}//${window.location.host}\n• Punca: Sambungan terputus / CORS / Mixed Content (http vs https).`;
      console.error(errorMsg, netErr);
      throw new Error(errorMsg);
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      const errorMsg = `⚠️ [DEBUG HTTP ERROR]\n\n• Kod Ralat: HTTP ${response.status} (${response.statusText || 'Error'})\n• Endpoint URL: ${targetEndpointUrl}\n• Status Order ID: ${newFb.order_id}\n• Respon Backend: ${errText.slice(0, 150) || 'Tiada maklum balas'}`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    }

    const resJson = await response.json().catch(() => ({ status: 'OK' }));
    if (resJson.status === 'ERROR') {
      const errorMsg = `⚠️ [DEBUG BACKEND ERROR]\n\n• Mesej Ralat: ${resJson.message || 'Ralat backend'}\n• Endpoint URL: ${targetEndpointUrl}\n• Status Order ID: ${newFb.order_id}`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    }

    // Update local state after successful submission
    setFeedbacks(prev => {
      const exists = prev.some(f => f.feedback_id === newFb.feedback_id || (f.order_id === newFb.order_id && f.order_id !== 'N/A'));
      if (exists) return prev;
      return [newFb, ...prev];
    });

    return resJson;
  }, []);

  return (
    <OrderContext.Provider value={{
      tables,
      sessions,
      orders,
      feedbacks,
      submitCustomerFeedback,
      menuItems,
      updateMenuItems,
      menuStock: receiptSettings?.menuStock || {},
      updateMenuStock: async (newStockMap) => {
        const merged = { ...receiptSettings, menuStock: newStockMap };
        setReceiptSettings(merged);
        localStorage.setItem(STORAGE_KEYS.RECEIPT_SETTINGS, JSON.stringify(merged));
        if (socketRef.current) {
          socketRef.current.emit('UPDATE_SETTINGS', merged);
        }
        const port = window.location.port;
        const isLocalDev = port === '3000' || port === '5173';
        const BASE = isLocalDev ? `http://${window.location.hostname}:5000` : window.location.origin;
        try {
          await fetch(`${BASE}/api/settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(merged)
          });
        } catch(e) {
          console.warn('Failed to post stock update to API:', e);
        }
      },
      isAudioEnabled,
      enableAudio,
      playBeepSound,
      btDevice,
      btConnecting,
      btStatusMsg,
      connectCentralizedBluetooth,
      disconnectCentralizedBluetooth,
      kitchenBtDevice,
      kitchenBtConnecting,
      kitchenBtStatusMsg,
      connectKitchenBluetooth,
      disconnectKitchenBluetooth,
      createSession,
      submitOrder,
      updateKitchenStatus,
      cancelOrderFromKitchen,
      cancelOrderItemsFromKitchen,
      completePayment,
      cancelSession,
      clearSingleTable,
      receiptSettings,
      operationalMode: receiptSettings?.operationalMode || 'POSTPAY',
      updateReceiptSettings: async (newSettings) => {
        const merged = { ...receiptSettings, ...newSettings };
        setReceiptSettings(merged);
        localStorage.setItem(STORAGE_KEYS.RECEIPT_SETTINGS, JSON.stringify(merged));

        // Dynamically adjust tables grid count if tableCount was updated
        if (newSettings.tableCount && Number(newSettings.tableCount) !== tables.length) {
          const targetCount = Number(newSettings.tableCount);
          let updatedTables = [...tables];
          if (targetCount > tables.length) {
            const extra = Array.from({ length: targetCount - tables.length }, (_, i) => ({
              table_number: tables.length + i + 1,
              status: 'KOSONG',
              current_session_id: null
            }));
            updatedTables = [...tables, ...extra];
          } else {
            updatedTables = tables.slice(0, targetCount);
          }
          setTables(updatedTables);
          localStorage.setItem(STORAGE_KEYS.TABLES, JSON.stringify(updatedTables));
          broadcastState('TABLES_RESIZED', updatedTables, sessions, orders);
        }

        // Emit UPDATE_SETTINGS to backend SQLite database & sync across all devices via Socket.io
        if (socketRef.current) {
          socketRef.current.emit('UPDATE_SETTINGS', merged);
        }

        // Also POST to REST API for persistence
        const port = window.location.port;
        const isLocalDev = port === '3000' || port === '5173';
        const BASE = isLocalDev ? `http://${window.location.hostname}:5000` : window.location.origin;
        try {
          await fetch(`${BASE}/api/settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(merged)
          });
        } catch (e) {
          console.warn('Failed to save settings via REST API:', e);
        }
      },
      failedPrintOrderIds: failedPrintOrderIds || {},
      markPrintFailed,
      clearPrintFailed,
      manualPrintOrder,
      markStationCooking,
      markStationItemsDone,
      playAudioFile,
      handleBtConnectSuccess,
      handleBtConnectFailure,
      resetDemoData,
      seedSampleDemo
    }}>
      {children}
    </OrderContext.Provider>
  );
}

export function useOrder() {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error('useOrder must be used within an OrderProvider');
  }
  return context;
}
