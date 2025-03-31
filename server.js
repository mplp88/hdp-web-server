import express from 'express'
import Pusher from 'pusher'
import dotenv from 'dotenv'
import path from 'path'
import cors from 'cors'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000
app.use(cors())

// Configurar Pusher
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true
})

// Middleware para servir archivos estáticos desde 'public'
app.use(express.static(path.join(process.cwd(), 'public')))
app.use(express.json())

// Almacenar lobbies temporalmente en memoria
const lobbies = []

app.get('/lobbies', (req, res) => {
  res.json({ lobbies })
})

// Endpoint para crear un lobby
app.post('/api/create-lobby', (req, res) => {
  const { lobbyCode, player } = req.body

  if (lobbies.some((l) => l.lobbyCode == lobbyCode)) {
    res.status(400).send({ error: 'El lobby ya existe' })
  }
  const now = Date.now()
  const lobby = {
    host: player.id,
    lobbyCode,
    players: [],
    lastUpdated: now
  }

  player.lastUpdated = now
  lobby.players.push(player)
  lobbies.push(lobby)
  setTimeout(() => {
    pusher.trigger(`lobby-${lobbyCode}`, 'player-joined', {
      players: lobby.players,
      host: lobby.host
    })
  }, 500)

  res.json({ lobbyCode })
})

// Endpoint para unirse a un lobby
app.post('/api/join-lobby', (req, res) => {
  const { lobbyCode, player } = req.body
  if (!lobbies.some((l) => l.lobbyCode == lobbyCode)) {
    return res.status(404).json({ error: 'Lobby no encontrado' })
  }
  const lobby = lobbies.find((l) => l.lobbyCode == lobbyCode)
  lobby.lastUpdated = Date.now()
  player.lastUpdated = Date.now()
  lobby.players.push(player)

  setTimeout(() => {
    // Notificar a los jugadores en el lobby
    pusher.trigger(`lobby-${lobbyCode}`, 'player-joined', {
      players: lobby.players,
      host: lobby.host
    })
  }, 500)
  res.json({ lobby })
})

app.post('/api/change-name/:lobbyCode', (req, res) => {
  const lobbyCode = req.params.lobbyCode
  const { player } = req.body

  if (!lobbies.some((l) => l.lobbyCode == lobbyCode)) {
    return res.status(404).json({ error: 'Lobby no encontrado' })
  }
  const lobby = lobbies.find((l) => l.lobbyCode == lobbyCode)

  const _player = lobby.players.find((p) => p.id == player.id)
  _player.name = player.name
  _player.lastUpdated = Date.now()
  // Notificar a los jugadores en el lobby

  pusher.trigger(`lobby-${lobbyCode}`, 'player-changed-name', { player })
  res.json({ success: true })
})

// Endpoint para enviar eventos a Pusher
app.post('/api/publish', (req, res) => {
  const { channel, event, data } = req.body

  pusher
    .trigger(channel, event, data)
    .then(() => res.json({ success: true }))
    .catch((error) => res.status(500).json({ success: false, error }))
})

// Endpoint para mantener vivos los jugadores
app.post('/api/keep-alive', (req, res) => {
  const { lobbyCode, player } = req.body
  if (lobbies.some((x) => x.lobbyCode == lobbyCode)) {
    const lobby = lobby.find((l) => l.id == lobbyCode)
    const _player = lobby.players.find((p) => p.id == player.id)
    if (_player) {
      _player.lastUpdated = Date.now()
      lobby.lastUpdated = Date.now()
    }
  }
  res.json({ success: true })
})

// Limpiar jugadores inactivos y lobbies inactivos
setInterval(() => {
  const now = Date.now()
  for (const lobby of lobbies) {
    const lobbyCode = lobby.lobbyCode
    // Eliminar jugadores inactivos después de 10 segundos
    lobby.players = lobby.players.filter((player) => now - player.lastUpdated < 5 * 60 * 1000)

    // Si el lobby está vacío o inactivo por más de 15 minutos, eliminarlo
    if (lobby.players.length === 0 && now - lobby.lastUpdated > 15 * 60 * 1000) {
      lobbies
    } else {
      pusher.trigger(`lobby-${lobbyCode}`, 'update-players', { players: lobby.players })
    }
  }
}, 5000)

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`)
})
