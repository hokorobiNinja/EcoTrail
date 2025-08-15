document.addEventListener('DOMContentLoaded', () => {
    const listContainer = document.getElementById('photo-list-container');
    const viewSwitcher = document.querySelector('.view-switcher');
    let db;

    function initDB() {
        const request = indexedDB.open('EcoTrailDB', 1);

        request.onerror = (event) => {
            console.error("Database error: ", event.target.errorCode);
            listContainer.innerHTML = '<p class="error-message">データベースの読み込みに失敗しました。</p>';
        };

        // DB未作成の場合に実行
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('photos')) {
                db.createObjectStore('photos', { keyPath: 'id', autoIncrement: true });
            }
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            console.log("Database opened successfully for photo list.");
            loadPhotos();
        };
    }

    function loadPhotos() {
        if (!db) return;

        const transaction = db.transaction(['photos'], 'readonly');
        const store = transaction.objectStore('photos');
        const getAllRequest = store.getAll();

        getAllRequest.onsuccess = () => {
            const photos = getAllRequest.result;
            if (photos.length === 0) {
                listContainer.innerHTML = '<p class="info-message">写真がありません。</p>';
                return;
            }

            // 新しい写真が上にくるように逆順で表示
            displayPhotos(photos.reverse());
        };

        getAllRequest.onerror = (event) => {
            console.error("Error fetching photos: ", event.target.errorCode);
            listContainer.innerHTML = '<p class="error-message">写真の読み込みに失敗しました。</p>';
        };
    }

    function formatDate(date) {
        if (!(date instanceof Date)) return '';
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        const h = String(date.getHours()).padStart(2, '0');
        const min = String(date.getMinutes()).padStart(2, '0');
        return `${y}/${m}/${d} ${h}:${min}`;
    }

    function displayPhotos(photos) {
        listContainer.innerHTML = ''; // 既存のリストをクリア
        const ul = document.createElement('ul');
        ul.className = 'photo-list';

        photos.forEach(photo => {
            const li = document.createElement('li');
            li.className = 'photo-list-item';
            li.dataset.photoId = photo.id;

            // Blobデータから画像URLを生成
            const imageUrl = URL.createObjectURL(photo.image);
            const formattedDate = formatDate(photo.createdAt);

            li.innerHTML = `
                <img src="${imageUrl}" alt="撮影した写真のサムネイル" class="photo-thumbnail">
                <div class="photo-info">
                    <div class="photo-title-wrapper">
                        <h3 class="photo-title">${photo.title || '無題'}</h3>
                        <input type="text" class="photo-title-input" value="${photo.title || ''}" style="display:none;">
                    </div>
                    <div class="photo-actions">
                        <button class="icon-button edit-button" aria-label="タイトルを編集" title="タイトルを編集">✏️</button>
                        <button class="icon-button pin-button" aria-label="地図で場所を確認" title="地図で場所を確認">📍</button>
                        <button class="icon-button upload-button" aria-label="アップロード" title="アップロード">⬆️</button>
                        <button class="icon-button delete-button" aria-label="削除" title="削除">🗑️</button>
                    </div>
                    <time class="photo-timestamp">${formattedDate}</time>
                </div>
            `;

            // 画像が読み込まれた後にURLを解放
            const img = li.querySelector('.photo-thumbnail');
            img.onload = () => {
                URL.revokeObjectURL(imageUrl);
            };

            ul.appendChild(li);
        });

        listContainer.appendChild(ul);
    }

    // イベントハンドリング
    listContainer.addEventListener('click', (event) => {
        const target = event.target;
        const listItem = target.closest('.photo-list-item');
        if (!listItem) return;

        // 編集ボタンまたはタイトルがクリックされた場合
        if (target.closest('.edit-button') || target.closest('.photo-title')) {
            handleEdit(listItem);
        }

        // 削除ボタンがクリックされた場合
        const deleteButton = target.closest('.delete-button');
        if (deleteButton) {
            handleDelete(deleteButton);
        }
    });

    // タイトル（テキストボックス）からフォーカスが外れた場合
    listContainer.addEventListener('focusout', (event) => {
        if (event.target.matches('.photo-title-input')) {
            handleSaveTitle(event.target);
        }
    });

    // タイトル（テキストボックス）で Enterキーが押下された場合
    listContainer.addEventListener('keydown', (event) => {
        if (event.target.matches('.photo-title-input') && event.key === 'Enter') {
            handleSaveTitle(event.target);
        }
    });

    function handleEdit(listItem) {
        const titleWrapper = listItem.querySelector('.photo-title-wrapper');
        const titleDisplay = titleWrapper.querySelector('.photo-title');
        const titleInput = titleWrapper.querySelector('.photo-title-input');

        // 編集中の場合は何もしない
        if (titleInput.style.display === 'block') {
            return;
        }

        titleDisplay.style.display = 'none';
        titleInput.style.display = 'block';
        titleInput.focus();
        titleInput.select();
    }

    function handleSaveTitle(input) {
        const listItem = input.closest('.photo-list-item');
        const photoId = parseInt(listItem.dataset.photoId, 10);
        const newTitle = input.value.trim();

        const titleDisplay = listItem.querySelector('.photo-title');
        titleDisplay.textContent = newTitle || '無題';

        input.style.display = 'none';
        titleDisplay.style.display = 'block';

        updatePhotoTitle(photoId, newTitle);
    }

    function handleDelete(button) {
        const listItem = button.closest('.photo-list-item');
        const photoId = parseInt(listItem.dataset.photoId, 10);

        if (confirm("この写真を削除しますか？")) {
            deletePhoto(photoId, listItem);
        }
    }

    // IndexedDB 操作
    function updatePhotoTitle(id, title) {
        const transaction = db.transaction(['photos'], 'readwrite');
        const store = transaction.objectStore('photos');
        const request = store.get(id);

        request.onsuccess = () => {
            const photo = request.result;
            if (photo) {
                photo.title = title;
                const updateRequest = store.put(photo);
                updateRequest.onsuccess = () => console.log(`Photo ${id} title updated.`);
                updateRequest.onerror = (e) => console.error("Error updating title:", e.target.error);
            }
        };
        request.onerror = (e) => console.error("Error fetching photo for update:", e.target.error);
    }

    function deletePhoto(id, listItemElement) {
        const transaction = db.transaction(['photos'], 'readwrite');
        const store = transaction.objectStore('photos');
        const request = store.delete(id);

        request.onsuccess = () => {
            console.log(`Photo ${id} deleted.`);
            
            // アニメーションの処理
            listItemElement.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            listItemElement.style.opacity = '0';
            listItemElement.style.transform = 'translateX(-20px)';
            
            setTimeout(() => {
                listItemElement.remove();
                // リストが空になったかチェック
                if (listContainer.querySelectorAll('.photo-list-item').length === 0) {
                    listContainer.innerHTML = '<p class="info-message">写真がありません。</p>';
                }
            }, 300);
        };
        request.onerror = (e) => {
            console.error("Error deleting photo:", e.target.error);
            alert("写真の削除に失敗しました。");
        };
    }

    // TODO: viewSwitcherのイベントリスナーを追加して、表示を切り替える

    // 処理を開始
    initDB();
});