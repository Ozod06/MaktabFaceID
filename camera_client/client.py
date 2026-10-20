import cv2
import httpx
import os
import time
import queue
import threading
from dotenv import load_dotenv

load_dotenv()

BACKEND_URL = os.getenv("BACKEND_URL", "http://127.0.0.1:8000")
RECOGNIZE_ENDPOINT = f"{BACKEND_URL}/attendance/recognize"

# Threading communication variables
request_queue = queue.Queue(maxsize=1)
feedback_lock = threading.Lock()
feedback_info = None
feedback_end_time = 0.0

def request_worker(stop_event):
    global feedback_info, feedback_end_time
    # Use a single httpx Client inside the worker thread for reuse
    with httpx.Client(timeout=5.0) as client:
        while not stop_event.is_set():
            try:
                try:
                    frame_bytes = request_queue.get(timeout=0.1)
                except queue.Empty:
                    continue

                files = {"image": ("frame.jpg", frame_bytes, "image/jpeg")}
                response = client.post(RECOGNIZE_ENDPOINT, files=files)

                current_time = time.time()
                with feedback_lock:
                    if response.status_code == 200:
                        data = response.json()
                        if data.get("already_marked"):
                            feedback_info = {
                                "color": (0, 165, 255),  # Orange in BGR
                                "text": f'{data["full_name"]} - Allaqachon belgilangan'
                            }
                        else:
                            feedback_info = {
                                "color": (0, 255, 0),  # Green in BGR
                                "text": f'{data["full_name"]} - Davomad belgilandi!'
                            }
                        feedback_end_time = current_time + 3.0
                    elif response.status_code == 404:
                        detail = response.json().get("detail", "")
                        if "recognized" in detail.lower():
                            feedback_info = {
                                "color": (0, 0, 255),  # Red in BGR
                                "text": "Noma'lum shaxs"
                            }
                            feedback_end_time = current_time + 2.0
            except Exception as e:
                print(f"Request error: {e}")

def main():
    # Try different camera backends
    cap = None
    for backend in [cv2.CAP_DSHOW, cv2.CAP_MSMF, cv2.CAP_ANY]:
        cap = cv2.VideoCapture(0, backend)
        if cap.isOpened():
            print(f"Camera opened with backend: {backend}")
            break

    if not cap or not cap.isOpened():
        print("Error: Could not open webcam.")
        return

    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

    print("Camera started. Press 'Q' to quit.")

    # Start background request worker thread
    stop_event = threading.Event()
    worker_thread = threading.Thread(target=request_worker, args=(stop_event,), daemon=True)
    worker_thread.start()

    last_request_time = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            print("Failed to grab frame")
            time.sleep(0.1)
            continue

        current_time = time.time()

        # Display feedback safely using lock
        with feedback_lock:
            show_feedback = current_time < feedback_end_time and feedback_info is not None
            current_feedback = feedback_info if show_feedback else None

        if current_feedback:
            color = current_feedback["color"]
            text = current_feedback["text"]
            h, w = frame.shape[:2]
            cv2.rectangle(frame, (w//4, h//4), (3*w//4, 3*h//4), color, 3)
            cv2.putText(frame, text, (w//4, h//4 - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2)

        # Enqueue frame bytes every 1 second if queue is empty
        if current_time - last_request_time >= 1.0:
            last_request_time = current_time
            if request_queue.empty():
                _, buffer = cv2.imencode('.jpg', frame)
                try:
                    request_queue.put_nowait(buffer.tobytes())
                except queue.Full:
                    pass

        # Show frame
        try:
            cv2.imshow("MaktabFaceID - Q: chiqish", frame)
        except Exception as e:
            print(f"Display error: {e}")
            break

        key = cv2.waitKey(1) & 0xFF
        if key == ord('q') or key == ord('Q'):
            break

    # Shutdown background worker thread cleanly
    stop_event.set()
    worker_thread.join(timeout=1.0)

    cap.release()
    cv2.destroyAllWindows()
    print("Camera closed.")

if __name__ == "__main__":
    main()