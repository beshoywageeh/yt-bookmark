document.addEventListener('DOMContentLoaded', () => {
    loadBookmarks();
    document.getElementById('searchBar').addEventListener('input', loadBookmarks);
});

function getYouTubeVideoId(url) {
    try {
        const urlObj = new URL(url);
        if (urlObj.hostname === 'youtu.be') {
            return urlObj.pathname.slice(1).split('?')[0];
        }
        if (urlObj.hostname.includes('youtube.com')) {
            const videoId = urlObj.searchParams.get('v');
            if (videoId) return videoId;
        }
        return null;
    } catch (e) {
        return null;
    }
}

async function fetchVideoData(videoId) {
    try {
        const response = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
        if (!response.ok) throw new Error('Network response was not ok.');
        const data = await response.json();
        if (data.error) return null;
        return {
            title: data.title,
            thumbnailUrl: data.thumbnail_url
        };
    } catch (error) {
        console.error('Error fetching video data:', error);
        return null;
    }
}

function getBookmarks() {
    return JSON.parse(localStorage.getItem('ytBookmarks')) || [];
}

function saveBookmarks(bookmarks) {
    localStorage.setItem('ytBookmarks', JSON.stringify(bookmarks));
}

async function addBookmark() {
    const urlInput = document.getElementById('videoUrl');
    const timestampInput = document.getElementById('timestamp');
    const tagsInput = document.getElementById('tags');
    const errorDiv = document.getElementById('error');

    const url = urlInput.value.trim();
    const videoId = getYouTubeVideoId(url);

    errorDiv.textContent = '';

    if (!videoId) {
        errorDiv.textContent = 'رابط يوتيوب غير صالح.';
        return;
    }

    const videoData = await fetchVideoData(videoId);
    if (!videoData) {
        errorDiv.textContent = 'لا يمكن جلب بيانات الفيديو.';
        return;
    }

    const bookmarks = getBookmarks();
    if (bookmarks.some(b => getYouTubeVideoId(b.url) === videoId)) {
        errorDiv.textContent = 'هذه الإشارة المرجعية موجودة بالفعل.';
        return;
    }

    const newBookmark = {
        id: Date.now().toString(),
        url: `https://www.youtube.com/watch?v=${videoId}`,
        title: videoData.title,
        thumbnailUrl: videoData.thumbnailUrl,
        timestamp: timestampInput.value.trim(),
        tags: tagsInput.value.trim().split(',').map(tag => tag.trim()).filter(tag => tag),
        dateAdded: new Date().toISOString()
    };

    bookmarks.push(newBookmark);
    saveBookmarks(bookmarks);

    urlInput.value = '';
    timestampInput.value = '';
    tagsInput.value = '';

    loadBookmarks();
}

function deleteBookmark(id) {
    let bookmarks = getBookmarks();
    bookmarks = bookmarks.filter(b => b.id !== id);
    saveBookmarks(bookmarks);
    loadBookmarks();
}

function renderBookmarks(bookmarks) {
    const bookmarkList = document.getElementById('bookmarkList');
    bookmarkList.innerHTML = '';

    if (!bookmarks || bookmarks.length === 0) {
        bookmarkList.innerHTML = '<p>لا توجد إشارات مرجعية بعد.</p>';
        return;
    }

    bookmarks.forEach(bookmark => {
        const finalUrl = bookmark.timestamp 
            ? `${bookmark.url}&t=${bookmark.timestamp}` 
            : bookmark.url;

        const item = document.createElement('div');
        item.className = 'bookmark-item';
        item.innerHTML = `
            <a href="${finalUrl}" target="_blank">
                <img src="${bookmark.thumbnailUrl}" alt="${bookmark.title}">
            </a>
            <div class="bookmark-content">
                <a href="${finalUrl}" target="_blank" class="bookmark-title">${bookmark.title}</a>
                <div class="bookmark-tags">
                    ${bookmark.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
                <div class="bookmark-actions">
                    <small>${new Date(bookmark.dateAdded).toLocaleDateString()}</small>
                    <button class="delete-btn" onclick="deleteBookmark('${bookmark.id}')">🗑️</button>
                </div>
            </div>
        `;
        bookmarkList.appendChild(item);
    });
}

function renderTagFilters(bookmarks) {
    const tagFiltersContainer = document.getElementById('tagFilters');
    const allTags = [...new Set(bookmarks.flatMap(b => b.tags))];
    
    tagFiltersContainer.innerHTML = '<span class="tag-filter active" onclick="filterByTag(this, null)">الكل</span>';
    allTags.forEach(tag => {
        const tagElement = document.createElement('span');
        tagElement.className = 'tag-filter';
        tagElement.textContent = tag;
        tagElement.onclick = () => filterByTag(tagElement, tag);
        tagFiltersContainer.appendChild(tagElement);
    });
}

let activeTag = null;

function filterByTag(element, tag) {
    activeTag = tag;
    document.querySelectorAll('.tag-filter').forEach(el => el.classList.remove('active'));
    element.classList.add('active');
    loadBookmarks();
}

function loadBookmarks() {
    const allBookmarks = getBookmarks();
    const searchTerm = document.getElementById('searchBar').value.toLowerCase();

    let filteredBookmarks = allBookmarks;

    if (activeTag) {
        filteredBookmarks = filteredBookmarks.filter(b => b.tags.includes(activeTag));
    }

    if (searchTerm) {
        filteredBookmarks = filteredBookmarks.filter(b => 
            b.title.toLowerCase().includes(searchTerm) || 
            b.tags.some(tag => tag.toLowerCase().includes(searchTerm))
        );
    }

    renderBookmarks(filteredBookmarks.reverse());
    renderTagFilters(allBookmarks);
    // Re-apply active class after re-rendering tags
    if (activeTag) {
        const tagElements = document.querySelectorAll('.tag-filter');
        tagElements.forEach(el => {
            if (el.textContent === activeTag) {
                el.classList.add('active');
            }
        });
    } else {
        document.querySelector('.tag-filter').classList.add('active');
    }
}

function exportData() {
    const bookmarks = getBookmarks();
    const dataStr = JSON.stringify(bookmarks, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'yt-bookmarks.json';
    a.click();
    URL.revokeObjectURL(url);
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedBookmarks = JSON.parse(e.target.result);
            // Basic validation
            if (Array.isArray(importedBookmarks) && importedBookmarks.every(b => b.id && b.url && b.title)) {
                saveBookmarks(importedBookmarks);
                loadBookmarks();
            } else {
                throw new Error('Invalid file format');
            }
        } catch (error) {
            document.getElementById('error').textContent = 'فشل استيراد الملف. تأكد من أنه ملف JSON صالح.';
            console.error('Import error:', error);
        }
    };
    reader.readAsText(file);
    // Reset file input
    event.target.value = null;
}