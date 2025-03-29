import express from 'express';
import Pusher from 'pusher';
import dotenv from 'dotenv';
import path from 'path';
import cors from 'cors'

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors());

// Configurar Pusher
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true
});

// Middleware para servir archivos estáticos desde 'public'
app.use(express.static(path.join(process.cwd(), 'public')));
app.use(express.json());

// Endpoint para enviar eventos a Pusher
app.post('/api/publish', (req, res) => {
  const { channel, event, data } = req.body;

  pusher
    .trigger(channel, event, data)
    .then(() => res.json({ success: true }))
    .catch((error) => res.status(500).json({ success: false, error }));
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
