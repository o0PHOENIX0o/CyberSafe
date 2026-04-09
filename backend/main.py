import os
import io
import cv2
import shutil
import asyncio
import numpy as np
import tensorflow as tf
import librosa
import torch
import torch.nn as nn
import collections
import threading
import queue

from PIL import Image
from torchvision import models, transforms
from ultralytics import YOLO
from transformers import Wav2Vec2FeatureExtractor, AutoModel

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# ==============================
# DEVICE SETUP
# ==============================
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# ==============================
# FASTAPI INIT
# ==============================
app = FastAPI(title="Deepfake Detection API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==============================
# AUDIO MODEL (WavLM + Keras)
# ==============================
KERAS_MODEL_PATH = r"/home/krish-sharma/d drive/Verification Syndicate/Fake News/ALL MODELS/wavlm_classifier_v2.keras"
WAVLM_MODEL_NAME = "microsoft/wavlm-base-plus"

SAMPLE_RATE = 16000
MAX_DURATION = 5

print("⏳ Loading Audio Models...")

feature_extractor = Wav2Vec2FeatureExtractor.from_pretrained(WAVLM_MODEL_NAME)
wavlm_model = AutoModel.from_pretrained(WAVLM_MODEL_NAME).to(DEVICE)
wavlm_model.eval()

keras_model = tf.keras.models.load_model(KERAS_MODEL_PATH)

print("✅ Audio models loaded")


def predict_audio(file_bytes):
    audio_stream = io.BytesIO(file_bytes)
    y, _ = librosa.load(audio_stream, sr=SAMPLE_RATE)

    max_len = SAMPLE_RATE * MAX_DURATION
    y = np.pad(y, (0, max_len - len(y)), 'constant') if len(y) < max_len else y[:max_len]

    inputs = feature_extractor(y, sampling_rate=SAMPLE_RATE, return_tensors="pt").to(DEVICE)

    with torch.no_grad():
        outputs = wavlm_model(**inputs)

    embedding = torch.mean(outputs.last_hidden_state, dim=1).cpu().numpy()

    score = keras_model.predict(embedding, verbose=0)[0][0]

    is_fake = score > 0.5

    return {
        "label": "FAKE / SYNTHETIC" if is_fake else "REAL HUMAN VOICE",
        "score": float(score),
        "confidence": float(score if is_fake else 1 - score)
    }

# ==============================
# VIDEO MODEL (CNN + BiLSTM)
# ==============================
VIDEO_MODEL_PATH = r"/home/krish-sharma/d drive/Verification Syndicate/Fake News/ALL MODELS/best_celebdf_model_Krish.pt"
VIDEO_INPUT_SIZE = 224
VIDEO_SEQ_LENGTH = 16
VIDEO_CONFIDENCE_THRESHOLD = 0.6
VIDEO_EMA_ALPHA = 0.15


class CNN_BiLSTM_Video(nn.Module):
    def __init__(self):
        super().__init__()

        backbone = models.efficientnet_b0(
            weights=models.EfficientNet_B0_Weights.IMAGENET1K_V1
        )
        self.cnn = backbone.features
        self.pool = nn.AdaptiveAvgPool2d(1)

        self.lstm = nn.LSTM(
            input_size=1280,
            hidden_size=256,
            num_layers=2,
            bidirectional=True,
            batch_first=True
        )

        self.classifier = nn.Sequential(
            nn.Linear(512, 256),
            nn.ReLU(),
            nn.Dropout(0.5),
            nn.Linear(256, 2)
        )

    def forward(self, x):
        B, T, C, H, W = x.shape

        x = x.view(B*T, C, H, W)
        feats = self.cnn(x)
        feats = self.pool(feats).flatten(1)

        feats = feats.view(B, T, -1)

        lstm_out, _ = self.lstm(feats)

        return self.classifier(lstm_out[:, -1, :])


class DeepfakeVideoDetector:
    def __init__(self):
        self.device = DEVICE

        self.face_model = YOLO(r"/home/krish-sharma/d drive/Verification Syndicate/Fake News/yolov8s-face-lindevs.onnx", task="detect")

        self.model = CNN_BiLSTM_Video().to(self.device)
        self.model.load_state_dict(torch.load(VIDEO_MODEL_PATH, map_location=self.device))
        self.model.eval()

        self.transform = transforms.Compose([
            transforms.Resize((VIDEO_INPUT_SIZE, VIDEO_INPUT_SIZE)),
            transforms.ToTensor(),
            transforms.Normalize([0.485,0.456,0.406],[0.229,0.224,0.225])
        ])

        self.frame_buffer = collections.deque(maxlen=VIDEO_SEQ_LENGTH)
        self.input_queue = queue.Queue(maxsize=1)

        self.smoothed_prob = 0
        self.current_label = "Scanning..."

        self.running = True
        threading.Thread(target=self._loop, daemon=True).start()

    def process_frame(self, frame):
        if not self.input_queue.full():
            self.input_queue.put(frame)

    def _loop(self):
        while self.running:
            try:
                frame = self.input_queue.get(timeout=1)

                results = self.face_model(frame, verbose=False)[0]

                if len(results.boxes) > 0:
                    x1,y1,x2,y2 = map(int, results.boxes.xyxy[0])

                    face = frame[y1:y2, x1:x2]

                    if face.size == 0:
                        continue

                    face = Image.fromarray(cv2.cvtColor(face, cv2.COLOR_BGR2RGB))
                    tensor = self.transform(face)

                    self.frame_buffer.append(tensor)

                    if len(self.frame_buffer) == VIDEO_SEQ_LENGTH:
                        inp = torch.stack(list(self.frame_buffer)).unsqueeze(0).to(self.device)

                        with torch.no_grad():
                            out = self.model(inp)
                            prob = torch.softmax(out, dim=1)[0,1].item()

                        self.smoothed_prob = (
                            VIDEO_EMA_ALPHA * prob +
                            (1 - VIDEO_EMA_ALPHA) * self.smoothed_prob
                        )

                        self.current_label = "FAKE" if self.smoothed_prob > VIDEO_CONFIDENCE_THRESHOLD else "REAL"

            except:
                continue

    def get(self):
        return self.current_label, self.smoothed_prob


video_detector = DeepfakeVideoDetector()

# ==============================
# API ENDPOINTS
# ==============================

@app.post("/audio")
async def audio_api(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(('.wav','.mp3','.flac','.m4a','.ogg')):
        raise HTTPException(status_code=400, detail="Invalid audio format")

    contents = await file.read()
    return JSONResponse(predict_audio(contents))


@app.post("/video")
async def video_api(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(('.mp4','.avi','.mov','.mkv','.webm')):
        raise HTTPException(status_code=400, detail="Invalid video format")

    temp = f"temp_{file.filename}"

    with open(temp, "wb") as f:
        shutil.copyfileobj(file.file, f)

    cap = cv2.VideoCapture(temp)

    probs = []

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        video_detector.process_frame(frame)
        await asyncio.sleep(0.01)

        label, prob = video_detector.get()

        if label in ["FAKE","REAL"]:
            probs.append(prob)

    cap.release()
    os.remove(temp)

    if probs:
        avg = sum(probs)/len(probs)
        return {"label": "FAKE" if avg > 0.5 else "REAL", "score": avg}

    return {"label": "UNKNOWN"}

# ==============================
# RUN SERVER
# ==============================
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)