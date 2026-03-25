require('dotenv').config()
const express = require('express')
const path = require('path')
const opn = require('opn')

const server = express()
const host = 'http://localhost:8082'

// Static assets
server.use('/assets', express.static(path.resolve(__dirname, './assets')))
server.use('/dist', express.static(path.resolve(__dirname, './dist')))
server.use('/public', express.static(path.resolve(__dirname, './public')))
// Serve public subfolder at root too (for /css/style.css)
server.use('/css', express.static(path.resolve(__dirname, './public/css')))
server.use('/js', express.static(path.resolve(__dirname, './public/js')))

// Serve Supabase config as JS (public keys only, safe to expose)
server.get('/config.js', (req, res) => {
  res.type('application/javascript')
  res.send(`
    window.SUPABASE_URL = "${process.env.SUPABASE_URL || ''}";
    window.SUPABASE_ANON_KEY = "${process.env.SUPABASE_ANON_KEY || ''}";
  `)
})

// API: Generate questions with Gemini AI
server.use(express.json())
server.post('/api/generate-questions', require('./api/generate-questions'))

// Landing page
server.get('/', (req, res) => {
  res.sendFile(path.resolve(__dirname, './public/home.html'))
})

// Teacher dashboard
server.get('/teacher', (req, res) => {
  res.sendFile(path.resolve(__dirname, './public/teacher.html'))
})

// Free play (original game)
server.get('/game', (req, res) => {
  res.sendFile(path.resolve(__dirname, './index.html'))
})

// Assignment play page (catch-all for /:id pattern)
server.get('/:id([0-9]{10})', (req, res) => {
  res.sendFile(path.resolve(__dirname, './public/play.html'))
})

// Fallback
server.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, './public/home.html'))
})

server.listen(8082, () => {
  console.log(`server started at ${host}`)
  opn(host)
})
