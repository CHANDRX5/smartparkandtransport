"""SmartPark AI - AI Model Training & Evaluation Script.

Trains a scikit-learn model for parking availability prediction
using historical or synthetic data.

Usage:
    cd backend
    python -m app.ai.train_model
"""
import os
import sys
import numpy as np
import pandas as pd
from datetime import datetime, timedelta, timezone
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score
import joblib

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))


def generate_synthetic_data(n_facilities=10, days=90) -> pd.DataFrame:
    """Generate synthetic parking occupancy data for training."""
    print(f"Generating synthetic data for {n_facilities} facilities over {days} days...")
    records = []
    base_date = datetime.now(timezone.utc) - timedelta(days=days)

    for facility_id in range(1, n_facilities + 1):
        capacity = np.random.choice([50, 100, 150, 200, 300])
        for day_offset in range(days):
            current_date = base_date + timedelta(days=day_offset)
            day_of_week = current_date.weekday()
            is_weekend = day_of_week >= 5

            for hour in range(24):
                # Realistic occupancy patterns
                if is_weekend:
                    if 10 <= hour <= 15:
                        base_occ = 0.65 + np.random.normal(0, 0.1)
                    elif 16 <= hour <= 20:
                        base_occ = 0.5 + np.random.normal(0, 0.1)
                    else:
                        base_occ = 0.15 + np.random.normal(0, 0.05)
                else:
                    if 8 <= hour <= 10:
                        base_occ = 0.8 + np.random.normal(0, 0.1)
                    elif 11 <= hour <= 14:
                        base_occ = 0.7 + np.random.normal(0, 0.08)
                    elif 15 <= hour <= 18:
                        base_occ = 0.75 + np.random.normal(0, 0.1)
                    elif 19 <= hour <= 21:
                        base_occ = 0.35 + np.random.normal(0, 0.08)
                    else:
                        base_occ = 0.1 + np.random.normal(0, 0.05)

                # Facility-specific variation
                base_occ += (facility_id % 3) * 0.05
                occupancy = max(0.0, min(1.0, base_occ))
                occupied = int(capacity * occupancy)

                records.append({
                    "facility_id": facility_id,
                    "capacity": capacity,
                    "day_of_week": day_of_week,
                    "hour_of_day": hour,
                    "is_weekend": int(is_weekend),
                    "month": current_date.month,
                    "occupied_spaces": occupied,
                    "occupancy_rate": occupancy,
                })

    df = pd.DataFrame(records)
    print(f"Generated {len(df)} records")
    return df


def train_model(df: pd.DataFrame, save_path: str = None):
    """Train a Gradient Boosting model for parking prediction."""
    print("\n--- Training Parking Availability Prediction Model ---")

    features = ["facility_id", "capacity", "day_of_week", "hour_of_day", "is_weekend", "month"]
    target = "occupancy_rate"

    X = df[features]
    y = df[target]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    print(f"Training set: {len(X_train)}, Test set: {len(X_test)}")

    model = GradientBoostingRegressor(
        n_estimators=200,
        max_depth=6,
        learning_rate=0.1,
        min_samples_split=10,
        random_state=42,
    )

    model.fit(X_train, y_train)

    # Evaluate
    y_pred = model.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)

    print(f"\n--- Model Evaluation ---")
    print(f"Mean Absolute Error: {mae:.4f}")
    print(f"R² Score: {r2:.4f}")
    print(f"Note: This model was trained on SYNTHETIC data.")
    print(f"Predictions should be labeled as demonstration estimates.")

    # Feature importance
    importance = pd.Series(model.feature_importances_, index=features).sort_values(ascending=False)
    print(f"\nFeature Importance:")
    for feat, imp in importance.items():
        print(f"  {feat}: {imp:.4f}")

    # Save model
    if save_path is None:
        save_path = os.path.join(os.path.dirname(__file__), "parking_model.joblib")

    joblib.dump({
        "model": model,
        "features": features,
        "mae": mae,
        "r2": r2,
        "trained_on": "synthetic_data",
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "version": "gbr_v1",
    }, save_path)
    print(f"\nModel saved to: {save_path}")
    return model, mae, r2


def predict_with_model(facility_id: int, capacity: int, day_of_week: int,
                       hour_of_day: int, model_path: str = None):
    """Load model and make a prediction."""
    if model_path is None:
        model_path = os.path.join(os.path.dirname(__file__), "parking_model.joblib")

    if not os.path.exists(model_path):
        return None

    data = joblib.load(model_path)
    model = data["model"]

    features = pd.DataFrame([{
        "facility_id": facility_id,
        "capacity": capacity,
        "day_of_week": day_of_week,
        "hour_of_day": hour_of_day,
        "is_weekend": int(day_of_week >= 5),
        "month": datetime.now().month,
    }])

    prediction = model.predict(features)[0]
    prediction = max(0.0, min(1.0, prediction))

    return {
        "predicted_occupancy": round(prediction, 4),
        "predicted_available": max(0, int(capacity * (1 - prediction))),
        "model_version": data["version"],
        "model_mae": data["mae"],
        "trained_on": data["trained_on"],
    }


if __name__ == "__main__":
    # Generate synthetic data and train model
    df = generate_synthetic_data(n_facilities=10, days=90)
    model, mae, r2 = train_model(df)

    # Test prediction
    print("\n--- Sample Predictions ---")
    for day in [0, 2, 5]:  # Monday, Wednesday, Saturday
        for hour in [8, 12, 18]:
            result = predict_with_model(1, 100, day, hour)
            if result:
                day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
                print(f"  {day_names[day]} {hour}:00 - Occupancy: {result['predicted_occupancy']*100:.1f}%, "
                      f"Available: {result['predicted_available']}/100")
