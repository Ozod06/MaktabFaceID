import cv2
import numpy as np
from deepface import DeepFace

MODEL_NAME = "Facenet512"  # 512-dim embedding, accurate and fast
DETECTOR = "opencv"        # Fastest detector, no extra install needed
THRESHOLD = 0.4            # Cosine similarity threshold

def get_face_embedding(image_bytes: bytes) -> np.ndarray:
    """
    Decodes image bytes, detects face, and returns 512-dim embedding.
    Raises ValueError if no face detected.
    """
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img is None:
        raise ValueError("Invalid image")

    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

    try:
        result = DeepFace.represent(
            img_path=img_rgb,
            model_name=MODEL_NAME,
            detector_backend=DETECTOR,
            enforce_detection=True
        )
    except Exception as e:
        raise ValueError(f"No face detected: {str(e)}")

    if not result:
        raise ValueError("No face detected in the image")

    if len(result) > 1:
        raise ValueError("Multiple faces detected. Please use an image with only one face.")

    embedding = np.array(result[0]["embedding"], dtype=np.float32)
    return embedding


# Global memory for face embeddings
known_embeddings = {}

def load_known_embeddings(db):
    """Loads all student face embeddings from DB into memory."""
    global known_embeddings
    import models
    students_with_face = db.query(models.Student).filter(models.Student.face_embedding != None).all()
    count = 0
    new_embeddings = {}
    for s in students_with_face:
        emb = np.frombuffer(s.face_embedding, dtype=np.float32)
        new_embeddings[s.id] = emb
        count += 1
    known_embeddings.clear()
    known_embeddings.update(new_embeddings)
    print(f"Loaded {count} face embeddings into memory cache.")


def compute_cosine_similarity(emb1: np.ndarray, emb2: np.ndarray) -> float:
    """Computes cosine similarity between two 1D numpy arrays."""
    dot_product = np.dot(emb1, emb2)
    norm1 = np.linalg.norm(emb1)
    norm2 = np.linalg.norm(emb2)
    if norm1 == 0 or norm2 == 0:
        return 0.0
    return float(dot_product / (norm1 * norm2))


def recognize_face(image_bytes: bytes, known_embeddings_dict: dict = None) -> tuple:
    """
    Detects face from image and compares against known embeddings using vectorized NumPy operations.
    Returns: (student_id or None, confidence float)
    """
    if known_embeddings_dict is None:
        known_embeddings_dict = known_embeddings

    if not known_embeddings_dict:
        return None, 0.0

    try:
        query_embedding = get_face_embedding(image_bytes)
    except ValueError:
        return None, 0.0

    # Extract IDs and embeddings
    student_ids = list(known_embeddings_dict.keys())
    embs = np.vstack([known_embeddings_dict[sid] for sid in student_ids]) # shape (N, 512)

    # Normalize query
    q_norm = np.linalg.norm(query_embedding)
    if q_norm == 0:
        return None, 0.0
    q_unit = query_embedding / q_norm

    # Normalize all stored embeddings
    emb_norms = np.linalg.norm(embs, axis=1, keepdims=True)
    # Avoid divide by zero
    emb_norms[emb_norms == 0] = 1.0
    embs_unit = embs / emb_norms

    # Dot product for cosine similarity
    similarities = np.dot(embs_unit, q_unit)

    # Find the best match
    best_idx = np.argmax(similarities)
    best_similarity = float(similarities[best_idx])
    best_match_id = student_ids[best_idx]

    if best_similarity >= THRESHOLD:
        return best_match_id, best_similarity

    return None, best_similarity