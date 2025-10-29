import websocket
import json
import time
import threading
import uuid

BACKEND_WS_URL = "ws://localhost:8080/ws/esp32"

device_id = "esp32-sim-" + str(uuid.uuid4())[:8]

register_message = {
    "type": "register",
    "deviceId": device_id,
    "name": "ESP32 Test Node",
    "firmwareVersion": "2.1.0",
    "capabilities": [
        {"id": "camera", "label": "Camera Module", "configurable": True},
        {"id": "microphone", "label": "Microphone", "configurable": True},
        {"id": "pzem004t", "label": "PZEM-004T Power Sensor", "configurable": False},
        {"id": "sd", "label": "SD Card Storage", "configurable": True}
    ],
    "samplingRate": 500,
    "cameraResolution": "640x480",
    "compressionEnabled": True,
    "otaEnabled": True
}


def on_open(ws):
    print("[ESP32] Connected to backend.")
    ws.send(json.dumps(register_message))

    # Send periodic heartbeat
    def run():
        while True:
            time.sleep(5)
            ws.send(json.dumps({"type": "heartbeat"}))

    threading.Thread(target=run, daemon=True).start()


def on_message(ws, message):
    data = json.loads(message)
    print(f"[ESP32] Received message: {data}")

    if data.get("type") == "config_update":
        print("[ESP32] Configuration updated:", data["config"])

    elif data.get("type") == "session_start":
        print("[ESP32] Session started:", data)

    elif data.get("type") == "session_stop":
        print("[ESP32] Session stopped:", data)


def on_close(ws, *_):
    print("[ESP32] Disconnected from backend.")


def on_error(ws, error):
    print("[ESP32 ERROR]", error)


if __name__ == "__main__":
    ws = websocket.WebSocketApp(
        BACKEND_WS_URL,
        on_open=on_open,
        on_message=on_message,
        on_close=on_close,
        on_error=on_error,
    )

    ws.run_forever()
