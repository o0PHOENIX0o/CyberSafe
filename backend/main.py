import os
import io
import re
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

import requests
import json
import re
import time
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
from duckduckgo_search import DDGS
from dotenv import load_dotenv

from PIL import Image
from torchvision import models, transforms
from ultralytics import YOLO
from transformers import Wav2Vec2FeatureExtractor, AutoModel

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from urllib.parse import urlparse

from pydantic import BaseModel, Field


DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

app = FastAPI(title="Deepfake Detection API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Audio Model Configuration
KERAS_MODEL_PATH = r"C:/Users/ASUS/Desktop/CyberSafe/CyberSafe/ALL MODELS/wavlm_classifier_v2.keras"
WAVLM_MODEL_NAME = "microsoft/wavlm-base-plus"
SAMPLE_RATE = 16000
MAX_DURATION = 5

load_dotenv()
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")


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
VIDEO_MODEL_PATH = r"C:/Users/ASUS/Desktop/CyberSafe/CyberSafe/ALL MODELS/best_celebdf_model_Krish.pt"
VIDEO_INPUT_SIZE = 224
VIDEO_SEQ_LENGTH = 16        
VIDEO_CONFIDENCE_THRESHOLD = 0.60
VIDEO_EMA_ALPHA = 0.15     

MODEL_NAME = "z-ai/glm-4.5-air:free"
MAX_RETRIES = 3
RETRY_DELAY = 2


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
        self.face_model = YOLO(r"C:/Users/ASUS/Desktop/CyberSafe/CyberSafe/yolov8n-face.pt", task='detect') 
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



class IncidentTypeEnum(str, Enum):
    PHISHING = "phishing"
    RANSOMWARE = "ransomware"
    DATA_BREACH = "data_breach"
    MALWARE = "malware"
    UNAUTHORIZED_ACCESS = "unauthorized_access"
    DDOS = "ddos"
    OTHER = "other"
 
 
class IncidentRequest(BaseModel):
    description: str = Field(..., min_length=10, example="I clicked a suspicious email link and now my files are encrypted.")
    affected_systems: Optional[List[str]] = Field(default=[], example=["work laptop", "personal email"])
 
 
class ClassifyRequest(BaseModel):
    description: str = Field(..., min_length=5)
 
 
class ClassifyResponse(BaseModel):
    incident_type: IncidentTypeEnum
    severity: int
    severity_label: str
 
 
class SearchResponse(BaseModel):
    context: str
    result_count: int
    sources: List[str]
 
 
class IncidentResponseSections(BaseModel):
    immediate: Optional[str] = None
    containment: Optional[str] = None
    recovery: Optional[str] = None
    prevention: Optional[str] = None
    red_flags: Optional[str] = None
 
 
class FullIncidentResponse(BaseModel):
    incident_type: IncidentTypeEnum
    severity: int
    severity_label: str
    timestamp: str
    affected_systems: List[str]
    response: str
    sections: IncidentResponseSections
    sources: List[str]
    helplines: Dict[str, str]
 
 
class ExportRequest(BaseModel):
    description: str
    incident_type: IncidentTypeEnum
    severity: int
    affected_systems: List[str]
    response: str
    sections: Dict
 


video_detector = None

# # URL Scanning Heuristics
# def scan_urls(urls):
#     """Scan URLs for phishing/scam patterns"""
#     phishing_patterns = [
#         'phishing', 'fake', 'scam', 'malware', 'suspicious', 'stealer', 'harvester',
#         'credential', 'password', 'login', 'verify', 'confirm', 'update', 'urgent',
#         'act-now', 'bitcoin', 'wallet', 'paypal', 'amazon', 'bank', 'admin', 'panel',
#         'suspicious', 'alert', 'warning', 'secure', 'verify-account'
#     ]
    
#     results = []
#     for url in urls:
#         try:
#             url_lower = url.lower()
#             score = 0
#             patterns_found = []
            
#             # Check for suspicious patterns
#             for pattern in phishing_patterns:
#                 if pattern in url_lower:
#                     score += 15
#                     patterns_found.append(pattern)
            
#             # Check for typosquatting common domains
#             typo_domains = {
#                 'paypa1': 'PayPal typosquatting',
#                 'amaz0n': 'Amazon typosquatting',
#                 'goog1e': 'Google typosquatting',
#                 'faceb00k': 'Facebook typosquatting',
#             }
            
#             for typo, reason in typo_domains.items():
#                 if typo in url_lower:
#                     score += 20
#                     patterns_found.append(reason)
            
#             # Check for suspicious TLDs
#             suspicious_tlds = ['.tk', '.ml', '.ga', '.cf']
#             for tld in suspicious_tlds:
#                 if url.endswith(tld):
#                     score += 10
#                     patterns_found.append(f'Suspicious TLD: {tld}')
            
#             # Check for IP addresses instead of domains
#             if re.match(r'http[s]?://\d+\.\d+\.\d+\.\d+', url):
#                 score += 25
#                 patterns_found.append('IP address used instead of domain')
            
#             # Fake domains with common patterns
#             if any(x in url_lower for x in ['.fake', '.scam', '.suspicious', '.test']):
#                 score += 30
#                 patterns_found.append('Clearly fake/test domain')
            
#             # Cap score at 100
#             score = min(score, 100)
            
#             results.append({
#                 'url': url,
#                 'isSuspicious': score >= 50,
#                 'score': score,
#                 'patterns': patterns_found
#             })
#         except Exception as e:
#             results.append({
#                 'url': url,
#                 'isSuspicious': False,
#                 'score': 0,
#                 'patterns': [f'Error scanning: {str(e)}']
#             })
    
#     return results



_PHISHING_KEYWORDS = frozenset([
    'phishing', 'fake', 'scam', 'malware', 'suspicious', 'stealer', 'harvester',
    'credential', 'password', 'login', 'verify', 'confirm', 'update', 'urgent',
    'act-now', 'bitcoin', 'wallet', 'paypal', 'amazon', 'bank', 'admin', 'panel',
    'alert', 'warning', 'secure', 'verify-account',
])

_TYPO_DOMAINS = {
    'paypa1': 'PayPal typosquatting',
    'amaz0n': 'Amazon typosquatting',
    'goog1e': 'Google typosquatting',
    'faceb00k': 'Facebook typosquatting',
}

_SUSPICIOUS_TLDS = frozenset(['.us', '.tk', '.biz', '.top', '.cn', '.ml', '.su', '.space', '.cf', '.co', '.info', '.pw', '.online', '.ga', '.cc', '.club', '.xyz', '.ru', 'xyz', '.website', '.site', '.io', '.win'])

_FAKE_DOMAINS = frozenset(['.fake', '.scam', '.suspicious', '.test', '.invalid', '.example', '.localhost', '.local', '.onion', '.bit', '.eth', '.tor', '.i2p', '.zip', '.review', '.bid', '.loan', ])

_IP_RE = re.compile(r'^https?://\d+\.\d+\.\d+\.\d+')

_SCORE_CAP = 100


def _get_tld(url: str) -> str:
    """Extract the TLD from a URL, handling missing schemes."""
    try:
        if not url.startswith(('http://', 'https://')):
            url = 'https://' + url
        host = urlparse(url).hostname or ''
        dot = host.rfind('.')
        return host[dot:] if dot != -1 else ''
    except Exception:
        return ''


def scan_urls(urls: list[str]) -> list[dict]:
    """Scan URLs for phishing/scam patterns."""
    results = []
    

    for url in urls:
        try:
            url_lower = url.lower()
            score = 0
            patterns_found = []

            # Keyword scan — each hit +15
            for kw in _PHISHING_KEYWORDS:
                if kw in url_lower:
                    score += 15
                    patterns_found.append(kw)
                    if score >= _SCORE_CAP:
                        break

            # Typosquatting — +20 each
            if score < _SCORE_CAP:
                for typo, reason in _TYPO_DOMAINS.items():
                    if typo in url_lower:
                        score += 20
                        patterns_found.append(reason)
                        if score >= _SCORE_CAP:
                            break

            # Suspicious TLD — +10
            if score < _SCORE_CAP:
                tld = _get_tld(url)
                print(f"Extracted TLD: {tld} from URL: {url}")
                if tld in _SUSPICIOUS_TLDS:
                    score += 10
                    patterns_found.append(f'Suspicious TLD: {tld}')

            # IP address instead of domain — +25
            if score < _SCORE_CAP and _IP_RE.match(url):
                score += 25
                patterns_found.append('IP address used instead of domain')

            # Clearly fake/test domain — +30
            if score < _SCORE_CAP:
                tld = tld if 'tld' in dir() else _get_tld(url)
                if tld in _FAKE_DOMAINS:
                    score += 30
                    patterns_found.append('Clearly fake/test domain')

            results.append({
                'url': url,
                'isSuspicious': score >= 50,
                'score': min(score, _SCORE_CAP),
                'patterns': patterns_found,
            })

        except Exception as e:
            results.append({
                'url': url,
                'isSuspicious': False,
                'score': 0,
                'patterns': [f'Error scanning: {e}'],
            })

    return results

# API Endpoints
@app.post("/api/scan")
async def scan_urls_endpoint(request_data: dict):
    """Scan URLs for phishing/scam detection"""
    try:
        urls = request_data.get('urls', [])
        if not urls:
            return JSONResponse(content={'success': False, 'error': 'No URLs provided'}, status_code=400)
        
        results = scan_urls(urls)
        return JSONResponse(content={'success': True, 'results': results})
    except Exception as e:
        return JSONResponse(content={'success': False, 'error': str(e)}, status_code=500)

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


# ========================== chatbot ===================

def classify_incident(description: str):
    description_lower = description.lower()
 
    high_severity = ["ransomware", "encrypted", "ransom", "bank", "financial", "ssn", "social security", "credit card"]
    medium_severity = ["phishing", "clicked link", "email", "password", "credentials", "suspicious"]
    low_severity = ["spam", "adware", "popup", "suspicious email"]
 
    severity = 3
    if any(word in description_lower for word in high_severity):
        severity = 5
    elif any(word in description_lower for word in low_severity):
        severity = 2
 
    if any(word in description_lower for word in ["phish", "clicked link", "email link", "sms"]):
        return IncidentTypeEnum.PHISHING, severity
    elif any(word in description_lower for word in ["ransom", "encrypted my files", "bitcoin"]):
        return IncidentTypeEnum.RANSOMWARE, severity
    elif any(word in description_lower for word in ["breach", "exposed", "leaked", "unauthorized access"]):
        return IncidentTypeEnum.DATA_BREACH, severity
    elif any(word in description_lower for word in ["malware", "virus", "trojan", "downloaded file"]):
        return IncidentTypeEnum.MALWARE, severity
    elif any(word in description_lower for word in ["unauthorized", "strange login", "unknown device"]):
        return IncidentTypeEnum.UNAUTHORIZED_ACCESS, severity
    else:
        return IncidentTypeEnum.OTHER, severity
 
 
def severity_label(severity: int) -> str:
    labels = {1: "Informational", 2: "Low", 3: "Medium", 4: "High", 5: "Critical"}
    return labels.get(severity, "Unknown")
 
 
def search_mitigation_steps(query: str, incident_type: IncidentTypeEnum = None, max_results: int = 5) -> dict:
    queries = [
        query,
        f"{incident_type.value if incident_type else ''} incident response steps",
    ]
 
    all_results = []
    seen_urls = set()
 
    for q in queries[:2]:
        try:
            with DDGS() as ddgs:
                results = list(ddgs.text(q, max_results=max_results))
                for result in results:
                    url = result.get('href', '')
                    if url not in seen_urls:
                        seen_urls.add(url)
                        all_results.append({
                            'title': result.get('title', ''),
                            'snippet': result.get('body', ''),
                            'source': url
                        })
                time.sleep(1)
        except Exception:
            continue
 
    trusted_domains = ['cisa.gov', 'ncsc.gov.uk', 'cert.gov', 'cyber.gov.au', 'gov', 'microsoft.com', 'kaspersky.com']
    prioritized = [r for r in all_results if any(d in r.get('source', '').lower() for d in trusted_domains)]
    other = [r for r in all_results if r not in prioritized]
    final_results = prioritized + other
 
    search_context = ""
    for i, result in enumerate(final_results[:max_results]):
        search_context += f"Result {i+1}:\nTitle: {result['title']}\nSource: {result['source']}\nSnippet: {result['snippet']}\n\n"
 
    return {
        'context': search_context,
        'result_count': len(final_results),
        'sources': [r['source'] for r in final_results[:3]]
    }
 
 
def generate_incident_response(description: str, incident_type: IncidentTypeEnum, severity: int,
                                affected_systems: List[str], search_context: str) -> dict:
    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://github.com/yourusername/incident-bot",
        "X-Title": "Incident Response Assistant"
    }
 
    system_prompt = """You are an expert Cybersecurity Incident Response handler. Provide responses in the following EXACT format:
 
🚨 IMMEDIATE ACTIONS (Do these RIGHT NOW):
• [Action 1]
• [Action 2]
 
🔍 CONTAINMENT STEPS (Stop the spread):
• [Step 1]
• [Step 2]
 
🛠️ RECOVERY STEPS (Get back to normal):
• [Step 1]
• [Step 2]
 
🛡️ PREVENTION TIPS (Avoid this happening again):
• [Tip 1]
• [Tip 2]
 
⚠️ RED FLAGS TO WATCH FOR:
• [Flag 1]
• [Flag 2]
 
Be specific, actionable, and prioritize steps by urgency."""
 
    user_prompt = f"""INCIDENT DETAILS:
Type: {incident_type.value}
Severity Level: {severity}/5
Description: {description}
Affected Systems: {', '.join(affected_systems) if affected_systems else 'Not specified'}
 
RECENT GUIDANCE FROM SECURITY SOURCES:
{search_context}
 
Based on this information, provide your structured response using the format specified above."""
 
    payload = {
        "model": MODEL_NAME,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": 0.3,
        "max_tokens": 1500
    }
 
    for attempt in range(MAX_RETRIES):
        try:
            response = requests.post(url, headers=headers, json=payload, timeout=30)
            response.raise_for_status()
            data = response.json()
            content = data['choices'][0]['message']['content']
            sections = parse_structured_response(content)
            return {'success': True, 'full_response': content, 'sections': sections}
        except requests.exceptions.Timeout:
            if attempt == MAX_RETRIES - 1:
                return {'success': False, 'error': 'API timeout'}
        except requests.exceptions.RequestException as e:
            if attempt == MAX_RETRIES - 1:
                return {'success': False, 'error': str(e)}
        time.sleep(RETRY_DELAY)
 
    return {'success': False, 'error': 'Max retries exceeded'}
 
 
def parse_structured_response(content: str) -> dict:
    sections = {}
    current_section = None
 
    for line in content.split('\n'):
        line = line.strip()
        if '🚨' in line or 'IMMEDIATE ACTIONS' in line.upper():
            current_section = 'immediate'
            sections[current_section] = []
        elif '🔍' in line or 'CONTAINMENT' in line.upper():
            current_section = 'containment'
            sections[current_section] = []
        elif '🛠' in line or 'RECOVERY' in line.upper():
            current_section = 'recovery'
            sections[current_section] = []
        elif '🛡' in line or 'PREVENTION' in line.upper():
            current_section = 'prevention'
            sections[current_section] = []
        elif '⚠️' in line or 'RED FLAGS' in line.upper():
            current_section = 'red_flags'
            sections[current_section] = []
        elif (line.startswith('•') or line.startswith('-')) and current_section:
            sections[current_section].append(line.lstrip('•- '))
 
    return {k: '\n'.join(f"  • {item}" for item in v) for k, v in sections.items()}
 
 
def get_helplines(incident_type: IncidentTypeEnum = None) -> dict:
    helplines = {
        "India": "Dial 1930 or visit cybercrime.gov.in",
        "USA": "1-888-282-0870 (CISA) or ic3.gov",
        "UK": "0300 123 2040 (Action Fraud)",
        "Australia": "1300 292 371 (ReportCyber)",
        "EU": "Contact your national DPA or ENISA",
        "Global": "Search for your national CERT"
    }
    if incident_type == IncidentTypeEnum.PHISHING:
        helplines["Phishing Report"] = "reportphishing@apwg.org or report@phishing.gov.uk (UK)"
    elif incident_type == IncidentTypeEnum.RANSOMWARE:
        helplines["Ransomware Note"] = "DO NOT pay the ransom. Contact FBI/CISA field office immediately."
    elif incident_type == IncidentTypeEnum.DATA_BREACH:
        helplines["Data Breach Note"] = "Contact your bank immediately if financial data was involved."
    return helplines
 



@app.post("/classify", response_model=ClassifyResponse, tags=["Incident"])
def classify(request: ClassifyRequest):
    """
    Classify an incident description into a type and severity score.
    Fast, no external calls.
    """
    incident_type, severity = classify_incident(request.description)
    return ClassifyResponse(
        incident_type=incident_type,
        severity=severity,
        severity_label=severity_label(severity)
    )
 
 
@app.post("/search", response_model=SearchResponse, tags=["Incident"])
def search(request: ClassifyRequest):
    """
    Search DuckDuckGo for mitigation guidance based on a description.
    Auto-classifies and uses incident type to refine results.
    """
    incident_type, _ = classify_incident(request.description)
    query = f"emergency {incident_type.value} incident response mitigation {request.description[:50]}"
    results = search_mitigation_steps(query, incident_type=incident_type)
    return SearchResponse(**results)
 
 
@app.post("/respond", response_model=FullIncidentResponse, tags=["Incident"])
def respond(request: IncidentRequest):
    """
    Full pipeline: classify → search → generate AI response.
    Returns structured response with sections and helplines.
    """
    if not OPENROUTER_API_KEY:
        raise HTTPException(status_code=500, detail="OPENROUTER_API_KEY not configured on server.")
 
    incident_type, severity = classify_incident(request.description)
 
    query = f"emergency {incident_type.value} incident response mitigation {request.description[:50]}"
    search_results = search_mitigation_steps(query, incident_type=incident_type)
 
    llm_result = generate_incident_response(
        description=request.description,
        incident_type=incident_type,
        severity=severity,
        affected_systems=request.affected_systems,
        search_context=search_results['context']
    )
 
    if not llm_result['success']:
        raise HTTPException(status_code=502, detail=f"LLM error: {llm_result.get('error', 'Unknown')}")
 
    return FullIncidentResponse(
        incident_type=incident_type,
        severity=severity,
        severity_label=severity_label(severity),
        timestamp=datetime.now().isoformat(),
        affected_systems=request.affected_systems,
        response=llm_result['full_response'],
        sections=IncidentResponseSections(**llm_result['sections']),
        sources=search_results['sources'],
        helplines=get_helplines(incident_type)
    )
 
 

@app.get("/helplines", tags=["Reference"])
def helplines(incident_type: Optional[IncidentTypeEnum] = None):
    """
    Get emergency helpline contacts, optionally filtered by incident type.
    """
    return {"helplines": get_helplines(incident_type)}
 
 
@app.post("/export", tags=["Incident"])
def export_report(request: ExportRequest):
    """
    Export a previously generated incident response to a JSON report structure.
    Returns the structured report as JSON (no file I/O on server).
    """
    report = {
        "incident": {
            "description": request.description,
            "type": request.incident_type.value,
            "severity": request.severity,
            "severity_label": severity_label(request.severity),
            "affected_systems": request.affected_systems,
            "timestamp": datetime.now().isoformat()
        },
        "response": {
            "generated_at": datetime.now().isoformat(),
            "content": request.response,
            "sections": request.sections
        }
    }
    return report



if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)