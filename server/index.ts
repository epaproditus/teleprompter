import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { nodewhisper } from 'nodejs-whisper';
import { writeFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors({ origin: 'http://localhost:5173' }));

app.post('/transcribe', upload.single('audio'), async (req, res) => {
  const tmpPath = join(tmpdir(), `audio-${Date.now()}.webm`);
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No audio file provided' });
      return;
    }

    // Write audio buffer to a temp file (whisper needs a file path)
    await writeFile(tmpPath, req.file.buffer);

    const result = await nodewhisper(tmpPath, {
      modelName: 'base.en',
      autoDownloadModelName: 'base.en',
      whisperOptions: {
        outputInText: true,
        outputInJson: false,
      },
    });

    res.json({ text: result ?? '' });
  } catch (err: any) {
    console.error('Transcription error:', err?.message || err);
    res.status(500).json({ error: 'Transcription failed' });
  } finally {
    unlink(tmpPath).catch(() => {});
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Local Whisper relay running on http://localhost:${PORT}`);
  console.log('First request will download the base.en model (~142 MB) — one-time only.');
});
