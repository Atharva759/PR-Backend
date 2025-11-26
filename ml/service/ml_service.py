# ml_service.py
import os
import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

MODEL_PATH = os.getenv("MODEL_PATH", "ml/models/demand_model.pkl")
FEATURE_COLUMNS = ["voltage", "current", "power", "frequency"]  # Same as training features

# Load model
if not os.path.exists(MODEL_PATH):
    raise FileNotFoundError(f"Model file not found: {MODEL_PATH}")

model = joblib.load(MODEL_PATH)

# FastAPI app
app = FastAPI(title="Energy Prediction API")


# Request model
class SensorData(BaseModel):
    voltage: float
    current: float
    power: float
    frequency: float


@app.post("/predict")
def predict(data: SensorData):
    try:
        # Convert incoming data to DataFrame
        df = pd.DataFrame([data.dict()])

        # Ensure columns match training
        missing = [col for col in FEATURE_COLUMNS if col not in df.columns]
        if missing:
            raise HTTPException(status_code=400, detail=f"Missing features: {missing}")

        # Predict energy
        prediction = model.predict(df[FEATURE_COLUMNS])[0]

        return {"predicted_energy": float(prediction)}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
