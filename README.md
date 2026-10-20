# MaktabFaceID - Face Recognition Attendance System

Ushbu loyiha maktab o'quvchilari uchun yuzni tanish (face recognition) orqali davomatni avtomatik belgilash tizimi hisoblanadi. 
Tizim uch qismdan iborat: Backend (FastAPI), Frontend (React) va Kamera Mijozi (OpenCV).

## Tizim Talablari
- Python 3.9+
- Node.js 18+
- PostgreSQL
- Web-kamera (Kamera mijozi uchun)

---

## 1. Backend (Server) O'rnatish

### 1.1. Virtual muhit yaratish va kutubxonalarni o'rnatish
```bash
cd backend
python -m venv venv
# Windows uchun:
venv\Scripts\activate
# Linux/Mac uchun:
# source venv/bin/activate

pip install -r requirements.txt
```

### 1.2. Ma'lumotlar bazasini sozlash
PostgreSQL o'rnatilgan bo'lishi kerak. `school_faceid` nomli yangi baza yarating.
`.env.example` faylini nushalang va nomini `.env` qilib o'zgartiring. 
Ichidagi ma'lumotlarni o'zingizning bazangizga moslang:
```env
DATABASE_URL=postgresql://postgres:parolingiz@localhost:5432/school_faceid
SECRET_KEY=ixtiyoriy_maxfiy_kalit
TELEGRAM_BOT_TOKEN=telegram_bot_tokeningiz
```

### 1.3. InsightFace modellarini yuklab olish
InsightFace `buffalo_s` modelini ishlatadi. Birinchi marta ishlaganda tizim modelni avtomatik yuklab olishga urinadi (taxminan 300MB). Agar xatolik bersa, modelni internetdan `.insightface/models/buffalo_s` papkasiga qo'lda joylashingiz kerak bo'ladi.

### 1.4. Serverni ishga tushirish
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
Server ishlagach, birinchi bo'lib avtomatik ravishda barcha jadvallar yaratiladi va `admin` (parol: `admin123`) foydalanuvchisi qo'shiladi.

---

## 2. Frontend (Veb interfeys) O'rnatish

### 2.1. Kutubxonalarni o'rnatish
```bash
cd frontend
npm install
```

### 2.2. Loyihani ishga tushirish
```bash
npm run dev
```
Brauzerda `http://localhost:5173` manzilini oching (Vite portiga qarab o'zgarishi mumkin).
Login: `admin`, Parol: `admin123`

---

## 3. Kamera Mijozi (Camera Client) O'rnatish

Kamera mijozi bevosita maktab eshigiga o'rnatilgan kompyuterda yoki Raspberry Pi da ishlaydi.

### 3.1. Kutubxonalarni o'rnatish
```bash
cd camera_client
pip install -r requirements.txt
```

### 3.2. Sozlamalar
`.env.example` faylini `.env` deb o'zgartiring.
```env
BACKEND_URL=http://localhost:8000
```
Agar kamera mijozi boshqa kompyuterda bo'lsa, `localhost` o'rniga server IP manzilini yozing.

### 3.3. Ishga tushirish
```bash
python client.py
```
Kamera ochiladi. O'quvchi kameraga qaraganda, tizim serverga so'rov yuboradi va javobga qarab yashil (tasdiqlandi), qizil (noma'lum) yoki ko'k (allaqachon belgilangan) ramka chizib ko'rsatadi. Dasturdan chiqish uchun `Q` tugmasini bosing.

---

## Ishlatish ketma-ketligi

1. Frontend interfeysga kiring va "Classes" (yoki API orqali) sinf yarating.
2. "Students" bo'limiga o'tib yangi o'quvchi qo'shing.
3. O'quvchi ro'yxatda paydo bo'lgach, karta ustiga sichqonchani olib borib, Kamera ikonkasini bosing.
4. Brauzer kamerasidan o'quvchining yuzini rasmga oling. Tizim yuzni saqlab qoladi.
5. Kamera mijozini (client.py) ishga tushiring va o'quvchini kameraga ko'rsating.
6. Davomat avtomatik belgilanadi va "Attendance" jadvalida ko'rinadi! Agar Telegram bot sozlangan bo'lsa, ota-onasiga xabar ketadi.
