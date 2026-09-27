# Lifeguard AI

Lifeguard AI combines live person tracking and movement alerts with a two-round Human vs AI pool-safety demonstration. It uses FastAPI, React, YOLO/ByteTrack, and Gemini.

## Run

Add `GEMINI_API_KEY=your_key` to `.env`, then open two PowerShell terminals:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn backend.main:app --reload
```

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.
