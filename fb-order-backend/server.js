require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// ============================================================
// GLOBAL CRASH GUARDS — Server must NEVER crash from unhandled errors
// Log the error and keep the server running.
// ============================================================
process.on('uncaughtException', (err) => {
  console.error('\n❌❌❌ UNCAUGHT EXCEPTION (server kept alive):', err.message);
  console.error(err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('\n⚠️⚠️⚠️ UNHANDLED PROMISE REJECTION (server kept alive):', reason);
});

const {
  getSystemState,
  getSettings,
  createSession,
  submitOrder,
  updateKitchenStatus,
  updateOrderItems,
  closeSession,
  cancelSession,
  updateSettings,
  resetAllData,
  insertCustomerFeedback,
  getAllCustomerFeedbacks
} = require('./database');

// ============================================================
// MENU DATA PATH (Persistent JSON storage on VPS/PC)
// ============================================================
const MENU_DATA_PATH = path.join(__dirname, 'data', 'menu.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads', 'menu-images');
const BANNER_UPLOAD_DIR = path.join(__dirname, 'uploads', 'banners');

// Ensure directories exist
if (!fs.existsSync(path.join(__dirname, 'data'))) fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(BANNER_UPLOAD_DIR)) fs.mkdirSync(BANNER_UPLOAD_DIR, { recursive: true });

// Helper: Read menu from JSON file
function readMenuData() {
  try {
    if (fs.existsSync(MENU_DATA_PATH)) {
      return JSON.parse(fs.readFileSync(MENU_DATA_PATH, 'utf8'));
    }
  } catch (e) { console.error('Error reading menu.json:', e); }
  return [];
}

// Helper: Write menu to JSON file
function writeMenuData(menuArray) {
  fs.writeFileSync(MENU_DATA_PATH, JSON.stringify(menuArray, null, 2), 'utf8');
}

// Multer Config: save uploaded images to uploads/menu-images/
const menuImageStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `menu-${Date.now()}-${Math.floor(Math.random()*10000)}${ext}`;
    cb(null, safeName);
  }
});
const uploadMenuImage = multer({
  storage: menuImageStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Format fail tidak disokong. Sila guna JPG, PNG, atau WEBP.'));
    }
  }
});

const app = express();
const server = http.createServer(app);

// Enable CORS for Express REST API & Socket.io
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ============================================================
// SERVE STATIC FRONTEND BUILD (dist/) FROM BACKEND PORT
// This enables single-port architecture:
// - Local Dev:  Frontend Vite :3000, Backend :5000 (both work)
// - ngrok/VPS:  ONLY tunnel port 5000 — serves everything!
//   Run: ngrok http 5000
// ============================================================
const distPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  console.log('📦 Serving built frontend from dist/ folder');
} else {
  console.warn('⚠️  No dist/ folder found. Run "npm run build" first for production mode.');
}

// Serve uploaded menu images as static files
// Access via: /uploads/menu-images/filename.jpg
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const io = new Server(server, {
  maxHttpBufferSize: 5e7,
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 5000;

// REST API Endpoints
app.get('/api/health', (req, res) => {
  try {
    // Quick DB connectivity check
    const { db, getSettings } = require('./database');
    const dbOk = !!db.prepare('SELECT 1').get();
    const settings = getSettings();
    res.json({
      status: 'OK',
      message: 'F&B Order Backend Server is Running!',
      timestamp: new Date().toISOString(),
      database: dbOk ? 'CONNECTED' : 'ERROR',
      operationalMode: settings.operationalMode || 'POSTPAY',
      emergencyMode: settings.emergencyMode?.enabled || false
    });
  } catch (error) {
    res.status(500).json({ status: 'ERROR', message: error.message, database: 'ERROR' });
  }
});

app.get('/api/state', (req, res) => {
  try {
    const state = getSystemState();
    res.json({ status: 'OK', data: state });
  } catch (error) {
    res.status(500).json({ status: 'ERROR', message: error.message });
  }
});

app.post('/api/reset', (req, res) => {
  try {
    const state = resetAllData();
    io.emit('SYSTEM_STATE_UPDATED', state);
    res.json({ status: 'OK', message: 'All system data reset successfully', data: state });
  } catch (error) {
    res.status(500).json({ status: 'ERROR', message: error.message });
  }
});

// GET /api/settings — Get receipt & system settings
app.get('/api/settings', (req, res) => {
  try {
    const settings = getSettings();
    res.json({ status: 'OK', data: settings });
  } catch (error) {
    res.status(500).json({ status: 'ERROR', message: error.message });
  }
});

// POST /api/settings — Update settings & expand/contract table grid count in SQLite
app.post('/api/settings', (req, res) => {
  try {
    const updatedState = updateSettings(req.body || {});
    io.emit('SYSTEM_STATE_UPDATED', updatedState);
    const settingsData = updatedState.settings || getSettings();
    io.emit('SETTINGS_UPDATED', settingsData);
    if (settingsData?.emergencyMode || req.body?.emergencyMode) {
      io.emit('EMERGENCY_MODE_TOGGLED', settingsData?.emergencyMode || req.body?.emergencyMode);
    }
    res.json({ status: 'OK', message: 'Tetapan berjaya dikemas kini!', data: updatedState });
  } catch (error) {
    res.status(500).json({ status: 'ERROR', message: error.message });
  }
});

// ============================================================
// MENU MANAGEMENT REST API
// ============================================================

// GET /api/menu — Get all menu items
app.get('/api/menu', (req, res) => {
  try {
    const menu = readMenuData();
    res.json({ status: 'OK', data: menu });
  } catch (error) {
    res.status(500).json({ status: 'ERROR', message: error.message });
  }
});

// POST /api/menu — Save entire menu array (replaces all)
app.post('/api/menu', (req, res) => {
  try {
    const menuArray = req.body;
    if (!Array.isArray(menuArray)) {
      return res.status(400).json({ status: 'ERROR', message: 'Data menu mesti dalam format senarai (array).' });
    }
    writeMenuData(menuArray);
    // Broadcast updated menu to all connected clients (real-time sync)
    io.emit('MENU_UPDATED', menuArray);
    console.log(`🍽️  MENU_UPDATED: ${menuArray.length} item(s) saved`);
    res.json({ status: 'OK', message: 'Menu berjaya disimpan!', data: menuArray });
  } catch (error) {
    res.status(500).json({ status: 'ERROR', message: error.message });
  }
});

// POST /api/menu/upload-image — Upload menu item image
app.post('/api/menu/upload-image', (req, res) => {
  uploadMenuImage.single('image')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ status: 'ERROR', message: err.message || 'Gagal muat naik gambar.' });
    }
    if (!req.file) {
      return res.status(400).json({ status: 'ERROR', message: 'Tiada fail gambar yang dihantar.' });
    }
    // Build the public URL for this image
    const protocol = req.protocol;
    const host = req.get('host');
    const imageUrl = `${protocol}://${host}/uploads/menu-images/${req.file.filename}`;
    console.log(`🖼️  IMAGE_UPLOADED: ${req.file.filename} (${(req.file.size/1024).toFixed(1)}KB)`);
    res.json({ status: 'OK', message: 'Gambar berjaya dimuat naik!', url: imageUrl, filename: req.file.filename });
  });
});

// DELETE /api/menu/image/:filename — Delete a menu image from server
app.delete('/api/menu/image/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    // Only allow deleting files in the uploads directory (security)
    const filePath = path.join(UPLOADS_DIR, path.basename(filename));
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`🗑️  IMAGE_DELETED: ${filename}`);
      res.json({ status: 'OK', message: 'Gambar berjaya dipadam.' });
    }
  } catch (error) {
    res.status(500).json({ status: 'ERROR', message: error.message });
  }
});

// GET /api/feedbacks — Retrieve customer feedbacks (with LIMIT 50 pagination)
app.get('/api/feedbacks', (req, res) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const feedbacks = getAllCustomerFeedbacks(limit);
    res.json({ status: 'OK', data: feedbacks });
  } catch (error) {
    res.status(500).json({ status: 'ERROR', message: error.message });
  }
});

// Helper function to escape HTML special characters for Telegram HTML parse_mode
function escapeTelegramHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Helper to translate Telegram API error response codes to human-readable Malay messages
function parseTelegramError(responseStatus, resJson) {
  const desc = resJson?.description || '';
  if (responseStatus === 401 || desc.toLowerCase().includes('unauthorized') || desc.toLowerCase().includes('invalid token')) {
    return '❌ Bot Token Telegram tidak sah (HTTP 401 Unauthorized). Sila semak semula Token daripada @BotFather.';
  }
  if (responseStatus === 403 || desc.toLowerCase().includes('forbidden') || desc.toLowerCase().includes('blocked') || desc.toLowerCase().includes('not a member')) {
    return '❌ Telegram Bot disekat atau belum dimasukkan ke dalam Group (HTTP 403 Forbidden). Sila unblock atau masukkan bot ke dalam group & beri kebenaran.';
  }
  if (responseStatus === 400 || desc.toLowerCase().includes('chat not found') || desc.toLowerCase().includes('bad request')) {
    return `❌ Chat ID / Channel ID tidak dijumpai (HTTP 400 Bad Request: ${desc || 'Chat not found'}). Sila tekan /start pada bot atau semak ID.`;
  }
  return `❌ Gagal berhubung dengan Telegram Bot API (HTTP ${responseStatus}): ${desc || 'Ralat sambungan'}`;
}

// Safe helper function to send Telegram notifications asynchronously (non-blocking)
async function sendTelegramFeedbackNotification(feedbackData, telegramConfig) {
  try {
    const { telegramEnabled, telegramBotToken, telegramChatId } = telegramConfig || {};
    if (!telegramEnabled || !telegramBotToken || !telegramChatId) {
      return false;
    }

    const { order_id, table_number, customer_name, rating, commented_items, comment, created_at } = feedbackData || {};

    const isGood = rating === 'GOOD';
    const ratingBadge = isGood ? '👍 <b>PUAS HATI</b>' : '👎 <b>KURANG PUAS</b>';
    const orderIdStr = escapeTelegramHtml(order_id || 'N/A');
    const tableStr = table_number ? ` (MEJA ${table_number})` : '';
    const nameStr = escapeTelegramHtml(customer_name || 'Pelanggan');

    let itemsList = '<i>(Tiada item ditandakan)</i>';
    let parsedItems = commented_items;
    if (typeof parsedItems === 'string') {
      try { parsedItems = JSON.parse(parsedItems); } catch(e) { parsedItems = []; }
    }
    if (Array.isArray(parsedItems) && parsedItems.length > 0) {
      itemsList = parsedItems.map(i => `• 🍲 ${escapeTelegramHtml(i)}`).join('\n');
    }

    const cleanComment = comment ? escapeTelegramHtml(comment.trim()) : '';
    const commentStr = cleanComment ? `<i>"${cleanComment}"</i>` : '<i>(Tiada ulasan bertulis)</i>';

    const dateObj = created_at ? new Date(created_at) : new Date();
    const dateStr = dateObj.toLocaleDateString('ms-MY', { timeZone: 'Asia/Kuala_Lumpur' });
    const timeStr = dateObj.toLocaleTimeString('ms-MY', { timeZone: 'Asia/Kuala_Lumpur', hour: '2-digit', minute: '2-digit' });

    const messageHtml = 
`💬 <b>MAKLUM BALAS PELANGGAN BAHARU</b>
━━━━━━━━━━━━━━━━━━
<b>Status:</b> ${ratingBadge}
<b>Resit #:</b> <code>${orderIdStr}</code>${tableStr}
<b>Pelanggan:</b> ${nameStr}

<b>Hidangan Ditandakan:</b>
${itemsList}

<b>Komen Pelanggan:</b>
${commentStr}

<b>Tarikh/Masa:</b> 📅 ${dateStr}, ${timeStr}
━━━━━━━━━━━━━━━━━━`;

    const token = String(telegramBotToken).trim().replace(/^bot/i, '');
    const chatId = String(telegramChatId).trim();
    const url = `https://api.telegram.org/bot${token}/sendMessage`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: messageHtml,
        parse_mode: 'HTML'
      })
    });

    const resJson = await response.json().catch(() => ({}));
    if (!response.ok || !resJson.ok) {
      console.warn('⚠️ Telegram Bot API error response:', parseTelegramError(response.status, resJson));
      return false;
    }

    console.log(`✈️ TELEGRAM NOTIFICATION SENT: Order ${orderIdStr} (${rating})`);
    return true;
  } catch (err) {
    console.warn('⚠️ Telegram notification error (non-blocking background):', err.message);
    return false;
  }
}

// PUBLIC UNPROTECTED FEEDBACK SUBMISSION HANDLER (No Staff Token Required!)
const handlePublicFeedbackSubmission = (req, res) => {
  try {
    const body = req.body || {};
    const routeOrderId = req.params?.orderId;
    const order_id = routeOrderId || body.order_id || body.orderId || 'N/A';
    const table_number = body.table_number || body.tableNumber || null;
    const customer_name = body.customer_name || body.customerName || 'Pelanggan';
    const rating = body.rating || body.ratingScore || 'GOOD';
    const commented_items = body.commented_items || body.commentedItems || [];
    const comment = body.comment || body.feedback || body.message || '';

    const newFeedback = insertCustomerFeedback({
      order_id,
      table_number,
      customer_name,
      rating,
      commented_items,
      comment
    });

    if (newFeedback.duplicate) {
      return res.json({ status: 'OK', duplicate: true, message: newFeedback.message, data: newFeedback });
    }

    // Broadcast new feedback to all connected clients (Dashboard real-time update)
    io.emit('NEW_FEEDBACK_SUBMITTED', newFeedback);
    console.log(`💬 NEW_FEEDBACK: Rating [${newFeedback.rating}] for Order ${newFeedback.order_id}`);

    // Send Telegram Notification in Background via setImmediate (Zero Lag for Customer Phone)
    setImmediate(() => {
      try {
        const currentSettings = getSettings() || {};
        if (currentSettings.telegramEnabled && currentSettings.telegramBotToken && currentSettings.telegramChatId) {
          sendTelegramFeedbackNotification(newFeedback, currentSettings).catch(tErr => {
            console.warn('⚠️ Telegram async error:', tErr.message);
          });
        }
      } catch (tErr) {
        console.warn('⚠️ Telegram check background error:', tErr.message);
      }
    });

    res.json({ status: 'OK', message: 'Maklum balas berjaya dihantar!', data: newFeedback });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ status: 'ERROR', message: error.message });
  }
};

// PUBLIC UNPROTECTED FEEDBACK ENDPOINTS — Customer Phone / QR Code Access
app.post('/api/feedback', handlePublicFeedbackSubmission);
app.post('/api/feedbacks', handlePublicFeedbackSubmission);
app.post('/api/orders/:orderId/feedback', handlePublicFeedbackSubmission);
app.post('/api/order/:orderId/feedback', handlePublicFeedbackSubmission);

// POST /api/telegram/test — Test Telegram Bot connection
app.post('/api/telegram/test', async (req, res) => {
  try {
    const { telegramBotToken, telegramChatId } = req.body || {};
    if (!telegramBotToken || !telegramChatId) {
      return res.status(400).json({ status: 'ERROR', message: 'Sila masukkan Bot Token dan Chat ID / Channel ID.' });
    }

    const token = String(telegramBotToken).trim().replace(/^bot/i, '');
    const chatId = String(telegramChatId).trim();

    const testMessageHtml = 
`🤖 <b>UJIAN SAMBUNGAN TELEGRAM BOT BERJAYA!</b>
━━━━━━━━━━━━━━━━━━
Sistem F&B Ordering anda kini telah berjaya dihubungkan ke Telegram Bot!

<b>Bot Token:</b> <code>${escapeTelegramHtml(token.slice(0, 12))}...</code>
<b>Chat ID:</b> <code>${escapeTelegramHtml(chatId)}</code>
<b>Tarikh/Masa:</b> 📅 ${new Date().toLocaleString('ms-MY', { timeZone: 'Asia/Kuala_Lumpur' })}
━━━━━━━━━━━━━━━━━━
<i>Setiap kali pelanggan menghantar maklum balas (feedback), notifikasi lengkap akan terus dihantar ke Telegram ini secara automatik.</i>`;

    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: testMessageHtml,
        parse_mode: 'HTML'
      })
    });

    const resJson = await response.json().catch(() => ({}));
    if (!response.ok || !resJson.ok) {
      const friendlyErrMsg = parseTelegramError(response.status, resJson);
      return res.status(response.status >= 400 && response.status < 500 ? response.status : 400).json({
        status: 'ERROR',
        message: friendlyErrMsg
      });
    }

    res.json({ status: 'OK', message: 'Mesej ujian berjaya dihantar ke Telegram!' });
  } catch (error) {
    console.error('Telegram Test Error:', error);
    res.status(500).json({ status: 'ERROR', message: `Ralat Ujian Telegram: ${error.message}` });
  }
});

// POST /api/banner/upload — Save welcome banner (Base64) as a real file on disk
// Returns a permanent public URL instead of storing huge Base64 in database
app.post('/api/banner/upload', (req, res) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ status: 'ERROR', message: 'Tiada data gambar yang dihantar.' });
    }

    // Strip data URL prefix: "data:image/jpeg;base64,..."
    const matches = imageBase64.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) {
      return res.status(400).json({ status: 'ERROR', message: 'Format data gambar tidak sah.' });
    }

    const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
    const base64Data = matches[2];
    const filename = `welcome-banner.${ext}`;
    const filePath = path.join(BANNER_UPLOAD_DIR, filename);

    // Write file to disk (overwrite any existing banner)
    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));

    const protocol = req.protocol;
    const host = req.get('host');
    const bannerUrl = `${protocol}://${host}/uploads/banners/${filename}`;

    console.log(`🖼️  BANNER_UPLOADED: ${filename} (${(Buffer.byteLength(base64Data, 'base64')/1024).toFixed(1)}KB)`);
    res.json({ status: 'OK', message: 'Banner berjaya dimuat naik!', url: bannerUrl });
  } catch (error) {
    console.error('BANNER_UPLOAD Error:', error);
    res.status(500).json({ status: 'ERROR', message: error.message });
  }
});

// Fallback: serve index.html for all non-API routes (React SPA routing)
app.get('*', (req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Frontend not built yet. Run: npm run build');
  }
});

// Socket.io Real-Time Events Engine
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  // Per-socket simple rate limiter: max 30 events/second to prevent flood attacks
  let eventCount = 0;
  const rateLimitReset = setInterval(() => { eventCount = 0; }, 1000);
  socket.on('disconnect', () => {
    clearInterval(rateLimitReset);
    console.log(`❌ Client disconnected: ${socket.id}`);
  });

  const checkRateLimit = () => {
    eventCount++;
    if (eventCount > 30) {
      console.warn(`⚠️  Rate limit hit for socket ${socket.id} — event ignored.`);
      return false;
    }
    return true;
  };

  // Send Initial State to freshly connected client
  try {
    const initialState = getSystemState();
    socket.emit('INIT_STATE', initialState);
  } catch (err) {
    console.error('Error sending INIT_STATE:', err);
  }

  // Event 1: CREATE_SESSION (Counter Creates New Session)
  socket.on('CREATE_SESSION', (payload) => {
    try {
      const { table_number, session_id } = payload || {};
      if (!table_number || !session_id) {
        return socket.emit('ERROR', { message: 'Missing table_number or session_id' });
      }

      console.log(`📌 CREATE_SESSION: Table ${table_number} -> Session ${session_id}`);
      const updatedState = createSession(table_number, session_id);

      io.emit('SYSTEM_STATE_UPDATED', updatedState);
    } catch (error) {
      console.error('CREATE_SESSION Error:', error);
      socket.emit('ERROR', { message: error.message });
    }
  });

// Security Helper: Sanitize text inputs against XSS injection attacks
function sanitizeInput(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
}

  // Event 2: SUBMIT_ORDER (Customer Submits Order)
  socket.on('SUBMIT_ORDER', (payload) => {
    if (!checkRateLimit()) return;
    try {
      const { session_id, table_number, order_id, customer_name, items, total_amount, order_type } = payload || {};
      if (!session_id || !table_number || !order_id) {
        return socket.emit('ERROR', { message: 'Missing order details (session_id, table_number, order_id required)' });
      }
      if (!items || (Array.isArray(items) && items.length === 0)) {
        return socket.emit('ERROR', { message: 'Tiada item dalam pesanan.' });
      }

      // XSS Protection: Sanitize customer inputs
      const safeCustomerName = sanitizeInput(customer_name || 'Pelanggan').slice(0, 50);
      const safeSpecialNotes = sanitizeInput(payload.special_notes || '').slice(0, 200);

      console.log(`🛒 SUBMIT_ORDER: Order ${order_id} — Meja ${table_number} — [${order_type || 'DINE_IN'}] — Pelanggan: ${safeCustomerName}`);

      const updatedState = submitOrder({
        order_id,
        session_id,
        table_number,
        customer_name: safeCustomerName,
        order_type: order_type || 'DINE_IN',
        items: typeof items === 'string' ? items : JSON.stringify(items || []),
        subtotal: Number(payload.subtotal || total_amount || 0),
        tax: Number(payload.tax || 0),
        total_amount: Number(total_amount || 0),
        special_instruction: safeSpecialNotes
      });

      // Determine if this order is immediately dispatched to KDS
      // POSTPAY: order goes directly to KDS (kitchen_status = PENDING) — emit chime
      // PREPAY: order held as PAYMENT_PENDING — do NOT emit KDS chime yet
      const settings = getSettings();
      const isPrepay = settings.operationalMode === 'PREPAY';
      if (!isPrepay) {
        // POSTPAY: notify KDS of new order with audio chime
        io.emit('NEW_ORDER_RECEIVED', {
          order_id,
          table_number,
          session_id,
          customer_name: customer_name || '',
          timestamp: new Date().toISOString()
        });
      }

      // Broadcast updated system state to ALL clients
      io.emit('SYSTEM_STATE_UPDATED', updatedState);

    } catch (error) {
      console.error('SUBMIT_ORDER Error:', error.message);

      if (error.code === 'STOCK_VALIDATION_FAILED' || error.message.includes('Pesanan Ditolak') || error.message.includes('HABIS STOK')) {
        return socket.emit('STOCK_VALIDATION_ERROR', {
          message: error.message,
          details: error.details || [error.message],
          order_id: payload?.order_id
        });
      }

      if (error.message === 'SESSION_CLOSED' || error.code === 'SESSION_CLOSED') {
        return socket.emit('SESSION_CLOSED_ERROR', {
          message: 'Sesi meja ini telah ditutup oleh kaunter.',
          session_id: payload?.session_id,
          table_number: payload?.table_number
        });
      }

      socket.emit('ERROR', { message: error.message });
    }
  });

  // Event 3: UPDATE_KITCHEN_STATUS (Chef Updates Order Status)
  socket.on('UPDATE_KITCHEN_STATUS', (payload) => {
    try {
      const { order_id, kitchen_status, cooking_started_at, items } = payload || {};
      if (!order_id || !kitchen_status) {
        return socket.emit('ERROR', { message: 'Missing order_id or kitchen_status' });
      }

      console.log(`👨‍🍳 UPDATE_KITCHEN_STATUS: Order ${order_id} -> ${kitchen_status}`);
      const updatedState = updateKitchenStatus(order_id, kitchen_status, null, cooking_started_at, items);

      io.emit('SYSTEM_STATE_UPDATED', updatedState);
    } catch (error) {
      console.error('UPDATE_KITCHEN_STATUS Error:', error);
      socket.emit('ERROR', { message: error.message });
    }
  });

  // Event 3c: MARK_STATION_DONE / STATION_ITEMS_UPDATED
  socket.on('MARK_STATION_DONE', (payload) => {
    try {
      const { order_id, items } = payload || {};
      if (!order_id || !items) return;

      console.log(`✅ MARK_STATION_DONE: Order ${order_id}`);
      const updatedState = updateOrderItems(order_id, items);

      io.emit('SYSTEM_STATE_UPDATED', updatedState);
    } catch (error) {
      console.error('MARK_STATION_DONE Error:', error);
    }
  });

  // Event 3b: ORDER_CANCELLED_BY_KITCHEN (Saves cancel reason & updates items in DB)
  socket.on('ORDER_CANCELLED_BY_KITCHEN', (payload) => {
    try {
      const { order_id, reason, is_full_cancel, items } = payload || {};
      if (!order_id) return;

      console.log(`❌ ORDER_CANCELLED_BY_KITCHEN: Order ${order_id} — Full: ${is_full_cancel} — Sebab: ${reason}`);

      let updatedState;
      if (is_full_cancel !== false) {
        // FULL CANCELLATION: Update overall kitchen_status = CANCELLED
        updatedState = updateKitchenStatus(order_id, 'CANCELLED', reason, null, items);
        io.emit('ORDER_WAS_CANCELLED', { order_id, reason });
      } else {
        // PARTIAL ITEM CANCELLATION: Update items list ONLY without changing overall kitchen_status!
        if (items) {
          updatedState = updateOrderItems(order_id, items);
        } else {
          updatedState = getSystemState();
        }
      }

      // Broadcast to ALL devices so customer status page updates immediately
      io.emit('SYSTEM_STATE_UPDATED', updatedState);
    } catch (error) {
      console.error('ORDER_CANCELLED_BY_KITCHEN Error:', error);
    }
  });

  // Event 4: CLOSE_SESSION (Counter Confirms Payment & Closes Session)
  socket.on('CLOSE_SESSION', (payload) => {
    try {
      const { session_id, table_number } = payload || {};
      if (!session_id || !table_number) {
        return socket.emit('ERROR', { message: 'Missing session_id or table_number' });
      }

      console.log(`💳 CLOSE_SESSION: Table ${table_number} (Session ${session_id})`);

      // Snapshot orders BEFORE close to detect PAYMENT_PENDING orders being released
      const { orders: ordersBefore } = getSystemState();
      const prepayOrderIds = ordersBefore
        .filter(o => o.session_id === session_id && o.kitchen_status === 'PAYMENT_PENDING')
        .map(o => o.order_id);

      const updatedState = closeSession(session_id, table_number);

      // 1. Emit SESSION_HAS_ENDED to auto-switch customer screen from "Sila Bayar" to "Sedang Dimasak"
      io.emit('SESSION_HAS_ENDED', {
        session_id,
        table_number,
        closed_at: new Date().toISOString()
      });

      // 2. For PREPAY mode: emit NEW_ORDER_RECEIVED chime for each released order
      // This triggers KDS audio alert so kitchen staff know new orders have arrived
      if (prepayOrderIds.length > 0) {
        prepayOrderIds.forEach(order_id => {
          io.emit('NEW_ORDER_RECEIVED', {
            order_id,
            table_number,
            session_id,
            is_prepay_release: true,
            timestamp: new Date().toISOString()
          });
        });
        console.log(`🔔 PREPAY RELEASE: ${prepayOrderIds.length} order(s) released to KDS for session ${session_id}`);
      }

      // 3. Broadcast updated state to ALL clients
      io.emit('SYSTEM_STATE_UPDATED', updatedState);
    } catch (error) {
      console.error('CLOSE_SESSION Error:', error);
      socket.emit('ERROR', { message: error.message });
    }
  });

  // Event 5: CANCEL_SESSION (Counter Voids/Cancels Table Session)
  socket.on('CANCEL_SESSION', (payload) => {
    try {
      const { session_id, table_number, reason } = payload || {};
      if (!session_id || !table_number) {
        return socket.emit('ERROR', { message: 'Missing session_id or table_number' });
      }

      console.log(`🚫 CANCEL_SESSION: Table ${table_number} (Session ${session_id}) — Sebab: ${reason || 'Batal Sesi / Void'}`);
      const updatedState = cancelSession(session_id, table_number, reason);

      // Broadcast to ALL clients (KDS, POS, Customer phones)
      io.emit('SYSTEM_STATE_UPDATED', updatedState);
      io.emit('SESSION_HAS_BEEN_CANCELLED', {
        session_id,
        table_number,
        reason: reason || 'Sesi dibatalkan oleh kaunter'
      });
    } catch (error) {
      console.error('CANCEL_SESSION Error:', error);
      socket.emit('ERROR', { message: error.message });
    }
  });

  // Event 6: RESET_ALL_DATA
  socket.on('RESET_ALL_DATA', () => {
    try {
      console.log('🧹 RESET_ALL_DATA requested');
      const updatedState = resetAllData();
      io.emit('SYSTEM_STATE_UPDATED', updatedState);
    } catch (error) {
      console.error('RESET_ALL_DATA Error:', error);
    }
  });

  // Event 7: UPDATE_SETTINGS (Store Settings: Table Count, Logo, Staff PIN, Emergency Mode)
  socket.on('UPDATE_SETTINGS', (payload) => {
    try {
      console.log('⚙️ UPDATE_SETTINGS requested:', payload?.emergencyMode ? `[EmergencyMode: ${payload.emergencyMode.enabled}]` : '');
      const updatedState = updateSettings(payload || {});
      const settingsData = updatedState.settings || getSettings();
      io.emit('SYSTEM_STATE_UPDATED', updatedState);
      io.emit('SETTINGS_UPDATED', settingsData);
      if (settingsData?.emergencyMode || payload?.emergencyMode) {
        io.emit('EMERGENCY_MODE_TOGGLED', settingsData?.emergencyMode || payload?.emergencyMode);
      }
    } catch (error) {
      console.error('UPDATE_SETTINGS Error:', error);
    }
  });

  // Note: socket 'disconnect' is already handled by the rate limiter above (clears interval & logs)
});

// Helper: Escape HTML entities to prevent Telegram API 400 Bad Request
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ============================================================
// REST API: SUPPORT TICKET -> TELEGRAM BOT API
// ============================================================
app.post('/api/support-ticket', async (req, res) => {
  try {
    const { issueType, phoneNumber, description, imageUrl, messageHtml } = req.body || {};
    if (!issueType || !phoneNumber || !description || !imageUrl) {
      return res.status(400).json({ error: 'Sila lengkapkan SEMUA 4 maklumat borang tiket bantuan.' });
    }

    const TELEGRAM_BOT_TOKEN = '8676460374:AAG08d_gieND5UfawUVIylwY7MaEoNMGdCA';
    const TELEGRAM_CHANNEL_ID = '-1004438116944';

    const safeIssue = escapeHtml(issueType);
    const safePhone = escapeHtml(phoneNumber);
    const safeDesc = escapeHtml(description);
    const safeUrl = escapeHtml(imageUrl);

    const text = messageHtml || `
<b>🚨 TIKET BANTUAN TEKNIKAL BAHARU 🚨</b>

<b>📌 Jenis Masalah:</b> ${safeIssue}
<b>📞 No. Telefon:</b> ${safePhone}
<b>⏰ Masa Dihantar:</b> ${escapeHtml(new Date().toLocaleString('ms-MY', { timeZone: 'Asia/Kuala_Lumpur' }))}

<b>📝 Penerangan Masalah:</b>
${safeDesc}

<b>🖼️ Bukti Gambar:</b>
<a href="${safeUrl}">${safeUrl}</a>
`.trim();

    const tgRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHANNEL_ID,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: false
      })
    });

    const tgData = await tgRes.json();
    if (tgData.ok) {
      console.log('📩 Telegram Support Ticket Sent Successfully:', tgData.result?.message_id);
      return res.json({ success: true, message: 'Laporan Berjaya Dihantar' });
    } else {
      console.error('Telegram API Error:', tgData);
      return res.status(500).json({ error: tgData.description || 'Gagal menghantar tiket ke Telegram.' });
    }
  } catch (err) {
    console.error('Support Ticket Handler Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// Start Express HTTP + Socket.io Server
server.listen(PORT, () => {
  const distExists = fs.existsSync(distPath);
  console.log(`
🚀 ====================================================
   F&B Ordering System Backend Server Active!
   ----------------------------------------------------
   PORT:          ${PORT}
   REST API:      http://localhost:${PORT}/api/health
   Frontend:      ${distExists ? `http://localhost:${PORT}/ ✅` : 'NOT BUILT — run: npm run build ⚠️'}
   Socket.io:     Ready for Multi-Device Connections!
   ====================================================

   📱 CARA BETUL UNTUK NGROK/VPS:
   Jalankan: ngrok http ${PORT}
   (Tunnel satu port sahaja — semua berjalan!)
   ====================================================
  `);
});
