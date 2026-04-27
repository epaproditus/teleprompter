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

    await writeFile(tmpPath, req.file.buffer);

    const language = req.body?.language;
    const whisperOpts: any = {
      modelName: 'base',
      autoDownloadModelName: 'base',
      whisperOptions: {
        outputInText: true,
        outputInJson: false,
      },
    };
    if (language) {
      whisperOpts.whisperOptions.language = language;
    }

    const result = await nodewhisper(tmpPath, whisperOpts);

    const cleaned = (result ?? '')
      .replace(/\[\d{2}:\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}:\d{2}\.\d{3}\]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    res.json({ text: cleaned });
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
  console.log('First request will download the base model (~142 MB) — one-time only.');
  console.log('Language can be set per-request via POST body `{ language: "es" }`.');
});