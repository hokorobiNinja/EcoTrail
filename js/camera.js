document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('camera-stream');
    const canvas = document.getElementById('camera-snapshot');
    const captureControls = document.getElementById('capture-controls');
    const previewControls = document.getElementById('preview-controls');
    const shutterBtn = document.getElementById('shutter-btn');
    const retakeBtn = document.getElementById('retake-btn');
    const saveBtn = document.getElementById('save-btn');

    let db;
    let capturedBlob = null;

    // --- 1. IndexedDBの初期化 ---
    function initDB() {
        const request = indexedDB.open('EcoTrailDB', 1);

        request.onerror = (event) => {
            console.error("Database error: ", event.target.errorCode);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            // 'photos'という名前のオブジェクトストア（テーブルのようなもの）を作成
            // autoIncrementをtrueにすると、idが自動で採番される
            db.createObjectStore('photos', { keyPath: 'id', autoIncrement: true });
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            console.log("Database opened successfully.");
            // データベースの準備ができたらカメラを起動
            startCamera();
        };
    }

    // --- 2. カメラの起動 ---
    async function startCamera() {

        try {
            // スマートフォンの背面カメラを優先して使用する
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' },
                audio: false
            });
            video.srcObject = stream;
            showCaptureUI();
        } catch (err) {
            console.error("Error accessing camera: ", err);
            alert("カメラにアクセスできませんでした。ブラウザの設定でカメラの使用を許可してください。");
        }
    }

    // --- 3. 撮影処理 ---
    shutterBtn.addEventListener('click', () => {
        const context = canvas.getContext('2d');
        // videoの表示サイズに合わせてcanvasのサイズを設定
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        // canvasに現在のvideoのフレームを描画
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // 描画した画像をBlobとして取得
        canvas.toBlob(blob => {
            capturedBlob = blob;
        }, 'image/jpeg', 0.9); // 90%の品質でJPEGに変換

        showPreviewUI();
    });

    // --- 4. 撮り直し処理 ---
    retakeBtn.addEventListener('click', () => {
        capturedBlob = null;
        showCaptureUI();
    });

    // --- 5. 保存処理 ---
    saveBtn.addEventListener('click', () => {
        if (!capturedBlob || !db) return;
        // トランザクションを開始
        const transaction = db.transaction(['photos'], 'readwrite');
        const store = transaction.objectStore('photos');

        const photoData = {
            image: capturedBlob,
            createdAt: new Date()
        };

        // データをストアに追加
        const request = store.add(photoData);

        request.onsuccess = () => {
            console.log("Photo saved successfully!");
            alert("写真を保存しました！");
            // 保存後、再び撮影モードに戻る
            showCaptureUI();
        };

        request.onerror = (event) => {
            console.error("Error saving photo: ", event.target.errorCode);
            alert("写真の保存に失敗しました。");
        };
    });

    // --- UIの表示切り替え ---
    function showCaptureUI() {
        video.style.display = 'block';
        canvas.style.display = 'none';
        captureControls.style.display = 'flex';
        previewControls.style.display = 'none';
    }

    function showPreviewUI() {
        video.style.display = 'none';
        canvas.style.display = 'block';
        captureControls.style.display = 'none';
        previewControls.style.display = 'flex';
    }

    // 最初にDBを初期化
    initDB();
});
