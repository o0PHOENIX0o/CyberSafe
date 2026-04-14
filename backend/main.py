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


DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

app = FastAPI(title="Deepfake Detection API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000","http://localhost:3000/deepfake"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Audio Model Configuration
KERAS_MODEL_PATH = r"C:\Users\ASUS\Desktop\CyberSafe\CyberSafe\ALL MODELS\wavlm_classifier_v2.keras"
WAVLM_MODEL_NAME = "microsoft/wavlm-base-plus"
SAMPLE_RATE = 16000
MAX_DURATION = 5

print("⏳ Loading Audio Models...")
try:
    feature_extractor = Wav2Vec2FeatureExtractor.from_pretrained(WAVLM_MODEL_NAME)
    wavlm_model = AutoModel.from_pretrained(WAVLM_MODEL_NAME).to(DEVICE)
    wavlm_model.eval()
    
    keras_model = tf.keras.models.load_model(KERAS_MODEL_PATH)
    print("✅ Audio models loaded successfully")
except Exception as e:
    print(f"❌ Error loading audio models: {e}")
    exit(1)

def predict_audio(file_bytes):
    try:
        audio_stream = io.BytesIO(file_bytes)
        y, sr = librosa.load(audio_stream, sr=SAMPLE_RATE)
        max_len = SAMPLE_RATE * MAX_DURATION
        
        if len(y) < max_len:
            y = np.pad(y, (0, max_len - len(y)), 'constant')
        else:
            y = y[:max_len]
        
        inputs = feature_extractor(y, sampling_rate=SAMPLE_RATE, return_tensors="pt").to(DEVICE)
        
        with torch.no_grad():
            outputs = wavlm_model(**inputs)
        
        hidden_states = outputs.last_hidden_state if hasattr(outputs, 'last_hidden_state') else outputs[0]
        embedding = torch.mean(hidden_states, dim=1).cpu().numpy()
      
        score = keras_model.predict(embedding, verbose=0)[0][0]
        
        is_fake = score > 0.5
        confidence = score if is_fake else 1 - score
        
        return {
            'label': 'FAKE / SYNTHETIC' if is_fake else 'REAL HUMAN VOICE',
            'score': float(score),
            'confidence': float(confidence)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Video Model Configuration
VIDEO_MODEL_PATH = r"C:\Users\ASUS\Desktop\CyberSafe\CyberSafe\ALL MODELS\best_celebdf_model_Krish.pt"
VIDEO_INPUT_SIZE = 224
VIDEO_SEQ_LENGTH = 16        
VIDEO_CONFIDENCE_THRESHOLD = 0.60
VIDEO_EMA_ALPHA = 0.15       

class CNN_BiLSTM_Video(nn.Module):
    def __init__(self):
        super().__init__()
        weights = models.EfficientNet_B0_Weights.IMAGENET1K_V1
        backbone = models.efficientnet_b0(weights=weights)
        self.cnn = backbone.features
        self.pool = nn.AdaptiveAvgPool2d(1)

        self.lstm = nn.LSTM(
            input_size=1280, hidden_size=256, num_layers=2, 
            bidirectional=True, batch_first=True, dropout=0.3
        )

        self.classifier = nn.Sequential(
            nn.Linear(512, 256), nn.ReLU(), nn.Dropout(0.5), nn.Linear(256, 2)
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
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.face_model = YOLO(r"C:\Users\ASUS\Desktop\CyberSafe\CyberSafe\yolov8n-face.pt", task='detect') 
        self.model = CNN_BiLSTM_Video().to(self.device)
        self.model.load_state_dict(torch.load(VIDEO_MODEL_PATH, map_location=self.device))
        self.model.eval()

        self.transform = transforms.Compose([
            transforms.Resize((VIDEO_INPUT_SIZE, VIDEO_INPUT_SIZE)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])

        self.frame_buffer = collections.deque(maxlen=VIDEO_SEQ_LENGTH)
        self.running = True
        self.input_queue = queue.Queue(maxsize=1)
        
        self.current_prob = 0.0
        self.smoothed_prob = 0.0
        self.current_label = "Scanning..."
        self.current_box = None 
        
        self.thread = threading.Thread(target=self._inference_loop, daemon=True)
        self.thread.start()

    def process_frame(self, frame):
        if not self.input_queue.full():
            self.input_queue.put(frame)

    def _inference_loop(self):
        while self.running:
            try:
                frame = self.input_queue.get(timeout=1)
                results = self.face_model(frame, verbose=False, conf=0.5, device='cpu')[0]

                if len(results.boxes) > 0:
                    boxes = results.boxes.xyxy.cpu().numpy()
                    areas = (boxes[:, 2] - boxes[:, 0]) * (boxes[:, 3] - boxes[:, 1])
                    largest_idx = np.argmax(areas)
                    x1, y1, x2, y2 = map(int, boxes[largest_idx])

                    self.current_box = (x1, y1, x2, y2)

                    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                    h, w, _ = frame.shape
                    x1, y1 = max(0, x1), max(0, y1)
                    x2, y2 = min(w, x2), min(h, y2)
                    
                    face_crop = frame_rgb[y1:y2, x1:x2]
                    
                    if face_crop.size > 0:
                        pil_face = Image.fromarray(face_crop)
                        face_tensor = self.transform(pil_face)
                        self.frame_buffer.append(face_tensor)

                        if len(self.frame_buffer) == VIDEO_SEQ_LENGTH:
                            input_tensor = torch.stack(list(self.frame_buffer)).unsqueeze(0).to(self.device)
                            with torch.no_grad():
                                out = self.model(input_tensor)
                                new_prob = torch.softmax(out, dim=1)[0, 1].item()
                            
                            self.smoothed_prob = (VIDEO_EMA_ALPHA * new_prob) + ((1 - VIDEO_EMA_ALPHA) * self.smoothed_prob)

                            if self.smoothed_prob > VIDEO_CONFIDENCE_THRESHOLD:
                                self.current_label = "FAKE"
                            else:
                                self.current_label = "REAL"
                        else:
                            self.current_label = f"BUFFERING {len(self.frame_buffer)}/{VIDEO_SEQ_LENGTH}"
                else:
                    self.current_box = None

            except queue.Empty:
                continue
            except Exception as e:
                pass

    def get_status(self):
        return self.current_label, self.smoothed_prob, self.current_box

    def stop(self):
        self.running = False
        self.thread.join()

video_detector = None

# API Endpoints
@app.post("/analyze")
async def analyze(file: UploadFile = File(...)):
    filename = file.filename.lower()

    if filename.endswith(('.wav', '.mp3', '.flac', '.m4a', '.ogg')):
        contents = await file.read()
        return JSONResponse(content=predict_audio(contents))

    elif filename.endswith(('.mp4', '.avi', '.mov', '.mkv', '.webm')):
        return await predict_video_endpoint(file)

    else:
        raise HTTPException(status_code=400, detail="Unsupported file format")
@app.post("/audio")
async def predict_audio_endpoint(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(('.wav', '.mp3', '.flac', '.m4a', '.ogg')):
        raise HTTPException(status_code=400, detail="Unsupported audio format. Please upload WAV, MP3, FLAC, M4A, or OGG.")
    
    try:
        contents = await file.read()
        result = predict_audio(contents)  
        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/video")
async def predict_video_endpoint(file: UploadFile = File(...)):
    global video_detector
    
    if not file.filename.lower().endswith(('.mp4', '.avi', '.mov', '.mkv', '.webm')):
        raise HTTPException(status_code=400, detail="Unsupported video format.")
    
    if video_detector is None:
        video_detector = DeepfakeVideoDetector()
        
    temp_path = f"temp_{file.filename}"
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    try:
        cap = cv2.VideoCapture(temp_path)
        
        all_probs = []
        fake_frames = 0
        total_analyzed = 0
        
        if not cap.isOpened():
            raise Exception("Failed to open uploaded video file.")

        frame_skip = 5 
        frame_count = 0

        while True:
            ret, frame = cap.read()
            if not ret: 
                break

            frame_count += 1
            if frame_count % frame_skip != 0:
                continue

            while video_detector.input_queue.full() and video_detector.running:
                await asyncio.sleep(0.01)

            video_detector.process_frame(frame)
            
            await asyncio.sleep(0.01)
            
            label, prob, box = video_detector.get_status()

            if label in ["FAKE", "REAL"]:
                all_probs.append(prob)
                total_analyzed += 1
                if label == "FAKE":
                    fake_frames += 1

        await asyncio.sleep(0.5)
        
        cap.release()
        os.remove(temp_path)
        
        if total_analyzed > 0:
            avg_prob = sum(all_probs) / len(all_probs)
            fake_percentage = (fake_frames / total_analyzed) * 100
            is_fake = avg_prob > 0.5
            
            return JSONResponse(content={
                'label': 'FAKE / SYNTHETIC VIDEO' if is_fake else 'REAL HUMAN VIDEO',
                'score': avg_prob,
                'confidence': avg_prob if is_fake else 1 - avg_prob,
                'details': {
                    'frames_analyzed': total_analyzed,
                    'fake_frames': fake_frames,
                    'fake_percentage': fake_percentage,
                }
            })
        else:
            return JSONResponse(content={
                'label': 'UNABLE TO DETECT',
                'score': 0.0,
                'confidence': 0.0,
                'details': {
                    'frames_analyzed': 0,
                    'message': "No face detected in video or video too short."
                }
            })
            
    except Exception as e:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)