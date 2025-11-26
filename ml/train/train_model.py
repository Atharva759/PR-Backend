import os
import joblib
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from ml.db import get_engine

# ---------------------------
# CONFIG
# ---------------------------
MODEL_DIR = "ml/models"
MODEL_PATH = os.path.join(MODEL_DIR, "demand_model.pkl")

FEATURE_COLUMNS = ["voltage", "current", "power", "frequency"]  # Keep features relevant
TARGET_COLUMN = "energy"   # Now predicting energy
# ---------------------------


# Load data from Neon PostgreSQL
def load_data():
    engine = get_engine()
    df = pd.read_sql("SELECT * FROM pzem_data ORDER BY timestamp ASC", engine)
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    return df


def train():
    print("📥 Loading data from Neon PostgreSQL...")
    df = load_data()

    # Ensure required columns exist
    missing = [col for col in FEATURE_COLUMNS + [TARGET_COLUMN] if col not in df.columns]
    if missing:
        raise Exception(f"Missing required columns in DB: {missing}")

    # Drop rows with null sensor values
    df = df.dropna(subset=FEATURE_COLUMNS + [TARGET_COLUMN])

    # FEATURES (X) AND TARGET (y)
    X = df[FEATURE_COLUMNS]
    y = df[TARGET_COLUMN]

    print(f"🔢 Training on {len(X)} samples with features: {FEATURE_COLUMNS}")
    print(f"🎯 Target column: {TARGET_COLUMN}")

    # Train/Test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, shuffle=False
    )

    # Train model
    print("🎯 Training RandomForestRegressor...")
    model = RandomForestRegressor(n_estimators=200)
    model.fit(X_train, y_train)

    # Create directory if needed
    os.makedirs(MODEL_DIR, exist_ok=True)

    # Save model
    joblib.dump(model, MODEL_PATH)
    print(f"💾 Model saved to: {MODEL_PATH}")

    print("✅ Training complete!")


if __name__ == "__main__":
    train()
