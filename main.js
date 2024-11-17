   // Get video ID from YouTube URL
   function getVideoId(url) {
    const urlObj = new URL(url);
    if (urlObj.hostname === 'youtu.be') {
        return urlObj.pathname.slice(1);
    }
    return urlObj.searchParams.get('v');
}

// Fetch video title from YouTube
async function getVideoTitle(videoId) {
    try {
        const response = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
        const data = await response.json();
        return data.title;
    } catch (error) {
        console.error('Error fetching video title:', error);
        return null;
    }
}

// Load bookmarks from localStorage
function loadBookmarks() {
    const bookmarks = JSON.parse(localStorage.getItem('ytBookmarks')) || [];
    const bookmarkList = document.getElementById('bookmarkList');
    bookmarkList.innerHTML = '';

    bookmarks.forEach(bookmark => {
        const bookmarkItem = document.createElement('div');
        bookmarkItem.className = 'bookmark-item';
        
        const link = document.createElement('a');
        link.href = bookmark.url;
        link.target = '_blank';
        link.textContent = bookmark.title;
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = 'Delete';
        deleteBtn.onclick = () => deleteBookmark(bookmark.url);

        bookmarkItem.appendChild(link);
        bookmarkItem.appendChild(deleteBtn);
        bookmarkList.appendChild(bookmarkItem);
    });
}

// Add new bookmark
async function addBookmark() {
    const input = document.getElementById('videoUrl');
    const errorDiv = document.getElementById('error');
    const url = input.value.trim();

    try {
        const videoId = getVideoId(url);
        if (!videoId) {
            throw new Error('Invalid YouTube URL');
        }

        const title = await getVideoTitle(videoId);
        if (!title) {
            throw new Error('Could not fetch video title');
        }

        const bookmarks = JSON.parse(localStorage.getItem('ytBookmarks')) || [];
        
        // Check if bookmark already exists
        if (bookmarks.some(b => b.url === url)) {
            throw new Error('Bookmark already exists');
        }

        bookmarks.push({ url, title });
        localStorage.setItem('ytBookmarks', JSON.stringify(bookmarks));
        
        input.value = '';
        errorDiv.textContent = '';
        loadBookmarks();

    } catch (error) {
        errorDiv.textContent = error.message;
    }
}

// Delete bookmark
function deleteBookmark(url) {
    const bookmarks = JSON.parse(localStorage.getItem('ytBookmarks')) || [];
    const updatedBookmarks = bookmarks.filter(b => b.url !== url);
    localStorage.setItem('ytBookmarks', JSON.stringify(updatedBookmarks));
    loadBookmarks();
}

// Initial load
loadBookmarks();